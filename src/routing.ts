import type {
  AgentRole,
  DataResidency,
  ExecutionIdentitySnapshot,
  ExecutionProviderIdentity,
  FallbackJournalEntry,
  Provider,
  ProviderAdapterId,
  ProviderCostTier,
  ProviderLatencyTier,
  ProviderStrategy,
  RoutingPolicy,
  RoutingSimulationResult,
  Task,
} from "./types";

export const LEGACY_ROUTING_POLICY_IDS: Record<ProviderStrategy, string> = {
  codex_build_claude_review: "route-codex-build-claude-review",
  codex_only: "route-codex-only",
  claude_review_only: "route-claude-review-only",
  mock_only: "route-mock-only",
};

const ROLE_IDS = ["lead", "architect", "developer", "qa", "reviewer", "security", "devops", "product"];

function route(
  roleId: string,
  primaryProviderId: string,
  executionMode: RoutingPolicy["roleRoutes"][number]["executionMode"],
  fallbackProviderIds: string[] = ["mock_adapter"],
  requiredCapabilities: string[] = [],
): RoutingPolicy["roleRoutes"][number] {
  return { roleId, primaryProviderId, fallbackProviderIds, requiredCapabilities, executionMode };
}

export const defaultRoutingPolicies: RoutingPolicy[] = [
  {
    id: "route-balanced-kimi-qwen-read-only",
    name: "Balanced Kimi + Qwen",
    description: "Kimi and Qwen share read-only planning/review roles; Codex remains the bounded builder and unsafe fallback requires approval.",
    fallbackRisk: "approval_required",
    enabled: true,
    constraints: {
      maxCostTier: "medium",
      maxLatencyTier: "standard",
      allowedResidencies: ["local", "eu", "us", "cn", "global", "unknown"],
      allowExternalEgress: true,
      requireHealthy: false,
    },
    roleRoutes: [
      route("lead", "kimi_code", "read_only", ["qwen_code", "codex_cli", "mock_adapter"], ["plan", "structured_output"]),
      route("architect", "qwen_code", "read_only", ["kimi_code", "claude_code", "mock_adapter"], ["review_diff"]),
      route("developer", "codex_cli", "write_workspace", ["mock_adapter"], ["write_code"]),
      route("qa", "qwen_code", "review_only", ["claude_code", "mock_adapter"], ["analyze_logs"]),
      route("reviewer", "kimi_code", "review_only", ["qwen_code", "claude_code", "mock_adapter"], ["review_diff"]),
      route("security", "qwen_code", "read_only", ["claude_code", "mock_adapter"], ["structured_output"]),
      route("devops", "local_terminal", "approval_required", ["mock_adapter"], ["run_build", "run_tests"]),
      route("product", "kimi_code", "read_only", ["codex_cli", "mock_adapter"], ["structured_output"]),
    ],
  },
  {
    id: LEGACY_ROUTING_POLICY_IDS.codex_build_claude_review,
    name: "Codex Builder + Claude Reviewer",
    description: "Codex plans and builds; Claude reviews and checks security; the local runner executes approved checks.",
    legacyProviderStrategy: "codex_build_claude_review",
    fallbackRisk: "approval_required",
    enabled: true,
    roleRoutes: [
      route("lead", "codex_cli", "read_only", ["claude_code", "mock_adapter"], ["plan"]),
      route("architect", "claude_code", "read_only", ["codex_cli", "mock_adapter"], ["review_diff"]),
      route("developer", "codex_cli", "write_workspace", ["mock_adapter"], ["write_code"]),
      route("qa", "claude_code", "review_only", ["mock_adapter"], ["analyze_logs"]),
      route("reviewer", "claude_code", "review_only", ["mock_adapter"], ["review_diff"]),
      route("security", "claude_code", "read_only", ["mock_adapter"], ["security_review"]),
      route("devops", "local_terminal", "approval_required", ["mock_adapter"], ["run_build", "run_tests"]),
      route("product", "codex_cli", "read_only", ["claude_code", "mock_adapter"], ["structured_output"]),
    ],
  },
  {
    id: LEGACY_ROUTING_POLICY_IDS.codex_only,
    name: "Codex Only",
    description: "Codex handles every AI role; the local runner remains responsible for approved build and test commands.",
    legacyProviderStrategy: "codex_only",
    fallbackRisk: "approval_required",
    enabled: true,
    roleRoutes: ROLE_IDS.map((roleId) =>
      roleId === "devops"
        ? route(roleId, "local_terminal", "approval_required", ["mock_adapter"], ["run_build", "run_tests"])
        : route(roleId, "codex_cli", roleId === "developer" ? "write_workspace" : "read_only"),
    ),
  },
  {
    id: LEGACY_ROUTING_POLICY_IDS.claude_review_only,
    name: "Claude Review Only",
    description: "Codex builds; Claude is reserved for QA, review, and security roles.",
    legacyProviderStrategy: "claude_review_only",
    fallbackRisk: "same_only",
    enabled: true,
    roleRoutes: [
      route("lead", "codex_cli", "read_only"),
      route("architect", "claude_code", "read_only"),
      route("developer", "codex_cli", "write_workspace"),
      route("qa", "claude_code", "review_only"),
      route("reviewer", "claude_code", "review_only"),
      route("security", "claude_code", "read_only"),
      route("devops", "local_terminal", "approval_required", ["mock_adapter"]),
      route("product", "codex_cli", "read_only"),
    ],
  },
  {
    id: LEGACY_ROUTING_POLICY_IDS.mock_only,
    name: "Local Safe Mock",
    description: "All AI roles use deterministic mock output and no external provider is called.",
    legacyProviderStrategy: "mock_only",
    fallbackRisk: "same_only",
    enabled: true,
    roleRoutes: ROLE_IDS.map((roleId) => route(roleId, "mock_adapter", "read_only", [])),
  },
];

const COST_ORDER: ProviderCostTier[] = ["free", "low", "medium", "high", "unknown"];
const LATENCY_ORDER: ProviderLatencyTier[] = ["local", "fast", "standard", "slow", "unknown"];

export function simulateRouting(
  policy: RoutingPolicy,
  providers: Provider[],
  overrides: Partial<NonNullable<RoutingPolicy["constraints"]>> = {},
): RoutingSimulationResult {
  const constraints = {
    maxCostTier: "unknown" as ProviderCostTier,
    maxLatencyTier: "unknown" as ProviderLatencyTier,
    allowedResidencies: ["local", "eu", "us", "cn", "global", "unknown"] as DataResidency[],
    allowExternalEgress: true,
    requireHealthy: false,
    ...policy.constraints,
    ...overrides,
  };
  const roles = policy.roleRoutes.map((roleRoute) => {
    const candidates = [roleRoute.primaryProviderId, ...roleRoute.fallbackProviderIds];
    const primary = providers.find((provider) => provider.id === roleRoute.primaryProviderId);
    const primaryRisk = providerRisk(primary);
    let selectedProviderId = "";
    const attempts = candidates.map((providerId, order) => {
      const provider = providers.find((item) => item.id === providerId);
      const missingCapabilities = roleRoute.requiredCapabilities.filter((capability) => !provider?.capabilities.includes(capability));
      let status: "selected" | "skipped" | "approval_required" | "unavailable" = "unavailable";
      let reason = "Provider is not configured.";
      const unsafeFallback = order > 0 && providerRisk(provider) > primaryRisk;
      if (provider) {
        const costTier = providerCostTier(provider);
        const latencyTier = providerLatencyTier(provider);
        const residency = provider.dataResidency ?? defaultResidency(provider);
        if (!provider.enabled) reason = "Provider is disabled.";
        else if (provider.health === "failed" || (constraints.requireHealthy && provider.health !== "ok")) reason = `Provider health is ${provider.health}.`;
        else if (missingCapabilities.length) reason = `Missing capabilities: ${missingCapabilities.join(", ")}.`;
        else if (COST_ORDER.indexOf(costTier) > COST_ORDER.indexOf(constraints.maxCostTier)) reason = `Cost tier ${costTier} exceeds ${constraints.maxCostTier}.`;
        else if (LATENCY_ORDER.indexOf(latencyTier) > LATENCY_ORDER.indexOf(constraints.maxLatencyTier)) reason = `Latency tier ${latencyTier} exceeds ${constraints.maxLatencyTier}.`;
        else if (!constraints.allowedResidencies.includes(residency)) reason = `Data residency ${residency} is not allowed.`;
        else if ((provider.egressRequired ?? (provider.type === "api" || provider.type === "cli")) && !constraints.allowExternalEgress) reason = "External egress is disabled.";
        else if (selectedProviderId) {
          status = "skipped";
          reason = "A preceding candidate already satisfies the route.";
        } else if (unsafeFallback && policy.fallbackRisk === "same_only") {
          status = "skipped";
          reason = "Fallback raises execution risk and this policy allows same-or-lower risk only.";
        } else if (unsafeFallback && policy.fallbackRisk === "approval_required") {
          status = "approval_required";
          reason = "Fallback satisfies the route but raises execution risk.";
          selectedProviderId = provider.id;
        } else {
          status = "selected";
          reason = order === 0 ? "Primary provider satisfies the route." : "Safe fallback satisfies the route.";
          selectedProviderId = provider.id;
        }
      }
      return { roleId: roleRoute.roleId, providerId, order, status, reason, missingCapabilities, unsafeFallback };
    });
    const selectedAttempt = attempts.find((attempt) => attempt.status === "selected" || attempt.status === "approval_required");
    const decision: "ready" | "approval_required" | "blocked" = selectedAttempt?.status === "selected"
      ? "ready"
      : selectedAttempt?.status === "approval_required"
        ? "approval_required"
        : "blocked";
    return { roleId: roleRoute.roleId, configuredProviderId: roleRoute.primaryProviderId, selectedProviderId, decision, attempts };
  });
  const selected = roles.flatMap((role) => {
    const provider = providers.find((item) => item.id === role.selectedProviderId);
    return provider ? [provider] : [];
  });
  const status = roles.some((role) => role.decision === "blocked")
    ? "blocked"
    : roles.some((role) => role.decision === "approval_required")
      ? "approval_required"
      : "ready";
  return {
    schemaVersion: 1,
    policyId: policy.id,
    status,
    roles,
    estimatedCostTier: highestTier(selected.map(providerCostTier), COST_ORDER),
    estimatedLatencyTier: highestTier(selected.map(providerLatencyTier), LATENCY_ORDER),
    externalEgress: selected.some((provider) => provider.egressRequired ?? (provider.type === "api" || provider.type === "cli")),
    generatedAt: String(Date.now()),
  };
}

export function fallbackJournalForSimulation(simulation: RoutingSimulationResult, runId: string): FallbackJournalEntry[] {
  return simulation.roles.flatMap((role) =>
    role.attempts
      .filter((attempt) => attempt.order > 0 || attempt.status !== "selected")
      .map((attempt) => ({
        ...attempt,
        id: `FALLBACK-${runId}-${attempt.roleId}-${attempt.order}`,
        runId,
        policyId: simulation.policyId,
        createdAt: simulation.generatedAt,
      })),
  );
}

export function compareReadOnlyOutputs(left: string, right: string) {
  const normalize = (value: string) => new Set(value.toLowerCase().split(/[^\p{L}\p{N}_-]+/u).filter((item) => item.length > 2));
  const leftTokens = normalize(left);
  const rightTokens = normalize(right);
  const shared = [...leftTokens].filter((token) => rightTokens.has(token));
  const union = new Set([...leftTokens, ...rightTokens]);
  return {
    agreement: union.size ? Number((shared.length / union.size).toFixed(3)) : 1,
    sharedTerms: shared.sort().slice(0, 50),
    leftOnly: [...leftTokens].filter((token) => !rightTokens.has(token)).sort().slice(0, 50),
    rightOnly: [...rightTokens].filter((token) => !leftTokens.has(token)).sort().slice(0, 50),
  };
}

function providerCostTier(provider: Provider): ProviderCostTier {
  if (provider.costTier) return provider.costTier;
  if (provider.type === "mock" || provider.type === "local_runner" || provider.type === "local_model") return "free";
  return provider.runMode === "mock" ? "free" : "medium";
}

function providerLatencyTier(provider: Provider): ProviderLatencyTier {
  if (provider.latencyTier) return provider.latencyTier;
  if (provider.type === "mock" || provider.type === "local_runner" || provider.type === "local_model") return "local";
  return "standard";
}

function defaultResidency(provider: Provider): DataResidency {
  if (["mock", "local_runner", "local_model"].includes(provider.type)) return "local";
  if (provider.vendor === "alibaba" || provider.vendor === "moonshot") return "cn";
  if (provider.vendor === "openai" || provider.vendor === "anthropic") return "us";
  return "unknown";
}

function providerRisk(provider: Provider | undefined) {
  if (!provider) return 99;
  if (provider.type === "mock") return 0;
  if (provider.type === "local_model") return 1;
  if (provider.type === "cli" && provider.runMode === "mock") return 1;
  if (provider.type === "api") return 3;
  if (provider.type === "local_runner") return 4;
  return provider.runMode === "real" ? 4 : 2;
}

function highestTier<T extends string>(values: T[], order: T[]): T {
  return values.reduce((highest, value) => order.indexOf(value) > order.indexOf(highest) ? value : highest, order[0]);
}

export function routingPolicyIdForLegacy(strategy: ProviderStrategy | undefined) {
  return LEGACY_ROUTING_POLICY_IDS[strategy ?? "codex_build_claude_review"] ?? LEGACY_ROUTING_POLICY_IDS.codex_build_claude_review;
}

export function legacyStrategyForRoutingPolicy(policyId: string, policies: RoutingPolicy[] = defaultRoutingPolicies): ProviderStrategy {
  return policies.find((policy) => policy.id === policyId)?.legacyProviderStrategy ?? "codex_build_claude_review";
}

export function normalizeRoutingPolicyId(
  routingPolicyId: string | undefined,
  providerStrategy: ProviderStrategy | undefined,
  policies: RoutingPolicy[] = defaultRoutingPolicies,
) {
  if (routingPolicyId && policies.some((policy) => policy.id === routingPolicyId)) return routingPolicyId;
  return routingPolicyIdForLegacy(providerStrategy);
}

export function resolveRoutingPolicy(task: Task, policies: RoutingPolicy[]) {
  const id = normalizeRoutingPolicyId(task.routingPolicyId, task.providerStrategy, policies);
  return policies.find((policy) => policy.id === id)
    ?? defaultRoutingPolicies.find((policy) => policy.id === LEGACY_ROUTING_POLICY_IDS.codex_build_claude_review)!;
}

export function buildExecutionIdentitySnapshot(
  task: Task,
  providers: Provider[],
  agents: AgentRole[],
  routingPolicies: RoutingPolicy[],
  mcpServerIds: string[] = [],
  capturedAt = String(Date.now()),
): ExecutionIdentitySnapshot {
  const policy = resolveRoutingPolicy(task, routingPolicies);
  const identities = policy.roleRoutes.map((routeEntry) => {
    const agent = agents.find((item) => item.id === routeEntry.roleId);
    const provider = providers.find((item) => item.id === routeEntry.primaryProviderId);
    return {
      roleId: routeEntry.roleId,
      configuredProviderId: routeEntry.primaryProviderId,
      providerId: provider?.id ?? routeEntry.primaryProviderId,
      providerName: provider?.name ?? routeEntry.primaryProviderId,
      vendor: provider?.vendor ?? "custom",
      adapterId: provider?.adapterId ?? ("generic-cli/v1" as ProviderAdapterId),
      invocationProfileId: provider?.invocationProfileId ?? provider?.adapterId ?? "generic-cli/v1",
      modelId:
        routeEntry.modelId ??
        (agent?.providerId === routeEntry.primaryProviderId ? agent.model : undefined) ??
        provider?.modelIds?.[0] ??
        "default",
      runMode: provider?.runMode ?? "mock",
      capabilities: [...(provider?.capabilities ?? [])].sort(),
      fallbackProviderIds: [...routeEntry.fallbackProviderIds],
    };
  });
  const unsigned = {
    schemaVersion: 1 as const,
    routingPolicyId: policy.id,
    legacyProviderStrategy: policy.legacyProviderStrategy ?? task.providerStrategy,
    capturedAt,
    providers: identities,
    mcpServerIds: [...mcpServerIds].sort(),
  };
  const config = {
    schemaVersion: unsigned.schemaVersion,
    routingPolicyId: unsigned.routingPolicyId,
    legacyProviderStrategy: unsigned.legacyProviderStrategy,
    providers: unsigned.providers,
    mcpServerIds: unsigned.mcpServerIds,
  };
  return { ...unsigned, configChecksum: stableConfigChecksum(config) };
}

const HARNESS_COMPATIBILITY_ROLES = ["lead", "developer", "devops", "qa", "reviewer", "security", "product"];

export function buildHarnessExecutionIdentitySnapshot(
  task: Task,
  providers: Provider[],
  agents: AgentRole[],
  routingPolicies: RoutingPolicy[],
  mcpServerIds: string[] = [],
  capturedAt = String(Date.now()),
): ExecutionIdentitySnapshot {
  const configured = buildExecutionIdentitySnapshot(task, providers, agents, routingPolicies, mcpServerIds, capturedAt);
  const effectiveProviders = configured.providers
    .filter((identity) => HARNESS_COMPATIBILITY_ROLES.includes(identity.roleId))
    .map((identity) => {
      const effectiveProviderId = identity.roleId === "devops" ? "local_terminal" : "mock_adapter";
      const effectiveProvider = providers.find((provider) => provider.id === effectiveProviderId);
      return {
        ...identity,
        providerId: effectiveProvider?.id ?? effectiveProviderId,
        providerName: effectiveProvider?.name ?? effectiveProviderId,
        vendor: effectiveProvider?.vendor ?? (effectiveProviderId === "mock_adapter" ? "dbc" : "local"),
        adapterId:
          effectiveProvider?.adapterId ??
          (effectiveProviderId === "mock_adapter" ? "mock/v1" : "local-runner/v1"),
        invocationProfileId:
          effectiveProvider?.invocationProfileId ??
          (effectiveProviderId === "mock_adapter" ? "mock/deterministic/v1" : "local-runner/policy-command/v1"),
        modelId: effectiveProvider?.modelIds?.[0] ?? (effectiveProviderId === "mock_adapter" ? "deterministic" : "local"),
        runMode: effectiveProvider?.runMode ?? "mock",
        capabilities: [...(effectiveProvider?.capabilities ?? [])].sort(),
      } as ExecutionProviderIdentity;
    });
  const unsigned = {
    ...configured,
    providers: effectiveProviders,
  };
  const checksumPayload = {
    schemaVersion: unsigned.schemaVersion,
    routingPolicyId: unsigned.routingPolicyId,
    legacyProviderStrategy: unsigned.legacyProviderStrategy,
    providers: unsigned.providers,
    mcpServerIds: unsigned.mcpServerIds,
  };
  return { ...unsigned, configChecksum: stableConfigChecksum(checksumPayload) };
}

export function normalizeExecutionIdentitySnapshot(value: unknown): ExecutionIdentitySnapshot {
  const legacyFallback = {
    schemaVersion: 1 as const,
    routingPolicyId: LEGACY_ROUTING_POLICY_IDS.codex_build_claude_review,
    legacyProviderStrategy: "codex_build_claude_review" as const,
    capturedAt: "",
    providers: [],
    mcpServerIds: [],
  };
  if (!value || typeof value !== "object") {
    const { capturedAt: _capturedAt, ...legacyConfig } = legacyFallback;
    return { ...legacyFallback, configChecksum: stableConfigChecksum(legacyConfig) };
  }
  const candidate = value as Partial<ExecutionIdentitySnapshot>;
  const normalized = {
    schemaVersion: 1 as const,
    routingPolicyId:
      typeof candidate.routingPolicyId === "string" && candidate.routingPolicyId
        ? candidate.routingPolicyId
        : legacyFallback.routingPolicyId,
    legacyProviderStrategy:
      candidate.legacyProviderStrategy && candidate.legacyProviderStrategy in LEGACY_ROUTING_POLICY_IDS
        ? candidate.legacyProviderStrategy
        : legacyFallback.legacyProviderStrategy,
    capturedAt: typeof candidate.capturedAt === "string" ? candidate.capturedAt : "",
    providers: Array.isArray(candidate.providers)
      ? candidate.providers.map((identity) => ({
          ...identity,
          configuredProviderId: identity.configuredProviderId ?? identity.providerId ?? "unknown",
        }))
      : [],
    mcpServerIds: Array.isArray(candidate.mcpServerIds) ? candidate.mcpServerIds : [],
  };
  const checksumPayload = {
    schemaVersion: normalized.schemaVersion,
    routingPolicyId: normalized.routingPolicyId,
    legacyProviderStrategy: normalized.legacyProviderStrategy,
    providers: normalized.providers,
    mcpServerIds: normalized.mcpServerIds,
  };
  return {
    ...normalized,
    configChecksum:
      typeof candidate.configChecksum === "string" && candidate.configChecksum
        ? candidate.configChecksum
        : stableConfigChecksum(checksumPayload),
  };
}

export function stableConfigChecksum(value: unknown) {
  const text = stableStringify(value);
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) + hash) ^ text.charCodeAt(index);
  return `dbc-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
