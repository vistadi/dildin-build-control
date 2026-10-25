import { parseProviders, providerProfile } from "./lib/providers.mjs";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const providersPath = path.join(dbcPath, "providers.yaml");
const mockPath = path.join(dbcPath, "providers.mock.yaml");
const realMicroPath = path.join(dbcPath, "providers.real-micro.yaml");
const backupDir = path.join(dbcPath, "providers.backups");
const action = process.argv[2] || "status";

mkdirSync(dbcPath, { recursive: true });

if (!existsSync(providersPath)) {
  console.error(`Missing ${providersPath}. Create or sync providers.yaml first.`);
  process.exit(1);
}

switch (action) {
  case "generate":
    generateProfiles();
    break;
  case "apply-real-micro":
    generateProfiles();
    ensureRealMicroApproval();
    applyProfile(realMicroPath, "real-micro");
    break;
  case "apply-mock":
    generateProfiles();
    applyProfile(mockPath, "mock");
    break;
  case "status":
    printStatus();
    break;
  default:
    console.error("Usage: node scripts/provider-profile.mjs [status|generate|apply-real-micro|apply-mock]");
    process.exit(1);
}

function generateProfiles() {
  const source = readFileSync(providersPath, "utf8");
  const generatedAt = String(Date.now());
  const mock = providerProfile(source, () => "mock", generatedAt);
  const realMicro = providerProfile(source,
    (id, current) => (["codex_cli", "claude_code", "local_terminal"].includes(id) ? "real" : current || "mock"), generatedAt);
  writeFileSync(mockPath, profileHeader("mock", generatedAt) + mock);
  writeFileSync(realMicroPath, profileHeader("real-micro", generatedAt) + realMicro);
  console.log(
    JSON.stringify(
      {
        generated: true,
        mockPath,
        realMicroPath,
      },
      null,
      2,
    ),
  );
}

function applyProfile(profilePath, name) {
  if (!existsSync(profilePath)) {
    console.error(`Missing profile ${profilePath}.`);
    process.exit(1);
  }
  mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `providers-${Date.now()}.yaml`);
  copyFileSync(providersPath, backupPath);
  copyFileSync(profilePath, providersPath);
  console.log(
    JSON.stringify(
      {
        applied: name,
        providersPath,
        backupPath,
        nextSteps: [
          "Run pnpm real-readiness.",
          "Open Settings and Load .dbc config.",
          "Run only REAL-MICRO-README through Preflight before broader real loops.",
        ],
      },
      null,
      2,
    ),
  );
}

function ensureRealMicroApproval() {
  const checklistPath = path.join(dbcPath, "operator", "latest.json");
  const approvalPath = path.join(dbcPath, "operator", "approval.json");
  const checklist = readJsonIfExists(checklistPath);
  const approval = readJsonIfExists(approvalPath);
  if (!checklist) {
    fail(`Refusing real-micro profile switch. Missing operator checklist: ${checklistPath}`);
  }
  if (checklist.kind !== "operator-checklist") {
    fail(`Refusing real-micro profile switch. Unexpected checklist kind: ${checklist.kind || "missing"}`);
  }
  if (Array.isArray(checklist.blockers) && checklist.blockers.length > 0) {
    fail(`Refusing real-micro profile switch. Operator checklist has ${checklist.blockers.length} blocker(s).`);
  }
  if (!["ready_to_start_real_micro", "real_profile_already_active"].includes(checklist.status)) {
    fail(`Refusing real-micro profile switch. Operator checklist status is ${checklist.status || "missing"}; approve the gate first.`);
  }
  if (!operatorApprovalMatches(approval, checklist)) {
    fail(`Refusing real-micro profile switch. Missing, stale, or mismatched approval: ${approvalPath}`);
  }
  const applyDecisionPath = path.join(dbcPath, "approvals", "decisions", "APPLY-REAL-MICRO-PROFILE.json");
  const applyDecision = readJsonIfExists(applyDecisionPath);
  if (applyDecision?.decision !== "approved") {
    fail(`Refusing real-micro profile switch. Missing approved ledger decision: ${applyDecisionPath}`);
  }
}

function operatorApprovalMatches(approval, checklist) {
  if (!approval?.approved) return false;
  const taskId = checklist.task?.id || "";
  const generatedAt = checklist.generatedAt || "";
  const budgetLimit = Number(checklist.budget?.budgetLimit ?? checklist.task?.budgetLimit ?? 0);
  return (
    approval.checklistGeneratedAt === generatedAt &&
    approval.taskId === taskId &&
    Math.abs(Number(approval.budgetLimit ?? -1) - budgetLimit) <= Number.EPSILON
  );
}

function printStatus() {
  const providers = parseProviders(readFileSync(providersPath, "utf8"));
  console.log(
    JSON.stringify(
      {
        providersPath,
        profiles: {
          mockPath: existsSync(mockPath) ? mockPath : "",
          realMicroPath: existsSync(realMicroPath) ? realMicroPath : "",
        },
        providers: providers.map((provider) => ({
          id: provider.id,
          name: provider.name,
          type: provider.type,
          runMode: provider.runMode || "mock",
          command: provider.command || "",
        })),
      },
      null,
      2,
    ),
  );
}

function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) return undefined;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function profileHeader(name, generatedAt) {
  return `# DBC provider profile: ${name}\n# Generated: ${generatedAt}\n# Apply explicitly with pnpm providers:apply-${name === "mock" ? "mock" : "real-micro"}.\n`;
}
