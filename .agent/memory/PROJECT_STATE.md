# DBC Project State

Last verified: 2026-08-31

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
- The production frontend build passed at 416,915 B JS / 112,648 B gzip and 40,694 B
  CSS / 8,161 B gzip, within the recorded budgets. The Dibi mark and workshop image add
  271,886 B and 558,444 B respectively to the production assets.
- Rust tests passed: 36 passed, 0 failed. TypeScript and Vite build passed. Provider,
  MCP policy, MCP proxy, API adapter, Guided Run, UI quality, native contract, and
  performance checks passed; the complete final rerun is recorded in the current
  worklog.
- Visual QA compared the selected 1487×1058 concept and implementation in one raster,
  then verified 1487×1058 desktop, 1024×768 tablet, and 430×932 mobile states. No P0,
  P1, or P2 findings remain; the final browser console had no warnings or errors.

## Distribution state

- Repository version remains `0.1.1` pending a deliberate version/release decision.
- A fresh local arm64 app and DMG containing the English-only Dibi Workshop UI and
  system icon were built on 2026-08-31. The DMG is 10,185,774 bytes, passed
  `hdiutil verify`, and has SHA-256
  `4e13bf48234381258e668081e08e348591a37c4ac1976c6bbb0faf6b74e51d5a`.
- The current local bundle is at
  `src-tauri/target/release/bundle/macos/Dildin Build Control.app`; the DMG is at
  `src-tauri/target/release/bundle/dmg/Dildin Build Control_0.1.1_aarch64.dmg`. This
  task did not install the new bundle into `/Applications`.
- `/Applications/Dildin Build Control.app` was last updated from the 2026-08-12 bundle;
  its binary checksum then matched that build
  (`e9beba9278391a62b08e0e9aa1714efec2fbc90ba44b6d73853002a01f4bfb3e`).
  The previous bundle is recoverable at
  `/private/tmp/dbc-desktop-backup-20260812-1438/Dildin Build Control.app`.
- The previously installed 2026-08-12 application launched successfully and its native
  process was observed. The current 2026-08-31 package is arm64 only and
  ad-hoc/linker-signed; strict codesign/Gatekeeper checks do not pass.
- Apple Developer ID credentials are not present. No current build may be described as
  signed or notarized, and Homebrew publication still requires verified release hashes.
- The provider/MCP/Evidence v2 checkpoint is committed as `9950833`; the Dibi Workshop
  and English-only UI checkpoint is committed as `1b2cfa2`. Neither commit has been
  pushed.

## Known limitations

- The product remains an early alpha.
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

1. Validate harmless installed Kimi/Qwen fixtures and one approved remote OAuth MCP
   conformance server when those external dependencies are available.
2. Split `App.tsx` into Run, Evidence, Connections, and Provider feature modules.
3. Complete independent accessibility testing for the English-only product surface.
4. Configure Apple release credentials and verify both architectures before publishing.
