import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const projectPath = process.cwd();
const dbcPath = path.join(projectPath, ".dbc");
const providersPath = path.join(dbcPath, "providers.yaml");
const contractsPath = path.join(dbcPath, "provider-contracts", "latest.json");
const outputDir = path.join(dbcPath, "provider-sessions");
mkdirSync(outputDir, { recursive: true });

const providers = existsSync(providersPath) ? parseProviders(readFileSync(providersPath, "utf8")) : [];
const contracts = readJson(contractsPath);
const contractById = new Map((contracts?.records || []).map((record) => [record.id, record]));
const records = providers.map((provider) => sessionRecord(provider, contractById.get(provider.id)));
const blockers = records.flatMap((record) => record.blockers.map((item) => ({ providerId: record.id, ...item })));
const warnings = records.flatMap((record) => record.warnings.map((item) => ({ providerId: record.id, ...item })));

if (!existsSync(providersPath)) blockers.push({ providerId: "project", subject: "providers", detail: `${providersPath} is missing.` });
if (!existsSync(contractsPath)) warnings.push({ providerId: "project", subject: "provider contracts", detail: "Run pnpm provider-contracts before provider-sessions." });

const report = {
  version: 1,
  kind: "provider-sessions",
  generatedAt: String(Date.now()),
  projectPath,
  status: blockers.length ? "blocked" : warnings.length ? "ready_with_warnings" : "ready",
  blockers,
  warnings,
  records,
  environment: {
    platform: process.platform,
    arch: process.arch,
    homePresent: Boolean(os.homedir()),
    shellPresent: Boolean(process.env.SHELL || process.env.ComSpec),
    cwdExists: existsSync(projectPath),
  },
  refs: {
    providersPath,
    contractsPath,
  },
  nextAction: blockers.length
    ? "Fix blocked provider sessions, rerun pnpm provider-contracts, then rerun pnpm provider-sessions."
    : "Use exact CLI paths and ready non-interactive contracts for automated loops; terminal sessions require human handoff.",
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

function sessionRecord(provider, contract) {
  const providerKind = contract?.providerKind || providerKindFromCommand(provider.command);
  const resolvedCommand = contract?.resolvedCommand || resolveCommand(provider.command || "");
  const version = probeVersion(provider, resolvedCommand);
  const auth = probeAuth(providerKind);
  const supportedModes = supportedPromptModes(providerKind, provider);
  const blockers = [];
  const warnings = [];

  if (provider.enabled !== "true") warnings.push({ subject: "enabled", detail: "Provider is disabled." });
  if (provider.type === "cli" && !resolvedCommand) blockers.push({ subject: "command", detail: "CLI executable is not resolved." });
  if (provider.type === "cli" && contract?.status === "failed") blockers.push({ subject: "contract", detail: "Provider contract failed." });
  if (provider.type === "cli" && contract?.status === "warning") warnings.push({ subject: "contract", detail: "Provider contract has warnings." });
  if (provider.type === "cli" && !isExactPath(provider.command || "")) warnings.push({ subject: "exact path", detail: "Provider command is PATH-based; save the resolved executable path for portability." });
  if (provider.runMode === "real" && auth.status === "unknown") warnings.push({ subject: "auth", detail: auth.detail });
  if (provider.runMode === "real" && auth.status === "missing") blockers.push({ subject: "auth", detail: auth.detail });
  if (providerKind === "kimi" && provider.runMode === "real") {
    blockers.push({
      subject: "kimi tool isolation",
      detail: "Kimi print mode auto-approves internal tool calls; real execution remains blocked until the DBC MCP/tool policy proxy is active.",
    });
  }
  if (providerKind === "qwen" && provider.runMode === "real" && !qwenReadOnlyTemplate(provider.argsTemplate || "")) {
    blockers.push({
      subject: "qwen read-only profile",
      detail: "Real Qwen execution requires --safe-mode and --max-tool-calls 0, with no yolo flags.",
    });
  }
  if (provider.runMode === "real" && provider.promptMode === "terminal") warnings.push({ subject: "terminal handoff", detail: "Human-operated terminal or PTY is required; DBC will stop before non-interactive execution." });

  const status = provider.enabled !== "true"
    ? "disabled"
    : blockers.length
      ? "blocked"
      : provider.runMode === "real" && provider.promptMode === "terminal"
        ? "manual_handoff"
        : warnings.length
          ? "ready_with_warnings"
          : "ready";

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
    promptMode: provider.promptMode || "stdin",
    argsTemplate: provider.argsTemplate || "",
    cwd: projectPath,
    cwdExists: existsSync(projectPath),
    supportedModes,
    contract: {
      status: contract?.status || "missing",
      promptMode: contract?.promptMode || "",
      normalizedArgsTemplate: contract?.normalizedArgsTemplate || "",
      diagnostics: (contract?.diagnostics || []).map((item) => `${item.level}:${item.subject}`),
    },
    version,
    auth,
    status,
    blockers,
    warnings,
  };
}

function probeVersion(provider, resolvedCommand) {
  if (provider.type !== "cli") return { status: "not_required", output: "" };
  if (!resolvedCommand) return { status: "missing", output: "" };
  const result = spawnSync(resolvedCommand, splitCommandLine(provider.versionArgs || "--version"), {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  const output = trim(`${result.stdout || ""}${result.stderr || ""}`, 500);
  const detectedVersion = detectSemver(output);
  const compatible = providerKindFromCommand(provider.command) !== "kimi" || semverAtLeast(detectedVersion, "0.21.0");
  return {
    status: result.status === 0 && compatible ? "ok" : "warning",
    output,
    detectedVersion,
    compatibility: compatible ? "supported" : "unsupported",
  };
}

function probeAuth(providerKind) {
  if (providerKind === "codex") {
    const candidates = [
      process.env.CODEX_HOME ? path.join(process.env.CODEX_HOME, "auth.json") : "",
      path.join(os.homedir(), ".codex", "auth.json"),
    ].filter(Boolean);
    return presenceProbe("codex auth", candidates);
  }
  if (providerKind === "claude") {
    const candidates = [
      path.join(os.homedir(), ".claude.json"),
      path.join(os.homedir(), ".claude"),
      path.join(os.homedir(), ".config", "claude-code"),
    ];
    return presenceProbe("claude auth", candidates);
  }
  if (providerKind === "kimi") {
    const candidates = [
      process.env.KIMI_SHARE_DIR || "",
      path.join(os.homedir(), ".kimi"),
    ].filter(Boolean);
    return presenceProbe("kimi auth", candidates, true);
  }
  if (providerKind === "qwen") {
    const envPresent = [
      "BAILIAN_CODING_PLAN_API_KEY",
      "OPENAI_API_KEY",
      "DASHSCOPE_API_KEY",
      "ANTHROPIC_API_KEY",
      "GEMINI_API_KEY",
    ].some((name) => Boolean(process.env[name]));
    const candidates = [path.join(os.homedir(), ".qwen", "settings.json")];
    const result = presenceProbe("qwen auth", candidates, true);
    if (envPresent) {
      return {
        status: "present",
        detail: "Qwen API-key environment presence detected without reading secret contents.",
        checked: result.checked,
      };
    }
    return result;
  }
  return { status: "not_required", detail: "No external auth probe required for this provider kind.", checked: [] };
}

function presenceProbe(label, candidates, missingIsDefinitive = false) {
  const checked = candidates.map((filePath) => ({ path: filePath, present: existsSync(filePath) }));
  const present = checked.some((item) => item.present);
  return {
    status: present ? "present" : missingIsDefinitive ? "missing" : "unknown",
    detail: present ? `${label} presence detected without reading secret contents.` : `${label} presence was not detected; provider may still be authenticated through another official CLI mechanism.`,
    checked,
  };
}

function supportedPromptModes(providerKind, provider) {
  if (provider.type === "mock" || provider.type === "local_runner") return ["internal"];
  if (providerKind === "codex") return ["stdin", "terminal"];
  if (providerKind === "claude") return ["stdin", "terminal"];
  if (providerKind === "kimi" || providerKind === "qwen") return ["arg", "terminal"];
  return ["stdin", "arg", "file", "terminal"];
}

function providerKindFromCommand(command) {
  const fileName = path.basename(String(command || "")).replace(/\.(cmd|exe|bat)$/i, "").toLowerCase();
  if (!fileName) return "internal";
  if (fileName === "codex") return "codex";
  if (fileName === "claude") return "claude";
  if (fileName === "kimi") return "kimi";
  if (fileName === "qwen") return "qwen";
  return "generic";
}

function qwenReadOnlyTemplate(template) {
  return template.includes("--safe-mode")
    && /--max-tool-calls(?:=|\s+)0(?:\s|$)/.test(template)
    && !/(?:^|\s)(?:--yolo|-y)(?:\s|$)|--approval-mode(?:=|\s+)yolo/.test(template);
}

function detectSemver(text) {
  return String(text || "").match(/\b\d+\.\d+(?:\.\d+)?\b/)?.[0] || "";
}

function semverAtLeast(version, minimum) {
  if (!version) return false;
  const parts = (value) => value.split(".").map(Number).concat([0, 0, 0]).slice(0, 3);
  const left = parts(version);
  const right = parts(minimum);
  return left[0] > right[0]
    || (left[0] === right[0] && left[1] > right[1])
    || (left[0] === right[0] && left[1] === right[1] && left[2] >= right[2]);
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

function readJson(filePath) {
  if (!filePath || !existsSync(filePath)) return undefined;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function resolveCommand(command) {
  const trimmed = String(command || "").trim();
  if (!trimmed) return "";
  if (isExactPath(trimmed) && existsSync(trimmed)) return trimmed;
  const resolver = process.platform === "win32" ? "where" : "command";
  const args = process.platform === "win32" ? [trimmed] : ["-v", trimmed];
  const result = spawnSync(resolver, args, { encoding: "utf8", shell: process.platform !== "win32" });
  const found = (result.stdout || "").split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  return found && existsSync(found) ? found : "";
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

function unquote(value) {
  return value.replace(/^["']|["']$/g, "");
}

function trim(value, length) {
  const text = String(value || "").trim();
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function markdown(value) {
  return [
    "# Provider Sessions",
    "",
    `Status: ${value.status}`,
    `Generated: ${value.generatedAt}`,
    `Project: ${value.projectPath}`,
    "",
    "## Sessions",
    ...value.records.map((record) => `- ${record.id}: ${record.status}; ${record.resolvedCommand || "unresolved"}; auth ${record.auth.status}; prompt ${record.promptMode}`),
    "",
    "## Blockers",
    ...(value.blockers.length ? value.blockers.map((item) => `- ${item.providerId}/${item.subject}: ${item.detail}`) : ["- None"]),
    "",
    "## Warnings",
    ...(value.warnings.length ? value.warnings.map((item) => `- ${item.providerId}/${item.subject}: ${item.detail}`) : ["- None"]),
    "",
  ].join("\n");
}
