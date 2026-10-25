# DBC Project State

Last verified repository/release update: 2026-10-25. PR #19 merged into `main` as
`4668e8122b89d9d77a50e6a8f0911cd679674179` after all five exact-head CI/CodeQL checks
passed at `af986ad`, with no new CodeQL alerts and no review threads. Release
`v0.2.0-alpha.4` is being prepared; both release/memory commits, push and tag are approved.
It is not yet tagged or published. PR #18 previously merged into `main` as
`66dcf66`, including PR #16 and durable Stop/Resume. Unsigned macOS prerelease
`v0.2.0-alpha.3` is published from `2904b206360cad628370639e9e85259063177eb5`.
CI, CodeQL, release quality and both macOS packaging jobs passed. All six downloaded
assets match published SHA-256 digests; both DMG manifests and image integrity
checks passed. Static binary inspection confirmed the architecture, build label
and release SHA for both builds. On 2026-10-25 the verified arm64 release was
installed in `/Applications`, with the previous application and local data backed
up. Native mock-only QA passed launch, Stop, stopped-state persistence, Resume
without replay, and restart-to-Interrupted recovery without automatic execution.
However, native `Retry step` does not show its confirmation or continue the run;
post-interruption continuation is not certified for that released build. A subsequent
fix on `codex/native-retry-confirmation` replaces native confirm with an in-app
Cancel/Confirm retry panel and displays the actual selected run status. Separate
arm64 desktop QA passed Cancel/Escape without mutation and confirmed Retry through
completion without replaying completed steps. Code `2ac67f5`, installation report
`1d4863b` and memory `af986ad` are preserved in merged
[PR #19](https://github.com/vistadi/dildin-build-control/pull/19).
The fix is merged but not released; alpha.4 publication is pending.
Original user data was restored
after preserving the QA session separately; alpha.3 remains installed and running.
Live-provider, forced-crash and second-instance QA remain unperformed. See the
2026-10-25 release and native-installation worklogs for evidence and limitations.

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
  `v0.2.0-alpha.3` from `2904b206360cad628370639e9e85259063177eb5`, installed on
  2026-10-25. Native Settings confirms tag, full SHA, clean sources, release profile,
  architecture and executable path. Binary SHA-256:
  `61a9c458b2d950254f0345b462279a3eade7e244ee8a790d92e2c0cd13b5f8e8`.
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
- Installed arm64 alpha.3 cannot currently continue an interrupted loop through
  `Retry step`: mouse and keyboard activation produce no confirmation or new attempt.
  That release's handler uses `window.confirm` (`src/App.tsx`); locked Wry 0.55.1 macOS
  WKUIDelegate has no JavaScript-confirm handler, consistent with the observed
  failure. The subsequent merged fix passed native mock Cancel/Retry QA, but is not
  included in installed alpha.3. No fix was applied during the earlier installation.
- Released alpha.3's Harness Runs helper badge incorrectly says Running for
  stopped/interrupted legacy loops. The merged fix now uses the selected loop's
  actual status, falling back to the HarnessRun status only without a selected loop.
  Desktop QA verified Interrupted, Running, Completed and Stopped; browser tests
  also cover approval/budget/pending states. No new release was created.
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

Next priorities after the verified 2026-10-25 alpha.3 release:

1. Complete the approved alpha.4 release, verify both architecture assets,
   then cover real-process cancellation, forced recovery
   and second-instance behavior.
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
