# Good First Issues

These tasks are designed for contributors who want to help without needing to understand the whole DBC runtime.

When opening the issues on GitHub, use the `good first issue` label and link back to this file.

## Documentation

### Add a one-minute demo GIF

Record a short flow using the existing demo project:

- open the demo workspace
- load `.dbc` config
- inspect preflight gates
- open the evidence report

Keep the GIF short and avoid showing real provider credentials or local private paths.

### Improve provider setup docs for one platform

Add platform-specific notes for macOS, Linux, or Windows covering:

- Node/pnpm prerequisites
- Rust/Tauri prerequisites
- Codex CLI path configuration
- Claude Code CLI path configuration
- mock mode before real provider mode

### Add a glossary

Create `docs/GLOSSARY.md` for terms such as task contract, loop, provider, role mapping, preflight, evidence, acceptance package, scope gate, support bundle, and manual git handoff.

## Examples

### Add another safe task contract

Add a second example task under `examples/dbc-workspace/.dbc/tasks/` that touches only demo files and uses mock mode.

Acceptance:

- no secrets or local absolute paths
- allowed paths are narrow
- denied paths include `.env`
- README explains how to use the task

### Expand the demo project build

Make `examples/demo-project` produce a tiny build artifact under its own ignored output folder and document how DBC captures the build evidence.

## Tests

### Add a command policy fixture test

Add backend test coverage for one command policy edge case:

- allowed command with extra whitespace
- denied command substring
- approval-required deploy command
- secret edit command

### Add provider contract normalization fixtures

Add fixtures for CLI argument normalization so legacy Codex flags and stdin prompt mode behavior stay stable.

## UI Polish

### Add empty states for one dashboard section

Pick one screen and improve its empty state with concise operator-facing copy. Avoid marketing copy and keep the action obvious.

### Improve screenshot guide

Update `docs/demo/README.md` with exact viewport size, route, and data state for each screenshot.

## Safety

### Add a redaction test fixture

Create a fixture that proves secret-like output is redacted in generated evidence without storing the raw value.

Do not commit real credentials or examples that look like live keys.
