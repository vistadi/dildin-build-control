# Contributing

Thanks for helping improve Dildin Build Control.

## Setup

```bash
pnpm install
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
```

Native Tauri builds require Rust/Cargo and the platform-specific Tauri prerequisites.

## Pull Requests

- Keep changes scoped and describe the operator-facing behavior that changed.
- Do not commit `.dbc/`, `dist/`, `node_modules/`, `src-tauri/target/`, logs, credentials, or local provider paths.
- Update README or docs when command flows, provider contracts, or release steps change.
- Include build/test evidence in the PR description.

## Safety Rules

DBC intentionally keeps git branch, stage, commit, push, deploy, and destructive commands manual. Preserve that behavior unless a maintainer explicitly approves a design change.
