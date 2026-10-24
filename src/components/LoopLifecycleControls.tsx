import { Play, RotateCcw, Square } from "lucide-react";
import { loopContinuation } from "../loopLifecycle";
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
  if (run.status === "completed" && !error) return null;
  return <section className="panel loop-lifecycle-controls" aria-label="Run lifecycle" aria-busy={!!busy}>
    <div className="button-row">
      <span className="status-pill" role="status">{busy === "stop" ? "Stopping…" : run.status}</span>
      {run.status === "running" || run.status === "stopping" ?
        <button className="danger-btn" onClick={onStop} disabled={!!busy}><Square size={16} />{busy === "stop" ? "Stopping…" : run.status === "stopping" ? "Confirm stop" : "Stop loop"}</button> : null}
      {continuation.action === "resume" ?
        <button className="primary-btn" onClick={onResume} disabled={!!busy}><Play size={16} />{busy === "resume" ? "Resuming…" : "Resume"}</button> : null}
      {continuation.action === "retry" ?
        <button className="primary-btn" onClick={onRetry} disabled={!!busy}><RotateCcw size={16} />{busy === "retry" ? "Retrying…" : "Retry step"}</button> : null}
    </div>
    <p className="helper-text">{continuation.reason || "Stop waits for owned execution to finish. It does not undo changes."}</p>
    {error ? <p role="alert" className="helper-text">{error}</p> : null}
  </section>;
}
