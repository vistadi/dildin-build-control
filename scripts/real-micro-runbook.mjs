import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const runbookDir = path.join(dbcPath, "runbook");
const policyDir = path.join(dbcPath, "policy");
mkdirSync(runbookDir, { recursive: true });
mkdirSync(policyDir, { recursive: true });

const refs = {
  task: path.join(dbcPath, "tasks", "REAL-MICRO-README.json"),
  readiness: path.join(dbcPath, "readiness", "latest.json"),
  realPlan: path.join(dbcPath, "real-loop", "latest.json"),
  operator: path.join(dbcPath, "operator", "latest.json"),
  operatorApproval: path.join(dbcPath, "operator", "approval.json"),
  approvalLedger: path.join(dbcPath, "approvals", "latest.json"),
  preflight: path.join(dbcPath, "preflight", "latest.json"),
  providerContracts: path.join(dbcPath, "provider-contracts", "latest.json"),
  revertEvidence: path.join(dbcPath, "revert", "latest.json"),
  providers: path.join(dbcPath, "providers.yaml"),
  realProfile: path.join(dbcPath, "providers.real-micro.yaml"),
  mockProfile: path.join(dbcPath, "providers.mock.yaml"),
  surfacesPolicy: path.join(policyDir, "surfaces.md"),
};

const task = readJson(refs.task);
const readiness = readJson(refs.readiness);
const realPlan = readJson(refs.realPlan);
const operator = readJson(refs.operator);
const operatorApproval = readJson(refs.operatorApproval);
const approvalLedger = readJson(refs.approvalLedger);
const preflight = readJson(refs.preflight);
const providerContracts = readJson(refs.providerContracts);
const revertEvidence = readJson(refs.revertEvidence);
const providers = parseProviders(readText(refs.providers));

const blockers = [];
const warnings = [];
const checks = [];

checkFile("task", refs.task, true);
checkFile("readiness", refs.readiness, true);
checkFile("real micro plan", refs.realPlan, true);
checkFile("operator checklist", refs.operator, true);
checkFile("approval ledger", refs.approvalLedger, true);
checkFile("real micro preflight", refs.preflight, true);
checkFile("provider contracts", refs.providerContracts, true);
checkFile("revert evidence", refs.revertEvidence, true);
checkFile("providers", refs.providers, true);
checkFile("real provider profile", refs.realProfile, true);
checkFile("mock provider profile", refs.mockProfile, true);

checkTask(task);
checkPreflight(preflight);
checkOperator(operator, operatorApproval);
checkApprovalLedger(approvalLedger);
checkProviders(providers);
collectArtifactWarnings("readiness", readiness);
collectArtifactWarnings("provider contracts", providerContracts);
collectArtifactWarnings("revert evidence", revertEvidence);

const status = blockers.length
  ? "blocked"
  : preflight?.status === "ready_to_run"
    ? "ready_to_run"
    : preflight?.status === "ready_to_apply_real_profile"
      ? "ready_to_apply_real_profile"
      : "awaiting_human_approval";

const runbook = {
  version: 1,
  kind: "real-micro-runbook",
  generatedAt: String(Date.now()),
  projectPath,
  status,
  blockers,
  warnings,
  checks,
  surfaces: {
    allowed: [
      {
        id: "official_cli",
        detail: "Codex CLI and Claude Code CLI invoked as local terminal commands with exact executable paths.",
      },
      {
        id: "local_terminal",
        detail: "Local build/test commands executed through DBC command policy.",
      },
      {
        id: "tauri_filesystem",
        detail: "DBC reads/writes project-local .dbc artifacts, task specs, reports, and support bundles.",
      },
    ],
    denied: [
      {
        id: "consumer_web_automation",
        detail: "No scraping or automation of ChatGPT, Claude, or other consumer web interfaces.",
      },
      {
        id: "background_real_provider_start",
        detail: "No real provider loop starts without operator checklist, approval artifact, approval ledger decisions, and ready preflight.",
      },
    ],
  },
  sequence: [
    step("review_operator", "Review .dbc/operator/latest.md", "human", "Do not continue until blockers are zero."),
    step("approve_gate", "Approve the operator gate in the app or with pnpm operator-approve", "human", "Writes operator approval and the three real-micro approval decisions."),
    step("apply_real_profile", "Apply real micro provider profile", "human", "Switches only Codex CLI, Claude Code, and Local Terminal Runner to real mode after approval."),
    step("generate_preflight", "Generate real micro dry-run preflight", "system", "Writes .dbc/preflight/latest.json without spawning providers."),
    step("run_approved", "Run approved REAL-MICRO-README", "human", "Backend requires ready preflight and RUN-REAL-MICRO-TASK before spawning real CLI providers."),
    step("compare_evidence", "Compare real evidence with controlled baseline", "system", "Run pnpm compare-real-micro after the loop completes or blocks."),
    step("revert_mock", "Apply mock provider profile", "human", "Return providers to mock mode after the real micro run."),
    step("collect_support", "Generate support bundle", "system", "Archive diagnostic artifacts for review."),
  ],
  manualCommands: [
    command("pnpm operator-checklist", "Refresh the checklist before approval.", false),
    command('pnpm operator-approve -- --confirm "I APPROVE REAL MICRO LOOP"', "Terminal fallback for explicit approval.", true),
    command("pnpm providers:apply-real-micro", "Terminal fallback for applying the approved real profile.", true),
    command("pnpm real-micro-preflight", "Generate dry-run preflight without provider calls.", false),
    command("pnpm compare-real-micro", "Compare real loop evidence after the run.", false),
    command("pnpm providers:apply-mock", "Return providers to mock mode.", true),
    command("pnpm revert-evidence", "Verify providers are back in mock mode.", false),
    command("pnpm support-bundle", "Collect operator handoff diagnostics.", false),
  ],
  gates: {
    taskId: task?.id || "",
    budgetLimit: Number(task?.budgetLimit || 0),
    preflightStatus: preflight?.status || "missing",
    operatorStatus: operator?.status || "missing",
    operatorApprovalStatus: operator?.approval?.status || (approvalMatches(operatorApproval, operator) ? "approved" : "missing_or_stale"),
    approvalLedgerStatus: approvalLedger?.status || "missing",
    pendingApprovals: approvalLedger?.pending ?? 0,
    activeRealProviders: providers.filter((provider) => provider.runMode === "real").map((provider) => provider.id),
  },
  refs,
  nextAction:
    status === "blocked"
      ? "Fix runbook blockers, rerun pnpm launch-doctor, then regenerate this runbook."
      : status === "awaiting_human_approval"
        ? "Review operator checklist and approve the human gate before applying real micro mode."
        : status === "ready_to_apply_real_profile"
          ? "Apply the real micro provider profile, reload .dbc config, then regenerate preflight."
          : "Run only REAL-MICRO-README through the approved real micro flow.",
};

writeFileSync(refs.surfacesPolicy, surfacesMarkdown(runbook));
writeFileSync(path.join(runbookDir, "latest.json"), `${JSON.stringify(runbook, null, 2)}\n`);
writeFileSync(path.join(runbookDir, "latest.md"), runbookMarkdown(runbook));

console.log(
  JSON.stringify(
    {
      status,
      blockers: blockers.length,
      warnings: warnings.length,
      jsonPath: path.join(runbookDir, "latest.json"),
      markdownPath: path.join(runbookDir, "latest.md"),
      surfacesPolicyPath: refs.surfacesPolicy,
    },
    null,
    2,
  ),
);

if (blockers.length) process.exitCode = 1;

function step(id, title, actor, detail) {
  return { id, title, actor, detail };
}

function command(commandLine, reason, requiresApproval) {
  return {
    command: commandLine,
    reason,
    requiresApproval,
    automatic: false,
  };
}

function checkFile(subject, filePath, required) {
  if (filePath && existsSync(filePath)) {
    pass(subject, filePath);
  } else if (required) {
    fail(subject, `${filePath || subject} is missing.`);
  } else {
    warn(subject, `${filePath || subject} is missing.`);
  }
}

function checkTask(value) {
  if (!value) return;
  if (value.id === "REAL-MICRO-README") pass("task id", value.id);
  else fail("task id", `Expected REAL-MICRO-README, got ${value.id || "missing"}.`);
  if (value.loopProfile === "real_micro") pass("task profile", "real_micro");
  else fail("task profile", `Expected real_micro, got ${value.loopProfile || "missing"}.`);
  if (Number(value.budgetLimit || 0) > 0) pass("task budget", `budgetLimit ${value.budgetLimit}`);
  else fail("task budget", "Real micro task requires a positive budgetLimit.");
}

function checkPreflight(value) {
  if (!value) return;
  if (value.kind !== "real-micro-preflight") {
    fail("preflight kind", "Invalid real micro preflight kind.");
    return;
  }
  if ((value.blockers || []).length) fail("preflight blockers", `${value.blockers.length} blocker(s).`);
  else pass("preflight blockers", "none");
  if (["awaiting_human_approval", "ready_to_apply_real_profile", "ready_to_run"].includes(value.status)) {
    pass("preflight status", value.status);
  } else {
    fail("preflight status", `Unexpected status ${value.status || "missing"}.`);
  }
  for (const item of value.warnings || []) warn(`preflight: ${item.subject}`, item.detail);
}

function checkOperator(value, approval) {
  if (!value) return;
  if ((value.blockers || []).length) fail("operator blockers", `${value.blockers.length} blocker(s).`);
  else pass("operator blockers", "none");
  if (["awaiting_human_approval", "ready_to_start_real_micro", "real_profile_already_active"].includes(value.status)) {
    pass("operator status", value.status);
  } else {
    fail("operator status", `Unexpected status ${value.status || "missing"}.`);
  }
  if (approvalMatches(approval, value)) pass("operator approval", "matches latest checklist");
  else warn("operator approval", "missing or stale");
}

function checkApprovalLedger(value) {
  if (!value) return;
  if (value.kind !== "approval-ledger") {
    fail("approval ledger kind", "Invalid approval ledger kind.");
    return;
  }
  pass("approval ledger", `${value.pending ?? 0} pending approval(s).`);
}

function checkProviders(items) {
  for (const id of ["codex_cli", "claude_code", "local_terminal"]) {
    const provider = items.find((item) => item.id === id);
    if (!provider) fail(`provider ${id}`, "missing");
    else pass(`provider ${id}`, `runMode ${provider.runMode || "mock"}`);
  }
}

function collectArtifactWarnings(subject, value) {
  for (const item of value?.warnings || []) warn(`${subject}: ${item.subject || "warning"}`, item.detail || JSON.stringify(item));
  for (const item of value?.blockers || []) fail(`${subject}: ${item.subject || "blocker"}`, item.detail || JSON.stringify(item));
}

function approvalMatches(approval, checklist) {
  if (!approval?.approved || !checklist) return false;
  const budgetLimit = Number(checklist.budget?.budgetLimit ?? checklist.task?.budgetLimit ?? -2);
  return (
    approval.checklistGeneratedAt === checklist.generatedAt &&
    approval.taskId === checklist.task?.id &&
    Math.abs(Number(approval.budgetLimit ?? -1) - budgetLimit) <= Number.EPSILON
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

function parseProviders(text) {
  const blocks = text.split(/\n  - id: /).slice(1);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const provider = { id: lines[0].trim() };
    for (const line of lines.slice(1)) {
      const match = line.match(/^    ([A-Za-z0-9_]+):\s*(.*)$/);
      if (match) provider[match[1]] = unquote(match[2].trim());
    }
    return provider;
  });
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
  return value;
}

function runbookMarkdown(value) {
  return [
    "# Real Micro Runbook",
    "",
    `Status: ${value.status}`,
    `Generated: ${value.generatedAt}`,
    `Project: ${value.projectPath}`,
    "",
    "## Next Action",
    `- ${value.nextAction}`,
    "",
    "## Allowed Surfaces",
    ...value.surfaces.allowed.map((item) => `- ${item.id}: ${item.detail}`),
    "",
    "## Denied Surfaces",
    ...value.surfaces.denied.map((item) => `- ${item.id}: ${item.detail}`),
    "",
    "## Sequence",
    ...value.sequence.map((item, index) => `${index + 1}. ${item.title} (${item.actor}) - ${item.detail}`),
    "",
    "## Manual Commands",
    ...value.manualCommands.map((item) => `- ${item.command} (${item.requiresApproval ? "approval required" : "read-only/check"}) - ${item.reason}`),
    "",
    "## Gates",
    ...Object.entries(value.gates).map(([key, gateValue]) => `- ${key}: ${Array.isArray(gateValue) ? gateValue.join(", ") || "none" : gateValue}`),
    "",
    "## Blockers",
    ...(value.blockers.length ? value.blockers.map((item) => `- ${item.subject}: ${item.detail}`) : ["- None"]),
    "",
    "## Warnings",
    ...(value.warnings.length ? value.warnings.map((item) => `- ${item.subject}: ${item.detail}`) : ["- None"]),
    "",
    "## Refs",
    ...Object.entries(value.refs).map(([key, filePath]) => `- ${key}: ${filePath}`),
    "",
  ].join("\n");
}

function surfacesMarkdown(value) {
  return [
    "# DBC Allowed Surfaces",
    "",
    "This file is generated by `pnpm real-micro-runbook` and records the permitted automation surfaces for Dildin Build Control.",
    "",
    "## Allowed",
    ...value.surfaces.allowed.map((item) => `- ${item.id}: ${item.detail}`),
    "",
    "## Denied",
    ...value.surfaces.denied.map((item) => `- ${item.id}: ${item.detail}`),
    "",
    "## Human Control",
    "- Real provider execution requires operator checklist, matching operator approval, approval ledger decisions, and ready real-micro preflight.",
    "- The app must not start background real provider runs on project load, recovery, support bundle generation, doctor checks, or dry-run preflight generation.",
    "- Browser or consumer-web scraping is outside the DBC run surface; use official CLI/API surfaces only.",
    "",
  ].join("\n");
}
