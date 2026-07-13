## Summary

Describe the operator-facing change and why it is needed.

## Scope

- Files or components changed:
- Intentionally out of scope:

## Evidence

- [ ] `pnpm build`
- [ ] `pnpm guided-run-smoke`
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` (when Rust or native behavior changed)
- [ ] Screenshots or report artifacts attached for UI/workflow changes

## Safety

- [ ] No credentials, `.env` files, local provider paths, or generated `.dbc` runtime output are committed.
- [ ] Manual approval and git boundaries remain intact.
- [ ] Documentation is updated when behavior or contracts changed.
