import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const reportsDir = path.join(dbcPath, "reports");
const compareDir = path.join(dbcPath, "compare");
mkdirSync(compareDir, { recursive: true });

const controlled = findLatestReportByTask("SMOKE-LOOP-CONTROLLED");
const real = findLatestReportByTask("REAL-MICRO-README");
const checks = [];
const blockers = [];
const warnings = [];

if (!controlled) {
  fail("controlled baseline", "No accepted controlled smoke report found.");
} else {
  checkReport("controlled baseline", controlled);
}

if (!real) {
  warn("real micro run", "No REAL-MICRO-README acceptance package found yet. Run the real micro loop, then rerun this comparator.");
} else {
  checkReport("real micro run", real);
  compareReports(controlled, real);
}

const status = blockers.length ? "fail" : real ? (warnings.length ? "pass_with_warnings" : "pass") : "pending_real";
const result = {
  version: 1,
  kind: "real-micro-comparison",
  generatedAt: String(Date.now()),
  projectPath,
  status,
  blockers,
  warnings,
  checks,
  refs: {
    controlledReportPath: controlled?.path || "",
    realReportPath: real?.path || "",
    controlledLoopId: controlled?.report?.loopId || "",
    realLoopId: real?.report?.loopId || "",
  },
  nextActions:
    status === "pending_real"
      ? [
          "Review .dbc/real-loop/latest.md.",
          "Apply real micro profile only when ready.",
          "Run REAL-MICRO-README through Preflight.",
          "Rerun pnpm compare-real-micro.",
        ]
      : status === "fail"
        ? ["Inspect blockers before accepting the real micro loop.", "Revert with pnpm providers:apply-mock if needed."]
        : ["Real micro loop evidence is comparable to the controlled baseline.", "Review warnings and generated diff before broader real loops."],
};

const jsonPath = path.join(compareDir, "latest.json");
const markdownPath = path.join(compareDir, "latest.md");
writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(markdownPath, comparisonMarkdown(result));

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
  if (!existsSync(reportsDir)) return undefined;
  return readdirSync(reportsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(reportsDir, file))
    .map((filePath) => ({ path: filePath, report: readJson(filePath), mtime: statSync(filePath).mtimeMs }))
    .filter((item) => item.report?.kind === "acceptance-package" && item.report?.task?.id === taskId)
    .sort((a, b) => b.mtime - a.mtime)[0];
}

function checkReport(subject, item) {
  const report = item.report;
  if (report.status === "completed") {
    pass(subject, "Status is completed.");
  } else {
    fail(subject, `Status is ${report.status || "missing"}, expected completed.`);
  }
  if (report.verdict === "accepted") {
    pass(subject, "Verdict is accepted.");
  } else {
    fail(subject, `Verdict is ${report.verdict || "missing"}, expected accepted.`);
  }
  const gates = report.gates || {};
  for (const [key, value] of Object.entries(gates)) {
    const decision = gateDecision(key, value);
    if (decision === "ok") pass(`${subject} gate`, `${key}: ${value}`);
    if (decision === "warning") warn(`${subject} gate`, `${key}: ${value}`);
    if (decision === "fail") fail(`${subject} gate`, `${key}: ${value}`);
  }
  if (report.refs?.securityReportPath && existsSync(report.refs.securityReportPath)) {
    pass(subject, `Security report exists: ${report.refs.securityReportPath}`);
  } else {
    fail(subject, "Security report is missing.");
  }
}

function gateDecision(key, value) {
  if (["pendingApprovals", "securityFindings", "scopeOutsideAllowed", "scopeDeniedMatches"].includes(key)) {
    return value === 0 ? "ok" : "fail";
  }
  if (["realProviderCallLimit", "realProviderCallsUsed"].includes(key)) {
    return typeof value === "number" && value >= 0 ? "ok" : "fail";
  }
  if (key === "scopeVerified") {
    return value === true ? "ok" : "warning";
  }
  return value === true ? "ok" : "fail";
}

function compareReports(controlledItem, realItem) {
  if (!controlledItem || !realItem) return;
  const controlledSteps = stepMap(controlledItem.report);
  const realSteps = stepMap(realItem.report);
  for (const id of ["plan", "code", "build", "test", "review", "security", "accept"]) {
    const controlled = controlledSteps.get(id);
    const real = realSteps.get(id);
    if (!controlled) {
      warn("step coverage", `Controlled baseline has no ${id} step.`);
      continue;
    }
    if (!real) {
      fail("step coverage", `Real micro run has no ${id} step.`);
      continue;
    }
    if (real.status === "passed") {
      pass("step coverage", `${id}: passed`);
    } else {
      fail("step coverage", `${id}: ${real.status}`);
    }
    if (real.evidencePath || real.evidence_path) {
      pass("step evidence", `${id}: evidence path recorded.`);
    } else {
      fail("step evidence", `${id}: evidence path missing.`);
    }
  }
  const controlledSecurity = controlledItem.report.gates?.securityFindings ?? 0;
  const realSecurity = realItem.report.gates?.securityFindings ?? 0;
  if (realSecurity <= controlledSecurity) {
    pass("security delta", `Real findings ${realSecurity}; controlled findings ${controlledSecurity}.`);
  } else {
    fail("security delta", `Real findings ${realSecurity}; controlled findings ${controlledSecurity}.`);
  }
}

function stepMap(report) {
  return new Map((report.steps || []).map((step) => [step.id, step]));
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
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

function comparisonMarkdown(report) {
  return [
    "# Real Micro Comparison",
    "",
    `Status: ${report.status}`,
    `Generated: ${report.generatedAt}`,
    `Project: ${report.projectPath}`,
    "",
    "## Refs",
    `- Controlled: ${report.refs.controlledReportPath || "missing"}`,
    `- Real: ${report.refs.realReportPath || "missing"}`,
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
    "## Next Actions",
    ...report.nextActions.map((item) => `- ${item}`),
    "",
  ].join("\n");
}
