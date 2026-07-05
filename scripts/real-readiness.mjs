import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const readinessDir = path.join(dbcPath, "readiness");
mkdirSync(readinessDir, { recursive: true });

const providersPath = path.join(dbcPath, "providers.yaml");
const policyPath = path.join(dbcPath, "policy.yaml");
const releasePath = path.join(dbcPath, "release", "latest.json");
const latestSmoke = findLatestControlledSmokeReport();

const providers = existsSync(providersPath) ? parseProviders(readFileSync(providersPath, "utf8")) : [];
const policyText = existsSync(policyPath) ? readFileSync(policyPath, "utf8") : "";
const release = readJsonIfExists(releasePath);
const smoke = latestSmoke ? readJsonIfExists(latestSmoke) : undefined;

const checks = [];
const warnings = [];
const blockers = [];

checkFile("providers.yaml", providersPath);
checkFile("policy.yaml", policyPath);
checkFile("release package", releasePath);

const codex = providers.find((provider) => provider.id === "codex_cli");
const claude = providers.find((provider) => provider.id === "claude_code");
const localRunner = providers.find((provider) => provider.id === "local_terminal");

checkProvider("Codex CLI", codex, {
  exactPath: true,
  argsIncludes: ["exec", "--skip-git-repo-check", "--sandbox", "workspace-write", "--cd"],
  helpArgs: ["exec", "--help"],
  helpNeedles: ["Usage: codex exec", "--cd", "--sandbox"],
});
checkProvider("Claude Code", claude, {
  exactPath: true,
  argsIncludes: ["-p"],
  helpArgs: ["--help"],
  helpNeedles: ["--print", "non-interactive"],
});

if (!localRunner) {
  fail("local runner", "Local Terminal Runner provider is missing.");
} else {
  pass("local runner", "Local Terminal Runner provider is configured.");
}

if (providers.some((provider) => provider.type === "cli" && provider.runMode === "real")) {
  pass("run modes", "At least one CLI provider is already in real mode.");
} else {
  warn("run modes", "CLI providers are still in mock mode. Switch selected providers to real only after reviewing this report.");
}

checkPolicy(policyText);
checkRelease(release);
checkSmoke(smoke, latestSmoke);
checkGitWorkspace();

const status = blockers.length ? "blocked" : warnings.length ? "ready_with_warnings" : "ready";
const report = {
  version: 1,
  kind: "real-loop-readiness",
  generatedAt: String(Date.now()),
  projectPath,
  status,
  blockers,
  warnings,
  checks,
  refs: {
    providersPath,
    policyPath,
    releasePath,
    latestControlledSmokeReport: latestSmoke ?? "",
  },
  recommendedNextActions:
    status === "blocked"
      ? ["Fix blockers, rerun pnpm real-readiness, then use controlled smoke again."]
      : [
          "Review .dbc/providers.yaml and switch only the intended providers from mock to real.",
          "Run a tiny task through Preflight before any source-changing loop.",
          "Keep git commit/push/signing/notarization outside automation until manually approved.",
        ],
};

const jsonPath = path.join(readinessDir, "latest.json");
const markdownPath = path.join(readinessDir, "latest.md");
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(markdownPath, readinessMarkdown(report));

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

function checkFile(subject, filePath) {
  if (existsSync(filePath)) {
    pass(subject, filePath);
  } else {
    fail(subject, `${filePath} is missing.`);
  }
}

function checkProvider(name, provider, options) {
  if (!provider) {
    fail(name, `${name} provider is missing.`);
    return;
  }
  if (provider.enabled !== "true") {
    fail(name, `${name} is not enabled.`);
  } else {
    pass(name, `${name} is enabled.`);
  }
  if (options.exactPath && !isExactPath(provider.command)) {
    fail(name, `${name} command is not an exact path: ${provider.command || "(empty)"}`);
  } else if (existsSync(provider.command)) {
    pass(name, `Executable exists: ${provider.command}`);
  } else {
    fail(name, `Executable path does not exist: ${provider.command || "(empty)"}`);
  }
  for (const token of options.argsIncludes) {
    if ((provider.argsTemplate || "").includes(token)) {
      pass(`${name} args`, `Args include ${token}.`);
    } else {
      fail(`${name} args`, `Args must include ${token}. Current: ${provider.argsTemplate || "(empty)"}`);
    }
  }
  const help = spawnSync(provider.command, options.helpArgs, { encoding: "utf8", maxBuffer: 1024 * 1024 });
  const output = `${help.stdout || ""}${help.stderr || ""}`;
  if (help.status === 0 && options.helpNeedles.every((needle) => output.includes(needle))) {
    pass(`${name} contract`, `Help contract validated with ${options.helpArgs.join(" ")}.`);
  } else {
    fail(`${name} contract`, `Help contract failed with ${options.helpArgs.join(" ")}.`);
  }
}

function checkPolicy(text) {
  const requiredAllow = ["pnpm build", "git status", "git diff"];
  const requiredApproval = ["git push", "sudo", "curl"];
  const requiredDeny = ["rm -rf /", "private key"];
  for (const item of requiredAllow) {
    text.includes(item) ? pass("policy allow", `${item} is allowed.`) : fail("policy allow", `${item} is missing.`);
  }
  for (const item of requiredApproval) {
    text.includes(item) ? pass("policy approval", `${item} requires approval.`) : fail("policy approval", `${item} is missing.`);
  }
  for (const item of requiredDeny) {
    text.includes(item) ? pass("policy deny", `${item} is denied.`) : fail("policy deny", `${item} is missing.`);
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
    pass("release", `Release package ready; DMG checksum ${value.checksums?.dmg || "missing"}.`);
  }
}

function checkSmoke(value, filePath) {
  if (!value) {
    fail("controlled smoke", "No controlled smoke report found.");
    return;
  }
  const gates = Object.entries(value.gates || {});
  const failingGates = gates.filter(([key, item]) => gateDecision(key, item) === "fail");
  const warningGates = gates.filter(([key, item]) => gateDecision(key, item) === "warning");
  if (value.status === "completed" && value.verdict === "accepted" && !failingGates.length) {
    pass("controlled smoke", `Accepted controlled smoke: ${filePath}`);
    for (const [key, item] of warningGates) {
      warn(`controlled smoke gate: ${key}`, String(item));
    }
  } else {
    fail(
      "controlled smoke",
      `Controlled smoke is not accepted: ${filePath}; failing gates: ${failingGates.map(([key]) => key).join(", ") || "status/verdict"}`,
    );
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

function checkGitWorkspace() {
  const inside = spawnSync("git", ["-C", projectPath, "rev-parse", "--is-inside-work-tree"], { encoding: "utf8" });
  if (inside.status === 0 && inside.stdout.trim() === "true") {
    pass("git workspace", "Project is inside a git repository.");
  } else {
    warn("git workspace", "Project is not inside a git repository. DBC can still run, but commit proposal/baseline evidence is limited.");
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

function findLatestControlledSmokeReport() {
  const reportsDir = path.join(dbcPath, "reports");
  if (!existsSync(reportsDir)) return "";
  return readdirSync(reportsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(reportsDir, file))
    .filter((filePath) => {
      const value = readJsonIfExists(filePath);
      return value?.task?.id === "SMOKE-LOOP-CONTROLLED";
    })
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

function readJsonIfExists(filePath) {
  if (!filePath || !existsSync(filePath)) return undefined;
  return JSON.parse(readFileSync(filePath, "utf8"));
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

function isExactPath(value) {
  return Boolean(value && (value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value) || value.includes("/") || value.includes("\\")));
}

function readinessMarkdown(report) {
  return [
    "# Real Loop Readiness",
    "",
    `Status: ${report.status}`,
    `Generated: ${report.generatedAt}`,
    `Project: ${report.projectPath}`,
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
    "## Refs",
    `- Providers: ${report.refs.providersPath}`,
    `- Policy: ${report.refs.policyPath}`,
    `- Release: ${report.refs.releasePath}`,
    `- Controlled smoke: ${report.refs.latestControlledSmokeReport}`,
    "",
    "## Next Actions",
    ...report.recommendedNextActions.map((item) => `- ${item}`),
    "",
  ].join("\n");
}
