# DBC Project State

Last verified: 2026-08-05

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
- The primary operator journey is three stages: Describe, Run checks, and Decide.
  Acceptance and path details remain available as optional advanced input.
- Run, Approvals, and Evidence resolve their primary state from one current HarnessRun;
  stale controlled-smoke approvals, costs, steps, and reports are excluded.
- Evidence has an explicit no-run empty state, a current-run acceptance checklist, and
  a read-only raw report disclosure.
- Approvals presents only current-run decisions and one next action; technical provider
  gates remain available in a disclosure.
- Settings reports safe-mock readiness separately from CLI detection and keeps provider
  routing, sessions, and command policy under an advanced disclosure.
- `guided-run-smoke` validates 28 lifecycle, isolation, disclosure, and copy assertions.
- `controlled-smoke` produces local loop, artifact, review, security, Git, and
  acceptance evidence without external model calls.
- `dbc:verify` rejects incomplete evidence, relevant pending approvals, failed scope,
  missing acceptance, or absent step evidence. CI and release workflows run it.
- Release automation accepts the Apple signing and notarization secret names expected
  by Tauri. Homebrew Cask output requires real 64-character SHA-256 values.
- Frontend build, all 24 Rust tests, the 28-check Guided Run smoke, a controlled smoke,
  and explicit-loop evidence verification passed on 2026-08-05.
- Browser QA completed the safe preview lifecycle through an accepted EvidencePack,
  checked Run, Evidence, Approvals, and Settings, verified a 760 px layout, and found
  no browser console warnings or errors.

## Distribution state

- The repository is ready to consume Apple signing/notarization credentials.
- A fresh local `0.1.1` arm64 application and DMG were built from the current uncommitted
  verified source on 2026-08-05.
- The application was replaced at `/Applications/Dildin Build Control.app`, its contents
  match the generated bundle, and the installed binary launched successfully.
- The DMG passed `hdiutil verify` and has SHA-256
  `bc163d9746f0f5f1190dba1a96b9e49f1b273832161f2511b5b52f31a7379c75`.
- The previous installed bundle is recoverable from
  `/private/tmp/dbc-desktop-backup-20260805-1238/Dildin Build Control.app` until temporary
  storage is cleaned.
- The local bundle has only an ad-hoc signature. It is not Developer ID signed or
  notarized and does not pass strict Apple signature/Gatekeeper verification.
- Homebrew output is a generator only; publishing requires checksums from verified
  release assets.

## Known limitations

- The product remains an early alpha.
- Browser preview evidence is representative and explicitly labelled; only the Tauri
  runtime creates native project artifacts.
- Opt-in activation telemetry is not implemented.
- Apple credential ownership and release verification remain operational blockers.
- Provider-adapter and scope/acceptance edge-case regression fixtures remain incomplete.

## Immediate priorities

1. Review and commit the priority product improvements.
2. Complete hands-on native workflow QA in the launched application.
3. Produce and manually verify a signed/notarized release candidate.
4. Add regression fixtures for provider adapters and scope/acceptance edge cases.
5. Decide whether privacy-safe activation telemetry belongs in the product.
