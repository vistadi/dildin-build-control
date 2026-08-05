# Priority product improvements — 2026-08-05

## Task objective

Implement the previously identified DBC improvements in priority order, beginning with
trustworthy current-run state and then simplifying the primary operator workflow.

## Approved scope

- P0: prevent stale task/run context from leaking into Run, Approvals, and Evidence.
- P0: make readiness and the next action understandable across primary screens.
- P1: shorten onboarding and hide provider/policy diagnostics from the normal path.
- Add proportionate regression coverage and complete desktop/browser verification.
- Do not publish, push, sign, notarize, or commit without separate authorization.

## Initial repository state

- Branch: `main`, tracking `origin/main`.
- Working tree was already dirty.
- Existing changes included the project-state update and untracked audit, local-build,
  and product-audit records from earlier work.
- Source files were unchanged before this task.

## Plan

1. Trace HarnessRun identity through current UI state.
2. Implement P0 isolation and consistent readiness.
3. Compress Guided Run to three user stages.
4. Simplify Evidence, Approvals, and Settings.
5. Extend smoke coverage and run build, Rust, controlled-smoke, and browser QA.
6. Update durable project memory and prepare a commit proposal.

## Work completed

- Added reusable helpers that bind contracts, EvidencePacks, approvals, values, and loop
  state to the current HarnessRun.
- Removed stale global approval counts from primary navigation and current Run status.
- Reduced Guided Run to Describe, Run checks, and Decide; moved paths and acceptance
  criteria into an optional disclosure and added a live scope preview.
- Rebuilt Evidence around an explicit empty state, one current run, a decision summary,
  current-run checklist, and a read-only raw report disclosure.
- Rebuilt Approvals around only current-run decisions and a single next action.
- Simplified Settings to safe-mock readiness, CLI detection, real-execution state, and
  project contract actions; moved provider/policy/session controls under Advanced.
- Added keyboard focus, disclosure, responsive, and disabled-state styling using the
  existing design tokens and components.
- Expanded Guided Run smoke coverage from 22 to 28 assertions.

## Files created and modified

- Modified `src/App.tsx`.
- Modified `src/styles.css`.
- Modified `scripts/guided-run-smoke.mjs`.
- Modified `.agent/PLANS.md`.
- Modified `.agent/memory/PROJECT_STATE.md`.
- Modified `.agent/memory/DECISIONS.md`.
- Added this worklog.

## Commands and checks executed

- `pnpm build` — passed after correcting an initial TypeScript null-narrowing issue.
- `pnpm guided-run-smoke` — passed, 28/28.
- `cargo test --manifest-path src-tauri/Cargo.toml` — passed, 24/24.
- `pnpm controlled-smoke` — completed without external model calls.
- `pnpm dbc:verify -- --loop loop-1785922396438 --allow-existing-worktree-changes`
  — passed; the scope waiver was limited to the already dirty working tree.
- `pnpm tauri build` — produced the current arm64 `.app` and `.dmg`; the first sandboxed
  DMG packaging attempt failed, and the permitted native retry completed both bundles.
- `hdiutil verify` — passed for the new DMG; SHA-256 is
  `bc163d9746f0f5f1190dba1a96b9e49f1b273832161f2511b5b52f31a7379c75`.
- `diff -qr` and binary SHA-256 comparison — confirmed the installed app matches the
  generated bundle.
- Browser QA at `http://127.0.0.1:1420/` — completed the safe preview lifecycle through
  accepted EvidencePack, inspected primary views and 760 px layout, and found no console
  warnings or errors.

## Validation notes

- A default `dbc:verify` first selected an older loop and correctly reported that loop's
  failed scope gate. Verification was repeated against the newly generated controlled
  smoke loop explicitly and passed with the documented existing-worktree waiver.
- The browser preview remained clearly labelled and did not touch files or providers.
- The prior installed app was moved to
  `/private/tmp/dbc-desktop-backup-20260805-1238/Dildin Build Control.app`, the new bundle
  was installed, and its process was launch-checked successfully.
- No Developer ID signing, notarization, commit, or push was performed.

## Important discoveries

- The navigation approval badge was still global after the first P0 implementation;
  browser QA exposed it and it was corrected to use current-run identity.
- Technical select options remain present in the DOM while the native details element is
  closed, but the visual surface correctly hides them.

## Decisions made during implementation

- The primary surface must fail empty when current-run identity is missing instead of
  borrowing plausible data from legacy reports.
- Safe-mock readiness and real-provider availability are separate user-facing states.

## Unresolved risks

- Signed/notarized distribution remains blocked on Apple credentials and artifact checks.
- The installed application launches, but its full native workflow still needs a
  hands-on run; browser QA covered the complete deterministic journey.

## Manual verification steps

1. Build and install the new native bundle.
2. Start a bounded mock task and confirm Run shows only its loop.
3. Confirm Approvals and Evidence remain empty for a new project with no HarnessRun.
4. Generate an EvidencePack and verify accept/rework/reject is final and run-scoped.
5. Expand Advanced Settings and verify existing provider/policy tools remain usable.

## Recommended next action

Review the diff and approve a focused source-and-memory commit. Then rebuild and install
the desktop bundle for native QA before beginning signed distribution work.
