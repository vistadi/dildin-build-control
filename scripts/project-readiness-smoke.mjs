import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { stringify } from "yaml";
import { parseProviderDocument, parseProviders, providerProfile } from "./lib/providers.mjs";
import { distributionEvidence } from "./lib/distribution-evidence.mjs";
import { loadMicroTask } from "./lib/micro-task.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const native = readFileSync(new URL("./fixtures/providers-native-sync.yaml", import.meta.url), "utf8");
const nativeValue = parseProviderDocument(native);
assert.equal(nativeValue.providers[0].argsTemplate, 'exec --cd "{{cwd}}"');
assert.equal(nativeValue.providers[0].enabled, true);
assert.deepEqual(nativeValue.providers[0].assignedRoles, []);
assert.deepEqual(parseProviderDocument(stringify(nativeValue)), nativeValue);
const legacy = 'version: 1\nkind: providers\nproviders:\n  - id: codex_cli\n    enabled: "false"\n    command: /some/path\n    runMode: mock\n    type: cli\n';
assert.equal(parseProviders(legacy)[0].enabled, false);
assert.equal(parseProviders(legacy.replaceAll("\n", "\r\n"))[0].id, "codex_cli");
assert.deepEqual(parseProviders(JSON.stringify(nativeValue)), nativeValue.providers);
const real = providerProfile(native, () => "real", "new");
assert.equal(parseProviders(real)[0].runMode, "real");
assert.deepEqual(parseProviders(real)[0].capabilities, ["plan"]);
assert.equal(parseProviders(providerProfile(real, () => "mock", "later"))[0].runMode, "mock");
for (const bad of ["", "providers: []", "providers: [", legacy + "kind: providers\n", legacy.replace("enabled: \"false\"", "enabled: maybe"),
  legacy.replace("codex_cli", "[invalid]"), legacy.replace("/some/path", "123"), legacy.replace("/some/path", "!unsupported /some/path"),
  stringify({ ...nativeValue, providers: [structuredClone(nativeValue.providers[0]), structuredClone(nativeValue.providers[0])] }),
  "version: 1\nkind: providers\nproviders: &list [*list]\n", legacy + "---\n{}\n"]) {
  assert.throws(() => parseProviders(bad), /Invalid providers/);
}
for (const release of [undefined, { checklist: {} }, { checklist: { appExists: false } }, { checklist: { appExists: true } }]) {
  assert.equal(distributionEvidence(release).level, "info");
}

const temporary = mkdtempSync(path.join(tmpdir(), "dbc-readiness-test-"));
try {
  const dbc = path.join(temporary, ".dbc");
  const write = (name, value) => { const file = path.join(dbc, name); mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value)); };
  const read = name => JSON.parse(readFileSync(path.join(dbc, name), "utf8"));
  const invoke = (name, args = [], expected = 0) => {
    const result = spawnSync(process.execPath, [path.join(root, "scripts", name + ".mjs"), ...args], { cwd: temporary, encoding: "utf8", timeout: 10000 });
    assert.equal(result.status, expected, `${name}: unexpected exit status`);
    return result;
  };
  // Synthetic readiness reports are confined to this unit-test directory. No
  // model is called: configured executable is Node, used only for path checks.
  const providers = ["codex_cli", "claude_code", "local_terminal", "other"].map(id => ({
    ...structuredClone(nativeValue.providers[0]), id, command: process.execPath, type: id === "local_terminal" ? "local_runner" : "cli",
    metadata: { preserved: true }, runMode: "mock",
  }));
  write("providers.yaml", stringify({ version: 1, kind: "providers", providers }));
  invoke("provider-profile", ["generate"]);
  invoke("provider-profile", ["apply-real-micro"], 1);
  assert.ok(parseProviders(readFileSync(path.join(dbc, "providers.yaml"), "utf8")).every(p => p.runMode === "mock"));
  write("readiness/latest.json", { kind: "real-loop-readiness", status: "ready", blockers: [], warnings: [] });
  write("compare/latest.json", { status: "pending_real", blockers: [] });
  invoke("real-micro-plan");
  assert.equal(read("real-loop/latest.json").status, "prepared");
  assert.equal(existsSync(path.join(dbc, "release/latest.json")), false);
  const task = read("tasks/REAL-MICRO-README.json");
  assert.equal(loadMicroTask(task, []).id, task.id);
  for (const change of [{ budgetLimit: 0 }, { budgetLimit: Infinity }, { allowedPaths: ["../escape"] }, { deniedPaths: [] }]) {
    assert.throws(() => loadMicroTask({ ...task, ...change }, []));
  }
  const custom = path.join(temporary, "custom-task.json");
  writeFileSync(custom, JSON.stringify({ ...task, budgetLimit: 2, brief: "Change only the approved README marker." }));
  invoke("real-micro-plan", ["--task-file", custom]);
  assert.equal(read("real-loop/latest.json").execution.budget.realCliCallLimit, 8);
  invoke("operator-checklist");
  assert.equal(read("operator/latest.json").status, "awaiting_human_approval");
  assert.equal(read("operator/latest.json").blockers.length, 0);
  invoke("operator-approve", [], 1);
  invoke("operator-approve", ["--confirm", "I APPROVE REAL MICRO LOOP"]);
  invoke("provider-profile", ["apply-real-micro"]);
  const switched = parseProviders(readFileSync(path.join(dbc, "providers.yaml"), "utf8"));
  assert.deepEqual(switched.map(p => p.runMode), ["real", "real", "real", "mock"]);
  assert.ok(switched.every(p => p.metadata.preserved));
  invoke("provider-profile", ["apply-mock"]);
  assert.ok(parseProviders(readFileSync(path.join(dbc, "providers.yaml"), "utf8")).every(p => p.runMode === "mock"));
  // Readiness errors remain blocking even though packaging is independent.
  write("readiness/latest.json", { status: "blocked", blockers: [{ subject: "baseline", detail: "failed" }] });
  invoke("real-micro-plan", [], 1);
  invoke("operator-checklist", [], 1);
  invoke("operator-approve", ["--confirm", "I APPROVE REAL MICRO LOOP"], 1);
  invoke("provider-profile", ["apply-real-micro"], 1);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
console.log("Project readiness smoke passed: native/legacy YAML, strict parsing, profile round-trip, generic project, approval and blocked readiness.");
