import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const CONFIRM_PHRASE = "I APPROVE REAL MICRO LOOP";
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const confirmIndex = args.indexOf("--confirm");
const confirmation = confirmIndex >= 0 ? args[confirmIndex + 1] || "" : "";

const projectPath = process.cwd();
const operatorDir = path.join(projectPath, ".dbc", "operator");
const decisionsDir = path.join(projectPath, ".dbc", "approvals", "decisions");
const checklistPath = path.join(operatorDir, "latest.json");
const approvalPath = path.join(operatorDir, "approval.json");

const checklist = readJson(checklistPath);
if (!checklist) {
  fail(`Missing operator checklist: ${checklistPath}`);
}
if (checklist.kind !== "operator-checklist") {
  fail(`Unexpected checklist kind: ${checklist.kind || "missing"}`);
}
if (Array.isArray(checklist.blockers) && checklist.blockers.length > 0) {
  fail(`Checklist has ${checklist.blockers.length} blocker(s). Refusing approval.`);
}
if (checklist.status === "blocked") {
  fail("Checklist status is blocked. Refusing approval.");
}

const taskId = checklist.task?.id || "";
const budgetLimit = checklist.budget?.budgetLimit ?? 0;
const generatedAt = checklist.generatedAt || "";
if (!taskId || !generatedAt) {
  fail("Checklist is missing task id or generatedAt.");
}
if (!(budgetLimit > 0)) {
  fail(`Checklist budgetLimit must be positive for real CLI approval. Current: ${budgetLimit}`);
}

const approval = {
  version: 1,
  kind: "operator-approval",
  approved: true,
  approvedAt: String(Date.now()),
  approvedBy: "local-operator",
  projectPath,
  checklistPath,
  checklistGeneratedAt: generatedAt,
  taskId,
  budgetLimit,
  realCliCallLimit: realProviderCallLimit(budgetLimit),
  confirmations: checklist.humanConfirmations || [],
};

const summary = {
  dryRun,
  approvalPath,
  checklistPath,
  checklistGeneratedAt: generatedAt,
  taskId,
  budgetLimit,
  realCliCallLimit: approval.realCliCallLimit,
  statusBeforeApproval: checklist.status,
  requiredConfirmPhrase: CONFIRM_PHRASE,
  approvalDecisionIds: ["REAL-MICRO-HUMAN-GATE", "APPLY-REAL-MICRO-PROFILE", "RUN-REAL-MICRO-TASK"],
};

if (dryRun) {
  console.log(JSON.stringify({ ...summary, wouldWrite: approval }, null, 2));
  process.exit(0);
}

if (confirmation !== CONFIRM_PHRASE) {
  fail(`Refusing approval. Re-run with --confirm "${CONFIRM_PHRASE}" after reviewing .dbc/operator/latest.md.`);
}

mkdirSync(operatorDir, { recursive: true });
mkdirSync(decisionsDir, { recursive: true });
writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`);
writeApprovalDecision("REAL-MICRO-HUMAN-GATE", "Approve real micro loop gate", approval);
writeApprovalDecision("APPLY-REAL-MICRO-PROFILE", "Switch selected providers to real micro profile", approval);
writeApprovalDecision("RUN-REAL-MICRO-TASK", "Run REAL-MICRO-README through Preflight", approval);

checklist.status = "ready_to_start_real_micro";
checklist.nextAction = "Apply real micro mode, then run only REAL-MICRO-README through Preflight.";
checklist.approval = {
  status: "approved",
  path: approvalPath,
  approved: true,
  approvedAt: approval.approvedAt,
};
writeFileSync(checklistPath, `${JSON.stringify(checklist, null, 2)}\n`);

console.log(JSON.stringify({ ...summary, approved: true }, null, 2));

function readJson(filePath) {
  if (!existsSync(filePath)) return undefined;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function realProviderCallLimit(budgetLimit) {
  return budgetLimit > 0 ? Math.max(1, Math.ceil(budgetLimit)) * 4 : 0;
}

function writeApprovalDecision(id, action, approval) {
  const decisionPath = path.join(decisionsDir, `${sanitizeFileStem(id)}.json`);
  const decision = {
    version: 1,
    kind: "approval-decision",
    id,
    decision: "approved",
    decidedAt: approval.approvedAt,
    note: "Approved through operator gate.",
    operatorApprovalPath: approvalPath,
    record: {
      id,
      action,
      requester: "Operator Checklist",
      risk: "high",
      status: "pending",
      artifactPath: checklistPath,
    },
  };
  writeFileSync(decisionPath, `${JSON.stringify(decision, null, 2)}\n`);
}

function sanitizeFileStem(value) {
  return String(value).replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 140) || "approval";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
