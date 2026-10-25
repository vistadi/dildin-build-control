# PR #18 merge and alpha.3 release

## Objective and approved scope

The maintainer requested merge and release, superseding the earlier no-merge and
no-release restriction. Merge verified PR #18, prepare the next unsigned macOS
prerelease, and verify its quality gate, architecture assets and checksums.
Installed-app replacement, live-provider calls, expanded permissions, signed
distribution and native-window end-to-end certification are not included.
The maintainer explicitly approved the two proposed local release/memory commit
groups, push to `main` and the new tag on 2026-10-25. Release preparation is
committed and pushed; publication and artifact verification are complete. This
is the approved outcome-memory checkpoint.

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
- Created and pushed `2904b206360cad628370639e9e85259063177eb5` —
  `chore(release): prepare v0.2.0-alpha.3` with exactly the six approved files.
- Created annotated tag `v0.2.0-alpha.3` (tag object `bff84c777df0421e749f85575f9543035afaa201`)
  at `2904b20` and pushed that exact tag. Release workflow
  <https://github.com/vistadi/dildin-build-control/actions/runs/40181600137> started
  on the expected tag/SHA. No previous tag was moved and no force-push was used.
- Release quality gate job `121133644305` passed, including metadata, frontend,
  provider/MCP/API, UI/native/lifecycle/performance, deterministic EvidencePack,
  formatting and Rust tests. Its completed log confirmed 60 passed, 0 failed.
- CI `40181596283` and CodeQL `40181596272` at release commit `2904b20` passed.
- Release run `40181600137` completed successfully. Packaging jobs `121134268560`
  (arm64) and `121134268475` (x64) both passed, including checksum uploads.
- Public release `423299675` is non-draft and marked prerelease, published at
  `2026-10-25T09:47:26Z` from `2904b206360cad628370639e9e85259063177eb5`:
  <https://github.com/vistadi/dildin-build-control/releases/tag/v0.2.0-alpha.3>.
- Downloaded all six public assets into a dedicated temporary directory. Each
  file's actual size and SHA-256 matched the GitHub release asset metadata. Both
  SHA-256 manifests verified their named DMG with `OK`; both DMGs passed image
  integrity verification. Both app archives listed the expected app bundle.
- Static inspection of the archived Mach-O binaries verified arm64 and x86_64
  headers respectively and found the exact alpha.3 label and release SHA in each.
  No application was executed, mounted for installation or copied to Applications.

### Verified release assets

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `Dildin.Build.Control_0.2.0_darwin_aarch64.app.tar.gz` | 7750556 | `00d2d4aa337caf8ed31ba9998abd6249fedf114672c33d3e88499c9531087eac` |
| `Dildin.Build.Control_0.2.0_darwin_aarch64.dmg` | 10203416 | `d5cf33c4669215d85b4ab17bc367747516bc7d63b3ae32207c610c1dfe38d229` |
| `Dildin.Build.Control_0.2.0_darwin_x64.app.tar.gz` | 7925305 | `c15caf40e1d7e43a394dfb34c0b6d5db7171c7afdcfa4e9c5d46ec366917a65d` |
| `Dildin.Build.Control_0.2.0_darwin_x64.dmg` | 10359747 | `23abd17e29e8e3c1a02a8a6d02e75245dfb0b770bdb03da954d26925cdd8fa48` |
| `Dildin_Build_Control_0.2.0_arm64.sha256` | 112 | `a64c95884f5af40cfb64419c13f482abf324c569a1fb1f06984511bc168e672b` |
| `Dildin_Build_Control_0.2.0_x64.sha256` | 108 | `4aa44d9fbcf653d0bc6eaa0c9e1586dd64d4a78ceea8a0b35e7cbceb086dc1d1` |

## Files changed by this task

- `CHANGELOG.md`
- `docs/RELEASE_SIGNING.md`
- `.agent/PLANS.md`
- `.agent/memory/PROJECT_STATE.md`
- `.agent/memory/DECISIONS.md`
- `.agent/memory/worklog/2026-10-25-pr18-merge-and-alpha3-release.md`

The second, outcome-only commit is limited to `.agent/PLANS.md`,
`.agent/memory/PROJECT_STATE.md` and this worklog, as explicitly approved.

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
- `git diff --check` and `git diff --cached --check`: passed. Reviewed the exact
  six-file staged diff before committing. No credentials, generated assets or
  unrelated edits found. Working tree was clean after the first commit and push.
- No runtime code changed in release preparation; local application tests were not
  rerun. Exact-head PR CI and post-merge CI provide the current remote test evidence.
- `git push origin main`, `git tag -a v0.2.0-alpha.3 2904b206360cad628370639e9e85259063177eb5`,
  `git push origin refs/tags/v0.2.0-alpha.3`: successful. The tag's peeled commit
  matches the release-preparation SHA.
- Release workflow and artifact/checksum verification: completed successfully.
- `curl --fail --location --parallel`: downloaded the six exact public release
  URLs. The sandboxed attempt failed DNS resolution; the approved network-enabled
  retry succeeded without credentials or changes to repository permissions.
- Bundled Node `fs`/`crypto` verification compared all six file sizes and SHA-256
  digests against release metadata: passed.
- `shasum -a 256 -c Dildin_Build_Control_0.2.0_arm64.sha256` and the x64 equivalent:
  both `OK`.
- `hdiutil verify` on each downloaded DMG: both checksums `VALID`.
- `tar -tzf` on each app archive: expected app bundle contents. Read-only `tar -xOf`
  into memory plus Mach-O header and embedded-string assertions verified each
  binary architecture, tag and full commit SHA; no extracted executable was run.

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

After saving this approved outcome checkpoint, perform separately authorized
packaged native-window QA in a disposable workspace. The release is published and
verified at the artifact level; installation and real-provider activation remain
outside this task.
