import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const outputDir = path.join(dbcPath, "preflight");
mkdirSync(outputDir, { recursive: true });

const requiredDecisions = ["REAL-MICRO-HUMAN-GATE", "APPLY-REAL-MICRO-PROFILE", "RUN-REAL-MICRO-TASK"];
const intendedRealProviders = ["codex_cli", "claude_code", "local_terminal"];
const refs = {
  task: path.join(dbcPath, "tasks", "REAL-MICRO-README.json"),
  operator: path.join(dbcPath, "operator", "latest.json"),
  operatorApproval: path.join(dbcPath, "operator", "approval.json"),
  approvalLedger: path.join(dbcPath, "approvals", "latest.json"),
  providerContracts: path.join(dbcPath, "provider-contracts", "latest.json"),
  readiness: path.join(dbcPath, "readiness", "latest.json"),
  realPlan: path.join(dbcPath, "real-loop", "latest.json"),
  comparison: path.join(dbcPath, "compare", "latest.json"),
  revert: path.join(dbcPath, "revert", "latest.json"),
  providers: path.join(dbcPath, "providers.yaml"),
  realProfile: path.join(dbcPath, "providers.real-micro.yaml"),
  mockProfile: path.join(dbcPath, "providers.mock.yaml"),
};

const task = readJson(refs.task);
const operator = readJson(refs.operator);
const operatorApproval = readJson(refs.operatorApproval);
const ledger = readJson(refs.approvalLedger);
const contracts = readJson(refs.providerContracts);
const readiness = readJson(refs.readiness);
const realPlan = readJson(refs.realPlan);
const comparison = readJson(refs.comparison);
const revert = readJson(refs.revert);
const providers = parseProviders(readText(refs.providers));

const blockers = [];
const warnings = [];
const checks = [];

checkFile("task", refs.task);
checkFile("operator checklist", refs.operator);
checkFile("approval ledger", refs.approvalLedger);
checkFile("provider contracts", refs.providerContracts);
checkFile("readiness", refs.readiness);
checkFile("real plan", refs.realPlan);
checkFile("comparison", refs.comparison);
checkFile("revert evidence", refs.revert);
checkFile("providers", refs.providers);
checkFile("real profile", refs.realProfile);
checkFile("mock profile", refs.mockProfile);

checkTask(task);
checkOperator(operator, operatorApproval);
checkLedger(ledger);
checkProviderContracts(contracts);
checkReadiness(readiness);
checkRealPlan(realPlan);
checkComparison(comparison);
checkRevert(revert);
checkProviders(providers);

const approvedDecisions = Object.fromEntries(
  requiredDecisions.map((id) => {
    const decision = readJson(path.join(dbcPath, "approvals", "decisions", `${id}.json`));
    return [id, decision?.decision === "approved"];
  }),
);
const approvalsReady = requiredDecisions.every((id) => approvedDecisions[id]);
const activeRealProviders = providers.filter((provider) => intendedRealProviders.includes(provider.id) && provider.runMode === "real");
const activeRealProviderIds = activeRealProviders.map((provider) => provider.id);
const profileReady = intendedRealProviders.every((id) => activeRealProviderIds.includes(id));
const anyRealProvider = providers.some((provider) => provider.runMode === "real");
const terminalHandoffProviderIds = activeRealProviders
  .filter((provider) => provider.promptMode === "terminal")
  .map((provider) => provider.id);

if (anyRealProvider && !approvalsReady) {
  fail("real profile safety", "A real provider is active before all required approval decisions are approved.");
}

if (terminalHandoffProviderIds.length) {
  warn(
    "terminal handoff",
    `Provider(s) ${terminalHandoffProviderIds.join(", ")} require a human-operated terminal; DBC will stop before non-interactive execution.`,
  );
}

const status = blockers.length
  ? "blocked"
  : !approvalsReady
    ? "awaiting_human_approval"
    : !profileReady
      ? "ready_to_apply_real_profile"
      : "ready_to_run";

const report = {
  version: 1,
  kind: "real-micro-preflight",
  generatedAt: String(Date.now()),
  projectPath,
  status,
  blockers,
  warnings,
  checks,
  approvals: {
    required: requiredDecisions,
    approved: approvedDecisions,
    ready: approvalsReady,
  },
  profile: {
    intendedRealProviders,
    activeRealProviderIds,
    ready: profileReady,
  },
  terminalHandoff: {
    required: terminalHandoffProviderIds.length > 0,
    providerIds: terminalHandoffProviderIds,
    surface: "human_operated_terminal",
  },
  task: {
    id: task?.id || "",
    budgetLimit: task?.budgetLimit ?? 0,
    loopProfile: task?.loopProfile || "",
    providerStrategy: task?.providerStrategy || "",
    allowedPaths: task?.allowedPaths || [],
    deniedPaths: task?.deniedPaths || [],
  },
  refs,
  nextAction:
    status === "blocked"
      ? "Fix blockers, rerun pnpm launch-doctor, then rerun pnpm real-micro-preflight."
      : status === "awaiting_human_approval"
        ? "Review and approve the Operator Gate before applying real micro mode."
        : status === "ready_to_apply_real_profile"
          ? "Apply the real micro provider profile, reload project config, then open Preflight for REAL-MICRO-README."
          : "Open Preflight and run only REAL-MICRO-README.",
};

const jsonPath = path.join(outputDir, "latest.json");
const markdownPath = path.join(outputDir, "latest.md");
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(markdownPath, markdown(report));

console.log(JSON.stringify({ status, blockers: blockers.length, warnings: warnings.length, jsonPath, markdownPath }, null, 2));
if (blockers.length) process.exitCode = 1;

function checkFile(subject, filePath) {
  if (existsSync(filePath)) pass(subject, filePath);
  else fail(subject, `${filePath} is missing.`);
}

function checkTask(value) {
  if (!value) return;
  if (value.id === "REAL-MICRO-README") pass("task id", value.id);
  else fail("task id", `Expected REAL-MICRO-README, got ${value.id || "missing"}.`);
  if (value.loopProfile === "real_micro") pass("task profile", "real_micro");
  else fail("task profile", `Expected real_micro, got ${value.loopProfile || "missing"}.`);
  if (Number(value.budgetLimit) > 0) pass("task budget", `budgetLimit ${value.budgetLimit}`);
  else fail("task budget", "Real micro task requires positive budgetLimit.");
  if ((value.allowedPaths || []).includes("README.md")) pass("task scope", "README.md allowed.");
  else fail("task scope", "README.md must be in allowedPaths.");
  if ((value.deniedPaths || []).some((item) => item === ".env")) pass("task denied paths", ".env denied.");
  else warn("task denied paths", ".env is not explicitly denied.");
}

function checkOperator(value, approval) {
  if (!value) return;
  if (value.kind !== "operator-checklist") {
    fail("operator checklist", "Invalid checklist kind.");
    return;
  }
  if ((value.blockers || []).length) fail("operator checklist", `${value.blockers.length} blocker(s).`);
  else pass("operator checklist", value.status || "unknown");
  if (!operatorApprovalMatches(approval, value)) warn("operator approval", "Approval is missing or stale.");
  else pass("operator approval", "Approval matches current checklist.");
}

function checkLedger(value) {
  if (!value) return;
  if (value.kind !== "approval-ledger") {
    fail("approval ledger", "Invalid ledger kind.");
    return;
  }
  for (const id of requiredDecisions) {
    const decision = readJson(path.join(dbcPath, "approvals", "decisions", `${id}.json`));
    if (decision?.decision === "approved") pass(`approval ${id}`, "approved");
    else warn(`approval ${id}`, "pending");
  }
}

function checkProviderContracts(value) {
  if (!value) return;
  if (value.kind !== "provider-contracts") {
    fail("provider contracts", "Invalid provider contract report kind.");
    return;
  }
  if ((value.blockers || []).length) fail("provider contracts", `${value.blockers.length} blocker(s).`);
  else pass("provider contracts", value.status || "ok");
  for (const item of value.warnings || []) warn(`provider contract: ${item.providerId}/${item.subject}`, item.detail);
}

function checkReadiness(value) {
  if (!value) return;
  if ((value.blockers || []).length) fail("readiness", `${value.blockers.length} blocker(s).`);
  else pass("readiness", value.status || "unknown");
  for (const item of value.warnings || []) warn(`readiness: ${item.subject}`, item.detail);
}

function checkRealPlan(value) {
  if (!value) return;
  if (value.status === "prepared" && value.task?.id === "REAL-MICRO-README") pass("real micro plan", "prepared");
  else fail("real micro plan", `Unexpected status/task: ${value.status || "missing"} / ${value.task?.id || "missing"}.`);
}

function checkComparison(value) {
  if (!value) return;
  if ((value.blockers || []).length) fail("comparison", `${value.blockers.length} blocker(s).`);
  else pass("comparison", value.status || "unknown");
  if (!["pending_real", "pass", "pass_with_warnings"].includes(value.status)) {
    fail("comparison status", `Unexpected status ${value.status || "missing"}.`);
  }
}

function checkRevert(value) {
  if (!value) return;
  if (value.kind !== "revert-evidence") {
    fail("revert evidence", "Invalid revert evidence kind.");
    return;
  }
  if ((value.blockers || []).length) fail("revert evidence", `${value.blockers.length} blocker(s).`);
  else pass("revert evidence", value.status || "ok");
}

function checkProviders(value) {
  for (const id of intendedRealProviders) {
    const provider = value.find((item) => item.id === id);
    if (!provider) {
      fail(`provider ${id}`, "Missing provider.");
      continue;
    }
    if (provider.runMode === "real") pass(`provider ${id}`, "real");
    else warn(`provider ${id}`, `runMode is ${provider.runMode || "mock"}.`);
  }
}

function operatorApprovalMatches(approval, checklist) {
  if (!approval?.approved) return false;
  const budgetLimit = Number(checklist.budget?.budgetLimit ?? checklist.task?.budgetLimit ?? 0);
  return approval.checklistGeneratedAt === checklist.generatedAt &&
    approval.taskId === checklist.task?.id &&
    Math.abs(Number(approval.budgetLimit ?? -1) - budgetLimit) <= Number.EPSILON;
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

function markdown(value) {
  return [
    "# Real Micro Preflight",
    "",
    `Status: ${value.status}`,
    `Generated: ${value.generatedAt}`,
    `Project: ${value.projectPath}`,
    "",
    "## Next Action",
    `- ${value.nextAction}`,
    "",
    "## Approvals",
    ...value.approvals.required.map((id) => `- ${id}: ${value.approvals.approved[id] ? "approved" : "pending"}`),
    "",
    "## Profile",
    `- Ready: ${value.profile.ready}`,
    `- Active real providers: ${value.profile.activeRealProviderIds.join(", ") || "none"}`,
    `- Terminal handoff: ${value.terminalHandoff.required ? value.terminalHandoff.providerIds.join(", ") : "not required"}`,
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
