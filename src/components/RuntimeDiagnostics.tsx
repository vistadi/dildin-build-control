import { Activity, PackageCheck, RotateCcw, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { cancelCliProcess, getBuildInfo, isTauriRuntime, listActiveCliProcesses } from "../tauriBridge";
import type { BuildInfo, CliActivity } from "../tauriBridge";

function buildDate(epoch: string) {
  const date = new Date(Number(epoch) * 1000);
  return Number.isFinite(date.getTime()) ? date.toISOString().replace("T", " ").replace(".000Z", " UTC") : "Unknown";
}

export function BuildIdentityDetails({ info }: { info: BuildInfo }) {
  const fields = [
    ["Version", info.version], ["Build", info.label], ["Commit", info.commit],
    ["Source state", info.sourceState], ["Built at", buildDate(info.builtAtUnix)],
    ["Target / architecture", info.target], ["Profile", info.profile],
    ["Signing / notarization", info.signingStatus], ["Running executable", info.executablePath],
  ];
  return <>
    <dl className="diagnostics-grid">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p className="helper-text">Identity belongs to this running binary, not the current Git checkout. Dirty sources can differ from the displayed commit. Signing must be verified on the distributed artifact.</p>
  </>;
}

export function BuildIdentityPanel() {
  const [info, setInfo] = useState<BuildInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    setLoading(true); setError("");
    void getBuildInfo().then(result => { if (!disposed) setInfo(result); })
      .catch(() => { if (!disposed) setError("Build details could not be loaded. Retry or reopen the desktop app."); })
      .finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [attempt]);
  return <section className="panel" aria-labelledby="build-identity-heading">
    <div className="panel-head"><div><PackageCheck size={20} aria-hidden="true" /><h2 id="build-identity-heading">About this build</h2></div></div>
    {loading ? <p role="status">Loading build details…</p> : error ? <>
      <p role="alert">{error}</p><button className="ghost-btn compact-btn" onClick={() => setAttempt(value => value + 1)}><RotateCcw size={16} />Retry build details</button>
    </> : info ? <BuildIdentityDetails info={info} /> : <p className="helper-text">Browser preview — installed app version, architecture, commit and signing details are available in the desktop app. No local process was started.</p>}
  </section>;
}

export function ProcessActivityList({ processes, stopping, onStop }: {
  processes: CliActivity[]; stopping: string[]; onStop: (id: string) => void;
}) {
  return <ul className="process-activity-list">{processes.map(process => {
    const pending = process.cancelRequested || stopping.includes(process.id);
    return <li key={process.id}>
      <div><strong>{process.label}</strong><p className="helper-text">{process.scope || "Direct CLI run"} · {Math.floor(process.elapsedMs / 1000)}s · {Math.ceil((process.stdoutBytes + process.stderrBytes) / 1024)} KiB received</p></div>
      <button className="danger-btn compact-btn" disabled={pending} onClick={() => onStop(process.id)} aria-label={`Stop ${process.label} (${process.id})`}><Square size={14} aria-hidden="true" />{pending ? "Stopping…" : "Stop process"}</button>
    </li>;
  })}</ul>;
}

export function RuntimeActivity() {
  const [processes, setProcesses] = useState<CliActivity[]>([]);
  const [stopping, setStopping] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!isTauriRuntime()) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const result = await listActiveCliProcesses();
        if (!disposed) {
          setProcesses(result); setError("");
          setStopping(current => current.filter(id => result.some(process => process.id === id)));
        }
      } catch { if (!disposed) setError("Process status is unavailable. A running command may still be active; retry stopping it or reopen diagnostics."); }
      finally { if (!disposed) timer = setTimeout(refresh, 1000); }
    }
    void refresh();
    return () => { disposed = true; clearTimeout(timer); };
  }, []);
  async function stop(id: string) {
    setStopping(current => [...current, id]); setNotice("");
    try {
      const requested = await cancelCliProcess(id);
      setNotice(requested ? "Stop requested. Partial output will be retained; existing file changes are not rolled back." : "This process has already finished. Review its evidence.");
    } catch { setNotice("Stop could not be confirmed. Retry and check the process status."); }
    finally { setStopping(current => current.filter(value => value !== id)); }
  }
  if (!processes.length && !error && !notice) return null;
  return <section className="panel runtime-activity" aria-labelledby="runtime-activity-heading">
    <div className="panel-head"><div><Activity size={20} aria-hidden="true" /><h2 id="runtime-activity-heading">Native execution</h2></div></div>
    <p className="helper-text">Live process metadata only. Output and prompts are not streamed into this panel. Stop ends the owned process group on macOS/Linux; it does not undo changes.</p>
    {error ? <p role="alert">{error}</p> : null}
    <ProcessActivityList processes={processes} stopping={stopping} onStop={id => void stop(id)} />
    {notice ? <div className="form-action-row"><p role="status">{notice}</p><button className="ghost-btn compact-btn" onClick={() => setNotice("")}>Dismiss</button></div> : null}
  </section>;
}
