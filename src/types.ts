export type RiskLevel = "low" | "medium" | "high" | "critical";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskLoopProfile = "mock" | "controlled_smoke" | "real_micro";
export type ProviderStrategy = "codex_build_claude_review" | "codex_only" | "claude_review_only" | "mock_only";
export type ProviderType = "mock" | "cli" | "api" | "local_runner" | "local_model";
export type ProviderHealth = "unknown" | "ok" | "warning" | "failed";
export type PromptMode = "stdin" | "arg" | "file" | "terminal";
export type AgentExecutionMode =
  | "read_only"
  | "write_workspace"
  | "write_tests_only"
  | "review_only"
  | "command_runner"
  | "approval_required";
export type CommandDecision = "allow" | "approval_required" | "deny";
export type ProviderRunMode = "mock" | "real";
export type LoopState =
  | "planned"
  | "coding"
  | "building"
  | "testing"
  | "reviewing"
  | "security"
  | "acceptance"
  | "completed"
  | "failed"
  | "stopped";

export interface Project {
  id: string;
  name: string;
  path: string;
  branch: string;
  stack: string[];
  changedFiles: number;
  openTasks: number;
  risk: RiskLevel;
  cost: number;
  latestLoop: LoopState;
}

export interface AgentRole {
  id: string;
  role: string;
  mission: string;
  provider: string;
  providerId: string;
  fallbackProviderIds: string[];
  mode: AgentExecutionMode;
  model: string;
  enabled: boolean;
  permissions: string[];
  localCommands?: string[];
}

export interface Task {
  id: string;
  title: string;
  brief: string;
  criteria: string[];
  constraints: string[];
  budgetLimit: number;
  risk: RiskLevel;
  priority: TaskPriority;
  loopProfile: TaskLoopProfile;
  providerStrategy: ProviderStrategy;
  affectedPaths: string[];
  allowedPaths: string[];
  deniedPaths: string[];
  requiredReviewers: string[];
  stopConditions: string[];
  specPath?: string;
  specChecksum?: string;
  specUpdatedAt?: string;
  status: "draft" | "ready" | "running" | "blocked" | "done";
}

export interface LoopStep {
  id: string;
  state: LoopState;
  agent: string;
  roleId: string;
  providerId: string;
  providerType?: ProviderType;
  providerCommand?: string;
  providerArgsTemplate?: string;
  providerPromptMode?: PromptMode;
  providerRunMode?: ProviderRunMode;
  agentMode?: AgentExecutionMode;
  localCommands?: string[];
  timeoutSeconds?: number;
  maxOutputBytes?: number;
  maxAttempts?: number;
  attemptCount?: number;
  requiresApproval?: boolean;
  lastError?: string;
  summary: string;
  evidence: string;
  status: "waiting" | "running" | "passed" | "blocked" | "failed" | "approval_required";
  output?: string;
  artifactPath?: string;
  evidencePath?: string;
  structuredReport?: StepStructuredReport;
}

export interface StepStructuredReport {
  verdict: "pass" | "request_changes" | "approval_required" | "fail" | "blocked";
  summary: string;
  actions: string[];
  filesTouched: string[];
  evidence: string[];
  risks: string[];
  nextAction: string;
}

export interface ApprovalRequest {
  id: string;
  kind?:
    | "backend_step"
    | "real_loop_gate"
    | "provider_mode_switch"
    | "real_task_start"
    | "git_branch"
    | "git_stage"
    | "git_commit"
    | "scope_expansion"
    | "command_request"
    | "command_template";
  loopId?: string;
  stepId?: string;
  action: string;
  reason: string;
  requester: string;
  risk: RiskLevel;
  command?: string;
  preview: string;
  artifactPath?: string;
  decisionPath?: string;
  createdAt?: string;
  decidedAt?: string;
  optional?: boolean;
  status: "pending" | "approved" | "rejected" | "changes_requested";
}

export interface AuditEvent {
  id: string;
  time: string;
  actor: string;
  action: string;
  result: string;
}

export interface CostEvent {
  id: string;
  provider: string;
  model: string;
  agent: string;
  taskId: string;
  amount: number;
  confidence: "exact" | "estimated" | "unknown";
}

export interface MemoryNote {
  id: string;
  type: "decision" | "business_rule" | "architecture" | "risk";
  title: string;
  body: string;
  author: string;
  createdAt: string;
  path?: string;
  checksum?: string;
  updatedAt?: string;
}

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  enabled: boolean;
  health: ProviderHealth;
  command: string;
  argsTemplate: string;
  versionArgs: string;
  promptMode: PromptMode;
  runMode: ProviderRunMode;
  timeoutSeconds: number;
  maxOutputBytes: number;
  capabilities: string[];
  assignedRoles: string[];
  lastTestAt?: string;
  lastTestResult?: string;
  lastContractCheckAt?: string;
  lastContractCheckResult?: string;
}

export interface ProviderPreset {
  id: string;
  name: string;
  description: string;
  providers: Provider[];
}

export interface CommandPolicy {
  allow: string[];
  approvalRequired: string[];
  deny: string[];
}

export interface ProviderRunResult {
  status:
    | "success"
    | "failed_exit_code"
    | "blocked_by_policy"
    | "approval_required"
    | "timeout"
    | "not_available";
  stdout: string;
  stderr: string;
  exitCode?: number;
  durationMs: number;
  decision: CommandDecision;
  redactedOutput: string;
}

export interface ProviderHealthResult {
  status: ProviderHealth;
  detail: string;
  versionOutput: string;
}

export interface CliCandidate {
  path: string;
  source: string;
  versionOutput: string;
  status: ProviderHealth;
}

export interface CliContractCheckResult {
  status: ProviderHealth;
  resolvedCommand: string;
  normalizedArgsTemplate: string;
  promptMode: PromptMode;
  diagnostics: Array<{
    level: "ok" | "info" | "warning" | "error";
    subject: string;
    detail: string;
  }>;
}

export interface LoopRunSnapshot {
  id: string;
  projectId: string;
  projectPath: string;
  taskId: string;
  taskTitle: string;
  taskBrief: string;
  taskCriteria: string[];
  taskConstraints: string[];
  taskBudgetLimit: number;
  taskSpecPath: string;
  taskSpecChecksum: string;
  memoryContext: string;
  memoryRefs: string[];
  status: "running" | "completed" | "failed" | "stopped" | "blocked";
  activeStepIndex: number;
  artifactDir: string;
  manifestPath: string;
  reportJsonPath: string;
  reportMarkdownPath: string;
  gitBaselinePath: string;
  commitProposalPath: string;
  securityReportPath: string;
  steps: LoopStep[];
}

export type TaskContractStatus = "draft" | "frozen" | "waiting_approval" | "approved" | "rejected" | "superseded";
export type WorkSliceStatus =
  | "proposed"
  | "waiting_approval"
  | "approved"
  | "running"
  | "self_checked"
  | "reviewed"
  | "security_reviewed"
  | "accepted"
  | "rework_required"
  | "rejected"
  | "blocked";
export type HarnessRunStatus =
  | "draft"
  | "spec_ready"
  | "planned"
  | "waiting_approval"
  | "approved"
  | "slice_running"
  | "self_checked"
  | "reviewed"
  | "security_reviewed"
  | "evidence_ready"
  | "accepted"
  | "rework"
  | "rejected"
  | "shipped"
  | "blocked";

export interface TaskContract {
  id: string;
  projectId: string;
  projectPath: string;
  taskId: string;
  version: number;
  title: string;
  businessGoal: string;
  scope: string;
  outOfScope: string;
  allowedPaths: string[];
  forbiddenPaths: string[];
  acceptanceCriteria: string[];
  testRequirements: string[];
  evidenceRequirements: string[];
  approvalRequiredActions: string[];
  stopConditions: string[];
  budgetLimits: Record<string, unknown>;
  riskLevel: RiskLevel | string;
  status: TaskContractStatus;
  createdAt: string;
  frozenAt: string;
  approvedAt: string;
  artifactPath: string;
  checksum: string;
}

export interface WorkSlice {
  id: string;
  projectId: string;
  projectPath: string;
  taskId: string;
  contractId: string;
  title: string;
  description: string;
  sequence: number;
  status: WorkSliceStatus;
  agentRole: string;
  allowedPaths: string[];
  commandsAllowed: string[];
  approvalRequired: boolean;
  acceptanceCriteria: string[];
  resultSummary: string;
  createdAt: string;
  startedAt: string;
  completedAt: string;
  artifactPath: string;
}

export interface HarnessRun {
  id: string;
  projectId: string;
  projectPath: string;
  taskId: string;
  contractId: string;
  status: HarnessRunStatus;
  currentStage: string;
  currentSliceId: string;
  createdAt: string;
  startedAt: string;
  completedAt: string;
  lastError: string;
  compatibilityLoopRunId: string;
  manifestPath: string;
}

export interface EvidencePack {
  id: string;
  projectId: string;
  projectPath: string;
  taskId: string;
  contractId: string;
  harnessRunId: string;
  status: string;
  manifestPath: string;
  reportPath: string;
  createdAt: string;
  finalizedAt: string;
  finalDecision: string;
  refs: Record<string, unknown>;
}

export interface HarnessOverview {
  contracts: TaskContract[];
  slices: WorkSlice[];
  runs: HarnessRun[];
  evidencePacks: EvidencePack[];
}

export interface EvidenceDiagnostic {
  level: "ok" | "warning" | "error";
  subject: string;
  detail: string;
}

export interface LoopEvidenceBundle {
  version: number;
  kind: "loop-evidence-bundle";
  loadedAt: string;
  projectPath: string;
  loopId: string;
  loop: Record<string, unknown> | null;
  taskSpec: Record<string, unknown> | null;
  acceptancePackage: Record<string, unknown> | null;
  acceptanceMarkdown: string;
  securityReport: Record<string, unknown> | null;
  gitWorkspace: Record<string, unknown> | null;
  gitDiff: string;
  gitDiffStat: string;
  approvalLedger: Record<string, unknown> | null;
  stepEvidence: Array<Record<string, unknown>>;
  diagnostics: EvidenceDiagnostic[];
  health: {
    missingArtifacts: number;
    warnings: number;
    stepEvidenceCount: number;
    pendingApprovals: number;
    verdict: string;
    status: string;
    scopePassed: boolean;
    securityFindings: number;
  };
  refs: Record<string, string>;
}

export interface LaunchDoctorReport {
  version: number;
  kind: "launch-doctor";
  generatedAt: string;
  projectPath: string;
  status: string;
  blockers: Array<Record<string, unknown>>;
  warnings: Array<Record<string, unknown>>;
  steps: Array<Record<string, unknown>>;
  refs: Record<string, string>;
  summary: {
    systemAuditStatus?: string;
    operatorStatus?: string;
    approvalLedgerStatus?: string;
    approvalQueueStatus?: string;
    pendingApprovals?: number;
    pendingApprovalQueueItems?: number;
    loopStateMachineStatus?: string;
    runJournalStatus?: string;
    runJournalEvents?: number;
    comparisonStatus?: string;
    providerContractsStatus?: string;
    providerSessionsStatus?: string;
    revertStatus?: string;
    realMicroPreflightStatus?: string;
    realMicroRunbookStatus?: string;
    supportBundleStatus?: string;
  };
  nextAction: string;
}

export interface RealMicroPreflightReport {
  version: number;
  kind: "real-micro-preflight";
  generatedAt: string;
  projectPath: string;
  status: string;
  blockers: Array<Record<string, unknown>>;
  warnings: Array<Record<string, unknown>>;
  checks: Array<Record<string, unknown>>;
  approvals: {
    required: string[];
    approved: Record<string, boolean>;
    ready: boolean;
  };
  profile: {
    intendedRealProviders: string[];
    activeRealProviderIds: string[];
    ready: boolean;
  };
  terminalHandoff?: {
    required: boolean;
    providerIds: string[];
    surface: string;
  };
  task: Record<string, unknown>;
  refs: Record<string, string>;
  nextAction: string;
}

export interface ProviderSessionReport {
  version: number;
  kind: "provider-sessions";
  generatedAt: string;
  projectPath: string;
  status: string;
  blockers: Array<Record<string, unknown>>;
  warnings: Array<Record<string, unknown>>;
  records: Array<{
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    runMode: string;
    providerKind: string;
    command: string;
    resolvedCommand: string;
    exactPath: boolean;
    promptMode: string;
    argsTemplate: string;
    cwd: string;
    cwdExists: boolean;
    supportedModes: string[];
    contract: Record<string, unknown>;
    version: Record<string, unknown>;
    auth: Record<string, unknown>;
    status: string;
    blockers: Array<Record<string, unknown>>;
    warnings: Array<Record<string, unknown>>;
  }>;
  environment: Record<string, unknown>;
  refs: Record<string, string>;
  nextAction: string;
}

export interface LoopStateMachineReport {
  version: number;
  kind: "loop-state-machine";
  generatedAt: string;
  projectPath: string;
  loopId: string;
  taskId: string;
  status: string;
  currentState: string;
  nextState: string;
  blockers: Array<Record<string, unknown>>;
  warnings: Array<Record<string, unknown>>;
  transitions: Array<{
    order: number;
    id: string;
    from: string;
    to: string;
    status: string;
    detail: string;
    stepId: string;
    stepStatus: string;
    evidence: string[];
    refs: string[];
  }>;
  invariants: Record<string, unknown>;
  gates: Record<string, unknown>;
  refs: Record<string, string>;
  nextAction: string;
}

export interface RunJournalReport {
  version: number;
  kind: "run-journal";
  generatedAt: string;
  projectPath: string;
  loopId: string;
  task: {
    id: string;
    title: string;
    profile: string;
    providerStrategy: string;
  };
  status: string;
  blockers: Array<Record<string, unknown>>;
  warnings: Array<Record<string, unknown>>;
  summary: {
    events: number;
    providerCalls: number;
    steps: number;
    passedSteps: number;
    failedSteps: number;
    pendingApprovals: number;
    pendingApprovalQueueItems: number;
    securityFindings: number;
    scopePassed: boolean;
    realProviderCallsUsed: number;
    realProviderBudgetOk: boolean;
  };
  checks: Array<{ id: string; status: string; detail: string }>;
  events: Array<{
    version: number;
    id: string;
    at: string;
    type: string;
    actor: string;
    status: string;
    title: string;
    detail: string;
    evidence: string[];
  }>;
  providerCalls: Array<{
    stepId: string;
    state: string;
    agent: string;
    providerId: string;
    providerType: string;
    providerRunMode: string;
    promptMode: string;
    command: string;
    argsTemplate: string;
    resolvedCommand: string;
    exactPath: boolean;
    status: string;
    attemptCount: number;
    maxAttempts: number;
    requiresApproval: boolean;
    outputExcerpt: string;
    artifactPath: string;
    evidencePath: string;
  }>;
  artifacts: Record<string, unknown>;
  refs: Record<string, string>;
  nextAction: string;
}

export interface RealMicroRunbookReport {
  version: number;
  kind: "real-micro-runbook";
  generatedAt: string;
  projectPath: string;
  status: string;
  blockers: Array<Record<string, unknown>>;
  warnings: Array<Record<string, unknown>>;
  checks: Array<Record<string, unknown>>;
  surfaces: {
    allowed: Array<{ id: string; detail: string }>;
    denied: Array<{ id: string; detail: string }>;
  };
  sequence: Array<Record<string, unknown>>;
  manualCommands: Array<Record<string, unknown>>;
  gates: Record<string, unknown>;
  refs: Record<string, string>;
  nextAction: string;
}

export interface RealMicroComparisonReport {
  version: number;
  kind: "real-micro-comparison";
  generatedAt: string;
  projectPath: string;
  status: string;
  blockers: Array<Record<string, unknown>>;
  warnings: Array<Record<string, unknown>>;
  checks: Array<Record<string, unknown>>;
  refs: Record<string, string>;
  nextActions: string[];
}

export interface RevertEvidenceReport {
  version: number;
  kind: "revert-evidence";
  generatedAt: string;
  projectPath: string;
  status: string;
  blockers: Array<Record<string, unknown>>;
  warnings: Array<Record<string, unknown>>;
  checks: Array<Record<string, unknown>>;
  providers: {
    activeRealProviders: Array<Record<string, unknown>>;
    activeMockProviders: Array<Record<string, unknown>>;
  };
  realMicro: Record<string, unknown>;
  refs: Record<string, string>;
  nextAction: string;
}

export interface SupportBundleReport {
  version: number;
  kind: "support-bundle";
  generatedAt: string;
  projectPath: string;
  status: string;
  bundleDir: string;
  tarPath: string;
  tarStatus: string;
  blockers: Array<Record<string, unknown>>;
  warnings: Array<Record<string, unknown>>;
  skipped: Array<Record<string, unknown>>;
  files: Array<{
    source: string;
    bundlePath: string;
    bytes: number;
    checksum: string;
  }>;
  refs: Record<string, unknown>;
  hygiene: Record<string, boolean>;
}

export interface ApprovalQueueReport {
  version: number;
  kind: "approval-queue";
  generatedAt: string;
  projectPath: string;
  status: string;
  summary: {
    total: number;
    required: number;
    pending: number;
    pendingRequired: number;
    approved: number;
    blocked: number;
    notRequired: number;
  };
  blockers: Array<Record<string, unknown>>;
  warnings: Array<Record<string, unknown>>;
  items: Array<{
    version: number;
    id: string;
    kind: string;
    title: string;
    status: "approved" | "pending" | "blocked" | "not_required";
    risk: RiskLevel;
    required: boolean;
    reason: string;
    provider: string;
    surface: string;
    decisionPath: string;
    sourceStatus: string;
    evidence: string[];
    nextAction: string;
  }>;
  refs: Record<string, string>;
  nextAction: string;
}

export interface AppState {
  projects: Project[];
  activeProjectId: string;
  providers: Provider[];
  agents: AgentRole[];
  commandPolicy: CommandPolicy;
  tasks: Task[];
  loopSteps: LoopStep[];
  approvals: ApprovalRequest[];
  audit: AuditEvent[];
  costs: CostEvent[];
  memory: MemoryNote[];
}
