import type {
  ModelCatalogEntry,
  NormalizedProviderUsage,
  Provider,
  StepStructuredReport,
} from "./types";

export const curatedModelCatalog: ModelCatalogEntry[] = [
  {
    id: "qwen3.7-max",
    providerId: "qwen_api",
    vendor: "alibaba",
    displayName: "Qwen 3.7 Max",
    capabilities: ["plan", "write_code", "review_diff", "tool_calling", "structured_output", "vision"],
    contextWindow: 1_000_000,
    costTier: "high",
    latencyTier: "standard",
    dataResidency: "unknown",
    status: "recommended",
    sourceUrl: "https://help.aliyun.com/en/model-studio/text-generation-model/",
    verifiedAt: "2026-08-12",
  },
  {
    id: "qwen3.7-plus",
    providerId: "qwen_api",
    vendor: "alibaba",
    displayName: "Qwen 3.7 Plus",
    capabilities: ["plan", "write_code", "review_diff", "tool_calling", "structured_output", "vision"],
    contextWindow: 1_000_000,
    costTier: "medium",
    latencyTier: "standard",
    dataResidency: "unknown",
    status: "recommended",
    sourceUrl: "https://help.aliyun.com/en/model-studio/text-generation-model/",
    verifiedAt: "2026-08-12",
  },
  {
    id: "qwen3.7-flash",
    providerId: "qwen_api",
    vendor: "alibaba",
    displayName: "Qwen 3.7 Flash",
    capabilities: ["plan", "review_diff", "tool_calling", "structured_output", "vision"],
    contextWindow: 1_000_000,
    costTier: "low",
    latencyTier: "fast",
    dataResidency: "unknown",
    status: "recommended",
    sourceUrl: "https://help.aliyun.com/en/model-studio/text-generation-model/",
    verifiedAt: "2026-08-12",
  },
  {
    id: "kimi-k2.5",
    providerId: "kimi_api",
    vendor: "moonshot",
    displayName: "Kimi K2.5",
    capabilities: ["plan", "write_code", "review_diff", "tool_calling", "structured_output", "vision"],
    contextWindow: 0,
    costTier: "medium",
    latencyTier: "standard",
    dataResidency: "unknown",
    status: "supported",
    sourceUrl: "https://platform.moonshot.ai/docs/guide/prompt-best-practice",
    verifiedAt: "2026-08-12",
  },
];

export const defaultApiProviders: Provider[] = [
  {
    id: "qwen_api",
    name: "Qwen API (OpenAI-compatible)",
    vendor: "alibaba",
    adapterId: "qwen/openai-compatible/v1",
    invocationProfileId: "qwen/openai-compatible-chat/v1",
    type: "api",
    enabled: false,
    health: "unknown",
    command: "",
    argsTemplate: "",
    versionArgs: "",
    promptMode: "stdin",
    runMode: "mock",
    timeoutSeconds: 120,
    maxOutputBytes: 500_000,
    capabilities: ["plan", "write_code", "review_diff", "tool_calling", "structured_output", "vision"],
    modelIds: ["qwen3.7-plus", "qwen3.7-flash", "qwen3.7-max"],
    assignedRoles: [],
    endpointUrl: "",
    apiProtocol: "openai_chat_completions",
    secretRef: "",
    catalogSource: "https://help.aliyun.com/en/model-studio/models",
    region: "",
    costTier: "medium",
    latencyTier: "standard",
    dataResidency: "unknown",
    egressRequired: true,
    recoveryAction: "Enter the workspace-specific Model Studio compatible-mode endpoint and an OS keychain reference.",
  },
  {
    id: "kimi_api",
    name: "Kimi API (OpenAI-compatible)",
    vendor: "moonshot",
    adapterId: "kimi/openai-compatible/v1",
    invocationProfileId: "kimi/openai-compatible-chat/v1",
    type: "api",
    enabled: false,
    health: "unknown",
    command: "",
    argsTemplate: "",
    versionArgs: "",
    promptMode: "stdin",
    runMode: "mock",
    timeoutSeconds: 120,
    maxOutputBytes: 500_000,
    capabilities: ["plan", "write_code", "review_diff", "tool_calling", "structured_output", "vision"],
    modelIds: ["kimi-k2.5"],
    assignedRoles: [],
    endpointUrl: "https://api.moonshot.ai/v1",
    apiProtocol: "openai_chat_completions",
    secretRef: "",
    catalogSource: "https://platform.moonshot.ai/docs/",
    region: "global",
    costTier: "medium",
    latencyTier: "standard",
    dataResidency: "unknown",
    egressRequired: true,
    recoveryAction: "Confirm the current Moonshot endpoint/model contract and add an OS keychain reference before enabling.",
  },
];

export function validateApiProvider(provider: Provider, catalog: ModelCatalogEntry[]) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (provider.type !== "api") errors.push("Provider type must be api.");
  try {
    const url = new URL(provider.endpointUrl ?? "");
    if (url.protocol !== "https:") errors.push("API endpoint must use HTTPS.");
  } catch {
    errors.push("A valid API endpoint is required.");
  }
  if (!/^keychain:[A-Za-z0-9._/-]{3,}$/.test(provider.secretRef ?? "")) {
    errors.push("API credentials must use a keychain:service/account reference.");
  }
  if (provider.apiProtocol !== "openai_chat_completions") warnings.push("Only the OpenAI-compatible Chat Completions contract is verified in this build.");
  if (!(provider.modelIds ?? []).some((id) => catalog.some((model) => model.id === id && model.providerId === provider.id))) {
    errors.push("Select at least one model from this provider's verified catalog.");
  }
  if (!provider.region) warnings.push("Region/data residency is unknown and must be reviewed before a real run.");
  return { valid: errors.length === 0, errors, warnings };
}

export function buildOpenAiCompatibleRequest(provider: Provider, modelId: string, prompt: string) {
  const validation = validateApiProvider(provider, curatedModelCatalog);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  return {
    url: `${(provider.endpointUrl ?? "").replace(/\/$/, "")}/chat/completions`,
    method: "POST",
    secretRef: provider.secretRef ?? "",
    body: {
      model: modelId,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      stream: false,
    },
  };
}

export function normalizeOpenAiUsage(
  providerId: string,
  modelId: string,
  usage: Record<string, unknown> | undefined,
  catalog: ModelCatalogEntry[] = curatedModelCatalog,
): NormalizedProviderUsage {
  const inputTokens = numeric(usage?.prompt_tokens ?? usage?.input_tokens);
  const outputTokens = numeric(usage?.completion_tokens ?? usage?.output_tokens);
  const cachedInputTokens = numeric(
    (usage?.prompt_tokens_details as Record<string, unknown> | undefined)?.cached_tokens ?? usage?.cached_input_tokens,
  );
  const totalTokens = numeric(usage?.total_tokens) || inputTokens + outputTokens;
  const model = catalog.find((item) => item.providerId === providerId && item.id === modelId);
  const hasPrices = typeof model?.inputCostPerMillion === "number" && typeof model?.outputCostPerMillion === "number";
  const amount = hasPrices
    ? (inputTokens * model.inputCostPerMillion! + outputTokens * model.outputCostPerMillion!) / 1_000_000
    : 0;
  return {
    providerId,
    modelId,
    inputTokens,
    outputTokens,
    cachedInputTokens,
    totalTokens,
    amount,
    currency: hasPrices ? model?.currency ?? "unknown" : "unknown",
    confidence: hasPrices ? "estimated" : "unknown",
  };
}

export function normalizeOpenAiStructuredReport(response: Record<string, unknown>): StepStructuredReport {
  const choices = Array.isArray(response.choices) ? response.choices : [];
  const message = choices[0] && typeof choices[0] === "object"
    ? (choices[0] as Record<string, unknown>).message as Record<string, unknown> | undefined
    : undefined;
  const text = typeof message?.content === "string" ? message.content : "";
  try {
    const parsed = JSON.parse(text) as Partial<StepStructuredReport>;
    return {
      verdict: parsed.verdict ?? "blocked",
      summary: parsed.summary ?? "Provider returned structured JSON without a summary.",
      actions: arrayOfStrings(parsed.actions),
      filesTouched: arrayOfStrings(parsed.filesTouched),
      evidence: arrayOfStrings(parsed.evidence),
      risks: arrayOfStrings(parsed.risks),
      nextAction: parsed.nextAction ?? "Review provider output.",
    };
  } catch {
    return {
      verdict: text ? "request_changes" : "blocked",
      summary: text || "API provider returned no assistant content.",
      actions: [], filesTouched: [], evidence: [], risks: ["Response did not match StepStructuredReport JSON."],
      nextAction: "Review raw response and repair the adapter contract.",
    };
  }
}

export function mergeVerifiedModelCatalog(current: ModelCatalogEntry[], incoming: ModelCatalogEntry[]) {
  const valid = incoming.filter((model) =>
    Boolean(model.id && model.providerId && model.sourceUrl && /^https:\/\//.test(model.sourceUrl) && model.verifiedAt),
  );
  const byId = new Map(current.map((model) => [`${model.providerId}:${model.id}`, model]));
  for (const model of valid) byId.set(`${model.providerId}:${model.id}`, model);
  return [...byId.values()].sort((left, right) => `${left.providerId}:${left.id}`.localeCompare(`${right.providerId}:${right.id}`));
}

function numeric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
