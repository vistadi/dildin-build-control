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
const styles = read("src/styles.css");
const pkg = JSON.parse(read("package.json"));
const jsAsset = newestAsset(".js");
const cssAsset = newestAsset(".css");
const builtJs = jsAsset ? readFileSync(jsAsset, "utf8") : "";
const builtCss = cssAsset ? readFileSync(cssAsset, "utf8") : "";

check("nav guided view", app.includes('{ id: "guided", label: "Guided Run"'), "Guided Run is present in the main navigation.");
check("guided component", app.includes("function GuidedRunView("), "GuidedRunView component exists.");
check("guided start button", app.includes("Create and start safe run"), "Guided Run has the primary safe-start action.");
check("advance action", app.includes("Advance run"), "Guided Run exposes HarnessRun advance.");
check("evidence action", app.includes("Generate EvidencePack"), "Guided Run exposes EvidencePack generation.");
check("decision actions", ["Accept", "Request rework", "Reject"].every((text) => app.includes(text)), "Final decision actions exist.");
check("reports checklist", app.includes('Panel title="Acceptance Checklist"'), "Reports include an acceptance checklist.");
check("accept disabled copy", app.includes("Accept stays disabled until"), "Reports explain why Accept is blocked.");
check("settings quick setup", app.includes('title="Quick Setup"'), "Settings have a simplified Quick Setup surface.");
check("guided styles", [".guided-stepper", ".guided-action-card", ".contract-preview"].every((text) => styles.includes(text)), "Guided Run CSS is present.");
check("acceptance styles", styles.includes(".acceptance-checklist"), "Acceptance Checklist CSS is present.");
check("package script registered", pkg.scripts?.["guided-run-smoke"] === "node scripts/guided-run-smoke.mjs", "package.json exposes pnpm guided-run-smoke.");
check("dist js built", builtJs.includes("Guided Run") && builtJs.includes("Create and start safe run"), "Production JS bundle contains Guided Run UI strings.");
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
