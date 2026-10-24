// Manual visual/interaction fixture. No native invocation or model request occurs.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { BuildIdentityDetails, BuildIdentityPanel, ProcessActivityList } from "../src/components/RuntimeDiagnostics";
import "../src/styles.css";

function Fixture() {
  const [stopping, setStopping] = useState<string[]>([]);
  return <main className="content view-stack">
    <h1>Diagnostics QA fixture</h1><p>Deterministic example data. No local process is running.</p>
    <BuildIdentityPanel />
    <section className="panel"><h2>Long native identity fixture</h2>
      <BuildIdentityDetails info={{ version: "0.2.0", label: "codex/native-execution-and-diagnostics", commit: "0123456789abcdef0123456789abcdef01234567", sourceState: "dirty", builtAtUnix: "1792800000", target: "aarch64-apple-darwin", profile: "release", signingStatus: "Not verified by this app", executablePath: "/Applications/DBC desktop with a very long application folder name/Dildin Build Control.app/Contents/MacOS/dildin-build-control" }} />
    </section>
    <section className="panel"><h2>Process activity fixture</h2>
      <ProcessActivityList processes={[{ id: "fixture-1", scope: "loop-example-with-a-very-long-but-non-sensitive-identifier", label: "example-provider-with-long-name", elapsedMs: 43210, stdoutBytes: 1234567, stderrBytes: 1000, cancelRequested: false }]} stopping={stopping} onStop={id => setStopping([id])} />
      <button className="ghost-btn compact-btn" onClick={() => setStopping([])}>Reset fixture</button>
    </section>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
