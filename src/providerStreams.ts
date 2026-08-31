import type { ProviderAdapterId, ProviderStreamReport, ProviderStreamToolCall } from "./types";

export function normalizeProviderStream(
  adapterId: ProviderAdapterId | undefined,
  stdout: string,
  stderr = "",
  exitCode: number | undefined = 0,
): ProviderStreamReport {
  const providerKind = adapterId?.startsWith("kimi/") ? "kimi" : adapterId?.startsWith("qwen/") ? "qwen" : "generic";
  if (providerKind === "generic") return textReport(stdout, stderr, exitCode);

  const events: Record<string, unknown>[] = [];
  let malformedLineCount = 0;
  for (const line of stdout.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    try {
      const value = JSON.parse(line);
      if (value && typeof value === "object" && !Array.isArray(value)) events.push(value as Record<string, unknown>);
      else malformedLineCount += 1;
    } catch {
      malformedLineCount += 1;
    }
  }

  const toolCalls: ProviderStreamToolCall[] = [];
  const errors: string[] = [];
  let sessionId = "";
  let modelId = "";
  let finalText = "";
  let usage: Record<string, unknown> = {};

  for (const event of events) {
    sessionId ||= stringValue(event.session_id) || stringValue(event.sessionId);
    modelId ||= stringValue(event.model);
    if (providerKind === "kimi") parseKimiEvent(event, toolCalls, errors, (text) => (finalText = text || finalText));
    else parseQwenEvent(event, toolCalls, errors, (text) => (finalText = text || finalText));
    const eventUsage = recordValue(event.usage) ?? recordValue(recordValue(event.stats)?.usage) ?? recordValue(recordValue(event.stats)?.models);
    if (eventUsage) usage = eventUsage;
    modelId ||= stringValue(recordValue(event.message)?.model);
  }

  const stderrText = stderr.trim();
  if (stderrText && exitCode && exitCode !== 0) errors.push(stderrText);
  const outcome = exitCode && exitCode !== 0 ? "failed" : errors.length || malformedLineCount ? "partial" : events.length ? "success" : "unknown";
  return {
    schemaVersion: 1,
    providerKind,
    format: "stream-json",
    eventCount: events.length,
    malformedLineCount,
    sessionId,
    modelId,
    finalText,
    toolCalls,
    usage,
    errors: unique(errors),
    outcome,
  };
}

function parseKimiEvent(
  event: Record<string, unknown>,
  toolCalls: ProviderStreamToolCall[],
  errors: string[],
  setFinalText: (text: string) => void,
) {
  const role = stringValue(event.role);
  const content = textContent(event.content);
  if (role === "assistant" && content) setFinalText(content);
  for (const call of arrayValue(event.tool_calls)) {
    const record = recordValue(call);
    if (!record) continue;
    const fn = recordValue(record.function);
    toolCalls.push({
      id: stringValue(record.id),
      name: stringValue(fn?.name) || stringValue(record.name) || "unknown",
      status: "requested",
      error: "",
    });
  }
  if (role === "tool") {
    const id = stringValue(event.tool_call_id);
    const denied = /denied|not allowed|forbidden/i.test(content);
    mergeToolResult(toolCalls, id, denied ? "denied" : "completed", denied ? content : "");
  }
  if (role === "error" || stringValue(event.type) === "error") errors.push(content || stringValue(event.error));
}

function parseQwenEvent(
  event: Record<string, unknown>,
  toolCalls: ProviderStreamToolCall[],
  errors: string[],
  setFinalText: (text: string) => void,
) {
  const type = stringValue(event.type);
  const message = recordValue(event.message);
  const content = arrayValue(message?.content);
  if (type === "assistant") {
    const text = content.map((item) => textContent(item)).filter(Boolean).join("\n");
    if (text) setFinalText(text);
    for (const item of content) {
      const record = recordValue(item);
      if (!record || stringValue(record.type) !== "tool_use") continue;
      toolCalls.push({ id: stringValue(record.id), name: stringValue(record.name) || "unknown", status: "requested", error: "" });
    }
  }
  if (type === "user") {
    for (const item of content) {
      const record = recordValue(item);
      if (!record || stringValue(record.type) !== "tool_result") continue;
      const failed = Boolean(record.is_error);
      mergeToolResult(toolCalls, stringValue(record.tool_use_id), failed ? "failed" : "completed", failed ? textContent(record.content) : "");
    }
  }
  if (type === "result") {
    const result = textContent(event.result);
    if (result) setFinalText(result);
    if (stringValue(event.subtype) !== "success") errors.push(textContent(event.error) || stringValue(event.subtype));
  }
  if (type === "error") errors.push(textContent(event.error) || textContent(event.message));
}

function mergeToolResult(toolCalls: ProviderStreamToolCall[], id: string, status: ProviderStreamToolCall["status"], error: string) {
  const existing = toolCalls.find((call) => call.id === id);
  if (existing) Object.assign(existing, { status, error });
  else toolCalls.push({ id, name: "unknown", status, error });
}

function textReport(stdout: string, stderr: string, exitCode: number | undefined): ProviderStreamReport {
  return {
    schemaVersion: 1,
    providerKind: "generic",
    format: "text",
    eventCount: stdout.trim() ? 1 : 0,
    malformedLineCount: 0,
    sessionId: "",
    modelId: "",
    finalText: stdout.trim(),
    toolCalls: [],
    usage: {},
    errors: exitCode && exitCode !== 0 && stderr.trim() ? [stderr.trim()] : [],
    outcome: exitCode && exitCode !== 0 ? "failed" : stdout.trim() ? "success" : "unknown",
  };
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function textContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textContent).filter(Boolean).join("\n");
  const record = recordValue(value);
  if (!record) return "";
  return stringValue(record.text) || stringValue(record.content) || stringValue(record.message) || stringValue(record.error);
}

function unique(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}
