import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const outputDir = path.join(dbcPath, "state-machine");
mkdirSync(outputDir, { recursive: true });

const args = parseArgs(process.argv.slice(2));
const loopId = first(args.loop) || findLatestLoopId();
const blockers = [];
const warnings = [];

if (!loopId) {
  blockers.push({ subject: "loop", detail: "No loop manifest or report was found." });
}

const refs = loopId
  ? {
      manifestPath: path.join(dbcPath, "loops", `${sanitizeFileStem(loopId)}.json`),
      reportJsonPath: path.join(dbcPath, "reports", `${sanitizeFileStem(loopId)}.json`),
      reportMarkdownPath: path.join(dbcPath, "reports", `${sanitizeFileStem(loopId)}.md`),
      securityReportPath: path.join(dbcPath, "security", `${sanitizeFileStem(loopId)}.json`),
      gitWorkspacePath: path.join(dbcPath, "git", sanitizeFileStem(loopId), "workspace.json"),
      approvalLedgerPath: path.join(dbcPath, "approvals", "latest.json"),
    }
  : {};

const manifest = readJson(refs.manifestPath, "loop manifest");
const acceptance = readJson(refs.reportJsonPath, "acceptance package");
const security = readJson(refs.securityReportPath, "security report");
const approvalLedger = readJson(refs.approvalLedgerPath, "approval ledger", "warning");
const loop = manifest?.loop || {};
const steps = Array.isArray(loop.steps) ? loop.steps : [];
const gates = acceptance?.gates || {};
const transitions = buildTransitions(loop, steps, acceptance, security, approvalLedger);

for (const transition of transitions) {
  if (transition.status === "blocked") {
    blockers.push({ subject: transition.id, detail: transition.detail });
  } else if (transition.status === "waiting") {
    warnings.push({ subject: transition.id, detail: transition.detail });
  }
}

const completed = transitions.length > 0 && transitions.every((item) => item.status === "passed");
const blocked = blockers.length > 0;
const status = blocked ? "blocked" : completed ? "completed" : "in_progress";
const currentState = [...transitions].reverse().find((item) => item.status === "passed")?.to || "created";
const nextState = transitions.find((item) => item.status !== "passed")?.to || "closed";

const report = {
  version: 1,
  kind: "loop-state-machine",
  generatedAt: String(Date.now()),
  projectPath,
  loopId: loopId || "",
  taskId: loop.task_id || acceptance?.task?.id || "",
  status,
  currentState,
  nextState,
  blockers,
  warnings,
  transitions,
  invariants: {
    ordered: transitions.every((item, index) => index === 0 || transitions[index - 1].order < item.order),
    noSkippedPassedTransitions: noSkippedPassedTransitions(transitions),
    completedImpliesAccepted: loop.status === "completed" ? acceptance?.verdict === "accepted" : true,
    evidenceRequiredForPassedTransitions: transitions
      .filter((item) => item.status === "passed")
      .every((item) => item.refs.length > 0 || item.evidence.length > 0),
  },
  gates,
  refs,
  nextAction: blocked
    ? "Open the blocked transition, inspect its evidence refs, fix the loop artifact or rerun the failed step."
    : completed
      ? "State machine is closed; use comparison/revert evidence for post-run review."
      : `Continue the loop toward ${nextState}.`,
};

const jsonPath = path.join(outputDir, "latest.json");
const markdownPath = path.join(outputDir, "latest.md");
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(markdownPath, markdown(report));

console.log(
  JSON.stringify(
    {
      status: report.status,
      loopId: report.loopId,
      currentState: report.currentState,
      nextState: report.nextState,
      blockers: blockers.length,
      warnings: warnings.length,
      jsonPath,
      markdownPath,
    },
    null,
    2,
  ),
);

if (blockers.length) process.exitCode = 1;

function buildTransitions(loop, steps, acceptance, security, approvalLedger) {
  const byState = new Map(steps.map((step) => [step.state, step]));
  const byId = new Map(steps.map((step) => [step.id, step]));
  const planStep = byState.get("planned") || byId.get("plan");
  const codeStep = byState.get("coding") || byId.get("code");
  const buildStep = byState.get("building") || byId.get("build");
  const testStep = byState.get("testing") || byId.get("test");
  const reviewStep = byState.get("reviewing") || byId.get("review");
  const securityStep = byState.get("security") || byId.get("security");
  const acceptanceStep = byState.get("acceptance") || byId.get("accept");
  const pendingApprovals = Number(acceptance?.gates?.pendingApprovals ?? approvalLedger?.pending ?? 0);
  const realCliEnabled = Boolean(manifestRealCliEnabled(loop));
  const ops = acceptance?.opsEvidence || {};
  const realApprovalReady = !realCliEnabled || Boolean(ops?.approvalLedger?.ready);

  return [
    transition(1, "created", "planned", "planned", stepPassed(planStep), {
      detail: "Planning step must pass with bounded plan evidence.",
      step: planStep,
    }),
    transition(2, "planned", "approved", "approved", pendingApprovals === 0 && realApprovalReady, {
      detail: pendingApprovals ? `${pendingApprovals} pending approval(s).` : "No pending approvals block execution.",
      evidence: realCliEnabled ? ["real CLI approval ledger is ready"] : ["mock/local loop does not require real provider approval"],
      refs: [refs.approvalLedgerPath].filter(Boolean),
    }),
    transition(3, "approved", "provider_started", "provider_started", steps.some((step) => Number(step.attempt_count || 0) > 0 || step.started_at), {
      detail: "At least one provider/local runner step has started.",
      evidence: [`attempted steps: ${steps.filter((step) => Number(step.attempt_count || 0) > 0 || step.started_at).length}`],
      refs: [refs.manifestPath].filter(Boolean),
    }),
    transition(4, "provider_started", "patch_ready", "patch_ready", stepPassed(codeStep), {
      detail: "Coding step must pass and produce implementation evidence.",
      step: codeStep,
    }),
    transition(5, "patch_ready", "build_done", "build_done", stepPassed(buildStep), {
      detail: "Build step must pass and preserve build evidence.",
      step: buildStep,
    }),
    transition(6, "build_done", "tests_done", "tests_done", stepPassed(testStep), {
      detail: "Testing step must pass with QA evidence.",
      step: testStep,
    }),
    transition(7, "tests_done", "reviewed", "reviewed", stepPassed(reviewStep), {
      detail: "Reviewer step must pass against acceptance criteria.",
      step: reviewStep,
    }),
    transition(8, "reviewed", "security_done", "security_done", stepPassed(securityStep) && Number(acceptance?.gates?.securityFindings || 0) === 0, {
      detail: "Security step must pass and secret scan must have zero findings.",
      step: securityStep,
      refs: [refs.securityReportPath].filter(Boolean),
    }),
    transition(9, "security_done", "accepted", "accepted", stepPassed(acceptanceStep) && acceptance?.verdict === "accepted", {
      detail: `Acceptance verdict is ${acceptance?.verdict || "missing"}.`,
      step: acceptanceStep,
      refs: [refs.reportJsonPath, refs.reportMarkdownPath].filter(Boolean),
    }),
    transition(10, "accepted", "closed", "closed", loop.status === "completed" && acceptance?.status === "completed" && acceptance?.verdict === "accepted", {
      detail: `Loop status ${loop.status || "missing"}; acceptance ${acceptance?.status || "missing"}.`,
      evidence: ["manifest and acceptance package agree on completion"],
      refs: [refs.manifestPath, refs.reportJsonPath].filter(Boolean),
    }),
  ];
}

function transition(order, from, to, id, passed, options = {}) {
  const step = options.step;
  const stepStatus = step?.status || "";
  const attempted = Boolean(step && (stepStatus || step.started_at || Number(step.attempt_count || 0) > 0));
  const status = passed ? "passed" : stepStatus === "failed" || stepStatus === "blocked" || stepStatus === "approval_required" ? "blocked" : attempted ? "waiting" : "waiting";
  const refs = unique([
    ...(options.refs || []),
    step?.artifact_path,
    step?.evidence_path,
  ].filter(Boolean));
  return {
    order,
    id,
    from,
    to,
    status,
    detail: passed ? `${to} transition proven.` : options.detail || `${to} transition is not proven yet.`,
    stepId: step?.id || "",
    stepStatus,
    evidence: [
      ...(options.evidence || []),
      step?.summary,
      step?.evidence,
    ].filter(Boolean),
    refs,
  };
}

function stepPassed(step) {
  return Boolean(step && step.status === "passed" && (step.artifact_path || step.evidence_path || step.structured_report_json));
}

function manifestRealCliEnabled(loop) {
  return (loop.steps || []).some((step) => step.provider_type === "cli" && step.provider_run_mode === "real");
}

function noSkippedPassedTransitions(transitions) {
  let seenWaiting = false;
  for (const item of transitions) {
    if (item.status !== "passed") seenWaiting = true;
    if (seenWaiting && item.status === "passed") return false;
  }
  return true;
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

function readJson(filePath, subject, missingLevel = "error") {
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

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const value = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[++index] : "true";
    parsed[key] = [...(parsed[key] || []), value];
  }
  return parsed;
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeFileStem(value) {
  return String(value || "item").replace(/[^a-zA-Z0-9._-]/g, "-");
}

function unique(values) {
  return [...new Set(values)];
}

function markdown(report) {
  return [
    "# Loop State Machine",
    "",
    `Status: ${report.status}`,
    `Loop: ${report.loopId}`,
    `Task: ${report.taskId}`,
    `Current state: ${report.currentState}`,
    `Next state: ${report.nextState}`,
    "",
    "## Transitions",
    ...report.transitions.map((item) => `- [${item.status}] ${item.from} -> ${item.to}: ${item.detail}`),
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
