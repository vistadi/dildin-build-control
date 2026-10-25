import assert from "node:assert/strict";
import { loopContinuation, continuePreviewLoop, recoverLoopApproval, operatorRunStatus, retryConfirmationKey } from "../src/loopLifecycle.ts";

const base = { id: "fixture", status: "stopped", activeStepIndex: 0,
  steps: [{ id: "step", status: "running", attemptCount: 0, maxAttempts: 3, output: "prior evidence" }] };
let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
check("Resume continues queued work without clearing evidence", () => {
  assert.equal(loopContinuation(base).action, "resume");
  assert.equal(continuePreviewLoop(base, false).steps[0].output, "prior evidence");
  assert.equal(base.status, "stopped");
});
check("Stop pending blocks all continuations", () => {
  const run = { ...base, status: "stopping" };
  assert.equal(loopContinuation(run).action, null);
  assert.throws(() => continuePreviewLoop(run, false));
  assert.throws(() => continuePreviewLoop(run, true));
});
check("Interrupted attempts require explicit Retry", () => {
  const run = { ...base, status: "interrupted", steps: [{ ...base.steps[0], status: "interrupted", attemptCount: 1 }] };
  assert.equal(loopContinuation(run).action, "retry");
  assert.throws(() => continuePreviewLoop(run, false));
  assert.equal(continuePreviewLoop(run, true).steps[0].attemptCount, 1);
});
check("Approval cannot be bypassed", () => {
  const run = { ...base, steps: [{ ...base.steps[0], status: "approval_required", requiresApproval: true }] };
  assert.equal(loopContinuation(run).action, null);
  assert.throws(() => continuePreviewLoop(run, true));
});
check("Retry budget cannot be reset via Resume", () => {
  const run = { ...base, steps: [{ ...base.steps[0], status: "failed", attemptCount: 3 }] };
  assert.equal(loopContinuation(run).action, null);
  assert.throws(() => continuePreviewLoop(run, false));
  assert.throws(() => continuePreviewLoop(run, true));
});
check("Completed work is finalized, not replayed", () => {
  const run = { ...base, steps: [{ ...base.steps[0], status: "passed", attemptCount: 3 }] };
  assert.equal(continuePreviewLoop(run, false).status, "completed");
  assert.throws(() => continuePreviewLoop(run, true));
});
check("Missing step fails closed", () => assert.equal(loopContinuation({ ...base, steps: [] }).action, null));
check("Running run cannot be retried", () => assert.throws(() => continuePreviewLoop({ ...base, status: "running" }, true)));
check("Restored approval is visible and not duplicated", () => {
  const run = { ...base, steps: [{ ...base.steps[0], status: "approval_required", requiresApproval: true }] };
  const approvals = recoverLoopApproval(run, []);
  assert.equal(approvals[0].status, "pending");
  assert.equal(recoverLoopApproval(run, approvals).length, 1);
  assert.equal(recoverLoopApproval(run, [{ ...approvals[0], status: "approved" }])[0].status, "pending");
});
check("Operator status preserves every loop state and prefers the selected loop", () => {
  for (const status of ["running", "stopping", "stopped", "interrupted", "completed", "failed", "blocked"]) {
    assert.equal(operatorRunStatus({ status }, { status: "slice_running" }), status);
  }
  for (const status of ["draft", "waiting_approval", "slice_running", "evidence_ready", "accepted", "rejected", "blocked"]) {
    assert.equal(operatorRunStatus(null, { status }), status);
  }
  assert.equal(operatorRunStatus(null), "waiting");
});
check("Retry confirmation is bound to run, project, step, status and attempt budget", () => {
  const run = { ...base, projectPath: "/qa", status: "interrupted", steps: [{ ...base.steps[0], status: "interrupted", attemptCount: 1 }] };
  const key = retryConfirmationKey(run);
  assert.ok(key);
  assert.equal(retryConfirmationKey(structuredClone(run)), key);
  for (const changed of [{ ...run, id: "other" }, { ...run, projectPath: "/other" }, { ...run, status: "failed" },
    ...[{ id: "other-step" }, { status: "failed" }, { attemptCount: 2 }, { maxAttempts: 4 }].map(change =>
      ({ ...run, steps: [{ ...run.steps[0], ...change }] }))]) {
    assert.notEqual(retryConfirmationKey(changed), key);
  }
  for (const changed of [{ ...run, status: "running" }, { ...run, status: "stopping" },
    { ...run, steps: [{ ...run.steps[0], requiresApproval: true }] },
    { ...run, steps: [{ ...run.steps[0], attemptCount: 3 }] }]) {
    assert.equal(retryConfirmationKey(changed), null);
  }
});
console.log(`Loop lifecycle smoke passed (${checks} behavioral scenarios).`);
