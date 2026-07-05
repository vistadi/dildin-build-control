import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const revertDir = path.join(dbcPath, "revert");
mkdirSync(revertDir, { recursive: true });

const providersPath = path.join(dbcPath, "providers.yaml");
const comparisonPath = path.join(dbcPath, "compare", "latest.json");
const operatorPath = path.join(dbcPath, "operator", "latest.json");
const approvalPath = path.join(dbcPath, "operator", "approval.json");

const providers = existsSync(providersPath) ? parseProviders(readFileSync(providersPath, "utf8")) : [];
const cliProviders = providers.filter((provider) => provider.type === "cli");
const activeRealProviders = cliProviders.filter((provider) => provider.runMode === "real");
const activeMockProviders = cliProviders.filter((provider) => provider.runMode !== "real");
const latestRealReport = findLatestReportByTask("REAL-MICRO-README");
const comparison = readJsonIfExists(comparisonPath);
const operator = readJsonIfExists(operatorPath);
const approval = readJsonIfExists(approvalPath);
const checks = [];
const warnings = [];
const blockers = [];

if (existsSync(providersPath)) pass("providers", providersPath);
else fail("providers", `${providersPath} is missing.`);

if (activeRealProviders.length) {
  warn("provider profile", `Real providers active: ${activeRealProviders.map((provider) => provider.id).join(", ")}`);
} else {
  pass("provider profile", "All CLI providers are in mock mode.");
}

if (latestRealReport) {
  pass("real micro report", latestRealReport.path);
  if (latestRealReport.report?.status === "completed" && latestRealReport.report?.verdict === "accepted") {
    pass("real micro verdict", "Real micro loop completed and accepted.");
  } else {
    warn("real micro verdict", `Status ${latestRealReport.report?.status || "missing"}; verdict ${latestRealReport.report?.verdict || "missing"}.`);
  }
  if (activeRealProviders.length) {
    fail("revert required", "A real micro report exists but CLI providers are still in real mode.");
  } else {
    pass("revert evidence", "Real micro run evidence exists and CLI providers are back in mock mode.");
  }
} else {
  pass("real micro report", "No real micro acceptance package found yet.");
}

if (comparison?.status === "pass" || comparison?.status === "pass_with_warnings") {
  pass("comparison", comparison.status);
} else if (comparison?.status === "pending_real") {
  pass("comparison", "pending_real");
} else if (comparison?.status) {
  warn("comparison", comparison.status);
}

if (activeRealProviders.length && !approvalMatches(approval, operator)) {
  fail("approval", "Real providers are active without a matching operator approval.");
} else if (approvalMatches(approval, operator)) {
  pass("approval", "Operator approval matches latest checklist.");
} else {
  pass("approval", "No active real providers; approval is not required for current mock state.");
}

const status = blockers.length
  ? "blocked"
  : latestRealReport
    ? "reverted"
    : activeRealProviders.length
      ? "real_profile_active"
      : "mock_ready";

const report = {
  version: 1,
  kind: "revert-evidence",
  generatedAt: String(Date.now()),
  projectPath,
  status,
  blockers,
  warnings,
  checks,
  providers: {
    activeRealProviders: activeRealProviders.map(providerSummary),
    activeMockProviders: activeMockProviders.map(providerSummary),
  },
  realMicro: {
    reportPath: latestRealReport?.path || "",
    loopId: latestRealReport?.report?.loopId || "",
    status: latestRealReport?.report?.status || "missing",
    verdict: latestRealReport?.report?.verdict || "missing",
  },
  refs: {
    providersPath,
    comparisonPath,
    operatorPath,
    approvalPath,
  },
  nextAction: blockers.length
    ? "Run pnpm providers:apply-mock, load .dbc config, then rerun pnpm revert-evidence."
    : activeRealProviders.length
      ? "Run only the approved real micro task, then revert with pnpm providers:apply-mock."
      : "Provider profile is in mock mode.",
};

const jsonPath = path.join(revertDir, "latest.json");
const markdownPath = path.join(revertDir, "latest.md");
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
    },
    null,
    2,
  ),
);

if (blockers.length) process.exitCode = 1;

function findLatestReportByTask(taskId) {
  const reportsDir = path.join(dbcPath, "reports");
  if (!existsSync(reportsDir)) return undefined;
  return readdirSync(reportsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(reportsDir, file))
    .map((filePath) => ({ path: filePath, report: readJsonIfExists(filePath), mtime: statSync(filePath).mtimeMs }))
    .filter((item) => item.report?.kind === "acceptance-package" && item.report?.task?.id === taskId)
    .sort((left, right) => right.mtime - left.mtime)[0];
}

function approvalMatches(approval, checklist) {
  if (!approval?.approved || !checklist) return false;
  return (
    approval.checklistGeneratedAt === checklist.generatedAt &&
    approval.taskId === checklist.task?.id &&
    Math.abs(Number(approval.budgetLimit ?? -1) - Number(checklist.budget?.budgetLimit ?? -2)) <= Number.EPSILON
  );
}

function providerSummary(provider) {
  return {
    id: provider.id,
    name: provider.name || provider.id,
    runMode: provider.runMode || "mock",
    command: provider.command || "",
  };
}

function parseProviders(text) {
  const blocks = text.split(/\n  - id: /).slice(1);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const provider = { id: unquote(lines[0].trim()) };
    for (const line of lines.slice(1)) {
      const match = line.match(/^    ([A-Za-z0-9_]+):\s*(.*)$/);
      if (!match) continue;
      provider[match[1]] = unquote(match[2].trim());
    }
    return provider;
  });
}

function readJsonIfExists(filePath) {
  return filePath && existsSync(filePath) ? JSON.parse(readFileSync(filePath, "utf8")) : undefined;
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

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
  return value;
}

function markdown(value) {
  return [
    "# Revert Evidence",
    "",
    `Status: ${value.status}`,
    `Generated: ${value.generatedAt}`,
    `Project: ${value.projectPath}`,
    "",
    "## Provider State",
    `- Active real providers: ${value.providers.activeRealProviders.map((provider) => provider.id).join(", ") || "none"}`,
    `- Active mock CLI providers: ${value.providers.activeMockProviders.map((provider) => provider.id).join(", ") || "none"}`,
    "",
    "## Real Micro",
    `- Report: ${value.realMicro.reportPath || "missing"}`,
    `- Status: ${value.realMicro.status}`,
    `- Verdict: ${value.realMicro.verdict}`,
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
    "## Next Action",
    `- ${value.nextAction}`,
    "",
  ].join("\n");
}
