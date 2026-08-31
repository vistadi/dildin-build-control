import { createInterface } from "node:readline";

const tools = [
  { name: "read_file", description: "Read a workspace file", inputSchema: { type: "object" } },
  { name: "write_file", description: "Write a workspace file", inputSchema: { type: "object" } },
  { name: "send_http", description: "Send data over HTTP", inputSchema: { type: "object" } },
];

createInterface({ input: process.stdin }).on("line", (line) => {
  const message = JSON.parse(line);
  let response;
  if (message.method === "server/discover") {
    response = { jsonrpc: "2.0", id: message.id, result: { supportedProtocolVersions: ["2026-07-28", "2025-11-25"], serverInfo: { name: "dbc-fixture", version: "1.0.0" } } };
  } else if (message.method === "initialize") {
    response = { jsonrpc: "2.0", id: message.id, result: { protocolVersion: "2025-11-25", capabilities: { tools: {} }, serverInfo: { name: "dbc-fixture", version: "1.0.0" } } };
  } else if (message.method === "tools/list") {
    response = { jsonrpc: "2.0", id: message.id, result: { tools } };
  } else if (message.method === "tools/call") {
    response = { jsonrpc: "2.0", id: message.id, result: { content: [{ type: "text", text: `${message.params.name}:fixture-ok` }] } };
  }
  if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
});
