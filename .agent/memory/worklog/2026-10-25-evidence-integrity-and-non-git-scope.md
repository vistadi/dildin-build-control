# Evidence integrity, finding semantics and non-Git scope

## Objective and approved scope

Implement the three blockers found by the bounded real-provider example: actual
inter-step evidence handoff, false secret findings from redaction markers, and
scope verification without Git. Add and run local regression tests. User explicitly
forbids new AI invocations, commits, push and release. No app replacement, live
fixture rerun, auth access or modification of historical evidence is included.

## Initial repository state

2026-10-25, branch main at 0a05edf3a80eccafae3b178edd356b40ec919895. Tree already
has 28 pending files from the preceding readiness/YAML implementation and reports.
No applicable on-disk AGENTS.md found; conversation instructions apply. Read
PROJECT_STATE, OPEN_QUESTIONS, relevant DECISIONS, active plans and the live Retry
worklog. Current source/tests override stale memory. All prior edits are preserved.

## Plan

1. Add run-bound evidence references/validation and deterministic stale/tampered
   reference tests. Do not equate citations with proof of provider tool execution.
2. Retain broad redaction while distinguishing actual credential indicators and
   benign masking; cover recursive report echoes and genuine synthetic indicators.
3. Add bounded filesystem fingerprints before a new non-Git run starts; compare
   allowed and disallowed paths without following symlinks or reading secret files.
   Missing/old/incomplete baselines must not become retrospectively verified.
4. Exercise local mocked/native backend paths, offline tests/builds, Git diff and
   secret-pattern review. No Codex/Claude/Kimi/Qwen model CLI or new live call.
5. Record exact files/checks/results, compatibility limitations and proposed commits.

## Work completed

1. Added `evidence_handoff.rs`: actual passed-step artifacts/evidence are validated
   against current run/task/spec/provider/attempt and SHA-256 pins. Each real CLI
   attempt receives a preserved input packet with relative paths, hashes and bounded
   redacted result summaries. Required reviewers must cite all exact references;
   duplicate, stale, missing, legacy or tampered inputs fail closed. Final acceptance
   revalidates the chain, including the final step itself. Prompt expectations are
   no longer labelled as executed evidence. Citations do not prove actual tool reads.
2. Added `secret_diagnostics.rs`: preserve broad masking but separate it from actual
   credential indicators. Legacy marker echoes no longer create high findings.
   Typed masked indicators retain blocking classification and are deduplicated by
   source/kind. JSON reports, including JSON embedded in stream `finalText`, retain
   their schema after redaction; stdout/stderr/normalized reports are masked too.
3. Added `workspace_fingerprint.rs`: bounded SHA-256/metadata file comparison, with
   metadata-only handling for denied/sensitive paths, no static symlink following,
   safe relative reads and explicit incomplete results. New non-Git runs pin a
   baseline before any attempt. Existing/late baselines cannot be replaced or
   retrospectively certified. Task edits, baseline edits, outside/denied changes,
   unreadable/oversized/unsupported files and scan limits block verification.
4. Integrated additive SQLite pins, pre/post executable-step scope checks, truthful
   non-Git changed-file reports, and the acceptance integrity gate in `main.rs`.
   The existing Stop/Retry fixture now places the DB outside the workspace and
   captures the real pre-execution baseline instead of bypassing the new guard.
5. Documented compatibility, attestation limits, redaction semantics and the new
   non-Git contract. Updated current memory without changing historical test files
   or claiming that installed alpha.4 contains these fixes.

## Files created/modified by this task

Runtime/tests (tests are embedded Rust unit/integration-style modules):

- `src-tauri/src/main.rs` — overlaps the preserved earlier readiness changes.
- `src-tauri/src/evidence_handoff.rs` — new.
- `src-tauri/src/secret_diagnostics.rs` — new.
- `src-tauri/src/workspace_fingerprint.rs` — new.
- `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` — direct `sha2`/`regex` dependencies
  reuse existing locked/cache versions; lock changes only the root dependency list.
- `docs/REAL_PROJECT_READINESS.md` — extends the existing uncommitted readiness doc.

Memory:

- `.agent/PLANS.md`
- `.agent/memory/PROJECT_STATE.md`
- `.agent/memory/DECISIONS.md`
- `.agent/memory/OPEN_QUESTIONS.md`
- `.agent/memory/worklog/2026-10-25-evidence-integrity-and-non-git-scope.md` — new.

Earlier workflow/YAML/script/package edits and three earlier worklogs remain
untouched by this task. No frontend source, installed app, QA bundle, production
SQLite, auth files or historical live fixture was changed. Build products and local
smoke reports are ignored outputs, not publication inputs.

## Commands and validation results

Absolute bundled Node and Cargo paths were used because Node is not on shell PATH.
No dependency installation or network access was needed for these checks.

- `cargo fmt --all`, then `cargo fmt --all -- --check`: passed.
- `cargo test --offline --quiet`: **75 passed, 0 failed**, 12 tests added beyond the
  prior 63-test readiness baseline. Tests run in fresh disposable directories.
- `cargo build --offline`: passed, local debug executable only, no install/bundle.
- TypeScript `tsc --noEmit` and Vite production build: passed.
- Ten Node checks passed: project-readiness-smoke, guided-run-smoke,
  provider-adapter-contract-smoke, mcp-policy-contract-smoke, mcp-proxy-smoke,
  api-adapter-contract-smoke, ui-quality-smoke, native-contract-smoke,
  loop-lifecycle-smoke and performance-budget. Type-stripping flag used where
  applicable. Proxy fixtures use local subprocesses, no remote server/model calls.
- `git diff --check`: passed; staged diff empty. Reviewed source/dependency/memory
  diffs and synthetic secret fixtures. No credential values or private live logs
  were copied to the changes. No remote CI/CodeQL was run.

Intermediate tests were not all green: the original Stop fixture lacked a baseline
and was correctly blocked; fixture setup was corrected without weakening Stop
assertions. Tightening placeholder detection exposed a `<reference>` fixture;
explicit placeholder support was restored without ignoring arbitrary bracketed
credential values. The final full test run above passed after both fixes.

## Deterministic end-to-end result

The test pipeline uses `/bin/sh` for a one-line README change/local check and
`/bin/cat` to return synthetic reviewer JSON. These are **not AI invocations**.
Missing citations reject review. Native Retry with exact current-input citations
completes the same run, leaves passed build evidence byte-identical and has attempt
counts `[1, 1, 2, 1]`. Synthetic approvals exist only in that deleted unit fixture.
All acceptance gates pass; the non-Git report lists README and reports a dirty
workspace. Altering an earlier artifact makes final acceptance blocked. Separate
tests verify no command starts with out-of-scope input changes and an executable
step creating an outside file cannot pass after execution.

Additional regressions cover foreign run/task/spec/attempt/version/status, missing
files, duplicate references, typed credential retention, 100 harmless legacy-marker
echoes, schema preservation, add/modify/delete, `.env` metadata-only detection,
task/baseline tampering, no retrospective pin, unreadable files, size/byte limits,
parent/generated symlinks, path traversal and known SHA-256 output.

## Limits, manual verification and next action

- Historical real-provider loop remains failed/blocked and seven of eight original
  calls remain consumed. **Zero new AI calls** in this task; the unused allowance
  is not permission for a new call under the current explicit restriction.
- No desktop window was driven or installed application replaced. Local process
  coverage is not a fresh native UI/live-provider certification. The next approved
  manual test should use a separately identified QA bundle/new disposable project,
  verify actual incoming references, perform Retry/restart and inspect final
  evidence without modifying the historical failed run.
- Legacy v1 steps or unpinned baselines remain unverified. Do not backfill a fake
  baseline or overwrite history; a new run is needed for new guarantees.
- Filesystem comparison is not an OS sandbox: metadata-only sensitive checks,
  generated namespace exclusions, concurrent changes and reverted transient writes
  limit guarantees. Evidence pins assume SQLite is trusted. Bounds and heuristic
  credential detection are documented in REAL_PROJECT_READINESS.
- Do not claim zero findings is a complete audit or matching citations are proof
  of tool execution. The generic stream's incomplete tool trace remains a limitation.

## Git preservation and proposed future commits (not executed)

Branch remains `main` at `0a05edf3a80eccafae3b178edd356b40ec919895`. Initially dirty:
28 pending files; final inventory: 34 pending files, six newly introduced paths in
this task. All changes remain uncommitted, staged area empty. No commit, amend,
branch change, push, PR, merge, tag or release was performed.

Suggested grouping, only after explicit approval and a fresh overlapping-diff review:

1. `fix(runtime): bind step evidence and verify non-git scope`
   - `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`
   - `src-tauri/src/main.rs` (only this task's hunks)
   - `src-tauri/src/evidence_handoff.rs`, `src-tauri/src/secret_diagnostics.rs`,
     `src-tauri/src/workspace_fingerprint.rs`
   - `docs/REAL_PROJECT_READINESS.md` (this task's section after earlier doc is saved)
2. `docs(memory): record local evidence integrity verification`
   - `.agent/PLANS.md`, `.agent/memory/PROJECT_STATE.md`,
     `.agent/memory/DECISIONS.md`, `.agent/memory/OPEN_QUESTIONS.md`
     (only this task's changes after earlier memory is saved)
   - this worklog.

Earlier readiness/YAML implementation and historical test documentation need their
own approval/checkpoint first; whole-file staging of overlapping files would mix
work. This is a proposed inventory, not a claim of saved Git history. No approval
request is needed now because the current user explicitly prohibits commits.
