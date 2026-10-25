# DBC Active Plans

## 2026-10-25 — PR #19 merge and alpha.4 release

Status: PR #19 merged as `4668e81`; the maintainer explicitly approved both release
commit inventories, push to main and the new alpha.4 tag. Release execution is pending.
The maintainer requested merge and release,
superseding the earlier no-merge/no-release restriction for this operation only.

1. Recheck exact-head CI, CodeQL, review threads and mergeability — completed at
   `af986ad`: all five checks passed, no new alerts and no review threads.
2. Merge preserving commits and fast-forward local main — completed. Browser merge
   succeeded after connector HTTP 403; no permissions or check protections changed.
3. Prepare `v0.2.0-alpha.4` changelog and project memory. Numeric versions stay 0.2.0;
   the next tag was verified absent. Metadata/diff checks and explicit approval completed.
4. Commit/push main and the new tag; verify Release quality, both
   architecture jobs, six public assets and checksum manifests.
5. Record verified outcomes in the second memory-only commit. No installed-app update,
   signing claims, live-provider tests, old-tag rewrite or branch deletion.

Evidence: `memory/worklog/2026-10-25-pr19-merge-and-alpha4-release.md`.

## 2026-10-25 — Native Retry confirmation and lifecycle status

Status: implemented, locally verified and published in
[PR #19](https://github.com/vistadi/dildin-build-control/pull/19) from
`codex/native-retry-confirmation`. Maintainer approved fixes,
desktop Cancel/Retry QA, commits, push and a separate PR; that initial scope excluded
merge/release. The later explicit request authorized merge/release as recorded above.
The previously approved installation report is committed as `1d4863b`.

1. In-app confirmation bound to the current attempt; Cancel/Escape do no work — passed.
2. Actual selected-run status replaces inferred Running — verified in native UI.
3. 60 Rust tests, 11 lifecycle scenarios, frontend/native builds, existing smoke
   gates and 375/768/1440 controls passed. Native Cancel/Escape retained identical
   SQLite metadata/evidence; Confirm retry completed the interrupted mock loop once.
4. Code `2ac67f5`, report `1d4863b` and memory `af986ad` are pushed; PR #19 is now
   merged as `4668e81` after the later request.
   PR creation used the signed-in browser after connector HTTP 403. The initial
   publication did not merge/release or change installed alpha.3; the subsequent
   approved merge and release preparation are recorded above.

Evidence: `memory/worklog/2026-10-25-native-retry-confirmation.md`.

## 2026-10-25 — Alpha.3 installation and native lifecycle QA

Status: installation and bounded verification completed; native Retry defect found.
The maintainer authorized updating the installed app, preserving rollback, and
checking launch, Stop/Resume and recovery. No source fix, commit or push was authorized.

1. Preserve the old app, SQLite and WebKit state in a persistent private backup —
   completed with byte comparisons and a local `ROLLBACK.md`.
2. Install the checksum-verified arm64 release and confirm native Settings identity —
   completed for `v0.2.0-alpha.3` / `2904b20` under `/Applications`.
3. Test mock-only Stop, stopped persistence and Resume — passed; all seven steps
   completed once, with completed evidence unchanged across Resume.
4. Restart an unfinished mock loop — recovered to Interrupted without auto-replay.
   `Retry step` did not open confirmation or continue via mouse or Enter; continuation
   after interruption is not certified. No live provider or forced-crash test ran.
5. Preserve QA evidence and post-QA state, restore original user data and re-launch —
   completed; alpha.3 remains installed/open with the original project and five
   pre-existing failed loops. Original backup snapshots remain unchanged.

Next implementation checkpoint: replace unsupported native `window.confirm` usage
with explicit supported confirmation, fix the misleading Running helper badge, and
retest Cancel/Retry in the packaged app. Requires a separate implementation request.
The follow-up request approved this memory commit (`1d4863b`) and the separate fix
checkpoint above; installation findings remain valid for released alpha.3.
Evidence: `memory/worklog/2026-10-25-alpha3-install-and-native-qa.md`.

## 2026-10-25 — PR #18 merge and alpha.3 release

Status: completed. PR #18 merged into `main` as `66dcf66`; unsigned prerelease
`v0.2.0-alpha.3` is published from release commit `2904b20`. The maintainer approved
both release/memory commit groups, push to `main` and the new tag.

1. Merge the verified PR without bypassing checks — completed through the signed-in
   browser after the connector returned HTTP 403; API confirmed the merge.
2. Release metadata and signing documentation were prepared and committed as
   `2904b20`; numeric package/Tauri/Cargo versions remain `0.2.0`.
3. The new annotated tag was pushed without rewriting existing tags. Release run
   `40181600137`, CI and CodeQL succeeded; the release gate passed all 60 Rust tests.
4. Both macOS packaging jobs passed. All six downloaded assets match GitHub sizes
   and SHA-256 digests; both manifests report `OK` and both DMGs pass `hdiutil verify`.
   Static inspection confirms the two Mach-O architectures and embedded tag/SHA.
5. This release outcome-memory checkpoint did not replace the installed app.
   The separately authorized installation/native QA is recorded above. Signing and
   notarization remain unverified.

Release: <https://github.com/vistadi/dildin-build-control/releases/tag/v0.2.0-alpha.3>.
Evidence: `memory/worklog/2026-10-25-pr18-merge-and-alpha3-release.md`.

## 2026-10-24 — Durable Stop/Resume

Status: implemented, locally verified and merged through
[PR #18](https://github.com/vistadi/dildin-build-control/pull/18) as `66dcf66` on
2026-10-25 after all five checks passed at head `9c1cebc`. The original publication
approval excluded merge/release; the later explicit request authorized both.
See `memory/worklog/2026-10-24-durable-stop-resume.md` for inventory, 60 Rust tests,
frontend/native builds, browser QA and remaining native-window verification.
The alpha.3 release and later installation are recorded above; no live provider ran.

1. Persist stopping/stopped/interrupted states; serialize transitions and distinguish
   queued work from an executing attempt. Never auto-replay work after interruption.
2. Confirm Stop only after the active operation releases ownership; preserve partial
   evidence and retry budgets. Resume must not bypass approvals or retry a failed step.
3. Restore interrupted state on startup under a single-runtime database lease; keep
   crash recovery honest about external processes and lack of rollback.
4. Add English Resume/Retry/pending/error UI using existing Dibi components/tokens.
5. Verify native state/race/recovery fixtures, frontend behavior, builds and smoke
   checks; update memory and publish the two explicitly approved commit groups.

## 2026-10-24 — Reliable native execution and build diagnostics

Status: implemented, verified and merged via
[PR #16](https://github.com/vistadi/dildin-build-control/pull/16) from
`codex/native-execution-diagnostics` into `main`. Runtime `c4b4287` and memory
`c8fe6dd` are pushed. The maintainer signed in and browser PR creation succeeded
after the connector's HTTP 403. No integration permissions were expanded; at PR
creation no merge or release was performed. Publication checkpoint `4090ff3` is also pushed. Review
on 2026-10-24 confirmed passing CI and completed CodeQL analysis, but the aggregate
CodeQL check failed on alert #6 in a test assertion. Static triage found a count-only,
empty-prompt test path, not a secret-value disclosure. The maintainer authorized
merge only if checks/review are good. The maintainer subsequently approved the narrow
test diagnostic fix, commits, push and merge after green exact-head checks, followed
by Stop/Resume implementation. The assertion no longer prints raw stderr; all 51 Rust
tests and formatting passed locally before the new remote checks started.
This pre-publication checkpoint was followed by commits `8358e63` and `ea402f1`.
All five exact-head checks passed (aggregate CodeQL: no new alerts), and PR #16
merged as `3b21f74` on 2026-10-24. No alert dismissal, check bypass or release.
User requested current review, a plan, implementation, and GitHub publication.
Preserve the existing October research changes. The original implementation scope
excluded merge/release; this review adds conditional merge only, not release.
See `memory/worklog/2026-10-24-native-execution-and-diagnostics.md` for
verification, remaining limitations, the approved implementation/memory inventory,
and the separately approved documentation-only publication checkpoint.
Review evidence: `memory/worklog/2026-10-24-pr-16-review-and-ci.md`.

1. Extract a bounded process runner: concurrent pipe draining, input delivery,
   timeout/cancellation, process reaping, partial evidence, and deterministic fixtures.
2. Bound provider probes and validate required Qwen modes/budgets without enabling
   Kimi or weakening the existing zero-tool gate. Label setup checks honestly.
3. Add native build identity and process activity/stop UI in existing English Dibi
   styling. Do not claim signing/notarization or live-provider testing.
4. Verify Rust, frontend, provider/native/UI/performance contracts and responsive UI.
5. Update durable memory, review explicit file groups, then publish an approved
   feature branch/PR to GitHub. Keep paid calls, ACP/OAuth expansion, auto-update,
   signing, and release publication outside this bounded milestone.

## Evidence-first alpha activation

Status: completed, committed, and pushed to `main`.

- Make Run the default, low-friction path.
- Keep provider, policy, and recovery tools under Advanced.
- Let evaluators complete a deterministic browser lifecycle without side effects.
- Make EvidencePack and the human acceptance decision the visible outcome.
- Enforce evidence completeness in CI and release workflows.
- Prepare, but do not claim, signed and notarized macOS distribution.
- Use the 30-day go-to-market plan to recruit design partners and publish proof stories.

Next checkpoint: configure Apple credentials, produce a signed release candidate, and
verify both architectures before publishing Homebrew installation instructions.

## Dibi Workshop brand and Guided Run redesign

Status: implemented, locally verified, committed, and pushed to `main`.

- Keep DBC as the product name and use Dibi, a border collie, as the recognizable
  product mascot.
- Apply the selected light Dibi Workshop direction to the primary Run flow without
  weakening TaskContract, approval, provider, MCP, or EvidencePack safeguards.
- Use midnight navigation with cyan, violet, coral, lime, cream, and light-neutral
  product tokens.
- Add real raster assets for the sidebar mark, onboarding illustration, and desktop
  system icon; regenerate the full Tauri icon set.
- Keep the product interface English-only and verify desktop, tablet, mobile, keyboard,
  console, build, native, smoke, and performance behavior.

Completed checkpoints: selected visual matched at 1487×1058, side-by-side design QA
passed, the browser-safe demo lifecycle was exercised, the Guided Run screenshot was
updated, the runtime was reduced to one complete English interface, all automated checks
passed, and a verified local arm64 `.app` and DMG were built with the Dibi icon. The
implementation is recorded in `9950833` and `1b2cfa2`.

Release checkpoint: `v0.2.0-alpha.2` was published and verified as an explicitly
unsigned prerelease on 2026-09-01 with arm64/x64 DMGs, app archives, and matching
checksum manifests. Next checkpoint: produce a signed/notarized release when Apple
credentials are available.

## Priority product improvements

Status: P0 and operator-facing P1 completed, verified, committed, and pushed to `main`
on 2026-08-05.

- Scope Run, Approvals, Evidence, costs, and decisions to the current HarnessRun.
- Replace the technical nine-part progress model with Describe, Run checks, Decide.
- Keep acceptance/path controls available behind an optional disclosure.
- Make Evidence an explicit empty state until a run exists and a read-only decision
  surface once evidence is available.
- Collapse provider routing, command policy, sessions, and diagnostics under advanced
  Settings.
- Cover the new UI contracts in deterministic smoke checks and desktop tests.

The updated local arm64 application was rebuilt, installed, and launch-checked on
2026-08-05. Next checkpoint: complete native workflow QA, then manually verify a
signed/notarized universal macOS release after Apple credentials are available.

## UI/UX, MCP, Kimi and Qwen master plan

Status: functional slices Phase 0–6 were implemented, locally verified, committed as
`9950833`, and pushed to `main`. Native installed-CLI fixtures, approved remote OAuth MCP conformance,
frontend feature decomposition, English-copy/accessibility coverage, and signed/notarized release
verification remain external or hardening checkpoints.

- Preserve Run, Approvals, Evidence, and Settings as the result-oriented primary IA.
- Replace brand-coded provider strategies with capability-driven routing policies.
- Add supported Kimi Code and Qwen Code CLI adapters behind contract fixtures.
- Add MCP as an independent connections, policy, approval, and evidence layer.
- Use a DBC-owned MCP policy proxy for consistent CLI-provider safety semantics.
- Extend EvidencePack with provider/model/routing/MCP identity and tool-call evidence.
- Refactor the frontend into feature modules before expanding Connection Center UI.

Detailed plan: `docs/UI_UX_MCP_KIMI_QWEN_MASTER_PLAN_RU.md`.

Completed checkpoints: legacy RoutingPolicy migration, versioned CLI/API adapters,
immutable execution identity, official Kimi/Qwen read-only templates, stream-json and
usage normalization, MCP Connection Center and portable contracts, ToolPolicy proxy,
run-scoped approvals, malicious/proxy fixtures, dynamic fallback routing, balanced
preset, Team Builder, source-backed model catalog, EvidencePack v2 verification,
English-only UI, accessibility/CSP hardening, performance budget, and responsive QA.

Next checkpoint: validate supported installed Kimi/Qwen versions and an approved remote
OAuth MCP fixture, decompose `App.tsx`, complete English-copy/WCAG audit, then produce and
verify a signed/notarized universal release when Apple credentials are available. Kimi
built-in print/AFK tools and paid API calls remain disabled until separately verified.
