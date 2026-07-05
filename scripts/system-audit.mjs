import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const auditDir = path.join(dbcPath, "audit");
mkdirSync(auditDir, { recursive: true });

const refs = {
  release: path.join(dbcPath, "release", "latest.json"),
  readiness: path.join(dbcPath, "readiness", "latest.json"),
  realPlan: path.join(dbcPath, "real-loop", "latest.json"),
  comparison: path.join(dbcPath, "compare", "latest.json"),
  operator: path.join(dbcPath, "operator", "latest.json"),
  operatorApproval: path.join(dbcPath, "operator", "approval.json"),
  approvalLedger: path.join(dbcPath, "approvals", "latest.json"),
  approvalQueue: path.join(dbcPath, "approval-queue", "latest.json"),
  loopStateMachine: path.join(dbcPath, "state-machine", "latest.json"),
  runJournal: path.join(dbcPath, "run-journal", "latest.json"),
  evidenceSummary: path.join(dbcPath, "evidence-summary", "latest.json"),
  providerContracts: path.join(dbcPath, "provider-contracts", "latest.json"),
  providerSessions: path.join(dbcPath, "provider-sessions", "latest.json"),
  revertEvidence: path.join(dbcPath, "revert", "latest.json"),
  realMicroPreflight: path.join(dbcPath, "preflight", "latest.json"),
  realMicroRunbook: path.join(dbcPath, "runbook", "latest.json"),
  supportBundle: path.join(dbcPath, "support", "latest.json"),
  launchDoctor: path.join(dbcPath, "doctor", "latest.json"),
  providers: path.join(dbcPath, "providers.yaml"),
  surfacesPolicy: path.join(dbcPath, "policy", "surfaces.md"),
  task: path.join(dbcPath, "tasks", "REAL-MICRO-README.json"),
};

const release = readJson(refs.release);
const readiness = readJson(refs.readiness);
const realPlan = readJson(refs.realPlan);
const comparison = readJson(refs.comparison);
const operator = readJson(refs.operator);
const approval = readJson(refs.operatorApproval);
const approvalLedger = readJson(refs.approvalLedger);
const approvalQueue = readJson(refs.approvalQueue);
const loopStateMachine = readJson(refs.loopStateMachine);
const runJournal = readJson(refs.runJournal);
const evidenceSummary = readJson(refs.evidenceSummary);
const providerContracts = readJson(refs.providerContracts);
const providerSessions = readJson(refs.providerSessions);
const revertEvidence = readJson(refs.revertEvidence);
const realMicroPreflight = readJson(refs.realMicroPreflight);
const realMicroRunbook = readJson(refs.realMicroRunbook);
const supportBundle = readJson(refs.supportBundle);
const launchDoctor = readJson(refs.launchDoctor);
const providersText = readText(refs.providers);
const providers = parseProviders(providersText);
const controlledReport = readJson(comparison?.refs?.controlledReportPath || "");

const checks = [];
const blockers = [];
const warnings = [];

checkFile("release package", refs.release);
checkFile("readiness report", refs.readiness);
checkFile("real micro plan", refs.realPlan);
checkFile("comparison report", refs.comparison);
checkFile("operator checklist", refs.operator);
if (existsSync(refs.approvalLedger)) pass("approval ledger", refs.approvalLedger);
else warn("approval ledger", "Run pnpm approval-ledger -- generate to create approval records.");
if (existsSync(refs.approvalQueue)) pass("approval queue", refs.approvalQueue);
else warn("approval queue", "Run pnpm approval-queue to create the unified approval queue.");
if (existsSync(refs.loopStateMachine)) pass("loop state machine", refs.loopStateMachine);
else warn("loop state machine", "Run pnpm loop-state-machine to create lifecycle transition evidence.");
if (existsSync(refs.runJournal)) pass("run journal", refs.runJournal);
else warn("run journal", "Run pnpm run-journal to create run event timeline evidence.");
if (existsSync(refs.evidenceSummary)) pass("evidence summary", refs.evidenceSummary);
else warn("evidence summary", "Run pnpm evidence-summary -- --latest to create the loop evidence summary.");
if (existsSync(refs.providerContracts)) pass("provider contracts", refs.providerContracts);
else warn("provider contracts", "Run pnpm provider-contracts to create the CLI contract report.");
if (existsSync(refs.providerSessions)) pass("provider sessions", refs.providerSessions);
else warn("provider sessions", "Run pnpm provider-sessions to create provider session readiness.");
if (existsSync(refs.revertEvidence)) pass("revert evidence", refs.revertEvidence);
else warn("revert evidence", "Run pnpm revert-evidence to create provider revert evidence.");
if (existsSync(refs.realMicroPreflight)) pass("real micro preflight", refs.realMicroPreflight);
else warn("real micro preflight", "Run pnpm real-micro-preflight to create the dry-run launch gate report.");
if (existsSync(refs.realMicroRunbook)) pass("real micro runbook", refs.realMicroRunbook);
else warn("real micro runbook", "Run pnpm real-micro-runbook to create the operator launch runbook.");
if (existsSync(refs.surfacesPolicy)) pass("surface policy", refs.surfacesPolicy);
else warn("surface policy", "Run pnpm real-micro-runbook to record allowed/denied automation surfaces.");
if (existsSync(refs.supportBundle)) pass("support bundle", refs.supportBundle);
else warn("support bundle", "Run pnpm support-bundle to create the operator handoff package.");
if (existsSync(refs.launchDoctor)) pass("launch doctor", refs.launchDoctor);
else warn("launch doctor", "Run pnpm launch-doctor to create the one-command launch report.");
checkFile("provider contract", refs.providers);
checkFile("real micro task", refs.task);
checkRelease(release);
checkReadiness(readiness);
checkRealPlan(realPlan);
checkComparison(comparison);
checkOperator(operator, approval);
checkApprovalLedger(approvalLedger);
checkApprovalQueue(approvalQueue);
checkLoopStateMachine(loopStateMachine);
checkRunJournal(runJournal);
checkEvidenceSummary(evidenceSummary);
checkProviderContracts(providerContracts);
checkProviderSessions(providerSessions);
checkRevertEvidence(revertEvidence);
checkRealMicroPreflight(realMicroPreflight);
checkRealMicroRunbook(realMicroRunbook);
checkSupportBundle(supportBundle);
checkLaunchDoctor(launchDoctor);
checkProviders(providers);
checkControlledSmoke(controlledReport, comparison?.refs?.controlledReportPath || "");

const status = blockers.length
  ? "blocked"
  : operator?.approval?.approved
    ? "ready_to_apply_real_micro"
    : "ready_for_human_approval";

const report = {
  version: 1,
  kind: "dbc-system-audit",
  generatedAt: String(Date.now()),
  projectPath,
  status,
  blockers,
  warnings,
  checks,
  refs: {
    ...refs,
    controlledReport: comparison?.refs?.controlledReportPath || "",
    releaseDmg: release?.paths?.dmg || "",
  },
  nextAction:
    status === "blocked"
      ? "Fix blockers, regenerate readiness/plan/operator reports, then rerun pnpm system-audit."
      : status === "ready_for_human_approval"
        ? "Review .dbc/operator/latest.md, then approve through the app or pnpm operator-approve."
        : "Apply real micro profile and run only REAL-MICRO-README through Preflight.",
  expectedHumanGate: {
    required: true,
    status: operator?.approval?.status || "missing_or_stale",
    approvalPath: refs.operatorApproval,
  },
};

const jsonPath = path.join(auditDir, "latest.json");
const markdownPath = path.join(auditDir, "latest.md");
writeJson(jsonPath, report);
writeFileSync(markdownPath, auditMarkdown(report));

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

function checkFile(subject, filePath) {
  if (filePath && existsSync(filePath)) pass(subject, filePath);
  else fail(subject, `${filePath || subject} is missing.`);
}

function checkRelease(value) {
  if (!value) return;
  const failed = Object.entries(value.checklist || {}).filter(([, ready]) => ready !== true);
  if (failed.length) fail("release checklist", `Failing items: ${failed.map(([key]) => key).join(", ")}`);
  else pass("release checklist", `DMG checksum ${value.checksums?.dmg || "missing"}.`);
  if (value.paths?.dmg && existsSync(value.paths.dmg)) pass("release dmg", value.paths.dmg);
  else fail("release dmg", "DMG file is missing.");
}

function checkReadiness(value) {
  if (!value) return;
  if (value.blockers?.length) fail("readiness", `${value.blockers.length} blocker(s).`);
  else pass("readiness", value.status || "unknown");
  for (const item of value.warnings || []) warn(`readiness: ${item.subject}`, item.detail);
}

function checkRealPlan(value) {
  if (!value) return;
  if (value.status === "prepared" && !(value.blockers || []).length) pass("real micro plan", `${value.task?.id}; budget ${value.task?.budgetLimit}`);
  else fail("real micro plan", `Status ${value.status || "missing"}.`);
  if (value.task?.id !== "REAL-MICRO-README") fail("real micro task", `Unexpected task ${value.task?.id || "missing"}.`);
  if (value.task?.budgetLimit !== 1) fail("real micro budget", `Expected budgetLimit 1, got ${value.task?.budgetLimit}.`);
}

function checkComparison(value) {
  if (!value) return;
  if (value.blockers?.length) fail("comparison", `${value.blockers.length} blocker(s).`);
  else pass("comparison", value.status || "unknown");
  if (value.status !== "pending_real" && value.status !== "pass" && value.status !== "pass_with_warnings") {
    fail("comparison status", `Unexpected status ${value.status}.`);
  }
}

function checkOperator(value, approvalValue) {
  if (!value) return;
  if (value.blockers?.length) fail("operator checklist", `${value.blockers.length} blocker(s).`);
  else pass("operator checklist", value.status || "unknown");
  if (!["awaiting_human_approval", "ready_to_start_real_micro", "real_profile_already_active"].includes(value.status)) {
    fail("operator status", `Unexpected status ${value.status || "missing"}.`);
  }
  if (value.status === "awaiting_human_approval" && !approvalValue) {
    pass("human gate", "Approval is intentionally missing; real loop remains blocked until human approval.");
  } else if (approvalMatches(approvalValue, value)) {
    pass("human gate", "Approval artifact matches checklist.");
  } else {
    warn("human gate", "Approval artifact is missing or stale.");
  }
}

function checkApprovalLedger(value) {
  if (!value) return;
  if (value.kind !== "approval-ledger") {
    fail("approval ledger", "Invalid ledger kind.");
    return;
  }
  if ((value.records || []).some((record) => record.kind === "real_loop_gate")) {
    pass("approval ledger", `${value.pending ?? 0} pending actionable approval(s).`);
  } else {
    warn("approval ledger", "No real loop gate approval record found.");
  }
  for (const record of value.records || []) {
    if (record.status === "pending") warn(`approval pending: ${record.id}`, record.action);
  }
}

function checkApprovalQueue(value) {
  if (!value) return;
  if (value.kind !== "approval-queue") {
    fail("approval queue", "Invalid approval queue kind.");
    return;
  }
  if (value.blockers?.length) {
    fail("approval queue", `${value.blockers.length} blocker(s).`);
  } else {
    pass("approval queue", value.status || "unknown");
  }
  if (value.status === "pending_approval") {
    pass("approval queue pending", `${value.summary?.pendingRequired ?? 0} required approval item(s) intentionally wait for a human.`);
  }
  for (const item of value.items || []) {
    if (item.required && item.status === "pending") warn(`approval queue pending: ${item.id}`, item.nextAction || item.reason);
    if (item.status === "blocked") fail(`approval queue blocked: ${item.id}`, item.reason);
  }
}

function checkEvidenceSummary(value) {
  if (!value) return;
  if (value.kind !== "loop-evidence-summary") {
    fail("evidence summary", "Invalid evidence summary kind.");
    return;
  }
  if (value.health?.missingArtifacts) {
    fail("evidence summary", `${value.health.missingArtifacts} missing artifact(s).`);
  } else {
    pass("evidence summary completeness", `${value.loopId}; ${value.health?.stepEvidenceCount ?? 0} step evidence file(s).`);
  }
  if (value.health?.pendingApprovals) {
    warn("evidence summary approvals", `${value.health.pendingApprovals} pending approval(s).`);
  }
  if (value.health?.scopePassed === true) pass("evidence summary scope", "scopePassed true");
  else warn("evidence summary scope", "scope gate is not passed.");
}

function checkProviderContracts(value) {
  if (!value) return;
  if (value.kind !== "provider-contracts") {
    fail("provider contracts", "Invalid provider contract report kind.");
    return;
  }
  if (value.blockers?.length) {
    fail("provider contracts", `${value.blockers.length} blocker(s).`);
  } else {
    pass("provider contracts", value.status || "ok");
  }
  for (const item of value.warnings || []) {
    warn(`provider contract: ${item.providerId}/${item.subject}`, item.detail);
  }
}

function checkLoopStateMachine(value) {
  if (!value) return;
  if (value.kind !== "loop-state-machine") {
    fail("loop state machine", "Invalid loop state machine kind.");
    return;
  }
  if (value.blockers?.length) {
    fail("loop state machine", `${value.blockers.length} blocker(s).`);
  } else {
    pass("loop state machine", value.status || "ok");
  }
  if (value.status === "completed") pass("loop lifecycle", "state machine closed");
  else warn("loop lifecycle", `state machine status is ${value.status || "missing"}.`);
  for (const item of value.warnings || []) {
    warn(`loop state machine: ${item.subject}`, item.detail);
  }
}

function checkRunJournal(value) {
  if (!value) return;
  if (value.kind !== "run-journal") {
    fail("run journal", "Invalid run journal kind.");
    return;
  }
  if (value.blockers?.length) {
    fail("run journal", `${value.blockers.length} blocker(s).`);
  } else {
    pass("run journal", value.status || "unknown");
  }
  if ((value.summary?.events ?? 0) > 0) pass("run journal events", `${value.summary.events} event(s).`);
  else fail("run journal events", "No events were recorded.");
  if ((value.providerCalls || []).length > 0) pass("run journal provider calls", `${value.providerCalls.length} provider call record(s).`);
  else warn("run journal provider calls", "No provider call records were found.");
  if (value.status === "pending_approval") {
    pass("run journal pending", "Run journal correctly reflects a human approval wait state.");
  }
  for (const item of value.warnings || []) {
    warn(`run journal: ${item.subject}`, item.detail);
  }
}

function checkProviderSessions(value) {
  if (!value) return;
  if (value.kind !== "provider-sessions") {
    fail("provider sessions", "Invalid provider sessions report kind.");
    return;
  }
  if (value.blockers?.length) {
    fail("provider sessions", `${value.blockers.length} blocker(s).`);
  } else {
    pass("provider sessions", value.status || "ok");
  }
  for (const item of value.warnings || []) {
    warn(`provider session: ${item.providerId}/${item.subject}`, item.detail);
  }
}

function checkRevertEvidence(value) {
  if (!value) return;
  if (value.kind !== "revert-evidence") {
    fail("revert evidence", "Invalid revert evidence kind.");
    return;
  }
  if (value.blockers?.length) {
    fail("revert evidence", `${value.blockers.length} blocker(s).`);
  } else {
    pass("revert evidence", value.status || "ok");
  }
  for (const item of value.warnings || []) {
    warn(`revert evidence: ${item.subject}`, item.detail);
  }
}

function checkRealMicroPreflight(value) {
  if (!value) return;
  if (value.kind !== "real-micro-preflight") {
    fail("real micro preflight", "Invalid preflight report kind.");
    return;
  }
  if (value.blockers?.length) {
    fail("real micro preflight", `${value.blockers.length} blocker(s).`);
  } else {
    pass("real micro preflight", value.status || "ok");
  }
  if (value.status === "awaiting_human_approval") {
    pass("real micro human gate", "Real micro launch remains blocked until explicit approval.");
  } else if (value.status === "ready_to_apply_real_profile" || value.status === "ready_to_run") {
    pass("real micro launch gate", value.status);
  } else if (value.status !== "blocked") {
    warn("real micro preflight status", `Unexpected status ${value.status || "missing"}.`);
  }
  for (const item of value.warnings || []) {
    warn(`real micro preflight: ${item.subject}`, item.detail);
  }
}

function checkRealMicroRunbook(value) {
  if (!value) return;
  if (value.kind !== "real-micro-runbook") {
    fail("real micro runbook", "Invalid runbook kind.");
    return;
  }
  if (value.blockers?.length) {
    fail("real micro runbook", `${value.blockers.length} blocker(s).`);
  } else {
    pass("real micro runbook", value.status || "ok");
  }
  const deniedSurface = (value.surfaces?.denied || []).some((item) => item.id === "consumer_web_automation");
  if (deniedSurface) pass("surface policy", "consumer web automation denied");
  else fail("surface policy", "Runbook must deny consumer web automation.");
  const officialCli = (value.surfaces?.allowed || []).some((item) => item.id === "official_cli");
  if (officialCli) pass("surface policy", "official CLI surface allowed");
  else fail("surface policy", "Runbook must allow official CLI surface.");
  for (const item of value.warnings || []) {
    warn(`real micro runbook: ${item.subject}`, item.detail);
  }
}

function checkSupportBundle(value) {
  if (!value) return;
  if (value.kind !== "support-bundle") {
    fail("support bundle", "Invalid support bundle kind.");
    return;
  }
  if (value.blockers?.length) {
    fail("support bundle", `${value.blockers.length} blocker(s).`);
  } else {
    pass("support bundle", value.status || "ok");
  }
  if (!value.bundleDir || !existsSync(value.bundleDir)) warn("support bundle directory", "Bundle directory is missing.");
  else pass("support bundle directory", value.bundleDir);
  if (!Array.isArray(value.files) || value.files.length === 0) fail("support bundle files", "No files were included.");
  else pass("support bundle files", `${value.files.length} file(s).`);
  if (value.tarPath && existsSync(value.tarPath)) pass("support bundle archive", value.tarPath);
  else warn("support bundle archive", "Archive is missing; directory bundle remains available.");
  for (const item of value.warnings || []) {
    warn(`support bundle: ${item.subject}`, item.detail);
  }
}

function checkLaunchDoctor(value) {
  if (!value) return;
  if (value.kind !== "launch-doctor") {
    fail("launch doctor", "Invalid launch doctor kind.");
    return;
  }
  if (value.blockers?.length) {
    fail("launch doctor", `${value.blockers.length} blocker(s).`);
  } else {
    pass("launch doctor", value.status || "ok");
  }
}

function checkProviders(value) {
  for (const id of ["codex_cli", "claude_code", "local_terminal"]) {
    const provider = value.find((item) => item.id === id);
    if (!provider) {
      fail(`provider ${id}`, "Missing provider.");
      continue;
    }
    if (provider.runMode === "mock") pass(`provider ${id}`, "mock");
    else warn(`provider ${id}`, `runMode is ${provider.runMode}; expected mock before human approval.`);
  }
}

function checkControlledSmoke(value, filePath) {
  if (!value) {
    fail("controlled smoke", "Controlled smoke report is missing.");
    return;
  }
  if (value.status === "completed" && value.verdict === "accepted") pass("controlled smoke", filePath);
  else fail("controlled smoke", `Status ${value.status}; verdict ${value.verdict}.`);
  if (value.gates?.realProviderBudgetOk === true) pass("controlled smoke budget gate", "realProviderBudgetOk true");
  else fail("controlled smoke budget gate", "realProviderBudgetOk is not true.");
}

function approvalMatches(approvalValue, checklist) {
  if (!approvalValue?.approved) return false;
  return (
    approvalValue.checklistGeneratedAt === checklist.generatedAt &&
    approvalValue.taskId === checklist.task?.id &&
    Math.abs((approvalValue.budgetLimit ?? -1) - (checklist.budget?.budgetLimit ?? -2)) <= Number.EPSILON
  );
}

function pass(subject, detail) {
  checks.push({ level: "ok", subject, detail });
}

function warn(subject, detail) {
  warnings.push({ subject, detail });
  checks.push({ level: "warning", subject, detail });
}

function fail(subject, detail) {
  blockers.push({ subject, detail });
  checks.push({ level: "error", subject, detail });
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

function parseProviders(text) {
  const blocks = text.split(/\n  - id: /).slice(1);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const provider = { id: lines[0].trim() };
    for (const line of lines.slice(1)) {
      const match = line.match(/^    ([A-Za-z0-9_]+):\s*(.*)$/);
      if (!match) continue;
      provider[match[1]] = unquote(match[2].trim());
    }
    return provider;
  });
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
  return value;
}

function auditMarkdown(value) {
  return [
    "# DBC System Audit",
    "",
    `Status: ${value.status}`,
    `Generated: ${value.generatedAt}`,
    `Project: ${value.projectPath}`,
    "",
    "## Next Action",
    `- ${value.nextAction}`,
    "",
    "## Human Gate",
    `- Required: ${value.expectedHumanGate.required}`,
    `- Status: ${value.expectedHumanGate.status}`,
    `- Approval: ${value.expectedHumanGate.approvalPath}`,
    "",
    "## Blockers",
    ...(value.blockers.length ? value.blockers.map((item) => `- ${item.subject}: ${item.detail}`) : ["- None"]),
    "",
    "## Warnings",
    ...(value.warnings.length ? value.warnings.map((item) => `- ${item.subject}: ${item.detail}`) : ["- None"]),
    "",
    "## Checks",
    ...value.checks.map((item) => `- [${item.level}] ${item.subject}: ${item.detail}`),
    "",
  ].join("\n");
}
