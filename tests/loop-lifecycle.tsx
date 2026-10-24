// Deterministic interaction fixture for the actual controls. No native calls.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { LoopLifecycleControls } from "../src/components/LoopLifecycleControls";
import { continuePreviewLoop } from "../src/loopLifecycle";
import type { LoopRunSnapshot } from "../src/types";
import "../src/styles.css";

const initial: LoopRunSnapshot = {
  id: "qa-run", projectId: "qa", projectPath: "", taskId: "qa", taskTitle: "Lifecycle fixture",
  taskBrief: "", taskCriteria: [], taskConstraints: [], taskBudgetLimit: 0, taskSpecPath: "",
  taskSpecChecksum: "", memoryContext: "", memoryRefs: [], status: "running", activeStepIndex: 0,
  artifactDir: "", manifestPath: "", reportJsonPath: "", reportMarkdownPath: "", gitBaselinePath: "",
  commitProposalPath: "", securityReportPath: "", steps: [{ id: "qa-step", state: "planned", agent: "mock",
    roleId: "qa", providerId: "qa", summary: "", evidence: "Retained partial evidence", status: "running", attemptCount: 0, maxAttempts: 3 }],
};
function Fixture() {
  const [run, setRun] = useState(initial);
  const [busy, setBusy] = useState<"stop" | "resume" | "retry" | null>(null);
  const [error, setError] = useState("");
  const [calls, setCalls] = useState(0);
  return <main className="content view-stack"><h1>Run lifecycle QA</h1><p>Preview fixture. No provider or local process is running.</p>
    <LoopLifecycleControls run={run} busy={busy} error={error}
      onStop={() => { setBusy("stop"); setRun({ ...run, status: "stopping" }); setCalls(calls + 1); }}
      onResume={() => setRun(continuePreviewLoop(run, false))}
      onRetry={() => setRun(continuePreviewLoop(run, true))} />
    <p>Stop requests: {calls}</p>
    <div className="button-row">
      <button className="ghost-btn" onClick={() => { setBusy(null); setError(""); setRun({ ...run, status: "stopped" }); }}>Settle stop</button>
      <button className="ghost-btn" onClick={() => { setBusy(null); setError(""); setRun({ ...initial, status: "interrupted", steps: [{ ...initial.steps[0], status: "interrupted", attemptCount: 1 }] }); }}>Interrupted fixture</button>
      <button className="ghost-btn" onClick={() => { setBusy(null); setError("Stop could not be confirmed. Resume and Retry remain disabled."); setRun({ ...run, status: "stopping" }); }}>Stop error fixture</button>
      <button className="ghost-btn" onClick={() => { setBusy(null); setError(""); setRun({ ...initial, status: "stopped", steps: [{ ...initial.steps[0], status: "approval_required", requiresApproval: true }] }); }}>Approval fixture</button>
    </div></main>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
