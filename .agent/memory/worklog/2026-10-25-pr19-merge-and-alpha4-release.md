# PR #19 merge and alpha.4 release

## Objective and scope

The maintainer requested merge and release after successful PR #19 CI/CodeQL review.
Merge without bypassing checks, prepare the next unsigned macOS prerelease, verify
the release workflow and artifacts, and preserve explicit project memory. No
installed-app replacement, paid provider calls, expanded access or signing claims.
The maintainer explicitly approved both presented release/memory commit inventories,
push to main and the new alpha.4 tag. The release-preparation commit and tag have
been pushed; publication, workflow and artifact verification are complete. This is
the approved outcome-memory checkpoint.

## Initial repository state

- Clean `codex/native-retry-confirmation` at `af986ad3f204e3dd73a98de8e0eab1b64b56d27f`.
- Main baseline `c12a74c`; PR #19 held `1d4863b`, `2ac67f5`, `af986ad` (13 files).
- Latest published release alpha.3; matching-ref lookup confirmed alpha.4 absent.
- Package/Tauri/Cargo numeric versions remain 0.2.0.
- The approval continuation began on main with only the five known release-preparation
  files pending; no unrelated modifications were present.

## Plan

1. Recheck exact PR head, CI/CodeQL, reviews and mergeability.
2. Merge preserving commits; fast-forward main and prepare release documentation.
3. Review/approve explicit commit groups, commit/push, then create a new immutable tag.
4. Verify Release quality and both macOS packaging jobs, six assets and checksums.
5. Record actual outcomes in a second memory-only commit, without installation.

## Work completed

- All five checks passed on exact head `af986ad`: frontend build, Rust tests, CodeQL
  JavaScript/TypeScript, CodeQL Rust and aggregate CodeQL. Aggregate `121169909195`
  reported no new alerts, zero annotations. Previously inspected job notices are
  informational Ubuntu runner-image migration notices, not failures.
- CI: <https://github.com/vistadi/dildin-build-control/actions/runs/40193630062>.
- CodeQL: <https://github.com/vistadi/dildin-build-control/actions/runs/40193630001>.
- PR metadata confirmed open/mergeable at the expected head; review-thread list empty.
- Connector merge returned HTTP 403. Refreshed the signed-in browser, confirmed all
  five checks and no conflicts, then normal merge succeeded without access changes.
  API confirmed merged at `2026-10-25T12:54:34Z` with merge commit
  `4668e8122b89d9d77a50e6a8f0911cd679674179`.
- Fetched origin/main, switched the clean checkout to main, fast-forwarded to the
  actual merge commit; no feature branch deletion or history rewrite.
- Prepared alpha.4 changelog for in-app Retry, cancellation/stale/duplicate guards,
  truthful lifecycle status, regression coverage and honest native QA boundaries.
- Inspected existing signing documentation/workflow; they already agree that alpha
  signing variables are omitted. No change needed to signing configuration/docs.
- Post-merge CI run `40195207347` and CodeQL `40195207288` both passed at `4668e81`.
  This is separate from the five green checks on the merged PR head.
- After approval, rechecked remote main at `4668e81` and confirmed the alpha.4 tag
  remains absent. Only the five approved release/memory files are pending.
- Created and pushed `06a7ea5c3171305ce58cc534487696698df96917` —
  `chore(release): prepare v0.2.0-alpha.4`, containing exactly the five approved files.
- Rechecked remote main and tag absence, then created and pushed the new annotated
  `v0.2.0-alpha.4` tag (object `4037665652703b1d7eda0df070480baf3e26168d`) at that
  exact commit. No old tag changed or force-push occurred.
- Release workflow <https://github.com/vistadi/dildin-build-control/actions/runs/40200589766>
  started on the expected tag and commit. Quality job `121190731788` passed all
  steps; its completed log confirms 60 Rust tests passed and zero failed.
  CI `40200564567` and CodeQL `40200564547` passed on the release commit.
- Release run `40200589766` and packaging jobs `121191422269` (arm64) and
  `121191422270` (x64) completed successfully, including checksum uploads.
- Non-draft prerelease `423444531` was published at `2026-10-25T14:11:38Z`:
  <https://github.com/vistadi/dildin-build-control/releases/tag/v0.2.0-alpha.4>.
  All six expected assets are present. The tag's peeled commit matches `06a7ea5`.
- Downloaded all six exact public asset URLs into a dedicated temporary directory.
  Their actual sizes and SHA-256 digests match GitHub metadata; both manifests report
  `OK` and both DMGs pass `hdiutil verify` with checksum `VALID`.
- Both app archives list the expected bundle. Read-only extraction into memory
  verified the arm64/x86_64 Mach-O headers and embedded alpha.4 tag, full release
  commit SHA and target triples. No binary was executed and no DMG was installed.
- Read-only hash verification confirms the installed alpha.3 executable remains
  `61a9c458b2d950254f0345b462279a3eade7e244ee8a790d92e2c0cd13b5f8e8`.

### Verified release assets

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `Dildin.Build.Control_0.2.0_darwin_aarch64.app.tar.gz` | 7751313 | `62ebedb4e66554bc153c72954d44a70e80610cd1ad028539ad8db63f2e2abb67` |
| `Dildin.Build.Control_0.2.0_darwin_aarch64.dmg` | 10204223 | `7db70dca15caf2cf632fc4445c55a3b479dc2e4b2802399050fdee5ce25c74eb` |
| `Dildin.Build.Control_0.2.0_darwin_x64.app.tar.gz` | 7925630 | `d9bb6c5aa043424b937324373b8b1c0f97ff860bfe62b882af29d9894e61db00` |
| `Dildin.Build.Control_0.2.0_darwin_x64.dmg` | 10359408 | `494c8630cf10ded08a98571081e7c52b501e9cff5a60bab3f3c286cd262d5cbb` |
| `Dildin_Build_Control_0.2.0_arm64.sha256` | 112 | `2a8d34a7f0f1e8a8a25184cf633f1ee2e7238a8d7446dcb5c3b05d525f8c4e17` |
| `Dildin_Build_Control_0.2.0_x64.sha256` | 108 | `73d3ffc02cd83d08478b268cabdd00b2eef6ed3f11160f59cbe93d52487eb34e` |

## Files / approved commits

1. `chore(release): prepare v0.2.0-alpha.4`:
   - `CHANGELOG.md`
   - `.agent/PLANS.md`
   - `.agent/memory/PROJECT_STATE.md`
   - `.agent/memory/DECISIONS.md`
   - this worklog.
2. `docs(memory): record alpha.4 release results`: only PLANS.md, PROJECT_STATE.md
   and this worklog, after verified workflow/assets. Both commits and push to main,
   followed by the new tag, were explicitly approved by the maintainer.

## Commands and validation

Repository status, current PR/check metadata, release listing, absent-tag lookup,
release workflow, metadata checker, signing docs and prior relevant memory reviewed.
- Bundled Node `scripts/release-check.mjs v0.2.0-alpha.4` passed: all three numeric
  versions agree at 0.2.0 and the alpha.4 changelog heading exists.
- `git diff --check` and the new worklog's whitespace check passed; reviewed the
  complete documentation diff. No secrets, generated assets or unrelated edits.
- Reviewed/staged exactly the five approved files with `git add -- <explicit paths>`;
  `git diff --cached --check` passed and no unrelated changes or sensitive content
  were included. The tree was clean after the release commit and push.
- `git push origin main`, `git tag -a v0.2.0-alpha.4 06a7ea5c3171305ce58cc534487696698df96917`
  and `git push origin refs/tags/v0.2.0-alpha.4` succeeded without rewriting history.
- `curl --fail --location --parallel` downloaded only the six public release assets.
  Bundled Node `fs`/`crypto` checks matched all file sizes and SHA-256 digests.
- `shasum -a 256 -c Dildin_Build_Control_0.2.0_arm64.sha256` and x64 equivalent passed.
- `hdiutil verify` passed for both downloaded DMGs; `tar -tzf` listed both app bundles.
  `tar -xOf` into memory plus header/string assertions confirmed each architecture,
  alpha.4 label, full commit SHA and target without executing the application.
- Read-only installed-binary SHA-256 matches the previously verified alpha.3 hash.
- The approved outcome changes are limited to PLANS.md, PROJECT_STATE.md and this
  worklog. OPEN_QUESTIONS.md was read; existing unresolved questions are unchanged.
No runtime code changed; no local application tests were rerun for this release task.
Prior native QA used a separate unsigned arm64 debug bundle, not the release assets.

## Risks and manual verification

Release remains unsigned/non-notarized. Stop is not rollback; Retry may repeat side
effects. Close older app instances and retain coordinated app/data rollback copies.
Live-provider, forced-crash, Intel-window and second-instance QA remain out of scope.
After publication, manually verify the matching architecture/checksum and Settings
build identity before using a separately approved installation for normal work.

## Next action

After saving this approved outcome checkpoint, request separate authorization for
alpha.4 installation and native Cancel/Retry verification with coordinated rollback.
The release is published and artifact-verified; the installed application and private
backups remain untouched.
