# PR #20 merge and alpha.5 release

## Objective and approved scope

Merge green PR #20 into main, prepare the next unsigned macOS prerelease through
the existing workflow, and verify publication/artifacts. The maintainer explicitly
approved both commit inventories below, push to main and the alpha.5 tag. No new
AI calls, installed-app replacement, expanded permissions, signing claims or live
fixture changes. Preserve old tags and all historical failed outcomes.

## Initial repository state

- Clean `codex/readiness-evidence-integrity` at
  `f6ff4daab91ae2b476a2bf23367eefc6ad63c66f`; staged area empty.
- Main baseline `0a05edf3a80eccafae3b178edd356b40ec919895`; PR #20 has five commits
  (`cbae019`, `19baab0`, `de3e62a`, `face710`, `f6ff4da`) and 36 changed paths.
- Latest published release alpha.4; GitHub matching-ref lookup returned no alpha.5.
- Package/Tauri/Cargo versions remain 0.2.0; existing tag workflow is unsigned.
- Read plans/state/questions, relevant decisions, PR #20 and prior release worklogs,
  release workflow, metadata checker, signing guide and readiness compatibility doc.
  No on-disk AGENTS applies; the maintainer's conversation instructions apply.

## Plan

1. Recheck exact-head CI/CodeQL, reviews and mergeability.
2. Merge preserving commits and fast-forward the clean local main.
3. Prepare/validate the five-file release checkpoint, commit/push and tag.
4. Verify release quality, arm64/x64 packages, six assets, checksums and identities.
5. Commit/push actual results in the approved three-file memory checkpoint.

## Work completed

- All five exact-head checks on `f6ff4da` succeeded. CI `40232300734` confirms 75
  Rust tests, formatting, frontend build/smokes and deterministic EvidencePack
  verification. CodeQL `40232300445` and aggregate `121286638659` succeeded with
  no new alerts in changed code. Review-thread list empty, PR open/mergeable.
- Connector merge returned 403 (integration lacks permission). The already signed-in
  browser showed all checks passing and no conflicts. Normal merge succeeded with
  no access/protection changes, branch deletion or history rewrite.
- API confirmed merge at `2026-10-25T20:54:24Z`, commit
  `a08b3625fb5a4de89a45552fb62de6dd5a9ebfe8`. UI also shows merged/closed.
- Fetched origin/main, switched the clean checkout to main, fast-forwarded to that
  exact merge. All five original commits remain in history.
- Prepared alpha.5 changelog covering readiness/YAML, current-run evidence pins,
  typed credential findings, non-Git scope, compatibility and honest test limits.
- Signing docs already match the unsigned workflow; no signing change needed.
- Read-only installed alpha.4 binary SHA-256 remains
  `7fcde40baaa5f82916e1a1af03c8ea5379c72a513b92a9cc81ef1efefb4fd02b`.

## Approved commit inventories

1. `chore(release): prepare v0.2.0-alpha.5`:
   `CHANGELOG.md`, `.agent/PLANS.md`, `.agent/memory/PROJECT_STATE.md`,
   `.agent/memory/DECISIONS.md`, and this worklog.
2. `docs(memory): record alpha.5 release results`:
   only PLANS, PROJECT_STATE and this worklog after workflow/artifact verification.

Explicit file staging and staged diff/secret review are required before each commit.
No source/test/workflow edits or dependency installation are part of these groups.

## Validation and publication results

- Bundled Node `scripts/release-check.mjs v0.2.0-alpha.5` passed: package/Tauri/Cargo
  agree at 0.2.0 and the changelog contains the new prerelease heading.
- `git diff --check` passed; all five documentation files were reviewed, with no
  credentials, raw sensitive logs, generated assets or unrelated changes included.
- Remote main still matches `a08b362`; alpha.5 remains absent before committing.
- Post-merge CI `40232958858` passed; CodeQL `40232958856` is still running.

Pending: release-preparation commit/push, new annotated tag, exact-release-commit
CI/CodeQL, release quality and both packaging jobs,
published asset sizes/digests, SHA-256 manifests and static bundle identities.
The last published release remains alpha.4 until the new outcome is verified.

## Risks, decisions and manual verification

Unsigned/non-notarized prerelease; no new packaged-window or live-provider test.
Step evidence v2 and additive SQLite pins do not silently upgrade old runs. Citations
are not tool-use attestation; filesystem scope is bounded comparison, not a sandbox
or transient-write journal. Retain coordinated app/data backups before any separately
approved installation. Stop is not rollback and Retry may repeat side effects.
Historical real-provider acceptance remains failed/blocked with seven calls used;
the unused eighth call is not authorized here. Installed alpha.4 remains unchanged.
Existing unresolved Apple/MCP/Qwen questions remain unchanged in OPEN_QUESTIONS.

## Next action

Complete the approved release publication and verify both architectures without
installing or executing the downloaded application; record actual results only.
