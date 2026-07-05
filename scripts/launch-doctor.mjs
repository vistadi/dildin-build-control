import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const doctorDir = path.join(dbcPath, "doctor");
mkdirSync(doctorDir, { recursive: true });

const env = {
  ...process.env,
  PATH: `${process.env.HOME || ""}/.cargo/bin:${process.env.PATH || ""}`,
};

const steps = [
  commandStep("frontend-build", "pnpm", ["build"], "Verify TypeScript and Vite production build."),
  commandStep("rust-tests", "cargo", ["test", "--manifest-path", "src-tauri/Cargo.toml"], "Run backend unit tests."),
  nodeStep("provider-contracts", "provider-contracts.mjs", [], "Verify CLI executable contracts."),
  nodeStep("provider-sessions", "provider-sessions.mjs", [], "Verify provider session readiness."),
  nodeStep("real-readiness", "real-readiness.mjs", [], "Check real loop readiness."),
  nodeStep("real-micro-plan", "real-micro-plan.mjs", [], "Generate the real micro plan."),
  nodeStep("compare-real-micro", "compare-real-micro.mjs", [], "Compare real evidence with controlled baseline when available."),
  nodeStep("operator-checklist", "operator-checklist.mjs", [], "Generate the human approval checklist."),
  nodeStep("evidence-summary", "evidence-summary.mjs", ["--latest"], "Summarize latest loop evidence."),
  nodeStep("loop-state-machine", "loop-state-machine.mjs", [], "Verify loop lifecycle transitions from evidence."),
  nodeStep("approval-ledger", "approval-ledger.mjs", ["generate"], "Generate approval ledger."),
  nodeStep("revert-evidence", "revert-evidence.mjs", [], "Verify provider profile revert state."),
  nodeStep("real-micro-preflight", "real-micro-preflight.mjs", [], "Verify real micro launch gates without spawning providers."),
  nodeStep("approval-queue", "approval-queue.mjs", [], "Build unified human-in-the-loop approval queue."),
  nodeStep("run-journal", "run-journal.mjs", [], "Build run journal and events timeline from loop evidence."),
  nodeStep("real-micro-runbook", "real-micro-runbook.mjs", [], "Generate the operator runbook and allowed-surface policy."),
  nodeStep("support-bundle", "support-bundle.mjs", [], "Create portable operator handoff diagnostics."),
  nodeStep("system-audit", "system-audit.mjs", [], "Generate final system audit."),
];

const results = steps.map(runStep);
const refs = {
  build: path.join(projectPath, "dist"),
  readiness: path.join(dbcPath, "readiness", "latest.json"),
  realPlan: path.join(dbcPath, "real-loop", "latest.json"),
  comparison: path.join(dbcPath, "compare", "latest.json"),
  operator: path.join(dbcPath, "operator", "latest.json"),
  approvalLedger: path.join(dbcPath, "approvals", "latest.json"),
  approvalQueue: path.join(dbcPath, "approval-queue", "latest.json"),
  evidenceSummary: path.join(dbcPath, "evidence-summary", "latest.json"),
  loopStateMachine: path.join(dbcPath, "state-machine", "latest.json"),
  runJournal: path.join(dbcPath, "run-journal", "latest.json"),
  providerContracts: path.join(dbcPath, "provider-contracts", "latest.json"),
  providerSessions: path.join(dbcPath, "provider-sessions", "latest.json"),
  revertEvidence: path.join(dbcPath, "revert", "latest.json"),
  realMicroPreflight: path.join(dbcPath, "preflight", "latest.json"),
  realMicroRunbook: path.join(dbcPath, "runbook", "latest.json"),
  supportBundle: path.join(dbcPath, "support", "latest.json"),
  systemAudit: path.join(dbcPath, "audit", "latest.json"),
};
const artifacts = Object.fromEntries(Object.entries(refs).map(([key, filePath]) => [key, readJsonIfExists(filePath)]));
const blockers = [];
const warnings = [];

for (const result of results) {
  if (result.exitCode !== 0) blockers.push({ subject: result.id, detail: `Command exited with ${result.exitCode}.` });
}

collectArtifactIssues("readiness", artifacts.readiness, blockers, warnings);
collectArtifactIssues("real plan", artifacts.realPlan, blockers, warnings);
collectArtifactIssues("comparison", artifacts.comparison, blockers, warnings);
collectArtifactIssues("operator", artifacts.operator, blockers, warnings);
collectArtifactIssues("approval ledger", artifacts.approvalLedger, blockers, warnings);
collectArtifactIssues("approval queue", artifacts.approvalQueue, blockers, warnings);
collectArtifactIssues("evidence summary", artifacts.evidenceSummary, blockers, warnings);
collectArtifactIssues("loop state machine", artifacts.loopStateMachine, blockers, warnings);
collectArtifactIssues("run journal", artifacts.runJournal, blockers, warnings);
collectArtifactIssues("provider contracts", artifacts.providerContracts, blockers, warnings);
collectArtifactIssues("provider sessions", artifacts.providerSessions, blockers, warnings);
collectArtifactIssues("revert evidence", artifacts.revertEvidence, blockers, warnings);
collectArtifactIssues("real micro preflight", artifacts.realMicroPreflight, blockers, warnings);
collectArtifactIssues("real micro runbook", artifacts.realMicroRunbook, blockers, warnings);
collectArtifactIssues("support bundle", artifacts.supportBundle, blockers, warnings);
collectArtifactIssues("system audit", artifacts.systemAudit, blockers, warnings);

const systemStatus = artifacts.systemAudit?.status || "missing";
const status = blockers.length
  ? "blocked"
  : systemStatus === "ready_for_human_approval"
    ? "ready_for_human_approval"
    : systemStatus === "ready_to_apply_real_micro"
      ? "ready_to_apply_real_micro"
      : "ready_with_warnings";

const report = {
  version: 1,
  kind: "launch-doctor",
  generatedAt: String(Date.now()),
  projectPath,
  status,
  blockers,
  warnings,
  steps: results,
  refs,
  summary: {
    systemAuditStatus: systemStatus,
    operatorStatus: artifacts.operator?.status || "missing",
    approvalLedgerStatus: artifacts.approvalLedger?.status || "missing",
    approvalQueueStatus: artifacts.approvalQueue?.status || "missing",
    pendingApprovals: artifacts.approvalLedger?.pending ?? 0,
    pendingApprovalQueueItems: artifacts.approvalQueue?.summary?.pendingRequired ?? 0,
    loopStateMachineStatus: artifacts.loopStateMachine?.status || "missing",
    runJournalStatus: artifacts.runJournal?.status || "missing",
    runJournalEvents: artifacts.runJournal?.summary?.events ?? 0,
    comparisonStatus: artifacts.comparison?.status || "missing",
    providerContractsStatus: artifacts.providerContracts?.status || "missing",
    providerSessionsStatus: artifacts.providerSessions?.status || "missing",
    revertStatus: artifacts.revertEvidence?.status || "missing",
    realMicroPreflightStatus: artifacts.realMicroPreflight?.status || "missing",
    realMicroRunbookStatus: artifacts.realMicroRunbook?.status || "missing",
    supportBundleStatus: artifacts.supportBundle?.status || "missing",
  },
  nextAction:
    status === "blocked"
      ? "Fix doctor blockers, then rerun pnpm launch-doctor."
      : status === "ready_for_human_approval"
        ? "Review .dbc/operator/latest.md, then approve through the app or pnpm operator-approve."
        : "Apply real micro profile and run only REAL-MICRO-README through Preflight.",
};

const jsonPath = path.join(doctorDir, "latest.json");
const markdownPath = path.join(doctorDir, "latest.md");
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(markdownPath, markdown(report));

console.log(
  JSON.stringify(
    {
      status,
      blockers: blockers.length,
      warnings: warnings.length,
      jsonPath,
      markdownPath,
      nextAction: report.nextAction,
    },
    null,
    2,
  ),
);

if (blockers.length) process.exitCode = 1;

function nodeStep(id, script, args, description) {
  return commandStep(id, process.execPath, [path.join("scripts", script), ...args], description);
}

function commandStep(id, command, args, description) {
  return { id, command, args, description };
}

function runStep(step) {
  const startedAt = Date.now();
  const result = spawnSync(step.command, step.args, {
    cwd: projectPath,
    encoding: "utf8",
    env,
    maxBuffer: 1024 * 1024 * 8,
  });
  const stdout = trim(result.stdout || "", 12000);
  const stderr = trim(result.stderr || "", 12000);
  return {
    id: step.id,
    description: step.description,
    command: [step.command, ...step.args].join(" "),
    status: result.status === 0 ? "ok" : "failed",
    exitCode: result.status ?? 1,
    durationMs: Date.now() - startedAt,
    stdout,
    stderr,
  };
}

function collectArtifactIssues(subject, artifact, blockers, warnings) {
  if (!artifact) {
    warnings.push({ subject, detail: "Artifact is missing." });
    return;
  }
  for (const item of artifact.blockers || []) {
    blockers.push({ subject: `${subject}: ${item.subject || "blocker"}`, detail: item.detail || JSON.stringify(item) });
  }
  for (const item of artifact.warnings || []) {
    warnings.push({ subject: `${subject}: ${item.subject || "warning"}`, detail: item.detail || JSON.stringify(item) });
  }
}

function readJsonIfExists(filePath) {
  if (!filePath || !filePath.endsWith(".json") || !existsSync(filePath)) return undefined;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function trim(value, length) {
  const text = String(value || "").trim();
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function markdown(value) {
  return [
    "# Launch Doctor",
    "",
    `Status: ${value.status}`,
    `Generated: ${value.generatedAt}`,
    `Project: ${value.projectPath}`,
    "",
    "## Summary",
    `- System audit: ${value.summary.systemAuditStatus}`,
    `- Operator: ${value.summary.operatorStatus}`,
    `- Approval ledger: ${value.summary.approvalLedgerStatus}`,
    `- Approval queue: ${value.summary.approvalQueueStatus}`,
    `- Pending approvals: ${value.summary.pendingApprovals}`,
    `- Pending queue items: ${value.summary.pendingApprovalQueueItems}`,
    `- Loop state machine: ${value.summary.loopStateMachineStatus}`,
    `- Run journal: ${value.summary.runJournalStatus}`,
    `- Run journal events: ${value.summary.runJournalEvents}`,
    `- Comparison: ${value.summary.comparisonStatus}`,
    `- Provider contracts: ${value.summary.providerContractsStatus}`,
    `- Provider sessions: ${value.summary.providerSessionsStatus}`,
    `- Revert: ${value.summary.revertStatus}`,
    `- Real micro preflight: ${value.summary.realMicroPreflightStatus}`,
    `- Real micro runbook: ${value.summary.realMicroRunbookStatus}`,
    `- Support bundle: ${value.summary.supportBundleStatus}`,
    "",
    "## Next Action",
    `- ${value.nextAction}`,
    "",
    "## Blockers",
    ...(value.blockers.length ? value.blockers.map((item) => `- ${item.subject}: ${item.detail}`) : ["- None"]),
    "",
    "## Warnings",
    ...(value.warnings.length ? value.warnings.map((item) => `- ${item.subject}: ${item.detail}`) : ["- None"]),
    "",
    "## Steps",
    ...value.steps.map((step) => `- [${step.status}] ${step.id}: exit ${step.exitCode}, ${step.durationMs}ms`),
    "",
    "## Refs",
    ...Object.entries(value.refs).map(([key, filePath]) => `- ${key}: ${filePath}`),
    "",
  ].join("\n");
}
