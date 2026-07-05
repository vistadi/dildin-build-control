import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  Boxes,
  Brain,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Code2,
  FileText,
  FolderGit2,
  Gauge,
  GitBranch,
  History,
  Home,
  KeyRound,
  ListChecks,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  Square,
  TerminalSquare,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { normalizeProviderConfig, providerContractDiagnostics } from "./cliContracts";
import { loopTemplate, providerPresets } from "./data";
import { loadState, resetState, saveState, uid } from "./storage";
import {
  advanceBackendLoop,
  advanceHarnessRun,
  approveTaskContract,
  approveWorkSlice,
  approveOperatorGate,
  applyProviderProfile,
  createTaskContract,
  createWorkSlice,
  freezeTaskContract,
  checkCliContract,
  classifyCommand,
  discoverCli,
  generateEvidencePack,
  generateRealMicroRunbookReport,
  generateRealMicroPreflightReport,
  loadApprovalQueueReport,
  generateOperatorChecklist,
  generateReleasePackage,
  getBackendLoop,
  isTauriRuntime,
  listBackendLoops,
  loadLaunchDoctorReport,
  loadLoopStateMachineReport,
  loadLoopEvidenceBundle,
  loadRunJournalReport,
  loadOperatorChecklistReport,
  loadProviderSessionReport,
  loadRealMicroComparisonReport,
  loadRealMicroPreflightReport,
  loadRealMicroRunbookReport,
  loadRevertEvidenceReport,
  loadSupportBundleReport,
  loadBackendLoopManifest,
  loadHarnessOverview,
  loadProjectConfig,
  loadTaskSpec,
  resolveBackendLoopApproval,
  recoverProjectState,
  retryBackendLoop,
  runControlledSmokeLoop,
  saveMemoryNote,
  saveProjectConfig,
  saveTaskSpec,
  startHarnessRun,
  startBackendLoop,
  testCliProvider,
} from "./tauriBridge";
import type { ProjectConfigDiagnostic } from "./tauriBridge";
import type { LoopRunSummary } from "./tauriBridge";
import type { OperatorChecklistResult } from "./tauriBridge";
import type { ReleasePackageResult } from "./tauriBridge";
import type {
  AgentExecutionMode,
  AgentRole,
  AppState,
  ApprovalQueueReport,
  ApprovalRequest,
  CliCandidate,
  CliContractCheckResult,
  HarnessOverview,
  HarnessRun,
  LaunchDoctorReport,
  LoopRunSnapshot,
  LoopEvidenceBundle,
  LoopStateMachineReport,
  LoopStep,
  LoopState,
  Provider,
  ProviderSessionReport,
  ProviderStrategy,
  RealMicroComparisonReport,
  ProviderRunMode,
  RealMicroPreflightReport,
  RealMicroRunbookReport,
  RevertEvidenceReport,
  RunJournalReport,
  RiskLevel,
  SupportBundleReport,
  Task,
  TaskLoopProfile,
  TaskPriority,
} from "./types";

type View =
  | "home"
  | "projects"
  | "workspace"
  | "tasks"
  | "preflight"
  | "agents"
  | "loops"
  | "approvals"
  | "reports"
  | "settings";

const navItems: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "home", label: "Control Tower", icon: Home },
  { id: "projects", label: "Projects", icon: FolderGit2 },
  { id: "workspace", label: "Workspace", icon: Boxes },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "preflight", label: "Preflight", icon: Gauge },
  { id: "agents", label: "AI Team", icon: Bot },
  { id: "loops", label: "Loops", icon: RotateCcw },
  { id: "approvals", label: "Approvals", icon: ShieldCheck },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: KeyRound },
];

export function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [view, setView] = useState<View>("home");
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [currentLoop, setCurrentLoop] = useState<LoopRunSnapshot | null>(null);
  const [evidenceBundle, setEvidenceBundle] = useState<LoopEvidenceBundle | null>(null);
  const [loopStateMachine, setLoopStateMachine] = useState<LoopStateMachineReport | null>(null);
  const [runJournal, setRunJournal] = useState<RunJournalReport | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [newProjectPath, setNewProjectPath] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [preflightTask, setPreflightTask] = useState<Task | null>(null);
  const [loopHistory, setLoopHistory] = useState<LoopRunSummary[]>([]);
  const [projectRecoveryDiagnostics, setProjectRecoveryDiagnostics] = useState<ProjectConfigDiagnostic[]>([]);
  const [releasePackage, setReleasePackage] = useState<ReleasePackageResult | null>(null);
  const [operatorChecklist, setOperatorChecklist] = useState<OperatorChecklistResult | null>(null);
  const [launchDoctor, setLaunchDoctor] = useState<LaunchDoctorReport | null>(null);
  const [approvalQueue, setApprovalQueue] = useState<ApprovalQueueReport | null>(null);
  const [harnessOverview, setHarnessOverview] = useState<HarnessOverview>({ contracts: [], slices: [], runs: [], evidencePacks: [] });
  const [providerSessionReport, setProviderSessionReport] = useState<ProviderSessionReport | null>(null);
  const [realMicroComparison, setRealMicroComparison] = useState<RealMicroComparisonReport | null>(null);
  const [realMicroPreflight, setRealMicroPreflight] = useState<RealMicroPreflightReport | null>(null);
  const [realMicroRunbook, setRealMicroRunbook] = useState<RealMicroRunbookReport | null>(null);
  const [revertEvidence, setRevertEvidence] = useState<RevertEvidenceReport | null>(null);
  const [supportBundle, setSupportBundle] = useState<SupportBundleReport | null>(null);
  const stateRef = useRef(state);
  const recoveredProjectsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    stateRef.current = state;
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (!running || !currentLoop) return;
    const timer = window.setTimeout(async () => {
      const previousActive = currentLoop.steps[currentLoop.activeStepIndex];
      const nextLoop = await advanceBackendLoop(currentLoop.id, currentLoop);
      const executedStep = nextLoop.steps[currentLoop.activeStepIndex] ?? previousActive;
      const stopped = nextLoop.status !== "running" && nextLoop.status !== "completed";
      const approvalId = executedStep?.status === "approval_required" ? `APP-${nextLoop.id}-${executedStep.id}` : "";
      setCurrentLoop(nextLoop);
      setActiveStep(nextLoop.activeStepIndex);
      setState((current) => ({
        ...current,
        loopSteps: nextLoop.steps,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                latestLoop:
                  nextLoop.status === "completed"
                    ? "completed"
                    : stopped
                      ? "failed"
                      : nextLoop.steps[nextLoop.activeStepIndex]?.state ?? "planned",
                risk: nextLoop.status === "completed" ? "low" : stopped ? "high" : project.risk,
              }
            : project,
        ),
        tasks: current.tasks.map((task) =>
          task.id === nextLoop.taskId && nextLoop.status === "completed"
            ? { ...task, status: "done" }
            : task.id === nextLoop.taskId && stopped
              ? { ...task, status: "blocked" }
              : task,
        ),
        approvals:
          executedStep?.status === "approval_required" && !current.approvals.some((approval) => approval.id === approvalId)
            ? [
                {
                  id: approvalId,
                  kind: "backend_step",
                  loopId: nextLoop.id,
                  stepId: executedStep.id,
                  action: `Resume ${executedStep.state}`,
                  reason: `${executedStep.agent} requested human approval before continuing the backend loop.`,
                  requester: executedStep.agent,
                  risk: "high",
                  command: executedStep.localCommands?.join("\n") ?? "",
                  preview: executedStep.output ?? "Approval required by CLI or command policy.",
                  artifactPath: executedStep.artifactPath,
                  createdAt: new Date().toISOString(),
                  status: "pending",
                },
                ...current.approvals,
              ]
            : current.approvals,
        costs: [
          {
            id: uid("COST"),
            provider: previousActive?.providerId ?? "backend_loop",
            model: "backend-state-machine",
            agent: previousActive?.agent ?? "Loop Engine",
            taskId: nextLoop.taskId,
            amount: 0,
            confidence: "unknown",
          },
          ...current.costs,
        ],
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: previousActive?.agent ?? "Loop Engine",
            action: `Backend loop step: ${previousActive?.state ?? "unknown"}`,
            result:
              nextLoop.status === "completed"
                ? `Loop ${nextLoop.id} completed. Report: ${nextLoop.reportMarkdownPath}`
                : stopped
                  ? `Loop ${nextLoop.id} stopped at ${executedStep?.state ?? "unknown"} with status ${executedStep?.status ?? nextLoop.status}.`
                  : `Loop ${nextLoop.id} advanced to ${nextLoop.steps[nextLoop.activeStepIndex]?.state}.`,
          },
          ...current.audit,
        ],
      }));
      if (nextLoop.status !== "running") {
        setRunning(false);
      }
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [running, currentLoop]);

  const activeProject = state.projects.find((project) => project.id === state.activeProjectId) ?? state.projects[0];
  const pendingApprovals = state.approvals.filter((approval) => approval.status === "pending");
  const totalCost = state.costs.reduce((sum, event) => sum + event.amount, 0);

  useEffect(() => {
    void refreshLoopHistory();
    void refreshLoopStateMachine();
    void refreshRunJournal();
    void refreshLaunchDoctor();
    void refreshApprovalQueue();
    void refreshSupportBundle();
    void refreshOperatorChecklist();
    void refreshProviderSessionReport();
    void refreshHarnessOverview();
    void refreshRealMicroComparison();
    void refreshRealMicroPreflight();
    void refreshRealMicroRunbook();
    void refreshRevertEvidence();
  }, [activeProject?.path]);

  useEffect(() => {
    if (!activeProject?.path || recoveredProjectsRef.current.has(activeProject.path)) return;
    recoveredProjectsRef.current.add(activeProject.path);
    void recoverActiveProject(activeProject.path);
  }, [activeProject?.path]);

  useEffect(() => {
    if (currentLoop) void refreshLoopHistory();
    if (currentLoop) void refreshLoopStateMachine(currentLoop.projectPath);
    if (currentLoop) void refreshRunJournal(currentLoop.projectPath);
  }, [currentLoop?.id, currentLoop?.status]);

  useEffect(() => {
    if (currentLoop?.id && currentLoop.projectPath) {
      void refreshEvidenceBundle(currentLoop.projectPath, currentLoop.id);
    } else {
      setEvidenceBundle(null);
    }
  }, [currentLoop?.id, currentLoop?.status]);

  function patchState(patch: Partial<AppState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  async function refreshLoopHistory() {
    if (!activeProject?.path) {
      setLoopHistory([]);
      return;
    }
    try {
      const history = await listBackendLoops(activeProject.path);
      setLoopHistory(history);
    } catch {
      setLoopHistory([]);
    }
  }

  async function refreshHarnessOverview(projectPath = activeProject?.path) {
    if (!projectPath) {
      setHarnessOverview({ contracts: [], slices: [], runs: [], evidencePacks: [] });
      return;
    }
    try {
      setHarnessOverview(await loadHarnessOverview(projectPath));
    } catch {
      setHarnessOverview({ contracts: [], slices: [], runs: [], evidencePacks: [] });
    }
  }

  async function refreshEvidenceBundle(projectPath = currentLoop?.projectPath ?? activeProject?.path, loopId = currentLoop?.id) {
    if (!projectPath || !loopId) return;
    setEvidenceLoading(true);
    try {
      const bundle = await loadLoopEvidenceBundle(projectPath, loopId);
      setEvidenceBundle(bundle);
    } catch (error) {
      setEvidenceBundle({
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
            level: "error",
            subject: "evidence bundle",
            detail: error instanceof Error ? error.message : String(error),
          },
        ],
        health: {
          missingArtifacts: 1,
          warnings: 0,
          stepEvidenceCount: 0,
          pendingApprovals: 0,
          verdict: "error",
          status: "error",
          scopePassed: false,
          securityFindings: 0,
        },
        refs: {},
      });
    } finally {
      setEvidenceLoading(false);
    }
  }

  async function refreshLoopStateMachine(projectPath = activeProject?.path) {
    if (!projectPath) {
      setLoopStateMachine(null);
      return;
    }
    try {
      const report = await loadLoopStateMachineReport(projectPath);
      setLoopStateMachine(report);
    } catch {
      setLoopStateMachine(null);
    }
  }

  async function refreshRunJournal(projectPath = activeProject?.path) {
    if (!projectPath) {
      setRunJournal(null);
      return;
    }
    try {
      const report = await loadRunJournalReport(projectPath);
      setRunJournal(report);
    } catch {
      setRunJournal(null);
    }
  }

  async function refreshApprovalQueue(projectPath = activeProject?.path) {
    if (!projectPath) {
      setApprovalQueue(null);
      return;
    }
    try {
      const report = await loadApprovalQueueReport(projectPath);
      setApprovalQueue(report);
    } catch {
      setApprovalQueue(null);
    }
  }

  async function refreshLaunchDoctor(projectPath = activeProject?.path) {
    if (!projectPath) {
      setLaunchDoctor(null);
      return;
    }
    try {
      const report = await loadLaunchDoctorReport(projectPath);
      setLaunchDoctor(report);
    } catch {
      setLaunchDoctor(null);
    }
  }

  async function refreshSupportBundle(projectPath = activeProject?.path) {
    if (!projectPath) {
      setSupportBundle(null);
      return;
    }
    try {
      const report = await loadSupportBundleReport(projectPath);
      setSupportBundle(report);
    } catch {
      setSupportBundle(null);
    }
  }

  async function refreshProviderSessionReport(projectPath = activeProject?.path) {
    if (!projectPath) {
      setProviderSessionReport(null);
      return;
    }
    try {
      const report = await loadProviderSessionReport(projectPath);
      setProviderSessionReport(report);
    } catch {
      setProviderSessionReport(null);
    }
  }

  async function refreshRealMicroComparison(projectPath = activeProject?.path) {
    if (!projectPath) {
      setRealMicroComparison(null);
      return;
    }
    try {
      const report = await loadRealMicroComparisonReport(projectPath);
      setRealMicroComparison(report);
    } catch {
      setRealMicroComparison(null);
    }
  }

  async function refreshRevertEvidence(projectPath = activeProject?.path) {
    if (!projectPath) {
      setRevertEvidence(null);
      return;
    }
    try {
      const report = await loadRevertEvidenceReport(projectPath);
      setRevertEvidence(report);
    } catch {
      setRevertEvidence(null);
    }
  }

  async function refreshOperatorChecklist(projectPath = activeProject?.path) {
    if (!projectPath) {
      setOperatorChecklist(null);
      return;
    }
    try {
      const report = await loadOperatorChecklistReport(projectPath);
      setOperatorChecklist(report);
    } catch {
      setOperatorChecklist(null);
    }
  }

  async function refreshRealMicroPreflight(projectPath = activeProject?.path) {
    if (!projectPath) {
      setRealMicroPreflight(null);
      return;
    }
    try {
      const report = await loadRealMicroPreflightReport(projectPath);
      setRealMicroPreflight(report);
    } catch {
      setRealMicroPreflight(null);
    }
  }

  async function refreshRealMicroRunbook(projectPath = activeProject?.path) {
    if (!projectPath) {
      setRealMicroRunbook(null);
      return;
    }
    try {
      const report = await loadRealMicroRunbookReport(projectPath);
      setRealMicroRunbook(report);
    } catch {
      setRealMicroRunbook(null);
    }
  }

  async function createRealMicroRunbook() {
    if (!activeProject?.path) return;
    try {
      const report = await generateRealMicroRunbookReport(activeProject.path);
      setRealMicroRunbook(report);
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Operator",
            action: "Real micro runbook generated",
            result: `${report.status}; blockers ${report.blockers.length}; warnings ${report.warnings.length}`,
          },
          ...current.audit,
        ],
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Operator",
            action: "Real micro runbook failed",
            result: error instanceof Error ? error.message : String(error),
          },
          ...current.audit,
        ],
      }));
    }
  }

  async function createRealMicroPreflight() {
    if (!activeProject?.path) return;
    try {
      const report = await generateRealMicroPreflightReport(activeProject.path);
      setRealMicroPreflight(report);
      void refreshRealMicroRunbook();
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Operator",
            action: "Real micro dry-run generated",
            result: `${report.status}; blockers ${report.blockers.length}; warnings ${report.warnings.length}`,
          },
          ...current.audit,
        ],
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Operator",
            action: "Real micro dry-run failed",
            result: error instanceof Error ? error.message : String(error),
          },
          ...current.audit,
        ],
      }));
    }
  }

  async function runApprovedRealMicroTask() {
    if (!activeProject?.path) return;
    try {
      const report = await generateRealMicroPreflightReport(activeProject.path);
      setRealMicroPreflight(report);
      if (report.status !== "ready_to_run" || report.blockers.length > 0) {
        setState((current) => ({
          ...current,
          audit: [
            {
              id: uid("AUD"),
              time: currentTime(),
              actor: "Operator",
              action: "Real micro run blocked",
              result: `${report.status}; blockers ${report.blockers.length}; ${report.nextAction}`,
            },
            ...current.audit,
          ],
        }));
        return;
      }
      const task = await ensureRealMicroTaskLoaded();
      if (!task) return;
      await startLoop(task, true);
    } catch (error) {
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Operator",
            action: "Real micro run failed",
            result: error instanceof Error ? error.message : String(error),
          },
          ...current.audit,
        ],
      }));
    }
  }

  async function recoverActiveProject(projectPath: string) {
    try {
      const recovered = await recoverProjectState(projectPath);
      setProjectRecoveryDiagnostics(recovered.diagnostics);
      setLoopHistory(recovered.loops);
      setState((current) => {
        const providers = recovered.providers.length ? recovered.providers : current.providers;
        const agents = recovered.providers.length ? syncAssignedRoles(providers, current.agents) : current.agents;
        return {
          ...current,
          providers,
          agents,
          commandPolicy: recovered.commandPolicy.allow.length || recovered.commandPolicy.approvalRequired.length || recovered.commandPolicy.deny.length
            ? recovered.commandPolicy
            : current.commandPolicy,
          tasks: mergeTasks(current.tasks, recovered.tasks),
          memory: mergeMemory(current.memory, recovered.memory),
          audit: [
            {
              id: uid("AUD"),
              time: currentTime(),
              actor: "Project Recovery",
              action: ".dbc project state loaded",
              result: `${recovered.tasks.length} task(s), ${recovered.memory.length} memory note(s), ${recovered.loops.length} loop(s), ${recovered.diagnostics.length} diagnostic(s).`,
            },
            ...current.audit,
          ],
        };
      });
    } catch (error) {
      setProjectRecoveryDiagnostics([
        {
          level: "error",
          subject: "recovery",
          detail: error instanceof Error ? error.message : String(error),
        },
      ]);
    }
  }

  async function createReleasePackage() {
    if (!activeProject?.path) return;
    try {
      const result = await generateReleasePackage(activeProject.path);
      setReleasePackage(result);
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Release Manager",
            action: "Release package generated",
            result: `${result.markdownPath}; dmg checksum ${result.dmgChecksum || "missing"}`,
          },
          ...current.audit,
        ],
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Release Manager",
            action: "Release package failed",
            result: error instanceof Error ? error.message : String(error),
          },
          ...current.audit,
        ],
      }));
    }
  }

  async function createOperatorChecklist() {
    if (!activeProject?.path) return;
    try {
      const result = await generateOperatorChecklist(activeProject.path);
      setOperatorChecklist(result);
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Operator",
            action: "Operator checklist generated",
            result: `${result.status}; blockers ${result.blockers}; warnings ${result.warnings}; ${result.markdownPath}`,
          },
          ...current.audit,
        ],
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Operator",
            action: "Operator checklist failed",
            result: error instanceof Error ? error.message : String(error),
          },
          ...current.audit,
        ],
      }));
    }
  }

  async function approveOperatorChecklist() {
    if (!activeProject?.path) return;
    try {
      const result = await approveOperatorGate(activeProject.path);
      setOperatorChecklist(result);
      void refreshLaunchDoctor();
      void refreshApprovalQueue();
      void refreshProviderSessionReport();
      void refreshSupportBundle();
      void refreshRevertEvidence();
      void refreshRealMicroPreflight();
      void refreshRealMicroRunbook();
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Operator",
            action: "Operator gate approved",
            result: `${result.status}; approval ${result.approvalStatus}; ${result.approvalPath}`,
          },
          ...current.audit,
        ],
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Operator",
            action: "Operator approval failed",
            result: error instanceof Error ? error.message : String(error),
          },
          ...current.audit,
        ],
      }));
    }
  }

  async function applyProviderProfileFromHome(profile: "mock" | "real-micro") {
    if (!activeProject?.path) return;
    try {
      const result = await applyProviderProfile(activeProject.path, profile);
      setState((current) => {
        const shouldApplyProviders = result.providers.length > 0;
        const providers = shouldApplyProviders ? result.providers : current.providers;
        const agents = shouldApplyProviders ? syncAssignedRoles(providers, current.agents) : current.agents;
        return {
          ...current,
          providers: shouldApplyProviders ? syncProvidersWithAgents(providers, agents) : current.providers,
          agents,
          audit: [
            {
              id: uid("AUD"),
              time: currentTime(),
              actor: "Provider Manager",
              action: "Provider profile applied",
              result: `${result.applied}; ${result.providersPath}#${result.checksum}; backup ${result.backupPath || "none"}`,
            },
            ...current.audit,
          ],
        };
      });
      void refreshLaunchDoctor();
      void refreshApprovalQueue();
      void refreshProviderSessionReport();
      void refreshSupportBundle();
      void refreshOperatorChecklist();
      void refreshRevertEvidence();
      void refreshRealMicroPreflight();
      void refreshRealMicroRunbook();
    } catch (error) {
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Provider Manager",
            action: "Provider profile failed",
            result: error instanceof Error ? error.message : String(error),
          },
          ...current.audit,
        ],
      }));
    }
  }

  async function ensureRealMicroTaskLoaded() {
    const existing =
      stateRef.current.tasks.find((item) => item.id === "REAL-MICRO-README") ??
      stateRef.current.tasks.find((item) => item.loopProfile === "real_micro");
    if (existing || !activeProject?.path) return existing;
    const loaded = await loadTaskSpec(activeProject.path, "REAL-MICRO-README");
    setState((current) => ({
      ...current,
      tasks: mergeTasks(current.tasks, [loaded]),
      audit: [
        {
          id: uid("AUD"),
          time: currentTime(),
          actor: "Operator",
          action: "Real micro task loaded",
          result: `${loaded.id}; ${loaded.specPath}#${loaded.specChecksum}`,
        },
        ...current.audit,
      ],
    }));
    return loaded;
  }

  async function openRealMicroPreflight() {
    const task = await ensureRealMicroTaskLoaded().catch((error) => {
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Operator",
            action: "Real micro task load failed",
            result: error instanceof Error ? error.message : String(error),
          },
          ...current.audit,
        ],
      }));
      return undefined;
    });
    if (!task) {
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Operator",
            action: "Real micro preflight unavailable",
            result: "REAL-MICRO-README task is not loaded in the app state.",
          },
          ...current.audit,
        ],
      }));
      return;
    }
    setPreflightTask(task);
    setView("preflight");
  }

  async function openLoopRun(summary: LoopRunSummary) {
    try {
      let loop: LoopRunSnapshot;
      try {
        loop = await getBackendLoop(summary.id);
      } catch {
        loop = await loadBackendLoopManifest(summary.projectPath || activeProject.path, summary.id);
      }
      setCurrentLoop(loop);
      setActiveStep(loop.activeStepIndex);
      setRunning(false);
      setState((current) => ({
        ...current,
        loopSteps: loop.steps,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Loop Recovery",
            action: "Loop opened",
            result: `${loop.id}: ${loop.taskTitle || loop.taskId}`,
          },
          ...current.audit,
        ],
      }));
      setView("loops");
    } catch (error) {
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Loop Recovery",
            action: "Loop open failed",
            result: error instanceof Error ? error.message : String(error),
          },
          ...current.audit,
        ],
      }));
    }
  }

  function importProject() {
    const trimmed = newProjectPath.trim();
    if (!trimmed) return;
    const name = trimmed.split("/").filter(Boolean).pop() ?? "Imported Project";
    const project = {
      id: uid("PRJ"),
      name,
      path: trimmed,
      branch: "main",
      stack: detectStack(trimmed),
      changedFiles: 0,
      openTasks: 0,
      risk: "low" as RiskLevel,
      cost: 0,
      latestLoop: "planned" as LoopState,
    };
    setState((current) => ({
      ...current,
      projects: [project, ...current.projects],
      activeProjectId: project.id,
      audit: [
        {
          id: uid("AUD"),
          time: currentTime(),
          actor: "Workspace Manager",
          action: "Project imported",
          result: `${name} added with mock stack detection.`,
        },
        ...current.audit,
      ],
    }));
    setNewProjectPath("");
    setView("workspace");
  }

  function createTask(task: Task) {
    setState((current) => ({
      ...current,
      tasks: upsertTask(current.tasks, task, true),
      projects: current.projects.map((project) =>
        project.id === current.activeProjectId && !current.tasks.some((item) => item.id === task.id)
          ? { ...project, openTasks: project.openTasks + 1 }
          : project,
      ),
      audit: [
        {
          id: uid("AUD"),
          time: currentTime(),
          actor: "Task Composer",
          action: "Task created",
          result: `${task.id}: ${task.title}`,
        },
        ...current.audit,
      ],
    }));
  }

  function prepareSmokeTest(runImmediately = false) {
    const task = createSmokeTestTask();
    setState((current) => ({
      ...current,
      tasks: upsertTask(current.tasks, task, true),
      projects: current.projects.map((project) =>
        project.id === current.activeProjectId && !current.tasks.some((item) => item.id === task.id)
          ? { ...project, openTasks: project.openTasks + 1 }
          : project,
      ),
      audit: [
        {
          id: uid("AUD"),
          time: currentTime(),
          actor: "Smoke Test",
          action: runImmediately ? "Smoke loop prepared and started" : "Smoke task prepared",
          result: `${task.id}: ${task.title}`,
        },
        ...current.audit,
      ],
    }));
    setView("tasks");
    if (runImmediately) {
      void startLoop(task);
    }
  }

  async function saveTaskContract(taskId: string) {
    const snapshot = stateRef.current;
    const project = snapshot.projects.find((item) => item.id === snapshot.activeProjectId) ?? snapshot.projects[0];
    const task = snapshot.tasks.find((item) => item.id === taskId);
    if (!task) return;

    try {
      const record = await saveTaskSpec(project.path, task);
      setState((current) => ({
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === taskId
            ? { ...item, specPath: record.path, specChecksum: record.checksum, specUpdatedAt: record.updatedAt }
            : item,
        ),
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Task Composer",
            action: "Task spec saved",
            result: `${record.path}#${record.checksum}`,
          },
          ...current.audit,
        ],
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Task Composer",
            action: "Task spec save failed",
            result: error instanceof Error ? error.message : String(error),
          },
          ...current.audit,
        ],
      }));
    }
  }

  async function createHarnessContract(taskId: string) {
    const snapshot = stateRef.current;
    const project = snapshot.projects.find((item) => item.id === snapshot.activeProjectId) ?? snapshot.projects[0];
    const task = snapshot.tasks.find((item) => item.id === taskId);
    if (!project || !task) return;
    try {
      const contract = await createTaskContract(project.id, project.path, task);
      await refreshHarnessOverview(project.path);
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Harness Engine",
            action: "TaskContract created",
            result: `${contract.id} -> ${contract.artifactPath}`,
          },
          ...current.audit,
        ],
      }));
    } catch (error) {
      recordHarnessError("TaskContract create failed", error);
    }
  }

  async function freezeLatestContract(taskId: string) {
    const contract = latestContractForTask(taskId, harnessOverview.contracts, ["draft"]);
    if (!contract) return recordHarnessError("TaskContract freeze failed", `No draft contract for ${taskId}.`);
    try {
      const frozen = await freezeTaskContract(contract.id);
      await refreshHarnessOverview(frozen.projectPath);
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Harness Engine",
            action: "TaskContract frozen",
            result: `${frozen.id}: ${frozen.status}`,
          },
          ...current.audit,
        ],
      }));
    } catch (error) {
      recordHarnessError("TaskContract freeze failed", error);
    }
  }

  async function approveLatestContract(taskId: string) {
    const contract = latestContractForTask(taskId, harnessOverview.contracts, ["waiting_approval", "frozen"]);
    if (!contract) return recordHarnessError("TaskContract approval failed", `No frozen/waiting contract for ${taskId}.`);
    try {
      const approved = await approveTaskContract(contract.id);
      await refreshHarnessOverview(approved.projectPath);
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Human Approval",
            action: "TaskContract approved",
            result: `${approved.id}: ${approved.status}`,
          },
          ...current.audit,
        ],
      }));
    } catch (error) {
      recordHarnessError("TaskContract approval failed", error);
    }
  }

  async function createHarnessSlice(taskId: string) {
    const snapshot = stateRef.current;
    const project = snapshot.projects.find((item) => item.id === snapshot.activeProjectId) ?? snapshot.projects[0];
    const task = snapshot.tasks.find((item) => item.id === taskId);
    const contract = latestContractForTask(taskId, harnessOverview.contracts, ["approved"]);
    if (!project || !task) return;
    if (!contract) return recordHarnessError("WorkSlice create failed", `No approved TaskContract for ${taskId}.`);
    try {
      const slice = await createWorkSlice(project.id, project.path, task, contract.id, {
        approvalRequired: true,
        commandsAllowed: task.loopProfile === "controlled_smoke" ? ["pnpm build"] : [],
      });
      await refreshHarnessOverview(project.path);
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Harness Engine",
            action: "WorkSlice created",
            result: `${slice.id}: ${slice.status}`,
          },
          ...current.audit,
        ],
      }));
    } catch (error) {
      recordHarnessError("WorkSlice create failed", error);
    }
  }

  async function approveLatestSlice(taskId: string) {
    const slice = latestSliceForTask(taskId, harnessOverview.slices, ["waiting_approval", "proposed"]);
    if (!slice) return recordHarnessError("WorkSlice approval failed", `No waiting WorkSlice for ${taskId}.`);
    try {
      const approved = await approveWorkSlice(slice.id);
      await refreshHarnessOverview(approved.projectPath);
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Human Approval",
            action: "WorkSlice approved",
            result: `${approved.id}: ${approved.status}`,
          },
          ...current.audit,
        ],
      }));
    } catch (error) {
      recordHarnessError("WorkSlice approval failed", error);
    }
  }

  async function startSimpleHarnessForTask(taskId: string) {
    const snapshot = stateRef.current;
    const project = snapshot.projects.find((item) => item.id === snapshot.activeProjectId) ?? snapshot.projects[0];
    const task = snapshot.tasks.find((item) => item.id === taskId);
    if (!project || !task) return;

    try {
      let contract =
        latestContractForTask(taskId, harnessOverview.contracts, ["approved"]) ??
        latestContractForTask(taskId, harnessOverview.contracts, ["draft", "waiting_approval", "frozen"]);

      if (!contract) {
        contract = await createTaskContract(project.id, project.path, task);
      }
      if (contract.status === "draft") {
        contract = await freezeTaskContract(contract.id);
      }
      if (contract.status === "waiting_approval" || contract.status === "frozen") {
        contract = await approveTaskContract(contract.id);
      }
      if (contract.status !== "approved") {
        throw new Error(`Contract ${contract.id} is ${contract.status}; approved contract is required.`);
      }

      let slice = harnessOverview.slices
        .filter((item) => item.taskId === taskId && item.contractId === contract.id && item.status === "approved")
        .sort((left, right) => Number(right.createdAt) - Number(left.createdAt))[0];

      if (!slice) {
        slice = await createWorkSlice(project.id, project.path, task, contract.id, {
          approvalRequired: false,
          commandsAllowed: task.loopProfile === "controlled_smoke" ? ["pnpm build"] : [],
        });
      }
      if (slice.status === "waiting_approval" || slice.status === "proposed") {
        slice = await approveWorkSlice(slice.id);
      }
      if (slice.status !== "approved") {
        throw new Error(`WorkSlice ${slice.id} is ${slice.status}; approved slice is required.`);
      }

      const run = await startHarnessRun(project.id, project.path, task.id, contract.id, slice.id);
      if (run.compatibilityLoopRunId && isTauriRuntime()) {
        const loop = await getBackendLoop(run.compatibilityLoopRunId);
        setCurrentLoop(loop);
        setActiveStep(loop.activeStepIndex);
        setRunning(loop.status === "running");
        setState((current) => ({ ...current, loopSteps: loop.steps }));
      }
      await refreshHarnessOverview(project.path);
      setView("loops");
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Simple Mode",
            action: "Safe Harness run started",
            result: `${run.id}; contract ${contract.id}; slice ${slice.id}; loop ${run.compatibilityLoopRunId || "pending"}`,
          },
          ...current.audit,
        ],
      }));
    } catch (error) {
      recordHarnessError("Simple Harness start failed", error);
    }
  }

  async function startHarnessForTask(taskId: string) {
    const snapshot = stateRef.current;
    const project = snapshot.projects.find((item) => item.id === snapshot.activeProjectId) ?? snapshot.projects[0];
    const contract = latestContractForTask(taskId, harnessOverview.contracts, ["approved"]);
    const slice = latestSliceForTask(taskId, harnessOverview.slices, ["approved"]);
    if (!project || !contract || !slice) {
      return recordHarnessError("HarnessRun start failed", `Approved contract and approved slice are required for ${taskId}.`);
    }
    try {
      const run = await startHarnessRun(project.id, project.path, taskId, contract.id, slice.id);
      if (run.compatibilityLoopRunId && isTauriRuntime()) {
        const loop = await getBackendLoop(run.compatibilityLoopRunId);
        setCurrentLoop(loop);
        setActiveStep(loop.activeStepIndex);
        setRunning(loop.status === "running");
        setState((current) => ({ ...current, loopSteps: loop.steps }));
      }
      await refreshHarnessOverview(project.path);
      setView("loops");
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Harness Engine",
            action: "HarnessRun started",
            result: `${run.id}; loop ${run.compatibilityLoopRunId || "pending"}`,
          },
          ...current.audit,
        ],
      }));
    } catch (error) {
      recordHarnessError("HarnessRun start failed", error);
    }
  }

  async function advanceHarness(run: HarnessRun) {
    try {
      const advanced = await advanceHarnessRun(run.id);
      await refreshHarnessOverview(advanced.projectPath);
      if (advanced.compatibilityLoopRunId && isTauriRuntime()) {
        const loop = await getBackendLoop(advanced.compatibilityLoopRunId);
        setCurrentLoop(loop);
        setActiveStep(loop.activeStepIndex);
        setRunning(loop.status === "running");
        setState((current) => ({ ...current, loopSteps: loop.steps }));
      }
    } catch (error) {
      recordHarnessError("HarnessRun advance failed", error);
    }
  }

  async function generateHarnessPack(run: HarnessRun) {
    try {
      const pack = await generateEvidencePack(run.id);
      await refreshHarnessOverview(pack.projectPath);
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Evidence Pack",
            action: "EvidencePack generated",
            result: `${pack.id}: ${pack.manifestPath}`,
          },
          ...current.audit,
        ],
      }));
    } catch (error) {
      recordHarnessError("EvidencePack generation failed", error);
    }
  }

  function recordHarnessError(action: string, error: unknown) {
    setState((current) => ({
      ...current,
      audit: [
        {
          id: uid("AUD"),
          time: currentTime(),
          actor: "Harness Engine",
          action,
          result: error instanceof Error ? error.message : String(error),
        },
        ...current.audit,
      ],
    }));
  }

  async function startLoop(taskOverride?: Task, confirmed = false) {
    const snapshot = stateRef.current;
    const project = snapshot.projects.find((item) => item.id === snapshot.activeProjectId) ?? snapshot.projects[0];
    const task = taskOverride ?? snapshot.tasks[0];
    if (!confirmed) {
      setPreflightTask(task ?? null);
      setView("preflight");
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Preflight",
            action: "Loop preflight opened",
            result: `${task?.id ?? "TASK"}: ${task?.title ?? "Untitled task"}`,
          },
          ...current.audit,
        ],
      }));
      return;
    }
    const configuredSteps = buildConfiguredLoopSteps(snapshot.agents, snapshot.providers);
    const routingDiagnostics = buildProviderRoutingDiagnostics(snapshot.agents, snapshot.providers);
    const realLoopErrors = routingDiagnostics.filter((item) => item.level === "error");
    if (configuredSteps.some(isRealStep) && realLoopErrors.length) {
      setView("settings");
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Provider Router",
            action: "Real loop blocked",
            result: realLoopErrors.map((item) => `${item.subject}: ${item.detail}`).join("; "),
          },
          ...current.audit,
        ],
      }));
      return;
    }
    setView("loops");

    try {
      const taskSpec = task
        ? await saveTaskSpec(project.path, task)
        : await saveTaskSpec(project.path, {
            id: "TASK",
            title: "Untitled task",
            brief: "No task brief was provided.",
            criteria: [],
            constraints: [],
            budgetLimit: 0,
            risk: "medium",
            priority: "normal",
            loopProfile: "mock",
            providerStrategy: "mock_only",
            affectedPaths: [],
            allowedPaths: [],
            deniedPaths: [],
            requiredReviewers: [],
            stopConditions: [],
            status: "ready",
          });
      const memoryRecords = await Promise.all(
        snapshot.memory.slice(0, 12).map(async (note) => {
          const record =
            note.path && note.checksum
              ? { id: note.id, path: note.path, checksum: note.checksum, updatedAt: note.updatedAt ?? note.createdAt }
              : await saveMemoryNote(project.path, note);
          return { note, record };
        }),
      );
      const memoryContext = memoryRecords.length
        ? memoryRecords
            .map(({ note, record }) => `- [${note.type}] ${note.title}: ${note.body} (${record.path}#${record.checksum})`)
            .join("\n")
        : "";
      const memoryRefs = memoryRecords.map(({ record }) => `${record.path}#${record.checksum}`);
      const loop = await startBackendLoop({
        projectId: project.id,
        taskId: task?.id ?? "TASK",
        projectPath: project.path,
        taskTitle: task?.title ?? "Untitled task",
        taskBrief: task?.brief ?? "No task brief was provided.",
        taskCriteria: task?.criteria ?? [],
        taskConstraints: task?.constraints ?? [],
        taskBudgetLimit: task?.budgetLimit ?? 0,
        taskSpecPath: taskSpec.path,
        taskSpecChecksum: taskSpec.checksum,
        memoryContext,
        memoryRefs,
        steps: configuredSteps,
      });
      setCurrentLoop(loop);
      setActiveStep(loop.activeStepIndex);
      setRunning(true);
      setPreflightTask(null);
      setState((current) => ({
        ...current,
        loopSteps: loop.steps,
        memory: current.memory.map((note) => {
          const saved = memoryRecords.find((item) => item.note.id === note.id);
          return saved
            ? { ...note, path: saved.record.path, checksum: saved.record.checksum, updatedAt: saved.record.updatedAt ?? note.updatedAt }
            : note;
        }),
        tasks: upsertTask(
          current.tasks,
          {
            ...(task ?? {
              id: "TASK",
              title: "Untitled task",
              brief: "No task brief was provided.",
              criteria: [],
              constraints: [],
              budgetLimit: 0,
              risk: "medium" as RiskLevel,
              priority: "normal",
              loopProfile: "mock",
              providerStrategy: "mock_only",
              affectedPaths: [],
              allowedPaths: [],
              deniedPaths: [],
              requiredReviewers: [],
              stopConditions: [],
              status: "ready" as const,
            }),
            status: "running",
            specPath: taskSpec.path,
            specChecksum: taskSpec.checksum,
            specUpdatedAt: taskSpec.updatedAt,
          },
          true,
        ),
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Loop Engine",
            action: "Backend loop started",
            result: `${loop.id} persisted. Manifest: ${loop.manifestPath}. Report: ${loop.reportMarkdownPath}. Task spec: ${taskSpec.path}#${taskSpec.checksum}`,
          },
          ...current.audit,
        ],
      }));
    } catch (error) {
      setRunning(false);
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Loop Engine",
            action: "Loop start failed",
            result: error instanceof Error ? error.message : String(error),
          },
          ...current.audit,
        ],
      }));
    }
  }

  async function runControlledSmoke() {
    const snapshot = stateRef.current;
    const project = snapshot.projects.find((item) => item.id === snapshot.activeProjectId) ?? snapshot.projects[0];
    if (!project) return;

    setView("loops");
    setRunning(false);
    try {
      const loop = await runControlledSmokeLoop(project.id, project.path);
      setCurrentLoop(loop);
      setActiveStep(loop.activeStepIndex);
      setLoopHistory((current) => [
        {
          id: loop.id,
          projectId: loop.projectId,
          projectPath: loop.projectPath,
          taskId: loop.taskId,
          taskTitle: loop.taskTitle,
          status: loop.status,
          activeStepIndex: loop.activeStepIndex,
          manifestPath: loop.manifestPath,
          reportMarkdownPath: loop.reportMarkdownPath,
          source: "sqlite",
          updatedAt: currentTime(),
        },
        ...current.filter((item) => item.id !== loop.id),
      ]);
      setState((current) => ({
        ...current,
        loopSteps: loop.steps,
        tasks: upsertTask(
          current.tasks,
          {
            id: loop.taskId,
            title: loop.taskTitle,
            brief: loop.taskBrief,
            criteria: loop.taskCriteria,
            constraints: loop.taskConstraints,
            budgetLimit: 0,
            risk: "low",
            priority: "normal",
            loopProfile: "controlled_smoke",
            providerStrategy: "mock_only",
            affectedPaths: [".dbc/tasks", ".dbc/loops", ".dbc/evidence", ".dbc/artifacts", ".dbc/reports"],
            allowedPaths: [".dbc/tasks", ".dbc/loops", ".dbc/evidence", ".dbc/artifacts", ".dbc/reports", ".dbc/security", ".dbc/git"],
            deniedPaths: [".env", "node_modules", "src-tauri/target"],
            requiredReviewers: ["QA", "Reviewer", "Security", "Product Owner"],
            stopConditions: [
              "Stop if a real provider is selected.",
              "Stop if controlled smoke evidence cannot be written.",
            ],
            status: loop.status === "completed" ? "done" : "blocked",
            specPath: loop.taskSpecPath,
            specChecksum: loop.taskSpecChecksum,
          },
          true,
        ),
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Smoke Test",
            action: "Controlled smoke loop completed",
            result: `${loop.id}: ${loop.status}. Report: ${loop.reportMarkdownPath}`,
          },
          ...current.audit,
        ],
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Smoke Test",
            action: "Controlled smoke loop failed",
            result: error instanceof Error ? error.message : String(error),
          },
          ...current.audit,
        ],
      }));
    }
  }

  function stopLoop() {
    setRunning(false);
    setCurrentLoop(null);
    setState((current) => ({
      ...current,
      loopSteps: current.loopSteps.map((step) => (step.status === "running" ? { ...step, status: "failed" } : step)),
      projects: current.projects.map((project) =>
        project.id === current.activeProjectId ? { ...project, latestLoop: "stopped", risk: "medium" } : project,
      ),
      audit: [
        {
          id: uid("AUD"),
          time: currentTime(),
          actor: "User",
          action: "Loop stopped",
          result: "Execution halted by manual stop condition.",
        },
        ...current.audit,
      ],
    }));
  }

  async function retryLoop() {
    if (!currentLoop) return;
    try {
      const resumed = await retryBackendLoop(currentLoop.id, currentLoop);
      setCurrentLoop(resumed);
      setActiveStep(resumed.activeStepIndex);
      setRunning(true);
      setState((current) => ({
        ...current,
        loopSteps: resumed.steps,
        tasks: current.tasks.map((task) => (task.id === currentLoop.taskId ? { ...task, status: "running" } : task)),
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Loop Engine",
            action: "Loop retry started",
            result: `${resumed.id} retrying ${resumed.steps[resumed.activeStepIndex]?.state ?? "current step"}.`,
          },
          ...current.audit,
        ],
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Loop Engine",
            action: "Loop retry failed",
            result: error instanceof Error ? error.message : String(error),
          },
          ...current.audit,
        ],
      }));
    }
  }

  async function updateApproval(id: string, status: ApprovalRequest["status"]) {
    const approval = stateRef.current.approvals.find((item) => item.id === id);
    let resolvedLoop: LoopRunSnapshot | null = null;
    let resolveError = "";
    if (approval?.loopId && approval.stepId && currentLoop?.id === approval.loopId && status !== "pending") {
      try {
        resolvedLoop = await resolveBackendLoopApproval({
          loopId: approval.loopId,
          stepId: approval.stepId,
          action: status,
          current: currentLoop,
        });
        setCurrentLoop(resolvedLoop);
        setActiveStep(resolvedLoop.activeStepIndex);
        setRunning(resolvedLoop.status === "running");
      } catch (error) {
        resolveError = error instanceof Error ? error.message : String(error);
      }
    }

    setState((current) => ({
      ...current,
      approvals: current.approvals.map((approval) =>
        approval.id === id ? { ...approval, status, decidedAt: status === "pending" ? approval.decidedAt : new Date().toISOString() } : approval,
      ),
      loopSteps: resolvedLoop?.steps ?? current.loopSteps,
      tasks: resolvedLoop
        ? current.tasks.map((task, index) =>
            index === 0 ? { ...task, status: resolvedLoop.status === "running" ? "running" : "blocked" } : task,
          )
        : current.tasks,
      audit: [
        {
          id: uid("AUD"),
          time: currentTime(),
          actor: "User",
          action: `Approval ${status}`,
          result: resolveError || (resolvedLoop ? `${id}: backend loop ${resolvedLoop.status}` : id),
        },
        ...current.audit,
      ],
    }));
  }

  async function addMemoryNote() {
    const body = noteDraft.trim();
    if (!body) return;
    const snapshot = stateRef.current;
    const project = snapshot.projects.find((item) => item.id === snapshot.activeProjectId) ?? snapshot.projects[0];
    const note = {
      id: uid("MEM"),
      type: "decision" as const,
      title: body.slice(0, 48),
      body,
      author: "User",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    let saved = { path: "", checksum: "", updatedAt: "" };
    try {
      saved = await saveMemoryNote(project.path, note);
    } catch (error) {
      saved = { path: "", checksum: "", updatedAt: "" };
    }
    setState((current) => ({
      ...current,
      memory: [
        {
          ...note,
          path: saved.path,
          checksum: saved.checksum,
          updatedAt: saved.updatedAt,
        },
        ...current.memory,
      ],
      audit: [
        {
          id: uid("AUD"),
          time: currentTime(),
          actor: "Project Memory",
          action: saved.path ? "Memory note saved" : "Memory note stored locally",
          result: saved.path ? `${saved.path}#${saved.checksum}` : note.id,
        },
        ...current.audit,
      ],
    }));
    setNoteDraft("");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">DBC</div>
          <div>
            <strong>Dildin Build Control</strong>
            <span>AI loop operating layer</span>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "nav-item active" : "nav-item"}
              onClick={() => setView(item.id)}
              title={item.label}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.id === "approvals" && pendingApprovals.length > 0 ? (
                <b className="nav-badge">{pendingApprovals.length}</b>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>{isTauriRuntime() ? "Desktop runtime" : "Browser preview"}</span>
          <strong>Official CLI/API only</strong>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">MVP control surface</p>
            <h1>{pageTitle(view)}</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-btn" onClick={() => setState(resetState())}>
              <RotateCcw size={16} />
              Reset demo
            </button>
            {running ? (
              <button className="danger-btn" onClick={stopLoop}>
                <Square size={16} />
                Stop loop
              </button>
            ) : (
              <button className="primary-btn" onClick={() => startLoop()}>
                <Play size={16} />
                Start provider loop
              </button>
            )}
          </div>
        </header>

        {view === "home" && (
          <HomeView
            activeProject={activeProject}
            totalCost={totalCost}
            pendingApprovals={pendingApprovals.length}
            running={running}
            onStart={() => startLoop()}
            releasePackage={releasePackage}
            operatorChecklist={operatorChecklist}
            launchDoctor={launchDoctor}
            approvalQueue={approvalQueue}
            loopStateMachine={loopStateMachine}
            providerSessionReport={providerSessionReport}
            realMicroComparison={realMicroComparison}
            realMicroPreflight={realMicroPreflight}
            realMicroRunbook={realMicroRunbook}
            revertEvidence={revertEvidence}
            supportBundle={supportBundle}
            onGenerateRelease={createReleasePackage}
            onGenerateOperatorChecklist={createOperatorChecklist}
            onApproveOperatorGate={approveOperatorChecklist}
            onRefreshLaunchDoctor={() => refreshLaunchDoctor()}
            onRefreshApprovalQueue={() => refreshApprovalQueue()}
            onRefreshLoopStateMachine={() => refreshLoopStateMachine()}
            onRefreshProviderSessionReport={() => refreshProviderSessionReport()}
            onRefreshRealMicroComparison={() => refreshRealMicroComparison()}
            onRefreshRevertEvidence={() => refreshRevertEvidence()}
            onRefreshSupportBundle={() => refreshSupportBundle()}
            onRefreshOperatorChecklist={() => refreshOperatorChecklist()}
            onRefreshRealMicroPreflight={() => refreshRealMicroPreflight()}
            onRefreshRealMicroRunbook={() => refreshRealMicroRunbook()}
            onGenerateRealMicroPreflight={createRealMicroPreflight}
            onGenerateRealMicroRunbook={createRealMicroRunbook}
            onRunApprovedRealMicro={runApprovedRealMicroTask}
            onApplyProviderProfile={applyProviderProfileFromHome}
            onOpenRealMicroPreflight={openRealMicroPreflight}
            state={state}
          />
        )}
        {view === "projects" && (
          <ProjectsView
            state={state}
            activeProjectId={state.activeProjectId}
            newProjectPath={newProjectPath}
            setNewProjectPath={setNewProjectPath}
            importProject={importProject}
            selectProject={(id) => patchState({ activeProjectId: id })}
          />
        )}
        {view === "workspace" && (
          <WorkspaceView
            project={activeProject}
            tasks={state.tasks}
            memory={state.memory}
            noteDraft={noteDraft}
            setNoteDraft={setNoteDraft}
            addMemoryNote={addMemoryNote}
            recoveryDiagnostics={projectRecoveryDiagnostics}
          />
        )}
        {view === "tasks" && (
          <TasksView
            tasks={state.tasks}
            agents={state.agents}
            providers={state.providers}
            activeProject={activeProject}
            harnessOverview={harnessOverview}
            createTask={createTask}
            saveTaskContract={saveTaskContract}
            startSimpleHarnessForTask={startSimpleHarnessForTask}
            createHarnessContract={createHarnessContract}
            freezeLatestContract={freezeLatestContract}
            approveLatestContract={approveLatestContract}
            createHarnessSlice={createHarnessSlice}
            approveLatestSlice={approveLatestSlice}
            startHarnessForTask={startHarnessForTask}
            startLoop={startLoop}
            prepareSmokeTest={prepareSmokeTest}
            runControlledSmoke={runControlledSmoke}
          />
        )}
        {view === "preflight" && (
          <PreflightView
            state={state}
            activeProject={activeProject}
            task={preflightTask ?? state.tasks[0]}
            operatorChecklist={operatorChecklist}
            onRun={(task) => startLoop(task, true)}
            onBack={() => setView("tasks")}
          />
        )}
        {view === "agents" && (
          <AgentsView
            agents={state.agents}
            providers={state.providers}
            setAgents={(agents) => patchState({ agents: syncAssignedRoles(state.providers, agents) })}
          />
        )}
        {view === "loops" && (
          <LoopsView
            steps={state.loopSteps}
            running={running}
            activeStep={activeStep}
            currentLoop={currentLoop}
            harnessOverview={harnessOverview}
            history={loopHistory}
            evidenceBundle={evidenceBundle}
            loopStateMachine={loopStateMachine}
            runJournal={runJournal}
            evidenceLoading={evidenceLoading}
            onRetry={retryLoop}
            onRefresh={refreshLoopHistory}
            onRefreshEvidence={() => refreshEvidenceBundle()}
            onRefreshStateMachine={() => refreshLoopStateMachine()}
            onRefreshRunJournal={() => refreshRunJournal()}
            onOpen={openLoopRun}
            onRefreshHarness={() => refreshHarnessOverview()}
            onAdvanceHarness={advanceHarness}
            onGenerateEvidencePack={generateHarnessPack}
          />
        )}
        {view === "approvals" && (
          <ApprovalsView
            approvals={state.approvals}
            approvalQueue={approvalQueue}
            harnessOverview={harnessOverview}
            updateApproval={updateApproval}
            onRefreshApprovalQueue={() => refreshApprovalQueue()}
          />
        )}
        {view === "reports" && <ReportsView state={state} totalCost={totalCost} currentLoop={currentLoop} harnessOverview={harnessOverview} />}
        {view === "settings" && (
          <SettingsView
            state={state}
            setState={setState}
            audit={state.audit}
            costs={state.costs}
            providerSessionReport={providerSessionReport}
            onRefreshProviderSessionReport={() => refreshProviderSessionReport()}
          />
        )}
      </main>
    </div>
  );
}

function HomeView({
  activeProject,
  totalCost,
  pendingApprovals,
  running,
  onStart,
  releasePackage,
  operatorChecklist,
  launchDoctor,
  approvalQueue,
  loopStateMachine,
  providerSessionReport,
  realMicroComparison,
  realMicroPreflight,
  realMicroRunbook,
  revertEvidence,
  supportBundle,
  onGenerateRelease,
  onGenerateOperatorChecklist,
  onApproveOperatorGate,
  onRefreshLaunchDoctor,
  onRefreshApprovalQueue,
  onRefreshLoopStateMachine,
  onRefreshProviderSessionReport,
  onRefreshRealMicroComparison,
  onRefreshRevertEvidence,
  onRefreshSupportBundle,
  onRefreshOperatorChecklist,
  onRefreshRealMicroPreflight,
  onRefreshRealMicroRunbook,
  onGenerateRealMicroPreflight,
  onGenerateRealMicroRunbook,
  onRunApprovedRealMicro,
  onApplyProviderProfile,
  onOpenRealMicroPreflight,
  state,
}: {
  activeProject: AppState["projects"][number];
  totalCost: number;
  pendingApprovals: number;
  running: boolean;
  onStart: () => void;
  releasePackage: ReleasePackageResult | null;
  operatorChecklist: OperatorChecklistResult | null;
  launchDoctor: LaunchDoctorReport | null;
  approvalQueue: ApprovalQueueReport | null;
  loopStateMachine: LoopStateMachineReport | null;
  providerSessionReport: ProviderSessionReport | null;
  realMicroComparison: RealMicroComparisonReport | null;
  realMicroPreflight: RealMicroPreflightReport | null;
  realMicroRunbook: RealMicroRunbookReport | null;
  revertEvidence: RevertEvidenceReport | null;
  supportBundle: SupportBundleReport | null;
  onGenerateRelease: () => void;
  onGenerateOperatorChecklist: () => void;
  onApproveOperatorGate: () => void;
  onRefreshLaunchDoctor: () => void;
  onRefreshApprovalQueue: () => void;
  onRefreshLoopStateMachine: () => void;
  onRefreshProviderSessionReport: () => void;
  onRefreshRealMicroComparison: () => void;
  onRefreshRevertEvidence: () => void;
  onRefreshSupportBundle: () => void;
  onRefreshOperatorChecklist: () => void;
  onRefreshRealMicroPreflight: () => void;
  onRefreshRealMicroRunbook: () => void;
  onGenerateRealMicroPreflight: () => void;
  onGenerateRealMicroRunbook: () => void;
  onRunApprovedRealMicro: () => void;
  onApplyProviderProfile: (profile: "mock" | "real-micro") => void;
  onOpenRealMicroPreflight: () => void;
  state: AppState;
}) {
  const realMicroTaskLoaded = state.tasks.some((task) => task.id === "REAL-MICRO-README" || task.loopProfile === "real_micro");
  const realProviderCount = state.providers.filter((provider) => provider.type === "cli" && provider.runMode === "real").length;

  return (
    <section className="view-stack">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">From task to tested build</p>
          <h2>{activeProject.name}</h2>
          <p>
            Controlled development loop for planning, implementation, build/test, review, security, approvals, and
            evidence-backed acceptance.
          </p>
        </div>
        <div className="hero-action">
          <span className={running ? "status-pill live" : "status-pill"}>{running ? "Loop running" : "Ready"}</span>
          <button className="primary-btn" onClick={onStart}>
            <Play size={16} />
            Run core loop
          </button>
        </div>
      </div>

      <div className="metric-grid">
        <Metric icon={GitBranch} label="Branch" value={activeProject.branch} hint={`${activeProject.changedFiles} changed files`} />
        <Metric icon={ClipboardCheck} label="Open tasks" value={String(activeProject.openTasks)} hint="Acceptance-gated" />
        <Metric icon={AlertTriangle} label="Pending approvals" value={String(pendingApprovals)} hint="Sensitive actions blocked" />
        <Metric icon={CircleDollarSign} label="Estimated cost" value={`$${totalCost.toFixed(2)}`} hint="Mock adapter events" />
      </div>

      <div className="two-column">
        <Panel title="Active Loop" icon={RotateCcw}>
          <div className="timeline compact">
            {state.loopSteps.map((step) => (
              <div className={`timeline-row ${step.status}`} key={step.id}>
                <span />
                <div>
                  <strong>{step.state}</strong>
                  <p>{step.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="Launch Doctor"
          icon={Gauge}
          action={
            <button className="ghost-btn" onClick={onRefreshLaunchDoctor}>
              <RotateCcw size={16} />
              Refresh
            </button>
          }
        >
          {launchDoctor ? (
            <div className="audit-list">
              <div className="summary-grid doctor-summary">
                <div>
                  <span>Status</span>
                  <strong>{displayValue(launchDoctor.status)}</strong>
                </div>
                <div>
                  <span>Blockers</span>
                  <strong>{launchDoctor.blockers.length}</strong>
                </div>
                <div>
                  <span>Warnings</span>
                  <strong>{launchDoctor.warnings.length}</strong>
                </div>
                <div>
                  <span>Approvals</span>
                  <strong>{launchDoctor.summary.pendingApprovals ?? 0}</strong>
                </div>
                <div>
                  <span>Queue</span>
                  <strong>{displayValue(launchDoctor.summary.approvalQueueStatus ?? "missing")}</strong>
                </div>
                <div>
                  <span>Queue pending</span>
                  <strong>{launchDoctor.summary.pendingApprovalQueueItems ?? 0}</strong>
                </div>
                <div>
                  <span>Contracts</span>
                  <strong>{displayValue(launchDoctor.summary.providerContractsStatus ?? "missing")}</strong>
                </div>
                <div>
                  <span>Revert</span>
                  <strong>{displayValue(launchDoctor.summary.revertStatus ?? "missing")}</strong>
                </div>
              </div>
              <div className="audit-row">
                <span className={`status-pill ${launchDoctor.blockers.length ? "failed" : launchDoctor.status === "ready_for_human_approval" ? "warning" : "ok"}`}>
                  {displayValue(launchDoctor.blockers.length ? "blocked" : launchDoctor.status)}
                </span>
                <strong>{displayValue(launchDoctor.summary.systemAuditStatus ?? "system audit missing")}</strong>
                <p>{launchDoctor.nextAction}</p>
              </div>
              <div className="audit-row">
                <span className="status-pill ok">{launchDoctor.steps.filter((step) => textValue(step.status) === "ok").length} ok</span>
                <strong>Doctor steps</strong>
                <p>{launchDoctor.refs.systemAudit ?? "Run pnpm launch-doctor to refresh the evidence."}</p>
              </div>
            </div>
          ) : (
            <div className="audit-list">
              <div className="audit-row">
                <span className="status-pill warning">missing</span>
                <strong>Launch Doctor report</strong>
                <p>Run pnpm launch-doctor in the project root, then refresh this panel.</p>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="Real Micro Wizard"
        icon={ShieldCheck}
        action={
          <div className="button-row">
            <button
              className="ghost-btn"
              onClick={() => {
                onRefreshLaunchDoctor();
                onRefreshApprovalQueue();
                onRefreshSupportBundle();
                onRefreshOperatorChecklist();
                onRefreshRealMicroPreflight();
                onRefreshRealMicroRunbook();
              }}
            >
              <RotateCcw size={16} />
              Refresh
            </button>
            <button className="ghost-btn" onClick={onGenerateOperatorChecklist}>
              <ClipboardCheck size={16} />
              Checklist
            </button>
            <button className="ghost-btn" onClick={onApproveOperatorGate} disabled={!operatorChecklist || operatorChecklist.blockers > 0}>
              <CheckCircle2 size={16} />
              Approve
            </button>
            <button className="ghost-btn" onClick={() => onApplyProviderProfile("real-micro")} disabled={operatorChecklist?.approvalStatus !== "approved"}>
              <Play size={16} />
              Apply real
            </button>
            <button className="ghost-btn" onClick={() => onApplyProviderProfile("mock")}>
              <RotateCcw size={16} />
              Mock
            </button>
            <button
              className="ghost-btn"
              onClick={() => {
                onRefreshLaunchDoctor();
                onRefreshApprovalQueue();
                onRefreshLoopStateMachine();
                onRefreshProviderSessionReport();
                onRefreshRealMicroComparison();
                onRefreshRevertEvidence();
                onRefreshSupportBundle();
                onRefreshRealMicroPreflight();
                onRefreshRealMicroRunbook();
              }}
            >
              <RotateCcw size={16} />
              Refresh
            </button>
            <button className="ghost-btn" onClick={onGenerateRealMicroPreflight}>
              <Gauge size={16} />
              Dry-run
            </button>
            <button className="ghost-btn" onClick={onGenerateRealMicroRunbook}>
              <FileText size={16} />
              Runbook
            </button>
            <button className="ghost-btn" onClick={onRunApprovedRealMicro} disabled={realMicroPreflight?.status !== "ready_to_run"}>
              <Play size={16} />
              Run approved
            </button>
            <button
              className="primary-btn"
              onClick={onOpenRealMicroPreflight}
              disabled={operatorChecklist?.approvalStatus !== "approved" || realProviderCount === 0}
            >
              <Gauge size={16} />
              Preflight
            </button>
          </div>
        }
      >
        <RealMicroWizard
          launchDoctor={launchDoctor}
          approvalQueue={approvalQueue}
          loopStateMachine={loopStateMachine}
          providerSessionReport={providerSessionReport}
          realMicroComparison={realMicroComparison}
          realMicroPreflight={realMicroPreflight}
          realMicroRunbook={realMicroRunbook}
          revertEvidence={revertEvidence}
          operatorChecklist={operatorChecklist}
          supportBundle={supportBundle}
          providers={state.providers}
          realMicroTaskLoaded={realMicroTaskLoaded}
        />
      </Panel>

      <div className="two-column">
        <Panel
          title="Release Gates"
          icon={BadgeCheck}
          action={
            <div className="button-row">
              <button className="ghost-btn" onClick={onGenerateRelease}>
                <FileText size={16} />
                Generate package
              </button>
              <button className="ghost-btn" onClick={onGenerateOperatorChecklist}>
                <ClipboardCheck size={16} />
                Operator checklist
              </button>
              <button className="ghost-btn" onClick={onApproveOperatorGate} disabled={!operatorChecklist || operatorChecklist.blockers > 0}>
                <CheckCircle2 size={16} />
                Approve gate
              </button>
            </div>
          }
        >
          <div className="gate-list">
            {[
              "Project import works",
              "Mock provider step works",
              "Command policy blocks dangerous actions",
              "Git diff and acceptance report are visible",
              "Cost events are recorded",
            ].map((gate, index) => (
              <div className="gate-row" key={gate}>
                {index < 3 ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                <span>{gate}</span>
              </div>
            ))}
          </div>
          {releasePackage ? (
            <div className="audit-list">
              <div className="audit-row">
                <span className="status-pill ok">ready</span>
                <strong>{releasePackage.version}</strong>
                <p>{releasePackage.markdownPath}</p>
              </div>
              <div className="audit-row">
                <span className={releasePackage.dmgChecksum ? "status-pill ok" : "status-pill warning"}>
                  {releasePackage.dmgChecksum ? "checksum" : "missing"}
                </span>
                <strong>DMG</strong>
                <p>{releasePackage.dmgPath || "DMG path unavailable"}</p>
              </div>
            </div>
          ) : null}
          {operatorChecklist ? (
            <div className="audit-list">
              <div className="audit-row">
                <span className={`status-pill ${operatorChecklist.blockers ? "failed" : operatorChecklist.warnings ? "warning" : "ok"}`}>
                  {operatorChecklist.blockers ? "blocked" : operatorChecklist.warnings ? "warning" : "ready"}
                </span>
                <strong>Operator checklist: {operatorChecklist.status}</strong>
                <p>{operatorChecklist.markdownPath}</p>
              </div>
              <div className="audit-row">
                <span className={operatorChecklist.blockers ? "status-pill failed" : "status-pill ok"}>
                  {operatorChecklist.blockers} blockers
                </span>
                <strong>{operatorChecklist.warnings} warnings</strong>
                <p>{operatorChecklist.nextAction}</p>
              </div>
              <div className="audit-row">
                <span className={`status-pill ${operatorChecklist.approvalStatus === "approved" ? "ok" : "warning"}`}>
                  {operatorChecklist.approvalStatus === "approved" ? "approved" : "approval"}
                </span>
                <strong>Human gate: {operatorChecklist.approvalStatus}</strong>
                <p>{operatorChecklist.approvalPath || "Approval artifact not written yet."}</p>
              </div>
            </div>
          ) : null}
        </Panel>
        <Panel
          title="Support Bundle"
          icon={FileText}
          action={
            <button className="ghost-btn" onClick={onRefreshSupportBundle}>
              <RotateCcw size={16} />
              Refresh
            </button>
          }
        >
          {supportBundle ? (
            <div className="audit-list">
              <div className="summary-grid doctor-summary">
                <div>
                  <span>Status</span>
                  <strong>{displayValue(supportBundle.status)}</strong>
                </div>
                <div>
                  <span>Files</span>
                  <strong>{supportBundle.files.length}</strong>
                </div>
                <div>
                  <span>Blockers</span>
                  <strong>{supportBundle.blockers.length}</strong>
                </div>
                <div>
                  <span>Warnings</span>
                  <strong>{supportBundle.warnings.length}</strong>
                </div>
                <div>
                  <span>Archive</span>
                  <strong>{displayValue(supportBundle.tarStatus || "missing")}</strong>
                </div>
                <div>
                  <span>Skipped</span>
                  <strong>{supportBundle.skipped.length}</strong>
                </div>
              </div>
              <div className="audit-row">
                <span className={`status-pill ${supportBundle.blockers.length ? "failed" : supportBundle.status === "ready" ? "ok" : "warning"}`}>
                  {displayValue(supportBundle.blockers.length ? "blocked" : supportBundle.status)}
                </span>
                <strong>Bundle directory</strong>
                <p>{supportBundle.bundleDir || "Bundle directory missing."}</p>
              </div>
              <div className="audit-row">
                <span className={supportBundle.tarPath ? "status-pill ok" : "status-pill warning"}>
                  {supportBundle.tarPath ? "archive" : "folder"}
                </span>
                <strong>Portable handoff</strong>
                <p>{supportBundle.tarPath || "Archive unavailable; directory bundle remains usable."}</p>
              </div>
              <div className="audit-row">
                <span className="status-pill ok">hygiene</span>
                <strong>Secrets and build outputs excluded</strong>
                <p>{String(supportBundle.refs.manifest ?? supportBundle.bundleDir)}</p>
              </div>
            </div>
          ) : (
            <div className="audit-list">
              <div className="audit-row">
                <span className="status-pill warning">missing</span>
                <strong>Support Bundle report</strong>
                <p>No support bundle artifact found.</p>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </section>
  );
}

function RealMicroWizard({
  launchDoctor,
  approvalQueue,
  loopStateMachine,
  providerSessionReport,
  realMicroComparison,
  realMicroPreflight,
  realMicroRunbook,
  revertEvidence,
  operatorChecklist,
  supportBundle,
  providers,
  realMicroTaskLoaded,
}: {
  launchDoctor: LaunchDoctorReport | null;
  approvalQueue: ApprovalQueueReport | null;
  loopStateMachine: LoopStateMachineReport | null;
  providerSessionReport: ProviderSessionReport | null;
  realMicroComparison: RealMicroComparisonReport | null;
  realMicroPreflight: RealMicroPreflightReport | null;
  realMicroRunbook: RealMicroRunbookReport | null;
  revertEvidence: RevertEvidenceReport | null;
  operatorChecklist: OperatorChecklistResult | null;
  supportBundle: SupportBundleReport | null;
  providers: Provider[];
  realMicroTaskLoaded: boolean;
}) {
  const realCliProviders = providers.filter((provider) => provider.type === "cli" && provider.runMode === "real");
  const codex = providers.find((provider) => provider.id === "codex_cli");
  const claude = providers.find((provider) => provider.id === "claude_code");
  const gates = [
    {
      id: "contracts",
      label: "Provider contracts",
      status: gateStatus(launchDoctor?.summary.providerContractsStatus === "ok", Boolean(launchDoctor), launchDoctor?.summary.providerContractsStatus === "missing"),
      detail: displayValue(launchDoctor?.summary.providerContractsStatus ?? "missing"),
    },
    {
      id: "sessions",
      label: "Provider sessions",
      status: gateStatus(
        Boolean(providerSessionReport && providerSessionReport.blockers.length === 0),
        Boolean(providerSessionReport),
        Boolean(providerSessionReport && providerSessionReport.blockers.length > 0),
      ),
      detail: providerSessionReport
        ? `${displayValue(providerSessionReport.status)}; ${providerSessionReport.warnings.length} warning(s)`
        : displayValue(launchDoctor?.summary.providerSessionsStatus ?? "missing"),
    },
    {
      id: "doctor",
      label: "Launch doctor",
      status: gateStatus(Boolean(launchDoctor && launchDoctor.blockers.length === 0), Boolean(launchDoctor), false),
      detail: launchDoctor ? `${displayValue(launchDoctor.status)}; ${launchDoctor.warnings.length} warning(s)` : "missing",
    },
    {
      id: "approval-queue",
      label: "Approval queue",
      status: gateStatus(
        Boolean(approvalQueue && approvalQueue.blockers.length === 0),
        Boolean(approvalQueue),
        Boolean(approvalQueue && approvalQueue.blockers.length > 0),
      ),
      detail: approvalQueue
        ? `${displayValue(approvalQueue.status)}; ${approvalQueue.summary.pendingRequired} required pending`
        : displayValue(launchDoctor?.summary.approvalQueueStatus ?? "missing"),
    },
    {
      id: "state-machine",
      label: "Loop state machine",
      status: gateStatus(
        Boolean(loopStateMachine && loopStateMachine.blockers.length === 0),
        Boolean(loopStateMachine),
        Boolean(loopStateMachine && loopStateMachine.blockers.length > 0),
      ),
      detail: loopStateMachine
        ? `${displayValue(loopStateMachine.status)}; ${displayValue(loopStateMachine.currentState)} -> ${displayValue(loopStateMachine.nextState)}`
        : displayValue(launchDoctor?.summary.loopStateMachineStatus ?? "missing"),
    },
    {
      id: "checklist",
      label: "Operator checklist",
      status: gateStatus(Boolean(operatorChecklist && operatorChecklist.blockers === 0), Boolean(operatorChecklist), false),
      detail: operatorChecklist ? `${displayValue(operatorChecklist.status)}; ${operatorChecklist.warnings} warning(s)` : "missing",
    },
    {
      id: "approval",
      label: "Human approval",
      status: gateStatus(operatorChecklist?.approvalStatus === "approved", Boolean(operatorChecklist), false),
      detail: displayValue(operatorChecklist?.approvalStatus ?? "missing"),
    },
    {
      id: "profile",
      label: "Real profile",
      status: gateStatus(realCliProviders.length > 0, providers.length > 0, false),
      detail: realCliProviders.length ? `${realCliProviders.map((provider) => provider.name).join(", ")}` : "mock",
    },
    {
      id: "task",
      label: "Micro task",
      status: gateStatus(realMicroTaskLoaded, true, false),
      detail: realMicroTaskLoaded ? "REAL-MICRO-README" : "missing",
    },
    {
      id: "preflight",
      label: "Dry-run preflight",
      status: gateStatus(
        Boolean(realMicroPreflight && realMicroPreflight.blockers.length === 0),
        Boolean(realMicroPreflight),
        Boolean(realMicroPreflight && realMicroPreflight.blockers.length > 0),
      ),
      detail: realMicroPreflight ? `${displayValue(realMicroPreflight.status)}; ${realMicroPreflight.warnings.length} warning(s)` : "missing",
    },
    {
      id: "terminal",
      label: "Terminal handoff",
      status: gateStatus(Boolean(realMicroPreflight && !realMicroPreflight.terminalHandoff?.required), Boolean(realMicroPreflight), false),
      detail: realMicroPreflight?.terminalHandoff?.required
        ? realMicroPreflight.terminalHandoff.providerIds.join(", ")
        : realMicroPreflight
          ? "not required"
          : "missing",
    },
    {
      id: "runbook",
      label: "Runbook",
      status: gateStatus(
        Boolean(realMicroRunbook && realMicroRunbook.blockers.length === 0),
        Boolean(realMicroRunbook),
        Boolean(realMicroRunbook && realMicroRunbook.blockers.length > 0),
      ),
      detail: realMicroRunbook ? `${displayValue(realMicroRunbook.status)}; ${realMicroRunbook.warnings.length} warning(s)` : "missing",
    },
    {
      id: "comparison",
      label: "Comparison",
      status: gateStatus(
        Boolean(realMicroComparison && realMicroComparison.blockers.length === 0),
        Boolean(realMicroComparison),
        Boolean(realMicroComparison && realMicroComparison.blockers.length > 0),
      ),
      detail: realMicroComparison
        ? `${displayValue(realMicroComparison.status)}; ${realMicroComparison.warnings.length} warning(s)`
        : displayValue(launchDoctor?.summary.comparisonStatus ?? "missing"),
    },
    {
      id: "revert",
      label: "Revert evidence",
      status: gateStatus(
        Boolean(revertEvidence && revertEvidence.blockers.length === 0),
        Boolean(revertEvidence),
        Boolean(revertEvidence && revertEvidence.blockers.length > 0),
      ),
      detail: revertEvidence
        ? `${displayValue(revertEvidence.status)}; ${revertEvidence.warnings.length} warning(s)`
        : displayValue(launchDoctor?.summary.revertStatus ?? "missing"),
    },
    {
      id: "support",
      label: "Support bundle",
      status: gateStatus(Boolean(supportBundle && supportBundle.blockers.length === 0), Boolean(supportBundle), false),
      detail: supportBundle ? `${displayValue(supportBundle.status)}; ${supportBundle.files.length} file(s)` : "missing",
    },
  ];

  return (
    <div className="audit-list">
      <div className="summary-grid doctor-summary">
        <div>
          <span>Codex</span>
          <strong>{displayValue(codex?.runMode ?? "missing")}</strong>
        </div>
        <div>
          <span>Claude</span>
          <strong>{displayValue(claude?.runMode ?? "missing")}</strong>
        </div>
        <div>
          <span>Real CLIs</span>
          <strong>{realCliProviders.length}</strong>
        </div>
        <div>
          <span>Sessions</span>
          <strong>{displayValue(providerSessionReport?.status ?? launchDoctor?.summary.providerSessionsStatus ?? "missing")}</strong>
        </div>
        <div>
          <span>Lifecycle</span>
          <strong>{displayValue(loopStateMachine?.status ?? launchDoctor?.summary.loopStateMachineStatus ?? "missing")}</strong>
        </div>
        <div>
          <span>Queue</span>
          <strong>{displayValue(approvalQueue?.status ?? launchDoctor?.summary.approvalQueueStatus ?? "missing")}</strong>
        </div>
        <div>
          <span>Queue pending</span>
          <strong>{approvalQueue?.summary.pendingRequired ?? launchDoctor?.summary.pendingApprovalQueueItems ?? 0}</strong>
        </div>
        <div>
          <span>Approval</span>
          <strong>{displayValue(operatorChecklist?.approvalStatus ?? "missing")}</strong>
        </div>
        <div>
          <span>Runbook</span>
          <strong>{displayValue(realMicroRunbook?.status ?? launchDoctor?.summary.realMicroRunbookStatus ?? "missing")}</strong>
        </div>
        <div>
          <span>Terminal</span>
          <strong>
            {realMicroPreflight?.terminalHandoff?.required
              ? displayValue(realMicroPreflight.terminalHandoff.providerIds.join(", "))
              : realMicroPreflight
                ? "not required"
                : "missing"}
          </strong>
        </div>
        <div>
          <span>Compare</span>
          <strong>{displayValue(realMicroComparison?.status ?? launchDoctor?.summary.comparisonStatus ?? "missing")}</strong>
        </div>
        <div>
          <span>Revert</span>
          <strong>{displayValue(revertEvidence?.status ?? launchDoctor?.summary.revertStatus ?? "missing")}</strong>
        </div>
      </div>
      {approvalQueue ? (
        <div className="audit-row">
          <span className={`status-pill ${approvalQueue.blockers.length ? "failed" : approvalQueue.status === "ready" ? "ok" : "warning"}`}>
            {displayValue(approvalQueue.status)}
          </span>
          <strong>Approval Queue</strong>
          <p>
            {approvalQueue.summary.required} required; {approvalQueue.summary.pendingRequired} pending; {approvalQueue.summary.approved} approved.
            {approvalQueue.nextAction ? ` ${approvalQueue.nextAction}` : ""}
          </p>
        </div>
      ) : null}
      {realMicroRunbook ? (
        <div className="audit-row">
          <span className={`status-pill ${realMicroRunbook.blockers.length ? "failed" : realMicroRunbook.status === "awaiting_human_approval" ? "warning" : "ok"}`}>
            {displayValue(realMicroRunbook.status)}
          </span>
          <strong>Allowed surfaces</strong>
          <p>
            {realMicroRunbook.surfaces.allowed.map((item) => item.id).join(", ")}; denied:{" "}
            {realMicroRunbook.surfaces.denied.map((item) => item.id).join(", ")}
          </p>
        </div>
      ) : null}
      {realMicroComparison || revertEvidence ? (
        <div className="audit-row">
          <span
            className={`status-pill ${
              realMicroComparison?.blockers.length || revertEvidence?.blockers.length
                ? "failed"
                : realMicroComparison || revertEvidence
                  ? "ok"
                  : "warning"
            }`}
          >
            post-run
          </span>
          <strong>Post-run evidence</strong>
          <p>
            comparison: {displayValue(realMicroComparison?.status ?? "missing")}; revert:{" "}
            {displayValue(revertEvidence?.status ?? "missing")}
          </p>
        </div>
      ) : null}
      <div className="gate-list wizard-gates">
        {gates.map((gate) => (
          <div className="gate-row" key={gate.id}>
            {gate.status === "ok" ? <CheckCircle2 size={18} /> : gate.status === "failed" ? <XCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{gate.label}</span>
            <code>{gate.detail}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

function gateStatus(passed: boolean, known: boolean, failed: boolean) {
  if (passed) return "ok";
  if (failed) return "failed";
  return known ? "warning" : "warning";
}

function ProjectsView({
  state,
  activeProjectId,
  newProjectPath,
  setNewProjectPath,
  importProject,
  selectProject,
}: {
  state: AppState;
  activeProjectId: string;
  newProjectPath: string;
  setNewProjectPath: (value: string) => void;
  importProject: () => void;
  selectProject: (id: string) => void;
}) {
  return (
    <section className="view-stack">
      <Panel title="Import Local Project" icon={FolderGit2}>
        <div className="input-row">
          <input
            value={newProjectPath}
            onChange={(event) => setNewProjectPath(event.target.value)}
            placeholder="/path/to/local/repository"
          />
          <button className="primary-btn" onClick={importProject}>
            <Plus size={16} />
            Import
          </button>
        </div>
        <p className="helper-text">MVP shell stores the record locally and uses mock stack detection in browser mode.</p>
      </Panel>
      <div className="project-list">
        {state.projects.map((project) => (
          <button
            className={project.id === activeProjectId ? "project-card active" : "project-card"}
            key={project.id}
            onClick={() => selectProject(project.id)}
          >
            <div>
              <strong>{project.name}</strong>
              <span>{project.path}</span>
            </div>
            <div className="stack-row">
              {project.stack.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
    </section>
  );
}

function WorkspaceView({
  project,
  tasks,
  memory,
  noteDraft,
  setNoteDraft,
  addMemoryNote,
  recoveryDiagnostics,
}: {
  project: AppState["projects"][number];
  tasks: AppState["tasks"];
  memory: AppState["memory"];
  noteDraft: string;
  setNoteDraft: (value: string) => void;
  addMemoryNote: () => void;
  recoveryDiagnostics: ProjectConfigDiagnostic[];
}) {
  return (
    <section className="view-stack">
      <div className="workspace-header">
        <div>
          <p className="eyebrow">Project workspace</p>
          <h2>{project.name}</h2>
          <span>{project.path}</span>
        </div>
        <RiskPill risk={project.risk} />
      </div>
      <div className="tab-strip">
        {["Overview", "Tasks", "AI Team", "Loops", "Files", "Logs", "Settings"].map((tab) => (
          <button key={tab}>{tab}</button>
        ))}
      </div>
      <div className="two-column">
        <Panel title="Project Health" icon={Gauge}>
          <div className="health-grid">
            <Metric icon={Code2} label="Tech stack" value={project.stack.join(", ")} hint="Detected metadata" />
            <Metric icon={GitBranch} label="Git branch" value={project.branch} hint="Task branch ready" />
            <Metric icon={ListChecks} label="Tasks" value={String(tasks.length)} hint="Backlog and acceptance" />
            <Metric icon={Brain} label="Memory notes" value={String(memory.length)} hint="Decisions and risks" />
          </div>
          {recoveryDiagnostics.length ? (
            <div className="audit-list">
              {recoveryDiagnostics.slice(0, 4).map((item, index) => (
                <div className="audit-row" key={`${item.subject}-${index}`}>
                  <span className={`status-pill ${item.level === "error" ? "failed" : item.level === "warning" ? "warning" : "ok"}`}>
                    {item.level}
                  </span>
                  <strong>{item.subject}</strong>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
          ) : null}
        </Panel>
        <Panel title="Project Memory" icon={Brain}>
          <div className="memory-list">
            {memory.slice(0, 4).map((note) => (
              <article className="memory-note" key={note.id}>
                <span>{note.type}</span>
                <strong>{note.title}</strong>
                <p>{note.body}</p>
                {note.path ? <code>{note.path} #{note.checksum}</code> : null}
              </article>
            ))}
          </div>
          <div className="input-row">
            <input value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Add a decision or project note" />
            <button className="ghost-btn" onClick={addMemoryNote}>
              <Plus size={16} />
              Add
            </button>
          </div>
        </Panel>
      </div>
    </section>
  );
}

function TasksView({
  tasks,
  agents,
  providers,
  activeProject,
  harnessOverview,
  createTask,
  saveTaskContract,
  startSimpleHarnessForTask,
  createHarnessContract,
  freezeLatestContract,
  approveLatestContract,
  createHarnessSlice,
  approveLatestSlice,
  startHarnessForTask,
  startLoop,
  prepareSmokeTest,
  runControlledSmoke,
}: {
  tasks: Task[];
  agents: AgentRole[];
  providers: Provider[];
  activeProject?: AppState["projects"][number];
  harnessOverview: HarnessOverview;
  createTask: (task: Task) => void;
  saveTaskContract: (taskId: string) => void;
  startSimpleHarnessForTask: (taskId: string) => void;
  createHarnessContract: (taskId: string) => void;
  freezeLatestContract: (taskId: string) => void;
  approveLatestContract: (taskId: string) => void;
  createHarnessSlice: (taskId: string) => void;
  approveLatestSlice: (taskId: string) => void;
  startHarnessForTask: (taskId: string) => void;
  startLoop: (task?: Task) => void;
  prepareSmokeTest: (runImmediately?: boolean) => void;
  runControlledSmoke: () => void;
}) {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [criteria, setCriteria] = useState("Build passes\nTests pass\nAcceptance report contains evidence");
  const [constraints, setConstraints] = useState("Respect command policy\nKeep changes inside workspace");
  const [affectedPaths, setAffectedPaths] = useState("");
  const [allowedPaths, setAllowedPaths] = useState("");
  const [deniedPaths, setDeniedPaths] = useState(".env\nnode_modules\nsrc-tauri/target");
  const [requiredReviewers, setRequiredReviewers] = useState("Reviewer\nSecurity\nProduct Owner");
  const [stopConditions, setStopConditions] = useState(
    "Stop if command policy returns approval_required or deny\nStop if changes expand outside allowed paths\nStop if acceptance evidence is missing",
  );
  const [budgetLimit, setBudgetLimit] = useState(1);
  const [risk, setRisk] = useState<RiskLevel>("medium");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [loopProfile, setLoopProfile] = useState<TaskLoopProfile>("mock");
  const [providerStrategy, setProviderStrategy] = useState<ProviderStrategy>("codex_build_claude_review");
  const smokeReadiness = buildSmokeReadiness({ activeProject, agents, providers });

  function submit() {
    if (!title.trim() || !brief.trim()) return;
    const affected = lines(affectedPaths);
    const allowed = lines(allowedPaths);
    createTask({
      id: taskIdFromTitle(title),
      title: title.trim(),
      brief: brief.trim(),
      criteria: lines(criteria),
      constraints: lines(constraints),
      budgetLimit: Math.max(0, budgetLimit),
      risk,
      priority,
      loopProfile,
      providerStrategy,
      affectedPaths: affected,
      allowedPaths: allowed.length ? allowed : affected,
      deniedPaths: lines(deniedPaths),
      requiredReviewers: lines(requiredReviewers),
      stopConditions: lines(stopConditions),
      status: "ready",
    });
    setTitle("");
    setBrief("");
    setAffectedPaths("");
    setAllowedPaths("");
  }

  return (
    <section className="view-stack">
      <Panel title="Smoke Loop" icon={Gauge}>
        <div className="provider-form">
          <label>
            Safe micro-task
            <input readOnly value="README.md evidence marker + build/evidence verification" />
          </label>
          <div className="button-row">
            <button className="ghost-btn" onClick={() => prepareSmokeTest(false)}>
              <ClipboardCheck size={16} />
              Prepare smoke task
            </button>
            <button className="primary-btn" onClick={() => prepareSmokeTest(true)}>
              <Play size={16} />
              Run smoke loop
            </button>
            <button className="ghost-btn" onClick={runControlledSmoke}>
              <ListChecks size={16} />
              Controlled smoke
            </button>
          </div>
        </div>
        <div className="audit-list">
          {smokeReadiness.map((item) => (
            <div className="audit-row" key={item.subject}>
              <span className={`status-pill ${item.level === "error" ? "failed" : item.level === "warning" ? "warning" : "ok"}`}>
                {item.level}
              </span>
              <strong>{item.subject}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Task Composer" icon={ClipboardCheck}>
        <div className="form-grid">
          <label>
            Task title
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add auth screen with tests" />
          </label>
          <label>
            Free-form TZ
            <textarea value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Describe the expected result, context, constraints, and risks." />
          </label>
          <label>
            Acceptance criteria
            <textarea value={criteria} onChange={(event) => setCriteria(event.target.value)} />
          </label>
          <label>
            Constraints
            <textarea value={constraints} onChange={(event) => setConstraints(event.target.value)} />
          </label>
          <label>
            Affected paths
            <textarea value={affectedPaths} onChange={(event) => setAffectedPaths(event.target.value)} placeholder="src/App.tsx&#10;src-tauri/src/main.rs" />
          </label>
          <label>
            Allowed paths
            <textarea value={allowedPaths} onChange={(event) => setAllowedPaths(event.target.value)} placeholder="src&#10;README.md&#10;.dbc/tasks" />
          </label>
          <label>
            Denied paths
            <textarea value={deniedPaths} onChange={(event) => setDeniedPaths(event.target.value)} />
          </label>
          <label>
            Required reviewers
            <textarea value={requiredReviewers} onChange={(event) => setRequiredReviewers(event.target.value)} />
          </label>
          <label>
            Stop conditions
            <textarea value={stopConditions} onChange={(event) => setStopConditions(event.target.value)} />
          </label>
          <label>
            Budget
            <input type="number" min="0" step="1" value={budgetLimit} onChange={(event) => setBudgetLimit(Number(event.target.value))} />
          </label>
          <label>
            Risk
            <select value={risk} onChange={(event) => setRisk(event.target.value as RiskLevel)}>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="critical">critical</option>
            </select>
          </label>
          <label>
            Priority
            <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
              <option value="low">low</option>
              <option value="normal">normal</option>
              <option value="high">high</option>
              <option value="urgent">urgent</option>
            </select>
          </label>
          <label>
            Loop profile
            <select value={loopProfile} onChange={(event) => setLoopProfile(event.target.value as TaskLoopProfile)}>
              <option value="mock">mock</option>
              <option value="controlled_smoke">controlled_smoke</option>
              <option value="real_micro">real_micro</option>
            </select>
          </label>
          <label>
            Provider strategy
            <select value={providerStrategy} onChange={(event) => setProviderStrategy(event.target.value as ProviderStrategy)}>
              <option value="codex_build_claude_review">codex_build_claude_review</option>
              <option value="codex_only">codex_only</option>
              <option value="claude_review_only">claude_review_only</option>
              <option value="mock_only">mock_only</option>
            </select>
          </label>
          <div className="button-row">
            <button className="ghost-btn" onClick={submit}>
              <Plus size={16} />
              Save task
            </button>
            <button className="primary-btn" onClick={() => startLoop()}>
              <Play size={16} />
              Start loop
            </button>
          </div>
        </div>
      </Panel>
      <div className="task-list">
        {tasks.map((task) => {
          const latestContract = latestContractForTask(task.id, harnessOverview.contracts);
          const latestSlice = latestSliceForTask(task.id, harnessOverview.slices);
          const approvedContract = latestContractForTask(task.id, harnessOverview.contracts, ["approved"]);
          const approvedSlice = latestSliceForTask(task.id, harnessOverview.slices, ["approved"]);
          return (
            <article className="task-card" key={task.id}>
              <div>
                <span>{task.id}</span>
                <strong>{task.title}</strong>
                <p>{task.brief}</p>
                {task.specPath ? <code>{task.specPath} #{task.specChecksum}</code> : null}
                {latestContract ? <code>Contract: {latestContract.id} · {latestContract.status}</code> : null}
                {latestSlice ? <code>WorkSlice: {latestSlice.id} · {latestSlice.status}</code> : null}
              </div>
              <ul>
                {task.criteria.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="stack-row">
                <span>{task.risk}</span>
                <span>{task.priority}</span>
                <span>{task.loopProfile}</span>
                {task.affectedPaths.slice(0, 3).map((path) => (
                  <span key={path}>{path}</span>
                ))}
              </div>
              <div className="stack-row">
                {(task.allowedPaths?.length ? task.allowedPaths : task.affectedPaths).slice(0, 3).map((path) => (
                  <span key={`allow-${path}`}>{path}</span>
                ))}
                {(task.deniedPaths ?? []).slice(0, 2).map((path) => (
                  <span key={`deny-${path}`}>{path}</span>
                ))}
              </div>
              <div className="button-row">
                <span className={`status-pill ${task.status}`}>{task.status}</span>
                <button className="ghost-btn" onClick={() => saveTaskContract(task.id)}>
                  <FileText size={16} />
                  Save spec
                </button>
                <button className="primary-btn" onClick={() => startSimpleHarnessForTask(task.id)}>
                  <Play size={16} />
                  Start safe run
                </button>
              </div>
              <details className="advanced-actions">
                <summary>Advanced controls</summary>
                <div className="button-row">
                  <button className="ghost-btn" onClick={() => createHarnessContract(task.id)}>
                    <FileText size={16} />
                    Create Contract
                  </button>
                  <button className="ghost-btn" onClick={() => freezeLatestContract(task.id)} disabled={latestContract?.status !== "draft"}>
                    <ClipboardCheck size={16} />
                    Freeze Spec
                  </button>
                  <button className="ghost-btn" onClick={() => approveLatestContract(task.id)} disabled={!latestContract || !["waiting_approval", "frozen"].includes(latestContract.status)}>
                    <ShieldCheck size={16} />
                    Approve Contract
                  </button>
                  <button className="ghost-btn" onClick={() => createHarnessSlice(task.id)} disabled={!approvedContract}>
                    <ListChecks size={16} />
                    Create Slice
                  </button>
                  <button className="ghost-btn" onClick={() => approveLatestSlice(task.id)} disabled={!latestSlice || !["waiting_approval", "proposed"].includes(latestSlice.status)}>
                    <BadgeCheck size={16} />
                    Approve Slice
                  </button>
                  <button className="ghost-btn" onClick={() => startHarnessForTask(task.id)} disabled={!approvedContract || !approvedSlice}>
                    <Play size={16} />
                    Start Harness
                  </button>
                  <button className="ghost-btn" onClick={() => startLoop(task)}>
                    <Play size={16} />
                    Start legacy loop
                  </button>
                </div>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PreflightView({
  state,
  activeProject,
  task,
  operatorChecklist,
  onRun,
  onBack,
}: {
  state: AppState;
  activeProject?: AppState["projects"][number];
  task?: Task;
  operatorChecklist: OperatorChecklistResult | null;
  onRun: (task?: Task) => void;
  onBack: () => void;
}) {
  const steps = buildConfiguredLoopSteps(state.agents, state.providers);
  const gates = buildLoopPreflight({ state, activeProject, task, steps, operatorChecklist });
  const blockers = gates.filter((gate) => gate.level === "error");
  const warnings = gates.filter((gate) => gate.level === "warning");
  const hasRealCli = steps.some((step) => step.providerType === "cli" && step.providerRunMode === "real");
  const canRun = blockers.length === 0 && Boolean(task);

  return (
    <section className="view-stack">
      <Panel
        title="Loop Preflight"
        icon={ShieldCheck}
        action={
          <div className="button-row compact">
            <span className={`status-pill ${blockers.length ? "failed" : warnings.length ? "warning" : "ok"}`}>
              {blockers.length ? "blocked" : warnings.length ? "warnings" : "ready"}
            </span>
            <button className="ghost-btn" onClick={onBack}>
              <ChevronRight size={16} />
              Back
            </button>
            <button className="primary-btn" onClick={() => onRun(task)} disabled={!canRun}>
              <Play size={16} />
              {hasRealCli ? "Run real loop" : "Run loop"}
            </button>
          </div>
        }
      >
        <div className="summary-grid">
          <div>
            <span>Task</span>
            <strong>{task ? `${task.id}: ${task.title}` : "No task selected"}</strong>
          </div>
          <div>
            <span>Project</span>
            <strong>{activeProject?.path ?? "No active project"}</strong>
          </div>
          <div>
            <span>Execution</span>
            <strong>{hasRealCli ? "real CLI + local policy" : "mock/provider + local policy"}</strong>
          </div>
        </div>
        <div className="audit-list">
          {gates.map((gate) => (
            <div className="audit-row" key={`${gate.subject}-${gate.detail}`}>
              <span className={`status-pill ${gate.level === "error" ? "failed" : gate.level === "warning" ? "warning" : "ok"}`}>
                {gate.level}
              </span>
              <strong>{gate.subject}</strong>
              <p>{gate.detail}</p>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function AgentsView({
  agents,
  providers,
  setAgents,
}: {
  agents: AgentRole[];
  providers: Provider[];
  setAgents: (agents: AgentRole[]) => void;
}) {
  function toggleAgent(id: string) {
    setAgents(agents.map((agent) => (agent.id === id ? { ...agent, enabled: !agent.enabled } : agent)));
  }

  function updateAgent(id: string, patch: Partial<AgentRole>) {
    setAgents(
      agents.map((agent) => {
        if (agent.id !== id) return agent;
        const provider = providers.find((item) => item.id === (patch.providerId ?? agent.providerId));
        return {
          ...agent,
          ...patch,
          provider: provider?.name ?? agent.provider,
          model: provider?.command || provider?.type || agent.model,
        };
      }),
    );
  }

  return (
    <section className="agent-grid">
      {agents.map((agent) => (
        <article className={agent.enabled ? "agent-card" : "agent-card muted"} key={agent.id}>
          <div className="agent-card-head">
            <Bot size={20} />
            <label className="switch" title={`Toggle ${agent.role}`}>
              <input type="checkbox" checked={agent.enabled} onChange={() => toggleAgent(agent.id)} />
              <span />
            </label>
          </div>
          <strong>{agent.role}</strong>
          <p>{agent.mission}</p>
          <div className="field-stack">
            <label>
              Provider
              <select value={agent.providerId} onChange={(event) => updateAgent(agent.id, { providerId: event.target.value })}>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} ({provider.runMode})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Mode
              <select
                value={agent.mode}
                onChange={(event) => updateAgent(agent.id, { mode: event.target.value as AgentExecutionMode })}
              >
                {["read_only", "write_workspace", "write_tests_only", "review_only", "command_runner", "approval_required"].map(
                  (mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              Local commands
              <input
                value={agent.localCommands?.join(", ") ?? ""}
                onChange={(event) =>
                  updateAgent(agent.id, {
                    localCommands: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="pnpm build, pnpm test"
              />
            </label>
          </div>
          <div className="stack-row">
            <span>{agent.provider}</span>
            <span>{agent.mode}</span>
          </div>
          <div className="permission-list">
            {agent.permissions.map((permission) => (
              <span key={permission}>{permission}</span>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function LoopsView({
  steps,
  running,
  activeStep,
  currentLoop,
  harnessOverview,
  history,
  evidenceBundle,
  loopStateMachine,
  runJournal,
  evidenceLoading,
  onRetry,
  onRefresh,
  onRefreshEvidence,
  onRefreshStateMachine,
  onRefreshRunJournal,
  onOpen,
  onRefreshHarness,
  onAdvanceHarness,
  onGenerateEvidencePack,
}: {
  steps: AppState["loopSteps"];
  running: boolean;
  activeStep: number;
  currentLoop: LoopRunSnapshot | null;
  harnessOverview: HarnessOverview;
  history: LoopRunSummary[];
  evidenceBundle: LoopEvidenceBundle | null;
  loopStateMachine: LoopStateMachineReport | null;
  runJournal: RunJournalReport | null;
  evidenceLoading: boolean;
  onRetry: () => void;
  onRefresh: () => void;
  onRefreshEvidence: () => void;
  onRefreshStateMachine: () => void;
  onRefreshRunJournal: () => void;
  onOpen: (summary: LoopRunSummary) => void;
  onRefreshHarness: () => void;
  onAdvanceHarness: (run: HarnessRun) => void;
  onGenerateEvidencePack: (run: HarnessRun) => void;
}) {
  const canResume = currentLoop && !running && ["blocked", "failed", "stopped"].includes(currentLoop.status);
  const activeLoopStep = currentLoop?.steps[currentLoop.activeStepIndex];
  const executionStep = activeLoopStep ?? steps[activeStep] ?? steps[0];
  const attemptsUsed = activeLoopStep?.attemptCount ?? 0;
  const maxAttempts = activeLoopStep?.maxAttempts ?? 3;
  return (
    <section className="view-stack">
      <Panel
        title="Harness Runs"
        icon={ListChecks}
        action={
          <button className="ghost-btn" onClick={onRefreshHarness}>
            <RotateCcw size={16} />
            Refresh
          </button>
        }
      >
        <div className="summary-grid doctor-summary">
          <div>
            <span>Contracts</span>
            <strong>{harnessOverview.contracts.length}</strong>
          </div>
          <div>
            <span>Slices</span>
            <strong>{harnessOverview.slices.length}</strong>
          </div>
          <div>
            <span>Runs</span>
            <strong>{harnessOverview.runs.length}</strong>
          </div>
          <div>
            <span>Packs</span>
            <strong>{harnessOverview.evidencePacks.length}</strong>
          </div>
        </div>
        <div className="audit-list">
          {harnessOverview.runs.length ? (
            harnessOverview.runs.slice(0, 8).map((run) => {
              const slice = harnessOverview.slices.find((item) => item.id === run.currentSliceId);
              const pack = harnessOverview.evidencePacks.find((item) => item.harnessRunId === run.id);
              return (
                <div className="audit-row" key={run.id}>
                  <span className={`status-pill ${run.status === "accepted" || run.status === "evidence_ready" ? "ok" : run.status === "blocked" || run.status === "rejected" ? "failed" : "warning"}`}>
                    {displayValue(run.status)}
                  </span>
                  <strong>{slice?.title || run.taskId}</strong>
                  <p>
                    Stage {displayValue(run.currentStage)}; contract {run.contractId}; slice {run.currentSliceId}; loop {run.compatibilityLoopRunId || "pending"}.
                  </p>
                  <code>{run.manifestPath}</code>
                  {pack ? <code>EvidencePack: {pack.manifestPath}</code> : null}
                  <div className="button-row compact">
                    <button className="ghost-btn" onClick={() => onAdvanceHarness(run)} disabled={!run.compatibilityLoopRunId || ["accepted", "rejected", "blocked"].includes(run.status)}>
                      <ChevronRight size={16} />
                      Advance
                    </button>
                    <button className="ghost-btn" onClick={() => onGenerateEvidencePack(run)} disabled={!["evidence_ready", "accepted", "rework"].includes(run.status)}>
                      <ClipboardCheck size={16} />
                      Evidence Pack
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="helper-text">Create an approved TaskContract and WorkSlice, then start a HarnessRun from Tasks.</p>
          )}
        </div>
      </Panel>

      <Panel
        title="Loop History"
        icon={History}
        action={
          <button className="ghost-btn" onClick={onRefresh}>
            <RotateCcw size={16} />
            Refresh
          </button>
        }
      >
        <div className="audit-list">
          {history.length ? (
            history.slice(0, 12).map((item) => (
              <button className="candidate-row" key={`${item.source}-${item.id}`} onClick={() => onOpen(item)}>
                <span className={`status-pill ${item.status}`}>{item.status}</span>
                <strong>{item.taskTitle || item.taskId}</strong>
                <small>
                  {item.id} · {item.source} · {item.reportMarkdownPath || item.manifestPath}
                </small>
              </button>
            ))
          ) : (
            <p className="helper-text">No saved loops found for the active project yet.</p>
          )}
        </div>
      </Panel>

      <Panel
        title="Run Journal"
        icon={History}
        action={
          <button className="ghost-btn" onClick={onRefreshRunJournal}>
            <RotateCcw size={16} />
            Refresh
          </button>
        }
      >
        {runJournal ? (
          <div className="audit-list">
            <div className="summary-grid doctor-summary">
              <div>
                <span>Status</span>
                <strong>{displayValue(runJournal.status)}</strong>
              </div>
              <div>
                <span>Events</span>
                <strong>{runJournal.summary.events}</strong>
              </div>
              <div>
                <span>Provider calls</span>
                <strong>{runJournal.summary.providerCalls}</strong>
              </div>
              <div>
                <span>Steps</span>
                <strong>
                  {runJournal.summary.passedSteps}/{runJournal.summary.steps}
                </strong>
              </div>
              <div>
                <span>Pending</span>
                <strong>{runJournal.summary.pendingApprovalQueueItems || runJournal.summary.pendingApprovals}</strong>
              </div>
              <div>
                <span>Security</span>
                <strong>{runJournal.summary.securityFindings}</strong>
              </div>
            </div>
            <div className="audit-row">
              <span className={`status-pill ${runJournal.blockers.length ? "failed" : runJournal.status === "completed" ? "ok" : "warning"}`}>
                {displayValue(runJournal.status)}
              </span>
              <strong>{runJournal.task.title || runJournal.task.id || runJournal.loopId}</strong>
              <p>{runJournal.nextAction}</p>
            </div>
            {runJournal.events.slice(0, 8).map((event) => (
              <div className="audit-row" key={`journal-event-${event.id}`}>
                <span className={`status-pill ${event.status === "passed" || event.status === "accepted" || event.status === "completed" ? "ok" : event.status === "blocked" || event.status === "failed" ? "failed" : "warning"}`}>
                  {displayValue(event.status)}
                </span>
                <strong>
                  {event.actor}: {event.title}
                </strong>
                <p>{event.detail || event.evidence[0] || "Evidence recorded."}</p>
              </div>
            ))}
            {runJournal.providerCalls.slice(0, 7).map((call) => (
              <div className="audit-row" key={`provider-call-${call.stepId}`}>
                <span className={`status-pill ${call.status === "passed" ? "ok" : call.status === "failed" || call.status === "blocked" ? "failed" : "warning"}`}>
                  {displayValue(call.status)}
                </span>
                <strong>
                  {call.stepId}: {call.providerId || "local"} {displayValue(call.providerRunMode || "mock")}
                </strong>
                <p>
                  {call.promptMode ? `${displayValue(call.promptMode)} prompt` : "prompt mode missing"}
                  {call.resolvedCommand ? `; ${call.resolvedCommand}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="helper-text">Run pnpm run-journal or Launch Doctor, then refresh this panel.</p>
        )}
      </Panel>

      <EvidenceDashboard bundle={evidenceBundle} loading={evidenceLoading} onRefresh={onRefreshEvidence} />

      <Panel
        title="Loop State Machine"
        icon={ListChecks}
        action={
          <button className="ghost-btn" onClick={onRefreshStateMachine}>
            <RotateCcw size={16} />
            Refresh
          </button>
        }
      >
        {loopStateMachine ? (
          <div className="audit-list">
            <div className="summary-grid doctor-summary">
              <div>
                <span>Status</span>
                <strong>{displayValue(loopStateMachine.status)}</strong>
              </div>
              <div>
                <span>Current</span>
                <strong>{displayValue(loopStateMachine.currentState)}</strong>
              </div>
              <div>
                <span>Next</span>
                <strong>{displayValue(loopStateMachine.nextState)}</strong>
              </div>
              <div>
                <span>Blockers</span>
                <strong>{loopStateMachine.blockers.length}</strong>
              </div>
            </div>
            {loopStateMachine.transitions.map((transition) => (
              <div className="audit-row" key={`transition-${transition.id}`}>
                <span className={`status-pill ${transition.status === "passed" ? "ok" : transition.status === "blocked" ? "failed" : "warning"}`}>
                  {displayValue(transition.status)}
                </span>
                <strong>
                  {displayValue(transition.from)} {"->"} {displayValue(transition.to)}
                </strong>
                <p>{transition.detail}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="helper-text">Run pnpm loop-state-machine or Launch Doctor, then refresh this panel.</p>
        )}
      </Panel>

      <Panel title="Run Execution Console" icon={TerminalSquare}>
        {executionStep ? (
          <div className="audit-list">
            <div className="summary-grid doctor-summary">
              <div>
                <span>Step</span>
                <strong>{executionStep.state}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{displayValue(executionStep.status)}</strong>
              </div>
              <div>
                <span>Provider</span>
                <strong>{executionStep.providerId}</strong>
              </div>
              <div>
                <span>Run mode</span>
                <strong>{displayValue(executionStep.providerRunMode ?? "mock")}</strong>
              </div>
              <div>
                <span>Prompt</span>
                <strong>{displayValue(executionStep.providerPromptMode ?? "stdin")}</strong>
              </div>
              <div>
                <span>Attempts</span>
                <strong>
                  {executionStep.attemptCount ?? 0}/{executionStep.maxAttempts ?? 3}
                </strong>
              </div>
            </div>
            <div className="audit-row">
              <span className={`status-pill ${executionStep.providerPromptMode === "terminal" ? "warning" : "ok"}`}>
                {executionStep.providerPromptMode === "terminal" ? "manual" : "auto"}
              </span>
              <strong>{executionStep.providerCommand || "No CLI command"}</strong>
              <p>
                {executionStep.providerPromptMode === "terminal"
                  ? "Terminal mode is a human-operated surface; this backend stops before non-interactive execution."
                  : executionStep.providerArgsTemplate || "No args template configured."}
              </p>
            </div>
            {executionStep.output ? (
              <div className="audit-row">
                <span
                  className={`status-pill ${
                    executionStep.status === "passed"
                      ? "ok"
                      : executionStep.status === "failed" || executionStep.status === "blocked"
                        ? "failed"
                        : "warning"
                  }`}
                >
                  output
                </span>
                <strong>Latest provider output</strong>
                <pre className="step-output">{executionStep.output}</pre>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="helper-text">Start or open a loop to inspect provider execution state.</p>
        )}
      </Panel>

      <Panel
        title="Loop Monitor"
        icon={TerminalSquare}
        action={
          <div className="button-row compact">
            <span className={running ? "status-pill live" : `status-pill ${currentLoop?.status ?? ""}`}>
              {running ? `Step ${activeStep + 1}` : currentLoop?.status ?? "Idle"}
            </span>
            {canResume ? (
              <button className="primary-btn" onClick={onRetry} disabled={attemptsUsed >= maxAttempts}>
                <RotateCcw size={16} />
                Retry
              </button>
            ) : null}
          </div>
        }
      >
        {currentLoop ? (
          <div className="summary-grid">
            <div>
              <span>Manifest</span>
              <strong>{currentLoop.manifestPath || "pending"}</strong>
            </div>
            <div>
              <span>Report</span>
              <strong>{currentLoop.reportMarkdownPath || "pending"}</strong>
            </div>
            <div>
              <span>JSON</span>
              <strong>{currentLoop.reportJsonPath || "pending"}</strong>
            </div>
            <div>
              <span>Git baseline</span>
              <strong>{currentLoop.gitBaselinePath || "pending"}</strong>
            </div>
            <div>
              <span>Commit proposal</span>
              <strong>{currentLoop.commitProposalPath || "pending"}</strong>
            </div>
            <div>
              <span>Security</span>
              <strong>{currentLoop.securityReportPath || "pending"}</strong>
            </div>
          </div>
        ) : null}
        <div className="timeline">
          {steps.map((step) => (
            <div className={`timeline-row ${step.status}`} key={step.id}>
              <span />
              <div>
                <strong>
                  {step.state} <small>{step.agent}</small>
                </strong>
                <p>{step.summary}</p>
                <small>
                  Attempt {step.attemptCount ?? 0}/{step.maxAttempts ?? 3}
                  {step.requiresApproval ? " · approval required" : ""}
                </small>
                <code>{step.evidence}</code>
                {step.lastError ? <code>{step.lastError}</code> : null}
                {step.structuredReport ? (
                  <code>
                    Verdict: {step.structuredReport.verdict}; next: {step.structuredReport.nextAction || "n/a"}
                  </code>
                ) : null}
                {step.artifactPath ? <code>Artifact: {step.artifactPath}</code> : null}
                {step.evidencePath ? <code>Evidence: {step.evidencePath}</code> : null}
                {step.output ? <pre className="step-output">{step.output}</pre> : null}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function EvidenceDashboard({
  bundle,
  loading,
  onRefresh,
}: {
  bundle: LoopEvidenceBundle | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const health = bundle?.health;
  const task = asRecord(bundle?.taskSpec);
  const acceptance = asRecord(bundle?.acceptancePackage);
  const scopeGate = asRecord(acceptance?.scopeGate) ?? asRecord(asRecord(acceptance?.task)?.scopeGate);
  const gitWorkspace = asRecord(bundle?.gitWorkspace);
  const gitArtifacts = asRecord(gitWorkspace?.artifacts);
  const approvalLedger = asRecord(bundle?.approvalLedger);
  const approvalRecords = asArray(approvalLedger?.records).map(asRecord).filter(Boolean) as Array<Record<string, unknown>>;
  const pendingApprovals = approvalRecords.filter((record) => textValue(record.status) === "pending");
  const changedFiles = asArray(gitWorkspace?.changedFiles).map((item) => textValue(item)).filter(Boolean);
  const stepEvidence = bundle?.stepEvidence ?? [];

  return (
    <Panel
      title="Evidence Dashboard"
      icon={ClipboardCheck}
      action={
        <button className="ghost-btn" onClick={onRefresh} disabled={loading || !bundle}>
          <RotateCcw size={16} />
          {loading ? "Loading" : "Refresh"}
        </button>
      }
    >
      {bundle ? (
        <div className="evidence-stack">
          <div className="summary-grid evidence-summary">
            <div>
              <span>Verdict</span>
              <strong>{health?.verdict ?? "missing"}</strong>
            </div>
            <div>
              <span>Scope</span>
              <strong>{health?.scopePassed ? "passed" : "blocked or missing"}</strong>
            </div>
            <div>
              <span>Step evidence</span>
              <strong>{health?.stepEvidenceCount ?? 0}</strong>
            </div>
            <div>
              <span>Missing</span>
              <strong>{health?.missingArtifacts ?? 0}</strong>
            </div>
            <div>
              <span>Approvals</span>
              <strong>{health?.pendingApprovals ?? pendingApprovals.length}</strong>
            </div>
            <div>
              <span>Security</span>
              <strong>{health?.securityFindings ?? 0}</strong>
            </div>
          </div>

          <div className="evidence-grid">
            <EvidenceBlock title="Task Contract">
              <div className="stack-row">
                <span>{textValue(task?.id, "task missing")}</span>
                <span>{textValue(task?.status, "status missing")}</span>
                <span>{textValue(task?.risk, "risk missing")}</span>
                <span>{textValue(task?.priority, "priority missing")}</span>
              </div>
              <p>{textValue(task?.title, "Task title is missing.")}</p>
              <code>{textValue(bundle.refs.taskSpecPath)}</code>
              <div className="stack-row">
                <span>{textValue(task?.loopProfile, "profile missing")}</span>
                <span>{textValue(task?.providerStrategy, "strategy missing")}</span>
                <span>budget {textValue(task?.budgetLimit, "0")}</span>
              </div>
            </EvidenceBlock>

            <EvidenceBlock title="Scope Gate">
              <div className="stack-row">
                <span className={scopeGate?.passed === true ? "status-pill ok" : "status-pill failed"}>
                  {scopeGate?.passed === true ? "passed" : "not passed"}
                </span>
                <span>{textValue(scopeGate?.mode, "mode missing")}</span>
                <span>{scopeGate?.verified === true ? "verified" : "unverified"}</span>
              </div>
              <code>outside: {arrayText(scopeGate?.outsideAllowed)}</code>
              <code>denied: {arrayText(scopeGate?.deniedMatches)}</code>
            </EvidenceBlock>

            <EvidenceBlock title="Git Workspace">
              <div className="stack-row">
                <span>{gitWorkspace?.isGitRepo === false ? "no git" : "git repo"}</span>
                <span>{textValue(gitWorkspace?.currentBranch, "branch missing")}</span>
                <span>{gitWorkspace?.dirtyTree === true ? "dirty" : "clean or unknown"}</span>
              </div>
              <code>task branch: {textValue(gitWorkspace?.suggestedTaskBranch, "missing")}</code>
              <code>diff: {textValue(gitArtifacts?.diffPath ?? bundle.refs.gitDiffPath, "missing")}</code>
              <code>stat: {textValue(gitArtifacts?.diffStatPath ?? bundle.refs.gitDiffStatPath, "missing")}</code>
              <p>{changedFiles.length ? `${changedFiles.length} changed file(s): ${changedFiles.slice(0, 6).join(", ")}` : "No changed files recorded."}</p>
            </EvidenceBlock>

            <EvidenceBlock title="Approvals">
              <div className="stack-row">
                <span className={pendingApprovals.length ? "status-pill warning" : "status-pill ok"}>
                  {pendingApprovals.length} pending
                </span>
                <span>{textValue(approvalLedger?.status, "ledger missing")}</span>
              </div>
              <code>{textValue(bundle.refs.approvalLedgerPath, "ledger path missing")}</code>
              {pendingApprovals.slice(0, 5).map((record) => (
                <code key={textValue(record.id)}>{textValue(record.id)}: {textValue(record.action)}</code>
              ))}
            </EvidenceBlock>
          </div>

          <EvidenceBlock title="Step Evidence">
            <div className="audit-list compact-list">
              {stepEvidence.length ? (
                stepEvidence.map((item, index) => (
                  <div className="evidence-row" key={`${textValue(item.stepId, "step")}-${index}`}>
                    <span className={`status-pill ${statusClass(textValue(item.status ?? item.verdict, "warning"))}`}>
                      {textValue(item.status ?? item.verdict, "recorded")}
                    </span>
                    <strong>{textValue(item.stepId ?? item.state, `step ${index + 1}`)}</strong>
                    <small>{textValue(item.providerId ?? item.agent ?? item.path, "provider missing")}</small>
                  </div>
                ))
              ) : (
                <p className="helper-text">No step evidence artifacts found for this loop.</p>
              )}
            </div>
          </EvidenceBlock>

          <EvidenceBlock title="Diagnostics">
            <div className="audit-list compact-list">
              {bundle.diagnostics.map((item, index) => (
                <div className="evidence-row" key={`${item.subject}-${index}`}>
                  <span className={`status-pill ${item.level === "error" ? "failed" : item.level === "warning" ? "warning" : "ok"}`}>
                    {item.level}
                  </span>
                  <strong>{item.subject}</strong>
                  <small>{item.detail}</small>
                </div>
              ))}
            </div>
          </EvidenceBlock>
        </div>
      ) : (
        <p className="helper-text">Open a saved loop to load its evidence bundle.</p>
      )}
    </Panel>
  );
}

function EvidenceBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="evidence-block">
      <strong>{title}</strong>
      {children}
    </article>
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textValue(value: unknown, fallback = "missing") {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function displayValue(value: unknown, fallback = "missing") {
  return textValue(value, fallback).replace(/_/g, " ");
}

function arrayText(value: unknown) {
  const items = asArray(value).map((item) => textValue(item)).filter((item) => item !== "missing");
  return items.length ? items.join(", ") : "none";
}

function statusClass(status: string) {
  if (["ok", "pass", "passed", "completed", "accepted"].includes(status)) return "ok";
  if (["failed", "fail", "error", "blocked", "rejected"].includes(status)) return "failed";
  return "warning";
}

function ApprovalsView({
  approvals,
  approvalQueue,
  harnessOverview,
  updateApproval,
  onRefreshApprovalQueue,
}: {
  approvals: ApprovalRequest[];
  approvalQueue: ApprovalQueueReport | null;
  harnessOverview: HarnessOverview;
  updateApproval: (id: string, status: ApprovalRequest["status"]) => void;
  onRefreshApprovalQueue: () => void;
}) {
  const harnessGates = buildHarnessApprovalGates(harnessOverview);
  return (
    <section className="view-stack">
      <Panel
        title="Approval Queue"
        icon={ShieldCheck}
        action={
          <button className="ghost-btn" onClick={onRefreshApprovalQueue}>
            <RotateCcw size={16} />
            Refresh
          </button>
        }
      >
        {approvalQueue ? (
          <div className="audit-list">
            <div className="summary-grid doctor-summary">
              <div>
                <span>Status</span>
                <strong>{displayValue(approvalQueue.status)}</strong>
              </div>
              <div>
                <span>Required</span>
                <strong>{approvalQueue.summary.required}</strong>
              </div>
              <div>
                <span>Pending</span>
                <strong>{approvalQueue.summary.pendingRequired}</strong>
              </div>
              <div>
                <span>Approved</span>
                <strong>{approvalQueue.summary.approved}</strong>
              </div>
              <div>
                <span>Blocked</span>
                <strong>{approvalQueue.summary.blocked}</strong>
              </div>
              <div>
                <span>Warnings</span>
                <strong>{approvalQueue.warnings.length}</strong>
              </div>
            </div>
            <div className="audit-row">
              <span className={`status-pill ${approvalQueue.blockers.length ? "failed" : approvalQueue.status === "ready" ? "ok" : "warning"}`}>
                {displayValue(approvalQueue.status)}
              </span>
              <strong>Next action</strong>
              <p>{approvalQueue.nextAction}</p>
            </div>
            {approvalQueue.items.map((item) => (
              <article className="approval-card" key={item.id}>
                <div className="approval-head">
                  <div>
                    <span>{`${item.kind} · ${item.id}`}</span>
                    <strong>{item.title}</strong>
                  </div>
                  <RiskPill risk={item.risk} />
                </div>
                <p>{item.reason}</p>
                <div className="stack-row">
                  <span>{item.required ? "required" : "not required"}</span>
                  {item.provider ? <span>{item.provider}</span> : null}
                  {item.surface ? <span>{item.surface}</span> : null}
                  {item.sourceStatus ? <span>{displayValue(item.sourceStatus)}</span> : null}
                </div>
                {item.nextAction ? <pre>{item.nextAction}</pre> : null}
                {item.evidence.length ? (
                  <div className="stack-row">
                    {item.evidence.slice(0, 3).map((entry) => (
                      <span key={entry}>{entry}</span>
                    ))}
                  </div>
                ) : null}
                {item.decisionPath ? (
                  <div className="stack-row">
                    <span>{item.decisionPath}</span>
                  </div>
                ) : null}
                <span className={`status-pill ${item.status === "blocked" ? "failed" : item.status === "approved" || item.status === "not_required" ? "ok" : "warning"}`}>
                  {displayValue(item.status)}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="audit-row">
            <span className="status-pill warning">missing</span>
            <strong>Approval Queue report</strong>
            <p>Run pnpm approval-queue in the project root, then refresh this panel.</p>
          </div>
        )}
      </Panel>

      <Panel title="Harness Approval Gates" icon={ShieldCheck}>
        <div className="audit-list">
          {harnessGates.map((gate) => (
            <div className="audit-row" key={gate.id}>
              <span className={`status-pill ${gate.status === "approved" || gate.status === "ready" ? "ok" : gate.status === "blocked" ? "failed" : "warning"}`}>
                {displayValue(gate.status)}
              </span>
              <strong>{gate.label}</strong>
              <p>{gate.detail}</p>
            </div>
          ))}
        </div>
      </Panel>

      <section className="approval-list">
        {approvals.map((approval) => (
          <article className="approval-card" key={approval.id}>
            <div className="approval-head">
            <div>
              <span>{approval.kind ? `${approval.kind} · ${approval.id}` : approval.id}</span>
              <strong>{approval.action}</strong>
            </div>
            <RiskPill risk={approval.risk} />
          </div>
          <p>{approval.reason}</p>
          {approval.command ? <code>{approval.command}</code> : null}
          <pre>{approval.preview}</pre>
          <div className="stack-row">
            {approval.requester ? <span>{approval.requester}</span> : null}
            {approval.optional ? <span>optional</span> : null}
            {approval.createdAt ? <span>{approval.createdAt}</span> : null}
          </div>
          {approval.artifactPath || approval.decisionPath ? (
            <div className="stack-row">
              {approval.artifactPath ? <span>{approval.artifactPath}</span> : null}
              {approval.decisionPath ? <span>{approval.decisionPath}</span> : null}
            </div>
          ) : null}
          <div className="button-row">
            <button className="primary-btn" onClick={() => updateApproval(approval.id, "approved")} disabled={approval.status !== "pending"}>
              <CheckCircle2 size={16} />
              Approve
            </button>
            <button className="ghost-btn" onClick={() => updateApproval(approval.id, "changes_requested")} disabled={approval.status !== "pending"}>
              <AlertTriangle size={16} />
              Request changes
            </button>
            <button className="danger-btn" onClick={() => updateApproval(approval.id, "rejected")} disabled={approval.status !== "pending"}>
              <XCircle size={16} />
              Reject
            </button>
          </div>
          <span className={`status-pill ${approval.status}`}>{approval.status.replace("_", " ")}</span>
          </article>
        ))}
      </section>
    </section>
  );
}

function ReportsView({
  state,
  totalCost,
  currentLoop,
  harnessOverview,
}: {
  state: AppState;
  totalCost: number;
  currentLoop: LoopRunSnapshot | null;
  harnessOverview: HarnessOverview;
}) {
  const report = useMemo(() => {
    const task = state.tasks[0];
    const allStepsPassed = state.loopSteps.length > 0 && state.loopSteps.every((step) => step.status === "passed");
    const pendingApprovals = state.approvals.filter((approval) => approval.status === "pending");
    const hasArtifacts = state.loopSteps.some((step) => Boolean(step.artifactPath));
    const hasEvidenceFiles = state.loopSteps.some((step) => Boolean(step.evidencePath));
    const hasStructuredReports = state.loopSteps.some((step) => Boolean(step.structuredReport));
    const hasTaskSpec = Boolean(task?.specPath && task.specChecksum);
    const hasMemoryFiles = state.memory.some((note) => Boolean(note.path && note.checksum));
    const latestPack = harnessOverview.evidencePacks[0];
    const finalStatus = allStepsPassed && pendingApprovals.length === 0 ? "accepted" : "blocked";
    return [
      `# Acceptance Report: ${task?.title ?? "Untitled task"}`,
      "",
      `Task: ${task?.id ?? "TASK"}`,
      `Task status: ${task?.status ?? "draft"}`,
      `Task spec: ${hasTaskSpec ? `${task?.specPath}#${task?.specChecksum}` : "not persisted"}`,
      `Loop manifest: ${currentLoop?.manifestPath ?? "not started"}`,
      `Backend JSON report: ${currentLoop?.reportJsonPath ?? "not started"}`,
      `Backend Markdown report: ${currentLoop?.reportMarkdownPath ?? "not started"}`,
      `Git baseline: ${currentLoop?.gitBaselinePath ?? "not started"}`,
      `Commit proposal: ${currentLoop?.commitProposalPath ?? "not started"}`,
      `Security report: ${currentLoop?.securityReportPath ?? "not started"}`,
      `Harness EvidencePack: ${latestPack?.manifestPath ?? "not generated"}`,
      `Harness final decision: ${latestPack?.finalDecision || "pending"}`,
      `Final status: ${finalStatus}`,
      `Cost: $${totalCost.toFixed(2)} estimated`,
      `Evidence gate: ${allStepsPassed ? "all loop steps passed" : "loop has incomplete or failed steps"}`,
      `Artifact gate: ${hasArtifacts ? "backend artifacts recorded" : "no backend artifacts recorded yet"}`,
      `Evidence file gate: ${hasEvidenceFiles ? "machine-readable evidence recorded" : "no evidence snapshot recorded yet"}`,
      `Structured output gate: ${hasStructuredReports ? "structured step reports recorded" : "no structured reports recorded yet"}`,
      `Task spec gate: ${hasTaskSpec ? "persisted contract available" : "missing persisted contract"}`,
      `Project memory gate: ${hasMemoryFiles ? "project memory persisted" : "no persisted memory notes"}`,
      `Approval gate: ${pendingApprovals.length === 0 ? "no pending approvals" : `${pendingApprovals.length} pending approval(s)`}`,
      "",
      "## Evidence",
      ...state.loopSteps.map((step) => `- ${step.state}: ${step.status} - ${step.evidence}${step.evidencePath ? ` (${step.evidencePath})` : ""}`),
      "",
      "## Backend Acceptance Package",
      currentLoop ? `- Manifest: ${currentLoop.manifestPath}` : "- Manifest: not started",
      currentLoop ? `- JSON: ${currentLoop.reportJsonPath}` : "- JSON: not started",
      currentLoop ? `- Markdown: ${currentLoop.reportMarkdownPath}` : "- Markdown: not started",
      currentLoop ? `- Git baseline: ${currentLoop.gitBaselinePath}` : "- Git baseline: not started",
      currentLoop ? `- Commit proposal: ${currentLoop.commitProposalPath}` : "- Commit proposal: not started",
      currentLoop ? `- Security: ${currentLoop.securityReportPath}` : "- Security: not started",
      "",
      "## Harness Evidence Packs",
      ...(harnessOverview.evidencePacks.length
        ? harnessOverview.evidencePacks.map((pack) => `- ${pack.id}: ${pack.status}; manifest ${pack.manifestPath}; report ${pack.reportPath}; decision ${pack.finalDecision || "pending"}`)
        : ["- No Harness EvidencePack generated."]),
      "",
      "## Structured Reports",
      ...state.loopSteps
        .filter((step) => step.structuredReport)
        .map((step) => {
          const report = step.structuredReport;
          return `- ${step.state}: ${report?.verdict} - ${report?.summary}`;
        }),
      "",
      "## Project Memory",
      ...(state.memory.length
        ? state.memory.slice(0, 8).map((note) => `- [${note.type}] ${note.title}${note.path ? ` (${note.path}#${note.checksum})` : ""}`)
        : ["- No project memory notes recorded."]),
      "",
      "## Backend Artifacts",
      ...state.loopSteps
        .filter((step) => step.artifactPath)
        .map((step) => `- ${step.state}: ${step.artifactPath}`),
      "",
      "## Evidence Files",
      ...state.loopSteps
        .filter((step) => step.evidencePath)
        .map((step) => `- ${step.state}: ${step.evidencePath}`),
      "",
      "## Risks",
      ...(pendingApprovals.length
        ? pendingApprovals.map((approval) => `- Pending approval: ${approval.action}`)
        : ["- No unresolved approval risks recorded."]),
    ].join("\n");
  }, [state, totalCost, currentLoop, harnessOverview]);

  return (
    <section className="view-stack">
      <Panel title="Evidence Packs" icon={ClipboardCheck}>
        <div className="audit-list">
          {harnessOverview.evidencePacks.length ? (
            harnessOverview.evidencePacks.map((pack) => (
              <div className="audit-row" key={pack.id}>
                <span className={`status-pill ${pack.finalDecision === "accepted" ? "ok" : pack.status === "finalized" ? "warning" : "ok"}`}>
                  {displayValue(pack.status)}
                </span>
                <strong>{pack.id}</strong>
                <p>Decision: {pack.finalDecision || "pending"}</p>
                <code>{pack.manifestPath}</code>
                <code>{pack.reportPath}</code>
              </div>
            ))
          ) : (
            <p className="helper-text">Generate EvidencePack from a HarnessRun after it reaches evidence_ready.</p>
          )}
        </div>
      </Panel>
      <Panel title="Final Acceptance Report" icon={FileText}>
        <textarea className="report-box" readOnly value={report} />
      </Panel>
    </section>
  );
}

function SettingsView({
  state,
  setState,
  audit,
  costs,
  providerSessionReport,
  onRefreshProviderSessionReport,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  audit: AppState["audit"];
  costs: AppState["costs"];
  providerSessionReport: ProviderSessionReport | null;
  onRefreshProviderSessionReport: () => void;
}) {
  const [draft, setDraft] = useState({
    name: "Generic CLI",
    command: "",
    argsTemplate: "",
    versionArgs: "--version",
  });
  const [candidates, setCandidates] = useState<Record<string, CliCandidate[]>>({});
  const [contractChecks, setContractChecks] = useState<Record<string, CliContractCheckResult>>({});
  const [policyProbe, setPolicyProbe] = useState("git status --short");
  const [policyProbeResult, setPolicyProbeResult] = useState<"allow" | "approval" | "deny" | "">("");
  const [contractDiagnostics, setContractDiagnostics] = useState<ProjectConfigDiagnostic[]>([]);
  const activeProject = state.projects.find((project) => project.id === state.activeProjectId) ?? state.projects[0];

  function updateProvider(id: string, patch: Partial<Provider>) {
    setState((current) => {
      const providers = current.providers.map((provider) => (provider.id === id ? { ...provider, ...patch } : provider));
      const agents = syncAssignedRoles(providers, current.agents);
      return { ...current, providers: syncProvidersWithAgents(providers, agents), agents };
    });
  }

  function applyProviderPreset(presetId: string) {
    const preset = providerPresets.find((item) => item.id === presetId);
    if (!preset) return;
    setState((current) => {
      const providers = preset.providers.map((provider) => ({
        ...provider,
        lastTestAt: current.providers.find((item) => item.id === provider.id)?.lastTestAt,
        lastTestResult: current.providers.find((item) => item.id === provider.id)?.lastTestResult ?? provider.lastTestResult,
        lastContractCheckAt: current.providers.find((item) => item.id === provider.id)?.lastContractCheckAt,
        lastContractCheckResult: current.providers.find((item) => item.id === provider.id)?.lastContractCheckResult ?? provider.lastContractCheckResult,
      }));
      const agents = syncAssignedRoles(providers, current.agents);
      return {
        ...current,
        providers: syncProvidersWithAgents(providers, agents),
        agents,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Provider Manager",
            action: "Provider preset applied",
            result: preset.name,
          },
          ...current.audit,
        ],
      };
    });
  }

  function addProvider() {
    if (!draft.name.trim() || !draft.command.trim()) return;
    const provider: Provider = {
      id: uid("provider").toLowerCase(),
      name: draft.name.trim(),
      type: "cli",
      enabled: true,
      health: "unknown",
      command: draft.command.trim(),
      argsTemplate: draft.argsTemplate.trim(),
      versionArgs: draft.versionArgs.trim() || "--version",
      promptMode: "stdin",
      runMode: "mock",
      timeoutSeconds: 900,
      maxOutputBytes: 200000,
      capabilities: ["structured_output"],
      assignedRoles: [],
    };
    setState((current) => ({
      ...current,
      providers: [...current.providers, provider],
      audit: [
        {
          id: uid("AUD"),
          time: currentTime(),
          actor: "Provider Manager",
          action: "Provider added",
          result: `${provider.name} registered as CLI adapter.`,
        },
        ...current.audit,
      ],
    }));
    setDraft({ name: "Generic CLI", command: "", argsTemplate: "", versionArgs: "--version" });
  }

  async function testProvider(provider: Provider) {
    const result = await testCliProvider(provider);
    updateProvider(provider.id, {
      health: result.status,
      lastTestAt: currentTime(),
      lastTestResult: `${result.detail}${result.versionOutput ? ` ${result.versionOutput}` : ""}`,
    });
    setState((current) => ({
      ...current,
      audit: [
        {
          id: uid("AUD"),
          time: currentTime(),
          actor: "Provider Manager",
          action: "Provider health check",
          result: `${provider.name}: ${result.status}`,
        },
        ...current.audit,
      ],
    }));
  }

  async function detectProvider(provider: Provider) {
    const found = await discoverCli(provider);
    setCandidates((current) => ({ ...current, [provider.id]: found }));
    setState((current) => ({
      ...current,
      audit: [
        {
          id: uid("AUD"),
          time: currentTime(),
          actor: "Provider Manager",
          action: "CLI discovery",
          result: `${provider.name}: ${found.length} candidate(s) found.`,
        },
        ...current.audit,
      ],
    }));
    if (found.length === 1 && found[0].status === "ok") {
      updateProvider(provider.id, {
        command: found[0].path,
        health: found[0].status,
        lastTestResult: `Auto-detected ${found[0].path} from ${found[0].source}. ${found[0].versionOutput}`,
      });
    }
  }

  async function checkProviderContract(provider: Provider) {
    const result = await checkCliContract(provider, activeProject?.path ?? "");
    setContractChecks((current) => ({ ...current, [provider.id]: result }));
    updateProvider(provider.id, {
      health: result.status,
      command: result.resolvedCommand || provider.command,
      argsTemplate: result.normalizedArgsTemplate,
      promptMode: result.promptMode,
      lastContractCheckAt: currentTime(),
      lastContractCheckResult: result.diagnostics.map((item) => `${item.level}:${item.subject}`).join(", "),
      lastTestResult: `${result.status}: ${result.diagnostics.map((item) => `${item.subject}: ${item.detail}`).join(" ")}`,
    });
    setState((current) => ({
      ...current,
      audit: [
        {
          id: uid("AUD"),
          time: currentTime(),
          actor: "Provider Manager",
          action: "CLI contract check",
          result: `${provider.name}: ${result.status}`,
        },
        ...current.audit,
      ],
    }));
    void onRefreshProviderSessionReport();
  }

  async function testPolicyProbe() {
    const decision = await classifyCommand(policyProbe);
    setPolicyProbeResult(decision);
    if (decision === "approval") {
      const command = policyProbe.trim();
      const id = `CMD-${command.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "REQUEST"}`;
      setState((current) => {
        const approval: ApprovalRequest = {
          id,
          kind: "command_request",
          action: `Approve command: ${command}`,
          reason: "Command policy classifies this command as approval_required.",
          requester: "Command Policy",
          risk: commandApprovalRisk(command),
          command,
          preview: "Approve only after verifying task scope, workspace diff, and rollback plan.",
          artifactPath: activeProject?.path ? `${activeProject.path}/.dbc/policy.yaml` : "",
          createdAt: new Date().toISOString(),
          status: "pending",
        };
        return {
          ...current,
          approvals: current.approvals.some((item) => item.id === id)
            ? current.approvals
            : [approval, ...current.approvals],
          audit: [
            {
              id: uid("AUD"),
              time: currentTime(),
              actor: "Command Policy",
              action: "Command approval requested",
              result: command,
            },
            ...current.audit,
          ],
        };
      });
    }
  }

  async function syncProjectConfig() {
    if (!activeProject) return;
    const result = await saveProjectConfig(activeProject.path, state.providers, state.commandPolicy);
    setContractDiagnostics([
      {
        level: "info",
        subject: "project-contract",
        detail: `Saved ${result.providers.path} and ${result.policy.path}.`,
      },
    ]);
    setState((current) => ({
      ...current,
      audit: [
        {
          id: uid("AUD"),
          time: currentTime(),
          actor: "Config Sync",
          action: ".dbc contract saved",
          result: `${result.providers.path}#${result.providers.checksum}; ${result.policy.path}#${result.policy.checksum}`,
        },
        ...current.audit,
      ],
    }));
    void onRefreshProviderSessionReport();
  }

  async function loadProjectContract() {
    if (!activeProject) return;
    const result = await loadProjectConfig(activeProject.path);
    setContractDiagnostics(result.diagnostics);
    setState((current) => {
      const shouldApplyProviders = Boolean(result.providersRecord && result.providers.length);
      const providers = shouldApplyProviders ? result.providers : current.providers;
      const agents = shouldApplyProviders ? syncAssignedRoles(providers, current.agents) : current.agents;
      return {
        ...current,
        providers: shouldApplyProviders ? syncProvidersWithAgents(providers, agents) : current.providers,
        agents,
        commandPolicy: result.policyRecord ? result.commandPolicy : current.commandPolicy,
        audit: [
          {
            id: uid("AUD"),
            time: currentTime(),
            actor: "Config Sync",
            action: ".dbc contract loaded",
            result: `${result.providersRecord?.path ?? "providers missing"}; ${result.policyRecord?.path ?? "policy missing"}; ${result.diagnostics.length} diagnostic(s).`,
          },
          ...current.audit,
        ],
      };
    });
    void onRefreshProviderSessionReport();
  }

  async function switchProviderProfile(profile: "mock" | "real-micro") {
    if (!activeProject) return;
    try {
      const result = await applyProviderProfile(activeProject.path, profile);
      setContractDiagnostics([
        {
          level: "info",
          subject: "provider-profile",
          detail: `Applied ${result.applied}; backup ${result.backupPath || "browser-preview"}.`,
        },
        ...result.diagnostics,
      ]);
      setState((current) => {
        const shouldApplyProviders = result.providers.length > 0;
        const providers = shouldApplyProviders ? result.providers : current.providers;
        const agents = shouldApplyProviders ? syncAssignedRoles(providers, current.agents) : current.agents;
        return {
          ...current,
          providers: shouldApplyProviders ? syncProvidersWithAgents(providers, agents) : current.providers,
          agents,
          audit: [
            {
              id: uid("AUD"),
              time: currentTime(),
              actor: "Provider Manager",
              action: "Provider profile applied",
              result: `${result.applied}; ${result.providersPath}#${result.checksum}; backup ${result.backupPath || "none"}`,
            },
            ...current.audit,
          ],
        };
      });
      void onRefreshProviderSessionReport();
    } catch (error) {
      setContractDiagnostics([
        {
          level: "error",
          subject: "provider-profile",
          detail: error instanceof Error ? error.message : String(error),
        },
      ]);
    }
  }

  const routingDiagnostics = buildProviderRoutingDiagnostics(state.agents, state.providers);

  return (
    <section className="view-stack">
      <Panel title="Project Contract" icon={ClipboardCheck}>
        <div className="provider-form">
          <label>
            Active project
            <input readOnly value={activeProject?.path ?? "No active project"} />
          </label>
          <div className="button-row">
            <button className="primary-btn" onClick={syncProjectConfig} disabled={!activeProject}>
              <ClipboardCheck size={16} />
              Sync .dbc config
            </button>
            <button className="ghost-btn" onClick={loadProjectContract} disabled={!activeProject}>
              <FileText size={16} />
              Load .dbc config
            </button>
            <button className="ghost-btn" onClick={() => switchProviderProfile("real-micro")} disabled={!activeProject}>
              <Play size={16} />
              Apply real micro
            </button>
            <button className="ghost-btn" onClick={() => switchProviderProfile("mock")} disabled={!activeProject}>
              <RotateCcw size={16} />
              Apply mock
            </button>
          </div>
        </div>
        {contractDiagnostics.length ? (
          <div className="audit-list">
            {contractDiagnostics.slice(0, 6).map((item, index) => (
              <div className="audit-row" key={`${item.subject}-${index}`}>
                <span className={`status-pill ${item.level === "error" ? "failed" : item.level === "warning" ? "warning" : "ok"}`}>
                  {item.level}
                </span>
                <strong>{item.subject}</strong>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        ) : null}
      </Panel>

      <Panel title="Provider Routing" icon={GitBranch}>
        <div className="audit-list">
          {routingDiagnostics.map((item) => (
            <div className="audit-row" key={item.subject}>
              <span className={`status-pill ${item.level === "error" ? "failed" : item.level === "warning" ? "warning" : "ok"}`}>
                {item.level}
              </span>
              <strong>{item.subject}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Provider Presets" icon={BadgeCheck}>
        <div className="provider-grid">
          {providerPresets.map((preset) => (
            <article className="provider-card" key={preset.id}>
              <div className="provider-head">
                <div>
                  <strong>{preset.name}</strong>
                  <span>{preset.description}</span>
                </div>
              </div>
              <div className="stack-row">
                {preset.providers.flatMap((provider) => provider.assignedRoles.map((role) => `${role}:${provider.name}`)).slice(0, 8).map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <button className="ghost-btn" onClick={() => applyProviderPreset(preset.id)}>
                <BadgeCheck size={16} />
                Apply preset
              </button>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="Add CLI Provider" icon={KeyRound}>
        <div className="provider-form">
          <label>
            Name
            <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label>
            Command
            <input
              value={draft.command}
              onChange={(event) => setDraft({ ...draft, command: event.target.value })}
              placeholder="/opt/homebrew/bin/codex"
            />
          </label>
          <label>
            Args template
            <input
              value={draft.argsTemplate}
              onChange={(event) => setDraft({ ...draft, argsTemplate: event.target.value })}
              placeholder="-p or --prompt {{prompt}}"
            />
          </label>
          <label>
            Version args
            <input
              value={draft.versionArgs}
              onChange={(event) => setDraft({ ...draft, versionArgs: event.target.value })}
              placeholder="--version"
            />
          </label>
          <button className="primary-btn" onClick={addProvider}>
            <Plus size={16} />
            Add provider
          </button>
        </div>
      </Panel>

      <Panel
        title="Provider Sessions"
        icon={TerminalSquare}
        action={
          <button className="ghost-btn" onClick={onRefreshProviderSessionReport}>
            <RotateCcw size={16} />
            Refresh
          </button>
        }
      >
        {providerSessionReport ? (
          <div className="audit-list">
            <div className="summary-grid doctor-summary">
              <div>
                <span>Status</span>
                <strong>{displayValue(providerSessionReport.status)}</strong>
              </div>
              <div>
                <span>Providers</span>
                <strong>{providerSessionReport.records.length}</strong>
              </div>
              <div>
                <span>Blockers</span>
                <strong>{providerSessionReport.blockers.length}</strong>
              </div>
              <div>
                <span>Warnings</span>
                <strong>{providerSessionReport.warnings.length}</strong>
              </div>
            </div>
            {providerSessionReport.records.map((record) => {
              const auth = asRecord(record.auth);
              const version = asRecord(record.version);
              return (
                <div className="audit-row" key={`provider-session-${record.id}`}>
                  <span className={`status-pill ${record.status === "blocked" ? "failed" : record.status === "ready" ? "ok" : "warning"}`}>
                    {displayValue(record.status)}
                  </span>
                  <strong>
                    {record.name} · {displayValue(record.runMode)} · {displayValue(record.promptMode)}
                  </strong>
                  <p>
                    {record.resolvedCommand || "unresolved"}; auth {displayValue(auth?.status)}; version {displayValue(version?.status)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="helper-text">Run pnpm provider-sessions or Launch Doctor, then refresh this panel.</p>
        )}
      </Panel>

      <div className="provider-grid">
        {state.providers.map((provider) => {
          const diagnostics = providerDiagnostics(provider);
          return (
          <article className="provider-card" key={provider.id}>
            <div className="provider-head">
              <div>
                <strong>{provider.name}</strong>
                <span>{provider.type}</span>
              </div>
              <span className={`status-pill ${provider.health}`}>{provider.health}</span>
            </div>
            <p className="helper-text">
              Diagnostic: {diagnostics.status}
              {diagnostics.missing.length ? `; missing ${diagnostics.missing.join(", ")}` : ""}
              {diagnostics.contractWarnings.length ? `; ${diagnostics.contractWarnings.join("; ")}` : ""}
            </p>
            <div className="field-stack">
              <label>
                Command
                <input
                  value={provider.command}
                  disabled={provider.type === "mock" || provider.type === "local_runner"}
                  onChange={(event) => updateProvider(provider.id, { command: event.target.value })}
                />
              </label>
              <label>
                Args template
                <input
                  value={provider.argsTemplate}
                  disabled={provider.type === "mock" || provider.type === "local_runner"}
                  onChange={(event) => updateProvider(provider.id, { argsTemplate: event.target.value })}
                />
              </label>
              <label>
                Prompt mode
                <select
                  value={provider.promptMode}
                  disabled={provider.type === "mock" || provider.type === "local_runner"}
                  onChange={(event) => updateProvider(provider.id, { promptMode: event.target.value as Provider["promptMode"] })}
                >
                  <option value="stdin">stdin</option>
                  <option value="arg">arg</option>
                  <option value="file">file</option>
                  <option value="terminal">terminal</option>
                </select>
              </label>
              <label>
                Run mode
                <select
                  value={provider.runMode}
                  disabled={provider.type === "mock"}
                  onChange={(event) => updateProvider(provider.id, { runMode: event.target.value as ProviderRunMode })}
                >
                  <option value="mock">mock</option>
                  <option value="real">real</option>
                </select>
              </label>
            </div>
            <div className="stack-row">
              {provider.capabilities.map((capability) => (
                <span key={capability}>{capability}</span>
              ))}
            </div>
            {provider.assignedRoles.length ? (
              <div className="stack-row">
                {provider.assignedRoles.map((role) => (
                  <span key={role}>{role}</span>
                ))}
              </div>
            ) : null}
            <p className="helper-text">{provider.lastTestResult ?? "Not tested yet."}</p>
            {provider.lastContractCheckResult ? (
              <p className="helper-text">
                Contract: {provider.lastContractCheckResult}
                {provider.lastContractCheckAt ? ` at ${provider.lastContractCheckAt}` : ""}
              </p>
            ) : null}
            {contractChecks[provider.id] ? (
              <div className="audit-list compact-list">
                {contractChecks[provider.id].diagnostics.slice(0, 5).map((item, index) => (
                  <div className="audit-row" key={`${provider.id}-contract-${item.subject}-${index}`}>
                    <span className={`status-pill ${item.level === "error" ? "failed" : item.level === "warning" ? "warning" : "ok"}`}>
                      {item.level}
                    </span>
                    <strong>{item.subject}</strong>
                    <p>{item.detail}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {candidates[provider.id]?.length ? (
              <div className="candidate-list">
                {candidates[provider.id].map((candidate) => (
                  <button
                    className="candidate-row"
                    key={`${provider.id}-${candidate.path}`}
                    onClick={() =>
                      updateProvider(provider.id, {
                        command: candidate.path,
                        health: candidate.status,
                        lastTestResult: `Selected ${candidate.path}. ${candidate.versionOutput}`,
                      })
                    }
                  >
                    <span className={`status-pill ${candidate.status}`}>{candidate.status}</span>
                    <strong>{candidate.path}</strong>
                    <small>{candidate.source}</small>
                  </button>
                ))}
              </div>
            ) : candidates[provider.id] ? (
              <p className="helper-text">No CLI candidates found. Paste the exact executable path.</p>
            ) : null}
            <div className="button-row">
              <button className="ghost-btn" onClick={() => detectProvider(provider)} disabled={provider.type === "mock" || provider.type === "local_runner"}>
                <Gauge size={16} />
                Auto-detect
              </button>
              <button className="ghost-btn" onClick={() => testProvider(provider)}>
                <TerminalSquare size={16} />
                Test CLI
              </button>
              <button className="ghost-btn" onClick={() => checkProviderContract(provider)} disabled={provider.type === "mock" || provider.type === "local_runner"}>
                <ListChecks size={16} />
                Check contract
              </button>
              <button className="ghost-btn" onClick={() => updateProvider(provider.id, { enabled: !provider.enabled })}>
                {provider.enabled ? "Disable" : "Enable"}
              </button>
            </div>
          </article>
          );
        })}
      </div>

      <section className="two-column">
        <Panel title="Command Policy" icon={ShieldCheck}>
          <div className="input-row">
            <input value={policyProbe} onChange={(event) => setPolicyProbe(event.target.value)} placeholder="pnpm build" />
            <button className="ghost-btn" onClick={testPolicyProbe}>
              <ShieldCheck size={16} />
              Classify
            </button>
            {policyProbeResult ? <span className={`status-pill ${policyProbeResult}`}>{policyProbeResult}</span> : null}
          </div>
          <div className="policy-columns">
            <PolicyBlock title="Allow" items={state.commandPolicy.allow} />
            <PolicyBlock title="Approval" items={state.commandPolicy.approvalRequired} />
            <PolicyBlock title="Deny" items={state.commandPolicy.deny} />
          </div>
        </Panel>
        <Panel title="Audit & Cost Events" icon={History}>
          <div className="audit-list">
            {audit.slice(0, 8).map((event) => (
              <div className="audit-row" key={event.id}>
                <span>{event.time}</span>
                <strong>{event.actor}</strong>
                <p>
                  {event.action}: {event.result}
                </p>
              </div>
            ))}
          </div>
          <div className="cost-list">
            {costs.slice(0, 5).map((event) => (
              <span key={event.id}>
                {event.agent} ${event.amount.toFixed(2)} {event.confidence}
              </span>
            ))}
          </div>
        </Panel>
      </section>
    </section>
  );
}

function PolicyBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="policy-block">
      <strong>{title}</strong>
      {items.slice(0, 8).map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: typeof Home;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <Icon size={18} />
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({ icon: Icon, label, value, hint }: { icon: typeof Home; label: string; value: string; hint: string }) {
  return (
    <article className="metric-card">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  );
}

function RiskPill({ risk }: { risk: RiskLevel }) {
  return <span className={`risk-pill ${risk}`}>{risk} risk</span>;
}

function commandApprovalRisk(command: string): RiskLevel {
  const lowered = command.toLowerCase();
  if (["reset", "clean", "sudo", "publish", "deploy", "terraform", "kubectl", "migration"].some((item) => lowered.includes(item))) {
    return "critical";
  }
  if (["push", "ssh", "scp", "curl", "wget", "docker"].some((item) => lowered.includes(item))) {
    return "high";
  }
  return "medium";
}

function pageTitle(view: View) {
  const item = navItems.find((nav) => nav.id === view);
  return item?.label ?? "Dildin Build Control";
}

const roleCapabilityRequirements: Record<string, string[]> = {
  lead: ["plan", "structured_output"],
  architect: ["review_diff", "structured_output"],
  developer: ["write_code", "structured_output"],
  devops: ["run_build", "run_tests"],
  qa: ["run_tests", "analyze_logs"],
  reviewer: ["review_diff", "structured_output"],
  security: ["security_review", "structured_output"],
  product: ["plan", "structured_output"],
};

function currentTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function lines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function latestContractForTask(
  taskId: string,
  contracts: HarnessOverview["contracts"],
  statuses?: string[],
) {
  return contracts
    .filter((contract) => contract.taskId === taskId && (!statuses || statuses.includes(contract.status)))
    .sort((left, right) => Number(right.createdAt) - Number(left.createdAt))[0];
}

function latestSliceForTask(taskId: string, slices: HarnessOverview["slices"], statuses?: string[]) {
  return slices
    .filter((slice) => slice.taskId === taskId && (!statuses || statuses.includes(slice.status)))
    .sort((left, right) => Number(right.createdAt) - Number(left.createdAt))[0];
}

function buildHarnessApprovalGates(overview: HarnessOverview) {
  const approvedContracts = overview.contracts.filter((contract) => contract.status === "approved").length;
  const waitingContracts = overview.contracts.filter((contract) => contract.status === "waiting_approval" || contract.status === "frozen").length;
  const approvedSlices = overview.slices.filter((slice) => slice.status === "approved").length;
  const waitingSlices = overview.slices.filter((slice) => slice.status === "waiting_approval" || slice.status === "proposed").length;
  const runningRuns = overview.runs.filter((run) => run.status === "slice_running").length;
  const evidenceReady = overview.runs.filter((run) => run.status === "evidence_ready" || run.status === "accepted").length;
  const finalizedPacks = overview.evidencePacks.filter((pack) => pack.finalDecision || pack.status === "finalized").length;

  return [
    {
      id: "spec",
      label: "Spec approval",
      status: approvedContracts ? "approved" : waitingContracts ? "waiting_approval" : "missing",
      detail: `${approvedContracts} approved contract(s), ${waitingContracts} waiting contract(s).`,
    },
    {
      id: "plan",
      label: "Plan approval",
      status: overview.runs.length ? "ready" : approvedContracts ? "waiting_approval" : "missing",
      detail: overview.runs.length ? `${overview.runs.length} HarnessRun record(s) exist.` : "Plan gate becomes ready after an approved contract is selected.",
    },
    {
      id: "slice",
      label: "WorkSlice approval",
      status: approvedSlices ? "approved" : waitingSlices ? "waiting_approval" : "missing",
      detail: `${approvedSlices} approved slice(s), ${waitingSlices} waiting slice(s).`,
    },
    {
      id: "real-provider",
      label: "Real provider approval",
      status: "blocked",
      detail: "Harness v0.2 compatibility wrapper does not auto-run real Codex/Claude providers; existing operator gates remain required.",
    },
    {
      id: "command",
      label: "Command approval",
      status: runningRuns ? "waiting_approval" : "ready",
      detail: runningRuns ? `${runningRuns} run(s) may still hit command policy gates.` : "Local commands only run when explicitly listed in WorkSlice.commandsAllowed.",
    },
    {
      id: "evidence",
      label: "Evidence acceptance",
      status: finalizedPacks ? "approved" : evidenceReady ? "waiting_approval" : "missing",
      detail: `${overview.evidencePacks.length} EvidencePack manifest(s), ${finalizedPacks} finalized decision(s).`,
    },
  ];
}

function taskIdFromTitle(title: string) {
  const slug = title
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return `TASK-${slug || "ITEM"}-${Date.now().toString(36).toUpperCase()}`;
}

function createSmokeTestTask(): Task {
  return {
    id: "SMOKE-LOOP-README",
    title: "Smoke test: README evidence marker",
    brief:
      "Run a tiny end-to-end DBC loop on a safe documentation change. Codex may update README.md with a short DBC smoke-loop evidence marker; review and QA must verify the diff, build output, loop manifest, and evidence files.",
    criteria: [
      "README.md contains a short DBC smoke-loop evidence marker or confirms the existing marker is current.",
      "The loop produces a manifest in .dbc/loops and step evidence in .dbc/evidence.",
      "The build step records a successful pnpm build result.",
      "Reviewer and Product Owner reports include a pass/request_changes verdict with concrete evidence.",
    ],
    constraints: [
      "Only README.md and generated .dbc artifacts should change.",
      "Do not install dependencies, publish packages, push git changes, or read secrets.",
      "Use official CLI/API/terminal surfaces only.",
      "Stop and request human approval if a command touches files outside the workspace.",
    ],
    budgetLimit: 1,
    risk: "low",
    priority: "normal",
    loopProfile: "controlled_smoke",
    providerStrategy: "mock_only",
    affectedPaths: ["README.md", ".dbc/tasks", ".dbc/loops", ".dbc/evidence", ".dbc/artifacts"],
    allowedPaths: ["README.md", ".dbc/tasks", ".dbc/loops", ".dbc/evidence", ".dbc/artifacts", ".dbc/reports", ".dbc/security", ".dbc/git"],
    deniedPaths: [".env", "node_modules", "src-tauri/target"],
    requiredReviewers: ["Reviewer", "QA", "Security", "Product Owner"],
    stopConditions: [
      "Stop if a command touches files outside README.md or .dbc.",
      "Stop if command policy returns approval_required or deny.",
      "Stop if acceptance evidence is missing.",
    ],
    status: "ready",
  };
}

function upsertTask(tasks: Task[], task: Task, placeFirst = false) {
  const exists = tasks.some((item) => item.id === task.id);
  if (!exists) return placeFirst ? [task, ...tasks] : [...tasks, task];
  const updated = tasks.map((item) => (item.id === task.id ? { ...item, ...task } : item));
  if (!placeFirst) return updated;
  return [task, ...updated.filter((item) => item.id !== task.id)];
}

function mergeTasks(existing: Task[], recovered: Task[]) {
  if (!recovered.length) return existing;
  const recoveredIds = new Set(recovered.map((task) => task.id));
  return [...recovered, ...existing.filter((task) => !recoveredIds.has(task.id))];
}

function mergeMemory(existing: AppState["memory"], recovered: AppState["memory"]) {
  if (!recovered.length) return existing;
  const recoveredIds = new Set(recovered.map((note) => note.id));
  return [...recovered, ...existing.filter((note) => !recoveredIds.has(note.id))];
}

type PreflightGate = { level: "ok" | "warning" | "error"; subject: string; detail: string };

function buildLoopPreflight({
  state,
  activeProject,
  task,
  steps,
  operatorChecklist,
}: {
  state: AppState;
  activeProject?: AppState["projects"][number];
  task?: Task;
  steps: LoopStep[];
  operatorChecklist?: OperatorChecklistResult | null;
}): PreflightGate[] {
  const gates: PreflightGate[] = [];
  const hasRealCli = steps.some((step) => step.providerType === "cli" && step.providerRunMode === "real");
  const hasLocalRunner = steps.some((step) => step.providerType === "local_runner");

  gates.push(
    activeProject?.path
      ? { level: "ok", subject: "project", detail: activeProject.path }
      : { level: "error", subject: "project", detail: "No active project selected." },
  );
  gates.push(
    task?.title?.trim() && task.brief.trim()
      ? { level: "ok", subject: "task", detail: `${task.id}: ${task.title}` }
      : { level: "error", subject: "task", detail: "Task title and brief are required before a loop can run." },
  );
  gates.push(
    task?.criteria?.length
      ? { level: "ok", subject: "acceptance", detail: `${task.criteria.length} acceptance criteria configured.` }
      : { level: "warning", subject: "acceptance", detail: "No acceptance criteria configured; Product Owner review will be weak." },
  );
  gates.push(
    task?.allowedPaths?.length || task?.affectedPaths?.length
      ? {
          level: "ok",
          subject: "path scope",
          detail: `${(task.allowedPaths?.length ? task.allowedPaths : task.affectedPaths ?? []).length} allowed/affected path(s); ${task.deniedPaths?.length ?? 0} denied path(s).`,
        }
      : { level: "warning", subject: "path scope", detail: "No allowed or affected paths configured; provider scope is broad." },
  );
  gates.push(
    task?.stopConditions?.length
      ? { level: "ok", subject: "stop conditions", detail: `${task.stopConditions.length} stop condition(s) configured.` }
      : { level: "warning", subject: "stop conditions", detail: "No task stop conditions configured." },
  );
  gates.push(...buildTaskProviderStrategyGates(task, steps));
  gates.push(
    task?.specPath && task.specChecksum
      ? { level: "ok", subject: "task spec", detail: `${task.specPath}#${task.specChecksum}` }
      : { level: "warning", subject: "task spec", detail: "Task spec will be written before loop start." },
  );
  gates.push(
    isTauriRuntime()
      ? { level: "ok", subject: "runtime", detail: "Desktop runtime can write .dbc files and spawn approved local commands." }
      : hasRealCli || hasLocalRunner
        ? { level: "error", subject: "runtime", detail: "Real/local execution requires the Tauri desktop runtime." }
        : { level: "warning", subject: "runtime", detail: "Browser preview can only run mock provider flow." },
  );

  if (hasRealCli) {
    const realCliSteps = steps.filter((step) => step.providerType === "cli" && step.providerRunMode === "real").length;
    const budgetLimit = task?.budgetLimit ?? 0;
    const providerCallLimit = budgetLimit > 0 ? Math.max(1, Math.ceil(budgetLimit)) * 4 : 0;
    gates.push(
      budgetLimit > 0
        ? {
            level: providerCallLimit < realCliSteps ? "warning" : "ok",
            subject: "provider budget",
            detail: `budgetLimit ${budgetLimit} allows ${providerCallLimit} real CLI call(s); configured real CLI steps: ${realCliSteps}.`,
          }
        : {
            level: "error",
            subject: "provider budget",
            detail: "Real CLI loops require a positive task budgetLimit.",
          },
    );
    const checklistReady =
      operatorChecklist &&
      operatorChecklist.blockers === 0 &&
      operatorChecklist.approvalStatus === "approved" &&
      ["ready_to_start_real_micro", "real_profile_already_active"].includes(operatorChecklist.status);
    gates.push(
      checklistReady
        ? {
            level: operatorChecklist.warnings ? "warning" : "ok",
            subject: "operator checklist",
            detail: `${operatorChecklist.status}; ${operatorChecklist.warnings} warning(s); ${operatorChecklist.markdownPath}`,
          }
        : {
            level: "error",
            subject: "operator checklist",
            detail: "Generate and review Operator Checklist before starting a real CLI loop.",
          },
    );
  } else {
    gates.push({
      level: "ok",
      subject: "operator checklist",
      detail: "Not required for mock-only provider loops.",
    });
  }

  const routing = buildProviderRoutingDiagnostics(state.agents, state.providers);
  gates.push(
    ...routing.map((item) => ({
      level: item.level,
      subject: `route: ${item.subject}`,
      detail: item.detail,
    })),
  );

  const buildCommands = state.agents.flatMap((agent) => agent.localCommands ?? []);
  gates.push(
    buildCommands.length
      ? { level: "ok", subject: "build/test", detail: `Local checks configured: ${buildCommands.join(", ")}` }
      : { level: "warning", subject: "build/test", detail: "No local build/test commands configured." },
  );

  const secretFindings = scanClientSecretLikeText([
    task?.title ?? "",
    task?.brief ?? "",
    ...(task?.criteria ?? []),
    ...(task?.constraints ?? []),
    ...(task?.allowedPaths ?? []),
    ...(task?.deniedPaths ?? []),
    ...(task?.stopConditions ?? []),
    ...state.memory.map((note) => note.body),
  ].join("\n"));
  gates.push(
    secretFindings.length
      ? { level: "error", subject: "security", detail: `${secretFindings.length} secret-like finding(s) detected in task or memory text.` }
      : { level: "ok", subject: "security", detail: "No secret-like prompt content detected in task or memory text." },
  );

  gates.push({
    level: "ok",
    subject: "git safety",
    detail: "Baseline, diff evidence, commit proposal, security report, manifest, and acceptance package will be written under .dbc.",
  });

  return gates;
}

function buildTaskProviderStrategyGates(task: Task | undefined, steps: LoopStep[]): PreflightGate[] {
  if (!task) return [];
  const strict = task.loopProfile === "real_micro";
  const levelForMismatch: PreflightGate["level"] = strict ? "error" : "warning";
  const gates: PreflightGate[] = [];
  const stepProvider = (id: string) => steps.find((step) => step.id === id)?.providerId ?? "";
  const realCliSteps = steps.filter((step) => step.providerType === "cli" && step.providerRunMode === "real");

  if (task.providerStrategy === "mock_only") {
    gates.push(
      realCliSteps.length
        ? {
            level: "error",
            subject: "provider strategy",
            detail: `mock_only task has ${realCliSteps.length} real CLI step(s): ${realCliSteps.map((step) => step.id).join(", ")}.`,
          }
        : { level: "ok", subject: "provider strategy", detail: "mock_only strategy has no real CLI provider steps." },
    );
    return gates;
  }

  if (task.providerStrategy === "codex_only") {
    const nonCodex = steps.filter((step) => step.providerType === "cli" && step.providerId !== "codex_cli");
    gates.push(
      nonCodex.length
        ? {
            level: levelForMismatch,
            subject: "provider strategy",
            detail: `codex_only expects Codex for CLI steps; mismatches: ${nonCodex.map((step) => `${step.id}:${step.providerId}`).join(", ")}.`,
          }
        : { level: "ok", subject: "provider strategy", detail: "codex_only route is coherent for configured CLI steps." },
    );
    return gates;
  }

  if (task.providerStrategy === "claude_review_only") {
    const writeSteps = steps.filter((step) => ["plan", "code", "accept"].includes(step.id) && step.providerId === "claude_code");
    gates.push(
      writeSteps.length
        ? {
            level: "warning",
            subject: "provider strategy",
            detail: `claude_review_only is intended for review/security; write-like steps routed to Claude: ${writeSteps.map((step) => step.id).join(", ")}.`,
          }
        : { level: "ok", subject: "provider strategy", detail: "Claude is reserved for review/security style routing." },
    );
    return gates;
  }

  const expected: Record<string, string> = {
    plan: "codex_cli",
    code: "codex_cli",
    build: "local_terminal",
    test: "claude_code",
    review: "claude_code",
    security: "claude_code",
    accept: "codex_cli",
  };
  const mismatches = Object.entries(expected).filter(([stepId, providerId]) => stepProvider(stepId) !== providerId);
  gates.push(
    mismatches.length
      ? {
          level: levelForMismatch,
          subject: "provider strategy",
          detail: `codex_build_claude_review mismatch: ${mismatches.map(([stepId, providerId]) => `${stepId}->${stepProvider(stepId) || "missing"} expected ${providerId}`).join("; ")}.`,
        }
      : { level: "ok", subject: "provider strategy", detail: "Codex build + Claude review routing matches the task strategy." },
  );
  if (task.loopProfile === "real_micro") {
    gates.push(
      realCliSteps.length
        ? { level: "ok", subject: "loop profile", detail: `real_micro has ${realCliSteps.length} real CLI step(s) configured.` }
        : { level: "warning", subject: "loop profile", detail: "real_micro task is still routed through mock CLI providers." },
    );
  }
  return gates;
}

function scanClientSecretLikeText(text: string) {
  const patterns = [
    "openai_api_key",
    "anthropic_api_key",
    "aws_secret_access_key",
    "authorization: bearer",
    "api_key=",
    "api-key:",
    "access_token=",
    "refresh_token=",
    "token=",
    "password=",
    "private_key=",
    "-----begin",
    "sk-",
    "ghp_",
    "github_pat_",
    "xoxb-",
  ];
  const findings: string[] = [];
  text.split("\n").forEach((line, index) => {
    const lowered = line.toLowerCase();
    patterns.forEach((pattern) => {
      if (lowered.includes(pattern)) findings.push(`${pattern}@${index + 1}`);
    });
  });
  return findings;
}

function buildSmokeReadiness({
  activeProject,
  agents,
  providers,
}: {
  activeProject?: AppState["projects"][number];
  agents: AgentRole[];
  providers: Provider[];
}) {
  const checks: Array<{ level: "ok" | "warning" | "error"; subject: string; detail: string }> = [];
  const developer = agents.find((agent) => agent.id === "developer");
  const reviewer = agents.find((agent) => agent.id === "reviewer");
  const devops = agents.find((agent) => agent.id === "devops");
  const developerProvider = selectProviderForAgent(developer, providers).provider;
  const reviewerProvider = selectProviderForAgent(reviewer, providers).provider;
  const buildCommands = agents.flatMap((agent) => agent.localCommands ?? []);

  checks.push(
    activeProject?.path
      ? { level: "ok", subject: "project", detail: activeProject.path }
      : { level: "error", subject: "project", detail: "No active project path is selected." },
  );
  checks.push(
    buildCommands.some((command) => command.includes("pnpm build") || command.includes("npm run build"))
      ? { level: "ok", subject: "build", detail: `Build command configured: ${buildCommands.join(", ")}` }
      : { level: "warning", subject: "build", detail: "Add pnpm build or npm run build to a QA/DevOps local command." },
  );
  checks.push(providerSmokeCheck("developer", developerProvider));
  checks.push(providerSmokeCheck("reviewer", reviewerProvider));
  checks.push(
    devops?.providerId
      ? { level: "ok", subject: "devops", detail: `${devops.role} uses ${devops.provider}.` }
      : { level: "warning", subject: "devops", detail: "DevOps role is not mapped to a local runner." },
  );

  return checks;
}

function providerSmokeCheck(subject: string, provider?: Provider) {
  if (!provider) {
    return { level: "error" as const, subject, detail: "No provider is assigned." };
  }
  if (!provider.enabled) {
    return { level: "error" as const, subject, detail: `${provider.name} is disabled.` };
  }
  if (provider.type === "mock") {
    return { level: "warning" as const, subject, detail: `${provider.name} is still mock; switch to a real CLI for a real smoke loop.` };
  }
  if (provider.type === "cli") {
    const command = provider.command.trim();
    const looksExact = command.startsWith("/") || /^[A-Za-z]:[\\/]/.test(command) || command.includes("/") || command.includes("\\");
    if (!looksExact) {
      return { level: "warning" as const, subject, detail: `${provider.name} uses PATH command "${command}"; exact path is safer across Mac/Win.` };
    }
    if (provider.runMode !== "real") {
      return { level: "warning" as const, subject, detail: `${provider.name} path is set, but run mode is ${provider.runMode}.` };
    }
    return { level: "ok" as const, subject, detail: `${provider.name} will run through ${command}.` };
  }
  return { level: "ok" as const, subject, detail: `${provider.name} is available as ${provider.type}.` };
}

function buildProviderRoutingDiagnostics(agents: AgentRole[], providers: Provider[]) {
  return loopTemplate.map((step) => {
    const agent = agents.find((item) => item.id === step.roleId);
    const route = selectProviderForAgent(agent, providers);
    const provider = route.provider;
    const subject = agent?.role ?? step.agent;
    if (!agent) {
      return { level: "error" as const, subject, detail: "Role is missing from AI Team configuration." };
    }
    if (!provider) {
      return { level: "error" as const, subject, detail: "No enabled primary or fallback provider is available." };
    }
    const prefix = route.source === "fallback" ? `Fallback ${provider.name}` : `Primary ${provider.name}`;
    const contractWarnings = provider.type === "cli" ? providerContractDiagnostics(provider) : [];
    if (provider.type === "cli" && provider.runMode === "real") {
      if (!provider.command.trim()) {
        return { level: "error" as const, subject, detail: `${prefix} is real CLI but command is empty.` };
      }
      if (!isExactCommandPath(provider.command)) {
        return { level: "error" as const, subject, detail: `${prefix} is real CLI but command is not an exact path: ${provider.command}` };
      }
      if (provider.health === "failed") {
        return { level: "error" as const, subject, detail: `${prefix} health check failed.` };
      }
      if (contractWarnings.length) {
        return { level: "warning" as const, subject, detail: `${prefix} contract warning: ${contractWarnings.join("; ")}` };
      }
      if (provider.health === "unknown") {
        return { level: "warning" as const, subject, detail: `${prefix} has exact path but has not been tested yet.` };
      }
      return { level: "ok" as const, subject, detail: `${prefix} ready for real CLI execution.` };
    }
    if (provider.type === "local_runner") {
      return { level: "ok" as const, subject, detail: `${prefix} will run local commands through DBC policy.` };
    }
    if (route.source === "fallback") {
      return { level: "warning" as const, subject, detail: `${prefix} selected because primary provider is unavailable.` };
    }
    return { level: "ok" as const, subject, detail: `${prefix} selected in ${provider.runMode} mode.` };
  });
}

function selectProviderForAgent(agent: AgentRole | undefined, providers: Provider[]) {
  if (!agent) return { provider: undefined, source: "missing" as const };
  const ids = [agent.providerId, ...agent.fallbackProviderIds.filter((id) => id !== agent.providerId)];
  for (const [index, id] of ids.entries()) {
    const provider = providers.find((item) => item.id === id);
    if (provider && isProviderRouteUsable(provider)) {
      return { provider, source: index === 0 ? ("primary" as const) : ("fallback" as const) };
    }
  }
  return { provider: undefined, source: "missing" as const };
}

function isProviderRouteUsable(provider: Provider) {
  if (!provider.enabled || provider.health === "failed") return false;
  if (provider.type === "cli") return Boolean(provider.command.trim());
  return true;
}

function isExactCommandPath(command: string) {
  const trimmed = command.trim();
  return trimmed.startsWith("/") || /^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.includes("/") || trimmed.includes("\\");
}

function isRealStep(step: LoopStep) {
  return step.providerRunMode === "real" || step.providerType === "local_runner";
}

function providerDiagnostics(provider: Provider) {
  const required = Array.from(
    new Set(provider.assignedRoles.flatMap((role) => roleCapabilityRequirements[role] ?? ["structured_output"])),
  );
  const missing = required.filter((capability) => !provider.capabilities.includes(capability));
  const contractWarnings = providerContractDiagnostics(provider);
  return {
    required,
    missing,
    contractWarnings,
    status: !provider.enabled ? "disabled" : missing.length ? "capability gap" : contractWarnings.length ? "contract warning" : "role fit",
  };
}

function detectStack(path: string) {
  const lower = path.toLowerCase();
  if (lower.includes("tauri")) return ["Tauri", "React", "Rust"];
  if (lower.includes("python")) return ["Python", "Pytest"];
  if (lower.includes("node") || lower.includes("react")) return ["Node", "React"];
  return ["Git", "Local Project"];
}

function buildConfiguredLoopSteps(agents: AgentRole[], providers: Provider[]) {
  return loopTemplate.map((step) => {
    const agent = agents.find((item) => item.id === step.roleId);
    const provider = selectProviderForAgent(agent, providers).provider ?? providers.find((item) => item.id === step.providerId);
    const normalizedProvider = provider ? normalizeProviderConfig(provider) : undefined;
    return {
      ...step,
      providerId: normalizedProvider?.id ?? agent?.providerId ?? step.providerId,
      providerType: normalizedProvider?.type ?? "mock",
      providerCommand: normalizedProvider?.command ?? "",
      providerArgsTemplate: normalizedProvider?.argsTemplate ?? "",
      providerPromptMode: normalizedProvider?.promptMode ?? "stdin",
      providerRunMode: normalizedProvider?.runMode ?? "mock",
      agentMode: agent?.mode ?? "read_only",
      localCommands: agent?.localCommands ?? [],
      timeoutSeconds: normalizedProvider?.timeoutSeconds ?? 900,
      maxOutputBytes: normalizedProvider?.maxOutputBytes ?? 200000,
      maxAttempts: 3,
      status: "waiting" as const,
      output: undefined,
      evidence: step.evidence,
    };
  });
}

function buildStepPrompt({ step, agent, task }: { step: AppState["loopSteps"][number]; agent: AgentRole; task?: Task }) {
  const allowedPaths = task?.allowedPaths?.length ? task.allowedPaths : task?.affectedPaths ?? [];
  return [
    `DBC role: ${agent.role}`,
    `Mode: ${agent.mode}`,
    `Step: ${step.state}`,
    "",
    "Task:",
    task ? `${task.id} - ${task.title}\n${task.brief}` : "No active task.",
    "",
    "Acceptance criteria:",
    ...(task?.criteria ?? ["No criteria"]).map((item) => `- ${item}`),
    "",
    "Scope:",
    `- Priority: ${task?.priority ?? "normal"}`,
    `- Loop profile: ${task?.loopProfile ?? "mock"}`,
    `- Provider strategy: ${task?.providerStrategy ?? "mock_only"}`,
    ...(allowedPaths.length ? ["- Allowed paths:", ...allowedPaths.map((item) => `  - ${item}`)] : ["- Allowed paths: not configured"]),
    ...(task?.deniedPaths?.length ? ["- Denied paths:", ...task.deniedPaths.map((item) => `  - ${item}`)] : ["- Denied paths: not configured"]),
    ...(task?.stopConditions?.length ? ["- Stop conditions:", ...task.stopConditions.map((item) => `  - ${item}`)] : ["- Stop conditions: not configured"]),
    "",
    "Required output:",
    "Use the DBC role output contract. Include verdict, evidence, risks, and next action.",
  ].join("\n");
}

function syncAssignedRoles(providers: Provider[], agents: AgentRole[]) {
  return agents.map((agent) => {
    const provider = providers.find((item) => item.id === agent.providerId);
    return {
      ...agent,
      provider: provider?.name ?? agent.provider,
      model: provider?.type === "mock" ? "mock" : provider?.command || agent.model,
    };
  });
}

function syncProvidersWithAgents(providers: Provider[], agents: AgentRole[]) {
  return providers.map((provider) => ({
    ...provider,
    assignedRoles: agents.filter((agent) => agent.providerId === provider.id).map((agent) => agent.id),
  }));
}
