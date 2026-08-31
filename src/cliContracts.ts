import type { Provider } from "./types";
import { adapterForCommand } from "./providerAdapters";

export const CODEX_EXEC_ARGS = 'exec --skip-git-repo-check --sandbox workspace-write --cd "{{cwd}}"';
export const CLAUDE_PRINT_ARGS = "-p";
export const KIMI_PRINT_ARGS = '-p "{{prompt}}" --output-format stream-json --plan';
export const QWEN_HEADLESS_ARGS =
  '-p "{{prompt}}" --output-format stream-json --approval-mode plan --safe-mode --max-tool-calls 0 --max-session-turns 3 --max-wall-time 120s';

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
  const adapter = adapterForCommand(command);
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
  if (
    (isKimiCommand(command) || isQwenCommand(command)) &&
    (!trimmed || (isKimiCommand(command) && trimmed.includes("--final-message-only")))
  ) {
    return adapter.defaultArgsTemplate;
  }
  if (isQwenCommand(command)) {
    return normalizeQwenSafetyArgs(trimmed);
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
  if ((isKimiCommand(command) || isQwenCommand(command)) && normalizedTemplate.includes("{{prompt}}")) return "arg";
  return promptMode;
}

export function normalizeCliArgs(command: string, args: string[]) {
  if (!isCodexCommand(command) && !isClaudeCommand(command) && !isQwenCommand(command)) {
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
    if (isQwenCommand(command) && (arg === "--yolo" || arg === "-y")) {
      continue;
    }
    if (isQwenCommand(command) && arg === "--approval-mode") {
      normalized.push("--approval-mode", "plan");
      index += 1;
      continue;
    }
    if (isQwenCommand(command) && arg.startsWith("--approval-mode=")) {
      normalized.push("--approval-mode=plan");
      continue;
    }
    if (isQwenCommand(command) && arg === "--max-tool-calls") {
      normalized.push("--max-tool-calls", "0");
      index += index + 1 < args.length ? 1 : 0;
      continue;
    }
    if (isQwenCommand(command) && arg.startsWith("--max-tool-calls=")) {
      normalized.push("--max-tool-calls=0");
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
  if (isKimiCommand(provider.command)) {
    const args = parseArgsTemplate(normalized.argsTemplate, "DBC probe", "");
    if (!args.some((arg) => arg === "-p" || arg === "--prompt")) {
      warnings.push("Kimi Code should use `-p` or `--prompt` for non-interactive runs.");
    }
    warnings.push("Kimi print mode auto-approves internal tool calls; keep MCP/tool access disabled until the DBC policy proxy is active.");
  }
  if (isQwenCommand(provider.command)) {
    if (/\s(?:--yolo|-y)(?:\s|$)|--approval-mode\s+yolo/.test(provider.argsTemplate)) {
      warnings.push("Unsafe Qwen auto-approval arguments were normalized to approval mode `plan`.");
    }
    if (!parseArgsTemplate(normalized.argsTemplate, "", "").includes("--output-format")) {
      warnings.push("Qwen Code should use structured output for non-interactive runs.");
    }
    if (!normalized.argsTemplate.includes("--safe-mode") || !normalized.argsTemplate.includes("--max-tool-calls 0")) {
      warnings.push("Qwen read-only profile should use safe mode and a zero tool-call budget.");
    }
  }
  return warnings;
}

function isCodexCommand(command: string) {
  return commandName(command) === "codex";
}

function isClaudeCommand(command: string) {
  return commandName(command) === "claude";
}

function isKimiCommand(command: string) {
  return commandName(command) === "kimi";
}

function isQwenCommand(command: string) {
  return commandName(command) === "qwen";
}

function normalizeQwenSafetyArgs(template: string) {
  const tokens = parseArgsTemplate(template, "", "");
  const normalized: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--yolo" || token === "-y") continue;
    if (token === "--approval-mode") {
      normalized.push("--approval-mode", "plan");
      index += 1;
      continue;
    }
    if (token.startsWith("--approval-mode=")) {
      normalized.push("--approval-mode=plan");
      continue;
    }
    if (token === "--max-tool-calls") {
      normalized.push("--max-tool-calls", "0");
      index += index + 1 < tokens.length ? 1 : 0;
      continue;
    }
    if (token.startsWith("--max-tool-calls=")) {
      normalized.push("--max-tool-calls=0");
      continue;
    }
    normalized.push(token);
  }
  if (!normalized.some((token) => token === "--approval-mode" || token.startsWith("--approval-mode="))) {
    normalized.push("--approval-mode", "plan");
  }
  if (!normalized.includes("--safe-mode")) normalized.push("--safe-mode");
  if (!normalized.some((token) => token === "--max-tool-calls" || token.startsWith("--max-tool-calls="))) {
    normalized.push("--max-tool-calls", "0");
  }
  if (!normalized.includes("--max-session-turns")) normalized.push("--max-session-turns", "3");
  if (!normalized.includes("--max-wall-time")) normalized.push("--max-wall-time", "120s");
  return normalized.join(" ");
}

function commandName(command: string) {
  const normalized = command.trim().replace(/\\/g, "/");
  const fileName = normalized.split("/").filter(Boolean).pop() ?? normalized;
  return fileName.replace(/\.(cmd|exe|bat)$/i, "").toLowerCase();
}
