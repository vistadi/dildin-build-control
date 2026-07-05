import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const supportDir = path.join(dbcPath, "support");
const generatedAt = String(Date.now());
const bundleName = `bundle-${generatedAt}`;
const bundleDir = path.join(supportDir, bundleName);
const filesRoot = path.join(bundleDir, "files");
mkdirSync(filesRoot, { recursive: true });

const warnings = [];
const blockers = [];
const skipped = [];
const included = [];
const seen = new Set();

const refs = {
  audit: path.join(dbcPath, "audit", "latest.json"),
  launchDoctor: path.join(dbcPath, "doctor", "latest.json"),
  readiness: path.join(dbcPath, "readiness", "latest.json"),
  realPlan: path.join(dbcPath, "real-loop", "latest.json"),
  comparison: path.join(dbcPath, "compare", "latest.json"),
  operator: path.join(dbcPath, "operator", "latest.json"),
  approvalLedger: path.join(dbcPath, "approvals", "latest.json"),
  approvalQueue: path.join(dbcPath, "approval-queue", "latest.json"),
  loopStateMachine: path.join(dbcPath, "state-machine", "latest.json"),
  runJournal: path.join(dbcPath, "run-journal", "latest.json"),
  realMicroPreflight: path.join(dbcPath, "preflight", "latest.json"),
  evidenceSummary: path.join(dbcPath, "evidence-summary", "latest.json"),
  providerContracts: path.join(dbcPath, "provider-contracts", "latest.json"),
  providerSessions: path.join(dbcPath, "provider-sessions", "latest.json"),
  revertEvidence: path.join(dbcPath, "revert", "latest.json"),
  release: path.join(dbcPath, "release", "latest.json"),
  realMicroRunbook: path.join(dbcPath, "runbook", "latest.json"),
  providers: path.join(dbcPath, "providers.yaml"),
  policy: path.join(dbcPath, "policy.yaml"),
  surfacesPolicy: path.join(dbcPath, "policy", "surfaces.md"),
};

const comparison = readJson(refs.comparison);
const evidenceSummary = readJson(refs.evidenceSummary);
const loopIds = unique(
  [
    comparison?.refs?.controlledLoopId,
    comparison?.refs?.realLoopId,
    evidenceSummary?.loopId,
    latestLoopIdFromDir(path.join(dbcPath, "loops")),
  ].filter(Boolean),
);

for (const dir of [
  "audit",
  "doctor",
  "readiness",
  "real-loop",
  "compare",
  "operator",
  "approvals",
  "approval-queue",
  "state-machine",
  "run-journal",
  "preflight",
  "evidence-summary",
  "provider-contracts",
  "provider-sessions",
  "revert",
  "release",
  "runbook",
]) {
  includeLatestPair(path.join(dbcPath, dir));
}

for (const filePath of [
  path.join(dbcPath, "providers.yaml"),
  path.join(dbcPath, "providers.mock.yaml"),
  path.join(dbcPath, "providers.real-micro.yaml"),
  path.join(dbcPath, "policy.yaml"),
  path.join(dbcPath, "policy", "surfaces.md"),
  path.join(dbcPath, "operator", "approval.json"),
]) {
  includeFile(filePath);
}

includeDirectory(path.join(dbcPath, "approvals", "decisions"), { maxFiles: 50 });
includeTaskFiles();

for (const loopId of loopIds) {
  includeFile(path.join(dbcPath, "loops", `${loopId}.json`));
  includeDirectory(path.join(dbcPath, "artifacts", loopId), { maxFiles: 20 });
  includeDirectory(path.join(dbcPath, "evidence", loopId), { maxFiles: 50 });
  includeDirectory(path.join(dbcPath, "git", loopId), { maxFiles: 20 });
  includeDirectory(path.join(dbcPath, "runs", loopId), { maxFiles: 20 });
  includeFile(path.join(dbcPath, "security", `${loopId}.json`));
  includeFile(path.join(dbcPath, "reports", `${loopId}.json`));
  includeFile(path.join(dbcPath, "reports", `${loopId}.md`));
}

const bundleManifestPath = path.join(bundleDir, "manifest.json");
const tarPath = path.join(supportDir, `${bundleName}.tar.gz`);
const tarResult = createTarball(bundleDir, tarPath);
if (included.length === 0) blockers.push({ subject: "bundle files", detail: "No support files were included." });
if (!tarResult.ok) warnings.push({ subject: "archive", detail: tarResult.detail });

const report = {
  version: 1,
  kind: "support-bundle",
  generatedAt,
  projectPath,
  status: blockers.length ? "blocked" : warnings.length ? "ready_with_warnings" : "ready",
  bundleDir,
  tarPath: tarResult.ok ? tarPath : "",
  tarStatus: tarResult.ok ? "created" : "unavailable",
  blockers,
  warnings,
  skipped,
  files: included,
  refs: {
    ...refs,
    loopIds,
    manifest: bundleManifestPath,
  },
  hygiene: {
    excludedSecrets: true,
    excludedNodeModules: true,
    excludedBuildTargets: true,
    includedExactProviderPaths: true,
  },
};

writeFileSync(bundleManifestPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(supportDir, "latest.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(supportDir, "latest.md"), supportMarkdown(report));

console.log(
  JSON.stringify(
    {
      status: report.status,
      blockers: blockers.length,
      warnings: warnings.length,
      files: included.length,
      bundleDir,
      tarPath: report.tarPath,
      markdownPath: path.join(supportDir, "latest.md"),
    },
    null,
    2,
  ),
);

if (blockers.length) process.exitCode = 1;

function includeLatestPair(dirPath) {
  includeFile(path.join(dirPath, "latest.json"));
  includeFile(path.join(dirPath, "latest.md"));
}

function includeTaskFiles() {
  const taskDir = path.join(dbcPath, "tasks");
  if (!existsSync(taskDir)) {
    skip(taskDir, "missing");
    return;
  }
  for (const entry of readdirSync(taskDir).sort()) {
    if (!/\.(json|md)$/i.test(entry)) continue;
    includeFile(path.join(taskDir, entry));
  }
}

function includeDirectory(dirPath, options = {}) {
  const maxFiles = options.maxFiles ?? 25;
  if (!existsSync(dirPath)) {
    skip(dirPath, "missing");
    return;
  }
  const stat = statSync(dirPath);
  if (!stat.isDirectory()) {
    includeFile(dirPath);
    return;
  }
  const files = walk(dirPath).slice(0, maxFiles);
  for (const filePath of files) includeFile(filePath);
  const total = walk(dirPath).length;
  if (total > maxFiles) skip(dirPath, `limited to ${maxFiles} of ${total} files`);
}

function includeFile(filePath) {
  if (!filePath || seen.has(filePath)) return;
  seen.add(filePath);
  if (!existsSync(filePath)) {
    skip(filePath, "missing");
    return;
  }
  const stat = statSync(filePath);
  if (!stat.isFile()) {
    skip(filePath, "not a regular file");
    return;
  }
  if (!isAllowed(filePath)) {
    skip(filePath, "excluded by support bundle hygiene policy");
    return;
  }
  const relative = path.relative(projectPath, filePath);
  const target = path.join(filesRoot, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(filePath, target);
  const bytes = stat.size;
  included.push({
    source: filePath,
    bundlePath: path.relative(bundleDir, target),
    bytes,
    checksum: sha256(filePath),
  });
}

function isAllowed(filePath) {
  const relative = path.relative(projectPath, filePath);
  if (relative.startsWith("..")) return false;
  const normalized = relative.split(path.sep).join("/");
  if (normalized === ".env" || normalized.includes("/.env")) return false;
  if (/(^|\/)(node_modules|target|dist)(\/|$)/.test(normalized)) return false;
  if (/(secret|token|credential|private[_-]?key|api[_-]?key)/i.test(path.basename(normalized))) return false;
  return /^\.dbc\//.test(normalized);
}

function createTarball(sourceDir, outputPath) {
  rmSync(outputPath, { force: true });
  const result = spawnSync("tar", ["-czf", outputPath, path.basename(sourceDir)], {
    cwd: path.dirname(sourceDir),
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  if (result.status === 0 && existsSync(outputPath)) return { ok: true, detail: "created" };
  return {
    ok: false,
    detail: trim(result.stderr || result.stdout || "tar executable failed or is unavailable", 500),
  };
}

function latestLoopIdFromDir(dirPath) {
  if (!existsSync(dirPath)) return "";
  return readdirSync(dirPath)
    .filter((entry) => /^loop-\d+\.json$/.test(entry))
    .sort()
    .at(-1)
    ?.replace(/\.json$/, "");
}

function walk(dirPath) {
  const output = [];
  for (const entry of readdirSync(dirPath).sort()) {
    const filePath = path.join(dirPath, entry);
    const stat = statSync(filePath);
    if (stat.isDirectory()) output.push(...walk(filePath));
    else if (stat.isFile()) output.push(filePath);
  }
  return output;
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function readJson(filePath) {
  if (!filePath || !existsSync(filePath)) return undefined;
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    warnings.push({ subject: "json", detail: `Could not parse ${filePath}` });
    return undefined;
  }
}

function skip(filePath, reason) {
  skipped.push({ path: filePath, reason });
}

function unique(values) {
  return [...new Set(values)];
}

function trim(value, length) {
  const text = String(value || "").trim();
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function supportMarkdown(value) {
  return [
    "# Support Bundle",
    "",
    `Status: ${value.status}`,
    `Generated: ${value.generatedAt}`,
    `Project: ${value.projectPath}`,
    `Bundle directory: ${value.bundleDir}`,
    `Archive: ${value.tarPath || "not created"}`,
    "",
    "## Hygiene",
    `- Secrets, .env files, node_modules, dist, and build targets are excluded: ${value.hygiene.excludedSecrets}`,
    `- Exact provider paths are included for CLI discovery debugging: ${value.hygiene.includedExactProviderPaths}`,
    "",
    "## Blockers",
    ...(value.blockers.length ? value.blockers.map((item) => `- ${item.subject}: ${item.detail}`) : ["- None"]),
    "",
    "## Warnings",
    ...(value.warnings.length ? value.warnings.map((item) => `- ${item.subject}: ${item.detail}`) : ["- None"]),
    "",
    "## Included Files",
    ...value.files.map((item) => `- ${item.bundlePath} (${item.bytes} bytes, sha256 ${item.checksum})`),
    "",
    "## Skipped",
    ...(value.skipped.length ? value.skipped.map((item) => `- ${item.path}: ${item.reason}`) : ["- None"]),
    "",
  ].join("\n");
}
