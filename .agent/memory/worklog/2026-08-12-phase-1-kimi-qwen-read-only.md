# Phase 1 Kimi/Qwen read-only adapters — 2026-08-12

## Task objective

Continue the approved roadmap by implementing the safest useful Kimi Code and Qwen Code
CLI slice: discovery/readiness, normalized headless output, runtime safety, Settings UX,
and deterministic evidence fixtures.

## Approved scope

- Implement current official Kimi/Qwen headless CLI contracts.
- Add version, compatibility, auth-presence, read-only readiness, and recovery states.
- Normalize stream-json output in frontend and Rust and feed it into step evidence.
- Add official Add Provider templates and responsive Settings readiness UI.
- Keep credentials unread, Kimi real execution blocked, Qwen zero-tool, and all new
  providers disabled/mock until verified.
- Do not install system CLIs, enable controlled write, implement MCP, commit, push, or
  deploy.

## Initial repository state

- Branch `main`, tracking `origin/main`, HEAD `546ede4`.
- The working tree was already dirty with the uncommitted Phase 0 implementation and
  master-plan/memory changes created in the same ongoing task.
- Kimi/Qwen had versioned hidden templates and basic yolo normalization, but no auth or
  compatibility state, JSONL parser, runtime read-only enforcement, or visible setup UX.
- Neither `kimi` nor `qwen` is installed on the current Mac; native model calls were not
  available for safe validation.

## Plan

1. Verify current official CLI contracts and security semantics.
2. Extend adapter metadata and health/auth/capability probes.
3. Implement shared stream-json fixtures and frontend/Rust normalizers.
4. Enforce read-only execution in the backend.
5. Add Settings templates, readiness, and recovery UX.
6. Run code, contract, responsive, and browser-console validation.
7. Update durable project memory and prepare a Git handoff.

## Work completed

- Updated Kimi to `-p {{prompt}} --output-format stream-json --plan`, with minimum
  stream-json baseline 0.21.0 and required help-flag capability checks.
- Updated Qwen to prompt + stream-json + plan + safe-mode + zero tool calls + bounded
  session turns/wall time. Yolo, arbitrary approval modes, and non-zero tool budgets are
  normalized away in TypeScript and Rust.
- Extended desktop health with resolved command, detected version, compatibility, auth
  presence, auth detail, read-only readiness, and actionable recovery guidance.
- Added privacy-safe auth presence probes for official local Kimi/Qwen config and
  supported Qwen API-key environment names; secret contents are never read or emitted.
- Added frontend and Rust JSONL normalizers for Kimi assistant/tool events and Qwen
  system/assistant/user/result events, including model/session, final text, tool status,
  usage, errors, malformed lines, and outcome.
- Added shared Kimi/Qwen JSONL fixtures and tested them in Node and Rust.
- Fed normalized provider final text and tool-call counts into structured loop evidence.
- Added a backend hard block for all Kimi real execution until the MCP/tool policy proxy
  exists. Added a backend Qwen guard requiring plan, safe mode, zero tool calls, and no
  yolo even if UI configuration is bypassed.
- Added official Kimi/Qwen templates to Add CLI Provider. New provider records include
  vendor/adapter/profile identity, start disabled/mock, and have read-only capabilities.
- Added Settings readiness cards and next-action guidance plus Quick Setup Kimi/Qwen
  status.
- Updated provider-session diagnostics for Kimi/Qwen version/auth/read-only blockers.
- Fixed a responsive QA finding by changing readiness metadata from four narrow columns
  to two readable columns.

## Files created and modified

- Source: `src/types.ts`, `src/providerAdapters.ts`, `src/providerStreams.ts`,
  `src/cliContracts.ts`, `src/tauriBridge.ts`, `src/App.tsx`, `src/styles.css`,
  `src-tauri/src/main.rs`.
- Tests/scripts: `tests/fixtures/provider-adapters.v1.json`,
  `tests/fixtures/kimi-stream.v1.jsonl`, `tests/fixtures/qwen-stream.v1.jsonl`,
  `scripts/provider-adapter-contract-smoke.mjs`, `scripts/provider-sessions.mjs`.
- Docs/memory: `.agent/PLANS.md`, `.agent/memory/PROJECT_STATE.md`,
  `.agent/memory/DECISIONS.md`, `.agent/memory/OPEN_QUESTIONS.md`,
  `docs/UI_UX_MCP_KIMI_QWEN_MASTER_PLAN_RU.md`, and this worklog.

## Commands and checks executed

- Bundled Node: TypeScript no-emit check, adapter/stream smoke, Vite production build.
- Rust: `cargo fmt`, `cargo fmt --check`, and `cargo test` through the local rustup toolchain.
- Local preview: Vite preview on `127.0.0.1:4173` for responsive browser QA.
- Browser QA: Settings with Kimi/Qwen records at 375, 768, 1280, and 1440 px.

## Validation results

- TypeScript passed.
- Vite production build passed (1,590 modules transformed).
- Provider adapter/stream smoke passed: 2 adapters, 4 legacy routes, 2 stream fixtures.
- Rust tests passed: 34 passed, 0 failed.
- Browser QA found no page-level horizontal overflow at any checked breakpoint and no
  browser console warnings/errors.
- Kimi/Qwen native version/auth/model execution was not run because the CLIs are absent.

## Important discoveries and decisions

- Kimi headless mode is not safely read-only merely because `--plan` is set; print mode
  auto-approves internal tools. DBC therefore blocks the process before spawn.
- Qwen exposes sufficient CLI controls for a zero-tool planning/review profile, but the
  backend must verify the effective args rather than trusting UI health state.
- Qwen uses capability probing instead of a claimed minimum version until an official
  reproducible baseline is accepted.

## Unresolved risks

- Native compatibility and auth recovery remain fixture-only until supported CLIs are
  installed deliberately and tested without transmitting project secrets.
- Actual fallback attempt/outcome journaling is not implemented; execution identity
  records configured fallback ids only.
- Kimi and Qwen controlled write depends on the future MCP/tool policy proxy.
- `App.tsx` remains too large for safe Connection Center expansion.

## Manual verification steps

1. Install supported CLIs outside this task only after explicit operator approval.
2. Add each official template in Settings, run Auto-detect, Test CLI, and Check contract.
3. Confirm Kimi reports the policy-proxy blocker even when installed/authenticated.
4. Confirm Qwen becomes read-only ready only with supported capabilities and auth.
5. Run a harmless approved Qwen review fixture and compare the emitted normalized stream
   with `tests/fixtures/qwen-stream.v1.jsonl`.

## Recommended next action

Add native installed-version fixtures and run-scoped fallback attempt evidence, then
decompose Settings/provider code before implementing MCP Connection Center storage.
