import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const outputDir = path.join(dbcPath, "approval-queue");
mkdirSync(outputDir, { recursive: true });

const refs = {
  approvalLedger: path.join(dbcPath, "approvals", "latest.json"),
  decisionsDir: path.join(dbcPath, "approvals", "decisions"),
  operator: path.join(dbcPath, "operator", "latest.json"),
  operatorApproval: path.join(dbcPath, "operator", "approval.json"),
  realMicroPreflight: path.join(dbcPath, "preflight", "latest.json"),
  providerSessions: path.join(dbcPath, "provider-sessions", "latest.json"),
  providerContracts: path.join(dbcPath, "provider-contracts", "latest.json"),
  loopStateMachine: path.join(dbcPath, "state-machine", "latest.json"),
  revertEvidence: path.join(dbcPath, "revert", "latest.json"),
  surfacesPolicy: path.join(dbcPath, "policy", "surfaces.md"),
  harnessApprovalGates: path.join(dbcPath, "approval-gates"),
};

const ledger = readJson(refs.approvalLedger);
const operator = readJson(refs.operator);
const operatorApproval = readJson(refs.operatorApproval);
const preflight = readJson(refs.realMicroPreflight);
const providerSessions = readJson(refs.providerSessions);
const providerContracts = readJson(refs.providerContracts);
const loopStateMachine = readJson(refs.loopStateMachine);
const revertEvidence = readJson(refs.revertEvidence);
const surfacesPolicy = readText(refs.surfacesPolicy);
const decisions = loadDecisions(refs.decisionsDir);
const harnessGates = loadHarnessGates(refs.harnessApprovalGates);
const ledgerRecords = ledger?.records || [];
const items = [];
const blockers = [];
const warnings = [];

if (!ledger) warnings.push({ subject: "approval ledger", detail: "Run pnpm approval-ledger -- generate before approval-queue." });
if (!operator) warnings.push({ subject: "operator checklist", detail: "Run pnpm operator-checklist before approval-queue." });
if (!preflight) warnings.push({ subject: "real micro preflight", detail: "Run pnpm real-micro-preflight before approval-queue." });
if (!providerSessions) warnings.push({ subject: "provider sessions", detail: "Run pnpm provider-sessions before approval-queue." });
if (!loopStateMachine) warnings.push({ subject: "loop state machine", detail: "Run pnpm loop-state-machine before approval-queue." });
if (!revertEvidence) warnings.push({ subject: "revert evidence", detail: "Run pnpm revert-evidence before approval-queue." });

for (const item of providerSessions?.blockers || []) blockers.push({ subject: `provider session: ${item.providerId || item.subject || "blocker"}`, detail: item.detail || JSON.stringify(item) });
for (const item of providerContracts?.blockers || []) blockers.push({ subject: `provider contract: ${item.providerId || item.subject || "blocker"}`, detail: item.detail || JSON.stringify(item) });
for (const item of preflight?.blockers || []) blockers.push({ subject: `preflight: ${item.subject || "blocker"}`, detail: item.detail || JSON.stringify(item) });
for (const item of loopStateMachine?.blockers || []) blockers.push({ subject: `state machine: ${item.subject || "blocker"}`, detail: item.detail || JSON.stringify(item) });
for (const item of revertEvidence?.blockers || []) blockers.push({ subject: `revert: ${item.subject || "blocker"}`, detail: item.detail || JSON.stringify(item) });

addDecisionItem("REAL-MICRO-HUMAN-GATE", {
  kind: "human_gate",
  title: "Approve real micro loop gate",
  risk: "high",
  required: true,
  provider: "system",
  surface: "local_script",
  reason: operator?.nextAction || "Real provider loop requires explicit human approval before mode switch or provider spawn.",
  evidence: compact([refs.operator, refs.operatorApproval, refs.approvalLedger]),
  nextAction: operatorApprovalMatches(operatorApproval, operator)
    ? "Human gate is approved for the current operator checklist."
    : "Review .dbc/operator/latest.md, then approve through the app or pnpm operator-approve.",
});

addDecisionItem("APPLY-REAL-MICRO-PROFILE", {
  kind: "provider_run",
  title: "Apply real micro provider profile",
  risk: "high",
  required: true,
  provider: "system",
  surface: "local_script",
  reason: "Switching selected providers to real mode may spend real provider quota and must remain explicit.",
  evidence: compact([refs.approvalLedger, refs.realMicroPreflight, path.join(dbcPath, "providers.real-micro.yaml")]),
  nextAction: "Apply only after REAL-MICRO-HUMAN-GATE is approved.",
});

addDecisionItem("RUN-REAL-MICRO-TASK", {
  kind: "provider_run",
  title: "Run approved REAL-MICRO-README task",
  risk: "high",
  required: true,
  provider: "system",
  surface: "official_cli",
  reason: "The first real run is intentionally limited to the staged micro task.",
  evidence: compact([refs.approvalLedger, refs.realMicroPreflight, path.join(dbcPath, "tasks", "REAL-MICRO-README.json")]),
  nextAction: "Run only after dry-run preflight reports ready_to_run.",
});

addTerminalHandoffItem();
addCommandPolicyItem();
addHarnessGateItems();
addGitActionItem();
addAcceptanceItem();
addRevertItem();

for (const item of items) {
  if (item.status === "blocked") blockers.push({ subject: item.id, detail: item.reason });
}

const pendingRequired = items.filter((item) => item.required && item.status === "pending");
const approved = items.filter((item) => item.status === "approved");
const notRequired = items.filter((item) => item.status === "not_required");
const status = blockers.length ? "blocked" : pendingRequired.length ? "pending_approval" : "ready";
const report = {
  version: 1,
  kind: "approval-queue",
  generatedAt: String(Date.now()),
  projectPath,
  status,
  summary: {
    total: items.length,
    required: items.filter((item) => item.required).length,
    pending: items.filter((item) => item.status === "pending").length,
    pendingRequired: pendingRequired.length,
    approved: approved.length,
    blocked: items.filter((item) => item.status === "blocked").length,
    notRequired: notRequired.length,
  },
  blockers,
  warnings,
  items: items.sort((a, b) => statusRank(a.status) - statusRank(b.status) || Number(b.required) - Number(a.required) || a.id.localeCompare(b.id)),
  refs,
  nextAction: nextAction(status, pendingRequired),
};

const jsonPath = path.join(outputDir, "latest.json");
const markdownPath = path.join(outputDir, "latest.md");
writeJson(jsonPath, report);
writeFileSync(markdownPath, queueMarkdown(report));

console.log(
  JSON.stringify(
    {
      status: report.status,
      pendingRequired: report.summary.pendingRequired,
      blockers: report.blockers.length,
      warnings: report.warnings.length,
      jsonPath,
      markdownPath,
      nextAction: report.nextAction,
    },
    null,
    2,
  ),
);

if (blockers.length) process.exitCode = 1;

function addDecisionItem(id, base) {
  const record = ledgerRecords.find((item) => item.id === id);
  const decision = decisions.get(id);
  const approvedByOperator = id === "REAL-MICRO-HUMAN-GATE" && operatorApprovalMatches(operatorApproval, operator);
  const status = approvedByOperator ? "approved" : queueStatus(record?.status, decision?.decision);
  items.push(item({
    id,
    status,
    decisionPath: decision ? path.join(refs.decisionsDir, `${sanitizeFileStem(id)}.json`) : record?.decisionPath || "",
    sourceStatus: record?.status || decision?.decision || "",
    ...base,
  }));
}

function addTerminalHandoffItem() {
  const terminalProviders = (providerSessions?.records || []).filter((record) => record.status === "manual_handoff" || record.promptMode === "terminal");
  const required = Boolean(preflight?.terminalHandoff?.required) || terminalProviders.some((record) => record.runMode === "real");
  items.push(item({
    id: "TERMINAL-HANDOFF",
    kind: "terminal_handoff",
    title: "Human-operated terminal handoff",
    status: required ? "pending" : "not_required",
    risk: required ? "high" : "low",
    required,
    provider: terminalProviders.map((record) => record.id).join(", ") || "system",
    surface: "human_operated_terminal",
    reason: required
      ? "At least one real provider uses terminal prompt mode; DBC must stop before non-interactive execution."
      : "Current real-micro preflight does not require a human terminal handoff.",
    evidence: compact([refs.realMicroPreflight, refs.providerSessions]),
    nextAction: required ? "Open the listed provider CLI in a human-operated terminal and attach the resulting evidence." : "No terminal handoff is required for this configuration.",
  }));
}

function addCommandPolicyItem() {
  const pendingCommands = ledgerRecords.filter((record) => record.kind === "command_request" && record.status === "pending");
  const templates = ledgerRecords.filter((record) => record.kind === "command_template");
  items.push(item({
    id: "COMMAND-POLICY",
    kind: "command_policy",
    title: "Command policy approval surface",
    status: pendingCommands.length ? "pending" : "not_required",
    risk: pendingCommands.length ? "high" : "medium",
    required: pendingCommands.length > 0,
    provider: "system",
    surface: "local_script",
    reason: pendingCommands.length
      ? `${pendingCommands.length} concrete command approval request(s) are pending.`
      : `No concrete command approval request is pending; ${templates.length} policy template(s) remain informational.`,
    evidence: compact([refs.approvalLedger, path.join(dbcPath, "policy.yaml")]),
    nextAction: pendingCommands.length ? "Approve or reject each concrete command request before continuing." : "Keep command templates as policy hints; approve concrete commands only with task context.",
  }));
}

function addHarnessGateItems() {
  for (const gate of harnessGates) {
    items.push(item({
      id: String(gate.id || `HARNESS-${gate.phase || "gate"}-${gate.targetId || "item"}`).toUpperCase(),
      kind: "harness_gate",
      title: gate.title || `Harness ${gate.phase || "approval"} gate`,
      status: harnessGateStatus(gate.status),
      risk: gate.risk || "medium",
      required: Boolean(gate.required),
      provider: "harness",
      surface: "local_script",
      reason: gate.reason || "Harness approval gate recorded by DBC.",
      evidence: compact([...(Array.isArray(gate.evidence) ? gate.evidence : []), refs.harnessApprovalGates]),
      nextAction: harnessGateNextAction(gate),
      sourceStatus: gate.status || "",
    }));
  }
}

function addGitActionItem() {
  const gitRecords = ledgerRecords.filter((record) => ["git_branch", "git_stage", "git_commit"].includes(record.kind));
  const pendingRequired = gitRecords.filter((record) => record.status === "pending" && !record.optional);
  items.push(item({
    id: "GIT-ACTIONS",
    kind: "git_action",
    title: "Git branch, stage, commit, or push",
    status: pendingRequired.length ? "pending" : "not_required",
    risk: pendingRequired.length ? "high" : "medium",
    required: pendingRequired.length > 0,
    provider: "system",
    surface: "local_script",
    reason: pendingRequired.length
      ? `${pendingRequired.length} required git action(s) need approval.`
      : "No required git action is queued; generated git records are manual templates only.",
    evidence: compact([refs.approvalLedger]),
    nextAction: pendingRequired.length ? "Inspect the diff and approve the specific git action." : "Do not commit or push until a human explicitly requests it.",
  }));
}

function addAcceptanceItem() {
  const completed = loopStateMachine?.status === "completed" && loopStateMachine?.currentState === "closed";
  items.push(item({
    id: "FINAL-ACCEPTANCE",
    kind: "acceptance",
    title: "Final loop acceptance evidence",
    status: completed ? "approved" : loopStateMachine?.blockers?.length ? "blocked" : "pending",
    risk: "medium",
    required: !completed,
    provider: "system",
    surface: "local_script",
    reason: completed
      ? "Loop state machine reports a closed lifecycle."
      : "Final acceptance remains pending until the loop lifecycle is closed with evidence.",
    evidence: compact([refs.loopStateMachine, path.join(dbcPath, "reports")]),
    nextAction: completed ? "Use the closed state machine as acceptance evidence." : "Complete or repair loop lifecycle evidence before final acceptance.",
  }));
}

function addRevertItem() {
  const activeRealProviders = revertEvidence?.providers?.activeRealProviders || [];
  const blocked = Boolean(revertEvidence?.blockers?.length);
  items.push(item({
    id: "REVERT-TO-MOCK",
    kind: "revert",
    title: "Revert providers to mock profile",
    status: blocked ? "blocked" : activeRealProviders.length ? "pending" : "not_required",
    risk: activeRealProviders.length ? "high" : "low",
    required: activeRealProviders.length > 0,
    provider: "system",
    surface: "local_script",
    reason: activeRealProviders.length
      ? `${activeRealProviders.length} real provider(s) are active; revert evidence is required after the run.`
      : "Providers are already in mock-ready state.",
    evidence: compact([refs.revertEvidence, path.join(dbcPath, "providers.mock.yaml")]),
    nextAction: activeRealProviders.length ? "Run pnpm providers:apply-mock and regenerate revert evidence after the real run." : "No revert action is required now.",
  }));
}

function item(value) {
  const allowedByPolicy = !value.surface || value.surface === "local_script" || value.surface === "human_operated_terminal" || surfacesPolicy.includes(value.surface);
  const status = allowedByPolicy ? value.status : "blocked";
  return {
    version: 1,
    id: value.id,
    kind: value.kind,
    title: value.title,
    status,
    risk: value.risk,
    required: Boolean(value.required),
    reason: allowedByPolicy ? value.reason : `${value.reason} Surface ${value.surface} is not present in allowed surfaces policy.`,
    provider: value.provider || "",
    surface: value.surface || "",
    decisionPath: value.decisionPath || "",
    sourceStatus: value.sourceStatus || "",
    evidence: compact(value.evidence || []),
    nextAction: value.nextAction || "",
  };
}

function queueStatus(recordStatus, decision) {
  const value = decision || recordStatus || "pending";
  if (value === "approved") return "approved";
  if (value === "rejected" || value === "changes_requested") return "blocked";
  if (value === "template") return "not_required";
  return "pending";
}

function loadDecisions(dirPath) {
  const output = new Map();
  if (!existsSync(dirPath)) return output;
  for (const entry of readdirSync(dirPath)) {
    if (!entry.endsWith(".json")) continue;
    const filePath = path.join(dirPath, entry);
    if (!statSync(filePath).isFile()) continue;
    const decision = readJson(filePath);
    if (decision?.id) output.set(decision.id, decision);
  }
  return output;
}

function loadHarnessGates(dirPath) {
  if (!existsSync(dirPath)) return [];
  const gates = [];
  for (const entry of readdirSync(dirPath)) {
    if (!entry.endsWith(".json")) continue;
    const filePath = path.join(dirPath, entry);
    if (!statSync(filePath).isFile()) continue;
    const gate = readJson(filePath);
    if (gate?.kind === "harness-approval-gate") gates.push(gate);
  }
  return gates;
}

function harnessGateStatus(status) {
  if (status === "approved") return "approved";
  if (status === "not_required") return "not_required";
  if (status === "blocked" || status === "rejected") return "blocked";
  return "pending";
}

function harnessGateNextAction(gate) {
  const status = harnessGateStatus(gate.status);
  if (status === "approved") return "Harness gate is approved.";
  if (status === "not_required") return "Harness gate is not required for this run mode.";
  if (status === "blocked") return "Review the Harness gate and create a new bounded contract or slice.";
  return `Resolve Harness ${gate.phase || "approval"} gate before continuing.`;
}

function operatorApprovalMatches(approval, checklist) {
  if (!approval?.approved || !checklist) return false;
  const budgetLimit = Number(checklist.budget?.budgetLimit ?? checklist.task?.budgetLimit ?? 0);
  return (
    approval.checklistGeneratedAt === checklist.generatedAt &&
    approval.taskId === checklist.task?.id &&
    Math.abs(Number(approval.budgetLimit ?? -1) - budgetLimit) <= Number.EPSILON
  );
}

function nextAction(status, pendingRequired) {
  if (status === "blocked") return "Fix blocked approval queue items, then rerun pnpm approval-queue.";
  if (pendingRequired.length) return `Resolve ${pendingRequired.length} required approval item(s): ${pendingRequired.map((item) => item.id).join(", ")}.`;
  return "Approval queue is ready; continue only with the approved bounded real-micro workflow.";
}

function queueMarkdown(value) {
  return [
    "# Approval Queue",
    "",
    `Status: ${value.status}`,
    `Generated: ${value.generatedAt}`,
    `Project: ${value.projectPath}`,
    "",
    "## Summary",
    `- Required: ${value.summary.required}`,
    `- Pending required: ${value.summary.pendingRequired}`,
    `- Approved: ${value.summary.approved}`,
    `- Blocked: ${value.summary.blocked}`,
    `- Not required: ${value.summary.notRequired}`,
    "",
    "## Next Action",
    `- ${value.nextAction}`,
    "",
    "## Items",
    ...value.items.flatMap((entry) => [
      `- ${entry.id}: ${entry.status} [${entry.kind}] ${entry.title}`,
      `  - Required: ${entry.required}`,
      `  - Risk: ${entry.risk}`,
      entry.surface ? `  - Surface: ${entry.surface}` : "",
      entry.provider ? `  - Provider: ${entry.provider}` : "",
      entry.decisionPath ? `  - Decision: ${entry.decisionPath}` : "",
      `  - Reason: ${entry.reason}`,
      entry.nextAction ? `  - Next: ${entry.nextAction}` : "",
    ].filter(Boolean)),
    "",
    "## Blockers",
    ...(value.blockers.length ? value.blockers.map((entry) => `- ${entry.subject}: ${entry.detail}`) : ["- None"]),
    "",
    "## Warnings",
    ...(value.warnings.length ? value.warnings.map((entry) => `- ${entry.subject}: ${entry.detail}`) : ["- None"]),
    "",
  ].join("\n");
}

function readJson(filePath) {
  if (!filePath || !existsSync(filePath)) return undefined;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function readText(filePath) {
  return filePath && existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sanitizeFileStem(value) {
  return String(value).replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 140) || "approval";
}

function compact(values) {
  return values.filter(Boolean);
}

function statusRank(status) {
  return { blocked: 0, pending: 1, approved: 2, not_required: 3 }[status] ?? 4;
}
