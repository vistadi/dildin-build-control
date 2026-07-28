import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const allowExistingWorktreeChanges = process.argv.includes("--allow-existing-worktree-changes");
const summaryArgs = process.argv.slice(2).filter((arg) => arg !== "--allow-existing-worktree-changes");
const summaryScript = path.join(root, "scripts", "evidence-summary.mjs");
const summaryResult = spawnSync(process.execPath, [summaryScript, ...summaryArgs], {
  cwd: root,
  encoding: "utf8",
});

if (summaryResult.stdout) process.stdout.write(summaryResult.stdout);
if (summaryResult.stderr) process.stderr.write(summaryResult.stderr);
if (summaryResult.status !== 0) process.exit(summaryResult.status || 1);

const summaryPath = path.join(root, ".dbc", "evidence-summary", "latest.json");
if (!existsSync(summaryPath)) {
  console.error(`Evidence summary was not created: ${summaryPath}`);
  process.exit(1);
}

const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const health = summary.health || {};
const scopeWaived = allowExistingWorktreeChanges && health.scopePassed !== true;
const checks = [
  {
    id: "complete",
    ok: Number(health.missingArtifacts || 0) === 0,
    detail: `${Number(health.missingArtifacts || 0)} missing artifact(s)`,
  },
  {
    id: "approvals",
    ok: Number(health.pendingApprovals || 0) === 0,
    detail: `${Number(health.pendingApprovals || 0)} pending approval(s)`,
  },
  {
    id: "scope",
    ok: health.scopePassed === true || scopeWaived,
    detail:
      health.scopePassed === true
        ? "scope gate passed"
        : allowExistingWorktreeChanges
          ? "scope gate waived for explicitly allowed existing worktree changes"
          : "scope gate did not pass",
  },
  {
    id: "acceptance",
    ok: health.acceptanceStatus === "completed" && (health.verdict !== "blocked" || scopeWaived),
    detail:
      health.acceptanceStatus !== "completed"
        ? `acceptance status is ${health.acceptanceStatus || "missing"}`
        : health.verdict === "blocked" && scopeWaived
          ? "blocked verdict is attributable to the explicitly waived scope gate"
          : `acceptance verdict is ${health.verdict || "missing"}`,
  },
  {
    id: "step-evidence",
    ok: Number(health.stepEvidenceCount || 0) > 0,
    detail: `${Number(health.stepEvidenceCount || 0)} step evidence record(s)`,
  },
];

const failed = checks.filter((check) => !check.ok);
const result = {
  status: failed.length ? "failed" : "passed",
  loopId: summary.loopId,
  verdict: health.verdict,
  acceptanceStatus: health.acceptanceStatus,
  checks,
  summaryPath,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exitCode = 1;
