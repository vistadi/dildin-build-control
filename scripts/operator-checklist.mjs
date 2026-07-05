import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const operatorDir = path.join(dbcPath, "operator");
mkdirSync(operatorDir, { recursive: true });

const refs = {
  providers: path.join(dbcPath, "providers.yaml"),
  mockProfile: path.join(dbcPath, "providers.mock.yaml"),
  realMicroProfile: path.join(dbcPath, "providers.real-micro.yaml"),
  readiness: path.join(dbcPath, "readiness", "latest.json"),
  realPlan: path.join(dbcPath, "real-loop", "latest.json"),
  comparison: path.join(dbcPath, "compare", "latest.json"),
  release: path.join(dbcPath, "release", "latest.json"),
};

const readiness = readJson(refs.readiness);
const realPlan = readJson(refs.realPlan);
const comparison = readJson(refs.comparison);
const release = readJson(refs.release);
const approvalPath = path.join(operatorDir, "approval.json");
const approval = readJson(approvalPath);
const providersText = readText(refs.providers);
const providers = parseProviders(providersText);

const blockers = [];
const warnings = [];
const checks = [];

checkFile("providers", refs.providers);
checkFile("mock provider profile", refs.mockProfile);
checkFile("real micro provider profile", refs.realMicroProfile);
checkReadiness(readiness);
checkRealPlan(realPlan);
checkComparison(comparison);
checkRelease(release);
checkProviders(providers);

const activeRealProviders = providers.filter((provider) => provider.type === "cli" && provider.runMode === "real");
const activeMockCliProviders = providers.filter((provider) => provider.type === "cli" && provider.runMode !== "real");
const taskId = realPlan?.task?.id || "REAL-MICRO-README";
const generatedAt = String(Date.now());
const approvalMatchesChecklist = approvalMatches(approval, generatedAt, taskId, realPlan?.task?.budgetLimit ?? 0);
const baseStatus = blockers.length
  ? "blocked"
  : activeRealProviders.length
    ? "real_profile_already_active"
    : "ready_to_start_real_micro";
const status = baseStatus === "ready_to_start_real_micro" && !approvalMatchesChecklist ? "awaiting_human_approval" : baseStatus;

const checklist = {
  version: 1,
  kind: "operator-checklist",
  generatedAt,
  projectPath,
  status,
  blockers,
  warnings,
  checks,
  task: {
    id: taskId,
    title: realPlan?.task?.title || "Real micro loop",
    path: realPlan?.taskPath || path.join(dbcPath, "tasks", `${taskId}.json`),
    budgetLimit: realPlan?.task?.budgetLimit ?? 0,
    allowedChanges: realPlan?.task?.constraints?.filter((item) => item.includes("Only ")) || [
      "Only README.md and generated .dbc artifacts may change.",
    ],
  },
  providerState: {
    activeRealProviders: activeRealProviders.map(providerSummary),
    activeMockCliProviders: activeMockCliProviders.map(providerSummary),
    intendedRealMicroProviders: ["codex_cli", "claude_code", "local_terminal"],
    activeProfilePath: refs.providers,
    mockProfilePath: refs.mockProfile,
    realMicroProfilePath: refs.realMicroProfile,
  },
  humanConfirmations: [
    "I accept that the real micro loop may spend Codex and Claude model tokens.",
    "I confirm the task is limited to README.md and generated .dbc artifacts.",
    `I confirm budgetLimit ${realPlan?.task?.budgetLimit ?? 0} allows ${realProviderCallLimit(realPlan?.task?.budgetLimit ?? 0)} real CLI call(s).`,
    "I confirm no publish, push, install, sudo, destructive git, or secret access is allowed.",
    "I will revert providers to mock mode after the real micro loop finishes or blocks.",
  ],
  budget: {
    budgetLimit: realPlan?.task?.budgetLimit ?? 0,
    realCliCallLimit: realProviderCallLimit(realPlan?.task?.budgetLimit ?? 0),
    rule: "Each budget unit allows up to 4 real CLI provider calls. Local runner steps are not counted.",
  },
  backendGate: {
    realCliRequiresOperatorChecklist: true,
    realCliRequiresHumanApproval: true,
    realCliRequiresPositiveBudget: true,
    taskIdMustMatch: taskId,
    budgetLimitMustMatch: realPlan?.task?.budgetLimit ?? 0,
  },
  approval: {
    status: approvalMatchesChecklist ? "approved" : "missing_or_stale",
    path: approvalPath,
    approved: approvalMatchesChecklist,
  },
  steps: buildSteps(taskId),
  stopConditions: realPlan?.execution?.stopConditions || [
    "Provider asks to edit outside README.md or .dbc.",
    "Command policy returns approval_required or deny.",
    "Secret-like content is detected in prompt/output.",
    "Build fails.",
    "Claude review returns request_changes or fail.",
  ],
  rollback: [
    {
      id: "rollback-profile",
      ui: "Settings -> Apply mock",
      command: "pnpm providers:apply-mock",
      expectedEvidence: ".dbc/providers.yaml has mock runMode for CLI providers.",
    },
    {
      id: "reload-config",
      ui: "Settings -> Load .dbc config",
      expectedEvidence: "Provider cards show mock run mode again.",
    },
    {
      id: "inspect-workspace",
      command: "git status --short",
      expectedEvidence: "Only expected README.md and .dbc artifacts are changed, if the project is inside git.",
    },
  ],
  refs: {
    ...refs,
    readinessMarkdown: path.join(dbcPath, "readiness", "latest.md"),
    realPlanMarkdown: path.join(dbcPath, "real-loop", "latest.md"),
    comparisonMarkdown: path.join(dbcPath, "compare", "latest.md"),
    releaseMarkdown: path.join(dbcPath, "release", "latest.md"),
  },
  release: {
    dmgChecksum: release?.checksums?.dmg || "",
    binaryChecksum: release?.checksums?.binary || "",
    dmgPath: release?.paths?.dmg || "",
  },
  nextAction:
    status === "blocked"
      ? "Fix blockers, rerun pnpm real-readiness, pnpm real-micro-plan, pnpm compare-real-micro, then rerun pnpm operator-checklist."
      : activeRealProviders.length
        ? "Real providers are already active. Run only the staged micro task or revert with Settings -> Apply mock."
        : status === "awaiting_human_approval"
          ? "Review this checklist, then click Approve gate or run pnpm operator-approve -- --confirm \"I APPROVE REAL MICRO LOOP\" before applying real micro mode."
          : "Review this checklist, then use Settings -> Apply real micro or run pnpm providers:apply-real-micro and load .dbc config.",
};

const jsonPath = path.join(operatorDir, "latest.json");
const markdownPath = path.join(operatorDir, "latest.md");
writeJson(jsonPath, checklist);
writeFileSync(markdownPath, checklistMarkdown(checklist));

console.log(
  JSON.stringify(
    {
      status,
      blockers: blockers.length,
      warnings: warnings.length,
      jsonPath,
      markdownPath,
      nextAction: checklist.nextAction,
    },
    null,
    2,
  ),
);

if (blockers.length) process.exitCode = 1;

function buildSteps(taskId) {
  return [
    {
      id: "provider-status",
      title: "Confirm the active provider profile",
      command: "pnpm providers:status",
      expectedEvidence: "Codex CLI and Claude Code are still mock before the intentional switch.",
      stopIf: "A real provider is active before the human confirms token spend.",
    },
    {
      id: "readiness-review",
      title: "Review readiness, plan, comparison, and release evidence",
      files: [refs.readiness, refs.realPlan, refs.comparison, refs.release],
      expectedEvidence: "No blockers; warnings are understood by the operator.",
      stopIf: "Any report is missing, blocked, or refers to a stale task/release.",
    },
    {
      id: "human-confirmation",
      title: "Confirm token spend and scope",
      expectedEvidence: "The operator accepts the humanConfirmations list in this checklist.",
      stopIf: "The operator is not ready to spend provider tokens or enforce the scope.",
    },
    {
      id: "apply-real-profile",
      title: "Apply the real micro provider profile",
      ui: "Settings -> Apply real micro",
      command: "pnpm providers:apply-real-micro",
      expectedEvidence: ".dbc/providers.yaml switches codex_cli, claude_code, and local_terminal to real.",
      stopIf: "The command fails or switches unexpected providers.",
    },
    {
      id: "reload-config",
      title: "Reload provider config in the app",
      ui: "Settings -> Load .dbc config",
      expectedEvidence: "Provider cards show exact paths and real run mode for Codex and Claude.",
      stopIf: "Codex or Claude exact path/contract diagnostics fail.",
    },
    {
      id: "start-task",
      title: "Run only the staged real micro task",
      ui: `Tasks -> ${taskId} -> Preflight -> Run`,
      expectedEvidence: "The loop creates a new manifest, evidence files, reports, git baseline, git workspace, diff artifacts, and security report.",
      stopIf: "The active task is not REAL-MICRO-README or Preflight shows an error gate.",
    },
    {
      id: "compare",
      title: "Compare real evidence against the controlled baseline",
      command: "pnpm compare-real-micro",
      expectedEvidence: ".dbc/compare/latest.json status is pass or pass_with_warnings.",
      stopIf: "The comparator reports blockers.",
    },
    {
      id: "revert-profile",
      title: "Revert providers to mock mode",
      ui: "Settings -> Apply mock",
      command: "pnpm providers:apply-mock",
      expectedEvidence: ".dbc/providers.yaml returns CLI providers to mock mode.",
      stopIf: "Revert fails; do not start broader loops until fixed.",
    },
    {
      id: "reload-mock-config",
      title: "Reload mock config in the app",
      ui: "Settings -> Load .dbc config",
      expectedEvidence: "The UI shows mock mode again.",
      stopIf: "The UI still shows real provider mode after reload.",
    },
  ];
}

function checkFile(subject, filePath) {
  if (existsSync(filePath)) {
    pass(subject, filePath);
  } else {
    fail(subject, `${filePath} is missing.`);
  }
}

function checkReadiness(value) {
  if (!value) {
    fail("readiness", "Readiness report is missing.");
    return;
  }
  if (value.blockers?.length) {
    fail("readiness", `Readiness has ${value.blockers.length} blocker(s).`);
  } else {
    pass("readiness", `Status is ${value.status}.`);
  }
  for (const warning of value.warnings || []) warn(`readiness: ${warning.subject}`, warning.detail);
}

function checkRealPlan(value) {
  if (!value) {
    fail("real micro plan", "Real micro plan is missing.");
    return;
  }
  if (value.status === "prepared" && !value.blockers?.length) {
    pass("real micro plan", `Prepared task ${value.task?.id || "unknown"}.`);
  } else {
    fail("real micro plan", `Plan status is ${value.status || "missing"}.`);
  }
}

function checkComparison(value) {
  if (!value) {
    fail("comparison", "Comparison report is missing.");
    return;
  }
  if (value.blockers?.length) {
    fail("comparison", `Comparison has ${value.blockers.length} blocker(s).`);
    return;
  }
  if (value.status === "pending_real") {
    pass("comparison", "Controlled baseline is ready; real micro evidence is still pending.");
  } else if (value.status === "pass" || value.status === "pass_with_warnings") {
    pass("comparison", `Comparison status is ${value.status}.`);
  } else {
    warn("comparison", `Comparison status is ${value.status}; review before broader loops.`);
  }
}

function checkRelease(value) {
  if (!value) {
    fail("release", "Release package is missing.");
    return;
  }
  const checklist = value.checklist || {};
  const failed = Object.entries(checklist).filter(([, ready]) => ready !== true);
  if (failed.length) {
    fail("release", `Release checklist has failing items: ${failed.map(([key]) => key).join(", ")}`);
  } else {
    pass("release", `Release checksum ${value.checksums?.dmg || "missing"}.`);
  }
}

function checkProviders(value) {
  const codex = value.find((provider) => provider.id === "codex_cli");
  const claude = value.find((provider) => provider.id === "claude_code");
  const localRunner = value.find((provider) => provider.id === "local_terminal");
  for (const provider of [codex, claude]) {
    if (!provider) {
      fail("provider", "Codex or Claude provider is missing.");
      continue;
    }
    if (existsSync(provider.command || "")) {
      pass(`provider ${provider.id}`, `Executable exists: ${provider.command}.`);
    } else {
      fail(`provider ${provider.id}`, `Executable is missing: ${provider.command || "(empty)"}.`);
    }
  }
  if (localRunner) {
    pass("provider local_terminal", `Run mode is ${localRunner.runMode || "mock"}.`);
  } else {
    fail("provider local_terminal", "Local Terminal Runner is missing.");
  }
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
  if (!existsSync(filePath)) return undefined;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function readText(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
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
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function providerSummary(provider) {
  return {
    id: provider.id,
    name: provider.name || provider.id,
    type: provider.type || "",
    runMode: provider.runMode || "mock",
    command: provider.command || "",
    argsTemplate: provider.argsTemplate || "",
  };
}

function realProviderCallLimit(budgetLimit) {
  return budgetLimit > 0 ? Math.max(1, Math.ceil(budgetLimit)) * 4 : 0;
}

function approvalMatches(value, checklistGeneratedAt, taskId, budgetLimit) {
  if (!value?.approved) return false;
  return (
    value.checklistGeneratedAt === checklistGeneratedAt &&
    value.taskId === taskId &&
    Math.abs((value.budgetLimit ?? -1) - budgetLimit) <= Number.EPSILON
  );
}

function checklistMarkdown(report) {
  return [
    "# Operator Checklist",
    "",
    `Status: ${report.status}`,
    `Generated: ${report.generatedAt}`,
    `Project: ${report.projectPath}`,
    "",
    "## Task",
    `- ID: ${report.task.id}`,
    `- Title: ${report.task.title}`,
    `- Spec: ${report.task.path}`,
    `- Budget limit: ${report.task.budgetLimit}`,
    "",
    "## Human Confirmations",
    ...report.humanConfirmations.map((item) => `- [ ] ${item}`),
    "",
    "## Steps",
    ...report.steps.flatMap((step, index) => [
      `${index + 1}. ${step.title}`,
      step.command ? `   - Command: ${step.command}` : "",
      step.ui ? `   - UI: ${step.ui}` : "",
      step.files ? `   - Files: ${step.files.join(", ")}` : "",
      `   - Evidence: ${step.expectedEvidence}`,
      `   - Stop if: ${step.stopIf}`,
    ].filter(Boolean)),
    "",
    "## Stop Conditions",
    ...report.stopConditions.map((item) => `- ${item}`),
    "",
    "## Budget Guard",
    `- Real CLI call limit: ${report.budget.realCliCallLimit}`,
    `- Rule: ${report.budget.rule}`,
    `- Backend gate: real CLI loops require this checklist, matching task id, matching budget, zero blockers, and explicit operator approval.`,
    "",
    "## Approval",
    `- Status: ${report.approval.status}`,
    `- Path: ${report.approval.path}`,
    "",
    "## Rollback",
    ...report.rollback.flatMap((step) => [
      `- ${step.id}`,
      step.command ? `  - Command: ${step.command}` : "",
      step.ui ? `  - UI: ${step.ui}` : "",
      `  - Evidence: ${step.expectedEvidence}`,
    ].filter(Boolean)),
    "",
    "## Provider State",
    `- Active real providers: ${report.providerState.activeRealProviders.map((item) => item.id).join(", ") || "none"}`,
    `- Active mock CLI providers: ${report.providerState.activeMockCliProviders.map((item) => item.id).join(", ") || "none"}`,
    `- Active profile: ${report.providerState.activeProfilePath}`,
    `- Real micro profile: ${report.providerState.realMicroProfilePath}`,
    `- Mock profile: ${report.providerState.mockProfilePath}`,
    "",
    "## Release",
    `- DMG: ${report.release.dmgPath || "missing"}`,
    `- DMG checksum: ${report.release.dmgChecksum || "missing"}`,
    `- Binary checksum: ${report.release.binaryChecksum || "missing"}`,
    "",
    "## Blockers",
    ...(report.blockers.length ? report.blockers.map((item) => `- ${item.subject}: ${item.detail}`) : ["- None"]),
    "",
    "## Warnings",
    ...(report.warnings.length ? report.warnings.map((item) => `- ${item.subject}: ${item.detail}`) : ["- None"]),
    "",
    "## Checks",
    ...report.checks.map((item) => `- [${item.level}] ${item.subject}: ${item.detail}`),
    "",
    "## Next Action",
    `- ${report.nextAction}`,
    "",
  ].join("\n");
}
