# PR #18 merge and alpha.3 release

## Objective and approved scope

The maintainer requested merge and release, superseding the earlier no-merge and
no-release restriction. Merge verified PR #18, prepare the next unsigned macOS
prerelease, and verify its quality gate, architecture assets and checksums.
Installed-app replacement, live-provider calls, expanded permissions, signed
distribution and native-window end-to-end certification are not included.
The maintainer explicitly approved the two proposed local release/memory commit
groups, push to `main` and the new tag on 2026-10-25; no new local commit has been
created at this pre-commit checkpoint.

## Initial repository state

- Clean `codex/durable-stop-resume` at `9c1cebcf262b99c4dc7a07cf842d0527f1e18a75`.
- Remote/local main baseline: PR #16 merge `3b21f74`.
- PR #18 contained runtime `5110d0a` and memory `9c1cebc` (26 files).
- Latest published prerelease: `v0.2.0-alpha.2`; the alpha.3 tag did not exist.
- Package/Tauri/Cargo numeric versions all remain `0.2.0`.

## Plan

1. Recheck exact-head CI/CodeQL, reviews and mergeability; merge without bypasses.
2. Update changelog, signing documentation and durable project memory.
3. Validate release metadata and review exact diffs before approved commits/push.
4. Create the new immutable tag, verify Release quality and both macOS jobs.
5. Verify six assets and DMG checksum manifests; record actual outcomes separately.

## Completed work and evidence

- Rechecked all five checks at `9c1cebc`: Rust tests, frontend build, both CodeQL
  language analyses and aggregate CodeQL succeeded. Aggregate check `120973402414`
  reported no new alerts in changed code, with zero annotations.
- CI run: <https://github.com/vistadi/dildin-build-control/actions/runs/40127899814>.
- CodeQL run: <https://github.com/vistadi/dildin-build-control/actions/runs/40127899761>.
- Review and review-thread lists were empty. Rust check's only annotation was an
  informational Ubuntu runner-image migration notice, not a failing source finding.
- Connector merge returned HTTP 403. Normal merge in the signed-in browser succeeded
  without any permission change or check bypass. GitHub API confirmed PR #18 merged
  at `2026-10-25T09:01:42Z` as `66dcf66de3d1d67856c721c2a167b340d3747b10`.
- Fetched `origin/main`, switched the clean checkout to `main`, and fast-forwarded
  it to the actual merge commit. The feature branch was not deleted.
- Prepared alpha.3 changelog including native execution hardening, durable lifecycle,
  build diagnostics, verification boundaries and older-instance compatibility.
- Corrected a documentation conflict: `docs/RELEASE_SIGNING.md` claimed Apple
  variables were passed with an empty-secret unsigned fallback, while the executable
  workflow deliberately omits them after alpha.1 packaging failures. The workflow
  is authoritative; no signing behavior was changed.
- Post-merge CI `40178962148` passed at `66dcf66`. On the approval continuation,
  all four main check runs (Rust tests, frontend build, both CodeQL analyses) were
  completed successfully; this is separate from the five passing PR-head checks.
- The approval continuation started on `main` with only the six known release
  preparation files uncommitted. No unrelated changes were present. Remote `main`
  still pointed to `66dcf66` and the alpha.3 tag was still absent.

## Files changed by this task

- `CHANGELOG.md`
- `docs/RELEASE_SIGNING.md`
- `.agent/PLANS.md`
- `.agent/memory/PROJECT_STATE.md`
- `.agent/memory/DECISIONS.md`
- `.agent/memory/worklog/2026-10-25-pr18-merge-and-alpha3-release.md`

`OPEN_QUESTIONS.md` was inspected; existing native/provider/signing questions remain
unresolved and no duplicate question was added.

## Commands and checks

- `git status --short --branch`: clean before work and after fast-forward.
- GitHub exact-head checks, check annotations, PR/reviews/review threads, release
  listing and tag matching-ref reads: results recorded above.
- `git fetch origin main`, `git switch main`, `git merge --ff-only origin/main`:
  successful; no reset, force-push or history rewrite.
- Inspected release workflow, release metadata check, package versions, changelog,
  signing guide, plans, state, decisions, questions and relevant previous worklogs.
- `node scripts/release-check.mjs v0.2.0-alpha.3` using the bundled Node runtime:
  passed; package/Tauri/Cargo versions agree at `0.2.0` and the tag heading exists.
- `git diff --check`: passed. Reviewed all five tracked diffs and the new worklog;
  staged diff is empty. No credentials, generated assets or unrelated edits found.
- No runtime code changed in release preparation; local application tests were not
  rerun. Exact-head PR CI and post-merge CI provide the current remote test evidence.
- Tag push, Release workflow and artifact/checksum verification: not yet performed.

## Decisions, risks and manual verification

- Use `v0.2.0-alpha.3` without a numeric version bump, following the existing alpha
  convention and build-label implementation. Existing tags remain immutable.
- Unsigned/non-notarized distribution remains explicit. Do not publish Homebrew
  instructions as verified signed distribution or infer signing from compilation.
- Packaged native IPC, actual restart/crash and second-launch UX still need manual
  testing. Automated 60-test Rust coverage and browser fixtures are not that test.
- Stop is not rollback; inspect external effects/processes before Retry, and close
  older DBC instances that do not honor the new lease.
- Manual follow-up: download the matching architecture and manifest, verify SHA-256,
  inspect Settings build label/SHA, then test Stop/Resume, interrupted recovery and
  second-launch behavior in a disposable workspace before normal use.

## Recommended next action

Commit the approved release preparation, push and publish the new tag. Verify
release jobs/assets before recording the approved outcome-memory commit.
