import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const planDir = path.join(dbcPath, "real-loop");
const tasksDir = path.join(dbcPath, "tasks");
mkdirSync(planDir, { recursive: true });
mkdirSync(tasksDir, { recursive: true });

const readinessPath = path.join(dbcPath, "readiness", "latest.json");
const providersPath = path.join(dbcPath, "providers.yaml");
const mockProfilePath = path.join(dbcPath, "providers.mock.yaml");
const realMicroProfilePath = path.join(dbcPath, "providers.real-micro.yaml");
const policyPath = path.join(dbcPath, "policy.yaml");
const releasePath = path.join(dbcPath, "release", "latest.json");

const readiness = readJson(readinessPath);
const release = readJson(releasePath);
const providersText = readText(providersPath);
const providers = parseProviders(providersText);

const task = {
  version: 1,
  id: "REAL-MICRO-README",
  title: "Real micro loop: README marker",
  brief:
    "Run the smallest real-provider DBC loop. Codex may add or refresh one short README marker under a DBC smoke/readiness section. Claude reviews only the diff and evidence. No dependency installation, publish, push, secrets, or broad refactors.",
  criteria: [
    "README.md contains or confirms one short DBC real-micro-loop evidence marker.",
    "The loop produces .dbc manifest, evidence, security, git baseline, git workspace, diff, commit proposal, and acceptance report artifacts.",
    "Build evidence records a successful pnpm build result.",
    "Claude review/security steps return pass or request_changes with concrete evidence.",
  ],
  constraints: [
    "Only README.md and generated .dbc artifacts may change.",
    "Do not install dependencies, publish packages, push git changes, or access secrets.",
    "Use official CLI terminal surfaces only.",
    "Stop immediately if command policy asks for approval or a provider requests broad workspace changes.",
  ],
  budgetLimit: 1,
  status: "ready",
  risk: "low",
  priority: "high",
  loopProfile: "real_micro",
  providerStrategy: "codex_build_claude_review",
  affectedPaths: ["README.md", ".dbc/tasks", ".dbc/loops", ".dbc/evidence", ".dbc/artifacts", ".dbc/reports"],
  allowedPaths: ["README.md", ".dbc/tasks", ".dbc/loops", ".dbc/evidence", ".dbc/artifacts", ".dbc/reports", ".dbc/security", ".dbc/git"],
  deniedPaths: [".env", "node_modules", "src-tauri/target"],
  requiredReviewers: ["Claude Code", "Security", "Product Owner"],
  stopConditions: [
    "Provider asks to edit outside README.md or .dbc.",
    "Command policy returns approval_required or deny.",
    "Secret-like content is detected in prompt/output.",
    "Build fails.",
    "Claude review returns request_changes or fail.",
  ],
  updatedAt: String(Date.now()),
};

const taskPath = path.join(tasksDir, `${task.id}.json`);
writeJson(taskPath, task);

const providerSwitchPlan = providers.map((provider) => {
  if (provider.id === "codex_cli" || provider.id === "claude_code" || provider.id === "local_terminal") {
    return {
      id: provider.id,
      name: provider.name,
      currentRunMode: provider.runMode || "mock",
      proposedRunMode: "real",
      command: provider.command || "",
      argsTemplate: provider.argsTemplate || "",
      promptMode: provider.promptMode || "stdin",
      approval: "human_before_apply",
    };
  }
  return {
    id: provider.id,
    name: provider.name,
    currentRunMode: provider.runMode || "mock",
    proposedRunMode: provider.runMode || "mock",
    command: provider.command || "",
    argsTemplate: provider.argsTemplate || "",
    promptMode: provider.promptMode || "stdin",
    approval: "unchanged",
  };
});

const blockers = [];
if (!readiness || readiness.blockers?.length) {
  blockers.push("Readiness report has blockers or is missing.");
}
if (!providers.find((provider) => provider.id === "codex_cli" && existsSync(provider.command || ""))) {
  blockers.push("Codex exact path is missing or unavailable.");
}
if (!providers.find((provider) => provider.id === "claude_code" && existsSync(provider.command || ""))) {
  blockers.push("Claude exact path is missing or unavailable.");
}
if (!release?.checklist || Object.values(release.checklist).some((value) => value !== true)) {
  blockers.push("Release checklist is missing or not fully true.");
}

const plan = {
  version: 1,
  kind: "real-micro-loop-plan",
  generatedAt: String(Date.now()),
  status: blockers.length ? "blocked" : "prepared",
  projectPath,
  task,
  taskPath,
  readiness: {
    path: readinessPath,
    status: readiness?.status || "missing",
    blockers: readiness?.blockers || [],
    warnings: readiness?.warnings || [],
  },
  release: {
    path: releasePath,
    dmgChecksum: release?.checksums?.dmg || "",
    checklist: release?.checklist || {},
  },
  providers: providerSwitchPlan,
  policy: {
    path: policyPath,
    commandPolicy: "allow pnpm build; approval for push/publish/network/sudo; deny destructive operations",
  },
  profiles: {
    active: providersPath,
    mock: mockProfilePath,
    realMicro: realMicroProfilePath,
    applyRealMicro: "pnpm providers:apply-real-micro",
    applyMock: "pnpm providers:apply-mock",
  },
  execution: {
    budget: {
      budgetLimit: task.budgetLimit,
      realCliCallLimit: Math.max(1, Math.ceil(task.budgetLimit)) * 4,
      rule: "Each budget unit allows up to 4 real CLI provider calls. Local runner steps are not counted.",
    },
    startInUi: "Tasks -> select REAL-MICRO-README -> Start provider loop -> Preflight -> Run",
    startManually:
      "Only after reviewing this plan, run pnpm providers:apply-real-micro, then open Settings and Load .dbc config.",
    stopConditions: [
      "Provider asks to edit outside README.md or .dbc.",
      "Command policy returns approval_required or deny.",
      "Secret-like content is detected in prompt/output.",
      "Build fails.",
      "Claude review returns request_changes or fail.",
    ],
    rollback: [
      "Run pnpm providers:apply-mock and then open Settings and Load .dbc config.",
      "Do not commit generated artifacts until reviewed.",
      "Use git status/diff manually if inside a git repo.",
      "Delete the specific .dbc/loops/.dbc/artifacts/.dbc/evidence run folder only after human confirmation.",
    ],
  },
  blockers,
};

const jsonPath = path.join(planDir, "latest.json");
const markdownPath = path.join(planDir, "latest.md");
writeJson(jsonPath, plan);
writeFileSync(markdownPath, planMarkdown(plan));

console.log(
  JSON.stringify(
    {
      status: plan.status,
      blockers: blockers.length,
      taskPath,
      jsonPath,
      markdownPath,
    },
    null,
    2,
  ),
);

if (blockers.length) process.exitCode = 1;

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

function planMarkdown(plan) {
  return [
    "# Real Micro Loop Plan",
    "",
    `Status: ${plan.status}`,
    `Generated: ${plan.generatedAt}`,
    `Project: ${plan.projectPath}`,
    "",
    "## Task",
    `- ID: ${plan.task.id}`,
    `- Title: ${plan.task.title}`,
    `- Spec: ${plan.taskPath}`,
    "",
    "## Readiness",
    `- Status: ${plan.readiness.status}`,
    `- Report: ${plan.readiness.path}`,
    `- Warnings: ${plan.readiness.warnings.length}`,
    "",
    "## Provider Switch Plan",
    ...plan.providers.map(
      (provider) =>
        `- ${provider.id}: ${provider.currentRunMode} -> ${provider.proposedRunMode}; command: ${provider.command || "(none)"}; approval: ${provider.approval}`,
    ),
    "",
    "## Provider Profiles",
    `- Active: ${plan.profiles.active}`,
    `- Mock: ${plan.profiles.mock}`,
    `- Real micro: ${plan.profiles.realMicro}`,
    `- Apply real micro: ${plan.profiles.applyRealMicro}`,
    `- Revert mock: ${plan.profiles.applyMock}`,
    "",
    "## Stop Conditions",
    ...plan.execution.stopConditions.map((item) => `- ${item}`),
    "",
    "## Budget Guard",
    `- Budget limit: ${plan.execution.budget.budgetLimit}`,
    `- Real CLI call limit: ${plan.execution.budget.realCliCallLimit}`,
    `- Rule: ${plan.execution.budget.rule}`,
    "",
    "## Rollback",
    ...plan.execution.rollback.map((item) => `- ${item}`),
    "",
    "## Blockers",
    ...(plan.blockers.length ? plan.blockers.map((item) => `- ${item}`) : ["- None"]),
    "",
    "## Start",
    `- ${plan.execution.startManually}`,
    `- ${plan.execution.startInUi}`,
    "",
  ].join("\n");
}
