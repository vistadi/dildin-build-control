import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z0-9]+$/i.test(specifier)) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return { shortCircuit: true, url: candidate.href };
    }
    return nextResolve(specifier, context);
  },
});

const fixture = JSON.parse(
  readFileSync(new URL("../tests/fixtures/provider-adapters.v1.json", import.meta.url), "utf8"),
);
const cli = await import("../src/cliContracts.ts");
const adapters = await import("../src/providerAdapters.ts");
const routing = await import("../src/routing.ts");
const streams = await import("../src/providerStreams.ts");

assert.equal(fixture.schemaVersion, 1);

for (const contract of fixture.adapters) {
  const adapter = adapters.adapterForCommand(contract.command);
  assert.equal(adapter.id, contract.adapterId, `${contract.command}: adapter id`);
  assert.equal(
    cli.normalizeCliArgsTemplate(contract.command, ""),
    contract.emptyArgsExpected,
    `${contract.command}: default arguments`,
  );
  assert.equal(
    cli.normalizeCliPromptMode(contract.command, "", "arg"),
    contract.promptModeExpected,
    `${contract.command}: prompt mode`,
  );

  const originalArgs = contract.unsafeArgs ?? contract.emptyArgsExpected;
  const normalizedArgs = cli.normalizeCliArgsTemplate(contract.command, originalArgs);
  if (contract.safeArgsExpected) {
    assert.equal(normalizedArgs, contract.safeArgsExpected, `${contract.command}: unsafe arguments are removed`);
    assert.doesNotMatch(normalizedArgs, /--yolo|(?:^|\s)-y(?:\s|$)|--approval-mode\s+yolo/);
  }

  const diagnostics = cli.providerContractDiagnostics({
    id: `fixture-${contract.command}`,
    name: contract.command,
    type: "cli",
    enabled: false,
    health: "unknown",
    command: contract.command,
    argsTemplate: originalArgs,
    versionArgs: "--version",
    promptMode: "arg",
    runMode: "mock",
    timeoutSeconds: 30,
    maxOutputBytes: 10000,
    capabilities: [],
    assignedRoles: [],
    lastTestResult: "",
  });
  assert.ok(
    diagnostics.some((diagnostic) => diagnostic.includes(contract.requiredDiagnostic)),
    `${contract.command}: required safety diagnostic`,
  );
}

for (const [legacyStrategy, expectedPolicyId] of Object.entries(fixture.legacyRoutes)) {
  assert.equal(routing.routingPolicyIdForLegacy(legacyStrategy), expectedPolicyId);
}

assert.equal(
  cli.normalizeCliArgsTemplate("qwen", "--approval-mode=yolo --max-tool-calls=9"),
  "--approval-mode=plan --max-tool-calls=0 --safe-mode --max-session-turns 3 --max-wall-time 120s",
  "qwen: equals-form unsafe values are normalized",
);

const mockTask = {
  providerStrategy: "mock_only",
  routingPolicyId: "route-mock-only",
};
const mockProviders = [
  {
    id: "mock_adapter",
    name: "Mock Adapter",
    vendor: "dbc",
    adapterId: "mock/v1",
    invocationProfileId: "mock/deterministic/v1",
    runMode: "mock",
    capabilities: ["structured_output", "plan"],
    modelIds: ["deterministic"],
  },
];
const firstSnapshot = routing.buildExecutionIdentitySnapshot(
  mockTask,
  mockProviders,
  [],
  routing.defaultRoutingPolicies,
  [],
  "1770000000000",
);
const laterSnapshot = routing.buildExecutionIdentitySnapshot(
  mockTask,
  mockProviders,
  [],
  routing.defaultRoutingPolicies,
  [],
  "1770000009999",
);
assert.equal(firstSnapshot.routingPolicyId, "route-mock-only");
assert.equal(firstSnapshot.providers.length, 8);
assert.equal(firstSnapshot.configChecksum, laterSnapshot.configChecksum, "capture time must not change config checksum");
assert.ok(firstSnapshot.providers.every((identity) => identity.adapterId === "mock/v1"));

const compatibilitySnapshot = routing.buildHarnessExecutionIdentitySnapshot(
  { ...mockTask, providerStrategy: "codex_build_claude_review", routingPolicyId: "route-codex-build-claude-review" },
  mockProviders,
  [],
  routing.defaultRoutingPolicies,
  [],
  "1770000000000",
);
assert.equal(compatibilitySnapshot.providers.length, 7);
assert.ok(
  compatibilitySnapshot.providers
    .filter((identity) => identity.roleId !== "devops")
    .every((identity) => identity.providerId === "mock_adapter" && identity.modelId === "deterministic"),
);
assert.equal(
  compatibilitySnapshot.providers.find((identity) => identity.roleId === "developer")?.configuredProviderId,
  "codex_cli",
);

const balancedPolicy = routing.defaultRoutingPolicies.find((policy) => policy.id === "route-balanced-kimi-qwen-read-only");
assert.ok(balancedPolicy);
assert.equal(balancedPolicy.roleRoutes.find((route) => route.roleId === "lead")?.primaryProviderId, "kimi_code");
assert.equal(balancedPolicy.roleRoutes.find((route) => route.roleId === "architect")?.primaryProviderId, "qwen_code");

const simulationProviders = [
  { ...mockProviders[0], type: "mock", enabled: true, health: "ok", costTier: "free", latencyTier: "local", dataResidency: "local" },
  { id: "local_terminal", name: "Local runner", vendor: "local", adapterId: "local-runner/v1", invocationProfileId: "local-runner/policy-command/v1", type: "local_runner", enabled: true, health: "ok", runMode: "real", capabilities: ["run_build"], modelIds: ["local"], costTier: "free", latencyTier: "local", dataResidency: "local" },
];
const fallbackPolicy = {
  id: "fixture-fallback",
  name: "Fixture fallback",
  description: "Fixture",
  fallbackRisk: "approval_required",
  enabled: true,
  roleRoutes: [{ roleId: "lead", primaryProviderId: "missing", fallbackProviderIds: ["mock_adapter"], requiredCapabilities: ["plan"], executionMode: "read_only" }],
};
const fallbackSimulation = routing.simulateRouting(fallbackPolicy, simulationProviders);
assert.equal(fallbackSimulation.status, "ready");
assert.equal(fallbackSimulation.roles[0].selectedProviderId, "mock_adapter");
assert.equal(fallbackSimulation.roles[0].attempts[1].status, "selected");
assert.equal(routing.fallbackJournalForSimulation(fallbackSimulation, "RUN-1").length, 2);

const riskyProviders = simulationProviders.map((provider) => provider.id === "mock_adapter" ? { ...provider, enabled: false } : provider);
const riskyPolicy = {
  ...fallbackPolicy,
  roleRoutes: [{ roleId: "devops", primaryProviderId: "mock_adapter", fallbackProviderIds: ["local_terminal"], requiredCapabilities: [], executionMode: "approval_required" }],
};
const riskySimulation = routing.simulateRouting(riskyPolicy, riskyProviders);
assert.equal(riskySimulation.status, "approval_required");
assert.equal(riskySimulation.roles[0].attempts[1].unsafeFallback, true);

const comparison = routing.compareReadOnlyOutputs("Plan build tests and review", "Review the plan and tests");
assert.ok(comparison.agreement > 0.4);
assert.ok(comparison.sharedTerms.includes("plan"));

const kimiStream = readFileSync(new URL("../tests/fixtures/kimi-stream.v1.jsonl", import.meta.url), "utf8");
const kimiReport = streams.normalizeProviderStream("kimi/headless-stream-json/v1", kimiStream, "", 0);
assert.equal(kimiReport.providerKind, "kimi");
assert.equal(kimiReport.outcome, "success");
assert.equal(kimiReport.eventCount, 3);
assert.equal(kimiReport.finalText, "Final Kimi review: no blocking issue.");
assert.deepEqual(kimiReport.toolCalls, [
  { id: "kimi-tool-1", name: "ReadFile", status: "completed", error: "" },
]);

const qwenStream = readFileSync(new URL("../tests/fixtures/qwen-stream.v1.jsonl", import.meta.url), "utf8");
const qwenReport = streams.normalizeProviderStream("qwen/headless-stream-json/v1", qwenStream, "", 0);
assert.equal(qwenReport.providerKind, "qwen");
assert.equal(qwenReport.outcome, "success");
assert.equal(qwenReport.eventCount, 4);
assert.equal(qwenReport.sessionId, "qwen-session-1");
assert.equal(qwenReport.modelId, "qwen3-coder-plus");
assert.equal(qwenReport.finalText, "Final Qwen review: pass.");
assert.deepEqual(qwenReport.toolCalls, [
  { id: "qwen-tool-1", name: "read_file", status: "completed", error: "" },
]);

console.log(
  `Provider adapter contract smoke passed: ${fixture.adapters.length} adapters, ${Object.keys(fixture.legacyRoutes).length} legacy routes, 2 stream fixtures.`,
);
