# Readiness and evidence publication

## Objective, authority and initial state

The maintainer explicitly requested commits of all verified readiness/evidence
fixes, push to a separate branch and a PR targeting main. No new AI calls, merge,
tag, release, installed-app or live-fixture changes are authorized.

Initial branch main at 0a05edf3a80eccafae3b178edd356b40ec919895; 34 pending files,
staged area empty. All pending paths belong to the approved implementation and
its recorded investigations. Read current plans/state/questions, relevant accepted
decisions and the readiness, Retry and evidence worklogs. No on-disk AGENTS applies.
Remote main was verified at the same SHA; the new branch did not exist remotely.
Created `codex/readiness-evidence-integrity`, preserving the working tree.

## Plan and exact commit inventories

1. `fix(readiness): support ordinary projects and native provider YAML`
   - `.github/workflows/ci.yml`, `.github/workflows/release.yml` (quality checks only)
   - `package.json`, `pnpm-lock.yaml`
   - `scripts/operator-checklist.mjs`, `scripts/provider-contracts.mjs`,
     `scripts/provider-profile.mjs`, `scripts/provider-sessions.mjs`,
     `scripts/real-micro-plan.mjs`, `scripts/real-micro-preflight.mjs`,
     `scripts/real-micro-runbook.mjs`, `scripts/real-readiness.mjs`,
     `scripts/revert-evidence.mjs`, `scripts/system-audit.mjs`
   - `scripts/lib/providers.mjs`, `scripts/lib/distribution-evidence.mjs`,
     `scripts/lib/micro-task.mjs`, `scripts/fixtures/providers-native-sync.yaml`,
     `scripts/project-readiness-smoke.mjs`
   - readiness-only hunks in `src-tauri/src/main.rs` (five independent hunks).
2. `fix(runtime): bind step evidence and verify non-git scope`
   - remaining evidence/runtime/test hunks in `src-tauri/src/main.rs`
   - `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`
   - `src-tauri/src/evidence_handoff.rs`, `src-tauri/src/secret_diagnostics.rs`,
     `src-tauri/src/workspace_fingerprint.rs`
   - `docs/REAL_PROJECT_READINESS.md` (combined verified operator contract).
3. `docs(memory): record readiness and evidence verification`
   - `.agent/PLANS.md`, `.agent/memory/PROJECT_STATE.md`,
     `.agent/memory/DECISIONS.md`, `.agent/memory/OPEN_QUESTIONS.md`
   - `.agent/memory/worklog/2026-10-25-real-provider-example.md`
   - `.agent/memory/worklog/2026-10-25-generic-project-readiness-fix.md`
   - `.agent/memory/worklog/2026-10-25-real-provider-retry-after-login.md`
   - `.agent/memory/worklog/2026-10-25-evidence-integrity-and-non-git-scope.md`
   - this publication worklog.

After publication, record the observed PR/SHAs in a follow-up memory-only commit
if needed; only PLANS, PROJECT_STATE and this worklog. This is part of the approved
publication workflow, not a code/release change. Do not amend existing commits.

## Verification before committing

Fresh combined-tree rerun: 75 Rust tests passed offline; TypeScript, Vite and all
ten smoke suites passed (readiness, guided run, provider, MCP policy/proxy, API,
UI, native contracts, loop lifecycle, performance). No model CLI was invoked.
Partial native staging separates readiness from evidence without rewriting source.
Staged diff, formatting, dependency/fixture/memory hygiene and final Git checks
are performed before each commit. Exact outcomes and publication IDs follow below.

The readiness-only index was exported into a new disposable directory; its 63 Rust
tests and project-readiness smoke passed independently. The full-tree offline debug
build and format check passed again. The two implementation staged inventories
(20 and 7 paths) had clean diff checks and zero bounded credential-pattern matches.
No ignored build outputs, DBs, caches or live artifacts were staged. GitHub main is
still the original base, and there was no existing PR for the new head branch.

Implementation commits created:

- `cbae019ccf5a6357b31ba6ec6931a9fb828feb57` — readiness inventory above.
- `19baab02f5bb480bc3c2f75c20a6a8f1c8d522cc` — evidence inventory above.

## Important limits and continuation

The historical live test remains failed/blocked, with seven of eight calls used.
Local deterministic tests do not certify new live-provider behavior or installed
alpha.4. Citations are not proof of tool reads; non-Git snapshots are bounded
comparisons, not a sandbox. Preserve historical worklogs and private snapshots.

No new architectural decision is introduced; the two accepted readiness/evidence
decisions remain. This request supersedes their earlier no-commit/no-push restriction
only for publication. Existing AI/merge/release restrictions remain active.

## Publication result

- Documentation checkpoint `de3e62afe75733f7badc3f0b43ed7dbbdbb79d97`
  (`docs(memory): record readiness and evidence verification`) created after staged
  review: nine memory files, clean diff check and zero bounded credential matches.
- Normal SSH push created `origin/codex/readiness-evidence-integrity` at `de3e62a`.
  `git ls-remote` verified both that SHA and unchanged main `0a05edf`.
- Connector PR creation returned HTTP 403 (resource inaccessible to integration).
  Existing signed-in browser session successfully submitted the ordinary GitHub
  PR form. No auth, permissions, protections or connector settings were changed;
  no Copilot title generation/review was invoked.
- Created https://github.com/vistadi/dildin-build-control/pull/20 at
  2026-10-25T20:35:39Z, title `fix: harden project readiness and evidence integrity`.
  Attached to this chat. Independent API verification: open, non-draft,
  merged=false; base main at `0a05edf`; head `codex/readiness-evidence-integrity`
  at `de3e62a`; three commits and 35 changed files. The reported temporary merge
  preview SHA is not a merge into main.
- Initial-head CI `40231506333` and CodeQL `40231506334` are in progress. No
  successful remote checks or alert-free result is claimed. This final memory-only
  checkpoint will have its own head checks, which must be inspected separately.
- Final follow-up inventory: only PLANS, PROJECT_STATE and this worklog;
  message `docs(memory): record readiness and evidence PR publication`.
  No amend/force-push, main push, merge, auto-merge, tag, release or model CLI call.

The initial 34 pending files are now preserved in Git with this added publication
worklog (35 changed paths relative to main). Runtime source did not change during
publication. Recommended next action: inspect CI/CodeQL and review on the exact
latest PR head; request separate approval before merge/release or any live test.
