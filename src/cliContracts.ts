import type { Provider } from "./types";

export const CODEX_EXEC_ARGS = 'exec --skip-git-repo-check --sandbox workspace-write --cd "{{cwd}}"';
export const CLAUDE_PRINT_ARGS = "-p";

export function parseArgsTemplate(template: string, prompt: string, cwd = "") {
  const tokens = template.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  return tokens.map((token) =>
    token.replace(/^["']|["']$/g, "").replace(/\{\{prompt\}\}/g, prompt).replace(/\{\{cwd\}\}/g, cwd),
  );
}

export function normalizeProviderConfig(provider: Provider): Provider {
  const argsTemplate = normalizeCliArgsTemplate(provider.command, provider.argsTemplate);
  return {
    ...provider,
    argsTemplate,
    promptMode: normalizeCliPromptMode(provider.command, argsTemplate, provider.promptMode),
  };
}

export function buildProviderRunContract(provider: Provider, prompt: string, cwd: string) {
  const normalized = normalizeProviderConfig(provider);
  const args = normalizeCliArgs(
    normalized.command,
    parseArgsTemplate(normalized.argsTemplate, normalized.promptMode === "arg" ? prompt : "", cwd),
  );
  return {
    args,
    prompt: normalized.promptMode === "arg" ? "" : prompt,
    promptMode: normalized.promptMode,
  };
}

export function normalizeCliArgsTemplate(command: string, template: string) {
  const trimmed = template.trim();
  if (
    isCodexCommand(command) &&
    (!trimmed ||
      trimmed.includes("--ask-for-approval") ||
      trimmed.includes("{{cwd}} -") ||
      trimmed.includes("--cd {{cwd}}") ||
      trimmed.endsWith(" -"))
  ) {
    return CODEX_EXEC_ARGS;
  }
  if (isClaudeCommand(command) && !trimmed) {
    return CLAUDE_PRINT_ARGS;
  }
  return template;
}

export function normalizeCliPromptMode(command: string, argsTemplate: string, promptMode: Provider["promptMode"]) {
  if (promptMode === "terminal") {
    return "terminal";
  }
  const normalizedTemplate = normalizeCliArgsTemplate(command, argsTemplate);
  if (isCodexCommand(command) && !normalizedTemplate.includes("{{prompt}}")) {
    return "stdin";
  }
  if (isClaudeCommand(command) && !normalizedTemplate.includes("{{prompt}}")) {
    return "stdin";
  }
  return promptMode;
}

export function normalizeCliArgs(command: string, args: string[]) {
  if (!isCodexCommand(command) && !isClaudeCommand(command)) {
    return args;
  }

  const normalized: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (isCodexCommand(command) && (arg === "--ask-for-approval" || arg === "-a")) {
      index += index + 1 < args.length ? 1 : 0;
      continue;
    }
    if (arg === "-") {
      continue;
    }
    normalized.push(arg);
  }
  return normalized;
}

export function providerContractDiagnostics(provider: Provider) {
  const normalized = normalizeProviderConfig(provider);
  const warnings: string[] = [];
  if (normalized.argsTemplate !== provider.argsTemplate) {
    warnings.push(`args normalized to: ${normalized.argsTemplate}`);
  }
  if (normalized.promptMode !== provider.promptMode) {
    warnings.push(`prompt mode normalized to: ${normalized.promptMode}`);
  }
  if (normalized.promptMode === "terminal") {
    warnings.push("terminal mode requires a human-operated interactive terminal; DBC will not run it through stdin.");
    return warnings;
  }
  if (isCodexCommand(provider.command) && !normalized.argsTemplate.trim().startsWith("exec")) {
    warnings.push("Codex should use non-interactive `exec` mode.");
  }
  if (isClaudeCommand(provider.command) && !parseArgsTemplate(normalized.argsTemplate, "", "").some((arg) => arg === "-p" || arg === "--print")) {
    warnings.push("Claude Code should use `-p` or `--print` for non-interactive runs.");
  }
  return warnings;
}

function isCodexCommand(command: string) {
  return commandName(command) === "codex";
}

function isClaudeCommand(command: string) {
  return commandName(command) === "claude";
}

function commandName(command: string) {
  const normalized = command.trim().replace(/\\/g, "/");
  const fileName = normalized.split("/").filter(Boolean).pop() ?? normalized;
  return fileName.replace(/\.(cmd|exe|bat)$/i, "").toLowerCase();
}
