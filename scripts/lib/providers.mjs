import { parseDocument, stringify } from "yaml";

// Native config sync and hand-written YAML use different key/list layouts.
// Parse data, never indentation; keep parser diagnostics free of source snippets.
export function parseProviderDocument(text) {
  let value;
  try {
    const document = parseDocument(text, { prettyErrors: false, strict: true, uniqueKeys: true, version: "1.2" });
    if (document.errors.length || document.warnings.length) throw new Error();
    value = document.toJS({ maxAliasCount: 0 });
  } catch {
    throw new Error("Invalid providers YAML: expected a single document without duplicate keys, aliases or unsupported tags.");
  }
  if (!value || value.kind !== "providers" || value.version !== 1 || !Array.isArray(value.providers) || !value.providers.length) {
    throw new Error("Invalid providers contract: expected version 1, kind providers and a non-empty providers list.");
  }
  const ids = new Set();
  for (const provider of value.providers) {
    if (!provider || typeof provider !== "object" || Array.isArray(provider) || typeof provider.id !== "string" || !provider.id.trim() || ids.has(provider.id)) {
      throw new Error("Invalid providers contract: provider IDs must be non-empty and unique.");
    }
    ids.add(provider.id);
    for (const key of ["command", "argsTemplate", "type", "promptMode", "runMode", "versionArgs"]) {
      if (provider[key] !== undefined && typeof provider[key] !== "string") {
        throw new Error(`Invalid providers contract: ${key} must be a string.`);
      }
    }
    // Accept legacy quoted booleans, but do not turn arbitrary truthy values on.
    if (provider.enabled === "true" || provider.enabled === "false") provider.enabled = provider.enabled === "true";
    if (provider.enabled !== undefined && typeof provider.enabled !== "boolean") {
      throw new Error("Invalid providers contract: enabled must be a boolean.");
    }
  }
  return value;
}

export function parseProviders(text) {
  return parseProviderDocument(text).providers;
}

export function providerProfile(text, resolveMode, updatedAt) {
  const value = parseProviderDocument(text);
  value.updatedAt = updatedAt;
  for (const provider of value.providers) provider.runMode = resolveMode(provider.id, provider.runMode);
  return stringify(value);
}
