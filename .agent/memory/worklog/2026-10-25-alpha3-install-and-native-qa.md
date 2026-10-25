# Alpha.3 installation and native lifecycle QA

## Objective and scope

The maintainer requested updating the installed application to v0.2.0-alpha.3,
preserving the previous build for rollback, and verifying launch, Stop/Resume
and restart recovery. Use a disposable local project without live AI calls.
No new commits or pushes are authorized by this installation request.

## Initial state and plan

- Repository: clean `main` at `c12a74c`.
- Mac architecture: arm64. Installed bundle version: 0.2.0; its binary SHA-256
  was `2bf1d685e991ac8bf3135b90feb4614f0a2e12d9e624b00dc1270fcfb522f036`.
  This differs from the old installation observation in PROJECT_STATE.md; the
  actual installed bundle is authoritative.
- No DBC application process was running before backup/install.
- Existing SQLite passed `PRAGMA quick_check`; five pre-existing loops were
  already failed, none running. Only status/count metadata was inspected.
- Plan: preserve app and local data; install verified arm64 release; inspect
  native build identity; exercise lifecycle and restart in a disposable project;
  retain rollback instructions and record observed results.

## Completed milestones

- Created private, persistent backup directory:
  `/Users/vitaliy/Library/Application Support/DBC Backups/2026-10-25-before-alpha3-y7oLQB`.
- Backed up the old `.app`, `Application Support/com.dildin.build-control` and
  `WebKit/com.dildin.build-control`; recursive byte comparisons passed. No preference
  plist, HTTPStorages directory or saved-state directory existed at the inspected
  standard locations. Backup contents are not stored in Git.
- Rechecked the release archive SHA-256:
  `00d2d4aa337caf8ed31ba9998abd6249fedf114672c33d3e88499c9531087eac`.
  Staged/verified the app and replaced `/Applications/Dildin Build Control.app`
  with the arm64 release. The original pre-swap bundle is also retained temporarily.
- Installed binary SHA-256:
  `61a9c458b2d950254f0345b462279a3eade7e244ee8a790d92e2c0cd13b5f8e8`.
- Launched the installed app through native UI automation. Settings confirms
  `v0.2.0-alpha.3`, full source SHA `2904b206360cad628370639e9e85259063177eb5`,
  clean sources, release profile, `aarch64-apple-darwin` and the executable under
  `/Applications`. No Gatekeeper setting, quarantine flag or permission was changed.
- Settings reports safe mock ready, real execution off and MCP isolated.
- Created a disposable project under the dedicated native-QA temporary directory.

## Native lifecycle verification

Test workspace: `/private/tmp/dbc-alpha3-native-qa-CQvSVa/project`, containing a
test README and generated `.dbc` artifacts. The non-Git workspace was explicitly
reported as unverified by preflight. A saved task used `mock_only` routing and the
advanced legacy-loop controls; every persisted step used `mock_adapter` / `mock`.
No live AI, external provider execution, credential change or project Git write ran.

1. Run `loop-1792927146984`: Stop settled at `stopped`, active step index 3, after
   plan/code/build passed once. The queued test step had no attempt. Quit/reopen
   preserved Stopped. Resume completed all seven steps, each with attempt count 1.
   The first three evidence files had identical SHA-256 before and after Resume:
   - `01-plan.json`: `caf206113b227547889e70df81e460f40cf63fa79e017757f19712a260a22575`
   - `02-code.json`: `f671c546bc2f095cb05972f4fe64676514a0802f5bc0b1a73da146d790f841f8`
   - `03-build.json`: `30fc43b0b7780c193303a2a3f6fda2ee5231aa597b2593ee95d59b2f90d69c9b`
2. Run `loop-1792927382236`: quit the native app during the unfinished run; process
   inventory confirmed exit and SQLite still recorded `running`, active index 4.
   Reopening started a new process (16973 before quit, 17414 after launch) and
   recovered the run to `interrupted`. Four completed steps remained at attempt 1;
   review was interrupted at attempt 0, later steps waiting at attempt 0. The run
   did not advance automatically across subsequent observations.
3. Retry did not work: clicking the enabled `Retry step` produced no confirmation,
   and focusing it with keyboard then pressing Enter also did nothing. SQLite
   remained Interrupted with no new attempt. Cancel/Confirm behavior could not be
   tested because no dialog appeared. This is a reproducible native UI finding,
   not a passing post-interruption continuation check.

### Findings and limits

- `src/App.tsx:1850` guards Retry with `window.confirm`. Static inspection of locked
  Wry 0.55.1's macOS `wry_web_view_ui_delegate.rs` found no JavaScript-confirm
  handler, and the application has no native dialog plugin. This is consistent
  with the UI failure; the WebView return value was not instrumented. A supported
  explicit confirmation must preserve the warning about repeated side effects.
- The Harness Runs helper badge still says Running for Stopped/Interrupted. The
  condition at `src/App.tsx:4374` treats any non-failed current loop as running;
  the detailed run status and stored state were correct.
- Native build identity and legacy-loop IPC were verified, not the complete Guided
  Harness workflow. No forced crash/SIGKILL, in-flight real subprocess cancellation,
  second-instance conflict, Intel launch or paid/live provider conformance was tested.
- UI automation initially typed an invalid workspace path; clipboard paste correctly
  imported the intended path. That extra test entry was removed from the current
  user state by the complete restoration below, not by altering individual records.
  This automation artifact is not evidence of an application text-input defect.

## Cleanup and final installed state

- Quit the app and verified no running DBC process before manipulating data.
- Preserved the complete test-session application data under the backup's
  `post-qa/Application Support` and WebKit state under `post-qa/WebKit`.
  The saved QA database passed `PRAGMA quick_check`: one completed test loop, one
  interrupted test loop and the five pre-existing failed loops.
- Restored original Application Support and WebKit snapshots; recursive byte
  comparisons matched before relaunch. Original backup snapshots were not changed.
- Preserved the disposable workspace and seven screenshots under `native-qa` in
  the persistent backup, plus rollback instructions in the backup's `ROLLBACK.md`.
  No user data or test evidence files are added to the repository.
- Relaunched `/Applications/Dildin Build Control.app`; final PID 17640. The original
  project is selected, Settings again confirms alpha.3 / `2904b20`, safe mock,
  real execution off, isolated MCP and local telemetry disabled. Current SQLite
  passes quick-check and contains only the original five failed loops, no QA loops.
  App is left open on Settings. Installed and rollback binary hashes still match.
- Removed only the empty temporary install-staging directory; the old application,
  all original data and the QA session remain recoverable.

## Files and checks

- Repository changes: `.agent/PLANS.md`, `.agent/memory/PROJECT_STATE.md`, and this
  worklog. State/plan now distinguish verified installed behavior from the Retry
  defect and untested native scenarios. No application source or release changed.
- Outside Git: app installation, private rollback copy, disposable QA workspace,
  screenshots and local test evidence. No private database contents enter memory.
- Checks: `git status`, installed plist/version/hash, process inventory, SQLite
  quick-check/status counts, release archive hash, recursive backup/staging diff,
  installed binary hash/architecture, native Settings identity, `pgrep`, read-only
  SQLite status/attempt counts, evidence SHA-256, native mouse/keyboard lifecycle
  actions, `git diff --check`, staged/unstaged inventory review.
- Native screenshots retained in the private backup's `native-qa`: installed-build,
  stopped-before-restart, stopped-after-restart, resume-completed,
  interrupted-after-restart, retry-no-dialog and final-installed-build.
- No source build or automated suite was rerun for this install-only task; release
  validation remains recorded in the separate alpha.3 release worklog.

## Remaining risks and manual verification

The release remains unsigned and non-notarized. Stop is not rollback. Recovery
safely preserves Interrupted without replay, but the native Retry action is broken;
do not rely on resuming interrupted work until a fix is verified. Older builds must
not use active/new lifecycle data without coordinated rollback to pre-update data.

After a fix, repeat with a disposable mock task: Stop, quit/reopen, Resume and verify
unchanged completed evidence; then quit an unfinished run, verify Interrupted, Cancel
Retry without any attempt, and explicitly confirm Retry with archived prior evidence
and preserved budgets. Follow with separately scoped real-process/crash/instance QA.

## Next action

Report partial verification honestly and propose a separate native Retry fix. The
installed release stays alpha.3; no unrequested code change, rollback, commit or push
was made. Proposed memory-only commit: `docs(memory): record alpha.3 native installation
and QA`, containing the three repository files above, pending explicit approval.
