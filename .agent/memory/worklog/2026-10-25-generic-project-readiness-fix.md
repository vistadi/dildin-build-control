# Generic project readiness and provider YAML compatibility

## Objective and authority

Fix the two blockers reproduced by the alpha.4 README example and repeat a bounded
live test. Maintainer approved implementation, no commit/push/release, at most
eight AI calls, no dependency installation in the test project, restore safe mock.
Separately approved adding the standard `yaml` dev dependency to DBC itself.

## Initial state and plan

`main` at `0a05edf`; four existing memory edits from the preceding investigation
are preserved (PLANS, PROJECT_STATE, OPEN_QUESTIONS and its worklog).
Installed alpha.4 remains unchanged. No applicable on-disk AGENTS.md found.

1. Share structural provider parsing/profile serialization across Node helpers.
2. Separate distribution evidence from project readiness; preserve human,
   task/scope/budget, baseline and provider execution gates.
3. Add negative/round-trip regression coverage; run existing local checks/builds.
4. Exercise a separate development binary and fresh synthetic project, without
   replacing the installed release or bypassing guards. Preserve/restore app data.
5. Record actual outcomes, remaining risks, changed files and proposed commits.

## Implemented changes

- Added `yaml` 2.9.1 as a development dependency, with lifecycle scripts disabled.
  Only DBC's manifest/lockfile changed; no dependencies were installed in the fixture.
- Replaced ten layout-specific provider parsers with shared structural parsing.
  Supports native/legacy YAML and JSON, typed or legacy quoted enabled booleans,
  reordered fields and nested metadata. Rejects malformed/multiple documents,
  duplicate keys/IDs, aliases and unsupported tags without exposing source snippets.
- Profile generation changes mode/timestamp structurally, preserving unrelated
  configuration. Real mode still requires matching operator approval.
- Native and Node project checklists treat missing/incomplete local distribution
  as informational. Baseline, provider, task/budget, comparison, approval, ledger
  and preflight gates remain; release/system audit retains distribution checks.
  The native release command now explains that Tauri packaging is optional for tasks.
- Added validated `--task-file` input to the real-micro plan. Historical default
  remains budget 1; the test explicitly used approved budget 2 = eight CLI calls,
  not dollars. The default seven-step route requires six AI calls plus local build.
- Added the exact native serializer fixture, native negative guard tests, Node
  round-trip/project regression tests, CI/release-quality wiring and operator docs.
- Built an isolated arm64 debug app named `DBC Readiness QA`, label
  `generic-readiness-qa`, identifier `com.dildin.build-control.readiness-qa`.
  Settings correctly identifies dirty sources at `0a05edf`; it is not alpha.4.

## Commands and local validation

Used the bundled Node runtime at
`/Users/vitaliy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`
and existing Cargo. No source-control publication was performed.

- Approved `pnpm add -D yaml@^2 --ignore-scripts` completed; lockfile changes are
  limited to the yaml importer/package/snapshot. Initial pnpm self-management
  startup was interrupted; installation used `npm_config_manage_package_manager_versions=false`.
- `node scripts/project-readiness-smoke.mjs` passed, including native/legacy/JSON/CRLF,
  negative parsing, profile preservation, ordinary-project readiness, approved
  explicit budget, rejected scope, missing approval and blocked readiness cases.
  Synthetic gate fixtures exist only inside the automated test's own temp directory;
  none were copied into the actual live project.
- `cargo fmt --manifest-path src-tauri/Cargo.toml` and
  `cargo test --offline --manifest-path src-tauri/Cargo.toml`: **63 passed, 0 failed**.
  New tests cover exact native serialization and preserved approval/readiness guards.
- TypeScript checking and Vite production build passed.
- Existing guided-run, provider-adapter, MCP policy, MCP proxy, API adapter,
  UI quality, native contract, loop lifecycle and performance-budget smokes passed.
- Performance output: JS 428642 bytes / 117014 gzip; CSS 41704 / 8368 gzip.
- Separate Tauri `build --debug --bundles app --no-sign`, offline Rust build,
  explicit isolated product/identifier config and empty beforeBuildCommand passed
  using the already verified frontend dist. Bundle remains under ignored target/.
- Final readiness smoke and `git diff --check` passed after dead-parser cleanup.
  Staged diff is empty. No remote CI/CodeQL result is claimed for local edits.
- Final repeat of Cargo format check/tests passed (63/63); duplicate-ID parsing
  regression uses independent objects so YAML alias rejection cannot mask it.
  All changed JavaScript files passed syntax checks. Reviewed all 27 pending files;
  credential-pattern scan found no matches, and no cache/build/live artifact is
  in the proposed inventory. This bounded check is not an exhaustive secret audit.

## Actual native retest

This section records the pre-login checkpoint. The later authorized Retry and
final blocked acceptance are recorded in `2026-10-25-real-provider-retry-after-login.md`.

Fixture: `/private/tmp/dbc-readiness-live-j8i6j9/project`; task JSON and original
README stored alongside, outside the scoped project. No Git repository was initialized.
Only README, dependency-free Node assertions, package scripts, scope instructions
and generated `.dbc` data were involved; no personal project files or secrets.

1. Ran genuine controlled baseline `loop-1792944065273`; accepted with the actual
   local `pnpm build` assertion. Generated profiles, provider contracts, readiness,
   explicit micro plan, comparison and revert reports using repository helpers
   with the fixture as cwd. No reports were fabricated to bypass a guard.
2. Imported into the isolated app and used native Sync config. Helpers subsequently
   parsed all four native-saved providers; readiness passed. Native Checklist
   reported zero blockers. Non-Git/scope verification warnings remained visible.
3. Set two exact local Node checks, reviewed task/scope/budget, approved and applied
   the real profile. Initial dry-run correctly required the approval ledger; the
   official helper generated it from actual recorded decisions. Native Dry-run then
   reported ready_to_run. Only then was Run approved used.
4. Actual native loop `loop-1792954022432` results:

   | Step | Provider | Attempts | Result |
   | --- | --- | ---: | --- |
   | plan | Codex real | 1 | passed |
   | code | Codex real | 1 | passed |
   | build | local terminal | 1 | passed; both assertions exited 0 |
   | test/QA | Claude real | 1 | failed: Not logged in |
   | review | Claude | 0 | waiting |
   | security | Claude | 0 | waiting |
   | accept | Codex | 0 | waiting |

5. Independent `check.mjs` and `verify.mjs` passed. Actual diff is exactly
   `Status: pending` to `Status: verified`. SHA-256 comparisons confirm AGENTS.md,
   check.mjs, verify.mjs and package.json are unchanged. Non-Git empty diff artifacts
   are not used as proof of scope enforcement.
6. Read-only Claude auth probes, ordinary and safe-mode, both returned loggedIn=false.
   The earlier investigation's positive auth probe does not certify current login;
   no cause of this change is established. The user was asked to log in themselves.
   No credentials were read, copied or entered on their behalf.

**Three of eight AI CLI invocations used:** two successful Codex calls and one Claude
invocation failing before authentication. This is not a claim of three billed model
responses. No Retry occurred and no further AI call is allowed until login is fixed.
Full review/security/acceptance and full end-to-end success are not verified.

Codex used workspace-write sandbox, explicit fixture cwd, ephemeral execution and
ignore-user-config. Claude used safe-mode, Read-only tools, plan permission mode and
no session persistence. MCP/external user customization was not enabled. The checks
ran with the existing absolute Node executable; there was no dependency installation
in the fixture, commit, push, release or secret access.

### Fixture and tooling corrections

An initial handcrafted mock/local provider fixture omitted command/argsTemplate.
This made Settings fail to render; adding the contract's string fields corrected
the fixture. Only isolated QA WebKit was moved to a recoverable temp directory before
re-import. This does not establish a product fix for malformed-config UI resilience.
One QA app-selection tool call stalled for roughly 2.7 hours; no model ran during
that stall. Later UI interactions were responsive. Neither issue is hidden as a
successful first attempt.

## Safe-state restoration and private preservation

- Used native Mock, verified zero real CLIs, then Settings: safe mock, real execution
  off, telemetry off. Revert helper reported reverted, zero blockers, one warning
  for the honestly failed live loop. QA closed normally; process exit confirmed.
- Persistent private copy:
  `/Users/vitaliy/Library/Application Support/DBC Backups/2026-10-25-readiness-fix-D7Dva5`.
  Contains the project, task JSON, original README, two screenshots, isolated
  Application Support/SQLite and WebKit. Recursive byte comparisons passed.
  Raw live evidence and app data are not added to Git.
- Original temporary project remains available for retry of the same failed loop;
  the copied project is evidence, not a second active run target. Do not restore
  QA state over production data. The local pnpm cache was moved out of the repository
  to `/private/tmp/dbc-readiness-live-j8i6j9/pnpm-local-cache`, not deleted.
- Installed `/Applications/Dildin Build Control.app` was never replaced.
  Its executable still hashes to
  `7fcde40baaa5f82916e1a1af03c8ea5379c72a513b92a9cc81ef1efefb4fd02b`.
  Original production SQLite byte-matches the preceding restored backup and has
  only five original failed loops. No production data restoration was needed.

## Decisions, remaining risks and manual continuation

The accepted project-vs-distribution/YAML decision is appended to DECISIONS.md;
the corresponding design question is resolved. Installed alpha.4 still contains
the two blockers until a separately approved release/update. This is a local fix,
not a signed/notarized or remotely verified release.

At this checkpoint, maintainer needed to run `claude auth login`, then report ready. Confirm
ordinary and safe-mode auth without printing account details; re-open the separate
QA bundle, preserve the approved fixture/task/budget and retry only the existing
failed step with the native confirmation. At most five CLI invocations remain.
Do not restart the loop, silently increase the allowance, bypass gates, or claim
the primary Guided Harness is live: this test uses the advanced legacy-loop path.
Restore Mock and update evidence/memory after any continuation.
This continuation subsequently ran without replaying passed work; the follow-up
worklog supersedes these pending-login instructions. Final usage is 7/8, acceptance
is blocked, and no further call is planned against unchanged evidence.

Real process Stop/Resume, forced crash, Intel native QA and full Guided Harness
remain outside this test. Provider auth can change between probes and invocation;
version/help/contract success alone is not execution readiness. Malformed native
config UI resilience and stale preflight display after switching Mock merit a
separately scoped follow-up; runtime revalidation must not be weakened.

## Exact changed-file inventory and proposed commits

### Login-confirmation follow-up, 2026-10-25

- User reported completing Claude login. Rechecked Git/memory and the failed loop
  read-only; its step attempts and safe-mock provider configuration are unchanged.
- Unrestricted, 15-second-bounded `auth status` probes of the exact configured
  `/Users/vitaliy/.local/bin/claude`, normal and `--safe-mode`, both returned
  exit 1, loggedIn=false, authMethod=none. Only those fields were printed.
- Shell resolution points to this same executable, resolving to installed 2.1.195.
  Checked common alternative executable locations; no second install found there.
  The process uses the normal user home and default Claude config directory, with
  no API-key/OAuth-token/auth-token/base-URL environment override present. No
  credential values or config contents were read. Login/status help was inspected.
- No retry, model request, desktop launch, config change, dependency install or
  production mutation was performed. Cumulative allowance remains 3/8 used, 5 left.
  User must complete CLI login for this exact installation and confirm status before
  resuming the failed step. This observation does not establish why login differs.
- This continuation began with all 27 previously pending files; only PLANS,
  PROJECT_STATE and this worklog were updated. No commit, stage, push or release.

### Combined implementation inventory

No commits are authorized or created; nothing is staged or pushed. Branch stays
`main` at `0a05edf`. The tree began dirty with the four preceding investigation
memory files noted above. All changes below remain in the working tree.

Proposed commit 1: `fix(readiness): support ordinary projects and native provider YAML`

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `package.json`
- `pnpm-lock.yaml`
- `src-tauri/src/main.rs`
- `docs/REAL_PROJECT_READINESS.md` (new)
- `scripts/lib/providers.mjs` (new)
- `scripts/lib/distribution-evidence.mjs` (new)
- `scripts/lib/micro-task.mjs` (new)
- `scripts/fixtures/providers-native-sync.yaml` (new)
- `scripts/project-readiness-smoke.mjs` (new)
- `scripts/operator-checklist.mjs`
- `scripts/provider-contracts.mjs`
- `scripts/provider-profile.mjs`
- `scripts/provider-sessions.mjs`
- `scripts/real-micro-plan.mjs`
- `scripts/real-micro-preflight.mjs`
- `scripts/real-micro-runbook.mjs`
- `scripts/real-readiness.mjs`
- `scripts/revert-evidence.mjs`
- `scripts/system-audit.mjs`

Proposed commit 2: `docs(memory): record readiness fixes and bounded live verification`

- `.agent/PLANS.md`
- `.agent/memory/PROJECT_STATE.md`
- `.agent/memory/DECISIONS.md`
- `.agent/memory/OPEN_QUESTIONS.md`
- `.agent/memory/worklog/2026-10-25-real-provider-example.md`
  (already untracked before this implementation; preserved unchanged)
- `.agent/memory/worklog/2026-10-25-generic-project-readiness-fix.md` (this file)
- `.agent/memory/worklog/2026-10-25-real-provider-retry-after-login.md` (follow-up)

Review both inventories and obtain explicit approval before creating commits;
push/PR/release require their own authorization. Do not include fixture output,
bundles, local dependency cache, raw logs or any auth material in Git.
