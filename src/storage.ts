import { defaultAgents, defaultCommandPolicy, defaultProviders, initialState, loopTemplate } from "./data";
import { normalizeProviderConfig } from "./cliContracts";
import type { AppState } from "./types";

const STORAGE_KEY = "dbc.mvp.state.v1";

export function loadState(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState;

  try {
    return normalizeState(JSON.parse(raw) as Partial<AppState>);
  } catch {
    return initialState;
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return initialState;
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function normalizeState(state: Partial<AppState>): AppState {
  const providers = state.providers?.length
    ? state.providers.map((provider) => {
        const defaultProvider = defaultProviders.find((item) => item.id === provider.id);
        const migratedProvider = {
          ...defaultProvider,
          ...provider,
        };
        if (
          provider.id === "codex_cli" &&
          (!provider.argsTemplate ||
            provider.argsTemplate.trim() === "" ||
            provider.argsTemplate.includes("--ask-for-approval") ||
            provider.argsTemplate.includes("{{cwd}} -") ||
            provider.argsTemplate.includes("--cd {{cwd}}"))
        ) {
          return normalizeProviderConfig({
            ...migratedProvider,
            argsTemplate:
              defaultProvider?.argsTemplate ??
              'exec --skip-git-repo-check --sandbox workspace-write --cd "{{cwd}}"',
            promptMode: "stdin" as const,
          });
        }
        return normalizeProviderConfig(migratedProvider);
      })
    : defaultProviders;
  const agents = state.agents?.length
    ? state.agents.map((agent) => {
        const defaultAgent = defaultAgents.find((item) => item.id === agent.id);
        const providerId = agent.providerId ?? defaultAgent?.providerId ?? "mock_adapter";
        const provider = providers.find((item) => item.id === providerId);
        return {
          ...defaultAgent,
          ...agent,
          providerId,
          provider: provider?.name ?? agent.provider ?? defaultAgent?.provider ?? "Mock Adapter",
          fallbackProviderIds: agent.fallbackProviderIds ?? defaultAgent?.fallbackProviderIds ?? ["mock_adapter"],
          mode: agent.mode ?? defaultAgent?.mode ?? "read_only",
          localCommands: agent.localCommands ?? defaultAgent?.localCommands,
        };
      })
    : defaultAgents;

  return {
    ...initialState,
    ...state,
    providers,
    agents,
    commandPolicy: state.commandPolicy ?? defaultCommandPolicy,
    tasks: state.tasks?.length
      ? state.tasks.map((task) => ({
          ...task,
          risk: task.risk ?? "medium",
          priority: task.priority ?? "normal",
          loopProfile: task.loopProfile ?? "mock",
          providerStrategy: task.providerStrategy ?? "codex_build_claude_review",
          affectedPaths: task.affectedPaths ?? [],
          allowedPaths: task.allowedPaths ?? task.affectedPaths ?? [],
          deniedPaths: task.deniedPaths ?? [],
          requiredReviewers: task.requiredReviewers ?? ["Reviewer"],
          stopConditions: task.stopConditions ?? [
            "Stop if a command requires approval or is denied by policy.",
            "Stop if the requested change expands outside the allowed paths.",
          ],
        }))
      : initialState.tasks,
    memory: state.memory?.length
      ? state.memory.map((note) => ({
          ...note,
          path: note.path ?? "",
          checksum: note.checksum ?? "",
          updatedAt: note.updatedAt ?? note.createdAt,
        }))
      : initialState.memory,
    loopSteps: state.loopSteps?.length
      ? state.loopSteps.map((step) => {
          const templateStep = loopTemplate.find((item) => item.id === step.id);
          return {
            ...templateStep,
            ...step,
            roleId: step.roleId ?? templateStep?.roleId ?? "lead",
            providerId: step.providerId ?? templateStep?.providerId ?? "mock_adapter",
          };
        })
      : loopTemplate,
  };
}
