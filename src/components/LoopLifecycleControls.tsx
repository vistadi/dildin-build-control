import { Play, RotateCcw, Square } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { loopContinuation, retryConfirmationKey } from "../loopLifecycle";
import type { LoopRunSnapshot } from "../types";

export function LoopLifecycleControls({ run, busy, error, onStop, onResume, onRetry }: {
  run: LoopRunSnapshot;
  busy: "stop" | "resume" | "retry" | null;
  error: string;
  onStop: () => void;
  onResume: () => void;
  onRetry: () => void;
}) {
  const continuation = loopContinuation(run);
  const retryKey = retryConfirmationKey(run);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const confirmedKey = useRef<string | null>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const confirmationId = useId();
  const confirming = confirmation !== null && confirmation === retryKey && !busy;

  useEffect(() => {
    setConfirmation(null);
    confirmedKey.current = null;
  }, [retryKey, busy]);
  useEffect(() => {
    if (confirming) cancelButton.current?.focus();
  }, [confirming]);

  function cancelRetry() {
    setConfirmation(null);
    confirmedKey.current = null;
    retryButton.current?.focus();
  }

  function confirmRetry() {
    if (!confirming || confirmedKey.current !== retryKey) return;
    // Consume synchronously before invoking IPC; repeated clicks cannot submit twice.
    confirmedKey.current = null;
    setConfirmation(null);
    onRetry();
  }

  if (run.status === "completed" && !error) return null;
  return <section className="panel loop-lifecycle-controls" aria-label="Run lifecycle" aria-busy={!!busy}>
    <div className="button-row">
      <span className="status-pill" role="status">{busy === "stop" ? "Stopping…" : run.status}</span>
      {run.status === "running" || run.status === "stopping" ?
        <button className="danger-btn" onClick={onStop} disabled={!!busy}><Square size={16} />{busy === "stop" ? "Stopping…" : run.status === "stopping" ? "Confirm stop" : "Stop loop"}</button> : null}
      {continuation.action === "resume" ?
        <button className="primary-btn" onClick={onResume} disabled={!!busy}><Play size={16} />{busy === "resume" ? "Resuming…" : "Resume"}</button> : null}
      {continuation.action === "retry" ?
        <button ref={retryButton} className="primary-btn" aria-expanded={confirming}
          aria-controls={confirming ? confirmationId : undefined}
          onClick={() => { confirmedKey.current = retryKey; setConfirmation(retryKey); }}
          disabled={!!busy}><RotateCcw size={16} />{busy === "retry" ? "Retrying…" : "Retry step"}</button> : null}
    </div>
    <p className="helper-text">{continuation.reason || "Stop waits for owned execution to finish. It does not undo changes."}</p>
    {confirming ? <div id={confirmationId} className="loop-retry-confirmation" role="group"
      aria-labelledby={`${confirmationId}-title`} aria-describedby={`${confirmationId}-warning`}
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancelRetry(); } }}>
      <strong id={`${confirmationId}-title`}>Retry this step?</strong>
      <p className="helper-text">Run: {run.id} · Step: {run.steps[run.activeStepIndex].state}</p>
      <p id={`${confirmationId}-warning`} className="helper-text">Retry starts a new attempt and may repeat side effects. Inspect workspace changes, partial evidence and external processes first. Previous evidence and attempt limits are retained.</p>
      <div className="button-row">
        <button ref={cancelButton} className="ghost-btn" onClick={cancelRetry}>Cancel</button>
        <button className="danger-btn" onClick={confirmRetry}>Confirm retry</button>
      </div>
    </div> : null}
    {error ? <p role="alert" className="helper-text">{error}</p> : null}
  </section>;
}
