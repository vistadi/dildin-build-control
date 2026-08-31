import assert from "node:assert/strict";

const api = await import("../src/apiAdapters.ts");

assert.ok(api.curatedModelCatalog.length >= 4);
assert.ok(api.curatedModelCatalog.every((model) => model.sourceUrl.startsWith("https://") && model.verifiedAt));
assert.ok(api.curatedModelCatalog.some((model) => model.id === "qwen3.7-plus"));
assert.ok(api.curatedModelCatalog.some((model) => model.id === "kimi-k2.5"));

const qwen = api.defaultApiProviders.find((provider) => provider.id === "qwen_api");
assert.ok(qwen);
assert.equal(api.validateApiProvider(qwen, api.curatedModelCatalog).valid, false);
const configured = {
  ...qwen,
  endpointUrl: "https://workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
  secretRef: "keychain:dbc-qwen/test-account",
  region: "cn-beijing",
  modelIds: ["qwen3.7-plus"],
};
assert.equal(api.validateApiProvider(configured, api.curatedModelCatalog).valid, true);
const request = api.buildOpenAiCompatibleRequest(configured, "qwen3.7-plus", "Return JSON only.");
assert.equal(request.url.endsWith("/chat/completions"), true);
assert.equal(request.secretRef, configured.secretRef);
assert.equal(JSON.stringify(request).includes("sk-"), false);

const usage = api.normalizeOpenAiUsage("qwen_api", "qwen3.7-plus", {
  prompt_tokens: 100,
  completion_tokens: 40,
  total_tokens: 140,
  prompt_tokens_details: { cached_tokens: 20 },
});
assert.deepEqual(
  { input: usage.inputTokens, output: usage.outputTokens, cached: usage.cachedInputTokens, total: usage.totalTokens },
  { input: 100, output: 40, cached: 20, total: 140 },
);
assert.equal(usage.confidence, "unknown");

const report = api.normalizeOpenAiStructuredReport({ choices: [{ message: { content: JSON.stringify({
  verdict: "pass", summary: "Fixture passed.", actions: ["none"], filesTouched: [], evidence: ["fixture"], risks: [], nextAction: "accept",
}) } }] });
assert.equal(report.verdict, "pass");
assert.equal(report.summary, "Fixture passed.");

const updated = api.mergeVerifiedModelCatalog(api.curatedModelCatalog, [{
  ...api.curatedModelCatalog[1], status: "deprecated", deprecatedAfter: "2027-01-01", verifiedAt: "2026-08-13",
}]);
assert.equal(updated.find((model) => model.id === api.curatedModelCatalog[1].id)?.status, "deprecated");

console.log("API adapter contract smoke: catalog, keychain references, request shape, usage, and structured report passed.");
