# Roadmap

This roadmap is intentionally operator-centered. DBC should become more capable without weakening the manual approval boundaries that make it safe to use.

## Now

- Keep the Guided Run production path stable: TZ intake, TaskContract, WorkSlice, HarnessRun, EvidencePack, and final decision.
- Keep CI green for frontend build and Rust tests.
- Keep screenshot-guide, production guide, testing guide, and design audit evidence current.
- Improve onboarding around Quick Setup, provider profiles, mock loops, and `.dbc` recovery.
- Keep portable `.dbc` save/load behavior covered by round-trip and damaged-input regression tests.

## Next

- Add smaller focused tests around command policy, scope gates, provider routing, and acceptance packages.
- Add a compact demo video or GIF flow: Guided Run -> HarnessRun advance -> EvidencePack -> Acceptance Checklist.
- Improve release packaging docs for macOS signing/notarization.
- Add a provider adapter test harness with fixture prompts and expected structured reports.
- Add regression checks for Guided Run empty states, final decision states, and Quick Setup provider readiness.

## Later

- Support richer multi-project dashboards.
- Add optional encrypted secret reference integration while keeping raw secrets out of project files.
- Add plugin-style provider adapters.
- Add signed support bundles for operator handoff.
- Add richer report rendering for acceptance packages and audit trails.
- Explore multi-run comparisons and regression detection across loop history.

## Non-Goals

- Automatic git push, deploy, destructive checkout, reset, or clean.
- Consumer web UI automation for provider access.
- Storing provider API keys or local credentials in `.dbc`.
- Replacing code review, release approval, or production deployment process.

## Release Readiness Checklist

- `pnpm build` passes.
- `pnpm guided-run-smoke` passes.
- `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- No `.dbc`, `.env`, `dist`, `node_modules`, or build target files are staged.
- README screenshots and `docs/screenshots-guide/` render on GitHub.
- Apache-2.0 license is detected.
- Example `.dbc` workspace contains only safe mock/local configuration.
