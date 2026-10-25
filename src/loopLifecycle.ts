import type { ApprovalRequest, HarnessRun, LoopRunSnapshot } from "./types";

export function operatorRunStatus(loop: Pick<LoopRunSnapshot, "status"> | null, harness?: Pick<HarnessRun, "status">): string {
  return loop?.status ?? harness?.status ?? "waiting";
}

// Confirmation is valid only for the exact retryable attempt the operator inspected.
export function retryConfirmationKey(run: LoopRunSnapshot): string | null {
  if (loopContinuation(run).action !== "retry") return null;
  const step = run.steps[run.activeStepIndex];
  return JSON.stringify([run.id, run.projectPath, run.status, run.activeStepIndex,
    step.id, step.status, step.attemptCount ?? 0, step.maxAttempts ?? 3]);
}

export function recoverLoopApproval(run: LoopRunSnapshot, approvals: ApprovalRequest[]): ApprovalRequest[] {
  const step = run.steps[run.activeStepIndex];
  if (!step?.requiresApproval || step.status !== "approval_required") return approvals;
  const id = `APP-${run.id}-${step.id}`;
  const existing = approvals.find(item => item.id === id);
  if (existing?.status === "pending") return approvals;
  return [{ id, kind: "backend_step", loopId: run.id, stepId: step.id,
    action: `Resume ${step.state}`, reason: "This persisted step requires human approval before continuing.",
    requester: step.agent, risk: "high", command: step.localCommands?.join("\n") ?? "",
    preview: step.output || "Approval required by CLI or command policy.", artifactPath: step.artifactPath,
    createdAt: new Date().toISOString(), status: "pending" }, ...approvals.filter(item => item.id !== id)];
}

export function loopContinuation(run: LoopRunSnapshot): { action: "resume" | "retry" | null; reason: string } {
  if (run.status === "stopping") return { action: null, reason: "Waiting for execution and evidence to settle. Stop does not roll back changes." };
  if (run.status === "running" || run.status === "completed") return { action: null, reason: "" };
  const step = run.steps[run.activeStepIndex];
  if (!step) return { action: null, reason: "No active step is available. Reload this run." };
  if (run.status === "blocked" || step.requiresApproval || step.status === "approval_required") {
    return { action: null, reason: "Resolve the pending approval before continuing." };
  }
  if (step.status === "passed") return { action: "resume", reason: "Finalize this run without replaying completed work." };
  if ((step.attemptCount ?? 0) >= (step.maxAttempts ?? 3)) return { action: null, reason: "Attempt limit reached. Review the evidence before starting a new run." };
  if (step.status === "waiting" || step.status === "running") return { action: "resume", reason: "Continue the queued step. Completed steps will not be repeated." };
  return { action: "retry", reason: run.status === "interrupted"
    ? "The previous session ended. Inspect workspace changes and external processes before retrying. No work was automatically restarted."
    : "Review partial evidence and workspace changes. Retry starts a new attempt and may repeat side effects." };
}

export function continuePreviewLoop(run: LoopRunSnapshot, retry: boolean): LoopRunSnapshot {
  const next = loopContinuation(run);
  if (next.action !== (retry ? "retry" : "resume")) throw new Error(next.reason || "This run cannot be continued.");
  const completed = run.steps[run.activeStepIndex].status === "passed";
  return { ...run, status: completed ? "completed" : "running", steps: run.steps.map((step, index) =>
    index === run.activeStepIndex && !completed ? { ...step, status: "running" } : step) };
}
