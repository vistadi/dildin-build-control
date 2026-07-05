import { invoke } from "@tauri-apps/api/core";
import { buildProviderRunContract, parseArgsTemplate as parseCliArgsTemplate } from "./cliContracts";
import type {
  CliCandidate,
  CliContractCheckResult,
  CommandPolicy,
  ApprovalQueueReport,
  EvidencePack,
  HarnessOverview,
  HarnessRun,
  LaunchDoctorReport,
  LoopEvidenceBundle,
  LoopRunSnapshot,
  LoopStep,
  LoopStateMachineReport,
  MemoryNote,
  Provider,
  ProviderHealthResult,
  ProviderRunResult,
  ProviderSessionReport,
  RealMicroComparisonReport,
  RealMicroPreflightReport,
  RealMicroRunbookReport,
  RevertEvidenceReport,
  RunJournalReport,
  StepStructuredReport,
  SupportBundleReport,
  Task,
  TaskContract,
  WorkSlice,
} from "./types";

export function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function parseArgsTemplate(template: string, prompt: string) {
  return parseCliArgsTemplate(template, prompt);
}

export interface TaskSpecRecord {
  id: string;
  path: string;
  checksum: string;
  updatedAt: string;
}

export interface MemoryNoteRecord {
  id: string;
  path: string;
  checksum: string;
  updatedAt: string;
}

export interface ProjectConfigResult {
  providers: { path: string; checksum: string; updatedAt: string };
  policy: { path: string; checksum: string; updatedAt: string };
}

export interface ProjectConfigDiagnostic {
  level: "info" | "warning" | "error";
  subject: string;
  detail: string;
}

export interface ProjectConfigLoadResult {
  providers: Provider[];
  commandPolicy: CommandPolicy;
  providersRecord?: { path: string; checksum: string; updatedAt: string };
  policyRecord?: { path: string; checksum: string; updatedAt: string };
  diagnostics: ProjectConfigDiagnostic[];
}

export interface ProviderProfileResult {
  applied: "mock" | "real-micro";
  providersPath: string;
  mockProfilePath: string;
  realMicroProfilePath: string;
  backupPath: string;
  checksum: string;
  updatedAt: string;
  providers: Provider[];
  diagnostics: ProjectConfigDiagnostic[];
}

export interface LoopRunSummary {
  id: string;
  projectId: string;
  projectPath: string;
  taskId: string;
  taskTitle: string;
  status: LoopRunSnapshot["status"];
  activeStepIndex: number;
  manifestPath: string;
  reportMarkdownPath: string;
  source: "sqlite" | "manifest";
  updatedAt: string;
}

export interface ProjectRecoveryResult {
  providers: Provider[];
  commandPolicy: CommandPolicy;
  tasks: Task[];
  memory: MemoryNote[];
  loops: LoopRunSummary[];
  diagnostics: ProjectConfigDiagnostic[];
}

export interface ReleasePackageResult {
  jsonPath: string;
  markdownPath: string;
  version: string;
  dmgPath: string;
  dmgChecksum: string;
  appPath: string;
  binaryPath: string;
  generatedAt: string;
}

export interface OperatorChecklistResult {
  jsonPath: string;
  markdownPath: string;
  status: string;
  blockers: number;
  warnings: number;
  nextAction: string;
  generatedAt: string;
  approvalPath: string;
  approvalStatus: string;
}

export async function saveProjectConfig(
  projectPath: string,
  providers: Provider[],
  commandPolicy: CommandPolicy,
): Promise<ProjectConfigResult> {
  if (!isTauriRuntime()) {
    return {
      providers: {
        path: `${projectPath}/.dbc/providers.yaml`,
        checksum: `browser-providers-${providers.length}`,
        updatedAt: String(Date.now()),
      },
      policy: {
        path: `${projectPath}/.dbc/policy.yaml`,
        checksum: `browser-policy-${commandPolicy.allow.length}-${commandPolicy.approvalRequired.length}-${commandPolicy.deny.length}`,
        updatedAt: String(Date.now()),
      },
    };
  }

  const result = await invoke<{
    providers: { path: string; checksum: string; updated_at: string };
    policy: { path: string; checksum: string; updated_at: string };
  }>("save_project_config", {
    request: {
      project_path: projectPath,
      providers,
      command_policy: commandPolicy,
    },
  });

  return {
    providers: {
      path: result.providers.path,
      checksum: result.providers.checksum,
      updatedAt: result.providers.updated_at,
    },
    policy: {
      path: result.policy.path,
      checksum: result.policy.checksum,
      updatedAt: result.policy.updated_at,
    },
  };
}

export async function loadProjectConfig(projectPath: string): Promise<ProjectConfigLoadResult> {
  if (!isTauriRuntime()) {
    return {
      providers: [],
      commandPolicy: { allow: [], approvalRequired: [], deny: [] },
      diagnostics: [
        {
          level: "warning",
          subject: "browser-preview",
          detail: "Project contract import requires the Tauri desktop runtime.",
        },
      ],
    };
  }

  const result = await invoke<{
    providers: Provider[];
    command_policy: CommandPolicy;
    providers_record?: { path: string; checksum: string; updated_at: string } | null;
    policy_record?: { path: string; checksum: string; updated_at: string } | null;
    diagnostics: ProjectConfigDiagnostic[];
  }>("load_project_config", {
    request: { project_path: projectPath },
  });

  return {
    providers: Array.isArray(result.providers) ? result.providers : [],
    commandPolicy: normalizeCommandPolicy(result.command_policy),
    providersRecord: result.providers_record
      ? {
          path: result.providers_record.path,
          checksum: result.providers_record.checksum,
          updatedAt: result.providers_record.updated_at,
        }
      : undefined,
    policyRecord: result.policy_record
      ? {
          path: result.policy_record.path,
          checksum: result.policy_record.checksum,
          updatedAt: result.policy_record.updated_at,
        }
      : undefined,
    diagnostics: result.diagnostics ?? [],
  };
}

export async function recoverProjectState(projectPath: string): Promise<ProjectRecoveryResult> {
  if (!isTauriRuntime()) {
    return {
      providers: [],
      commandPolicy: { allow: [], approvalRequired: [], deny: [] },
      tasks: [],
      memory: [],
      loops: [],
      diagnostics: [
        {
          level: "warning",
          subject: "browser-preview",
          detail: "Project recovery requires the Tauri desktop runtime.",
        },
      ],
    };
  }

  const result = await invoke<{
    providers: Provider[];
    command_policy: CommandPolicy;
    tasks: Array<Partial<Task> & { path?: string; checksum?: string; updatedAt?: string }>;
    memory: Array<Partial<MemoryNote> & { path?: string; checksum?: string; updatedAt?: string }>;
    loops: BackendLoopRunSummary[];
    diagnostics: ProjectConfigDiagnostic[];
  }>("recover_project_state", { projectPath });

  return {
    providers: Array.isArray(result.providers) ? result.providers : [],
    commandPolicy: normalizeCommandPolicy(result.command_policy),
    tasks: (result.tasks ?? []).map(normalizeRecoveredTask).filter(Boolean) as Task[],
    memory: (result.memory ?? []).map(normalizeRecoveredMemory).filter(Boolean) as MemoryNote[],
    loops: (result.loops ?? []).map(fromBackendLoopSummary),
    diagnostics: result.diagnostics ?? [],
  };
}

export async function applyProviderProfile(projectPath: string, profile: "mock" | "real-micro"): Promise<ProviderProfileResult> {
  if (!isTauriRuntime()) {
    return {
      applied: profile,
      providersPath: `${projectPath}/.dbc/providers.yaml`,
      mockProfilePath: `${projectPath}/.dbc/providers.mock.yaml`,
      realMicroProfilePath: `${projectPath}/.dbc/providers.real-micro.yaml`,
      backupPath: "",
      checksum: `browser-profile-${profile}`,
      updatedAt: String(Date.now()),
      providers: [],
      diagnostics: [
        {
          level: "warning",
          subject: "runtime",
          detail: "Provider profile switching requires the Tauri desktop runtime.",
        },
      ],
    };
  }

  const result = await invoke<{
    applied: "mock" | "real-micro";
    providers_path: string;
    mock_profile_path: string;
    real_micro_profile_path: string;
    backup_path: string;
    checksum: string;
    updated_at: string;
    providers: Provider[];
    diagnostics: ProjectConfigDiagnostic[];
  }>("apply_provider_profile", {
    request: {
      project_path: projectPath,
      profile,
    },
  });

  return {
    applied: result.applied,
    providersPath: result.providers_path,
    mockProfilePath: result.mock_profile_path,
    realMicroProfilePath: result.real_micro_profile_path,
    backupPath: result.backup_path,
    checksum: result.checksum,
    updatedAt: result.updated_at,
    providers: result.providers,
    diagnostics: result.diagnostics ?? [],
  };
}

export async function generateReleasePackage(projectPath: string): Promise<ReleasePackageResult> {
  if (!isTauriRuntime()) {
    return {
      jsonPath: `${projectPath}/.dbc/release/latest.json`,
      markdownPath: `${projectPath}/.dbc/release/latest.md`,
      version: "browser-preview",
      dmgPath: "",
      dmgChecksum: "",
      appPath: "",
      binaryPath: "",
      generatedAt: String(Date.now()),
    };
  }

  const result = await invoke<{
    json_path: string;
    markdown_path: string;
    version: string;
    dmg_path: string;
    dmg_checksum: string;
    app_path: string;
    binary_path: string;
    generated_at: string;
  }>("generate_release_package", {
    request: { project_path: projectPath },
  });
  return {
    jsonPath: result.json_path,
    markdownPath: result.markdown_path,
    version: result.version,
    dmgPath: result.dmg_path,
    dmgChecksum: result.dmg_checksum,
    appPath: result.app_path,
    binaryPath: result.binary_path,
    generatedAt: result.generated_at,
  };
}

export async function generateOperatorChecklist(projectPath: string): Promise<OperatorChecklistResult> {
  if (!isTauriRuntime()) {
    return {
      jsonPath: `${projectPath}/.dbc/operator/latest.json`,
      markdownPath: `${projectPath}/.dbc/operator/latest.md`,
      status: "browser_preview",
      blockers: 0,
      warnings: 0,
      nextAction: "Operator checklist generation requires the Tauri desktop runtime.",
      generatedAt: String(Date.now()),
      approvalPath: `${projectPath}/.dbc/operator/approval.json`,
      approvalStatus: "browser_preview",
    };
  }

  const result = await invoke<{
    json_path: string;
    markdown_path: string;
    status: string;
    blockers: number;
    warnings: number;
    next_action: string;
    generated_at: string;
    approval_path: string;
    approval_status: string;
  }>("generate_operator_checklist", {
    request: { project_path: projectPath },
  });
  return {
    jsonPath: result.json_path,
    markdownPath: result.markdown_path,
    status: result.status,
    blockers: result.blockers,
    warnings: result.warnings,
    nextAction: result.next_action,
    generatedAt: result.generated_at,
    approvalPath: result.approval_path,
    approvalStatus: result.approval_status,
  };
}

export async function loadOperatorChecklistReport(projectPath: string): Promise<OperatorChecklistResult> {
  if (!isTauriRuntime()) {
    return {
      jsonPath: `${projectPath}/.dbc/operator/latest.json`,
      markdownPath: `${projectPath}/.dbc/operator/latest.md`,
      status: "browser_preview",
      blockers: 0,
      warnings: 0,
      nextAction: "Operator checklist loading requires the Tauri desktop runtime.",
      generatedAt: String(Date.now()),
      approvalPath: `${projectPath}/.dbc/operator/approval.json`,
      approvalStatus: "browser_preview",
    };
  }

  const result = await invoke<{
    json_path: string;
    markdown_path: string;
    status: string;
    blockers: number;
    warnings: number;
    next_action: string;
    generated_at: string;
    approval_path: string;
    approval_status: string;
  }>("load_operator_checklist_report", { projectPath });
  return {
    jsonPath: result.json_path,
    markdownPath: result.markdown_path,
    status: result.status,
    blockers: result.blockers,
    warnings: result.warnings,
    nextAction: result.next_action,
    generatedAt: result.generated_at,
    approvalPath: result.approval_path,
    approvalStatus: result.approval_status,
  };
}

export async function approveOperatorGate(projectPath: string): Promise<OperatorChecklistResult> {
  if (!isTauriRuntime()) {
    return {
      jsonPath: `${projectPath}/.dbc/operator/latest.json`,
      markdownPath: `${projectPath}/.dbc/operator/latest.md`,
      status: "browser_preview",
      blockers: 0,
      warnings: 0,
      nextAction: "Operator approval requires the Tauri desktop runtime.",
      generatedAt: String(Date.now()),
      approvalPath: `${projectPath}/.dbc/operator/approval.json`,
      approvalStatus: "browser_preview",
    };
  }

  const result = await invoke<{
    json_path: string;
    markdown_path: string;
    status: string;
    blockers: number;
    warnings: number;
    next_action: string;
    generated_at: string;
    approval_path: string;
    approval_status: string;
  }>("approve_operator_gate", {
    request: { project_path: projectPath },
  });
  return {
    jsonPath: result.json_path,
    markdownPath: result.markdown_path,
    status: result.status,
    blockers: result.blockers,
    warnings: result.warnings,
    nextAction: result.next_action,
    generatedAt: result.generated_at,
    approvalPath: result.approval_path,
    approvalStatus: result.approval_status,
  };
}

export async function saveTaskSpec(projectPath: string, task: Task): Promise<TaskSpecRecord> {
  if (!isTauriRuntime()) {
    return {
      id: task.id,
      path: `${projectPath}/.dbc/tasks/${task.id}.json`,
      checksum: `browser-${task.id}-${task.title.length}-${task.brief.length}`,
      updatedAt: String(Date.now()),
    };
  }

  const record = await invoke<{ id: string; path: string; checksum: string; updated_at: string }>("save_task_spec", {
    request: {
      project_path: projectPath,
      id: task.id,
      title: task.title,
      brief: task.brief,
      criteria: task.criteria,
      constraints: task.constraints,
      budget_limit: task.budgetLimit,
      status: task.status,
      risk: task.risk,
      priority: task.priority,
      loop_profile: task.loopProfile,
      provider_strategy: task.providerStrategy,
      affected_paths: task.affectedPaths,
      allowed_paths: task.allowedPaths,
      denied_paths: task.deniedPaths,
      required_reviewers: task.requiredReviewers,
      stop_conditions: task.stopConditions,
    },
  });
  return { id: record.id, path: record.path, checksum: record.checksum, updatedAt: record.updated_at };
}

export async function listTaskSpecs(projectPath: string): Promise<TaskSpecRecord[]> {
  if (!isTauriRuntime()) return [];
  const records = await invoke<Array<{ id: string; path: string; checksum: string; updated_at: string }>>("list_task_specs", {
    projectPath,
  });
  return records.map((record) => ({
    id: record.id,
    path: record.path,
    checksum: record.checksum,
    updatedAt: record.updated_at,
  }));
}

export async function loadTaskSpec(projectPath: string, taskId: string): Promise<Task> {
  if (!isTauriRuntime()) {
    throw new Error("Task spec loading requires the Tauri desktop runtime.");
  }
  const result = await invoke<{
    task: Partial<Task> & { path?: string; checksum?: string; updatedAt?: string };
    record: { id: string; path: string; checksum: string; updated_at: string };
  }>("load_task_spec", { projectPath, taskId });
  const task = normalizeRecoveredTask({
    ...result.task,
    path: result.record.path,
    checksum: result.record.checksum,
    updatedAt: result.record.updated_at,
  });
  if (!task) throw new Error(`Task spec could not be loaded: ${taskId}`);
  return task;
}

export async function createTaskContract(projectId: string, projectPath: string, task: Task): Promise<TaskContract> {
  if (!isTauriRuntime()) {
    return {
      id: `browser-contract-${task.id}-v1`,
      projectId,
      projectPath,
      taskId: task.id,
      version: 1,
      title: task.title,
      businessGoal: task.brief,
      scope: task.affectedPaths.join("\n") || task.brief,
      outOfScope: task.deniedPaths.join("\n"),
      allowedPaths: task.allowedPaths.length ? task.allowedPaths : task.affectedPaths,
      forbiddenPaths: task.deniedPaths,
      acceptanceCriteria: task.criteria,
      testRequirements: ["Run configured build/test checks."],
      evidenceRequirements: ["EvidencePack manifest links contract, slice, run, review, security, and logs."],
      approvalRequiredActions: ["spec", "plan", "slice", "real_provider", "command", "evidence"],
      stopConditions: task.stopConditions.length ? task.stopConditions : task.constraints,
      budgetLimits: { budgetLimit: task.budgetLimit },
      riskLevel: task.risk,
      status: "draft",
      createdAt: String(Date.now()),
      frozenAt: "",
      approvedAt: "",
      artifactPath: `${projectPath}/.dbc/contracts/browser-contract-${task.id}-v1.json`,
      checksum: "browser-preview",
    };
  }

  const contract = await invoke<BackendTaskContract>("create_task_contract", {
    request: {
      project_id: projectId,
      project_path: projectPath,
      task_id: task.id,
      title: task.title,
      business_goal: task.brief,
      scope: task.affectedPaths.join("\n") || task.brief,
      out_of_scope: task.deniedPaths.join("\n"),
      allowed_paths: task.allowedPaths.length ? task.allowedPaths : task.affectedPaths,
      forbidden_paths: task.deniedPaths,
      acceptance_criteria: task.criteria,
      test_requirements: ["Run configured build/test checks."],
      evidence_requirements: ["EvidencePack manifest links contract, slice, run, review, security, and logs."],
      approval_required_actions: ["spec", "plan", "slice", "real_provider", "command", "evidence"],
      stop_conditions: task.stopConditions.length ? task.stopConditions : task.constraints,
      budget_limits: { budgetLimit: task.budgetLimit },
      risk_level: task.risk,
    },
  });
  return fromBackendTaskContract(contract);
}

export async function freezeTaskContract(contractId: string): Promise<TaskContract> {
  if (!isTauriRuntime()) throw new Error("Contract freeze requires the Tauri desktop runtime.");
  return fromBackendTaskContract(await invoke<BackendTaskContract>("freeze_task_contract", { contractId }));
}

export async function approveTaskContract(contractId: string): Promise<TaskContract> {
  if (!isTauriRuntime()) throw new Error("Contract approval requires the Tauri desktop runtime.");
  return fromBackendTaskContract(await invoke<BackendTaskContract>("approve_task_contract", { contractId }));
}

export async function rejectTaskContract(contractId: string): Promise<TaskContract> {
  if (!isTauriRuntime()) throw new Error("Contract rejection requires the Tauri desktop runtime.");
  return fromBackendTaskContract(await invoke<BackendTaskContract>("reject_task_contract", { contractId }));
}

export async function createWorkSlice(
  projectId: string,
  projectPath: string,
  task: Task,
  contractId: string,
  options: { approvalRequired?: boolean; commandsAllowed?: string[]; sequence?: number } = {},
): Promise<WorkSlice> {
  if (!isTauriRuntime()) {
    return {
      id: `browser-slice-${task.id}-${Date.now()}`,
      projectId,
      projectPath,
      taskId: task.id,
      contractId,
      title: task.title,
      description: task.brief,
      sequence: options.sequence ?? 1,
      status: options.approvalRequired === false ? "approved" : "waiting_approval",
      agentRole: "developer",
      allowedPaths: task.allowedPaths.length ? task.allowedPaths : task.affectedPaths,
      commandsAllowed: options.commandsAllowed ?? [],
      approvalRequired: options.approvalRequired ?? true,
      acceptanceCriteria: task.criteria,
      resultSummary: "",
      createdAt: String(Date.now()),
      startedAt: "",
      completedAt: "",
      artifactPath: `${projectPath}/.dbc/slices/browser-slice-${task.id}.json`,
    };
  }

  const slice = await invoke<BackendWorkSlice>("create_work_slice", {
    request: {
      project_id: projectId,
      project_path: projectPath,
      task_id: task.id,
      contract_id: contractId,
      title: task.title,
      description: task.brief,
      sequence: options.sequence ?? 1,
      agent_role: "developer",
      allowed_paths: task.allowedPaths.length ? task.allowedPaths : task.affectedPaths,
      commands_allowed: options.commandsAllowed ?? [],
      approval_required: options.approvalRequired ?? true,
      acceptance_criteria: task.criteria,
    },
  });
  return fromBackendWorkSlice(slice);
}

export async function approveWorkSlice(sliceId: string): Promise<WorkSlice> {
  if (!isTauriRuntime()) throw new Error("WorkSlice approval requires the Tauri desktop runtime.");
  return fromBackendWorkSlice(await invoke<BackendWorkSlice>("approve_work_slice", { sliceId }));
}

export async function startHarnessRun(projectId: string, projectPath: string, taskId: string, contractId: string, workSliceId: string): Promise<HarnessRun> {
  if (!isTauriRuntime()) {
    return {
      id: `browser-harness-${Date.now()}`,
      projectId,
      projectPath,
      taskId,
      contractId,
      status: "slice_running",
      currentStage: "slice_running",
      currentSliceId: workSliceId,
      createdAt: String(Date.now()),
      startedAt: String(Date.now()),
      completedAt: "",
      lastError: "",
      compatibilityLoopRunId: "browser-loop",
      manifestPath: `${projectPath}/.dbc/harness-runs/browser-harness/manifest.json`,
    };
  }

  const run = await invoke<BackendHarnessRun>("start_harness_run", {
    request: {
      project_id: projectId,
      project_path: projectPath,
      task_id: taskId,
      contract_id: contractId,
      work_slice_id: workSliceId,
    },
  });
  return fromBackendHarnessRun(run);
}

export async function advanceHarnessRun(harnessRunId: string): Promise<HarnessRun> {
  if (!isTauriRuntime()) throw new Error("HarnessRun advance requires the Tauri desktop runtime.");
  return fromBackendHarnessRun(await invoke<BackendHarnessRun>("advance_harness_run", { harnessRunId }));
}

export async function generateEvidencePack(harnessRunId: string): Promise<EvidencePack> {
  if (!isTauriRuntime()) throw new Error("EvidencePack generation requires the Tauri desktop runtime.");
  return fromBackendEvidencePack(await invoke<BackendEvidencePack>("generate_evidence_pack", { harnessRunId }));
}

export async function acceptOrReworkHarnessResult(harnessRunId: string, decision: "accepted" | "rework" | "rejected", note: string): Promise<HarnessRun> {
  if (!isTauriRuntime()) throw new Error("Harness final decision requires the Tauri desktop runtime.");
  return fromBackendHarnessRun(
    await invoke<BackendHarnessRun>("accept_or_rework_harness_result", {
      request: { harness_run_id: harnessRunId, decision, note },
    }),
  );
}

export async function loadHarnessOverview(projectPath: string): Promise<HarnessOverview> {
  if (!isTauriRuntime()) return { contracts: [], slices: [], runs: [], evidencePacks: [] };
  const overview = await invoke<BackendHarnessOverview>("load_harness_overview", { projectPath });
  return {
    contracts: (overview.contracts ?? []).map(fromBackendTaskContract),
    slices: (overview.slices ?? []).map(fromBackendWorkSlice),
    runs: (overview.runs ?? []).map(fromBackendHarnessRun),
    evidencePacks: (overview.evidence_packs ?? []).map(fromBackendEvidencePack),
  };
}

export async function saveMemoryNote(projectPath: string, note: MemoryNote): Promise<MemoryNoteRecord> {
  if (!isTauriRuntime()) {
    return {
      id: note.id,
      path: `${projectPath}/.dbc/memory/${note.id}.json`,
      checksum: `browser-${note.id}-${note.title.length}-${note.body.length}`,
      updatedAt: String(Date.now()),
    };
  }

  const record = await invoke<{ id: string; path: string; checksum: string; updated_at: string }>("save_memory_note", {
    request: {
      project_path: projectPath,
      id: note.id,
      note_type: note.type,
      title: note.title,
      body: note.body,
      author: note.author,
      created_at: note.createdAt,
    },
  });
  return { id: record.id, path: record.path, checksum: record.checksum, updatedAt: record.updated_at };
}

export async function listMemoryNotes(projectPath: string): Promise<MemoryNoteRecord[]> {
  if (!isTauriRuntime()) return [];
  const records = await invoke<Array<{ id: string; path: string; checksum: string; updated_at: string }>>("list_memory_notes", {
    projectPath,
  });
  return records.map((record) => ({
    id: record.id,
    path: record.path,
    checksum: record.checksum,
    updatedAt: record.updated_at,
  }));
}

export async function classifyCommand(command: string): Promise<"allow" | "approval" | "deny"> {
  if (!isTauriRuntime()) {
    const lowered = command.toLowerCase();
    if (["rm -rf /", "mkfs", "dd if=", "diskutil erase", "format c:"].some((item) => lowered.includes(item))) return "deny";
    if (["git push", "deploy", "ssh ", "kubectl", "terraform apply", "curl ", "wget ", "sudo "].some((item) => lowered.includes(item))) {
      return "approval";
    }
    return "allow";
  }
  return invoke<"allow" | "approval" | "deny">("classify_command", { command });
}

export async function testCliProvider(provider: Provider): Promise<ProviderHealthResult> {
  if (provider.type === "mock") {
    return {
      status: "ok",
      detail: "Built-in mock adapter is available.",
      versionOutput: "mock-adapter",
    };
  }

  if (provider.type === "local_runner") {
    return {
      status: "ok",
      detail: "Local runner is available through DBC command policy.",
      versionOutput: "local-runner",
    };
  }

  if (!isTauriRuntime()) {
    return {
      status: "warning",
      detail: "CLI checks require the Tauri desktop runtime. Browser preview cannot spawn local processes.",
      versionOutput: "",
    };
  }

  const versionArgs = parseArgsTemplate(provider.versionArgs || "--version", "");
  const result = await invoke<{ status: ProviderHealthResult["status"]; detail: string; version_output: string }>(
    "test_cli_provider",
    {
      command: provider.command,
      versionArgs,
    },
  );

  return {
    status: result.status,
    detail: result.detail,
    versionOutput: result.version_output,
  };
}

export async function discoverCli(provider: Provider): Promise<CliCandidate[]> {
  if (provider.type === "mock" || provider.type === "local_runner") return [];

  if (!isTauriRuntime()) {
    return [];
  }

  const versionArgs = parseArgsTemplate(provider.versionArgs || "--version", "");
  const result = await invoke<Array<{ path: string; source: string; version_output: string; status: CliCandidate["status"] }>>(
    "discover_cli",
    {
      command: provider.command,
      versionArgs,
    },
  );

  return result.map((candidate) => ({
    path: candidate.path,
    source: candidate.source,
    versionOutput: candidate.version_output,
    status: candidate.status,
  }));
}

export async function checkCliContract(provider: Provider, cwd: string): Promise<CliContractCheckResult> {
  if (provider.type === "mock" || provider.type === "local_runner") {
    return {
      status: "ok",
      resolvedCommand: provider.command,
      normalizedArgsTemplate: provider.argsTemplate,
      promptMode: provider.promptMode,
      diagnostics: [
        {
          level: "ok",
          subject: "provider-kind",
          detail: `${provider.name} does not require an external CLI contract.`,
        },
      ],
    };
  }

  if (!isTauriRuntime()) {
    return {
      status: "warning",
      resolvedCommand: provider.command,
      normalizedArgsTemplate: provider.argsTemplate,
      promptMode: provider.promptMode,
      diagnostics: [
        {
          level: "warning",
          subject: "runtime",
          detail: "CLI contract checks require the Tauri desktop runtime.",
        },
      ],
    };
  }

  const result = await invoke<{
    status: CliContractCheckResult["status"];
    resolved_command: string;
    normalized_args_template: string;
    prompt_mode: CliContractCheckResult["promptMode"];
    diagnostics: CliContractCheckResult["diagnostics"];
  }>("check_cli_contract", {
    request: {
      command: provider.command,
      args_template: provider.argsTemplate,
      prompt_mode: provider.promptMode,
      cwd,
    },
  });

  return {
    status: result.status,
    resolvedCommand: result.resolved_command,
    normalizedArgsTemplate: result.normalized_args_template,
    promptMode: result.prompt_mode,
    diagnostics: result.diagnostics,
  };
}

export async function runCliProvider({
  provider,
  prompt,
  cwd,
  policyMode,
}: {
  provider: Provider;
  prompt: string;
  cwd: string;
  policyMode: string;
}): Promise<ProviderRunResult> {
  if (provider.runMode !== "real" || provider.type === "mock" || !isTauriRuntime()) {
    return mockProviderRun(provider, prompt);
  }

  const contract = buildProviderRunContract(provider, prompt, cwd);
  const result = await invoke<{
    status: ProviderRunResult["status"];
    stdout: string;
    stderr: string;
    exit_code?: number;
    duration_ms: number;
    decision: ProviderRunResult["decision"];
    redacted_output: string;
  }>("run_cli_provider", {
    request: {
      command: provider.command,
      args: contract.args,
      prompt: contract.prompt,
      cwd,
      prompt_mode: contract.promptMode,
      timeout_seconds: provider.timeoutSeconds,
      max_output_bytes: provider.maxOutputBytes,
      policy_mode: policyMode,
    },
  });

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exit_code,
    durationMs: result.duration_ms,
    decision: result.decision,
    redactedOutput: result.redacted_output,
  };
}

export async function startBackendLoop({
  projectId,
  taskId,
  projectPath,
  taskTitle,
  taskBrief,
  taskCriteria,
  taskConstraints,
  taskBudgetLimit,
  taskSpecPath,
  taskSpecChecksum,
  memoryContext,
  memoryRefs,
  steps,
}: {
  projectId: string;
  taskId: string;
  projectPath: string;
  taskTitle: string;
  taskBrief: string;
  taskCriteria: string[];
  taskConstraints: string[];
  taskBudgetLimit: number;
  taskSpecPath: string;
  taskSpecChecksum: string;
  memoryContext: string;
  memoryRefs: string[];
  steps: LoopStep[];
}): Promise<LoopRunSnapshot> {
  if (!isTauriRuntime()) {
    return {
      id: `browser-loop-${Date.now()}`,
      projectId,
      projectPath,
      taskId,
      taskTitle,
      taskBrief,
      taskCriteria,
      taskConstraints,
      taskBudgetLimit,
      taskSpecPath,
      taskSpecChecksum,
      memoryContext,
      memoryRefs,
      status: "running",
      activeStepIndex: 0,
      artifactDir: ".dbc/artifacts/browser-preview",
      manifestPath: ".dbc/loops/browser-preview.json",
      reportJsonPath: ".dbc/reports/browser-preview.json",
      reportMarkdownPath: ".dbc/reports/browser-preview.md",
      gitBaselinePath: ".dbc/git/browser-preview/baseline.json",
      commitProposalPath: ".dbc/git/browser-preview/commit-proposal.md",
      securityReportPath: ".dbc/security/browser-preview.json",
      steps: steps.map((step, index) => ({ ...step, status: index === 0 ? "running" : "waiting", output: "" })),
    };
  }

  const snapshot = await invoke<BackendLoopRunSnapshot>("start_loop_run", {
    request: {
      project_id: projectId,
      task_id: taskId,
      project_path: projectPath,
      task_title: taskTitle,
      task_brief: taskBrief,
      task_criteria: taskCriteria,
      task_constraints: taskConstraints,
      task_budget_limit: taskBudgetLimit,
      task_spec_path: taskSpecPath,
      task_spec_checksum: taskSpecChecksum,
      memory_context: memoryContext,
      memory_refs: memoryRefs,
      steps: steps.map(toBackendStepInput),
    },
  });
  return fromBackendLoopSnapshot(snapshot);
}

export async function runControlledSmokeLoop(projectId: string, projectPath: string): Promise<LoopRunSnapshot> {
  if (!isTauriRuntime()) {
    return {
      id: `browser-controlled-smoke-${Date.now()}`,
      projectId,
      projectPath,
      taskId: "SMOKE-LOOP-CONTROLLED",
      taskTitle: "Controlled smoke loop: browser preview",
      taskBrief: "Browser preview fallback for controlled smoke loop.",
      taskCriteria: ["Loop reaches completed status."],
      taskConstraints: ["No local process execution in browser preview."],
      taskBudgetLimit: 0,
      taskSpecPath: `${projectPath}/.dbc/tasks/SMOKE-LOOP-CONTROLLED.json`,
      taskSpecChecksum: "browser-preview",
      memoryContext: "",
      memoryRefs: [],
      status: "completed",
      activeStepIndex: 0,
      artifactDir: ".dbc/artifacts/browser-preview",
      manifestPath: ".dbc/loops/browser-preview.json",
      reportJsonPath: ".dbc/reports/browser-preview.json",
      reportMarkdownPath: ".dbc/reports/browser-preview.md",
      gitBaselinePath: ".dbc/git/browser-preview/baseline.json",
      commitProposalPath: ".dbc/git/browser-preview/commit-proposal.md",
      securityReportPath: ".dbc/security/browser-preview.json",
      steps: [],
    };
  }

  const snapshot = await invoke<BackendLoopRunSnapshot>("run_controlled_smoke_loop", {
    request: {
      project_id: projectId,
      project_path: projectPath,
    },
  });
  return fromBackendLoopSnapshot(snapshot);
}

export async function advanceBackendLoop(loopId: string, current?: LoopRunSnapshot): Promise<LoopRunSnapshot> {
  if (!isTauriRuntime()) {
    if (!current) throw new Error("Browser loop fallback requires current snapshot.");
    const active = current.activeStepIndex;
    const steps = current.steps.map((step, index) => {
      if (index < active) return { ...step, status: "passed" as const };
      if (index === active) {
        return {
          ...step,
          status: "passed" as const,
          evidence: `Browser preview artifact recorded for ${step.agent}.`,
          output: `${step.state} completed in browser preview.`,
          artifactPath: `.dbc/artifacts/browser-preview/${step.id}.md`,
          evidencePath: `.dbc/evidence/browser-preview/${step.id}.json`,
        };
      }
      if (index === active + 1) return { ...step, status: "running" as const };
      return step;
    });
    const completed = active + 1 >= steps.length;
    return {
      ...current,
      status: completed ? "completed" : "running",
      activeStepIndex: completed ? active : active + 1,
      steps,
    };
  }

  const snapshot = await invoke<BackendLoopRunSnapshot>("advance_loop_run", { loopId });
  return fromBackendLoopSnapshot(snapshot);
}

export async function resumeBackendLoop(loopId: string, current?: LoopRunSnapshot): Promise<LoopRunSnapshot> {
  if (!isTauriRuntime()) {
    if (!current) throw new Error("Browser loop fallback requires current snapshot.");
    return {
      ...current,
      status: "running",
      steps: current.steps.map((step, index) =>
        index === current.activeStepIndex
          ? { ...step, status: "running", output: "", evidence: step.evidence.replace(/\n?Artifact:.+$/s, "") }
          : step,
      ),
    };
  }

  const snapshot = await invoke<BackendLoopRunSnapshot>("resume_loop_run", { loopId });
  return fromBackendLoopSnapshot(snapshot);
}

export async function retryBackendLoop(loopId: string, current?: LoopRunSnapshot): Promise<LoopRunSnapshot> {
  if (!isTauriRuntime()) {
    if (!current) throw new Error("Browser loop fallback requires current snapshot.");
    const active = current.activeStepIndex;
    const step = current.steps[active];
    if (step && (step.attemptCount ?? 0) >= (step.maxAttempts ?? 3)) {
      throw new Error(`Step ${step.id} already used ${step.attemptCount ?? 0}/${step.maxAttempts ?? 3} attempts.`);
    }
    return {
      ...current,
      status: "running",
      steps: current.steps.map((item, index) =>
        index === active
          ? { ...item, status: "running", output: "", lastError: "", requiresApproval: false }
          : item,
      ),
    };
  }

  const snapshot = await invoke<BackendLoopRunSnapshot>("retry_loop_step", { loopId });
  return fromBackendLoopSnapshot(snapshot);
}

export async function resolveBackendLoopApproval({
  loopId,
  stepId,
  action,
  current,
}: {
  loopId: string;
  stepId: string;
  action: "approved" | "rejected" | "changes_requested";
  current?: LoopRunSnapshot;
}): Promise<LoopRunSnapshot> {
  if (!isTauriRuntime()) {
    if (!current) throw new Error("Browser loop fallback requires current snapshot.");
    if (action === "approved") {
      return {
        ...current,
        status: "running",
        steps: current.steps.map((step) =>
          step.id === stepId ? { ...step, status: "running", requiresApproval: false, lastError: "" } : step,
        ),
      };
    }
    return {
      ...current,
      status: "failed",
      steps: current.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              status: action === "rejected" ? "blocked" : "failed",
              requiresApproval: false,
              lastError: action === "rejected" ? "Rejected by human approval." : "Changes requested by human approval.",
            }
          : step,
      ),
    };
  }

  const snapshot = await invoke<BackendLoopRunSnapshot>("resolve_loop_approval", {
    request: { loop_id: loopId, step_id: stepId, action },
  });
  return fromBackendLoopSnapshot(snapshot);
}

export async function getBackendLoop(loopId: string): Promise<LoopRunSnapshot> {
  const snapshot = await invoke<BackendLoopRunSnapshot>("get_loop_run", { loopId });
  return fromBackendLoopSnapshot(snapshot);
}

export async function listBackendLoops(projectPath: string): Promise<LoopRunSummary[]> {
  if (!isTauriRuntime()) return [];
  const rows = await invoke<BackendLoopRunSummary[]>("list_loop_runs", { projectPath });
  return rows.map(fromBackendLoopSummary);
}

export async function loadBackendLoopManifest(projectPath: string, loopId: string): Promise<LoopRunSnapshot> {
  const snapshot = await invoke<BackendLoopRunSnapshot>("load_loop_manifest", { projectPath, loopId });
  return fromBackendLoopSnapshot(snapshot);
}

export async function loadLoopEvidenceBundle(projectPath: string, loopId: string): Promise<LoopEvidenceBundle> {
  if (!isTauriRuntime()) {
    return {
      version: 1,
      kind: "loop-evidence-bundle",
      loadedAt: String(Date.now()),
      projectPath,
      loopId,
      loop: null,
      taskSpec: null,
      acceptancePackage: null,
      acceptanceMarkdown: "",
      securityReport: null,
      gitWorkspace: null,
      gitDiff: "",
      gitDiffStat: "",
      approvalLedger: null,
      stepEvidence: [],
      diagnostics: [
        {
          level: "warning",
          subject: "browser-preview",
          detail: "Evidence bundle loading requires the Tauri desktop runtime.",
        },
      ],
      health: {
        missingArtifacts: 0,
        warnings: 1,
        stepEvidenceCount: 0,
        pendingApprovals: 0,
        verdict: "browser_preview",
        status: "browser_preview",
        scopePassed: false,
        securityFindings: 0,
      },
      refs: {},
    };
  }
  return invoke<LoopEvidenceBundle>("load_loop_evidence_bundle", { projectPath, loopId });
}

export async function loadLaunchDoctorReport(projectPath: string): Promise<LaunchDoctorReport> {
  if (!isTauriRuntime()) {
    return {
      version: 1,
      kind: "launch-doctor",
      generatedAt: String(Date.now()),
      projectPath,
      status: "browser_preview",
      blockers: [],
      warnings: [
        {
          subject: "runtime",
          detail: "Launch Doctor report loading requires the Tauri desktop runtime.",
        },
      ],
      steps: [],
      refs: {},
      summary: {
        systemAuditStatus: "browser_preview",
        operatorStatus: "browser_preview",
        approvalLedgerStatus: "browser_preview",
        approvalQueueStatus: "browser_preview",
        pendingApprovals: 0,
        pendingApprovalQueueItems: 0,
        loopStateMachineStatus: "browser_preview",
        runJournalStatus: "browser_preview",
        runJournalEvents: 0,
        comparisonStatus: "browser_preview",
        providerContractsStatus: "browser_preview",
        providerSessionsStatus: "browser_preview",
        revertStatus: "browser_preview",
        realMicroPreflightStatus: "browser_preview",
        realMicroRunbookStatus: "browser_preview",
        supportBundleStatus: "browser_preview",
      },
      nextAction: "Run pnpm launch-doctor in the project root, then open the desktop app.",
    };
  }
  return invoke<LaunchDoctorReport>("load_launch_doctor_report", { projectPath });
}

export async function loadApprovalQueueReport(projectPath: string): Promise<ApprovalQueueReport> {
  if (!isTauriRuntime()) {
    return {
      version: 1,
      kind: "approval-queue",
      generatedAt: String(Date.now()),
      projectPath,
      status: "browser_preview",
      summary: {
        total: 0,
        required: 0,
        pending: 0,
        pendingRequired: 0,
        approved: 0,
        blocked: 0,
        notRequired: 0,
      },
      blockers: [],
      warnings: [
        {
          subject: "runtime",
          detail: "Approval Queue report loading requires the Tauri desktop runtime.",
        },
      ],
      items: [],
      refs: {},
      nextAction: "Run pnpm approval-queue in the project root, then open the desktop app.",
    };
  }
  return invoke<ApprovalQueueReport>("load_approval_queue_report", { projectPath });
}

export async function loadProviderSessionReport(projectPath: string): Promise<ProviderSessionReport> {
  if (!isTauriRuntime()) {
    return {
      version: 1,
      kind: "provider-sessions",
      generatedAt: String(Date.now()),
      projectPath,
      status: "browser_preview",
      blockers: [],
      warnings: [
        {
          subject: "runtime",
          detail: "Provider Sessions report loading requires the Tauri desktop runtime.",
        },
      ],
      records: [],
      environment: {},
      refs: {},
      nextAction: "Run pnpm provider-sessions in the project root, then open the desktop app.",
    };
  }
  return invoke<ProviderSessionReport>("load_provider_session_report", { projectPath });
}

export async function loadLoopStateMachineReport(projectPath: string): Promise<LoopStateMachineReport> {
  if (!isTauriRuntime()) {
    return {
      version: 1,
      kind: "loop-state-machine",
      generatedAt: String(Date.now()),
      projectPath,
      loopId: "",
      taskId: "",
      status: "browser_preview",
      currentState: "created",
      nextState: "planned",
      blockers: [],
      warnings: [
        {
          subject: "runtime",
          detail: "Loop State Machine report loading requires the Tauri desktop runtime.",
        },
      ],
      transitions: [],
      invariants: {},
      gates: {},
      refs: {},
      nextAction: "Run pnpm loop-state-machine in the project root, then open the desktop app.",
    };
  }
  return invoke<LoopStateMachineReport>("load_loop_state_machine_report", { projectPath });
}

export async function loadRunJournalReport(projectPath: string): Promise<RunJournalReport> {
  if (!isTauriRuntime()) {
    return {
      version: 1,
      kind: "run-journal",
      generatedAt: String(Date.now()),
      projectPath,
      loopId: "",
      task: { id: "", title: "", profile: "", providerStrategy: "" },
      status: "browser_preview",
      blockers: [],
      warnings: [
        {
          subject: "runtime",
          detail: "Run Journal report loading requires the Tauri desktop runtime.",
        },
      ],
      summary: {
        events: 0,
        providerCalls: 0,
        steps: 0,
        passedSteps: 0,
        failedSteps: 0,
        pendingApprovals: 0,
        pendingApprovalQueueItems: 0,
        securityFindings: 0,
        scopePassed: false,
        realProviderCallsUsed: 0,
        realProviderBudgetOk: true,
      },
      checks: [],
      events: [],
      providerCalls: [],
      artifacts: {},
      refs: {},
      nextAction: "Run pnpm run-journal in the project root, then open the desktop app.",
    };
  }
  return invoke<RunJournalReport>("load_run_journal_report", { projectPath });
}

export async function loadRealMicroComparisonReport(projectPath: string): Promise<RealMicroComparisonReport> {
  if (!isTauriRuntime()) {
    return {
      version: 1,
      kind: "real-micro-comparison",
      generatedAt: String(Date.now()),
      projectPath,
      status: "browser_preview",
      blockers: [],
      warnings: [
        {
          subject: "runtime",
          detail: "Real Micro Comparison report loading requires the Tauri desktop runtime.",
        },
      ],
      checks: [],
      refs: {},
      nextActions: ["Run pnpm compare-real-micro in the project root, then open the desktop app."],
    };
  }
  return invoke<RealMicroComparisonReport>("load_real_micro_comparison_report", { projectPath });
}

export async function loadRevertEvidenceReport(projectPath: string): Promise<RevertEvidenceReport> {
  if (!isTauriRuntime()) {
    return {
      version: 1,
      kind: "revert-evidence",
      generatedAt: String(Date.now()),
      projectPath,
      status: "browser_preview",
      blockers: [],
      warnings: [
        {
          subject: "runtime",
          detail: "Revert Evidence report loading requires the Tauri desktop runtime.",
        },
      ],
      checks: [],
      providers: { activeRealProviders: [], activeMockProviders: [] },
      realMicro: {},
      refs: {},
      nextAction: "Run pnpm revert-evidence in the project root, then open the desktop app.",
    };
  }
  return invoke<RevertEvidenceReport>("load_revert_evidence_report", { projectPath });
}

export async function loadRealMicroPreflightReport(projectPath: string): Promise<RealMicroPreflightReport> {
  if (!isTauriRuntime()) {
    return {
      version: 1,
      kind: "real-micro-preflight",
      generatedAt: String(Date.now()),
      projectPath,
      status: "browser_preview",
      blockers: [],
      warnings: [
        {
          subject: "runtime",
          detail: "Real Micro Preflight report loading requires the Tauri desktop runtime.",
        },
      ],
      checks: [],
      approvals: { required: [], approved: {}, ready: false },
      profile: { intendedRealProviders: [], activeRealProviderIds: [], ready: false },
      task: {},
      refs: {},
      nextAction: "Run pnpm real-micro-preflight in the project root, then open the desktop app.",
    };
  }
  return invoke<RealMicroPreflightReport>("load_real_micro_preflight_report", { projectPath });
}

export async function generateRealMicroPreflightReport(projectPath: string): Promise<RealMicroPreflightReport> {
  if (!isTauriRuntime()) {
    return {
      version: 1,
      kind: "real-micro-preflight",
      generatedAt: String(Date.now()),
      projectPath,
      status: "browser_preview",
      blockers: [],
      warnings: [
        {
          subject: "runtime",
          detail: "Real Micro Preflight generation requires the Tauri desktop runtime.",
        },
      ],
      checks: [],
      approvals: { required: [], approved: {}, ready: false },
      profile: { intendedRealProviders: [], activeRealProviderIds: [], ready: false },
      task: {},
      refs: {},
      nextAction: "Open the Tauri desktop app to generate the dry-run preflight report.",
    };
  }
  return invoke<RealMicroPreflightReport>("generate_real_micro_preflight_report", {
    request: { project_path: projectPath },
  });
}

export async function loadRealMicroRunbookReport(projectPath: string): Promise<RealMicroRunbookReport> {
  if (!isTauriRuntime()) {
    return {
      version: 1,
      kind: "real-micro-runbook",
      generatedAt: String(Date.now()),
      projectPath,
      status: "browser_preview",
      blockers: [],
      warnings: [
        {
          subject: "runtime",
          detail: "Real Micro Runbook report loading requires the Tauri desktop runtime.",
        },
      ],
      checks: [],
      surfaces: {
        allowed: [{ id: "official_cli", detail: "Official CLI surfaces are the intended integration surface." }],
        denied: [{ id: "consumer_web_automation", detail: "Consumer web automation is denied." }],
      },
      sequence: [],
      manualCommands: [],
      gates: {},
      refs: {},
      nextAction: "Run pnpm real-micro-runbook in the project root, then open the desktop app.",
    };
  }
  return invoke<RealMicroRunbookReport>("load_real_micro_runbook_report", { projectPath });
}

export async function generateRealMicroRunbookReport(projectPath: string): Promise<RealMicroRunbookReport> {
  if (!isTauriRuntime()) {
    return {
      version: 1,
      kind: "real-micro-runbook",
      generatedAt: String(Date.now()),
      projectPath,
      status: "browser_preview",
      blockers: [],
      warnings: [
        {
          subject: "runtime",
          detail: "Real Micro Runbook generation requires the Tauri desktop runtime.",
        },
      ],
      checks: [],
      surfaces: {
        allowed: [{ id: "official_cli", detail: "Official CLI surfaces are the intended integration surface." }],
        denied: [{ id: "consumer_web_automation", detail: "Consumer web automation is denied." }],
      },
      sequence: [],
      manualCommands: [],
      gates: {},
      refs: {},
      nextAction: "Open the Tauri desktop app to generate the operator runbook.",
    };
  }
  return invoke<RealMicroRunbookReport>("generate_real_micro_runbook_report", {
    request: { project_path: projectPath },
  });
}

export async function loadSupportBundleReport(projectPath: string): Promise<SupportBundleReport> {
  if (!isTauriRuntime()) {
    return {
      version: 1,
      kind: "support-bundle",
      generatedAt: String(Date.now()),
      projectPath,
      status: "browser_preview",
      bundleDir: "",
      tarPath: "",
      tarStatus: "browser_preview",
      blockers: [],
      warnings: [
        {
          subject: "runtime",
          detail: "Support Bundle report loading requires the Tauri desktop runtime.",
        },
      ],
      skipped: [],
      files: [],
      refs: {},
      hygiene: {
        excludedSecrets: true,
        excludedNodeModules: true,
        excludedBuildTargets: true,
        includedExactProviderPaths: true,
      },
    };
  }
  return invoke<SupportBundleReport>("load_support_bundle_report", { projectPath });
}

function mockProviderRun(provider: Provider, prompt: string): ProviderRunResult {
  const excerpt = prompt.split("\n").slice(0, 5).join(" ");
  return {
    status: "success",
    stdout: `${provider.name} mock result: ${excerpt}`,
    stderr: "",
    durationMs: 250,
    decision: "allow",
    redactedOutput: `${provider.name} mock result: ${excerpt}`,
  };
}

interface BackendTaskContract {
  id: string;
  project_id: string;
  project_path: string;
  task_id: string;
  version: number;
  title: string;
  business_goal: string;
  scope: string;
  out_of_scope: string;
  allowed_paths: string[];
  forbidden_paths: string[];
  acceptance_criteria: string[];
  test_requirements: string[];
  evidence_requirements: string[];
  approval_required_actions: string[];
  stop_conditions: string[];
  budget_limits: Record<string, unknown>;
  risk_level: TaskContract["riskLevel"];
  status: TaskContract["status"];
  created_at: string;
  frozen_at: string;
  approved_at: string;
  artifact_path: string;
  checksum: string;
}

interface BackendWorkSlice {
  id: string;
  project_id: string;
  project_path: string;
  task_id: string;
  contract_id: string;
  title: string;
  description: string;
  sequence: number;
  status: WorkSlice["status"];
  agent_role: string;
  allowed_paths: string[];
  commands_allowed: string[];
  approval_required: boolean;
  acceptance_criteria: string[];
  result_summary: string;
  created_at: string;
  started_at: string;
  completed_at: string;
  artifact_path: string;
}

interface BackendHarnessRun {
  id: string;
  project_id: string;
  project_path: string;
  task_id: string;
  contract_id: string;
  status: HarnessRun["status"];
  current_stage: string;
  current_slice_id: string;
  created_at: string;
  started_at: string;
  completed_at: string;
  last_error: string;
  compatibility_loop_run_id: string;
  manifest_path: string;
}

interface BackendEvidencePack {
  id: string;
  project_id: string;
  project_path: string;
  task_id: string;
  contract_id: string;
  harness_run_id: string;
  status: string;
  manifest_path: string;
  report_path: string;
  created_at: string;
  finalized_at: string;
  final_decision: string;
  refs: Record<string, unknown>;
}

interface BackendHarnessOverview {
  contracts: BackendTaskContract[];
  slices: BackendWorkSlice[];
  runs: BackendHarnessRun[];
  evidence_packs: BackendEvidencePack[];
}

interface BackendLoopStepSnapshot {
  id: string;
  state: LoopStep["state"];
  agent: string;
  role_id: string;
  provider_id: string;
  provider_type: LoopStep["providerType"];
  provider_command: string;
  provider_args_template: string;
  provider_prompt_mode: LoopStep["providerPromptMode"];
  provider_run_mode: LoopStep["providerRunMode"];
  agent_mode: LoopStep["agentMode"];
  local_commands: string[];
  timeout_seconds: number;
  max_output_bytes: number;
  max_attempts: number;
  attempt_count: number;
  requires_approval: boolean;
  last_error: string;
  summary: string;
  evidence: string;
  status: LoopStep["status"];
  output: string;
  structured_report_json: string;
  artifact_path: string;
  evidence_path: string;
  started_at: string;
  finished_at: string;
}

interface BackendLoopRunSummary {
  id: string;
  project_id: string;
  project_path: string;
  task_id: string;
  task_title: string;
  status: LoopRunSnapshot["status"];
  active_step_index: number;
  manifest_path: string;
  report_markdown_path: string;
  source: string;
  updated_at: string;
}

interface BackendLoopRunSnapshot {
  id: string;
  project_id: string;
  project_path: string;
  task_id: string;
  task_title: string;
  task_brief: string;
  task_criteria: string[];
  task_constraints: string[];
  task_budget_limit: number;
  task_spec_path: string;
  task_spec_checksum: string;
  memory_context: string;
  memory_refs: string[];
  status: LoopRunSnapshot["status"];
  active_step_index: number;
  artifact_dir: string;
  manifest_path: string;
  report_json_path: string;
  report_markdown_path: string;
  git_baseline_path: string;
  commit_proposal_path: string;
  security_report_path: string;
  steps: BackendLoopStepSnapshot[];
}

function fromBackendTaskContract(row: BackendTaskContract): TaskContract {
  return {
    id: row.id,
    projectId: row.project_id,
    projectPath: row.project_path,
    taskId: row.task_id,
    version: row.version,
    title: row.title,
    businessGoal: row.business_goal,
    scope: row.scope,
    outOfScope: row.out_of_scope,
    allowedPaths: row.allowed_paths ?? [],
    forbiddenPaths: row.forbidden_paths ?? [],
    acceptanceCriteria: row.acceptance_criteria ?? [],
    testRequirements: row.test_requirements ?? [],
    evidenceRequirements: row.evidence_requirements ?? [],
    approvalRequiredActions: row.approval_required_actions ?? [],
    stopConditions: row.stop_conditions ?? [],
    budgetLimits: row.budget_limits ?? {},
    riskLevel: row.risk_level,
    status: row.status,
    createdAt: row.created_at,
    frozenAt: row.frozen_at,
    approvedAt: row.approved_at,
    artifactPath: row.artifact_path,
    checksum: row.checksum,
  };
}

function fromBackendWorkSlice(row: BackendWorkSlice): WorkSlice {
  return {
    id: row.id,
    projectId: row.project_id,
    projectPath: row.project_path,
    taskId: row.task_id,
    contractId: row.contract_id,
    title: row.title,
    description: row.description,
    sequence: row.sequence,
    status: row.status,
    agentRole: row.agent_role,
    allowedPaths: row.allowed_paths ?? [],
    commandsAllowed: row.commands_allowed ?? [],
    approvalRequired: row.approval_required,
    acceptanceCriteria: row.acceptance_criteria ?? [],
    resultSummary: row.result_summary,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    artifactPath: row.artifact_path,
  };
}

function fromBackendHarnessRun(row: BackendHarnessRun): HarnessRun {
  return {
    id: row.id,
    projectId: row.project_id,
    projectPath: row.project_path,
    taskId: row.task_id,
    contractId: row.contract_id,
    status: row.status,
    currentStage: row.current_stage,
    currentSliceId: row.current_slice_id,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    lastError: row.last_error,
    compatibilityLoopRunId: row.compatibility_loop_run_id,
    manifestPath: row.manifest_path,
  };
}

function fromBackendEvidencePack(row: BackendEvidencePack): EvidencePack {
  return {
    id: row.id,
    projectId: row.project_id,
    projectPath: row.project_path,
    taskId: row.task_id,
    contractId: row.contract_id,
    harnessRunId: row.harness_run_id,
    status: row.status,
    manifestPath: row.manifest_path,
    reportPath: row.report_path,
    createdAt: row.created_at,
    finalizedAt: row.finalized_at,
    finalDecision: row.final_decision,
    refs: row.refs ?? {},
  };
}

function toBackendStepInput(step: LoopStep) {
  return {
    id: step.id,
    state: step.state,
    agent: step.agent,
    role_id: step.roleId,
    provider_id: step.providerId,
    provider_type: step.providerType ?? "mock",
    provider_command: step.providerCommand ?? "",
    provider_args_template: step.providerArgsTemplate ?? "",
    provider_prompt_mode: step.providerPromptMode ?? "stdin",
    provider_run_mode: step.providerRunMode ?? "mock",
    agent_mode: step.agentMode ?? "read_only",
    local_commands: step.localCommands ?? [],
    timeout_seconds: step.timeoutSeconds ?? 900,
    max_output_bytes: step.maxOutputBytes ?? 200000,
    max_attempts: step.maxAttempts ?? 3,
    summary: step.summary,
    evidence: step.evidence,
  };
}

function fromBackendLoopSnapshot(snapshot: BackendLoopRunSnapshot): LoopRunSnapshot {
  return {
    id: snapshot.id,
    projectId: snapshot.project_id,
    projectPath: snapshot.project_path ?? "",
    taskId: snapshot.task_id,
    taskTitle: snapshot.task_title ?? "",
    taskBrief: snapshot.task_brief ?? "",
    taskCriteria: snapshot.task_criteria ?? [],
    taskConstraints: snapshot.task_constraints ?? [],
    taskBudgetLimit: snapshot.task_budget_limit ?? 0,
    taskSpecPath: snapshot.task_spec_path ?? "",
    taskSpecChecksum: snapshot.task_spec_checksum ?? "",
    memoryContext: snapshot.memory_context ?? "",
    memoryRefs: snapshot.memory_refs ?? [],
    status: snapshot.status,
    activeStepIndex: snapshot.active_step_index,
    artifactDir: snapshot.artifact_dir,
    manifestPath: snapshot.manifest_path ?? "",
    reportJsonPath: snapshot.report_json_path ?? "",
    reportMarkdownPath: snapshot.report_markdown_path ?? "",
    gitBaselinePath: snapshot.git_baseline_path ?? "",
    commitProposalPath: snapshot.commit_proposal_path ?? "",
    securityReportPath: snapshot.security_report_path ?? "",
    steps: snapshot.steps.map((step) => ({
      id: step.id,
      state: step.state,
      agent: step.agent,
      roleId: step.role_id,
      providerId: step.provider_id,
      providerType: step.provider_type,
      providerCommand: step.provider_command,
      providerArgsTemplate: step.provider_args_template,
      providerPromptMode: step.provider_prompt_mode,
      providerRunMode: step.provider_run_mode,
      agentMode: step.agent_mode,
      localCommands: step.local_commands,
      timeoutSeconds: step.timeout_seconds,
      maxOutputBytes: step.max_output_bytes,
      maxAttempts: step.max_attempts,
      attemptCount: step.attempt_count,
      requiresApproval: step.requires_approval,
      lastError: step.last_error,
      summary: step.summary,
      evidence: step.evidence,
      status: step.status,
      output: step.output,
      structuredReport: parseStructuredReport(step.structured_report_json),
      artifactPath: step.artifact_path,
      evidencePath: step.evidence_path,
    })),
  };
}

function fromBackendLoopSummary(row: BackendLoopRunSummary): LoopRunSummary {
  return {
    id: row.id,
    projectId: row.project_id,
    projectPath: row.project_path,
    taskId: row.task_id,
    taskTitle: row.task_title,
    status: row.status,
    activeStepIndex: row.active_step_index,
    manifestPath: row.manifest_path,
    reportMarkdownPath: row.report_markdown_path,
    source: row.source === "manifest" ? "manifest" : "sqlite",
    updatedAt: row.updated_at,
  };
}

function normalizeRecoveredTask(value: Partial<Task> & { path?: string; checksum?: string; updatedAt?: string }): Task | undefined {
  if (!value?.id || !value.title) return undefined;
  const affectedPaths = Array.isArray(value.affectedPaths) ? value.affectedPaths : [];
  return {
    id: value.id,
    title: value.title,
    brief: value.brief ?? "",
    criteria: Array.isArray(value.criteria) ? value.criteria : [],
    constraints: Array.isArray(value.constraints) ? value.constraints : [],
    budgetLimit: typeof value.budgetLimit === "number" ? value.budgetLimit : 0,
    risk: value.risk ?? "medium",
    priority: value.priority ?? "normal",
    loopProfile: value.loopProfile ?? "mock",
    providerStrategy: value.providerStrategy ?? "codex_build_claude_review",
    affectedPaths,
    allowedPaths: Array.isArray(value.allowedPaths) && value.allowedPaths.length ? value.allowedPaths : affectedPaths,
    deniedPaths: Array.isArray(value.deniedPaths) ? value.deniedPaths : [],
    requiredReviewers: Array.isArray(value.requiredReviewers) ? value.requiredReviewers : [],
    stopConditions: Array.isArray(value.stopConditions) ? value.stopConditions : [],
    status: value.status ?? "ready",
    specPath: value.path,
    specChecksum: value.checksum,
    specUpdatedAt: value.updatedAt,
  };
}

function normalizeRecoveredMemory(value: Partial<MemoryNote> & { path?: string; checksum?: string; updatedAt?: string }): MemoryNote | undefined {
  if (!value?.id || !value.title) return undefined;
  return {
    id: value.id,
    type: value.type ?? "decision",
    title: value.title,
    body: value.body ?? "",
    author: value.author ?? "DBC",
    createdAt: value.createdAt ?? value.updatedAt ?? String(Date.now()),
    path: value.path,
    checksum: value.checksum,
    updatedAt: value.updatedAt,
  };
}

function normalizeCommandPolicy(value: Partial<CommandPolicy> | undefined): CommandPolicy {
  return {
    allow: Array.isArray(value?.allow) ? value.allow : [],
    approvalRequired: Array.isArray(value?.approvalRequired) ? value.approvalRequired : [],
    deny: Array.isArray(value?.deny) ? value.deny : [],
  };
}

function parseStructuredReport(raw: string): StepStructuredReport | undefined {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as Partial<StepStructuredReport>;
    if (!value.verdict) return undefined;
    return {
      verdict: value.verdict,
      summary: value.summary ?? "",
      actions: Array.isArray(value.actions) ? value.actions : [],
      filesTouched: Array.isArray(value.filesTouched) ? value.filesTouched : [],
      evidence: Array.isArray(value.evidence) ? value.evidence : [],
      risks: Array.isArray(value.risks) ? value.risks : [],
      nextAction: value.nextAction ?? "",
    };
  } catch {
    return undefined;
  }
}
