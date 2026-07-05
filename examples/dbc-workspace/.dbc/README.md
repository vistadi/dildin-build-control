# Example .dbc Workspace

This is a safe, commit-friendly example of a DBC workspace contract. It uses mock providers and local allow-listed commands only.

Copy these files into a project-level `.dbc/` directory when you want to experiment with recovery and provider/profile loading:

```bash
mkdir -p .dbc
cp -R examples/dbc-workspace/.dbc/* .dbc/
```

Do not commit real project `.dbc/` runtime output. Generated evidence, provider sessions, local paths, reports, and support bundles may contain private information.

## Files

- `providers.yaml` - mock/local provider routing for a safe dry run.
- `policy.yaml` - command allow/approval/deny policy and redaction rules.
- `tasks/README-SMOKE.json` - a tiny task contract for README-only changes.
- `memory/project-principles.json` - example project memory injected into prompts.
