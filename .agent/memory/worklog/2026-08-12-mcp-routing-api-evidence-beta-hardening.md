# MCP, routing, API, EvidencePack v2, and beta hardening — 2026-08-12

## Task objective

Continue the approved DBC master plan without stopping: complete the remaining
functional phases for MCP governance, dynamic routing, Kimi/Qwen API contracts,
EvidencePack v2, UI/accessibility/performance hardening, documentation, native build
validation, and Git handoff.

## Approved scope

- Implement Phases 2–6 in priority order while preserving DBC safety boundaries.
- Do not expose raw secrets, silently enable tools, send paid model calls, or claim
  signed/notarized status without evidence.
- Preserve unrelated working-tree changes and do not commit or push without explicit
  Git authorization.

## Initial repository state

- Branch `main`, tracking `origin/main`, HEAD `546ede4`.
- The working tree already contained the uncommitted master plan plus Phase 0/1 source,
  test, CI, documentation, and memory changes from the same continuing task.
- Kimi/Qwen read-only adapter contracts existed, but MCP storage/proxy, dynamic
  fallback UI, API contracts, EvidencePack v2, and final hardening were not implemented.
- Kimi/Qwen CLIs and Apple signing credentials were not available on this Mac.

## Plan

1. Add MCP connection/policy data, persistence, discovery, and Connection Center.
2. Implement a run-scoped MCP policy proxy, approvals, malicious fixtures, and evidence.
3. Add dynamic routing/fallback, balanced preset, Team Builder, constraints, and output
   comparison.
4. Add keychain-only API contracts, model catalog, report/usage normalization.
5. Implement EvidencePack v2 and product hardening.
6. Run full validation and native packaging, then update durable memory and Git handoff.

## Work completed

- Added typed MCP connections, ToolPolicy, migration/defaults, portable
  `mcp-connections.yaml`/`tool-policies.yaml`, stdio discovery, protocol fallback,
  schema validation, Connection Center, and disabled-until-ready behavior.
- Added frontend and Rust policy evaluation plus `dbc-mcp-proxy.mjs`. The proxy
  intercepts `tools/call`, requires run-scoped approval for governed side effects,
  enforces path/network/argument/retry/idempotency limits, redacts stderr, and appends
  checksum-based JSONL evidence without raw arguments.
- Added malicious Rust tests and a real stdio JSON-RPC fixture/proxy smoke.
- Added provider cost/latency/residency/egress/context metadata, capability-aware role
  routes, risk-gated fallback, a Balanced Kimi/Qwen preset, Routing Simulator, Team
  Builder, fallback evidence, and read-only output comparison.
- Added disabled Qwen/Kimi OpenAI-compatible API profiles, HTTPS/model/region validation,
  macOS Keychain item-presence checks without reading values, curated source-backed
  model metadata, portable catalog persistence/import, request construction, normalized
  structured reports, and explicit-confidence usage.
- Upgraded EvidencePack to schema v2 with required-artifact checksum verification,
  execution identity seal, MCP/routing activity summaries, unknown-safe usage, SQLite
  migration, Markdown reporting, and an acceptance block for legacy/incomplete packs.
- Added core RU/EN navigation and primary actions, document language, skip navigation,
  aria-current, visible keyboard focus, reduced motion, responsive mobile treatment,
  local-only opt-in diagnostics, and production/dev Content Security Policy.
- Added UI-quality, native-contract, and asset performance-budget scripts and CI steps.
- Updated README, architecture, install, roadmap, master plan, decisions, open questions,
  active plan, and current-state memory to match executable behavior.

## Files created and modified

- Frontend/runtime: `src/App.tsx`, `src/styles.css`, `src/types.ts`, `src/data.ts`,
  `src/storage.ts`, `src/tauriBridge.ts`, `src/cliContracts.ts`, `src/apiAdapters.ts`,
  `src/mcp.ts`, `src/providerAdapters.ts`, `src/providerStreams.ts`, `src/routing.ts`,
  `src-tauri/src/main.rs`, `src-tauri/src/harness.rs`, `src-tauri/tauri.conf.json`.
- Tests/tooling: `package.json`, `.github/workflows/ci.yml`, provider/API/MCP/UI/native/
  performance smoke scripts, MCP/provider fixtures under `tests/`.
- Documentation/memory: `README.md`, `docs/ARCHITECTURE.md`, `docs/INSTALL.md`,
  `docs/ROADMAP.md`, `docs/UI_UX_MCP_KIMI_QWEN_MASTER_PLAN_RU.md`, `.agent/PLANS.md`,
  `.agent/memory/PROJECT_STATE.md`, `.agent/memory/DECISIONS.md`,
  `.agent/memory/OPEN_QUESTIONS.md`, and this worklog.

## Commands and checks executed

- TypeScript no-emit check and Vite production build with bundled Node.
- `cargo fmt` and `cargo test` with the local Rust toolchain.
- Provider adapter, MCP policy, MCP proxy, and API adapter contract smokes.
- UI-quality, native-contract, and production-asset performance-budget smokes.
- Local Vite server plus headless Chrome screenshots at 1440x940 and 430x932.
- Controlled smoke with the explicit existing-change waiver and `dbc:verify`.
- Native Tauri release packaging, `hdiutil verify`, SHA-256, architecture/plist,
  signature/Gatekeeper, installed-bundle equality, and launch checks.
- Release metadata check, `git diff --check`, tracked/untracked inventory, remote/HEAD
  inspection, and secret-pattern scan excluding generated dependencies/artifacts.

## Validation results

- EvidencePack v2 compile/test checkpoint: TypeScript passed; Rust passed 36/36.
- Production frontend checkpoint: 1,592 modules; JS 415,504 B raw / 112,744 B gzip;
  CSS 33,296 B raw / 6,344 B gzip. Both are within budget.
- UI quality passed 10 assertions; native contract passed 11 assertions.
- Desktop/mobile visual review found no overlapping primary content. The mobile
  language toggle was reduced from a full-width action to a compact control.
- Final contract suite passed: Guided Run 28/28, MCP policy 20 assertions, MCP proxy,
  provider adapter/streams, API adapter, UI quality 10 assertions, native contract 11
  assertions, TypeScript, production build/performance budget, rustfmt, and Rust 36/36.
- Controlled smoke completed with seven evidence records. `dbc:verify` returned passed,
  accepted, zero missing artifacts, zero warnings, and zero pending approvals. The
  explicit waiver covered only pre-existing working-tree changes; denied paths remained
  enforced.
- Native arm64 `.app` and DMG built successfully. DMG size is 5,269,356 bytes and
  SHA-256 is `9ef920225f56c5510a0fb1cd1d1d75f68e2f7cd9da31e19158c3560be56b9edf`;
  `hdiutil verify` reported a valid checksum.
- The app binary SHA-256 is
  `e9beba9278391a62b08e0e9aa1714efec2fbc90ba44b6d73853002a01f4bfb3e`.
  `/Applications/Dildin Build Control.app` matches the built bundle byte-for-byte and
  launched successfully. The previous installed binary was backed up under
  `/private/tmp/dbc-desktop-backup-20260812-1438/`.
- Signature evidence is negative by design: the bundle is ad-hoc/linker-signed,
  `TeamIdentifier` is absent, and strict codesign/Gatekeeper verification fails. It was
  not described as Developer ID signed or notarized.
- Release metadata is aligned at `0.1.1`; `git diff --check` passed and the secret scan
  found no private-key, GitHub token, or secret-shaped API credential in task files.

## Git handoff

- Current branch: `main`, tracking `origin/main`; HEAD
  `546ede45ddc8a35d44aee0b44a400e7d70bcb870`.
- The worktree was already dirty when this continuation began because the same task's
  Phase 0/1 and master-plan changes were uncommitted.
- No files were staged, no commit was created, and nothing was pushed in this task.
- Proposed commit 1: `feat(platform): add governed MCP and Kimi/Qwen orchestration` for
  source, native runtime, tests, scripts, package metadata, and CI.
- Proposed commit 2: `docs(memory): record completed DBC platform phases` for README,
  changelog, architecture/install/roadmap/master-plan documents, plans, decisions,
  questions, project state, and worklogs.
- Staging must use explicit paths after operator approval; `git add .`/`-A` is not part
  of the proposal.

## Important discoveries and decisions

- An MCP discovery success is not authority to call tools; enabling and run approval are
  separate states.
- Kimi's external MCP access can be proxied, but that does not make its unmediated
  print/AFK built-ins safe. The Kimi runtime block remains truthful.
- Usage and price must remain unknown when an adapter response or verified catalog does
  not provide them. DBC does not estimate evidence.
- Legacy EvidencePacks remain readable after migration but cannot authorize a new Accept.
- The alpha telemetry decision is local-only and opt-in; no network exporter exists.

## Unresolved risks

- No native Kimi/Qwen installed-version/model fixture was possible on this Mac.
- Live Streamable HTTP/OAuth MCP conformance needs an explicitly approved test server.
- Paid API calls remain disabled until a separately approved credentialed fixture.
- `App.tsx` still needs feature decomposition and full screen-level RU/EN coverage.
- Independent WCAG 2.2 AA testing and Apple signed/notarized universal release
  verification require work outside the local contract slice.

## Manual verification steps

1. Install supported Kimi/Qwen CLIs intentionally, run discovery/contract checks, and
   use only a harmless non-secret fixture.
2. Configure one approved remote MCP OAuth fixture and run the official conformance
   suite before enabling remote tools.
3. Add API credentials only to the OS keychain, approve one minimal fixture, and verify
   normalized report/usage without logging the credential.
4. On a clean macOS account, verify current DMG checksum, install, launch, safe run,
   EvidencePack v2 acceptance, and recovery.
5. After Apple secrets exist, verify codesign, Gatekeeper, stapler, both architectures,
   and published checksums before changing release copy.

## Recommended next action

Review the final diff and present the explicit commit proposal. External-provider and
signed-release gates remain blocked on credentials/installations, not on hidden
assumptions.
