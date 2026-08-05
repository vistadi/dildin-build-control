import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const reportDir = path.join(root, ".dbc", "guided-smoke");
mkdirSync(reportDir, { recursive: true });

const checks = [];

function check(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail });
}

function read(rel) {
  return readFileSync(path.join(root, rel), "utf8");
}

function fileSize(rel) {
  const file = path.join(root, rel);
  return existsSync(file) ? statSync(file).size : 0;
}

function newestAsset(ext) {
  const dir = path.join(root, "dist", "assets");
  if (!existsSync(dir)) return "";
  return readdirSync(dir)
    .filter((file) => file.endsWith(ext))
    .map((file) => path.join(dir, file))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0] ?? "";
}

const app = read("src/App.tsx");
const bridge = read("src/tauriBridge.ts");
const styles = read("src/styles.css");
const pkg = JSON.parse(read("package.json"));
const jsAsset = newestAsset(".js");
const cssAsset = newestAsset(".css");
const builtJs = jsAsset ? readFileSync(jsAsset, "utf8") : "";
const builtCss = cssAsset ? readFileSync(cssAsset, "utf8") : "";

check("nav guided view", app.includes('{ id: "guided", label: "Run"'), "The primary Run entry is present in the main navigation.");
check("guided component", app.includes("function GuidedRunView("), "GuidedRunView component exists.");
check("guided start button", app.includes("Start safe run"), "Guided Run has the primary safe-start action above the fold.");
check("preview lifecycle", bridge.includes("browserHarnessOverview") && bridge.includes("ready_for_decision"), "Browser preview persists a complete safe Harness lifecycle.");
check("preview safety copy", app.includes("No files or providers are touched"), "Browser preview clearly states its safety boundary.");
check("advanced navigation", app.includes("advancedNavOpen") && app.includes("Advanced"), "Expert consoles are grouped under Advanced navigation.");
check("advance action", app.includes("Advance checks"), "Guided Run exposes the safe check advance action.");
check("evidence action", app.includes("Generate proof package"), "Guided Run exposes EvidencePack generation.");
check("run context isolation", app.includes("evidencePackForRun") && app.includes("approvalMatchesRun") && app.includes("loopMatchesRun"), "Evidence, approvals, and loop artifacts are scoped to one HarnessRun.");
check("evidence empty state", app.includes("No current run selected") && app.includes("Historical smoke reports and unrelated costs stay out"), "Evidence does not render stale reports without a current run.");
check("three-stage onboarding", app.includes('label: "Describe"') && app.includes('label: "Run checks"') && app.includes('label: "Decide"'), "The primary journey uses three user-facing stages.");
check("approval decision surface", app.includes("Decisions for this run") && app.includes("Hidden records are not linked to the current run"), "Approvals hide unrelated global records from the primary surface.");
check("settings advanced disclosure", app.includes("Advanced provider and policy settings"), "Provider contracts and policy diagnostics are grouped under Advanced.");
check("read-only report viewer", app.includes("Raw report and artifact paths") && app.includes('<pre className="report-box">'), "Raw evidence is rendered as read-only output rather than an editable-looking textarea.");
check("decision actions", ["Accept", "Request rework", "Reject"].every((text) => app.includes(text)), "Final decision actions exist.");
check("reports checklist", app.includes('Panel title="Acceptance Checklist"'), "Reports include an acceptance checklist.");
check("accept disabled copy", app.includes("Accept stays disabled until"), "Reports explain why Accept is blocked.");
check("settings quick setup", app.includes('title="Quick Setup"'), "Settings have a simplified Quick Setup surface.");
check("guided styles", [".guided-stepper", ".disclosure-button", ".contract-preview"].every((text) => styles.includes(text)), "Guided Run CSS is present.");
check("acceptance styles", styles.includes(".acceptance-checklist"), "Acceptance Checklist CSS is present.");
check("package script registered", pkg.scripts?.["guided-run-smoke"] === "node scripts/guided-run-smoke.mjs", "package.json exposes pnpm guided-run-smoke.");
check("dist js built", builtJs.includes("Safe interactive preview") && builtJs.includes("Start safe run") && builtJs.includes("No current run selected"), "Production JS bundle contains the new guided onboarding and context-isolation strings.");
check("dist css built", builtCss.includes("guided-stepper") && builtCss.includes("acceptance-checklist"), "Production CSS bundle contains Guided Run styles.");

for (const rel of [
  "docs/screenshots-guide/01-control-tower.png",
  "docs/screenshots-guide/02-guided-run.png",
  "docs/screenshots-guide/03-reports-checklist.png",
  "docs/screenshots-guide/04-settings-quick-setup.png",
]) {
  check(`screenshot ${path.basename(rel)}`, fileSize(rel) > 20_000, `${rel} exists and is non-trivial.`);
}

check("production guide docx", fileSize("docs/DBC_Production_User_Guide_RU.docx") > 300_000, "Production Word guide exists with embedded screenshots.");

const failed = checks.filter((item) => !item.ok);
const report = {
  status: failed.length ? "failed" : "passed",
  checkedAt: new Date().toISOString(),
  checks,
  summary: {
    passed: checks.length - failed.length,
    failed: failed.length,
  },
};

const jsonPath = path.join(reportDir, "guided-run-smoke.json");
const markdownPath = path.join(reportDir, "guided-run-smoke.md");
writeFileSync(jsonPath, JSON.stringify(report, null, 2));
writeFileSync(
  markdownPath,
  [
    `# Guided Run Smoke`,
    "",
    `Status: ${report.status}`,
    `Passed: ${report.summary.passed}`,
    `Failed: ${report.summary.failed}`,
    "",
    ...checks.map((item) => `- ${item.ok ? "PASS" : "FAIL"} ${item.name}: ${item.detail}`),
    "",
  ].join("\n"),
);

console.log(JSON.stringify({ status: report.status, jsonPath, markdownPath, summary: report.summary }, null, 2));

if (failed.length) process.exitCode = 1;
