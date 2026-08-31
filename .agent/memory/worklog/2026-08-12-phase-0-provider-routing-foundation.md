# Phase 0 provider and routing foundation — 2026-08-12

## Task objective

Start implementing the approved UI/UX, MCP, Kimi, and Qwen master plan in priority
order, beginning with the backward-compatible provider/routing foundation.

## Approved scope

- Introduce dynamic routing policies without breaking legacy tasks.
- Add versioned provider adapters and feature-flagged Kimi/Qwen templates.
- Add frontend and Rust safety normalization for Kimi/Qwen headless CLI contracts.
- Capture and persist immutable execution identity in HarnessRun and EvidencePack.
- Add schema migration and deterministic contract fixtures.
- Do not enable real Kimi/Qwen execution, implement MCP, commit, push, or deploy.

## Initial repository state

- Branch `main`, tracking `origin/main`, HEAD `546ede4`.
- Executable source was clean before this implementation slice.
- The working tree already contained the uncommitted master-plan documentation and
  memory updates created immediately before implementation.
- Provider routing still depended on the Codex/Claude-specific `ProviderStrategy`.
- HarnessRun and EvidencePack did not record the effective provider configuration.

## Plan

1. Map task, provider, bridge, storage, harness, and evidence contracts.
2. Add routing policy migration and versioned adapters.
3. Add Kimi/Qwen safety contracts and fixtures behind feature flags.
4. Persist immutable execution identity and seal it into EvidencePack.
5. Run typecheck, frontend build, adapter smoke, Guided Run smoke, formatting, and Rust
   tests.

## Work completed

- Added four default routing policies and automatic migration from all legacy provider
  strategies.
- Added a versioned adapter registry for mock, local runner, Codex, Claude, Kimi, Qwen,
  and generic CLI.
- Added hidden-by-default Kimi/Qwen provider templates controlled by
  `VITE_DBC_ENABLE_KIMI` and `VITE_DBC_ENABLE_QWEN`; templates remain disabled and mock.
- Added Kimi print/stream-json defaults and warnings that print mode auto-approves its
  internal tools.
- Added Qwen stream-json/plan defaults and normalization that removes `--yolo`, `-y`,
  and yolo approval mode in frontend and Rust contracts.
- Added an immutable execution identity snapshot with routing policy, role/provider,
  configured and effective provider ids, vendor, adapter version, invocation profile,
  model, run mode, capabilities, fallback, MCP ids, and stable config checksum. The
  compatibility harness records its actual mock/local executor instead of claiming that
  the configured real provider ran.
- Persisted execution identity in browser preview, Tauri bridge, HarnessRun SQLite rows,
  run manifests, EvidencePack SQLite rows, pack manifests, and Markdown reports.
- Added an additive migration for existing HarnessRun and EvidencePack tables.
- Added an acceptance invariant: an accepted EvidencePack must match its HarnessRun
  execution identity.
- Added execution identity visibility and checklist validation to the Evidence screen.
- Added JSON adapter fixtures, a deterministic Node contract smoke, and a CI step.
- Updated operator documentation, implementation plan, current state, decisions, open
  questions, and the Russian master plan.

## Files created and modified

- Source: `src/types.ts`, `src/routing.ts`, `src/providerAdapters.ts`,
  `src/cliContracts.ts`, `src/data.ts`, `src/storage.ts`, `src/tauriBridge.ts`,
  `src/App.tsx`, `src-tauri/src/harness.rs`, `src-tauri/src/main.rs`.
- Tests/CI: `scripts/provider-adapter-contract-smoke.mjs`,
  `tests/fixtures/provider-adapters.v1.json`, `package.json`, `.github/workflows/ci.yml`.
- Docs/memory: `README.md`, `docs/UI_UX_MCP_KIMI_QWEN_MASTER_PLAN_RU.md`,
  `.agent/PLANS.md`, `.agent/memory/PROJECT_STATE.md`,
  `.agent/memory/DECISIONS.md`, `.agent/memory/OPEN_QUESTIONS.md`, and this worklog.

## Commands and checks executed

- TypeScript: bundled Node ran `node_modules/typescript/bin/tsc`.
- Frontend: bundled Node ran `node_modules/vite/bin/vite.js build`.
- Contract fixtures: bundled Node ran
  `--experimental-strip-types scripts/provider-adapter-contract-smoke.mjs`.
- Guided UI contracts: bundled Node ran `scripts/guided-run-smoke.mjs`.
- Rust formatting: `/Users/vitaliy/.cargo/bin/cargo fmt --manifest-path
  src-tauri/Cargo.toml -- --check`.
- Rust tests: `/Users/vitaliy/.cargo/bin/cargo test --manifest-path
  src-tauri/Cargo.toml`.

## Validation results

- TypeScript passed.
- Vite production build passed (1,589 modules transformed).
- Provider adapter smoke passed: 2 adapters and 4 legacy routes.
- Guided Run smoke passed: 28 passed, 0 failed.
- Rust formatting passed.
- Rust tests passed: 28 passed, 0 failed.
- Controlled smoke and `dbc:verify` were not rerun because they generate project-local
  `.dbc` artifacts in an already-dirty source worktree; their last verified run remains
  2026-08-05.

## Important discoveries and decisions

- The execution checksum intentionally excludes capture time, so identical provider
  configuration has a stable checksum while each snapshot still records its timestamp.
- Existing rows migrate to `{}` in SQLite and normalize to a legacy-safe frontend
  identity; new acceptance decisions require exact run/pack identity equality.
- CLI contracts can be added safely before real providers are exposed; real auth,
  supported-version ranges, stream parsing, and read-only fixtures remain Phase 1.

## Unresolved risks

- Kimi/Qwen real processes are not enabled or validated against installed CLI versions.
- MCP tool access remains unavailable; Kimi must not receive tools before the DBC policy
  proxy exists.
- Direct APIs still require OS keychain secret references and normalized usage models.
- `App.tsx` remains large and should be decomposed before Connection Center expansion.

## Manual verification steps

1. Start a development build without feature flags and confirm Kimi/Qwen are hidden.
2. Start with one feature flag and confirm its provider appears disabled and in mock mode.
3. Complete a native safe HarnessRun, generate EvidencePack, and confirm the same config
   checksum is visible on Evidence and in both JSON manifests.
4. Confirm Accept stays disabled or fails when pack/run identities are made inconsistent
   in a test database.

## Recommended next action

Implement Phase 1 as a read-only slice: Kimi/Qwen discovery, supported-version fixtures,
auth/health states, stream-json parsers, exit/timeout mapping, fallback recording, and
native QA before either provider becomes visible by default.
