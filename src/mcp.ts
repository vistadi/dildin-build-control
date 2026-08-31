import type {
  McpDecision,
  McpServerConnection,
  McpToolCallEvidence,
  McpToolCallRequest,
  McpToolDefinition,
  McpToolIntent,
  ToolPolicy,
} from "./types";

const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i,
  /\b(?:sk|pk|api)[-_][A-Za-z0-9_-]{16,}/i,
  /(?:token|api[_-]?key|password|secret)\s*[:=]\s*[^$\s{][^\s,]{7,}/i,
];

export const defaultToolPolicies: ToolPolicy[] = [
  {
    id: "mcp-read-only",
    name: "Read-only tools",
    description: "Allows explicit read tools, blocks writes, network side effects, destructive actions, and sensitive data.",
    trustTemplate: "read_only",
    allowedTools: [],
    deniedTools: [],
    allowedPaths: ["{{projectPath}}"],
    deniedPaths: [".env", ".git", "**/secrets/**", "**/*key*"],
    allowNetwork: false,
    allowSensitiveData: false,
    writeDecision: "deny",
    networkDecision: "deny",
    destructiveDecision: "deny",
    maxCallsPerRun: 20,
    maxRetries: 1,
    timeoutSeconds: 30,
    enabled: true,
  },
  {
    id: "mcp-approved-write",
    name: "Approved workspace write",
    description: "Read tools run automatically; writes and network calls require one run-scoped approval.",
    trustTemplate: "workspace_write",
    allowedTools: [],
    deniedTools: [],
    allowedPaths: ["{{projectPath}}"],
    deniedPaths: [".env", ".git", "node_modules", "src-tauri/target"],
    allowNetwork: false,
    allowSensitiveData: false,
    writeDecision: "approval_required",
    networkDecision: "deny",
    destructiveDecision: "deny",
    maxCallsPerRun: 40,
    maxRetries: 1,
    timeoutSeconds: 45,
    enabled: true,
  },
];

export function defaultMcpServers(): McpServerConnection[] {
  return [];
}

export function normalizeMcpConnection(connection: Partial<McpServerConnection>): McpServerConnection {
  return {
    id: connection.id || "mcp-connection",
    name: connection.name || "MCP Server",
    transport: connection.transport ?? "stdio",
    enabled: connection.enabled ?? false,
    health: connection.health ?? "unknown",
    command: connection.command ?? "",
    args: Array.isArray(connection.args) ? connection.args.map(String) : [],
    url: connection.url ?? "",
    authMode: connection.authMode ?? "none",
    secretRef: connection.secretRef ?? "",
    headerSecretRefs: recordOfStrings(connection.headerSecretRefs),
    oauthStatus: connection.oauthStatus ?? (connection.authMode === "none" ? "not_required" : "unknown"),
    toolPolicyId: connection.toolPolicyId ?? "mcp-read-only",
    discoveredTools: Array.isArray(connection.discoveredTools)
      ? connection.discoveredTools.map(normalizeMcpTool)
      : [],
    protocolVersion: connection.protocolVersion ?? "",
    serverVersion: connection.serverVersion ?? "",
    timeoutSeconds: positiveInteger(connection.timeoutSeconds, 30),
    lastCheckedAt: connection.lastCheckedAt,
    lastCheckResult: connection.lastCheckResult,
    recoveryAction: connection.recoveryAction,
  };
}

export function validateMcpConnection(connection: McpServerConnection) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const serialized = JSON.stringify({
    command: connection.command,
    args: connection.args,
    url: connection.url,
    secretRef: connection.secretRef,
    headerSecretRefs: connection.headerSecretRefs,
  });
  if (SECRET_PATTERNS.some((pattern) => pattern.test(serialized))) {
    errors.push("Inline secret-like value detected. Store only a secret reference identifier.");
  }
  if (connection.transport === "stdio") {
    if (!connection.command.trim()) errors.push("stdio transport requires an executable command.");
    if (connection.url.trim()) warnings.push("URL is ignored for stdio connections.");
  } else {
    if (!/^https?:\/\//i.test(connection.url.trim())) errors.push("HTTP/SSE transport requires an http(s) URL.");
    if (connection.command.trim()) warnings.push("Command is ignored for HTTP/SSE connections.");
    if (connection.transport === "sse_legacy") warnings.push("SSE is supported only as a legacy import transport.");
  }
  if (connection.authMode === "secret_ref" && !validSecretRef(connection.secretRef)) {
    errors.push("Secret authentication requires a reference such as keychain:service/account.");
  }
  if (connection.authMode === "oauth" && connection.oauthStatus !== "connected") {
    warnings.push("OAuth is not connected.");
  }
  if (!connection.toolPolicyId) errors.push("A tool policy is required before discovery or execution.");
  return { valid: errors.length === 0, errors, warnings };
}

export function sanitizeMcpConnections(connections: McpServerConnection[]) {
  return connections.map((connection) => {
    const normalized = normalizeMcpConnection(connection);
    const validation = validateMcpConnection(normalized);
    return {
      ...normalized,
      enabled: validation.valid ? normalized.enabled : false,
      health: validation.valid ? normalized.health : "failed" as const,
      lastCheckResult: validation.valid ? normalized.lastCheckResult : validation.errors.join(" "),
    };
  });
}

export function classifyMcpTool(tool: Pick<McpToolDefinition, "name" | "description" | "inputSchema">): McpToolIntent {
  const value = `${tool.name} ${tool.description} ${JSON.stringify(tool.inputSchema)}`.toLowerCase();
  if (/delete|destroy|drop|erase|remove_all|reset|format|revoke/.test(value)) return "destructive";
  if (/secret|credential|token|password|private[_ -]?key|\.env/.test(value)) return "sensitive_read";
  if (/http|network|fetch|request|deploy|publish|send|email|message|upload/.test(value)) return "network";
  if (/write|edit|create|update|patch|insert|move|rename|mkdir|commit/.test(value)) return "write";
  if (/read|get|list|search|find|inspect|stat|diff|log|query/.test(value)) return "read";
  return "unknown";
}

export function evaluateMcpTool(policy: ToolPolicy, tool: McpToolDefinition): { decision: McpDecision; reason: string } {
  if (!policy.enabled) return { decision: "deny", reason: "Tool policy is disabled." };
  if (policy.deniedTools.includes(tool.name)) return { decision: "deny", reason: "Tool is explicitly denied." };
  if (policy.allowedTools.length && !policy.allowedTools.includes(tool.name)) {
    return { decision: "deny", reason: "Tool is not in the explicit allowlist." };
  }
  const intent = tool.intent === "unknown" ? classifyMcpTool(tool) : tool.intent;
  if (intent === "destructive") return { decision: policy.destructiveDecision, reason: "Tool is classified as destructive." };
  if (intent === "sensitive_read" && !policy.allowSensitiveData) {
    return { decision: "deny", reason: "Policy forbids sensitive-data reads." };
  }
  if (intent === "network") {
    if (!policy.allowNetwork && policy.networkDecision === "allow") return { decision: "deny", reason: "Network access is disabled." };
    return { decision: policy.networkDecision, reason: "Tool can cause network egress." };
  }
  if (intent === "write") return { decision: policy.writeDecision, reason: "Tool can modify state." };
  if (intent === "unknown") return { decision: "approval_required", reason: "Tool intent is unknown." };
  return { decision: "allow", reason: "Read-only tool is allowed by policy." };
}

export function evaluateMcpToolCall(
  request: McpToolCallRequest,
  priorEvidence: McpToolCallEvidence[] = [],
): McpToolCallEvidence {
  const createdAt = String(Date.now());
  const intent = !request.tool.intent || request.tool.intent === "unknown" ? classifyMcpTool(request.tool) : request.tool.intent;
  const observed = inspectMcpArguments(request.arguments);
  const duplicate = priorEvidence.some(
    (item) =>
      item.runId === request.runId &&
      item.connectionId === request.connectionId &&
      item.idempotencyKey === request.idempotencyKey &&
      item.shouldExecute,
  );
  let evaluation = evaluateMcpTool(request.policy, { ...request.tool, intent });

  if (duplicate) {
    evaluation = { decision: "allow", reason: "Idempotency key already executed; replay the recorded result without another side effect." };
  } else if (priorEvidence.filter((item) => item.runId === request.runId).length >= request.policy.maxCallsPerRun) {
    evaluation = { decision: "deny", reason: `Run call limit ${request.policy.maxCallsPerRun} is exhausted.` };
  } else if (request.attempt > request.policy.maxRetries + 1) {
    evaluation = { decision: "deny", reason: `Retry limit ${request.policy.maxRetries} is exhausted.` };
  } else if (observed.sensitiveKeys.length && !request.policy.allowSensitiveData) {
    evaluation = { decision: "deny", reason: `Sensitive argument fields are forbidden: ${observed.sensitiveKeys.join(", ")}.` };
  } else if (observed.hosts.length && !request.policy.allowNetwork) {
    evaluation = { decision: "deny", reason: `Network egress is disabled; observed host(s): ${observed.hosts.join(", ")}.` };
  } else {
    const deniedPath = observed.paths.find((path) => pathMatchesAny(path, request.policy.deniedPaths, request.projectPath));
    if (deniedPath) {
      evaluation = { decision: "deny", reason: `Path is denied by policy: ${deniedPath}.` };
    } else if (
      observed.paths.length &&
      request.policy.allowedPaths.length &&
      observed.paths.some((path) => !pathMatchesAny(path, request.policy.allowedPaths, request.projectPath))
    ) {
      evaluation = { decision: "deny", reason: "At least one path is outside the policy allowlist." };
    }
  }

  if (evaluation.decision === "approval_required" && request.approvalGranted) {
    evaluation = { decision: "allow", reason: `${evaluation.reason} Run-scoped approval is recorded.` };
  }

  return {
    schemaVersion: 1,
    id: `MCP-${createdAt}-${simpleChecksum(`${request.runId}:${request.idempotencyKey}`)}`,
    runId: request.runId,
    connectionId: request.connectionId,
    policyId: request.policy.id,
    toolName: request.tool.name,
    intent,
    decision: evaluation.decision,
    reason: evaluation.reason,
    shouldExecute: evaluation.decision === "allow" && !duplicate,
    duplicateReplayed: duplicate,
    idempotencyKey: request.idempotencyKey,
    attempt: Math.max(1, Math.floor(request.attempt || 1)),
    argumentChecksum: simpleChecksum(stableJson(request.arguments)),
    observedPaths: observed.paths,
    observedHosts: observed.hosts,
    createdAt,
    evidencePath: "",
  };
}

function normalizeMcpTool(tool: Partial<McpToolDefinition>): McpToolDefinition {
  const normalized = {
    name: tool.name ?? "unknown",
    description: tool.description ?? "",
    inputSchema: tool.inputSchema && typeof tool.inputSchema === "object" ? tool.inputSchema : {},
    intent: tool.intent ?? "unknown",
    discoveredAt: tool.discoveredAt ?? "",
  };
  return { ...normalized, intent: normalized.intent === "unknown" ? classifyMcpTool(normalized) : normalized.intent };
}

function validSecretRef(value: string) {
  return /^(keychain|secret|env):[A-Za-z0-9._/-]{3,}$/.test(value.trim());
}

function inspectMcpArguments(value: unknown) {
  const paths = new Set<string>();
  const hosts = new Set<string>();
  const sensitiveKeys = new Set<string>();
  const visit = (item: unknown, key = "") => {
    if (/token|secret|password|credential|private[_-]?key|authorization/i.test(key)) sensitiveKeys.add(key);
    if (typeof item === "string") {
      try {
        const url = new URL(item);
        if (url.protocol === "http:" || url.protocol === "https:") hosts.add(url.host.toLowerCase());
      } catch {
        if (/^(?:\.{0,2}\/|\/|[A-Za-z]:\\)/.test(item) || /(?:path|file|directory|root|cwd)/i.test(key)) {
          paths.add(item.split("\\").join("/"));
        }
      }
      return;
    }
    if (Array.isArray(item)) {
      item.forEach((child) => visit(child, key));
      return;
    }
    if (item && typeof item === "object") {
      Object.entries(item).forEach(([childKey, child]) => visit(child, childKey));
    }
  };
  visit(value);
  return { paths: [...paths].sort(), hosts: [...hosts].sort(), sensitiveKeys: [...sensitiveKeys].sort() };
}

function pathMatchesAny(path: string, patterns: string[], projectPath: string) {
  const normalizedPath = normalizePolicyPath(path, projectPath);
  return patterns.some((pattern) => {
    const normalizedPattern = normalizePolicyPath(pattern, projectPath);
    if (!normalizedPattern) return false;
    if (normalizedPattern.includes("*")) {
      const expression = normalizedPattern
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .split("**").join("__DBC_GLOBSTAR__")
        .split("*").join("[^/]*")
        .split("__DBC_GLOBSTAR__").join(".*");
      return new RegExp(`^${expression}(?:/.*)?$`).test(normalizedPath);
    }
    return normalizedPath === normalizedPattern || normalizedPath.startsWith(`${normalizedPattern}/`);
  });
}

function normalizePolicyPath(value: string, projectPath: string) {
  const substituted = value.split("{{projectPath}}").join(projectPath).split("\\").join("/").replace(/\/$/, "");
  if (!substituted) return "";
  if (substituted.startsWith("/")) return substituted;
  return `${projectPath.replace(/\/$/, "")}/${substituted.replace(/^\.\//, "")}`;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function simpleChecksum(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function positiveInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function recordOfStrings(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}
