import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../src-tauri/src/main.rs", import.meta.url), "utf8");
const harness = readFileSync(new URL("../src-tauri/src/harness.rs", import.meta.url), "utf8");
const config = JSON.parse(readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"));

const commands = [
  "test_mcp_connection",
  "evaluate_mcp_tool_call",
  "record_mcp_approval",
  "test_secret_ref",
  "generate_evidence_pack",
  "accept_or_rework_harness_result",
];
const checks = [
  ...commands.map((command) => [main.includes(command), `native command registered: ${command}`]),
  [harness.includes("schema_version: 2"), "EvidencePack v2 is emitted"],
  [harness.includes("EvidencePack v2 verification is incomplete"), "native acceptance blocks incomplete evidence"],
  [config.bundle?.active === true, "desktop bundling is enabled"],
  [Array.isArray(config.bundle?.targets) || config.bundle?.targets === "all", "desktop bundle targets are declared"],
  [config.app?.security?.csp !== null, "desktop Content Security Policy is explicit"],
];

let failed = false;
for (const [ok, label] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  failed ||= !ok;
}
if (failed) process.exitCode = 1;
else console.log(`Native contract smoke passed (${checks.length} assertions).`);
