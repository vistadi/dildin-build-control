# DBC Project State

Last verified: 2026-07-28

## Architecture

- Tauri 2 desktop application with a React 18 and TypeScript frontend.
- Rust backend persists local SQLite state and portable `.dbc` artifacts.
- Provider adapters support mock, local terminal, Codex CLI, Claude Code CLI, and
  generic CLI execution behind policy, budget, scope, approval, and acceptance gates.
- Harness objects are TaskContract, WorkSlice, HarnessRun, and EvidencePack.

## Verified functionality

- The default UI opens on Run. Approvals, Evidence, and Settings are primary
  destinations; specialist screens are grouped under Advanced.
- Guided Run supports task intake, bounded scope, deterministic checks, EvidencePack
  generation, and a one-time human accept/rework/reject decision.
- The browser build provides a deterministic, side-effect-free preview. It does not
  touch project files, invoke providers, or use credentials.
- `guided-run-smoke` validates 22 lifecycle and copy assertions.
- `controlled-smoke` produces local loop, artifact, review, security, Git, and
  acceptance evidence without external model calls.
- `dbc:verify` rejects incomplete evidence, relevant pending approvals, failed scope,
  missing acceptance, or absent step evidence. CI and release workflows run it.
- Release automation accepts the Apple signing and notarization secret names expected
  by Tauri. Homebrew Cask output requires real 64-character SHA-256 values.
- Frontend build and all 24 Rust tests passed on 2026-07-28.

## Distribution state

- The repository is ready to consume Apple signing/notarization credentials.
- No signed or notarized artifact was produced or verified in this task.
- Homebrew output is a generator only; publishing requires checksums from verified
  release assets.

## Known limitations

- The product remains an early alpha.
- Browser preview evidence is representative and explicitly labelled; only the Tauri
  runtime creates native project artifacts.
- Opt-in activation telemetry is not implemented.
- Apple credential ownership and release verification remain operational blockers.

## Immediate priorities

1. Produce and manually verify a signed/notarized release candidate.
2. Recruit 5-10 design partners and run the prepared demo.
3. Publish proof stories based on real EvidencePacks.
4. Add regression fixtures for provider adapters and scope/acceptance edge cases.
