# Security Policy

DBC is a local-first desktop tool that can run configured CLI providers and local commands. Treat provider configuration, generated `.dbc` runtime data, logs, support bundles, and release artifacts as potentially sensitive.

## Reporting

Do not open a public issue with secrets, credentials, private logs, or provider output. Use GitHub private vulnerability reporting if it is enabled for the repository, or contact the maintainer privately before sharing sensitive details.

## Local Secrets

- Keep `.env`, API keys, tokens, provider credentials, and generated `.dbc` evidence out of git.
- Share sanitized support bundles only after reviewing their contents.
- Review provider command paths and arguments before switching from mock mode to real CLI execution.

## Maintainer Checklist

- Review `git status --ignored` before publishing.
- Run `pnpm build` and `cargo test --manifest-path src-tauri/Cargo.toml` before release tags.
- Enable branch protection and GitHub secret scanning for the public repository.
