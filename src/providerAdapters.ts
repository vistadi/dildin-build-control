import type { PromptMode, Provider, ProviderAdapterId, ProviderFeatureFlag, ProviderVendor } from "./types";

export interface ProviderAdapterDescriptor {
  id: ProviderAdapterId;
  vendor: ProviderVendor;
  displayName: string;
  commands: string[];
  invocationProfileId: string;
  defaultArgsTemplate: string;
  defaultPromptMode: PromptMode;
  versionArgs: string;
  outputFormat: "text" | "stream-json";
  featureFlag?: ProviderFeatureFlag;
  minimumVersion?: string;
  requiredHelpFlags: string[];
  authProbe: "kimi-local" | "qwen-local" | "codex-local" | "claude-local" | "none";
  readOnlyProfile: boolean;
  safetyNotes: string[];
}

export const providerAdapterRegistry: ProviderAdapterDescriptor[] = [
  {
    id: "mock/v1",
    vendor: "dbc",
    displayName: "Mock Adapter",
    commands: [],
    invocationProfileId: "mock/deterministic/v1",
    defaultArgsTemplate: "",
    defaultPromptMode: "stdin",
    versionArgs: "",
    outputFormat: "text",
    requiredHelpFlags: [],
    authProbe: "none",
    readOnlyProfile: true,
    safetyNotes: ["No external provider or credential is used."],
  },
  {
    id: "local-runner/v1",
    vendor: "local",
    displayName: "Local Terminal Runner",
    commands: [],
    invocationProfileId: "local-runner/policy-command/v1",
    defaultArgsTemplate: "",
    defaultPromptMode: "stdin",
    versionArgs: "",
    outputFormat: "text",
    requiredHelpFlags: [],
    authProbe: "none",
    readOnlyProfile: true,
    safetyNotes: ["Commands remain constrained by WorkSlice and command policy."],
  },
  {
    id: "codex/exec-workspace-write/v1",
    vendor: "openai",
    displayName: "Codex CLI",
    commands: ["codex"],
    invocationProfileId: "codex/exec-workspace-write/v1",
    defaultArgsTemplate: 'exec --skip-git-repo-check --sandbox workspace-write --cd "{{cwd}}"',
    defaultPromptMode: "stdin",
    versionArgs: "--version",
    outputFormat: "text",
    requiredHelpFlags: ["exec", "--sandbox", "--cd"],
    authProbe: "codex-local",
    readOnlyProfile: true,
    safetyNotes: ["DBC approval and scope policy remains authoritative."],
  },
  {
    id: "claude/print-stdin/v1",
    vendor: "anthropic",
    displayName: "Claude Code",
    commands: ["claude"],
    invocationProfileId: "claude/print-stdin/v1",
    defaultArgsTemplate: "-p",
    defaultPromptMode: "stdin",
    versionArgs: "--version",
    outputFormat: "text",
    requiredHelpFlags: ["--print"],
    authProbe: "claude-local",
    readOnlyProfile: true,
    safetyNotes: ["Use non-interactive print mode for controlled runs."],
  },
  {
    id: "kimi/headless-stream-json/v1",
    vendor: "moonshot",
    displayName: "Kimi Code",
    commands: ["kimi"],
    invocationProfileId: "kimi/headless-stream-json/v1",
    defaultArgsTemplate: '-p "{{prompt}}" --output-format stream-json --plan',
    defaultPromptMode: "arg",
    versionArgs: "--version",
    outputFormat: "stream-json",
    featureFlag: "kimi",
    minimumVersion: "0.21.0",
    requiredHelpFlags: ["--prompt", "--output-format", "--plan"],
    authProbe: "kimi-local",
    readOnlyProfile: true,
    safetyNotes: [
      "Kimi print mode auto-approves internal tool calls.",
      "DBC must keep Kimi tool access disabled until the MCP policy proxy is active.",
    ],
  },
  {
    id: "qwen/headless-stream-json/v1",
    vendor: "alibaba",
    displayName: "Qwen Code",
    commands: ["qwen"],
    invocationProfileId: "qwen/headless-stream-json/v1",
    defaultArgsTemplate:
      '-p "{{prompt}}" --output-format stream-json --approval-mode plan --safe-mode --max-tool-calls 0 --max-session-turns 3 --max-wall-time 120s',
    defaultPromptMode: "arg",
    versionArgs: "--version",
    outputFormat: "stream-json",
    featureFlag: "qwen",
    requiredHelpFlags: ["--prompt", "--output-format", "--approval-mode", "--safe-mode", "--max-tool-calls"],
    authProbe: "qwen-local",
    readOnlyProfile: true,
    safetyNotes: ["DBC never enables --yolo; controlled write modes require explicit policy and approval."],
  },
  {
    id: "generic-cli/v1",
    vendor: "custom",
    displayName: "Generic CLI",
    commands: [],
    invocationProfileId: "generic-cli/v1",
    defaultArgsTemplate: "",
    defaultPromptMode: "stdin",
    versionArgs: "--version",
    outputFormat: "text",
    requiredHelpFlags: [],
    authProbe: "none",
    readOnlyProfile: false,
    safetyNotes: ["Custom CLI contracts require an explicit fixture before real execution."],
  },
];

export function providerFeatureEnabled(flag: ProviderFeatureFlag) {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const raw = viteEnv?.[`VITE_DBC_ENABLE_${flag.toUpperCase()}`];
  return raw === "1" || raw === "true";
}

export function adapterForCommand(command: string) {
  const name = commandName(command);
  return (
    providerAdapterRegistry.find((adapter) => adapter.commands.includes(name)) ??
    providerAdapterRegistry[providerAdapterRegistry.length - 1]
  );
}

export function adapterForProvider(provider: Provider) {
  return providerAdapterRegistry.find((adapter) => adapter.id === provider.adapterId) ?? adapterForCommand(provider.command);
}

export function adapterAvailable(adapter: ProviderAdapterDescriptor) {
  return !adapter.featureFlag || providerFeatureEnabled(adapter.featureFlag);
}

export function experimentalProviderTemplates(includeUnavailable = false): Provider[] {
  return providerAdapterRegistry
    .filter((adapter) => adapter.featureFlag && (includeUnavailable || adapterAvailable(adapter)))
    .map((adapter) => ({
      id: adapter.featureFlag === "kimi" ? "kimi_code" : "qwen_code",
      name: adapter.displayName,
      vendor: adapter.vendor,
      adapterId: adapter.id,
      invocationProfileId: adapter.invocationProfileId,
      featureFlag: adapter.featureFlag,
      type: "cli",
      enabled: false,
      health: "unknown",
      command: adapter.commands[0],
      argsTemplate: adapter.defaultArgsTemplate,
      versionArgs: adapter.versionArgs,
      promptMode: adapter.defaultPromptMode,
      runMode: "mock",
      timeoutSeconds: 900,
      maxOutputBytes: 200000,
      capabilities:
        adapter.featureFlag === "kimi"
          ? ["plan", "review_diff", "analyze_logs", "structured_output"]
          : ["plan", "review_diff", "analyze_logs", "structured_output"],
      modelIds: [],
      costTier: "medium",
      latencyTier: "standard",
      dataResidency: "cn",
      egressRequired: true,
      assignedRoles: [],
      lastTestResult: "Feature flagged: contract tests are required before real execution.",
    }));
}

function commandName(command: string) {
  const normalized = command.trim().replace(/\\/g, "/");
  const fileName = normalized.split("/").filter(Boolean).pop() ?? normalized;
  return fileName.replace(/\.(cmd|exe|bat)$/i, "").toLowerCase();
}
