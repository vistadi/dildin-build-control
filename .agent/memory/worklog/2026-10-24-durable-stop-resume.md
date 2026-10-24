# 2026-10-24 — Durable Stop/Resume

## Objective and approved scope

After fixing PR #16, publishing the approved commits and merging only with green
CI, implement durable Stop/Resume. The initial implementation scope excluded publication.
The maintainer subsequently explicitly approved both proposed commits, push and a new
PR. Merge, auto-merge, release, installation, paid provider calls, alert dismissal and
permission expansion remain outside this follow-up.

## Initial repository state

PR #16 head `ea402f1` passed all five checks including aggregate CodeQL (no new
alerts). CI run `40123421084`, CodeQL run `40123421116`. The connector merge attempt
returned 403; the already signed-in browser merged the PR, independently confirmed
by API as `3b21f7446caca6fb216f395c0f4a3be542b307cc`. Local main was fast-forwarded;
new branch `codex/durable-stop-resume` started clean at that merge.

The publication follow-up began on the same branch with exactly the 26 approved
changed/new files below, nothing staged and no unrelated changes. Existing work was
preserved; only publication facts in these memory files were updated in this turn.

## Plan

Persist lifecycle transitions and execution claims, separate Resume from Retry,
recover interrupted state without replay, add pending/error UI and deterministic
native/frontend tests. Preserve approval, attempt and provider safety gates.

## Work completed

- Read current loop commands, process ownership, harness mapping, frontend consumers,
  memory and existing smoke checks. The former Resume resets the active step without
  enforcing attempt limits; Stop is only a frontend pause plus process cancellation.
- Read frontend-implementation and design-system-guardian; retain existing English
  Dibi styling and avoid introducing dependencies or a new component library.

- Added a native lifecycle module with atomic execution claims, durable stop requests,
  transactionally settled step/run results, guarded Stop confirmation, bounded attempts,
  no-replay Resume, explicit Retry and startup interrupted-state recovery.
- Added a separate SQLite runtime lease before startup recovery. No schema columns or
  dependencies were added. Older versions do not honor the lease; close them first.
- Kept prior evidence until replacement and archived overwritten artifact/evidence
  files by attempt. Synchronized harness states; removed stale harness overwrite after
  the loop owner releases its guard. Approvals cannot clear a stopping state or bypass
  budgets; persisted pending approvals reappear in UI on Stop/open without duplication.
  Approvals scope follows the opened loop (including historical/legacy loops) and a
  rejected backend approval command is not displayed as approved by frontend state.
- Added reusable English lifecycle controls, pending/error/approval copy, confirmation
  before Retry, synchronous duplicate-action protection and stale-result generations.
  Reused Dibi buttons/tokens; fixed action minimum width avoids loading-label shifts.
- Added native and frontend behavior fixtures, CI/release-quality smoke registration,
  operator documentation and a browser-only fixture using the real controls.

## Commands and validation

- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`: passed after formatting.
- `cargo test --offline --manifest-path src-tauri/Cargo.toml`: 60 passed, 0 failed.
  Covers Stop before claim, late success, final-step finalization without replay,
  interrupted retry/budgets, approvals, settled-stop recovery, runtime lease release,
  evidence archive preservation, harness state mapping and previous regression suite.
- Real local-process test: harmless `/bin/sh` prints a fixed partial marker then sleeps
  in an isolated temporary project; cancel/reap, operation ownership release, partial
  failed evidence, SQLite close/reopen and explicit Retry/recovery were asserted.
  The initial fixture had SQL quoting wrong, failed before launching anything, was
  corrected with bound parameters and passed in the final full suite.
- `cargo build --offline --manifest-path src-tauri/Cargo.toml`: native debug passed.
- Bundled Node ran `typescript/bin/tsc --noEmit` and `vite/bin/vite.js build`: passed.
  No dependency installation or certification of the previously unavailable pnpm CLI.
- `loop-lifecycle-smoke`: nine behavioral scenarios passed (including preserved
  output, pending-stop block, retry limits, no replay and restored pending approvals).
- Existing scripts passed: Guided Run 28, provider adapters, MCP policy 20, MCP proxy,
  API adapters, UI quality 16, native contract 18, and frontend performance budgets.
  Source-token smoke checks are not represented as full IPC/E2E coverage.
- Read design-qa; browser QA at 375/768/1440: pending Stop disabled, one request,
  settled Stop -> Resume, interrupted -> Retry, keyboard activation, pending approval
  without continuation controls, failed Stop with retry-confirmation action and alert.
  Document width equalled each viewport; no clipping/overlap found in these states.
  Console warnings/errors empty; main application loaded successfully. Viewport reset.
  Screenshots outside Git: `/private/tmp/dbc-pr16-merge-YKNIrt/lifecycle-mobile.png`
  and `lifecycle-desktop.png`. These are component fixtures, not native-window proof.
- Vite initially could not bind under sandbox (EPERM); approved loopback-only server
  was used for QA. One locator became stale after hot reload; refreshed page state
  and re-ran the keyboard check successfully.
- `git diff --check`, staged/unstaged inventory and targeted credential-pattern scan
  reviewed before the implementation handoff. Nothing was staged or committed at
  that handoff; the subsequent approved publication is recorded below.

## Approved Git structure / exact changed-file inventory

Current branch: `codex/durable-stop-resume`; initial tree clean at `3b21f74`.
The maintainer explicitly approved these two groups, push and a new PR:

1. `feat(runtime): persist stop resume and interrupted recovery`
   - `.github/workflows/ci.yml`
   - `.github/workflows/release.yml`
   - `package.json`
   - `README.md`
   - `docs/STOP_RESUME.md` (new)
   - `scripts/native-contract-smoke.mjs`
   - `scripts/ui-quality-smoke.mjs`
   - `scripts/loop-lifecycle-smoke.mjs` (new)
   - `src-tauri/src/harness.rs`
   - `src-tauri/src/main.rs`
   - `src-tauri/src/process_runner.rs` (metadata visibility for deterministic test)
   - `src-tauri/src/loop_lifecycle.rs` (new)
   - `src/App.tsx`
   - `src/styles.css`
   - `src/tauriBridge.ts`
   - `src/types.ts`
   - `src/loopLifecycle.ts` (new)
   - `src/components/LoopLifecycleControls.tsx` (new)
   - `tests/loop-lifecycle.html` (new)
   - `tests/loop-lifecycle.tsx` (new)
2. `docs(memory): record PR 16 merge and durable lifecycle verification`
   - `.agent/PLANS.md`
   - `.agent/memory/PROJECT_STATE.md`
   - `.agent/memory/DECISIONS.md`
   - `.agent/memory/OPEN_QUESTIONS.md`
   - `.agent/memory/worklog/2026-10-24-pr-16-review-and-ci.md`
   - `.agent/memory/worklog/2026-10-24-durable-stop-resume.md` (this new worklog)

Ignored `.dbc` smoke output, dist, Cargo target and screenshots are not publication
inputs. No credentials, generated bundles or unrelated user changes are included.

## Publication follow-up — 2026-10-24

- Re-read project memory and checked branch, staged/unstaged inventory and diffs.
  No repository AGENTS.md was found; the user-provided memory/Git rules apply.
- Re-ran Rust formatting, all 60 Rust tests and offline debug build successfully.
  Cargo was not on shell PATH; the installed `/Users/vitaliy/.cargo/bin/cargo` worked.
- Re-ran TypeScript/Vite, Guided Run (28), provider adapters, MCP policy (20), MCP
  proxy, API adapters, UI quality (16), native contracts (18), lifecycle (9) and
  performance budgets: all passed. No live provider or native-window QA was added.
- Reviewed exact staged implementation diff, `git diff --check` and targeted credential
  patterns (no matches); staged only the 20 approved implementation/docs/test files.
- Created and pushed `5110d0ae36f4962a0e28606ec153f96ec8c00d07` —
  `feat(runtime): persist stop resume and interrupted recovery`.
  Remote branch SHA matched; remote main remained `3b21f74`.
- Checked for duplicate PRs: none for this head. Connector PR creation returned HTTP
  403; existing signed-in GitHub UI successfully created
  [PR #18](https://github.com/vistadi/dildin-build-control/pull/18), targeting `main`.
  API independently confirmed open/unmerged at `5110d0a`, one commit and 20 files.
  The PR was attached to this chat. No permissions expanded or safeguards bypassed.
- The approved second commit, `docs(memory): record PR 16 merge and durable lifecycle
  verification`, contains only the six listed memory files, including this publication
  record. Its own SHA is intentionally not self-embedded; Git history identifies the
  checkpoint. Final-head remote publication and check status must be verified after push.
- PR #18 stays open. No merge, auto-merge, release, tag, branch deletion or installation.

## Risks and manual verification

- Stop is not rollback. Crash recovery cannot certify escaped/orphaned processes
  stopped. Inspect them and workspace effects before explicit Retry; completed local
  commands within a partly executed multi-command step may repeat.
- Packaged native-window IPC, actual application restart/crash and second-launch UX
  remain unverified end-to-end. Unit tests cover the underlying transitions/lease.
- New statuses are stored in existing text fields. Older builds do not understand the
  new lifecycle or honor the lease. Do not downgrade against active runs; close older
  instances before running this build. Back up runtime state before downgrade testing.
- No live providers, paid calls, new integrations, signed bundles, release or installed
  application replacement. Controlled-smoke CLI was not rerun in this follow-up.
- Manual QA: launch an isolated packaged build after closing older DBC, run a harmless
  disposable task, Stop during preparation and execution, reopen history, inspect
  retained evidence, then Resume queued work or explicitly Retry interrupted work.
  Restart with unfinished work and confirm no automatic provider launch. Confirm a
  second instance cannot own the same database and approvals/attempt budgets remain.

## Next action

Finish the approved memory checkpoint and push, then verify PR #18 head and its
CI/CodeQL status. Keep the PR open for review and native-window validation. PR #16
is already merged; PR #18 merge and any release require separate authorization.
