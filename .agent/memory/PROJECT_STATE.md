# DBC Project State

Last verified source/build/test update: 2026-10-24 (`c4b4287`, based on `d688407`).
Runtime implementation is pushed to `codex/native-execution-diagnostics`; remote
`main` was independently checked at `d688407`. The distribution and
installation observations below remain dated 2026-09-01 or earlier; no new release,
installation, live-provider fixture or native-window end-to-end QA was performed.

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
- The 2026-10-24 production frontend build passed at 423,305 B JS / 115,364 B gzip
  and 41,468 B CSS / 8,308 B gzip, within the recorded budgets. The Dibi mark and workshop image add
  271,886 B and 558,444 B respectively to the production assets.
- Rust tests passed: 51 passed, 0 failed. Offline native debug build, TypeScript and
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
  errors. Native bridge behavior is covered by Rust/contract tests, not native-window QA.
- On 2026-09-01, visual QA compared the selected 1487×1058 concept and implementation in one raster,
  then verified 1487×1058 desktop, 1024×768 tablet, and 430×932 mobile states. No P0,
  P1, or P2 findings remain; the final browser console had no warnings or errors.

## Distribution state

- The 2026-10-24 runtime commit `c4b4287` and memory commit `c8fe6dd` are pushed to
  `codex/native-execution-diagnostics` in open
  [PR #16](https://github.com/vistadi/dildin-build-control/pull/16) targeting `main`.
  GitHub API verification confirmed head `c8fe6dd`, two commits, 25 files and
  `merged: false` at creation. The maintainer signed in and browser submission
  succeeded after the connector's HTTP 403; no integration permissions were expanded.
  CI was queued, not verified passing. Main remains `d688407`; no release was published.
- Release metadata is aligned at `0.2.0`. Tag `v0.2.0-alpha.1` points to release commit
  `8f12f95`; its complete quality gate passed, but both macOS packaging jobs failed
  before a GitHub Release was created. The non-destructive follow-up
  `v0.2.0-alpha.2` points to `e998b97` and was published successfully as an unsigned
  GitHub prerelease on 2026-09-01.
- A fresh local arm64 app and DMG containing the English-only Dibi Workshop UI and
  system icon were built on 2026-09-01. The DMG is 10,184,739 bytes, passed
  `hdiutil verify`, and has SHA-256
  `27ed30f055736df654ad4dc1640f7b46333b36ecc947f9edefc46a2345cf3968`.
- The current local bundle is at
  `src-tauri/target/release/bundle/macos/Dildin Build Control.app`; the DMG is at
  `src-tauri/target/release/bundle/dmg/Dildin Build Control_0.2.0_aarch64.dmg`. This
  task did not install the new bundle into `/Applications`.
- `/Applications/Dildin Build Control.app` was last updated from the 2026-08-12 bundle;
  its binary checksum then matched that build
  (`e9beba9278391a62b08e0e9aa1714efec2fbc90ba44b6d73853002a01f4bfb3e`).
  The previous bundle is recoverable at
  `/private/tmp/dbc-desktop-backup-20260812-1438/Dildin Build Control.app`.
- The previously installed 2026-08-12 application launched successfully and its native
  process was observed. The current 2026-09-01 package is arm64 only and
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
- The 2026-10-11 pipe-draining finding was addressed on 2026-10-24 and tested with
  deterministic local processes exceeding pipe capacity. Other subprocess paths
  (for example Git/MCP helpers) were not migrated wholesale. Non-Unix descendant
  termination is not implemented; detached descendants escaping the owned Unix group
  are outside the guarantee. Stop is not rollback or a durable database pause command.
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

Next priorities after the approved 2026-10-24 implementation milestone:

1. Review PR #16 and its CI results, then validate native UI
   stop/resume and pinned Kimi/Qwen contracts;
   keep existing blocked/zero-tool profiles until replacement safeguards are verified.
2. Prototype one interactive agent integration (Kimi ACP or Codex app-server) with
   DBC-owned approval, cancellation, session identity, and evidence. ACP is not MCP
   and is not an operating-system sandbox.
3. Validate one approved remote OAuth MCP server, then extend connection UX and
   protocol conformance rather than merely changing the advertised protocol version.
4. Split touched Run, Evidence, Connections, and Provider modules as needed for these
   changes; complete English-only accessibility testing.
5. Verify the new build identity on packaged artifacts; configure Apple credentials and verify both
   architectures before claiming signed/notarized distribution.

Detailed proposals, source dates, uncertainties, and acceptance criteria:
`worklog/2026-10-11-current-ecosystem-improvements.md`.
