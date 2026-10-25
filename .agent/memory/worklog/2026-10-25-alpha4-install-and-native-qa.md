# Alpha.4 installation and native lifecycle QA

## Objective and approved scope

The maintainer explicitly confirmed updating installed DBC to alpha.4 with a
recoverable old application/data backup and mock-only launch, Cancel/Retry,
Stop/Resume and restart recovery verification. The original installation scope
excluded Git publication. After reviewing the results, the maintainer approved
the proposed three-file local documentation commit. No live AI calls, credentials,
security bypass, source changes, new release or push are included.

## Initial state

- Clean main at `c4a79321a0421b86f5de6b29d4d1c135c4e97a06`.
- CI `40201346582` and CodeQL `40201347794` passed on that documentation commit.
- This Mac is arm64. Native Settings identifies installed alpha.3 / `2904b20`,
  release profile, clean sources and the executable under `/Applications`.
- Installed binary SHA-256 is
  `61a9c458b2d950254f0345b462279a3eade7e244ee8a790d92e2c0cd13b5f8e8`.
- Settings shows safe mock, real execution off, MCP isolated and local telemetry off.
- Existing application SQLite quick-check passed. No private records are copied
  into repository memory. Previous alpha.3 rollback snapshots will not be changed.
- The alpha.4 arm64 archive hash matches published metadata:
  `62ebedb4e66554bc153c72954d44a70e80610cd1ad028539ad8db63f2e2abb67`.

## Plan

1. Quit DBC after checking for active work; preserve current app and local data in
   a new private backup, verify copies and document coordinated rollback.
2. Stage the verified official arm64 alpha.4 archive, replace the installed bundle
   recoverably and verify native Settings identity.
3. Use a disposable mock workspace. Verify Stop/restart/Resume without evidence
   replay, restart to Interrupted without execution, Cancel/Escape without mutation
   and explicit Retry to completion with correct lifecycle statuses.
4. Preserve QA evidence privately, restore the pre-QA user state, relaunch alpha.4
   and record verified outcomes and honest limits in project memory.

## Progress

- Initial repository, memory, release artifact and installed-build checks completed.
- Quit alpha.3 through native UI; process inventory confirmed exit. SQLite passed
  quick-check and had only five pre-existing failed loops, no active work.
- Created private backup
  `/Users/vitaliy/Library/Application Support/DBC Backups/2026-10-25-before-alpha4-zZc017`.
  App, Application Support and WebKit copies match recursively byte-for-byte; the
  copied SQLite passes quick-check. Previous backup directories are untouched.
- Staged official alpha.4 arm64 app under a dedicated temporary QA directory.
  Binary architecture is arm64; SHA-256 is
  `7fcde40baaa5f82916e1a1af03c8ea5379c72a513b92a9cc81ef1efefb4fd02b`.
- Disposable workspace: `/private/tmp/dbc-alpha4-native-qa-MufvYs/project`.
- Preserved the pre-swap alpha.3 bundle separately and installed staged alpha.4 in
  `/Applications`. Recursive app comparison and executable SHA-256 passed.
- Native Settings confirms `v0.2.0-alpha.4`, full commit
  `06a7ea5c3171305ce58cc534487696698df96917`, clean sources, release profile,
  `aarch64-apple-darwin` and the installed executable path. Safe mock is ready,
  real execution off, MCP isolated and local telemetry off. No Gatekeeper,
  quarantine or permission change was needed.

## Native lifecycle results

Created the task through the actual native UI in the disposable workspace with
mock profile, `mock_only` strategy and Local Safe Mock routing. Every persisted
step in both loops used `mock_adapter` / `mock`; no live AI or local build command
was executed by these loops. These are advanced legacy-loop IPC tests, not a full
Guided Harness acceptance or real-provider cancellation certification.

1. `loop-1792939363070`: Stop settled at Stopped, active index 5. Plan, code,
   build, test and review were passed at attempt 1; security and accept had no
   attempts. Quit, verify process exit and relaunch: status, step metadata and all
   five completed evidence hashes were identical. Resume transitioned Running to
   Completed; all seven steps passed at attempt 1, with old evidence unchanged.
2. `loop-1792939517792`: quit during an unfinished run after four completed steps.
   Process exit was confirmed; SQLite still recorded Running at active index 4.
   Relaunch recovered to Interrupted with review interrupted at attempt 0, future
   steps waiting, and completed steps/evidence unchanged. Opening the run did not
   auto-execute it. Both UI status surfaces correctly showed Interrupted.
3. In-app Retry confirmation appeared and focused Cancel. Escape closed it and
   restored Retry focus; read-only SQLite step/status/attempt metadata and existing
   evidence hashes were identical to the baseline. Reopen with Enter, click Cancel:
   the same invariants and focus restoration passed independently.
4. Reopen, Tab to Confirm retry, press Enter: native UI transitioned Interrupted ->
   Running -> Completed. All seven steps passed with attempt 1 and maxAttempts 3;
   the first four evidence files were unchanged. No duplicate attempt was observed.
   The interrupted review had no previous executed attempt, so this test does not
   independently certify archiving pre-existing review evidence (covered by Rust tests).

SQLite quick-check after QA: ok; two completed QA loops plus the original five
failed loops. Structured test metadata/hashes and screenshots are preserved privately.

## Cleanup and final state

- Closed DBC and confirmed process exit. Preserved the complete QA Application
  Support and WebKit directories under the backup's `post-qa`; QA database checks
  passed and retain both completed test loops.
- Copied the disposable workspace, structured verification data and screenshots
  under the backup's `native-qa`; recursive comparisons passed. Eight screenshots
  cover installed identity, stopped states, resumed completion, running before quit,
  Retry confirmation, Retry completion and final restored alpha.4 Settings.
- Restored original Application Support and WebKit from the untouched backup;
  both recursive byte comparisons passed before relaunch. No original backup was
  overwritten and no user or QA data was deleted.
- Relaunched alpha.4, final PID 32195. Native Settings confirms the original project,
  expected full SHA/build label, safe mock, real execution off, isolated MCP and
  local telemetry off. The app is left open on Settings.
- Final main SQLite is byte-identical to the pre-QA backup and quick-check is ok;
  only the original five failed loops remain in active state. Installed and backup
  executable hashes match their recorded alpha.4/alpha.3 values.

## Additional discoveries (not fixed by this installation)

- The Workspace-internal Tasks tab did not navigate; the primary Tasks navigation
  worked. Source `src/App.tsx:3124` renders all Workspace tab-strip buttons without
  handlers, confirming that these shortcuts are nonfunctional in the current build.
- Preflight displayed generic Codex/Claude/local-build route diagnostics despite
  Local Safe Mock resolving all actual steps to mock. Source `src/App.tsx:7135`
  builds those diagnostics from global agents/providers rather than the task route.
- Fresh mock workspace artifact diagnostics report missing `.dbc/approvals/latest.json`
  as an error although mock launch requires no operator approval. Source
  `src-tauri/src/main.rs:4862` reads this artifact unconditionally. This did not block
  Stop/Resume/Retry and is not evidence that any live provider ran or approvals were bypassed.
- These are follow-up UX/diagnostic findings, not an expansion of this install-only
  scope into source implementation. No application source was edited.

## Files and validation

Repository task files: this worklog, `.agent/PLANS.md` and
`.agent/memory/PROJECT_STATE.md`. Private backup, QA
workspace, screenshots and SQLite snapshots remain outside Git. The maintainer
approved exactly these three memory files for the local checkpoint; no unrelated
files or private QA data are included.

Commands/checks executed: git status; applicable instructions, state, decisions,
questions, plans and prior installation worklogs; native AX/screenshots/actions;
GitHub release metadata; archive/binary SHA-256 and Mach-O architecture; process
inventory; read-only SQLite quick-check/status/attempt queries; recursive backup,
install and restoration comparisons; evidence SHA-256 comparisons; final database
byte comparison. No source build or local automated suite was rerun for this
installation; release CI/CodeQL/quality evidence remains in the release worklog.

## Risks and next action

Unsigned/non-notarized alpha. No forced crash, live-provider cancellation,
crash-surviving processes, second-instance or Intel-window certification is implied.
Stop is not rollback; Retry may repeat effects. No real-process cancellation,
forced-crash, second-instance, Intel launch or complete Guided Harness test ran.

## Recommended next action and Git inventory

Installation and the requested mock desktop checks are complete. Approved commit:
`docs(memory): record alpha.4 native installation and lifecycle QA`, limited to
`.agent/PLANS.md`, `.agent/memory/PROJECT_STATE.md` and this worklog. The approval
continuation began on main at `c4a7932` with only these three pending files and an
empty index. Whitespace checks and the complete documentation diff were reviewed;
there are no credentials, generated assets or unrelated changes. Push remains
unauthorized and is not performed. No tag, release or source change.

Next implementation scope should address the three recorded UX/diagnostic findings
before broader real-process, crash and multi-instance certification.
