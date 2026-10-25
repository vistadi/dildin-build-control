import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const state = readFileSync(new URL("../src/storage.ts", import.meta.url), "utf8");
const types = readFileSync(new URL("../src/types.ts", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const diagnostics = readFileSync(new URL("../src/components/RuntimeDiagnostics.tsx", import.meta.url), "utf8");
const lifecycle = readFileSync(new URL("../src/components/LoopLifecycleControls.tsx", import.meta.url), "utf8");

const checks = [
  [app.includes('className="skip-link"') && app.includes('id="main-content"'), "skip link targets the main landmark"],
  [html.includes('<html lang="en">'), "document language is fixed to English"],
  [app.includes('aria-current={view === item.id ? "page" : undefined}'), "active navigation exposes aria-current"],
  [app.includes('aria-label="Primary navigation"'), "primary navigation has an English accessible label"],
  [!app.includes("uiLanguage") && !types.includes("uiLanguage"), "runtime language switching is removed"],
  [app.includes("Telemetry is off by default") && app.includes("does not transmit analytics"), "telemetry remains explicit and local-only"],
  [styles.includes(":focus-visible") && styles.includes("outline: 3px solid"), "keyboard focus is visible"],
  [styles.includes("prefers-reduced-motion: reduce"), "reduced motion is respected"],
  [styles.includes("overflow-x: hidden") && styles.includes("min-width: 0"), "horizontal overflow guard is present"],
  [state.includes("_legacyUiLanguage") && state.includes("persistedState"), "legacy language preference is discarded during migration"],
  [state.includes("telemetryEnabled: state.telemetryEnabled === true"), "telemetry migration defaults to disabled"],
  [app.includes("<BuildIdentityPanel />") && diagnostics.includes("Browser preview"), "build identity distinguishes native and browser preview"],
  [diagnostics.includes("role=\"alert\"") && diagnostics.includes("Retry build details"), "build diagnostics includes failure and retry states"],
  [diagnostics.includes("disabled={pending}") && diagnostics.includes("aria-label={`Stop"), "process stop has pending state and accessible name"],
  [app.includes("stopBackendLoop(target.id, target)") && app.includes("if (disposed) return"), "loop stop awaits durable native cancellation and ignores stale results"],
  [app.includes("LoopLifecycleControls") && app.includes("resumeBackendLoop"), "stopped loop exposes explicit Resume separately from Retry"],
  [!app.includes("window.confirm(") && lifecycle.includes("Confirm retry") && lifecycle.includes("cancelRetry"), "Retry uses an in-app confirmation instead of native WebView confirm"],
  [lifecycle.includes("cancelButton.current?.focus()") && lifecycle.includes('event.key === "Escape"'), "Retry confirmation defaults to Cancel and supports Escape"],
  [app.includes("operatorRunStatus(currentLoop, latestHarnessRun)") && app.includes("status={operatorStatus}"), "operator hint uses the selected run's actual status"],
];

const failures = checks.filter(([ok]) => !ok);
for (const [ok, label] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
}
if (failures.length) {
  process.exitCode = 1;
} else {
  console.log(`UI quality smoke passed (${checks.length} assertions).`);
}
