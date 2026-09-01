# Changelog

All notable changes to Dildin Build Control are documented here.

The project follows [Semantic Versioning](https://semver.org/) while release stability is communicated through pre-release tags.

## [Unreleased]

### Planned

- Signed and notarized macOS distribution.
- Installed-version Kimi/Qwen fixtures and approved remote OAuth MCP conformance.
- A compact Guided Run demo video or GIF.

## [0.2.0-alpha.2] - 2026-09-01

### Added

- A deterministic, side-effect-free browser preview of the full Guided Run lifecycle.
- EvidencePack verification via `dbc:verify`, enforced in CI and release checks.
- A Homebrew Cask generator that requires real release checksums.
- Positioning, demo, signing, and 30-day go-to-market playbooks.
- Versioned Kimi/Qwen CLI contracts, stream normalization, runtime safety gates, and a
  balanced capability-aware routing preset.
- MCP Connection Center, portable ToolPolicy contracts, run-scoped approval proxy,
  redacted tool-call evidence, and malicious/integration fixtures.
- Disabled keychain-only Kimi/Qwen API profiles, source-backed model catalog, and
  normalized reports/usage.
- EvidencePack v2 artifact verification, routing/MCP summaries, and unknown-safe usage.
- Dibi, a border-collie product mascot, a complete Dibi Workshop visual system, and a
  regenerated desktop icon family.
- English-only navigation, accessibility/CSP hardening, UI/native quality smokes, and
  production asset performance budgets.

### Changed

- The default experience now starts in a simplified Run flow with expert tools grouped under Advanced.
- Evidence and final acceptance are presented as the primary product outcome.
- Release automation is ready to consume Apple signing and notarization secrets without claiming unsigned artifacts are signed.
- Primary routes now carry immutable provider/model/adapter/fallback/MCP execution
  identity and acceptance fails closed on identity or EvidencePack v2 verification drift.

### Fixed

- Controlled-smoke scope evidence now preserves complete Git status paths.
- Evidence summaries ignore unrelated pending approvals from other tasks and loops.
- Final Guided Run decisions can no longer be accepted repeatedly.
- Controlled smoke supports an explicit local-only waiver for pre-existing outside-scope
  worktree changes while denied paths still fail.
- Unsigned GitHub packaging no longer passes empty Apple signing and notarization
  variables to the Tauri bundler.

## [0.2.0-alpha.1] - 2026-09-01

### Release status

- The release quality gate passed, but both macOS packaging jobs failed before a
  GitHub Release was created. The immutable follow-up is `v0.2.0-alpha.2`.

## [0.1.1-alpha.3] - 2026-07-20

### Added

- Regression coverage for portable `.dbc` configuration round trips, missing workspace defaults, and malformed YAML diagnostics.

### Changed

- Dependabot now groups only minor and patch updates; breaking major updates remain isolated for focused migration and CI review.
- CI and release quality gates now enforce Rust formatting before tests and packaging.

## [0.1.1-alpha.2] - 2026-07-17

### Fixed

- SHA-256 manifests now reference the filenames published by GitHub Releases, so `shasum -c` verifies downloaded DMG assets directly.

## [0.1.1-alpha.1] - 2026-07-17

### Added

- A release metadata check that keeps package, Tauri, Cargo, tag, and changelog versions aligned.
- A macOS installation guide with architecture selection and SHA-256 verification.
- A release quality gate that runs the frontend build, Guided Run smoke check, and Rust tests before packaging.

### Changed

- Updated GitHub Actions runners to their current tested major versions.
- Updated `rusqlite` and compatible Rust dependencies after successful CI verification.
- Release notes now describe every alpha generically instead of claiming each release is the first alpha.
- Checksum filenames now derive their version from project metadata instead of a hard-coded value.

### Deferred

- The React 19, Vite 8, and TypeScript 7 dependency group remains deferred because its Dependabot branch does not pass the frontend build.

## [0.1.0-alpha.1] - 2026-07-13

### Added

- Guided Run from request intake through TaskContract, WorkSlice, HarnessRun, EvidencePack, and final decision.
- Local-first Tauri desktop shell with React, TypeScript, Rust, and SQLite.
- Provider routing for Mock, Codex CLI, Claude Code CLI, Generic CLI, and local terminal runners.
- Preflight, scope, budget, command-policy, security, approval, and acceptance gates.
- Portable `.dbc` task, memory, loop, evidence, approval, report, git, and release artifacts.
- Controlled smoke, readiness, support bundle, release package, and system audit tooling.
- CI checks for frontend build, Guided Run smoke coverage, and Rust tests.

### Safety

- Git branch, stage, commit, push, deploy, reset, clean, and destructive checkout remain manual.
- Secret-like real-provider prompts are blocked and persisted output is redacted.

[Unreleased]: https://github.com/vistadi/dildin-build-control/compare/v0.2.0-alpha.2...HEAD
[0.2.0-alpha.2]: https://github.com/vistadi/dildin-build-control/releases/tag/v0.2.0-alpha.2
[0.2.0-alpha.1]: https://github.com/vistadi/dildin-build-control/tree/v0.2.0-alpha.1
[0.1.1-alpha.3]: https://github.com/vistadi/dildin-build-control/releases/tag/v0.1.1-alpha.3
[0.1.1-alpha.2]: https://github.com/vistadi/dildin-build-control/releases/tag/v0.1.1-alpha.2
[0.1.1-alpha.1]: https://github.com/vistadi/dildin-build-control/releases/tag/v0.1.1-alpha.1
[0.1.0-alpha.1]: https://github.com/vistadi/dildin-build-control/releases/tag/v0.1.0-alpha.1
