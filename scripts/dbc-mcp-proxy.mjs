#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { evaluateMcpToolCall } from "../src/mcp.ts";

function fail(message) {
  process.stderr.write(`[dbc-mcp-proxy] ${message}\n`);
  process.exit(2);
}

function parseCli(argv) {
  const separator = argv.indexOf("--");
  if (separator < 0 || !argv[separator + 1]) fail("Expected --config, --project, --run, --connection and an upstream command after --.");
  const options = {};
  for (let index = 0; index < separator; index += 2) {
    const key = argv[index]?.replace(/^--/, "");
    const value = argv[index + 1];
    if (!key || value === undefined) fail("Malformed proxy arguments.");
    options[key] = value;
  }
  return { options, command: argv[separator + 1], args: argv.slice(separator + 2) };
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function redact(value) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [REDACTED]")
    .replace(/(token|api[_-]?key|password|secret)\s*[:=]\s*\S+/gi, "$1=[REDACTED]");
}

const { options, command, args } = parseCli(process.argv.slice(2));
for (const key of ["config", "project", "run", "connection"]) {
  if (!options[key]) fail(`Missing --${key}.`);
}
const projectPath = resolve(options.project);
const config = readJson(resolve(options.config), null);
if (!config?.policy?.id || !config?.connection?.id) fail("Config must contain a connection and an enabled tool policy.");
if (config.connection.id !== options.connection) fail("Connection ID does not match the proxy config.");
if (!config.policy.enabled) fail("Tool policy is disabled.");

const evidencePath = join(projectPath, ".dbc", "evidence", "mcp", `${options.run.replace(/[^A-Za-z0-9_-]/g, "-")}.jsonl`);
const approvalPath = join(projectPath, ".dbc", "approvals", "mcp", `${options.run.replace(/[^A-Za-z0-9_-]/g, "-")}.json`);
mkdirSync(dirname(evidencePath), { recursive: true });
const priorEvidence = existsSync(evidencePath)
  ? readFileSync(evidencePath, "utf8").split("\n").filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    }).filter((item) => item.schemaVersion === 1 && item.toolName && !item.outcome)
  : [];
const toolCatalog = new Map((config.connection.discoveredTools ?? []).map((tool) => [tool.name, tool]));
const pendingCalls = new Map();

const upstream = spawn(command, args, { cwd: projectPath, stdio: ["pipe", "pipe", "pipe"], env: process.env });
upstream.on("error", (error) => fail(`Upstream MCP server failed to start: ${error.message}`));
upstream.on("exit", (code, signal) => process.exitCode = code ?? (signal ? 1 : 0));
createInterface({ input: upstream.stderr }).on("line", (line) => process.stderr.write(`[mcp-upstream] ${redact(line)}\n`));

function writeEvidence(evidence) {
  const record = { ...evidence, evidencePath };
  appendFileSync(evidencePath, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600 });
  if (record.schemaVersion === 1 && !record.outcome) priorEvidence.push(record);
  return record;
}

function sendClient(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function approvalGranted(toolName) {
  const ledger = readJson(approvalPath, []);
  return Array.isArray(ledger) && ledger.some((grant) =>
    grant.status === "approved" &&
    grant.runId === options.run &&
    grant.connectionId === options.connection &&
    (grant.toolName === toolName || grant.toolName === "*") &&
    grant.scope === "run"
  );
}

createInterface({ input: process.stdin }).on("line", (line) => {
  let message;
  try { message = JSON.parse(line); } catch {
    sendClient({ jsonrpc: "2.0", error: { code: -32700, message: "DBC proxy rejected malformed JSON-RPC." }, id: null });
    return;
  }
  if (message.method !== "tools/call") {
    upstream.stdin.write(`${JSON.stringify(message)}\n`);
    return;
  }
  const toolName = String(message.params?.name ?? "unknown");
  const tool = toolCatalog.get(toolName) ?? {
    name: toolName,
    description: "Tool was not present in the discovery catalog.",
    inputSchema: {},
    intent: "unknown",
    discoveredAt: String(Date.now()),
  };
  const idempotencyKey = String(message.params?._meta?.["dbc/idempotencyKey"] ?? `${options.run}:${options.connection}:${JSON.stringify(message.id)}`);
  const evidence = writeEvidence(evaluateMcpToolCall({
    projectPath,
    runId: options.run,
    connectionId: options.connection,
    policy: config.policy,
    tool,
    arguments: message.params?.arguments ?? {},
    idempotencyKey,
    attempt: Number(message.params?._meta?.["dbc/attempt"] ?? 1),
    approvalGranted: approvalGranted(toolName),
  }, priorEvidence));
  if (!evidence.shouldExecute) {
    sendClient({
      jsonrpc: "2.0",
      id: message.id ?? null,
      error: {
        code: evidence.decision === "approval_required" ? -32002 : -32003,
        message: `DBC MCP policy: ${evidence.reason}`,
        data: { decision: evidence.decision, evidenceId: evidence.id, duplicateReplayed: evidence.duplicateReplayed },
      },
    });
    return;
  }
  pendingCalls.set(JSON.stringify(message.id), evidence);
  upstream.stdin.write(`${JSON.stringify(message)}\n`);
});

createInterface({ input: upstream.stdout }).on("line", (line) => {
  let message;
  try { message = JSON.parse(line); } catch {
    process.stderr.write("[dbc-mcp-proxy] Dropped malformed upstream JSONL.\n");
    return;
  }
  const tools = message.result?.tools;
  if (Array.isArray(tools)) {
    for (const tool of tools) if (tool?.name) toolCatalog.set(tool.name, tool);
  }
  const key = JSON.stringify(message.id);
  const evidence = pendingCalls.get(key);
  if (evidence) {
    writeEvidence({
      schemaVersion: 1,
      id: `${evidence.id}-outcome`,
      runId: evidence.runId,
      connectionId: evidence.connectionId,
      policyId: evidence.policyId,
      toolName: evidence.toolName,
      intent: evidence.intent,
      decision: message.error ? "deny" : "allow",
      reason: message.error ? "Upstream MCP tool returned an error." : "Upstream MCP tool completed.",
      shouldExecute: false,
      duplicateReplayed: false,
      idempotencyKey: evidence.idempotencyKey,
      attempt: evidence.attempt,
      argumentChecksum: evidence.argumentChecksum,
      observedPaths: evidence.observedPaths,
      observedHosts: evidence.observedHosts,
      createdAt: String(Date.now()),
      outcome: message.error ? "failed" : "completed",
    });
    pendingCalls.delete(key);
  }
  sendClient(message);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    upstream.kill(signal);
    process.exit(0);
  });
}
