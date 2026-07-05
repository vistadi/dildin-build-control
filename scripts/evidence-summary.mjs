import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const summaryDir = path.join(dbcPath, "evidence-summary");
mkdirSync(summaryDir, { recursive: true });

const args = parseArgs(process.argv.slice(2));
const loopId = first(args.loop) || (args.latest ? findLatestLoopId() : findLatestLoopId());

if (!loopId) {
  console.error("No loop evidence found. Run a controlled smoke loop first, or pass --loop LOOP_ID.");
  process.exit(1);
}

const bundle = buildEvidenceSummary(loopId);
const jsonPath = path.join(summaryDir, "latest.json");
const markdownPath = path.join(summaryDir, "latest.md");
writeJson(jsonPath, bundle);
writeFileSync(markdownPath, markdown(bundle));

console.log(
  JSON.stringify(
    {
      status: bundle.health.status,
      verdict: bundle.health.verdict,
      loopId: bundle.loopId,
      missingArtifacts: bundle.health.missingArtifacts,
      warnings: bundle.health.warnings,
      stepEvidenceCount: bundle.health.stepEvidenceCount,
      pendingApprovals: bundle.health.pendingApprovals,
      jsonPath,
      markdownPath,
    },
    null,
    2,
  ),
);

function buildEvidenceSummary(loopId) {
  const diagnostics = [];
  const refs = {
    manifestPath: path.join(dbcPath, "loops", `${sanitizeFileStem(loopId)}.json`),
    reportJsonPath: path.join(dbcPath, "reports", `${sanitizeFileStem(loopId)}.json`),
    reportMarkdownPath: path.join(dbcPath, "reports", `${sanitizeFileStem(loopId)}.md`),
    securityReportPath: path.join(dbcPath, "security", `${sanitizeFileStem(loopId)}.json`),
    gitWorkspacePath: path.join(dbcPath, "git", sanitizeFileStem(loopId), "workspace.json"),
    gitDiffPath: path.join(dbcPath, "git", sanitizeFileStem(loopId), "diff.patch"),
    gitDiffStatPath: path.join(dbcPath, "git", sanitizeFileStem(loopId), "diff-stat.txt"),
    approvalLedgerPath: path.join(dbcPath, "approvals", "latest.json"),
    stepEvidenceDir: path.join(dbcPath, "evidence", sanitizeFileStem(loopId)),
  };

  const acceptancePackage = readJsonArtifact("acceptance package", refs.reportJsonPath, diagnostics, "error");
  const loop = readJsonArtifact("loop manifest", refs.manifestPath, diagnostics, "error");
  const loopRecord = loop?.loop || loop || {};
  const taskId = acceptancePackage?.task?.id || loopRecord.taskId || loopRecord.task_id || "TASK";
  const taskSpecPath =
    acceptancePackage?.task?.specPath ||
    loopRecord.taskSpecPath ||
    loopRecord.task_spec_path ||
    loop?.taskSpecPath ||
    loop?.task_spec_path ||
    "";
  refs.taskSpecPath = taskSpecPath || path.join(dbcPath, "tasks", `${sanitizeFileStem(taskId)}.json`);

  const taskSpec = readJsonArtifact("task spec", refs.taskSpecPath, diagnostics, "error");
  const acceptanceMarkdown = readTextArtifact("acceptance markdown", refs.reportMarkdownPath, diagnostics, "warning");
  const securityReport = readJsonArtifact("security report", refs.securityReportPath, diagnostics, "error");
  const gitWorkspace = readJsonArtifact("git workspace", refs.gitWorkspacePath, diagnostics, "error");
  const gitDiff = readTextArtifact("git diff", refs.gitDiffPath, diagnostics, "warning");
  const gitDiffStat = readTextArtifact("git diff stat", refs.gitDiffStatPath, diagnostics, "warning");
  const approvalLedger = readJsonArtifact("approval ledger", refs.approvalLedgerPath, diagnostics, "warning");
  const stepEvidence = readStepEvidence(refs.stepEvidenceDir, diagnostics);
  const scopeGate = acceptancePackage?.scopeGate || acceptancePackage?.task?.scopeGate || {};
  const gates = acceptancePackage?.gates || {};
  const missingArtifacts = diagnostics.filter((item) => item.level === "error").length;
  const warnings = diagnostics.filter((item) => item.level === "warning").length;
  const pendingApprovals = Number(approvalLedger?.pending || 0);

  return {
    version: 1,
    kind: "loop-evidence-summary",
    generatedAt: String(Date.now()),
    projectPath,
    loopId,
    loop,
    taskSpec,
    acceptancePackage,
    acceptanceMarkdown,
    securityReport,
    gitWorkspace,
    gitDiff,
    gitDiffStat,
    approvalLedger,
    stepEvidence,
    diagnostics,
    health: {
      status: missingArtifacts ? "incomplete" : pendingApprovals ? "pending_approval" : "ready_for_review",
      verdict: acceptancePackage?.verdict || "missing",
      acceptanceStatus: acceptancePackage?.status || "missing",
      scopePassed: Boolean(scopeGate.passed),
      securityFindings: Number(gates.securityFindings || 0),
      missingArtifacts,
      warnings,
      stepEvidenceCount: stepEvidence.length,
      pendingApprovals,
    },
    refs,
  };
}

function readJsonArtifact(subject, filePath, diagnostics, missingLevel) {
  if (!filePath || !existsSync(filePath)) {
    diagnostics.push(diag(missingLevel, subject, `${filePath || "path missing"} missing`));
    return null;
  }
  try {
    const value = JSON.parse(readFileSync(filePath, "utf8"));
    diagnostics.push(diag("ok", subject, filePath));
    return value;
  } catch (error) {
    diagnostics.push(diag("error", subject, `${filePath} parse error: ${error.message}`));
    return null;
  }
}

function readTextArtifact(subject, filePath, diagnostics, missingLevel) {
  if (!filePath || !existsSync(filePath)) {
    diagnostics.push(diag(missingLevel, subject, `${filePath || "path missing"} missing`));
    return "";
  }
  diagnostics.push(diag("ok", subject, filePath));
  return readFileSync(filePath, "utf8");
}

function readStepEvidence(dir, diagnostics) {
  if (!existsSync(dir)) {
    diagnostics.push(diag("error", "step evidence", `${dir} missing`));
    return [];
  }
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const filePath = path.join(dir, file);
      const value = readJsonArtifact("step evidence", filePath, diagnostics, "error");
      return value ? { ...value, path: filePath } : null;
    })
    .filter(Boolean);
}

function findLatestLoopId() {
  const candidates = [
    ...latestJsonIds(path.join(dbcPath, "reports")),
    ...latestJsonIds(path.join(dbcPath, "loops")),
  ].sort((left, right) => right.mtimeMs - left.mtimeMs);
  return candidates[0]?.id || "";
}

function latestJsonIds(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const filePath = path.join(dir, file);
      return {
        id: path.basename(file, ".json"),
        mtimeMs: statSync(filePath).mtimeMs,
      };
    });
}

function markdown(bundle) {
  const health = bundle.health;
  const scopeGate = bundle.acceptancePackage?.scopeGate || bundle.acceptancePackage?.task?.scopeGate || {};
  const pending = (bundle.approvalLedger?.records || []).filter((record) => record.status === "pending");
  return [
    `# Evidence Summary: ${bundle.loopId}`,
    "",
    `Status: ${health.status}`,
    `Verdict: ${health.verdict}`,
    `Acceptance: ${health.acceptanceStatus}`,
    `Scope passed: ${health.scopePassed}`,
    `Missing artifacts: ${health.missingArtifacts}`,
    `Warnings: ${health.warnings}`,
    `Step evidence: ${health.stepEvidenceCount}`,
    `Pending approvals: ${health.pendingApprovals}`,
    "",
    "## Scope Gate",
    `Mode: ${scopeGate.mode || "missing"}`,
    `Verified: ${Boolean(scopeGate.verified)}`,
    `Outside allowed: ${JSON.stringify(scopeGate.outsideAllowed || [])}`,
    `Denied matches: ${JSON.stringify(scopeGate.deniedMatches || [])}`,
    "",
    "## Git",
    `Workspace: ${bundle.refs.gitWorkspacePath}`,
    `Branch: ${bundle.gitWorkspace?.currentBranch || "missing"}`,
    `Suggested branch: ${bundle.gitWorkspace?.suggestedTaskBranch || "missing"}`,
    `Changed files: ${JSON.stringify(bundle.gitWorkspace?.changedFiles || [])}`,
    "",
    "## Pending Approvals",
    ...(pending.length ? pending.map((record) => `- ${record.id}: ${record.action}`) : ["- None"]),
    "",
    "## Diagnostics",
    ...bundle.diagnostics.map((item) => `- [${item.level}] ${item.subject}: ${item.detail}`),
    "",
    "## References",
    ...Object.entries(bundle.refs).map(([key, value]) => `- ${key}: ${value}`),
    "",
  ].join("\n");
}

function diag(level, subject, detail) {
  return { level, subject, detail };
}

function sanitizeFileStem(value) {
  return String(value || "item").replace(/[^a-zA-Z0-9._-]/g, "-");
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      parsed._.push(item);
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = parsed[key] ? [...asArray(parsed[key]), next] : next;
    index += 1;
  }
  return parsed;
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}
