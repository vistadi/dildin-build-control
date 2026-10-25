# DBC Project State

Current source publication (2026-10-25): open/unmerged
[PR #20](https://github.com/vistadi/dildin-build-control/pull/20) from
`codex/readiness-evidence-integrity` to main contains `cbae019` (readiness/YAML),
`19baab0` (evidence/finding/non-Git scope) and `de3e62a` (verification memory).
Creation verified by API at initial head `de3e62a`, base `0a05edf`, 35 changed files;
this documentation-only follow-up records publication. CI `40231506333` and
CodeQL `40231506334` were in progress on that initial head; latest-head checks
still require verification, not assumed green. Fresh local checks pass: 75 Rust tests,
offline native build, TypeScript/Vite, ten smoke suites and formatting; the isolated
readiness-only snapshot additionally passes 63 tests. Normal SSH push and browser
PR creation succeeded after connector HTTP 403; no permissions were changed.
No new AI calls, merge, release or installed-app update. Main remains `0a05edf`.
This is separate from the released state below.

Last verified repository/release update: 2026-10-25. PR #19 merged into `main` as
`4668e8122b89d9d77a50e6a8f0911cd679674179` after all five exact-head CI/CodeQL checks
passed at `af986ad`, with no new CodeQL alerts and no review threads. Release
`v0.2.0-alpha.4` is published from `06a7ea5c3171305ce58cc534487696698df96917`.
Release quality (60 Rust tests), both macOS packaging jobs, CI and CodeQL passed.
All six downloaded assets match published sizes/digests; both manifests and DMG
integrity checks passed. Static inspection confirmed architecture, alpha.4 label
and full release SHA in both binaries. Final documentation-commit CI `40201346582`
and CodeQL `40201347794` also passed at `c4a7932`.

On 2026-10-25 the verified arm64 alpha.4 was installed in `/Applications`, retaining
a coordinated, byte-verified alpha.3 application/data backup. Native Settings
confirms the release identity. Actual desktop mock QA passed launch, Stop,
Stopped persistence across restart, Resume without completed-step replay, recovery
to Interrupted without automatic execution, Cancel/Escape without changing attempts
or evidence, and confirmed Retry to completion. Both tested loops finished seven
steps at one attempt each, with pre-existing evidence unchanged. Statuses were correct.
The alpha.3 Retry/Running defects are fixed in installed alpha.4 through PR #19.
QA used the advanced legacy-loop path, not full Guided Harness or live providers.
Original user data was restored after privately preserving the QA session; alpha.4
is left open on Settings, safe mock enabled, real execution off and MCP isolated.
Full live-provider acceptance, forced-crash, Intel-window and second-instance QA
remain unperformed; see the partial live test below.
See `worklog/2026-10-25-alpha4-install-and-native-qa.md` for verification and rollback.

The initial real-example attempt reproduced two alpha.4 blockers before AI execution:
mandatory DBC/Tauri packaging inside an ordinary target project, and Node helpers
misreading native-saved YAML as zero providers. The maintainer subsequently approved
both fixes and adding `yaml` to DBC only. The feature-branch source now separates
distribution evidence from task readiness and shares strict structural YAML parsing
across ten helpers. Human approval, bounded scope/budget, baseline, ledger and
preflight guards remain. Readiness regression tests, all existing smoke suites,
TypeScript/Vite build and 63 Rust tests passed at the readiness checkpoint; current
combined checks and remote publication status are recorded above.

A separate arm64 debug bundle (`DBC Readiness QA`, isolated app identifier) reached
native ready-to-run in a fresh README project after actual Sync config. Codex plan
and code each passed once, changing only `Status: pending` to `Status: verified`;
both configured local assertions passed. After the first Claude QA attempt failed
before login, confirmed ordinary/safe-mode authentication allowed native Retry of
that same step. QA then passed at attempt 2, review/security at attempt 1 each.
Plan/code/build remained at one attempt with byte-identical evidence; the previous
failed QA evidence was archived byte-for-byte. No new loop was created.

The historical live test's final acceptance returned request_changes: Claude's reports did not substantiate
review of actual current-loop execution evidence, security findings were unresolved,
and its native scope verification was unverified_non_git. Final state is failed /
blocked, not accepted. Four new CLI invocations used seven of eight total; one is
unused. The final 67 security entries are all redacted-secret-line markers, not
proof of 67 credential exposures. Static inspection shows redact_text masks even
ordinary text containing "secret", then the tested scanner labelled every marker high;
echoing previous reports amplifies the count. Generic text provider output does
not provide a complete tool-read trace. These are follow-up reliability issues,
not reasons to disable redaction or waive evidence requirements.

Independent file comparisons and both local assertions still pass. Safe mock was
verified, QA closed, and before/after snapshots preserved privately. Installed
alpha.4 binary and original SQLite were byte-unchanged. Source fixes are now in the
feature-branch Git history, not the installed release. See
`worklog/2026-10-25-real-provider-retry-after-login.md` for final test evidence and
`worklog/2026-10-25-generic-project-readiness-fix.md` for implementation checks.

Subsequent approved local fixes now bind step evidence v2 to current run/task/spec,
attempt and SHA-256 pins in SQLite, supply actual input references/summaries to
CLI stages, and require matching citations for real QA/review/security/acceptance.
Final acceptance rechecks the chain. Broad masking is informational rather than a
credential finding; concrete indicators remain masked and blocking. New non-Git
runs use a pinned pre-execution filesystem baseline and allow/deny comparison
before/after executable stages. Legacy/incomplete/tampered evidence fails closed.
These changes pass 75 Rust tests (12 added beyond the prior readiness baseline),
offline native build, TypeScript/Vite and all ten smoke suites. A deterministic
local pipeline exercises rejected citations, Retry, acceptance and tampering.
The local implementation task made no new AI calls, native UI test, install or
remote CI run. Subsequent authorized Git publication is recorded at the top.
Installed alpha.4 and the old failed live test are not recertified by these checks.
See `worklog/2026-10-25-evidence-integrity-and-non-git-scope.md` and
`docs/REAL_PROJECT_READINESS.md` for exact compatibility and scope limits.

## Architecture

- Tauri 2 desktop application with a React 18/TypeScript frontend and Rust/SQLite
  native runtime.
- The portable project contract is stored under `.dbc`; raw secrets are excluded and
  integrations use keychain references only.
- Versioned CLI adapters cover mock, local terminal, Codex, Claude, Kimi, Qwen, and
  generic runners. Disabled OpenAI-compatible API contracts cover Qwen and Kimi.
- Dynamic routing policies replace brand-coded strategies while preserving migration
  compatibility. A HarnessRun seals provider/model/adapter/fallback/MCP identity.
- MCP is an independent connection and ToolPolicy layer. The stdio proxy mediates
  `tools/call` before forwarding to a server.
- Harness objects are TaskContract, WorkSlice, HarnessRun, and EvidencePack v2.

## Verified functionality

- Run is the default operator path; Approvals, Evidence, and Settings are primary and
  expert screens remain under Advanced.
- The primary Run flow uses the selected Dibi Workshop identity: a Dibi border-collie
  brand mark, midnight navigation, cream/light workspace, cyan/violet/coral accents,
  protected-run summary, three-stage journey, and a real workshop illustration. Guided
  Run copy is English-only; runtime language switching and persisted locale state were
  removed by product-owner decision.
- The Dibi system icon source is 1024×1024 and the complete Tauri PNG/ICNS/ICO,
  Android, iOS, and Windows tile icon set was regenerated from it.
- Browser preview is deterministic and side-effect-free. Native mode persists task,
  run, approval, evidence, configuration, recovery, and release artifacts.
- Kimi and Qwen templates have discovery, version/auth/capability diagnostics, current
  headless argument normalization, JSONL parsing, and backend safety gates. Qwen is
  limited to plan/safe/zero built-in tools. Kimi real print/AFK execution remains
  blocked because its built-in tools cannot be mediated honestly.
- The MCP Connection Center persists `.dbc/mcp-connections.yaml` and
  `.dbc/tool-policies.yaml`. Stdio discovery negotiates the current protocol then the
  stable fallback and lists tools without calling them. Remote HTTP/SSE profiles are
  contract-validated but not contacted without an approved live fixture.
- ToolPolicy evaluates intent, path traversal/allow/deny, external hosts, sensitive
  arguments, size, retries, idempotency, and run approval. The stdio proxy writes
  redacted JSONL decisions/outcomes and never stores raw arguments.
- AI Team includes capability-aware primary/fallback routes, Balanced Kimi/Qwen preset,
  Routing Simulator, risk-gated fallback decisions, cost/latency/residency/egress
  constraints, and read-only output comparison.
- API contracts require HTTPS, model/region metadata, and a macOS Keychain reference.
  The keychain probe checks only item presence; no secret value or paid request is read.
  The source-backed model catalog is importable and portable in `.dbc/model-catalog.yaml`.
- EvidencePack schema v2 verifies TaskContract, WorkSlice, HarnessRun, and execution
  identity, summarizes MCP/routing activity, and records usage with explicit confidence.
  Native acceptance rejects a legacy/incomplete pack or an identity mismatch.
- UI hardening includes English navigation and primary actions, fixed `lang=en`,
  skip navigation, keyboard focus, reduced motion, local-only opt-in diagnostics, CSP,
  responsive layouts, and enforced JS/CSS performance budgets.
- The PR #16 baseline production frontend build passed at 423,305 B JS / 115,364 B gzip
  and 41,468 B CSS / 8,308 B gzip, within the recorded budgets. The Dibi mark and workshop image add
  271,886 B and 558,444 B respectively to the production assets.
- PR #16 baseline Rust tests passed: 51 passed, 0 failed. Offline native debug build, TypeScript and
  Vite build passed. Provider,
  MCP policy, MCP proxy, API adapter, Guided Run, UI quality, native contract, and
  performance checks passed; the complete final rerun is recorded in the current
  worklog. Controlled smoke used a temporary build-only adapter for the unavailable
  pnpm entry point; this does not certify pnpm installation or a live provider.
- Native CLI execution now drains stdout/stderr concurrently with bounded head/tail
  buffers, concurrent stdin, timeout, cancellation and child reaping. Incomplete
  output fails acceptance even when it contains a passing verdict. Unix owned process
  groups are terminated; this is not an operating-system sandbox.
- Provider help/version probes have a five-second deadline and bounded output. Qwen
  setup checks require declared plan/stream-json values and turn/time/tool budgets.
  These are help-text checks, not proof of model access or installed-version conformance.
- Settings exposes compile-time build version/label/SHA/source state/time/target/profile
  and runtime executable path; signing remains explicitly unverified. Native process
  activity exposes metadata and Stop, not prompts or output. Loop advancement and
  retry/resume/approval mutations are serialized per loop. Stop also covers preparation
  of an already registered loop operation, and late frontend results are ignored.
- New diagnostics were checked in browser preview at 375/768/1440 widths with long
  fixture values, disabled stop state, keyboard navigation, and no console warnings or
  errors. Rust/contract tests cover the native bridge; the later alpha.3 native-window
  smoke check below covers mock-loop lifecycle and installed build identity only.
- On 2026-09-01, visual QA compared the selected 1487×1058 concept and implementation in one raster,
  then verified 1487×1058 desktop, 1024×768 tablet, and 430×932 mobile states. No P0,
  P1, or P2 findings remain; the final browser console had no warnings or errors.

- Follow-up Stop/Resume persists stopping/stopped/interrupted in SQLite and claims
  an executing attempt before side effects. Stop confirms only after loop ownership
  is released; late completion preserves Stop. Resume cannot retry interrupted/failed
  work. Explicit Retry retains budgets and archives prior evidence. Pending approvals
  cannot be bypassed and are restored when opening the run.
- Startup marks unfinished work interrupted without replay. A separate exclusive
  SQLite runtime lease coordinates instances of this version; older versions do not
  honor it and must be closed first. Crash-surviving processes require inspection.
- Stop/Resume checks: 60 Rust tests, native debug build, TypeScript/Vite build, nine
  behavioral continuation/recovery scenarios and existing smoke gates passed. Real
  local-process cancellation, partial evidence and SQLite reopen were tested. Actual
  browser controls were checked at 375/768/1440 widths. Subsequent installed arm64
  alpha.3 QA exercised native IPC and application restart with mock loops: Stop and
  Resume passed, but Retry after interruption failed to open confirmation. See
  `docs/STOP_RESUME.md` and the native-installation worklog for the exact scope.
  Publication rerun also passed all 60 Rust tests, formatting, native debug build,
  TypeScript/Vite and every listed smoke gate; JS measured 427,351 B / 116,557 B gzip,
  CSS 41,515 B / 8,330 B gzip. Both remain within the enforced budgets.

## Distribution state

- [Release v0.2.0-alpha.4](https://github.com/vistadi/dildin-build-control/releases/tag/v0.2.0-alpha.4)
  is published as non-draft prerelease `423444531` at `2026-10-25T14:11:38Z` from
  `06a7ea5`. New annotated tag object `4037665652703b1d7eda0df070480baf3e26168d`
  points to the full release SHA above. Release `40200589766`, CI `40200564567`
  and CodeQL `40200564547` passed. All six public assets were downloaded and
  verified by size/SHA-256; both manifests, DMG integrity and binary architecture/
  embedded build identities passed. DMG SHA-256: arm64
  `7db70dca15caf2cf632fc4445c55a3b479dc2e4b2802399050fdee5ce25c74eb`;
  x64 `494c8630cf10ded08a98571081e7c52b501e9cff5a60bab3f3c286cd262d5cbb`.
  This is artifact-level verification, not a new native-window or Intel launch test.
  Distribution remains unsigned/non-notarized. This release operation preserved
  installed alpha.3; separately approved alpha.4 installation/QA is recorded below.
- [PR #19](https://github.com/vistadi/dildin-build-control/pull/19) merged into main
  at `2026-10-25T12:54:34Z` as `4668e81`, preserving all three commits. Exact-head
  CI `40193630062` and CodeQL `40193630001` passed; aggregate check `121169909195`
  found no new alerts. The signed-in browser performed a normal merge after the
  connector returned HTTP 403. No protection or permission changed. Local main was
  fast-forwarded; the feature branch was retained. Alpha.4 preparation changes only
  release documentation and memory, not runtime code or numeric package versions.
- [PR #18](https://github.com/vistadi/dildin-build-control/pull/18) merged into `main`
  on 2026-10-25 as `66dcf66`, preserving runtime `5110d0a` and memory `9c1cebc`.
  Exact-head CI `40127899814` and CodeQL `40127899761` passed, as did aggregate
  CodeQL check `120973402414` (no new alerts). Normal signed-in browser merge
  succeeded after connector HTTP 403; no permissions or check protections changed.
  Local `main` was fast-forwarded before release preparation.
- [Release v0.2.0-alpha.3](https://github.com/vistadi/dildin-build-control/releases/tag/v0.2.0-alpha.3)
  was published on 2026-10-25 from `2904b20`, after the explicitly approved release
  commit and new annotated tag. Release workflow `40181600137` passed its complete
  quality gate (60 Rust tests) and arm64/x64 packaging; CI `40181596283` and CodeQL
  `40181596272` passed on the same source commit. Six public assets are present:
  two app archives, two DMGs and two SHA-256 manifests. Downloaded asset sizes and
  digests match GitHub; both manifests verify and both DMGs pass `hdiutil verify`.
  DMG SHA-256: arm64 `d5cf33c4669215d85b4ab17bc367747516bc7d63b3ae32207c610c1dfe38d229`;
  x64 `23abd17e29e8e3c1a02a8a6d02e75245dfb0b770bdb03da954d26925cdd8fa48`.
  Both Mach-O architecture headers and embedded alpha.3 label/`2904b20` full SHA
  were statically verified. Distribution remains unsigned and non-notarized;
  subsequent arm64 installation/native smoke results are recorded below, not a
  certification of the Intel build or every native workflow.
- The 2026-10-24 runtime commit `c4b4287` and memory commit `c8fe6dd` are pushed to
  `codex/native-execution-diagnostics` in now-merged
  [PR #16](https://github.com/vistadi/dildin-build-control/pull/16) targeting `main`.
  GitHub API verification confirmed head `c8fe6dd`, two commits, 25 files and
  `merged: false` at creation. The maintainer signed in and browser submission
  succeeded after the connector's HTTP 403; no integration permissions were expanded.
  Publication checkpoint `4090ff3` is also pushed. On 2026-10-24, CI run
  `40118002186` passed on that head (51 Rust tests, frontend/contracts/performance
  and five EvidencePack gates). CodeQL workflow `40118002168` completed successfully,
  but aggregate check `120943469449` failed on High alert #6,
  `rust/cleartext-logging`, at `src-tauri/src/main.rs:10537`. Static triage found the
  reported path non-actionable: count-only diagnostics, a test-only assertion and
  an empty fixed prompt; this is not a dynamic security validation. The alert remains
  open at review and no bypass/dismissal was made. The maintainer then approved removal
  of raw stderr from the assertion diagnostic, commits/push and merge after green
  exact-head CI. This test-only change preserves status/output/acceptance assertions;
  formatting and all 51 Rust tests passed locally. Follow-ups `8358e63` (test) and
  `ea402f1` (memory) were committed/pushed. CI `40123421084` and CodeQL `40123421116`
  passed; aggregate check `120959885871` reported no new alerts and the browser
  marked the security thread Fixed. After the connector's merge 403, the signed-in
  browser merged PR #16 as `3b21f7446caca6fb216f395c0f4a3be542b307cc`; API confirmed
  merged at `2026-10-24T19:08:09Z`. Local main was fast-forwarded. No new release.
- Release metadata is aligned at `0.2.0`. Tag `v0.2.0-alpha.1` points to release commit
  `8f12f95`; its complete quality gate passed, but both macOS packaging jobs failed
  before a GitHub Release was created. The non-destructive follow-up
  `v0.2.0-alpha.2` points to `e998b97` and was published successfully as an unsigned
  GitHub prerelease on 2026-09-01.
- A fresh local arm64 app and DMG containing the English-only Dibi Workshop UI and
  system icon were built on 2026-09-01. The DMG is 10,184,739 bytes, passed
  `hdiutil verify`, and has SHA-256
  `27ed30f055736df654ad4dc1640f7b46333b36ecc947f9edefc46a2345cf3968`.
- The historical 2026-09-01 local bundle was built at
  `src-tauri/target/release/bundle/macos/Dildin Build Control.app`; the DMG is at
  `src-tauri/target/release/bundle/dmg/Dildin Build Control_0.2.0_aarch64.dmg`. This
  earlier task did not install that bundle into `/Applications`.
- `/Applications/Dildin Build Control.app` now runs the verified arm64
  `v0.2.0-alpha.4` from `06a7ea5c3171305ce58cc534487696698df96917`, installed on
  2026-10-25. Native Settings confirms tag, full SHA, clean sources, release profile,
  architecture and executable path. Binary SHA-256:
  `7fcde40baaa5f82916e1a1af03c8ea5379c72a513b92a9cc81ef1efefb4fd02b`.
- Immediately preceding alpha.3 app plus matching Application Support/WebKit are
  byte-verified at
  `/Users/vitaliy/Library/Application Support/DBC Backups/2026-10-25-before-alpha4-zZc017`.
  Rollback binary SHA-256:
  `61a9c458b2d950254f0345b462279a3eade7e244ee8a790d92e2c0cd13b5f8e8`.
  `ROLLBACK.md` describes coordinated app/data restoration. `post-qa` preserves
  the complete test session; `native-qa` contains the workspace, metadata and eight
  screenshots. Before final relaunch both original data directories matched their
  backups; after launch the main SQLite was still byte-identical, quick-check ok,
  and contained only the original five failed loops. No QA loops remain in active data.
- The previous installed app (numeric 0.2.0; exact prerelease not established),
  matching SQLite and WebKit state are byte-verified backups at
  `/Users/vitaliy/Library/Application Support/DBC Backups/2026-10-25-before-alpha3-y7oLQB`.
  That app's observed binary hash was
  `2bf1d685e991ac8bf3135b90feb4614f0a2e12d9e624b00dc1270fcfb522f036`, superseding
  the stale August installed-binary observation. `ROLLBACK.md` explains coordinated
  application/data rollback. Private QA evidence and post-QA data are preserved
  separately inside the same backup; original user state was restored before the
  final alpha.3 launch. No Gatekeeper or quarantine protections were changed.
- The historical 2026-09-01 local package was arm64 only and
  ad-hoc/linker-signed with no Team ID. Strict Developer ID, Gatekeeper, and
  notarization claims are not valid.
- Apple Developer ID credentials are not present. No current build may be described as
  signed or notarized, and Homebrew publication still requires verified release hashes.
- The provider/MCP/Evidence v2 checkpoint `9950833`, Dibi Workshop/English-only UI
  checkpoint `1b2cfa2`, and memory checkpoint `27284fc` are committed and pushed to
  `origin/main`.
- The release workflow now gates packaging on provider, MCP policy/proxy, API adapter,
  UI, native bridge, performance, deterministic EvidencePack, frontend, formatting,
  and Rust checks before building both macOS architectures. Its current alpha path is
  explicitly unsigned and does not pass empty Apple signing/notarization variables to
  the Tauri bundler.
- GitHub Release `v0.2.0-alpha.2` contains arm64/x64 app archives, arm64/x64 DMGs, and
  two SHA-256 manifests. Published DMG hashes are
  `2b762ca3ed78d6e2588dfe3668b1270b001d5041c0577040d5ac3cdb12a81cb6`
  for arm64 and
  `ac4709e9f9c5ca5a5d8a984133cca4a007b47592ad94163824694f69933eed3f`
  for x64; both manifest contents match the GitHub asset digests.

## Known limitations

- The product remains an early alpha.
- Historical arm64 alpha.3 could not continue an interrupted loop through
  `Retry step`: mouse and keyboard activation produce no confirmation or new attempt.
  That release's handler uses `window.confirm` (`src/App.tsx`); locked Wry 0.55.1 macOS
  WKUIDelegate has no JavaScript-confirm handler, consistent with the observed
  failure. The fix is now installed in alpha.4 and passed release-binary native
  mock Cancel/Escape/Retry QA. Alpha.3 rollback retains the historical defect.
- Released alpha.3's Harness Runs helper badge incorrectly says Running for
  stopped/interrupted legacy loops. The merged fix now uses the selected loop's
  actual status, falling back to the HarnessRun status only without a selected loop.
  Desktop QA verified Interrupted, Running, Completed and Stopped; browser tests
  also cover approval/budget/pending states. Installed alpha.4 release-binary QA
  confirms correct Interrupted, Running, Completed and Stopped statuses.
- Workspace's internal tab-strip buttons have no handlers (`src/App.tsx`); use
  the functional primary navigation. Native QA observed Tasks in that strip doing
  nothing. This predates and does not invalidate the lifecycle fixes.
- Legacy preflight route/build diagnostics still use global agent settings even
  when Local Safe Mock resolves every actual step to `mock_adapter`. Fresh mock
  workspaces also show an absent approval ledger as an artifact diagnostic error.
  These need diagnostic/UX alignment; observed execution remained fully mock.
- Native installation QA used the advanced legacy-loop path and mock adapters only.
  It did not certify live provider cancellation, crash-surviving descendants,
  second-instance exclusion, Intel launch, or the complete Guided Harness journey.
- The 2026-10-11 pipe-draining finding was addressed on 2026-10-24 and tested with
  deterministic local processes exceeding pipe capacity. Other subprocess paths
  (for example Git/MCP helpers) were not migrated wholesale. Non-Unix descendant
  termination is not implemented; detached descendants escaping the owned Unix group
  are outside the guarantee. Merged PR #16 Stop was not a durable pause; the PR #18
  follow-up adds persistent lifecycle states. Stop is still not rollback. Inspect
  external processes after a crash before explicitly retrying.
- The Qwen profile still requires `--approval-mode plan`. Current official Qwen
  references and the 2026-09-10 changelog disagree about Plan/permission semantics.
  A pinned-version compatibility fixture is needed before changing the guard.
- The bundled model catalog in `src/apiAdapters.ts` still records `2026-08-12`
  verification dates. Those entries are not evidence of current account availability.
- Kimi/Qwen installed-version and live model fixtures were not run because the CLIs and
  approved credentials are unavailable on this Mac.
- Remote Streamable HTTP/OAuth MCP discovery and conformance are not live-tested.
- Kimi built-in print/AFK tools and Qwen controlled write remain disabled; external MCP
  tools can be governed through the DBC proxy but are not silently injected into a CLI.
- API execution remains disabled until a separately approved credentialed fixture
  verifies endpoint behavior, normalized reports, and usage.
- The shipped product UI is intentionally English-only. Internal Russian planning and
  operator notes remain documentation, not a runtime locale. An independent WCAG 2.2 AA
  audit remains beta hardening.
- `App.tsx` remains large and should be decomposed before further major UI expansion.
- Signed/notarized universal macOS distribution requires external Apple credentials and
  clean-machine verification.

## Immediate priorities

Next priorities after the verified 2026-10-25 alpha.4 release:

0. Inspect exact-head CI/CodeQL and review PR #20's readiness/YAML/evidence changes.
   The authorized feature-branch publication is complete. The three live-example
   blockers are locally fixed/tested, not installed or live-retested. Obtain fresh
   authorization before desktop/live QA, merge or release. Preserve failed evidence
   and the seven-of-eight call count.
1. Fix the inert Workspace shortcuts and align preflight/artifact diagnostics with
   effective mock routing, then cover real-process cancellation, forced recovery
   and second-instance behavior in separately scoped fixtures.
   Validate pinned Kimi/Qwen contracts without weakening blocked/zero-tool profiles.
2. Prototype one interactive agent integration (Kimi ACP or Codex app-server) with
   DBC-owned approval, cancellation, session identity, and evidence. ACP is not MCP
   and is not an operating-system sandbox.
3. Validate one approved remote OAuth MCP server, then extend connection UX and
   protocol conformance rather than merely changing the advertised protocol version.
4. Split touched Run, Evidence, Connections, and Provider modules as needed for these
   changes; complete English-only accessibility testing.
5. Preserve the verified arm64 build identity and rollback procedure; configure Apple
   credentials and verify both architectures before claiming signed/notarized distribution.

Detailed proposals, source dates, uncertainties, and acceptance criteria:
`worklog/2026-10-11-current-ecosystem-improvements.md`.
