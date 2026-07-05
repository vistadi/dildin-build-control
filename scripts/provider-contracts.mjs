import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const providersPath = path.join(dbcPath, "providers.yaml");
const outputDir = path.join(dbcPath, "provider-contracts");
mkdirSync(outputDir, { recursive: true });

if (!existsSync(providersPath)) {
  console.error(`Missing ${providersPath}. Sync .dbc config first.`);
  process.exit(1);
}

const providers = parseProviders(readFileSync(providersPath, "utf8"));
const records = providers.map(checkProviderContract);
const blockers = records.flatMap((record) => record.diagnostics.filter((item) => item.level === "error").map((item) => ({
  providerId: record.id,
  subject: item.subject,
  detail: item.detail,
})));
const warnings = records.flatMap((record) => record.diagnostics.filter((item) => item.level === "warning").map((item) => ({
  providerId: record.id,
  subject: item.subject,
  detail: item.detail,
})));

const report = {
  version: 1,
  kind: "provider-contracts",
  generatedAt: String(Date.now()),
  projectPath,
  providersPath,
  status: blockers.length ? "blocked" : warnings.length ? "warning" : "ok",
  blockers,
  warnings,
  records,
  refs: {
    providersPath,
  },
};

const jsonPath = path.join(outputDir, "latest.json");
const markdownPath = path.join(outputDir, "latest.md");
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(markdownPath, markdown(report));

console.log(
  JSON.stringify(
    {
      status: report.status,
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

function checkProviderContract(provider) {
  const command = provider.command || "";
  const normalizedArgsTemplate = normalizeArgsTemplate(command, provider.argsTemplate || "");
  const promptMode = normalizePromptMode(command, normalizedArgsTemplate, provider.promptMode || "stdin");
  const effectiveArgs = normalizeCliArgs(command, parseArgsTemplate(normalizedArgsTemplate, "DBC provider contract probe. Do not call a model.", projectPath));
  const diagnostics = [];
  const resolvedCommand = resolveCommand(command);
  const providerKind = providerKindFromCommand(command);

  if (provider.type === "mock") {
    ok(diagnostics, "provider-kind", "Built-in mock provider does not require an external CLI contract.");
    return record(provider, providerKind, resolvedCommand, normalizedArgsTemplate, promptMode, effectiveArgs, diagnostics);
  }

  if (provider.type === "local_runner") {
    ok(diagnostics, "provider-kind", "Local runner is internal and does not require an external CLI contract.");
    return record(provider, providerKind, resolvedCommand, normalizedArgsTemplate, promptMode, effectiveArgs, diagnostics);
  }

  if (provider.enabled !== "true") {
    warn(diagnostics, "enabled", "Provider is disabled; contract is informational.");
  } else {
    ok(diagnostics, "enabled", "Provider is enabled.");
  }

  if (!command.trim()) {
    error(diagnostics, "command", "Command is empty.");
    return record(provider, providerKind, resolvedCommand, normalizedArgsTemplate, promptMode, effectiveArgs, diagnostics);
  }

  if (resolvedCommand) {
    ok(diagnostics, "command", `Resolved executable: ${resolvedCommand}`);
  } else {
    error(diagnostics, "command", `Command was not found on this machine: ${command}`);
  }

  if (!isExactPath(command)) {
    warn(diagnostics, "portability", "Command is PATH-based; save an exact resolved path before moving this project to another machine.");
  }

  if (normalizedArgsTemplate !== (provider.argsTemplate || "")) {
    warn(diagnostics, "args-template", `Normalized legacy args to: ${normalizedArgsTemplate}`);
  }

  if (effectiveArgs.some((arg) => ["--ask-for-approval", "-a", "-"].includes(arg))) {
    error(diagnostics, "args-template", "Effective args still contain unsupported legacy flags.");
  } else {
    ok(diagnostics, "args-template", `Effective args: ${effectiveArgs.join(" ") || "(empty)"}`);
  }

  if (providerKind === "codex") {
    checkCodex(provider, resolvedCommand, normalizedArgsTemplate, promptMode, diagnostics);
  } else if (providerKind === "claude") {
    checkClaude(provider, resolvedCommand, normalizedArgsTemplate, promptMode, diagnostics);
  } else {
    warn(diagnostics, "provider-kind", "Generic CLI provider; DBC can only validate resolution and argument shape.");
  }

  return record(provider, providerKind, resolvedCommand, normalizedArgsTemplate, promptMode, effectiveArgs, diagnostics);
}

function checkCodex(provider, resolvedCommand, argsTemplate, promptMode, diagnostics) {
  if (promptMode === "terminal") {
    warn(diagnostics, "terminal-contract", "Terminal mode requires a human-operated interactive terminal; DBC will not auto-run this provider through stdin.");
    const version = resolvedCommand ? run(resolvedCommand, splitCommandLine(provider.versionArgs || "--version")) : null;
    if (version?.status === 0) ok(diagnostics, "version", trim(version.output, 500));
    else if (version) warn(diagnostics, "version", `Version probe failed: ${trim(version.output, 500)}`);
    return;
  }
  if (!argsTemplate.trim().startsWith("exec")) {
    error(diagnostics, "codex-contract", "Codex must use `exec` for non-interactive loop runs.");
  }
  if (!argsTemplate.includes("--cd") || !argsTemplate.includes("--sandbox")) {
    error(diagnostics, "codex-contract", "Codex args must include `--cd` and `--sandbox`.");
  }
  if (promptMode !== "stdin" && !argsTemplate.includes("{{prompt}}")) {
    error(diagnostics, "codex-contract", "Codex prompt mode must be stdin unless args contain `{{prompt}}`.");
  }
  if (!resolvedCommand) return;
  const help = run(resolvedCommand, ["exec", "--help"]);
  if (help.status === 0 && includesAll(help.output, ["Usage: codex exec", "--cd", "--sandbox"])) {
    ok(diagnostics, "codex-contract", "Installed Codex CLI exposes non-interactive `codex exec` with --cd and --sandbox.");
  } else {
    error(diagnostics, "codex-contract", "Installed Codex CLI did not expose the expected `codex exec` help contract.");
  }
  const version = run(resolvedCommand, splitCommandLine(provider.versionArgs || "--version"));
  if (version.status === 0) ok(diagnostics, "version", trim(version.output, 500));
  else warn(diagnostics, "version", `Version probe failed: ${trim(version.output, 500)}`);
}

function checkClaude(provider, resolvedCommand, argsTemplate, promptMode, diagnostics) {
  if (promptMode === "terminal") {
    warn(diagnostics, "terminal-contract", "Terminal mode requires a human-operated interactive terminal; DBC will not auto-run this provider through stdin.");
    const version = resolvedCommand ? run(resolvedCommand, splitCommandLine(provider.versionArgs || "--version")) : null;
    if (version?.status === 0) ok(diagnostics, "version", trim(version.output, 500));
    else if (version) warn(diagnostics, "version", `Version probe failed: ${trim(version.output, 500)}`);
    return;
  }
  const args = splitCommandLine(argsTemplate);
  if (!args.some((arg) => arg === "-p" || arg === "--print")) {
    error(diagnostics, "claude-contract", "Claude Code must use `-p` or `--print` for non-interactive loop runs.");
  }
  if (promptMode !== "stdin" && !argsTemplate.includes("{{prompt}}")) {
    error(diagnostics, "claude-contract", "Claude prompt mode must be stdin unless args contain `{{prompt}}`.");
  }
  if (!resolvedCommand) return;
  const help = run(resolvedCommand, ["--help"]);
  if (help.status === 0 && includesAll(help.output, ["--print", "non-interactive"])) {
    ok(diagnostics, "claude-contract", "Installed Claude Code exposes non-interactive print mode.");
  } else {
    error(diagnostics, "claude-contract", "Installed Claude Code did not expose the expected `-p/--print` help contract.");
  }
  const version = run(resolvedCommand, splitCommandLine(provider.versionArgs || "--version"));
  if (version.status === 0) ok(diagnostics, "version", trim(version.output, 500));
  else warn(diagnostics, "version", `Version probe failed: ${trim(version.output, 500)}`);
}

function record(provider, providerKind, resolvedCommand, normalizedArgsTemplate, promptMode, effectiveArgs, diagnostics) {
  return {
    id: provider.id,
    name: provider.name || provider.id,
    type: provider.type || "cli",
    enabled: provider.enabled === "true",
    runMode: provider.runMode || "mock",
    providerKind,
    command: provider.command || "",
    resolvedCommand,
    exactPath: isExactPath(provider.command || ""),
    argsTemplate: provider.argsTemplate || "",
    normalizedArgsTemplate,
    promptMode,
    effectiveArgs,
    status: diagnostics.some((item) => item.level === "error")
      ? "failed"
      : diagnostics.some((item) => item.level === "warning")
        ? "warning"
        : "ok",
    diagnostics,
  };
}

function normalizeArgsTemplate(command, template) {
  const trimmed = template.trim();
  if (
    isCodexCommand(command) &&
    (!trimmed ||
      trimmed.includes("--ask-for-approval") ||
      trimmed.includes("{{cwd}} -") ||
      trimmed.includes("--cd {{cwd}}") ||
      trimmed.endsWith(" -"))
  ) {
    return 'exec --skip-git-repo-check --sandbox workspace-write --cd "{{cwd}}"';
  }
  if (isClaudeCommand(command) && !trimmed) {
    return "-p";
  }
  return template;
}

function normalizePromptMode(command, argsTemplate, promptMode) {
  if (promptMode === "terminal") return "terminal";
  if ((isCodexCommand(command) || isClaudeCommand(command)) && !argsTemplate.includes("{{prompt}}")) {
    return "stdin";
  }
  return promptMode;
}

function parseArgsTemplate(template, prompt, cwd) {
  return splitCommandLine(template.replaceAll("{{prompt}}", prompt).replaceAll("{{cwd}}", cwd));
}

function normalizeCliArgs(command, args) {
  if (!isCodexCommand(command) && !isClaudeCommand(command)) return args;
  const normalized = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (isCodexCommand(command) && (arg === "--ask-for-approval" || arg === "-a")) {
      index += index + 1 < args.length ? 1 : 0;
      continue;
    }
    if (arg === "-") continue;
    normalized.push(arg);
  }
  return normalized;
}

function resolveCommand(command) {
  const trimmed = command.trim();
  if (!trimmed) return "";
  if (isExactPath(trimmed) && existsSync(trimmed)) return trimmed;
  const resolver = process.platform === "win32" ? "where" : "command";
  const args = process.platform === "win32" ? [trimmed] : ["-v", trimmed];
  const result = spawnSync(resolver, args, { encoding: "utf8", shell: process.platform !== "win32" });
  const found = (result.stdout || "").split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  if (found && existsSync(found)) return found;
  for (const candidate of knownCliLocations(trimmed)) {
    if (existsSync(candidate)) return candidate;
  }
  return "";
}

function knownCliLocations(command) {
  const name = path.basename(command).replace(/\.(cmd|exe|bat)$/i, "");
  if (process.platform === "win32") return [];
  return [
    `/opt/homebrew/bin/${name}`,
    `/usr/local/bin/${name}`,
    path.join(process.env.HOME || "", ".local", "bin", name),
    `/Applications/${capitalize(name)}.app/Contents/Resources/${name}`,
  ];
}

function run(command, args) {
  const output = spawnSync(command, args, { encoding: "utf8", maxBuffer: 1024 * 1024 });
  return {
    status: output.status ?? 1,
    output: `${output.stdout || ""}${output.stderr || ""}`.trim(),
  };
}

function parseProviders(text) {
  const blocks = text.split(/\n  - id: /).slice(1);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const provider = { id: unquote(lines[0].trim()) };
    let currentArray = "";
    for (const line of lines.slice(1)) {
      const arrayItem = line.match(/^      -\s*(.*)$/);
      if (arrayItem && currentArray) {
        provider[currentArray].push(unquote(arrayItem[1].trim()));
        continue;
      }
      const match = line.match(/^    ([A-Za-z0-9_]+):\s*(.*)$/);
      if (!match) continue;
      currentArray = "";
      if (match[2].trim() === "") {
        currentArray = match[1];
        provider[currentArray] = [];
      } else {
        provider[match[1]] = unquote(match[2].trim());
      }
    }
    return provider;
  });
}

function splitCommandLine(input) {
  const args = [];
  let current = "";
  let quote = "";
  for (const ch of String(input || "")) {
    if (quote) {
      if (ch === quote) quote = "";
      else current += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        args.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current) args.push(current);
  return args;
}

function isExactPath(value) {
  return Boolean(value && (path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value) || value.includes("/") || value.includes("\\")));
}

function providerKindFromCommand(command) {
  if (isCodexCommand(command)) return "codex";
  if (isClaudeCommand(command)) return "claude";
  return command ? "generic" : "internal";
}

function isCodexCommand(command) {
  return commandName(command) === "codex";
}

function isClaudeCommand(command) {
  return commandName(command) === "claude";
}

function commandName(command) {
  return path.basename(String(command || "").replace(/\\/g, "/")).replace(/\.(cmd|exe|bat)$/i, "").toLowerCase();
}

function includesAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

function ok(diagnostics, subject, detail) {
  diagnostics.push({ level: "ok", subject, detail });
}

function warn(diagnostics, subject, detail) {
  diagnostics.push({ level: "warning", subject, detail });
}

function error(diagnostics, subject, detail) {
  diagnostics.push({ level: "error", subject, detail });
}

function trim(value, length) {
  const text = String(value || "").trim();
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function capitalize(value) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
  return value;
}

function markdown(value) {
  return [
    "# Provider Contracts",
    "",
    `Status: ${value.status}`,
    `Generated: ${value.generatedAt}`,
    `Project: ${value.projectPath}`,
    "",
    "## Blockers",
    ...(value.blockers.length ? value.blockers.map((item) => `- ${item.providerId}/${item.subject}: ${item.detail}`) : ["- None"]),
    "",
    "## Warnings",
    ...(value.warnings.length ? value.warnings.map((item) => `- ${item.providerId}/${item.subject}: ${item.detail}`) : ["- None"]),
    "",
    "## Providers",
    ...value.records.flatMap((record) => [
      `### ${record.name}`,
      `- Status: ${record.status}`,
      `- Kind: ${record.providerKind}`,
      `- Command: ${record.command || "(internal)"}`,
      `- Resolved: ${record.resolvedCommand || "(none)"}`,
      `- Args: ${record.normalizedArgsTemplate || "(empty)"}`,
      `- Prompt mode: ${record.promptMode}`,
      ...record.diagnostics.map((item) => `- [${item.level}] ${item.subject}: ${item.detail}`),
      "",
    ]),
  ].join("\n");
}
