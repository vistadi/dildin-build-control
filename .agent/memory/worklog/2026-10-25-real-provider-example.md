# Alpha.4 real-provider example

## Objective and approved scope

Exercise the installed desktop on a disposable README example. The maintainer
explicitly approved up to eight Codex/Claude AI CLI calls against existing quota,
not a monetary budget. No commit, push, dependency installation, secret access,
source fix, release or user-project edits. Return to safe mock afterward.

## Initial state

- Branch `main`, clean, at `0a05edf3a80eccafae3b178edd356b40ec919895`.
- Installed alpha.4 identifies source `06a7ea5`, clean arm64 release.
- Native Settings: safe mock, real execution off, MCP isolated, telemetry off.
- SQLite has five pre-existing failed loops, no active loop.
- Codex 0.164.0-alpha.11.1 and Claude Code 2.1.195 are installed. Read-only
  authentication probes confirm both existing sessions; Claude's sandboxed
  negative result was corrected by an unrestricted read-only probe.

## Plan

1. Preserve application data and create a synthetic, isolated README project.
2. Exercise supported preparation/approval and real execution without bypassing
   readiness gates; cap model calls at eight.
3. Inspect actual file change, local verification, review and evidence.
4. Preserve test evidence, restore original data/safe mock, report limitations.

## Completed work and validation

- Inspected current native/backend real-loop gates and supplied readiness,
  operator-checklist, approval, real-micro and release scripts.
- Closed the app normally after checking no active runs. Process-exit check passed.
- Saved Application Support and WebKit before-test copies; `diff -rq` verifies
  both against originals.
- Created a disposable README, exact-content Node assertion, package scripts and
  scope instructions under `/private/tmp/dbc-alpha4-real-example-4Z6oHC/project`.
  The initial pending marker intentionally fails the final verification.
- No AI execution has occurred at this checkpoint.

## Native reproduction and final results

1. Imported the synthetic project using installed Projects; selected it in Settings.
2. Used Sync config. Updated only the test session's Codex command to its actual
   installed executable. Native Test CLI and Check contract passed against
   0.164.0-alpha.11.1; these are probes, not model responses.
3. Real micro refused activation because the operator checklist was missing.
4. Overview Checklist and Dry-run generated genuine blocked reports. Approve,
   Apply real and Run approved remained disabled; no gate was bypassed.
5. Generate package failed with `No such file or directory (os error 2)` in the
   native audit. `generate_release_package` reads target-project
   `src-tauri/tauri.conf.json` before emitting any report. This README/Node project
   has no Tauri config or app/DMG. Source also expects a DBC-named executable.
6. Ran the repository's real-readiness, real-micro-plan, compare-real-micro and
   operator-checklist helpers with the bundled Node, cwd set to the test project.
   Each exited 1 and wrote blocked/failed diagnostics, not passing fixtures.
   Native Checklist/Dry-run were then regenerated; final native checklist had
   four blockers (readiness, real plan, comparison, release), two warnings.
7. Verified that the native-saved YAML contains all four provider IDs while the
   helper parser returns zero. Its `text.split(/\n  - id: /)` cannot handle
   native output's standalone list dash and later quoted id. The helper's false
   missing Codex/Claude/local-runner errors are not authentication failures.
8. Exact README comparison confirms it is unchanged at `Status: pending`.
   The final-content assertion exits 1, as expected before the intended change.
   All four active provider records remain mock. No operator approval artifact
   exists, no new SQLite loop was created, and actual AI calls are **0 of 8**.

### Root-cause references

- `src-tauri/src/main.rs`: `generate_release_package` (3527),
  `operator_check_release` (8474), `json_to_yaml` (9932).
- `scripts/real-readiness.mjs`: `checkRelease` (165), `parseProviders` (254).
- `scripts/real-micro-plan.mjs`: release blocker and `parseProviders` (195).
- `scripts/operator-checklist.mjs`: `checkRelease` (293), `parseProviders` (357).

These references are to the current `0a05edf` source; no code was edited.

## Preservation and restoration

- Private persistent evidence: `~/Library/Application Support/DBC Backups/`
  `2026-10-25-real-example-pw7ZWW`, containing RESULT.md, the synthetic project,
  generated reports, native screenshot, and coordinated before/after data copies.
- Closed DBC normally and confirmed process exit. Preserved the complete test
  Application Support/WebKit session under `after/` by moving it, not deleting it.
- Restored both `before/` trees. `diff -rq` confirmed byte equality before relaunch.
- Relaunched official alpha.4 and inspected Settings: original DBC workspace,
  safe mock ready, real execution off, MCP isolated, telemetry off.
- After relaunch `cmp` still confirms the original SQLite byte-for-byte; read-only
  SQL shows only the five original failed loops. No user data was discarded.

## Commands/checks and limitations

- Git status, staged/unstaged diff and `git diff --check` were reviewed.
- Read-only CLI version/login status, native version/contract probes, Node helper
  execution (20-second process bounds), exact README/parser assertions, SQLite
  status queries, process-exit checks and before/after file comparisons ran.
- A helper-generated generic REAL-MICRO-README task remains only in the preserved
  fixture; it was never approved or executed. No quota budget was activated.
- No live edit, successful build, Claude review, real-process Stop/Resume, crash
  recovery or full Guided Harness execution is certified by this attempt.
- No source fixes/builds/tests were run: this was diagnostic desktop verification.

## Files, decisions, risks and next action

Repository changes are limited to `.agent/PLANS.md`,
`.agent/memory/PROJECT_STATE.md`, `.agent/memory/OPEN_QUESTIONS.md`, and this worklog.
No architectural decision was accepted; DECISIONS.md is intentionally unchanged.
No secrets or raw provider session data are recorded in repository memory.

Recommended next implementation: decouple project readiness from DBC packaging,
parse YAML structurally with native-to-script round-trip coverage, retain human
task/budget gates, then repeat the tiny live example. Do not mask these defects by
copying DBC release reports into unrelated projects or bypassing blocked approval.

Proposed memory-only commit (not authorized or created):
`docs(memory): record blocked alpha.4 real-provider example`, covering the four
memory files above. No commit, push, release or remote mutation occurred.
