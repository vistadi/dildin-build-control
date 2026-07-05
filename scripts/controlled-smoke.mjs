import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const loopId = `loop-${Date.now()}`;
const taskId = "SMOKE-LOOP-CONTROLLED";
const taskTitle = "Controlled smoke loop: local evidence package";
const taskBrief =
  "Run the DBC loop engine end-to-end without model calls. The build step executes pnpm build and all other steps use deterministic mock evidence.";
const criteria = [
  "Loop reaches completed status.",
  "Manifest, evidence, reports, git baseline, git workspace, diff, commit proposal, and security report are written under .dbc.",
  "Build step records a successful pnpm build result.",
  "Every step has a structured report and evidence path.",
];
const constraints = [
  "Do not call external model providers.",
  "Do not publish, push, install, or run destructive commands.",
  "Only generated .dbc artifacts and existing build outputs may change.",
];

const dirs = {
  dbc: path.join(projectPath, ".dbc"),
  tasks: path.join(projectPath, ".dbc", "tasks"),
  loops: path.join(projectPath, ".dbc", "loops"),
  artifacts: path.join(projectPath, ".dbc", "artifacts", loopId),
  evidence: path.join(projectPath, ".dbc", "evidence", loopId),
  reports: path.join(projectPath, ".dbc", "reports"),
  git: path.join(projectPath, ".dbc", "git", loopId),
  security: path.join(projectPath, ".dbc", "security"),
};

Object.values(dirs).forEach((dir) => mkdirSync(dir, { recursive: true }));

const taskSpecPath = path.join(dirs.tasks, `${taskId}.json`);
const taskSpec = {
  version: 1,
  id: taskId,
  title: taskTitle,
  brief: taskBrief,
  criteria,
  constraints,
  budgetLimit: 0,
  status: "ready",
  risk: "low",
  priority: "normal",
  loopProfile: "controlled_smoke",
  providerStrategy: "mock_only",
  affectedPaths: [".dbc/tasks", ".dbc/loops", ".dbc/evidence", ".dbc/artifacts", ".dbc/reports"],
  allowedPaths: [".dbc/tasks", ".dbc/loops", ".dbc/evidence", ".dbc/artifacts", ".dbc/reports", ".dbc/security", ".dbc/git"],
  deniedPaths: [".env", "node_modules", "src-tauri/target"],
  requiredReviewers: ["QA", "Reviewer", "Security", "Product Owner"],
  stopConditions: [
    "Stop if any real model provider is selected.",
    "Stop if controlled smoke evidence cannot be written.",
    "Stop if pnpm build fails.",
  ],
  updatedAt: String(Date.now()),
};
writeJson(taskSpecPath, taskSpec);
const taskSpecChecksum = stableTextChecksum(JSON.stringify(taskSpec, null, 2));

const steps = [
  smokeStep("plan", "planned", "Team Lead", "lead", "mock_adapter", "mock", "read_only"),
  smokeStep("code", "coding", "Developer", "developer", "mock_adapter", "mock", "write_workspace"),
  smokeStep("build", "building", "DevOps", "devops", "local_terminal", "local_runner", "command_runner", ["pnpm build"]),
  smokeStep("test", "testing", "QA", "qa", "mock_adapter", "mock", "review_only"),
  smokeStep("review", "reviewing", "Reviewer", "reviewer", "mock_adapter", "mock", "review_only"),
  smokeStep("security", "security", "Security", "security", "mock_adapter", "mock", "read_only"),
  smokeStep("accept", "acceptance", "Product Owner", "product", "mock_adapter", "mock", "read_only"),
];

for (const [index, step] of steps.entries()) {
  const execution = step.id === "build" ? runBuildStep(step) : runMockStep(step);
  step.status = execution.status;
  step.output = execution.output;
  step.structuredReport = execution.report;
  step.structuredReportJson = JSON.stringify(execution.report, null, 2);
  step.attemptCount = 1;
  step.startedAt = String(Date.now());
  step.finishedAt = String(Date.now());
  step.artifactPath = path.join(dirs.artifacts, `${String(index + 1).padStart(2, "0")}-${step.id}.md`);
  step.evidencePath = path.join(dirs.evidence, `${step.id}.json`);
  writeStepArtifact(step);
  writeStepEvidence(step);
  if (execution.status !== "passed") break;
}

const completed = steps.every((step) => step.status === "passed");
const snapshot = {
  id: loopId,
  project_id: "dbc",
  project_path: projectPath,
  task_id: taskId,
  task_title: taskTitle,
  task_brief: taskBrief,
  task_criteria: criteria,
  task_constraints: constraints,
  task_budget_limit: taskSpec.budgetLimit,
  task_spec_path: taskSpecPath,
  task_spec_checksum: taskSpecChecksum,
  memory_context: "- [decision] Headless controlled smoke verifies DBC orchestration without external model calls.",
  memory_refs: [],
  status: completed ? "completed" : "failed",
  active_step_index: Math.max(0, steps.findIndex((step) => step.status !== "passed")),
  artifact_dir: dirs.artifacts,
  manifest_path: path.join(dirs.loops, `${loopId}.json`),
  report_json_path: path.join(dirs.reports, `${loopId}.json`),
  report_markdown_path: path.join(dirs.reports, `${loopId}.md`),
  git_baseline_path: path.join(dirs.git, "baseline.json"),
  git_workspace_path: path.join(dirs.git, "workspace.json"),
  git_diff_path: path.join(dirs.git, "diff.patch"),
  git_diff_stat_path: path.join(dirs.git, "diff-stat.txt"),
  commit_proposal_path: path.join(dirs.git, "commit-proposal.md"),
  security_report_path: path.join(dirs.security, `${loopId}.json`),
  steps: steps.map(toSnapshotStep),
};
if (snapshot.active_step_index < 0) snapshot.active_step_index = steps.length - 1;

writeJson(snapshot.git_baseline_path, {
  version: 1,
  kind: "git-baseline",
  capturedAt: String(Date.now()),
  loopId,
  taskId,
  taskTitle,
  projectPath,
  git: collectGitEvidence(),
  policy: {
    branchCreation: "manual",
    commit: "manual",
    push: "approval_required",
    resetCleanCheckout: "deny_without_explicit_human_action",
  },
});

writeGitWorkspacePackage(snapshot);

writeFileSync(
  snapshot.commit_proposal_path,
  [
    `# Commit Proposal: ${taskTitle}`,
    "",
    `Loop: ${loopId}`,
    `Task: ${taskId} - ${taskTitle}`,
    `Suggested task branch: ${suggestedTaskBranch()}`,
    `Acceptance report: ${snapshot.report_markdown_path}`,
    `Git baseline: ${snapshot.git_baseline_path}`,
    `Git workspace report: ${snapshot.git_workspace_path}`,
    "",
    "## Suggested Commit Message",
    "",
    "```text",
    `${taskId}: ${taskTitle}`,
    "```",
    "",
    "## Manual Commands",
    "",
    "```bash",
    "git status --short",
    "git diff --stat",
    `git switch -c ${suggestedTaskBranch()}`,
    `git add ${taskSpec.allowedPaths.map(shellQuotePath).join(" ")}`,
    `git commit -m "${taskId}: ${taskTitle}"`,
    "```",
    "",
    "Push, reset, clean, checkout, and branch deletion require explicit human approval outside this proposal.",
  ].join("\n"),
);

writeJson(snapshot.security_report_path, {
  version: 1,
  kind: "security-report",
  updatedAt: String(Date.now()),
  loopId,
  taskId,
  policy: {
    promptSecretScan: "block_real_cli_before_send",
    secretValues: "never_written_to_report",
    redaction: "enabled",
    destructiveCommands: "deny_or_human_approval",
  },
  gates: {
    secretFindings: 0,
    blockedSteps: [],
    passed: true,
  },
  findings: [],
});

writeJson(snapshot.manifest_path, {
  version: 1,
  kind: "loop-manifest",
  updatedAt: String(Date.now()),
  loop: snapshot,
});

writeAcceptancePackage(snapshot);

console.log(
  JSON.stringify(
    {
      status: snapshot.status,
      loopId,
      manifestPath: snapshot.manifest_path,
      reportMarkdownPath: snapshot.report_markdown_path,
      securityReportPath: snapshot.security_report_path,
      gitBaselinePath: snapshot.git_baseline_path,
    },
    null,
    2,
  ),
);

if (!completed) process.exitCode = 1;

function smokeStep(id, state, agent, roleId, providerId, providerType, agentMode, localCommands = []) {
  return {
    id,
    state,
    agent,
    roleId,
    providerId,
    providerType,
    providerCommand: "",
    providerArgsTemplate: "",
    providerPromptMode: "stdin",
    providerRunMode: providerType === "local_runner" ? "real" : "mock",
    agentMode,
    localCommands,
    timeoutSeconds: 300,
    maxOutputBytes: 200000,
    maxAttempts: 1,
    attemptCount: 0,
    requiresApproval: false,
    lastError: "",
    summary: `${state} completed by ${agent}.`,
    evidence: `${state} evidence recorded by controlled smoke.`,
    status: "waiting",
    output: "",
    structuredReport: undefined,
    structuredReportJson: "",
    artifactPath: "",
    evidencePath: "",
    startedAt: "",
    finishedAt: "",
  };
}

function runMockStep(step) {
  const output = `${step.state} completed in controlled smoke mock mode by ${step.agent}.`;
  return {
    status: "passed",
    output,
    report: report("pass", output, [`Recorded ${step.state} smoke evidence.`], [step.evidence], []),
  };
}

function runBuildStep(step) {
  const result = spawnSync("pnpm", ["build"], {
    cwd: projectPath,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10,
  });
  const output = [
    "## pnpm build",
    `Status: ${result.status === 0 ? "success" : "failed_exit_code"}`,
    `Exit: ${result.status}`,
    "",
    redact(`${result.stdout || ""}\n${result.stderr || ""}`).trim(),
  ].join("\n");
  const passed = result.status === 0;
  return {
    status: passed ? "passed" : "failed",
    output,
    report: report(
      passed ? "pass" : "fail",
      passed ? "pnpm build completed successfully." : "pnpm build failed.",
      ["Executed pnpm build through headless controlled smoke."],
      ["Build stdout/stderr captured and redacted."],
      passed ? [] : ["Build command returned a non-zero exit code."],
    ),
  };
}

function report(verdict, summary, actions, evidence, risks) {
  return {
    verdict,
    summary,
    actions,
    filesTouched: [],
    evidence,
    risks,
    nextAction: verdict === "pass" ? "Continue." : "Inspect output and retry after fixing the failure.",
  };
}

function writeStepArtifact(step) {
  writeFileSync(
    step.artifactPath,
    [
      `# ${step.state} - ${step.agent}`,
      "",
      `Status: ${step.status}`,
      `Provider: ${step.providerId}`,
      "",
      "## Summary",
      step.summary,
      "",
      "## Structured Report",
      "",
      "```json",
      step.structuredReportJson,
      "```",
      "",
      "## Output",
      "",
      "```text",
      step.output,
      "```",
    ].join("\n"),
  );
}

function writeStepEvidence(step) {
  writeJson(step.evidencePath, {
    version: 1,
    kind: "step-evidence",
    updatedAt: String(Date.now()),
    loopId,
    taskId,
    stepId: step.id,
    state: step.state,
    agent: step.agent,
    status: step.status,
    artifactPath: step.artifactPath,
    structuredReport: step.structuredReport,
    outputExcerpt: step.output.slice(0, 8000),
    git: collectGitEvidence(),
    scopeGate: scopeGateFromGit(collectGitEvidence()),
    gitWorkspace: {
      workspacePath: path.join(dirs.git, "workspace.json"),
      diffPath: path.join(dirs.git, "diff.patch"),
      diffStatPath: path.join(dirs.git, "diff-stat.txt"),
    },
  });
}

function writeAcceptancePackage(loop) {
  const realProviderCallLimit = realProviderLimit(loop.task_budget_limit);
  const realProviderCallsUsed = loop.steps
    .filter((step) => step.provider_type === "cli" && step.provider_run_mode === "real")
    .reduce((sum, step) => sum + (step.attempt_count || 0), 0);
  const git = collectGitEvidence();
  const scopeGate = scopeGateFromGit(git);
  const gates = {
    allStepsPassed: loop.steps.every((step) => step.status === "passed"),
    hasArtifacts: loop.steps.some((step) => step.artifact_path),
    hasEvidenceFiles: loop.steps.some((step) => step.evidence_path),
    hasStructuredReports: loop.steps.some((step) => step.structured_report_json),
    hasTaskSpec: Boolean(loop.task_spec_path && loop.task_spec_checksum),
    pendingApprovals: 0,
    securityFindings: 0,
    hasSecurityReport: true,
    realProviderCallLimit,
    realProviderCallsUsed,
    realProviderBudgetOk: realProviderCallLimit <= 0 || realProviderCallsUsed <= realProviderCallLimit,
    scopeVerified: scopeGate.verified,
    scopePassed: scopeGate.passed,
    scopeOutsideAllowed: scopeGate.outsideAllowed.length,
    scopeDeniedMatches: scopeGate.deniedMatches.length,
  };
  const verdict = loop.status === "completed" && gates.allStepsPassed && gates.scopePassed ? "accepted" : "blocked";
  writeJson(loop.report_json_path, {
    version: 1,
    kind: "acceptance-package",
    updatedAt: String(Date.now()),
    loopId,
    projectId: loop.project_id,
    projectPath,
    task: {
      id: taskId,
      title: taskTitle,
      brief: taskBrief,
      criteria,
      constraints,
      budgetLimit: taskSpec.budgetLimit,
      specPath: taskSpecPath,
      specChecksum: taskSpecChecksum,
      scope: taskScopeMarkdown(taskSpec),
      scopeGate,
    },
    status: loop.status,
    verdict,
    gates,
    refs: {
      manifestPath: loop.manifest_path,
      artifactDir: loop.artifact_dir,
      reportJsonPath: loop.report_json_path,
      reportMarkdownPath: loop.report_markdown_path,
      gitBaselinePath: loop.git_baseline_path,
      gitWorkspacePath: loop.git_workspace_path,
      gitDiffPath: loop.git_diff_path,
      gitDiffStatPath: loop.git_diff_stat_path,
      commitProposalPath: loop.commit_proposal_path,
      securityReportPath: loop.security_report_path,
      memoryRefs: [],
    },
    steps: loop.steps,
    git,
    scopeGate,
    security: {
      reportPath: loop.security_report_path,
      findings: [],
    },
  });
  writeFileSync(
    loop.report_markdown_path,
    [
      `# Acceptance Report: ${taskTitle}`,
      "",
      `Loop: ${loopId}`,
      `Task: ${taskId}`,
      `Status: ${loop.status}`,
      `Verdict: ${verdict}`,
      "",
      "## Gates",
      ...Object.entries(gates).map(([key, value]) => `- ${key}: ${value}`),
      "",
      "## Scope Gate",
      `- mode: ${scopeGate.mode}`,
      `- verified: ${scopeGate.verified}`,
      `- passed: ${scopeGate.passed}`,
      `- changedFiles: ${JSON.stringify(scopeGate.changedFiles)}`,
      `- outsideAllowed: ${JSON.stringify(scopeGate.outsideAllowed)}`,
      `- deniedMatches: ${JSON.stringify(scopeGate.deniedMatches)}`,
      "",
      "## Artifacts",
      `- Manifest: ${loop.manifest_path}`,
      `- JSON Report: ${loop.report_json_path}`,
      `- Security Report: ${loop.security_report_path}`,
      `- Git Baseline: ${loop.git_baseline_path}`,
      `- Git Workspace: ${loop.git_workspace_path}`,
      `- Git Diff: ${loop.git_diff_path}`,
      `- Commit Proposal: ${loop.commit_proposal_path}`,
      "",
      "## Steps",
      ...loop.steps.map((step) => `- ${step.state}: ${step.status} (${step.evidence_path})`),
    ].join("\n"),
  );
}

function writeGitWorkspacePackage(loop) {
  const git = collectGitEvidence();
  const scopeGate = scopeGateFromGit(git);
  const diff = git.isGitRepo ? runGit(["diff", "--"]) : "No git diff is available because the project is not inside a git repository.";
  const diffStat = git.isGitRepo ? runGit(["diff", "--stat"]) : "No git diff stat is available because the project is not inside a git repository.";
  writeFileSync(loop.git_diff_path, diff);
  writeFileSync(loop.git_diff_stat_path, diffStat);
  writeJson(loop.git_workspace_path, {
    version: 1,
    kind: "git-workspace",
    capturedAt: String(Date.now()),
    loopId,
    taskId,
    taskTitle,
    projectPath,
    isGitRepo: Boolean(git.isGitRepo),
    currentBranch: git.branch || "unknown",
    suggestedTaskBranch: suggestedTaskBranch(),
    dirtyTree: Boolean((git.changedFiles || []).length),
    changedFiles: git.changedFiles || [],
    scopeGate,
    artifacts: {
      baselinePath: loop.git_baseline_path,
      workspacePath: loop.git_workspace_path,
      diffPath: loop.git_diff_path,
      diffStatPath: loop.git_diff_stat_path,
      commitProposalPath: loop.commit_proposal_path,
    },
    gates: {
      insideGitRepo: Boolean(git.isGitRepo),
      scopePassed: scopeGate.passed,
      diffArtifactWritten: true,
      diffStatArtifactWritten: true,
    },
    manualCommands: {
      inspect: ["git status --short", "git diff --stat", "git diff --"],
      createTaskBranch: `git switch -c ${suggestedTaskBranch()}`,
      stageAllowed: `git add ${taskSpec.allowedPaths.map(shellQuotePath).join(" ")}`,
      commit: `git commit -m "${taskId}: ${taskTitle}"`,
    },
    policy: {
      branchCreation: "manual",
      stage: "manual_allowed_paths_only",
      commit: "manual",
      push: "approval_required",
      resetCleanCheckout: "deny_without_explicit_human_action",
    },
  });
}

function scopeGateFromGit(git) {
  const allowedPaths = taskSpec.allowedPaths.map(normalizeScopePath).filter(Boolean);
  const deniedPaths = taskSpec.deniedPaths.map(normalizeScopePath).filter(Boolean);
  const changedFiles = (git.changedFiles || []).map(normalizeScopePath).filter(Boolean);
  const outsideAllowed = allowedPaths.length
    ? changedFiles.filter((file) => !allowedPaths.some((allowed) => scopePathMatches(file, allowed)))
    : [];
  const deniedMatches = changedFiles.filter((file) => deniedPaths.some((denied) => scopePathMatches(file, denied)));
  return {
    version: 1,
    mode: git.isGitRepo ? (allowedPaths.length ? "git_changed_files" : "broad_no_allowed_paths") : "unverified_non_git",
    verified: Boolean(git.isGitRepo),
    passed: outsideAllowed.length === 0 && deniedMatches.length === 0,
    allowedPaths,
    deniedPaths,
    changedFiles,
    outsideAllowed,
    deniedMatches,
  };
}

function normalizeScopePath(value) {
  return String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
}

function scopePathMatches(file, scope) {
  return file === scope || file.startsWith(`${scope}/`);
}

function taskScopeMarkdown(task) {
  return [
    `- Priority: ${task.priority}`,
    `- Loop profile: ${task.loopProfile}`,
    `- Provider strategy: ${task.providerStrategy}`,
    "- Allowed paths:",
    ...task.allowedPaths.map((item) => `  - ${item}`),
    "- Denied paths:",
    ...task.deniedPaths.map((item) => `  - ${item}`),
    "- Stop conditions:",
    ...task.stopConditions.map((item) => `  - ${item}`),
  ].join("\n");
}

function suggestedTaskBranch() {
  return `dbc/${taskId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

function shellQuotePath(value) {
  return /^[A-Za-z0-9/._-]+$/.test(value) ? value : `'${String(value).replace(/'/g, "'\\''")}'`;
}

function realProviderLimit(budgetLimit) {
  return budgetLimit > 0 ? Math.max(1, Math.ceil(budgetLimit)) * 4 : 0;
}

function toSnapshotStep(step) {
  return {
    id: step.id,
    state: step.state,
    agent: step.agent,
    role_id: step.roleId,
    provider_id: step.providerId,
    provider_type: step.providerType,
    provider_command: step.providerCommand,
    provider_args_template: step.providerArgsTemplate,
    provider_prompt_mode: step.providerPromptMode,
    provider_run_mode: step.providerRunMode,
    agent_mode: step.agentMode,
    local_commands: step.localCommands,
    timeout_seconds: step.timeoutSeconds,
    max_output_bytes: step.maxOutputBytes,
    max_attempts: step.maxAttempts,
    attempt_count: step.attemptCount,
    requires_approval: step.requiresApproval,
    last_error: step.lastError,
    summary: step.summary,
    evidence: step.evidence,
    status: step.status,
    output: step.output,
    structured_report_json: step.structuredReportJson,
    artifact_path: step.artifactPath,
    evidence_path: step.evidencePath,
    started_at: step.startedAt,
    finished_at: step.finishedAt,
  };
}

function collectGitEvidence() {
  const inside = runGitCapture(["rev-parse", "--is-inside-work-tree"]);
  if (inside.status !== "success" || inside.output.trim() !== "true") {
    return {
      isGitRepo: false,
      status: inside.status,
      message: inside.output.slice(0, 1000),
      changedFiles: [],
    };
  }

  return {
    isGitRepo: true,
    branch: runGit(["branch", "--show-current"]).trim() || "unknown",
    head: runGit(["rev-parse", "--short", "HEAD"]).trim(),
    statusShort: runGit(["status", "--short"]).trim(),
    diffStat: runGit(["diff", "--stat"]).trim(),
    changedFiles: runGit(["status", "--short"])
      .split("\n")
      .map((line) => line.trim().slice(3).trim())
      .filter(Boolean),
  };
}

function runGit(args) {
  return runGitCapture(args).output;
}

function runGitCapture(args) {
  const result = spawnSync("git", ["-C", projectPath, ...args], { encoding: "utf8" });
  return {
    status: result.status === 0 ? "success" : "failed",
    output: redact(`${result.stdout || ""}${result.stderr || ""}`),
  };
}

function redact(value) {
  return value
    .split("\n")
    .map((line) => {
      const lowered = line.toLowerCase();
      return ["api_key=", "authorization: bearer", "password=", "private_key=", "-----begin", "sk-", "ghp_", "github_pat_"].some((needle) =>
        lowered.includes(needle),
      )
        ? "[redacted secret-like line]"
        : line;
    })
    .join("\n");
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function stableTextChecksum(text) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = (1n << 64n) - 1n;
  for (const byte of Buffer.from(text)) {
    hash ^= BigInt(byte);
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, "0");
}
