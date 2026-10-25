import { readFileSync } from "node:fs";

export function loadMicroTask(defaultTask, args) {
  const index = args.indexOf("--task-file");
  const task = index < 0 ? defaultTask : JSON.parse(readFileSync(args[index + 1], "utf8"));
  const artifactPaths = ["tasks", "loops", "evidence", "artifacts", "reports", "security", "git"].map(name => `.dbc/${name}`);
  const allowed = new Set(["README.md", ...artifactPaths]);
  if (task.version !== 1 || task.id !== "REAL-MICRO-README" || task.loopProfile !== "real_micro" ||
      task.providerStrategy !== "codex_build_claude_review" || !Number.isFinite(task.budgetLimit) || task.budgetLimit <= 0 ||
      typeof task.brief !== "string" || !task.brief.trim() || typeof task.title !== "string" || !task.title.trim()) {
    throw new Error("Invalid real micro task identity, provider strategy, brief or positive finite budget.");
  }
  for (const key of ["criteria", "constraints", "stopConditions", "allowedPaths", "deniedPaths"]) {
    if (!Array.isArray(task[key]) || !task[key].length || task[key].some(item => typeof item !== "string" || !item.trim())) {
      throw new Error(`Real micro task requires non-empty ${key}.`);
    }
  }
  if (!task.allowedPaths.includes("README.md") || task.allowedPaths.some(item => !allowed.has(item)) || !task.deniedPaths.includes(".env")) {
    throw new Error("Real micro scope is limited to README.md and generated evidence; .env must remain denied.");
  }
  return { ...task, updatedAt: String(Date.now()) };
}
