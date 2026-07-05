import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const approvalsDir = path.join(dbcPath, "approvals");
const decisionsDir = path.join(approvalsDir, "decisions");
mkdirSync(decisionsDir, { recursive: true });

const args = parseArgs(process.argv.slice(2));
const mode = args._[0] || "generate";

if (mode === "decide") {
  decide();
} else if (mode === "generate") {
  generate();
} else {
  console.error("Usage: pnpm approval-ledger -- generate | decide --id ID --decision approved|rejected|changes_requested [--note text]");
  process.exit(1);
}

function generate() {
  const records = buildRecords();
  const ledger = {
    version: 1,
    kind: "approval-ledger",
    generatedAt: String(Date.now()),
    projectPath,
    status: records.some((record) => record.status === "pending") ? "pending_approvals" : "clear",
    pending: records.filter((record) => record.status === "pending").length,
    records,
    refs: {
      operator: path.join(dbcPath, "operator", "latest.json"),
      realPlan: path.join(dbcPath, "real-loop", "latest.json"),
      comparison: path.join(dbcPath, "compare", "latest.json"),
      policy: path.join(dbcPath, "policy.yaml"),
    },
  };
  const jsonPath = path.join(approvalsDir, "latest.json");
  const markdownPath = path.join(approvalsDir, "latest.md");
  writeJson(jsonPath, ledger);
  writeFileSync(markdownPath, ledgerMarkdown(ledger));
  console.log(
    JSON.stringify(
      {
        status: ledger.status,
        pending: ledger.pending,
        jsonPath,
        markdownPath,
      },
      null,
      2,
    ),
  );
}

function decide() {
  const id = first(args.id);
  const decision = first(args.decision);
  if (!id || !["approved", "rejected", "changes_requested"].includes(decision)) {
    console.error("decide requires --id and --decision approved|rejected|changes_requested");
    process.exit(1);
  }
  const current = existsSync(path.join(approvalsDir, "latest.json"))
    ? readJson(path.join(approvalsDir, "latest.json"))
    : { records: buildRecords() };
  const record = current.records.find((item) => item.id === id);
  if (!record) {
    console.error(`Approval record not found: ${id}`);
    process.exit(1);
  }
  const decisionRecord = {
    version: 1,
    kind: "approval-decision",
    id,
    decision,
    decidedAt: String(Date.now()),
    note: first(args.note) || "",
    record,
  };
  const decisionPath = path.join(decisionsDir, `${sanitizeFileStem(id)}.json`);
  writeJson(decisionPath, decisionRecord);
  generate();
  console.log(JSON.stringify({ status: "decision_written", id, decision, decisionPath }, null, 2));
}

function buildRecords() {
  const operator = readJsonIfExists(path.join(dbcPath, "operator", "latest.json"));
  const operatorApproval = readJsonIfExists(path.join(dbcPath, "operator", "approval.json"));
  const realPlan = readJsonIfExists(path.join(dbcPath, "real-loop", "latest.json"));
  const comparison = readJsonIfExists(path.join(dbcPath, "compare", "latest.json"));
  const latestReport = findLatestAcceptanceReport();
  const latestWorkspace = latestReport?.refs?.gitWorkspacePath ? readJsonIfExists(latestReport.refs.gitWorkspacePath) : undefined;
  const records = [];

  if (operator?.kind === "operator-checklist") {
    const approved = operatorApprovalMatches(operatorApproval, operator);
    records.push(record({
      id: "REAL-MICRO-HUMAN-GATE",
      kind: "real_loop_gate",
      action: "Approve real micro loop gate",
      reason: operator.nextAction || "Real provider loop requires explicit human approval.",
      requester: "Operator Checklist",
      risk: "high",
      preview: `Task ${operator.task?.id || "unknown"}; budget ${operator.budget?.budgetLimit ?? "unknown"}; approval ${operator.approval?.status || "missing"}`,
      artifactPath: path.join(dbcPath, "operator", "latest.md"),
      status: approved ? "approved" : "pending",
      decisionPath: approved ? path.join(dbcPath, "operator", "approval.json") : "",
      decidedAt: approved ? operatorApproval.approvedAt || operatorApproval.decidedAt || "" : "",
    }));
  }

  if (realPlan?.status === "prepared") {
    records.push(record({
      id: "APPLY-REAL-MICRO-PROFILE",
      kind: "provider_mode_switch",
      action: "Switch selected providers to real micro profile",
      reason: "Provider mode switch may spend real model tokens and should be explicit.",
      requester: "Provider Manager",
      risk: "high",
      command: "pnpm providers:apply-real-micro",
      preview: `Task ${realPlan.task?.id || "unknown"}; real CLI call limit ${realPlan.execution?.budget?.realCliCallLimit ?? "unknown"}`,
      artifactPath: path.join(dbcPath, "real-loop", "latest.md"),
    }));
  }

  if (comparison?.status === "pending_real") {
    records.push(record({
      id: "RUN-REAL-MICRO-TASK",
      kind: "real_task_start",
      action: "Run REAL-MICRO-README through Preflight",
      reason: "First real loop should be limited to the staged micro task.",
      requester: "Loop Preflight",
      risk: "high",
      preview: "Run only after operator checklist is reviewed and provider profile is intentionally switched.",
      artifactPath: path.join(dbcPath, "compare", "latest.md"),
    }));
  }

  if (latestWorkspace) {
    records.push(record({
      id: `CREATE-BRANCH-${latestWorkspace.taskId || "TASK"}`,
      kind: "git_branch",
      action: "Create suggested task branch",
      reason: "Branch creation is manual so the operator can inspect workspace state first.",
      requester: "Git Workspace",
      risk: latestWorkspace.isGitRepo ? "medium" : "low",
      command: latestWorkspace.manualCommands?.createTaskBranch || "",
      preview: `Current branch ${latestWorkspace.currentBranch}; suggested ${latestWorkspace.suggestedTaskBranch}`,
      artifactPath: latestWorkspace.artifacts?.workspacePath || "",
      optional: true,
    }));
    records.push(record({
      id: `STAGE-ALLOWED-${latestWorkspace.taskId || "TASK"}`,
      kind: "git_stage",
      action: "Stage allowed task paths",
      reason: "Staging is manual and limited to task allowedPaths.",
      requester: "Git Workspace",
      risk: "medium",
      command: latestWorkspace.manualCommands?.stageAllowed || "",
      preview: `Changed files: ${(latestWorkspace.changedFiles || []).join(", ") || "none"}`,
      artifactPath: latestWorkspace.artifacts?.workspacePath || "",
      optional: true,
    }));
    records.push(record({
      id: `COMMIT-${latestWorkspace.taskId || "TASK"}`,
      kind: "git_commit",
      action: "Create local commit",
      reason: "Commit remains a human action after inspecting diff artifacts.",
      requester: "Git Workspace",
      risk: "medium",
      command: latestWorkspace.manualCommands?.commit || "",
      preview: `Diff: ${latestWorkspace.artifacts?.diffPath || "missing"}`,
      artifactPath: latestWorkspace.artifacts?.workspacePath || "",
      optional: true,
    }));
  }

  const scopeGate = latestReport?.scopeGate || latestReport?.task?.scopeGate;
  if (scopeGate && (!scopeGate.passed || (scopeGate.outsideAllowed || []).length || (scopeGate.deniedMatches || []).length)) {
    records.push(record({
      id: `SCOPE-EXPANSION-${latestReport.loopId || "LOOP"}`,
      kind: "scope_expansion",
      action: "Review scope expansion",
      reason: "Changed files exceed allowedPaths or touch deniedPaths.",
      requester: "Scope Gate",
      risk: "critical",
      preview: `outsideAllowed=${JSON.stringify(scopeGate.outsideAllowed || [])}; deniedMatches=${JSON.stringify(scopeGate.deniedMatches || [])}`,
      artifactPath: latestReport.refs?.reportMarkdownPath || "",
    }));
  }

  for (const command of policyApprovalCommands()) {
    records.push(record({
      id: `COMMAND-${sanitizeFileStem(command).toUpperCase()}`,
      kind: "command_template",
      action: `Command requires approval: ${command}`,
      reason: "Command policy marks this command pattern as approval_required.",
      requester: "Command Policy",
      risk: commandRisk(command),
      command,
      preview: "Template approval record; approve concrete commands only after inspecting task context.",
      artifactPath: path.join(dbcPath, "policy.yaml"),
      optional: true,
      status: "template",
    }));
  }

  return records.map(applyDecision).sort((a, b) => statusRank(a.status) - statusRank(b.status) || a.id.localeCompare(b.id));
}

function record(value) {
  return {
    version: 1,
    id: value.id,
    kind: value.kind,
    action: value.action,
    reason: value.reason,
    requester: value.requester,
    risk: value.risk,
    command: value.command || "",
    preview: value.preview || "",
    artifactPath: value.artifactPath || "",
    decisionPath: value.decisionPath || "",
    decidedAt: value.decidedAt || "",
    optional: Boolean(value.optional),
    status: value.status || (value.optional ? "template" : "pending"),
    createdAt: String(Date.now()),
  };
}

function applyDecision(item) {
  const decision = readJsonIfExists(path.join(decisionsDir, `${sanitizeFileStem(item.id)}.json`));
  if (!decision) return item;
  return {
    ...item,
    status: decision.decision,
    decidedAt: decision.decidedAt,
    decisionPath: path.join(decisionsDir, `${sanitizeFileStem(item.id)}.json`),
    note: decision.note || "",
  };
}

function policyApprovalCommands() {
  const text = readText(path.join(dbcPath, "policy.yaml"));
  const match = text.match(/approvalRequired:\n([\s\S]*?)(?:\n[a-zA-Z]+:|$)/);
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

function commandRisk(command) {
  const lowered = command.toLowerCase();
  if (["reset", "clean", "sudo", "publish", "deploy", "terraform", "kubectl"].some((item) => lowered.includes(item))) return "critical";
  if (["push", "ssh", "curl", "wget", "docker"].some((item) => lowered.includes(item))) return "high";
  return "medium";
}

function findLatestAcceptanceReport() {
  const reportsDir = path.join(dbcPath, "reports");
  if (!existsSync(reportsDir)) return undefined;
  return readdirSync(reportsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(reportsDir, file))
    .map((filePath) => ({ path: filePath, report: readJsonIfExists(filePath), mtime: statSync(filePath).mtimeMs }))
    .filter((item) => item.report?.kind === "acceptance-package")
    .sort((a, b) => b.mtime - a.mtime)[0]?.report;
}

function operatorApprovalMatches(approval, checklist) {
  if (!approval?.approved) return false;
  const generatedAt = checklist.generatedAt || "";
  const taskId = checklist.task?.id || "";
  const budgetLimit = Number(checklist.budget?.budgetLimit ?? checklist.task?.budgetLimit ?? 0);
  return (
    approval.checklistGeneratedAt === generatedAt &&
    approval.taskId === taskId &&
    Math.abs(Number(approval.budgetLimit ?? -1) - budgetLimit) <= Number.EPSILON
  );
}

function parseArgs(items) {
  const result = { _: [] };
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item.startsWith("--")) {
      result._.push(item);
      continue;
    }
    const key = item.slice(2);
    const value = items[index + 1]?.startsWith("--") || items[index + 1] === undefined ? "true" : items[++index];
    result[key] = [...(result[key] || []), value];
  }
  return result;
}

function first(value) {
  return Array.isArray(value) ? value[0] : undefined;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function readJsonIfExists(filePath) {
  return filePath && existsSync(filePath) ? readJson(filePath) : undefined;
}

function readText(filePath) {
  return filePath && existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sanitizeFileStem(value) {
  return String(value).replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 140) || "approval";
}

function statusRank(status) {
  return { pending: 0, approved: 1, changes_requested: 2, rejected: 3, template: 4 }[status] ?? 5;
}

function ledgerMarkdown(ledger) {
  return [
    "# Approval Ledger",
    "",
    `Status: ${ledger.status}`,
    `Pending: ${ledger.pending}`,
    `Generated: ${ledger.generatedAt}`,
    "",
    "## Records",
    ...ledger.records.flatMap((record) => [
      `- ${record.id}: ${record.status} [${record.kind}] ${record.action}`,
      `  - Risk: ${record.risk}`,
      record.command ? `  - Command: ${record.command}` : "",
      record.artifactPath ? `  - Artifact: ${record.artifactPath}` : "",
      `  - Reason: ${record.reason}`,
    ].filter(Boolean)),
    "",
    "## CLI",
    "```bash",
    "pnpm approval-ledger -- generate",
    "pnpm approval-ledger -- decide --id REAL-MICRO-HUMAN-GATE --decision approved --note \"Reviewed checklist\"",
    "```",
    "",
  ].join("\n");
}
