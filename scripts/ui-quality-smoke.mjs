import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const state = readFileSync(new URL("../src/storage.ts", import.meta.url), "utf8");
const types = readFileSync(new URL("../src/types.ts", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

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
