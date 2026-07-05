import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const journalDir = path.join(dbcPath, "run-journal");
const runsDir = path.join(dbcPath, "runs");
mkdirSync(journalDir, { recursive: true });
mkdirSync(runsDir, { recursive: true });

const args = parseArgs(process.argv.slice(2));
const loopId = first(args.loop) || findLatestLoopId();
const blockers = [];
const warnings = [];

if (!loopId) blockers.push({ subject: "loop", detail: "No loop manifest or acceptance report was found." });

const refs = loopId
  ? {
      manifestPath: path.join(dbcPath, "loops", `${sanitizeFileStem(loopId)}.json`),
      reportJsonPath: path.join(dbcPath, "reports", `${sanitizeFileStem(loopId)}.json`),
      reportMarkdownPath: path.join(dbcPath, "reports", `${sanitizeFileStem(loopId)}.md`),
      artifactDir: path.join(dbcPath, "artifacts", sanitizeFileStem(loopId)),
      evidenceDir: path.join(dbcPath, "evidence", sanitizeFileStem(loopId)),
      securityReportPath: path.join(dbcPath, "security", `${sanitizeFileStem(loopId)}.json`),
      gitWorkspacePath: path.join(dbcPath, "git", sanitizeFileStem(loopId), "workspace.json"),
      gitDiffPath: path.join(dbcPath, "git", sanitizeFileStem(loopId), "diff.patch"),
      gitDiffStatPath: path.join(dbcPath, "git", sanitizeFileStem(loopId), "diff-stat.txt"),
      approvalLedgerPath: path.join(dbcPath, "approvals", "latest.json"),
      approvalQueuePath: path.join(dbcPath, "approval-queue", "latest.json"),
      evidenceSummaryPath: path.join(dbcPath, "evidence-summary", "latest.json"),
      loopStateMachinePath: path.join(dbcPath, "state-machine", "latest.json"),
      providerSessionsPath: path.join(dbcPath, "provider-sessions", "latest.json"),
    }
  : {};

const manifest = readJson(refs.manifestPath, "loop manifest");
const acceptance = readJson(refs.reportJsonPath, "acceptance package");
const security = readJson(refs.securityReportPath, "security report", "warning");
const gitWorkspace = readJson(refs.gitWorkspacePath, "git workspace", "warning");
const approvalLedger = readJson(refs.approvalLedgerPath, "approval ledger", "warning");
const approvalQueue = readJson(refs.approvalQueuePath, "approval queue", "warning");
const evidenceSummary = readJson(refs.evidenceSummaryPath, "evidence summary", "warning");
const loopStateMachine = readJson(refs.loopStateMachinePath, "loop state machine", "warning");
const providerSessions = readJson(refs.providerSessionsPath, "provider sessions", "warning");
const stepEvidence = readStepEvidence(refs.evidenceDir);

const loop = manifest?.loop || {};
const steps = Array.isArray(loop.steps) ? loop.steps : [];
const events = buildEvents(loop, steps, stepEvidence, acceptance, security, approvalQueue, loopStateMachine);
const providerCalls = buildProviderCalls(steps, stepEvidence, providerSessions);
const checks = buildChecks(acceptance, security, gitWorkspace, approvalLedger, approvalQueue, loopStateMachine, evidenceSummary, stepEvidence);
const runDir = loopId ? path.join(runsDir, sanitizeFileStem(loopId)) : "";

for (const check of checks) {
  if (check.status === "blocked") blockers.push({ subject: check.id, detail: check.detail });
  if (check.status === "warning") warnings.push({ subject: check.id, detail: check.detail });
}

const status = blockers.length
  ? "blocked"
  : acceptance?.status === "completed" && acceptance?.verdict === "accepted"
    ? "completed"
    : approvalQueue?.status === "pending_approval"
      ? "pending_approval"
      : "in_progress";

const report = {
  version: 1,
  kind: "run-journal",
  generatedAt: String(Date.now()),
  projectPath,
  loopId: loopId || "",
  task: {
    id: acceptance?.task?.id || loop.task_id || "",
    title: acceptance?.task?.title || loop.task_title || "",
    profile: acceptance?.task?.loopProfile || loop.task_loop_profile || "",
    providerStrategy: acceptance?.task?.providerStrategy || loop.task_provider_strategy || "",
  },
  status,
  blockers,
  warnings,
  summary: {
    events: events.length,
    providerCalls: providerCalls.length,
    steps: steps.length,
    passedSteps: steps.filter((step) => step.status === "passed").length,
    failedSteps: steps.filter((step) => ["failed", "blocked", "approval_required"].includes(step.status)).length,
    pendingApprovals: Number(approvalLedger?.pending ?? approvalQueue?.summary?.pendingRequired ?? 0),
    pendingApprovalQueueItems: Number(approvalQueue?.summary?.pendingRequired ?? 0),
    securityFindings: Number(acceptance?.gates?.securityFindings ?? security?.gates?.secretFindings ?? 0),
    scopePassed: Boolean(acceptance?.gates?.scopePassed ?? acceptance?.task?.scopeGate?.passed),
    realProviderCallsUsed: Number(acceptance?.gates?.realProviderCallsUsed ?? 0),
    realProviderBudgetOk: Boolean(acceptance?.gates?.realProviderBudgetOk ?? true),
  },
  checks,
  events,
  providerCalls,
  artifacts: buildArtifacts(refs, steps, stepEvidence, acceptance, security, gitWorkspace),
  refs: {
    ...refs,
    runDir,
    eventsJsonlPath: runDir ? path.join(runDir, "events.jsonl") : "",
    providerCallsPath: runDir ? path.join(runDir, "provider-calls.json") : "",
    summaryMarkdownPath: runDir ? path.join(runDir, "summary.md") : "",
  },
  nextAction: nextAction(status, approvalQueue, blockers),
};

const jsonPath = path.join(journalDir, "latest.json");
const markdownPath = path.join(journalDir, "latest.md");
const perLoopJsonPath = loopId ? path.join(journalDir, `${sanitizeFileStem(loopId)}.json`) : "";
const perLoopMarkdownPath = loopId ? path.join(journalDir, `${sanitizeFileStem(loopId)}.md`) : "";
writeJson(jsonPath, report);
writeFileSync(markdownPath, markdown(report));
if (loopId) {
  writeJson(perLoopJsonPath, report);
  writeFileSync(perLoopMarkdownPath, markdown(report));
  mkdirSync(runDir, { recursive: true });
  writeFileSync(path.join(runDir, "events.jsonl"), `${events.map((event) => JSON.stringify(event)).join("\n")}\n`);
  writeJson(path.join(runDir, "provider-calls.json"), { version: 1, kind: "provider-calls", loopId, generatedAt: report.generatedAt, providerCalls });
  writeFileSync(path.join(runDir, "summary.md"), markdown(report));
}

console.log(
  JSON.stringify(
    {
      status,
      loopId: loopId || "",
      events: events.length,
      providerCalls: providerCalls.length,
      blockers: blockers.length,
      warnings: warnings.length,
      jsonPath,
      markdownPath,
      eventsJsonlPath: report.refs.eventsJsonlPath,
    },
    null,
    2,
  ),
);

if (blockers.length) process.exitCode = 1;

function buildEvents(loop, steps, evidenceItems, acceptance, security, approvalQueue, stateMachine) {
  const output = [];
  pushEvent(output, {
    id: "run-created",
    at: loop.updatedAt || loop.updated_at || acceptance?.updatedAt || "",
    type: "run",
    actor: "Loop Engine",
    status: loop.status || "unknown",
    title: "Loop manifest created",
    detail: loop.manifest_path || refs.manifestPath,
    evidence: [refs.manifestPath].filter(Boolean),
  });
  if (approvalQueue) {
    pushEvent(output, {
      id: "approval-queue",
      at: approvalQueue.generatedAt,
      type: "approval",
      actor: "Approval Queue",
      status: approvalQueue.status,
      title: "Approval queue evaluated",
      detail: `${approvalQueue.summary?.pendingRequired ?? 0} required item(s) pending.`,
      evidence: [refs.approvalQueuePath].filter(Boolean),
    });
  }
  for (const step of steps) {
    const evidence = evidenceItems.find((item) => item.stepId === step.id || item.state === step.state);
    pushEvent(output, {
      id: `step-${step.id || step.state}`,
      at: evidence?.updatedAt || step.finished_at || step.started_at || "",
      type: "step",
      actor: step.agent || evidence?.agent || "Loop Step",
      status: step.status || evidence?.status || "unknown",
      title: displayState(step.state || evidence?.state || step.id),
      detail: evidence?.structuredReport?.summary || step.summary || evidence?.outputExcerpt || "",
      evidence: compact([step.artifact_path, step.evidence_path, evidence?.artifactPath, evidence?.path]),
    });
  }
  if (security) {
    pushEvent(output, {
      id: "security-report",
      at: security.updatedAt || "",
      type: "security",
      actor: "Security",
      status: security.gates?.passed ? "passed" : "blocked",
      title: "Security report written",
      detail: `${security.gates?.secretFindings ?? 0} secret finding(s).`,
      evidence: [refs.securityReportPath].filter(Boolean),
    });
  }
  if (acceptance) {
    pushEvent(output, {
      id: "acceptance-package",
      at: acceptance.updatedAt || "",
      type: "acceptance",
      actor: "Product Owner",
      status: acceptance.verdict || acceptance.status || "unknown",
      title: "Acceptance package written",
      detail: `${acceptance.status || "unknown"}; verdict ${acceptance.verdict || "missing"}.`,
      evidence: compact([refs.reportJsonPath, refs.reportMarkdownPath]),
    });
  }
  if (stateMachine) {
    pushEvent(output, {
      id: "state-machine",
      at: stateMachine.generatedAt || "",
      type: "state",
      actor: "Loop State Machine",
      status: stateMachine.status || "unknown",
      title: "Lifecycle evaluated",
      detail: `${stateMachine.currentState || "unknown"} -> ${stateMachine.nextState || "unknown"}.`,
      evidence: [refs.loopStateMachinePath].filter(Boolean),
    });
  }
  return output.sort((left, right) => numberAt(left.at) - numberAt(right.at) || left.id.localeCompare(right.id));
}

function buildProviderCalls(steps, evidenceItems, providerSessions) {
  const sessionsById = new Map((providerSessions?.records || []).map((record) => [record.id, record]));
  return steps.map((step) => {
    const evidence = evidenceItems.find((item) => item.stepId === step.id || item.state === step.state);
    const session = sessionsById.get(step.provider_id);
    return {
      stepId: step.id || "",
      state: step.state || "",
      agent: step.agent || "",
      providerId: step.provider_id || "",
      providerType: step.provider_type || "",
      providerRunMode: step.provider_run_mode || "",
      promptMode: step.provider_prompt_mode || "",
      command: step.provider_command || "",
      argsTemplate: step.provider_args_template || "",
      resolvedCommand: session?.resolvedCommand || "",
      exactPath: Boolean(session?.exactPath),
      status: step.status || evidence?.status || "unknown",
      attemptCount: Number(step.attempt_count || 0),
      maxAttempts: Number(step.max_attempts || 0),
      requiresApproval: Boolean(step.requires_approval),
      outputExcerpt: trim(evidence?.outputExcerpt || step.output || "", 900),
      artifactPath: step.artifact_path || evidence?.artifactPath || "",
      evidencePath: step.evidence_path || evidence?.path || "",
    };
  });
}

function buildChecks(acceptance, security, gitWorkspace, approvalLedger, approvalQueue, stateMachine, evidenceSummary, evidenceItems) {
  return [
    check("manifest", Boolean(loopId && existsSync(refs.manifestPath)), refs.manifestPath || "missing"),
    check("acceptance", acceptance?.status === "completed" && acceptance?.verdict === "accepted", `status=${acceptance?.status || "missing"} verdict=${acceptance?.verdict || "missing"}`),
    check("steps", evidenceItems.length >= 7, `${evidenceItems.length} step evidence item(s)`),
    check("build", evidenceItems.some((item) => item.stepId === "build" && item.status === "passed"), "build step passed evidence"),
    check("tests", evidenceItems.some((item) => item.stepId === "test" && item.status === "passed"), "test step passed evidence"),
    check("security", Boolean(security?.gates?.passed) && Number(security?.gates?.secretFindings || 0) === 0, `${security?.gates?.secretFindings ?? "missing"} secret finding(s)`),
    check("scope", Boolean(acceptance?.gates?.scopePassed ?? gitWorkspace?.scopeGate?.passed), `scopePassed=${Boolean(acceptance?.gates?.scopePassed ?? gitWorkspace?.scopeGate?.passed)}`),
    check("approvals", Number(approvalLedger?.pending || 0) === 0 || approvalQueue?.status === "pending_approval", `${approvalLedger?.pending ?? "missing"} pending ledger approval(s); queue=${approvalQueue?.status || "missing"}`, "warning"),
    check("state-machine", stateMachine?.status === "completed", `state machine ${stateMachine?.status || "missing"}`, "warning"),
    check("evidence-summary", Boolean(evidenceSummary && Number(evidenceSummary.health?.missingArtifacts || 0) === 0), `${evidenceSummary?.health?.missingArtifacts ?? "missing"} missing artifact(s)`, "warning"),
  ];
}

function buildArtifacts(refs, steps, evidenceItems) {
  return {
    manifest: refs.manifestPath || "",
    acceptanceJson: refs.reportJsonPath || "",
    acceptanceMarkdown: refs.reportMarkdownPath || "",
    security: refs.securityReportPath || "",
    gitWorkspace: refs.gitWorkspacePath || "",
    gitDiff: refs.gitDiffPath || "",
    approvalLedger: refs.approvalLedgerPath || "",
    approvalQueue: refs.approvalQueuePath || "",
    stepArtifacts: steps.map((step) => {
      const evidence = evidenceItems.find((item) => item.stepId === step.id || item.state === step.state);
      return {
        stepId: step.id || "",
        state: step.state || "",
        artifactPath: step.artifact_path || evidence?.artifactPath || "",
        evidencePath: step.evidence_path || evidence?.path || "",
      };
    }),
  };
}

function check(id, passed, detail, softFail = "blocked") {
  return { id, status: passed ? "passed" : softFail, detail };
}

function readStepEvidence(dirPath) {
  if (!dirPath || !existsSync(dirPath)) {
    warnings.push({ subject: "step evidence", detail: `${dirPath || "path missing"} missing.` });
    return [];
  }
  return readdirSync(dirPath)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const filePath = path.join(dirPath, file);
      const item = readJson(filePath, "step evidence", "warning");
      return item ? { ...item, path: filePath } : null;
    })
    .filter(Boolean);
}

function pushEvent(output, event) {
  output.push({
    version: 1,
    id: event.id,
    at: event.at || "",
    type: event.type,
    actor: event.actor,
    status: event.status,
    title: event.title,
    detail: event.detail || "",
    evidence: compact(event.evidence || []),
  });
}

function nextAction(status, approvalQueue, blockers) {
  if (status === "blocked") return `Fix ${blockers.length} run journal blocker(s), then rerun pnpm run-journal.`;
  if (status === "pending_approval") return approvalQueue?.nextAction || "Resolve required approvals before real provider execution.";
  if (status === "completed") return "Run journal is complete; use it for post-run review, comparison, and support handoff.";
  return "Continue the loop and regenerate the run journal after the next evidence artifact is written.";
}

function markdown(report) {
  return [
    `# Run Journal: ${report.loopId || "missing"}`,
    "",
    `Status: ${report.status}`,
    `Task: ${report.task.id} - ${report.task.title}`,
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    `- Events: ${report.summary.events}`,
    `- Provider calls: ${report.summary.providerCalls}`,
    `- Steps: ${report.summary.passedSteps}/${report.summary.steps} passed`,
    `- Pending approvals: ${report.summary.pendingApprovals}`,
    `- Pending queue items: ${report.summary.pendingApprovalQueueItems}`,
    `- Security findings: ${report.summary.securityFindings}`,
    `- Scope passed: ${report.summary.scopePassed}`,
    `- Real provider budget ok: ${report.summary.realProviderBudgetOk}`,
    "",
    "## Next Action",
    `- ${report.nextAction}`,
    "",
    "## Events",
    ...report.events.map((event) => `- [${event.status}] ${event.type}/${event.id}: ${event.title} - ${event.detail}`),
    "",
    "## Provider Calls",
    ...report.providerCalls.map((call) => `- ${call.stepId}: ${call.providerId || "none"} ${call.providerRunMode || "mock"} ${call.promptMode || "stdin"} -> ${call.status}`),
    "",
    "## Checks",
    ...report.checks.map((item) => `- [${item.status}] ${item.id}: ${item.detail}`),
    "",
    "## Blockers",
    ...(report.blockers.length ? report.blockers.map((item) => `- ${item.subject}: ${item.detail}`) : ["- None"]),
    "",
    "## Warnings",
    ...(report.warnings.length ? report.warnings.map((item) => `- ${item.subject}: ${item.detail}`) : ["- None"]),
    "",
    "## References",
    ...Object.entries(report.refs).map(([key, value]) => `- ${key}: ${value}`),
    "",
  ].join("\n");
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
      return { id: path.basename(file, ".json"), mtimeMs: statSync(filePath).mtimeMs };
    });
}

function readJson(filePath, subject, missingLevel = "blocked") {
  if (!filePath || !existsSync(filePath)) {
    const target = missingLevel === "warning" ? warnings : blockers;
    target.push({ subject, detail: `${filePath || "path missing"} missing.` });
    return null;
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    blockers.push({ subject, detail: `${filePath} parse error: ${error.message}` });
    return null;
  }
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseArgs(items) {
  const result = { _: [] };
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item.startsWith("--")) {
      result._.push(item);
      continue;
    }
    const key = item.slice(2);
    const next = items[index + 1];
    if (!next || next.startsWith("--")) result[key] = true;
    else {
      result[key] = [...(Array.isArray(result[key]) ? result[key] : result[key] ? [result[key]] : []), next];
      index += 1;
    }
  }
  return result;
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeFileStem(value) {
  return String(value || "item").replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 140);
}

function trim(value, length) {
  const text = String(value || "").trim();
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function displayState(value) {
  return String(value || "step").replace(/_/g, " ");
}

function compact(values) {
  return values.filter(Boolean);
}

function numberAt(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : Number.MAX_SAFE_INTEGER;
}
