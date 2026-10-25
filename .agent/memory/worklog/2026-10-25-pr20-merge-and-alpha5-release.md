# PR #20 merge and alpha.5 release

## Objective and approved scope

Merge green PR #20 into main, prepare the next unsigned macOS prerelease through
the existing workflow, and verify publication/artifacts. The maintainer explicitly
approved both commit inventories below, push to main and the alpha.5 tag. No new
AI calls, installed-app replacement, expanded permissions, signing claims or live
fixture changes. Preserve old tags and all historical failed outcomes.
Release publication and artifact verification are complete. This is the approved
three-file outcome-memory checkpoint, not an installed-app update.

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
- Post-merge CI `40232958858` and CodeQL `40232958856` both passed on `a08b362`.
- Explicitly staged the five approved paths; staged diff/check passed and no
  unstaged or unrelated files remained. Created
  `e8b499eccd853b4fa0528cc68ede5c6a38eaec48` —
  `chore(release): prepare v0.2.0-alpha.5`, and normal push to main succeeded.
- Rechecked remote main and absence of the tag, then created/pushed annotated
  `v0.2.0-alpha.5` (tag object `7a66dbe7db530dd23e96c4b38fbf5b56b06fd085`) at
  exactly `e8b499e`. Old tags remain unchanged; local tree was clean afterward.
- Release `40233185122`, CI `40233163396` and CodeQL `40233163483` all succeeded
  on exact release commit `e8b499e`. The seven release/CI/language check runs on
  that commit are all completed/successful; no inherited old-head result is used.
- Release quality job `121289102751` passed every step, including release metadata,
  frontend and all contract/evidence checks, formatting and 75 Rust tests (zero
  failed). Packaging/checksum jobs `121289547070` (arm64) and `121289547008` (x64)
  completed successfully.
- Non-draft prerelease `423661229` published at `2026-10-25T21:03:44Z` with all six
  expected assets. Remote tag object/peeled SHA still match the recorded identities.
- Downloaded the six observed public asset URLs to a dedicated temporary directory.
  All actual sizes and SHA-256 digests match GitHub metadata; both checksum manifests
  report OK. Both `hdiutil verify` checks exit successfully with VALID checksums.
- Read-only tar extraction into memory confirms arm64 and x86_64 Mach-O headers,
  embedded `v0.2.0-alpha.5`, full `e8b499e` SHA and target triples. No archive was
  installed and no downloaded program executed.
- Final read-only hash of the installed alpha.4 executable matches the initial hash.
  Only the three approved outcome-memory files are modified after the release tag.

### Verified release assets

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `Dildin.Build.Control_0.2.0_darwin_aarch64.app.tar.gz` | 8370709 | `df5caa16647b999866cdc9a4ae9822a8fba4e3debe085f9577a1ef0c4d0dfd3e` |
| `Dildin.Build.Control_0.2.0_darwin_aarch64.dmg` | 10816159 | `76c92abac8d6bd6ceb08a48c78584d6736458e601ab0a4863f504d6cb15d1897` |
| `Dildin.Build.Control_0.2.0_darwin_x64.app.tar.gz` | 8590980 | `987804595589e4642e2be517a0f6205a62295d628c0401974883bf0ed8805e72` |
| `Dildin.Build.Control_0.2.0_darwin_x64.dmg` | 11018388 | `99c85aba9e788c6273b188500ec9b358d3fe1383e197eaf2bfa8c0e14606b273` |
| `Dildin_Build_Control_0.2.0_arm64.sha256` | 112 | `359b2a1cbc09c12f78e739890652722e332da1744db8801c6f6667d98cde2b8e` |
| `Dildin_Build_Control_0.2.0_x64.sha256` | 108 | `1b377595cdd92ed015bfb53992acc24294bf2da2703c3990fb1a6c89330cff81` |

### Commands and evidence

- `git fetch origin main`, `git switch main`, `git merge --ff-only origin/main`.
- `git diff --check`, explicit `git add -- <approved files>` and staged diff checks;
  `git commit`, normal `git push origin main`, annotated tag and exact tag-ref push.
- `git ls-remote origin refs/heads/main refs/tags/v0.2.0-alpha.5
  refs/tags/v0.2.0-alpha.5^{}` verified both remote tag identity and release SHA.
- `curl --fail --location --parallel` retrieved only the six release assets.
- Bundled Node `fs`/`crypto` assertions compared sizes and SHA-256 metadata; bounded
  `tar -tzf` and `tar -xOf` checks validated archive paths and binary headers/strings
  in memory without executing binaries or writing extracted files.
- `shasum -a 256 -c Dildin_Build_Control_0.2.0_arm64.sha256` and x64 equivalent.
- `hdiutil verify` on both DMGs; installed executable `shasum -a 256` unchanged.
- PR: https://github.com/vistadi/dildin-build-control/pull/20
- Release: https://github.com/vistadi/dildin-build-control/releases/tag/v0.2.0-alpha.5
- Release workflow: https://github.com/vistadi/dildin-build-control/actions/runs/40233185122
- Release-commit CI: https://github.com/vistadi/dildin-build-control/actions/runs/40233163396
- Release-commit CodeQL: https://github.com/vistadi/dildin-build-control/actions/runs/40233163483

The approved final commit is documentation-only; its new-head CI/CodeQL must be
observed separately, not described as already green based on the release commit.
No new local application tests were run during this documentation/release operation.

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

Save/push the approved three-file outcome checkpoint and verify its remote SHA.
Alpha.5 is published and artifact-verified. A separately approved installation
should retain coordinated alpha.4 app/data rollback copies and start with safe
mock/native checks. New live-provider verification needs explicit authorization.
