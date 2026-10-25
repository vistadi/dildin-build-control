import assert from "node:assert/strict";
import { loopContinuation, continuePreviewLoop, recoverLoopApproval } from "../src/loopLifecycle.ts";

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
console.log(`Loop lifecycle smoke passed (${checks} behavioral scenarios).`);
