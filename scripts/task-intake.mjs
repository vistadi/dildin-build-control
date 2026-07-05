import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const args = parseArgs(process.argv.slice(2));
const title = first(args.title);
const brief = first(args.brief);

if (args.help || !title || !brief) {
  console.log(usage());
  process.exit(title && brief ? 0 : 1);
}

const taskId = first(args.id) || taskIdFromTitle(title);
const affectedPaths = values(args.affected, args.path);
const allowedPaths = values(args.allowed);
const deniedPaths = values(args.denied);
const task = {
  version: 1,
  id: taskId,
  title,
  brief,
  criteria: values(args.criteria).length ? values(args.criteria) : ["Build passes", "Tests pass", "Acceptance report contains evidence"],
  constraints: values(args.constraints).length ? values(args.constraints) : ["Respect command policy", "Keep changes inside allowed paths"],
  budgetLimit: numberArg(args.budget, 1),
  status: first(args.status) || "ready",
  risk: first(args.risk) || "medium",
  priority: first(args.priority) || "normal",
  loopProfile: first(args.profile) || "mock",
  providerStrategy: first(args.strategy) || "codex_build_claude_review",
  affectedPaths,
  allowedPaths: allowedPaths.length ? allowedPaths : affectedPaths,
  deniedPaths: deniedPaths.length ? deniedPaths : [".env", "node_modules", "src-tauri/target"],
  requiredReviewers: values(args.reviewer, args.reviewers).length ? values(args.reviewer, args.reviewers) : ["Reviewer", "Security", "Product Owner"],
  stopConditions: values(args.stop).length
    ? values(args.stop)
    : [
        "Stop if command policy returns approval_required or deny.",
        "Stop if changes expand outside allowed paths.",
        "Stop if acceptance evidence is missing.",
      ],
  updatedAt: String(Date.now()),
};

const tasksDir = path.join(projectPath, ".dbc", "tasks");
mkdirSync(tasksDir, { recursive: true });
const taskPath = path.join(tasksDir, `${sanitizeFileStem(task.id)}.json`);
writeJson(taskPath, task);

const markdownPath = path.join(tasksDir, `${sanitizeFileStem(task.id)}.md`);
writeFileSync(markdownPath, taskMarkdown(task, taskPath));

console.log(
  JSON.stringify(
    {
      status: "created",
      id: task.id,
      path: taskPath,
      markdownPath,
      checksum: stableTextChecksum(JSON.stringify(task, null, 2)),
      nextAction: "Open the app or run project recovery; then start this task through Preflight.",
    },
    null,
    2,
  ),
);

function parseArgs(items) {
  const result = {};
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    if (key === "help") {
      result.help = ["true"];
      continue;
    }
    const value = items[index + 1]?.startsWith("--") || items[index + 1] === undefined ? "true" : items[++index];
    result[key] = [...(result[key] || []), value];
  }
  return result;
}

function first(value) {
  return Array.isArray(value) ? value[0] : undefined;
}

function values(...groups) {
  return groups
    .flatMap((group) => (Array.isArray(group) ? group : []))
    .flatMap((value) => String(value).split(/\n|;/))
    .map((value) => value.trim())
    .filter(Boolean);
}

function numberArg(value, fallback) {
  const parsed = Number(first(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function taskIdFromTitle(value) {
  const slug = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return `TASK-${slug || "ITEM"}-${Date.now().toString(36).toUpperCase()}`;
}

function sanitizeFileStem(value) {
  return String(value).replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120) || "task";
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function stableTextChecksum(text) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (const char of text) {
    hash ^= BigInt(char.codePointAt(0));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
}

function taskMarkdown(task, taskPath) {
  return [
    `# ${task.id}: ${task.title}`,
    "",
    `Spec: ${taskPath}`,
    `Status: ${task.status}`,
    `Risk: ${task.risk}`,
    `Priority: ${task.priority}`,
    `Loop profile: ${task.loopProfile}`,
    `Provider strategy: ${task.providerStrategy}`,
    `Budget: ${task.budgetLimit}`,
    "",
    "## Brief",
    task.brief,
    "",
    "## Acceptance",
    ...task.criteria.map((item) => `- ${item}`),
    "",
    "## Constraints",
    ...task.constraints.map((item) => `- ${item}`),
    "",
    "## Scope",
    ...task.allowedPaths.map((item) => `- allow: ${item}`),
    ...task.deniedPaths.map((item) => `- deny: ${item}`),
    "",
    "## Stop Conditions",
    ...task.stopConditions.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

function usage() {
  return [
    "Usage:",
    "  pnpm task-intake -- --title \"Task title\" --brief \"What to build\" [options]",
    "",
    "Options:",
    "  --criteria, --constraints, --affected, --allowed, --denied, --reviewer, --stop may be repeated.",
    "  --budget 1 --risk low|medium|high|critical --priority low|normal|high|urgent",
    "  --profile mock|controlled_smoke|real_micro --strategy codex_build_claude_review|codex_only|claude_review_only|mock_only",
  ].join("\n");
}
