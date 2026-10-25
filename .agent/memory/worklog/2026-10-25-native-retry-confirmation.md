# Native Retry confirmation and truthful lifecycle status

## Objective and approved scope

The maintainer approved committing the alpha.3 installation report, fixing native
Retry and the incorrect Running helper status, desktop Cancel/Retry verification,
commits, push and a separate PR. No merge or release. Keep installed alpha.3 intact;
use an independently identified local QA bundle and mock-only disposable data.

## Initial state

`main` at `c12a74c` contained only three pending installation-QA memory files, all
explicitly approved. Created `codex/native-retry-confirmation` and committed them as
`1d4863b` (`docs(memory): record alpha.3 native installation and QA`). No unrelated
changes were present. The prior installed-build defect evidence remains in that log.

## Plan

1. Replace browser-native confirm with an in-app, keyboard-accessible confirmation
   bound to the exact loop/step/attempt; Cancel and Escape must not mutate runtime.
2. Display actual lifecycle status, including stopped/interrupted/completed, and
   prefer the explicitly opened loop over unrelated historical HarnessRuns.
3. Add regression fixtures; run frontend, lifecycle, contract, Rust and native-build
   checks. Verify Cancel/Retry in a separate desktop build and responsive UI fixture.
4. Update durable memory, review explicit file groups, commit/push the feature branch
   and create a PR. Do not merge, tag, publish a release or change the installed app.

## Progress

- Read memory, lifecycle implementation, native-confirm finding and existing tokens.
- Selected a non-modal inline confirmation using existing Dibi panel/button styles;
  no native permission/plugin/dependency is required. Frontend implementation,
  design-system and design-QA skills guide reuse and interaction verification.

## Implementation

- Replaced `window.confirm` with an inline Cancel/Confirm retry panel in the existing
  lifecycle component. Focus goes to Cancel; Escape/Cancel restore the Retry button.
  The warning retains side-effect/evidence/budget context. A loop/project/step/state/
  attempt-bound key rejects stale confirmation; a synchronously consumed ref prevents
  repeated submit before the parent IPC lock takes effect. No new dependency.
- Selected-loop status now takes precedence over unrelated latest HarnessRun history;
  the helper badge and run-state summary share the same actual status source.
- Added two behavioral regression groups (11 total), three UI contract assertions
  (19 total), interactive pending/approval/exhausted/switch-run controls and Retry
  counters, plus updated Stop/Resume documentation.

## Checks executed

- TypeScript and production Vite build passed, invoked directly with the bundled
  Node runtime because npm was unavailable. No package/lockfile/dependency change.
- `loop-lifecycle-smoke`: 11 behavioral scenarios passed. Includes status mapping,
  selected-loop precedence, target/attempt invalidation and existing safety guards.
- `ui-quality-smoke`: 19 passed; `native-contract-smoke`: 18 passed.
- Guided Run: 28 passed. Provider adapter, MCP policy (20), MCP stdio proxy and API
  adapter smoke checks all passed. Rust formatting and 60 offline Rust tests passed,
  including prior-evidence archiving, attempt budgets and approval enforcement.
- Performance budgets passed: JS 428,642 B / 117,014 B gzip; CSS 41,704 B / 8,368 B gzip.
- Offline Tauri debug app bundle passed, with config overrides only on the build
  command: product/window `DBC Retry QA`, identifier `com.dildin.build-control.retry-qa`,
  build label `native-retry-qa`, signing skipped. Packaged Settings confirmed arm64,
  debug profile, source `1d4863b` marked dirty and the separate bundle executable.
  This dirty-source QA bundle contains the working-tree fix, not released alpha.3.
- Controlled-smoke/EvidencePack CLI suite was not rerun locally; its pnpm dependency
  is unavailable here. Existing GitHub CI remains responsible for that full gate.
- `git diff --check` and staged/unstaged file review passed before publication.

## Native desktop verification

- Used the saved private QA-session database/WebKit under the separate app identifier.
  Production alpha.3 data and bundle were not replaced. The disposable workspace from
  the previous QA session was reused; its original snapshot remains preserved.
- Opened actual interrupted run `loop-1792927382236` through Loop Console. Both status
  surfaces showed Interrupted. The in-app warning displayed and Cancel was focused.
- Clicked Cancel, reopened using Enter, then Escape. Read-only SQLite status/step/
  attempt/budget metadata and SHA-256 of all existing evidence were byte-identical
  before/after these two cancellations. No Retry IPC/attempt was observed.
- Reopened, Tab from Cancel to Confirm retry, pressed Enter. Native UI transitioned
  Interrupted -> Running -> Completed. SQLite recorded seven passed steps, each at
  attempt count 1 with maxAttempts 3. The first four completed evidence hashes stayed
  identical; the interrupted unclaimed review step advanced from attempt 0 to 1.
  Every step remained `mock_adapter` / `mock`. No AI calls, credentials or external
  provider execution. This scenario did not contain prior review-attempt evidence;
  archive semantics are covered by the passing Rust regression, not this UI case.
- Started another saved mock task (`loop-1792931216160`), then Stop. Native lifecycle,
  helper and run-state summary all showed Stopped, not Running; SQLite confirmed it.
- Closed the QA app and verified process exit. Production database still passes
  quick-check with its original five failed loops; installed binary SHA-256 remains
  `61a9c458b2d950254f0345b462279a3eade7e244ee8a790d92e2c0cd13b5f8e8`.
- Screenshots, test workspace and a stopped QA SQLite backup are preserved privately
  under the prior backup's `native-retry-fix` directory. Original rollback app/data
  snapshots remain unchanged. No private data or binary screenshot is committed.

## Browser and design QA

The actual component fixture passed mouse Cancel, keyboard Escape/focus restoration,
single Retry after double-click, invalidation when switching runs and when busy,
disabled pending actions, no Retry under pending approval or exhausted budget, and
completed-state controls removal. Console warnings/errors: none. Screenshot checks
at 375/768/1440 widths showed readable controls, no clipping or horizontal overflow;
temporary viewport overrides were reset. Existing Dibi tokens/buttons were reused.

## Remaining risks and manual verification

Installed alpha.3 still contains the original bug; this task does not install a new
release. The QA bundle is unsigned debug, not a signed/released distribution. No live
provider, forced-crash, crash-surviving process, Intel or second-instance fixture ran.
Retry can repeat side effects; the UI warning does not relax backend authorization.
For release QA, repeat the mock Interrupted -> Cancel/Escape -> Confirm retry flow on
the eventual release bundle, then independently scope real-provider/process testing.

## Commit inventory and publication

The maintainer explicitly requested commits, push and a separate PR for this scope.

1. `1d4863b` — approved installation report (three memory files), already committed.
2. `2ac67f5` — `fix(ui): confirm native retry and show actual run status` — `src/App.tsx`,
   `src/components/LoopLifecycleControls.tsx`, `src/loopLifecycle.ts`, `src/styles.css`,
   `scripts/loop-lifecycle-smoke.mjs`, `scripts/ui-quality-smoke.mjs`,
   `tests/loop-lifecycle.tsx`, `docs/STOP_RESUME.md`.
3. `docs(memory): record native retry fix and desktop verification` — `.agent/PLANS.md`,
   `.agent/memory/PROJECT_STATE.md`, `.agent/memory/DECISIONS.md`, this worklog.

The first two commits were pushed to `origin/codex/native-retry-confirmation`.
The GitHub connector returned HTTP 403 for PR creation; the normal signed-in
browser created [PR #19](https://github.com/vistadi/dildin-build-control/pull/19)
into main, and it was attached to this task. No access permissions were changed.
The third memory checkpoint records the publication and is to be pushed to the
same branch. Remote check results are authoritative on the PR; this checkpoint
does not claim that pending remote checks passed. No merge, auto-merge, tag or release.
