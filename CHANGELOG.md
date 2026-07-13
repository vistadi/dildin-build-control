# Changelog

All notable changes to Dildin Build Control are documented here.

The project follows [Semantic Versioning](https://semver.org/) while release stability is communicated through pre-release tags.

## [Unreleased]

### Planned

- Signed and notarized macOS distribution.
- Focused regression tests for scope, provider, and acceptance gates.
- Import and export validation for portable `.dbc` workspaces.

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

[Unreleased]: https://github.com/vistadi/dildin-build-control/compare/v0.1.0-alpha.1...HEAD
[0.1.0-alpha.1]: https://github.com/vistadi/dildin-build-control/releases/tag/v0.1.0-alpha.1
