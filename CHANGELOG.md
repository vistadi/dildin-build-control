# Changelog

All notable changes to Dildin Build Control are documented here.

The project follows [Semantic Versioning](https://semver.org/) while release stability is communicated through pre-release tags.

## [Unreleased]

### Planned

- Signed and notarized macOS distribution.
- Focused regression tests for scope, provider, and acceptance gates.
- A compact Guided Run demo video or GIF.

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

[Unreleased]: https://github.com/vistadi/dildin-build-control/compare/v0.1.1-alpha.3...HEAD
[0.1.1-alpha.3]: https://github.com/vistadi/dildin-build-control/releases/tag/v0.1.1-alpha.3
[0.1.1-alpha.2]: https://github.com/vistadi/dildin-build-control/releases/tag/v0.1.1-alpha.2
[0.1.1-alpha.1]: https://github.com/vistadi/dildin-build-control/releases/tag/v0.1.1-alpha.1
[0.1.0-alpha.1]: https://github.com/vistadi/dildin-build-control/releases/tag/v0.1.0-alpha.1
