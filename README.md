# Dildin Build Control

DBC is a local-first desktop control tower for AI-assisted software delivery. It turns agent work into an auditable production loop: TZ intake, task contract, bounded work slice, harness run, provider routing, preflight gates, build/test evidence, review, security checks, EvidencePack, final decision, and manual git handoff.

The project is built for operators who want the speed of CLI coding agents without losing control of scope, approvals, command policy, evidence, or rollback.

## Why DBC

- **Loop engineering over chat transcripts.** Every run has a state machine, task contract, artifacts, evidence, gates, and an acceptance decision.
- **Guided Run as the normal path.** Operators can move from pasted TZ to safe run, EvidencePack, and Accept/Rework/Reject without learning every internal console first.
- **Human approval stays explicit.** DBC does not branch, stage, commit, push, deploy, reset, or run destructive commands automatically.
- **Provider-agnostic local execution.** Mock, Codex CLI, Claude Code CLI, generic CLI, and local terminal runners can be routed by role.
- **Portable project memory.** `.dbc` contracts describe providers, command policy, tasks, memory, approvals, loop manifests, evidence, and reports.
- **Security by default.** Secret-like prompt content blocks real provider sends, output is redacted, and sensitive actions stay approval-gated.

## Demo

![Control Tower](docs/screenshots-guide/01-control-tower.png)

![Guided Run](docs/screenshots-guide/02-guided-run.png)

![Reports Checklist](docs/screenshots-guide/03-reports-checklist.png)

![Settings Quick Setup](docs/screenshots-guide/04-settings-quick-setup.png)

More demo shots are indexed in [docs/demo/README.md](docs/demo/README.md).

## Project Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Loop Engineering Manifesto](docs/LOOP_ENGINEERING_MANIFESTO.md)
- [Roadmap](docs/ROADMAP.md)
- [Good First Issues](docs/GOOD_FIRST_ISSUES.md)
- [Example .dbc Workspace](examples/dbc-workspace/.dbc/README.md)
- [Demo Project](examples/demo-project/README.md)
- [Launch Post Drafts](docs/LAUNCH_POSTS.md)
- [Design And Usability Audit](docs/design-audit/audit.md)

## Operator Guide

If you need the practical setup and usage flow in Russian, start here:

- [DBC User Guide RU](docs/DBC_USER_GUIDE_RU.md)
- [DBC Production User Guide RU](docs/DBC_Production_User_Guide_RU.docx)
- [DBC Testing And Methodology Guide RU](docs/DBC_Testing_And_Methodology_Guide_RU.docx)

## Current MVP

- Tauri project structure with React, TypeScript, Rust command contracts, and SQLite bootstrap.
- Control Tower, Projects, Workspace, Guided Run, Task Composer, AI Team, Loop Monitor, Approvals, Reports, and Settings screens.
- Guided Run is now the primary operator flow: paste TZ, create a task, freeze/approve a TaskContract, create a WorkSlice, start a safe HarnessRun, advance stages, generate EvidencePack, then Accept/Rework/Reject.
- Control Tower shows the current workflow next action, HarnessRun status, approval count, EvidencePack readiness, and the production loop step sequence.
- Reports include an Acceptance Decision panel, Acceptance Checklist, EvidencePack list, generated Markdown acceptance report, and final Harness decision actions.
- Settings include a Quick Setup panel for provider readiness, safe mock baseline, project setup save, and real-provider caution.
- Loop Preflight screen checks task/spec/runtime/provider/security/git/build gates before starting execution.
- Loop History can reopen previous runs from SQLite or recover snapshots from `.dbc/loops/<loop-id>.json`.
- Project recovery auto-loads `.dbc/providers.yaml`, `.dbc/policy.yaml`, `.dbc/tasks`, `.dbc/memory`, and `.dbc/loops` when an active project is opened.
- Local browser persistence for fast MVP iteration.
- Configurable provider loop: plan -> code -> build -> test -> review -> security -> acceptance.
- Provider Manager for Mock, Codex CLI, Claude Code CLI, Generic CLI, and Local Terminal profiles.
- Provider presets cover Codex+Claude, local-safe mock mode, and Codex-only mode, with role/capability diagnostics in Settings.
- Provider routing uses each agent's primary provider first, then configured fallbacks, and blocks real CLI loops when a selected real CLI is missing an exact executable path.
- Command policy diagnostics can classify a command as allow, approval, or deny before it is used in a loop.
- Settings can sync, reload, and validate provider exact paths plus command policy through `.dbc/providers.yaml` and `.dbc/policy.yaml`.
- AI Team role mapping with execution modes, local commands, and provider assignment.
- Tauri CLI health checks and structured CLI execution with command policy, timeout, output capture, and redaction.
- Backend-managed loop state machine persisted in SQLite with `loop_runs`, `loop_steps`, and `.dbc/artifacts/<loop-id>` step artifacts.
- Every backend loop writes a portable manifest to `.dbc/loops/<loop-id>.json` and refreshes it after advance, retry, resume, or approval decisions.
- Every backend loop also refreshes an acceptance package at `.dbc/reports/<loop-id>.json` and `.dbc/reports/<loop-id>.md`.
- Git safety captures an immutable baseline at `.dbc/git/<loop-id>/baseline.json`, a workspace report at `.dbc/git/<loop-id>/workspace.json`, diff artifacts, and a manual commit proposal at `.dbc/git/<loop-id>/commit-proposal.md`.
- Security hardening writes `.dbc/security/<loop-id>.json`, redacts secret-like output, and blocks real CLI prompts that contain secret-like values before they are sent.
- Task Composer now writes portable task contracts to `.dbc/tasks/<task-id>.json` with priority, loop profile, provider strategy, allowed/denied paths, stop conditions, risk, reviewers, and checksum-backed loop references.
- Scope enforcement compares task `allowedPaths` and `deniedPaths` against git changed files and records a `scopeGate` in step evidence and acceptance packages.
- Provider strategy gates warn or block when a task expects Codex+Claude, Codex-only, Claude-review-only, or mock-only routing but the configured loop routes differ.
- Project memory notes are persisted to `.dbc/memory/<note-id>.json` and injected into backend loop prompts as architecture, decision, business-rule, and risk context.
- Release package generation records `.app`, `.dmg`, binary paths, checksums, configured icons, and local release checklist to `.dbc/release/latest.json` and `.dbc/release/latest.md`.
- Backend loop prompts include task title, brief, acceptance criteria, and constraints so the planning step generates substantiated scope, risks, and stop conditions.
- Each executed step writes a machine-readable evidence snapshot to `.dbc/evidence/<loop-id>/<step>.json` with task spec, artifact path, output excerpt, and git status/diff summary.
- Provider step results now use a structured JSON report contract (`verdict`, `summary`, `actions`, `filesTouched`, `evidence`, `risks`, `nextAction`) with legacy `Verdict:` text as fallback.
- Loop execution now maps step status from real local commands or real CLI provider runs: `passed`, `failed`, `blocked`, or `approval_required`.
- Failed or approval-blocked backend loops track attempts, approval requirements, short failure reasons, and can retry the active step with a max-attempt guard.
- Approval decisions are now resolved through the backend loop state: approve restarts the active step, reject blocks it, and request changes fails it for rework.
- Approval ledger writes portable `.dbc/approvals/latest.json` and `.dbc/approvals/decisions/<id>.json` records for real-loop gates, provider switches, task starts, scope expansion, command templates, and git actions.
- Approval queue, audit trail, cost events, project memory, and evidence-backed report preview.
- Design audit evidence and updated screenshot guide live under `docs/design-audit/` and `docs/screenshots-guide/`.

## Run

```bash
pnpm install
pnpm dev
```

The verified web shell runs through Vite. Native Tauri builds require Rust/Cargo to be installed.

## Guided Run

Use `Guided Run` for the normal production path:

1. Paste the TZ/request and define acceptance criteria, allowed paths, and out-of-scope paths.
2. Click `Create and start safe run`.
3. DBC creates the task, freezes and approves the safe TaskContract path, creates a WorkSlice, and starts a HarnessRun in safe mode.
4. Advance the HarnessRun until it reaches evidence readiness.
5. Generate an EvidencePack.
6. Open Reports and decide `Accept`, `Request rework`, or `Reject` from evidence.

Expert screens remain available for diagnostics, but Guided Run is the intended operator entry point.

Guided Run smoke check:

```bash
pnpm guided-run-smoke
```

The check validates the Guided Run navigation, acceptance checklist, quick setup surface, production bundle strings, required screenshots, and production guide artifact.

## GitHub Publishing Notes

- Commit source, docs, lockfiles, Tauri icons, and example configs.
- Do not commit `.dbc/`, `node_modules/`, `dist/`, `src-tauri/target/`, `.env*`, local logs, release packages, or provider credentials.
- Use `docs/cli-profiles.example.yaml` as the portable provider configuration example.
- Run `pnpm build`, `pnpm guided-run-smoke`, and `cargo test --manifest-path src-tauri/Cargo.toml` before opening a release PR or tag.
- Licensed under Apache-2.0. See [LICENSE](LICENSE).

## Configure CLI Providers

Open `Settings`:

1. Keep `Codex CLI` assigned to `Team Lead`, `Developer`, and `Product Owner`.
2. Keep `Claude Code` assigned to `Architect`, `QA`, `Reviewer`, and `Security`.
3. Set each provider command to the installed CLI path if it is not on PATH, for example `/opt/homebrew/bin/codex` or `/opt/homebrew/bin/claude`.
4. Keep Codex args as `exec --skip-git-repo-check --sandbox workspace-write --cd "{{cwd}}"`; plain `codex` starts the interactive TUI and requires a terminal.
5. Keep Claude Code args as `-p`; this runs Claude in non-interactive print mode and reads the loop prompt through stdin.
6. Remove legacy Codex flags such as `--ask-for-approval`, `-a`, and trailing `-`; DBC normalizes them, but clean provider configs are easier to move between machines.
7. Click `Test CLI` to verify the executable and version command.
8. Click `Check contract` to verify the installed non-interactive CLI surface without sending a task to a model.
9. Leave `Run mode` as `mock` while configuring. Switch to `real` only when you want DBC to spawn the CLI.
10. Click `Sync .dbc config` to save the project contract files: `.dbc/providers.yaml` and `.dbc/policy.yaml`.
11. On another machine, click `Load .dbc config` to import the saved providers/policy and review diagnostics for missing exact CLI paths.
12. Check `Provider Routing`; errors there block real loop start, while warnings identify fallback/mock routes.

Terminal contract check:

```bash
pnpm provider-contracts
```

DBC writes `.dbc/provider-contracts/latest.json` and `.dbc/provider-contracts/latest.md`. This probes executable resolution, exact-path portability, normalized args, `codex exec --help`, `claude --help`, and version output without sending a task prompt to a model.

DBC uses official terminal CLI/API surfaces only. It does not automate ChatGPT or Claude web interfaces.

## Run a Real Smoke Loop

Use this before a large task:

1. Open `Settings`, load or sync `.dbc` config, and resolve any missing exact CLI path diagnostics.
2. Switch only the providers you want to exercise to `real`; keep the rest in `mock` until the smoke loop is green.
3. Open `Tasks`.
4. Check the `Smoke Loop` readiness list.
5. Click `Prepare smoke task` to create `SMOKE-LOOP-README`, or `Run smoke loop` to create it and open preflight.
6. The smoke task is intentionally small: README marker, `pnpm build`, `.dbc/loops/<loop-id>.json`, `.dbc/evidence/<loop-id>`, `.dbc/reports/<loop-id>.json`, `.dbc/reports/<loop-id>.md`, `.dbc/git/<loop-id>/baseline.json`, `.dbc/git/<loop-id>/commit-proposal.md`, `.dbc/security/<loop-id>.json`, and final review evidence.
7. If the loop blocks, inspect the active step output, fix provider/policy settings, and use `Retry`.

## Run a Controlled Smoke Loop

Use this before enabling real model providers:

- Open `Tasks`.
- Click `Controlled smoke`, or run `pnpm controlled-smoke` from the project root.
- DBC creates `SMOKE-LOOP-CONTROLLED`, runs deterministic mock steps, executes `pnpm build` through the local runner, and advances the backend loop to completion.
- The run writes `.dbc/tasks`, `.dbc/loops`, `.dbc/artifacts`, `.dbc/evidence`, `.dbc/reports`, `.dbc/git`, and `.dbc/security` evidence without calling Codex or Claude models.
- Use the generated report path in `Loops` to verify recovery, acceptance, security, git baseline, and build evidence before switching providers to `real`.

## Create a Task Contract

Use the `Tasks` screen for UI intake, or create the same portable contract from the terminal:

```bash
pnpm task-intake -- \
  --title "Small README polish" \
  --brief "Tighten the README wording and verify the app still builds." \
  --criteria "README.md changed only where requested" \
  --criteria "pnpm build passes" \
  --allowed "README.md" \
  --denied ".env" \
  --budget 1 \
  --profile mock
```

DBC writes `.dbc/tasks/<task-id>.json` and `.dbc/tasks/<task-id>.md`. Project recovery loads those records into the app, and backend prompts include the task scope before any provider step runs.

## Check Real Loop Readiness

Use this after a controlled smoke loop and before switching providers to `real`:

- Run `pnpm real-readiness`.
- DBC writes `.dbc/readiness/latest.json` and `.dbc/readiness/latest.md`.
- The report validates Codex/Claude exact paths, non-interactive CLI contracts, command policy, latest controlled smoke package, release package, and git workspace status.
- `ready_with_warnings` means no hard blocker was found, but a human should review warnings before starting a real provider loop.

## Prepare a Real Micro Loop

Use this to stage the first tiny real-provider run without starting model calls:

- Run `pnpm providers:profiles` to generate `.dbc/providers.mock.yaml` and `.dbc/providers.real-micro.yaml`.
- Run `pnpm real-micro-plan`.
- DBC writes `.dbc/tasks/REAL-MICRO-README.json`, `.dbc/real-loop/latest.json`, and `.dbc/real-loop/latest.md`.
- Review the provider switch plan, stop conditions, rollback notes, readiness report, and release checksum.
- Only after review and operator approval, open Settings and click `Apply real micro`, or run `pnpm providers:apply-real-micro` and then load `.dbc` config.
- `Apply real micro` and `pnpm providers:apply-real-micro` refuse to switch providers unless `.dbc/operator/latest.json` is approved by a matching `.dbc/operator/approval.json`.
- Operator approval also writes approval-ledger decisions for `REAL-MICRO-HUMAN-GATE`, `APPLY-REAL-MICRO-PROFILE`, and `RUN-REAL-MICRO-TASK`; backend gates require those decisions before switching providers or starting a real loop.
- Use Settings `Apply mock`, or `pnpm providers:apply-mock`, to revert providers to mock mode after the real micro loop.
- After the run, use `pnpm compare-real-micro` to compare real-loop evidence against the latest controlled smoke baseline.
- Run `pnpm revert-evidence` to prove CLI providers are back in mock mode after the real micro run.

## Operator Checklist

Use this as the final human gate before spending real provider tokens:

- Run `pnpm operator-checklist`.
- DBC writes `.dbc/operator/latest.json` and `.dbc/operator/latest.md`.
- Review human confirmations, stop conditions, rollback commands, release checksum, readiness warnings, and provider profile state.
- In the desktop app, click `Approve gate` after review; this writes `.dbc/operator/approval.json`.
- Terminal fallback: run `pnpm operator-approve -- --dry-run` to inspect the approval payload, then run `pnpm operator-approve -- --confirm "I APPROVE REAL MICRO LOOP"` only after human review.
- Continue only when approval status is `approved` and the checklist status is `ready_to_start_real_micro`.
- Apply real mode in Settings with `Apply real micro`, or run `pnpm providers:apply-real-micro` and then click `Load .dbc config`.
- Run only `REAL-MICRO-README` through Preflight.
- After the loop finishes or blocks, run `pnpm compare-real-micro`, then use Settings `Apply mock` or `pnpm providers:apply-mock`.
- Run `pnpm revert-evidence`; DBC writes `.dbc/revert/latest.json` and `.dbc/revert/latest.md`.

## Approval Ledger

Use this to audit concrete human decisions and command templates:

```bash
pnpm approval-ledger -- generate
pnpm approval-ledger -- decide --id REAL-MICRO-HUMAN-GATE --decision approved --note "Reviewed checklist"
```

- DBC writes `.dbc/approvals/latest.json` and `.dbc/approvals/latest.md`.
- Decisions are written to `.dbc/approvals/decisions/<approval-id>.json`.
- The operator approval flow writes the three real-micro decisions automatically after the human approves the checklist.
- Command templates are informational; approve only concrete command records after inspecting task, scope, and diff evidence.
- Git branch, stage, and commit records remain manual operator actions.

## Evidence Dashboard

Use this after any controlled smoke, mock, or real micro loop:

- Open `Loops` and select a saved loop from `Loop History`.
- The `Evidence Dashboard` loads the loop manifest, task contract, acceptance package, security report, git workspace, diff artifacts, approval ledger, and step evidence files.
- The dashboard shows verdict, scope status, missing artifacts, pending approvals, security findings, scope gate details, git branch state, and diagnostics in one place.
- Terminal fallback: run `pnpm evidence-summary -- --latest`, or `pnpm evidence-summary -- --loop <loop-id>`.
- DBC writes `.dbc/evidence-summary/latest.json` and `.dbc/evidence-summary/latest.md`.
- Treat `missingArtifacts > 0` as incomplete evidence, even if the visual loop monitor shows a completed state.

## Acceptance Decision

Use `Reports` after a HarnessRun has evidence:

- The Acceptance Checklist blocks acceptance until loop steps, artifacts, evidence files, structured review/security output, task spec, approval state, and EvidencePack are complete.
- `Accept` is enabled only when the result is evidence-complete and no approval is pending.
- `Request rework` and `Reject` remain available for incomplete or failed results.
- Final Harness decisions are written through the desktop runtime and shown in EvidencePack records.

## System Audit

Use this to summarize the whole launch state before approval:

- Run `pnpm launch-doctor` to execute the full local launch check chain: frontend build, Rust tests, provider contracts, readiness, real micro plan, comparison, operator checklist, evidence summary, approval ledger, revert evidence, support bundle, and system audit.
- DBC writes `.dbc/doctor/latest.json` and `.dbc/doctor/latest.md`.
- Run `pnpm support-bundle` to create a portable operator handoff package.
- DBC writes `.dbc/support/latest.json`, `.dbc/support/latest.md`, `.dbc/support/bundle-<timestamp>/`, and a `.tar.gz` archive when the local `tar` command is available.
- The support bundle includes diagnostic artifacts, provider/policy contracts, task specs, approval records, and latest loop evidence. It excludes `.env`, secret-like files, `node_modules`, `dist`, and build targets.
- Run `pnpm real-micro-preflight` to generate a dry-run real micro launch gate without spawning Codex, Claude, or local runner providers.
- DBC writes `.dbc/preflight/latest.json` and `.dbc/preflight/latest.md` with approval, provider profile, task, budget, and contract status.
- Run `pnpm real-micro-runbook` to generate the human operator runbook and allowed-surface policy.
- DBC writes `.dbc/runbook/latest.json`, `.dbc/runbook/latest.md`, and `.dbc/policy/surfaces.md`; the runbook records official CLI/local terminal/Tauri filesystem as allowed surfaces and consumer web automation as denied.
- Run `pnpm system-audit`.
- DBC writes `.dbc/audit/latest.json` and `.dbc/audit/latest.md`.
- `ready_for_human_approval` means release, readiness, controlled smoke, operator checklist, task, budget, and provider mock state are coherent, and the only intended blocker is human approval.
- `ready_to_apply_real_micro` means the approval artifact matches the current checklist.

## Provider Budget Guard

- Real CLI loops require a positive task `budgetLimit`.
- Each budget unit allows up to 4 real CLI provider calls; local runner build/test steps are not counted.
- `REAL-MICRO-README` uses `budgetLimit: 1`, which allows up to 4 real CLI calls.
- Backend launch also requires `.dbc/operator/latest.json` and `.dbc/operator/approval.json` with zero blockers, matching task id, matching checklist generation, and matching budget before any real CLI loop can start.
- Backend launch also requires `.dbc/preflight/latest.json` status `ready_to_run`; direct real CLI starts are blocked when the dry-run preflight is missing, stale by task, blocked, or still awaiting human approval.
- When the budget is exhausted, DBC blocks the active step before spawning the provider and records the blocked budget evidence in `.dbc/evidence` and the acceptance package.
- Increase a task budget only after reviewing the Operator Checklist and confirming token spend.

## Loop Preflight

- Preflight runs before every loop start.
- Error gates block execution; warnings are visible but do not block.
- Gates cover active project, task brief, acceptance criteria, persisted task spec, desktop runtime, operator checklist, provider budget, provider routing, local build/test commands, secret-like prompt content, and git/artifact output paths.
- Task provider strategy is checked against configured routes before launch.
- Acceptance packages include `scopeGate`; in git workspaces, changed files outside `allowedPaths` or inside `deniedPaths` prevent an accepted verdict.
- Git workspace packages include suggested task branch, dirty-tree state, changed files, scope gate, diff paths, and manual-only branch/stage/commit commands.
- `Run real loop` appears when at least one selected provider route uses real CLI execution.

## Loop Recovery

- Open `Loops` and use `Refresh` to list saved runs for the active project.
- Runs saved in the app database are marked `sqlite`; manifest-only recovery entries are marked `manifest`.
- Opening a recovered loop restores the monitor, reports, artifacts, evidence, security report, git baseline, and commit proposal paths.
- Recovered loops do not auto-continue; use Retry/approval actions deliberately.

## Project Recovery

- Opening or switching the active project triggers a one-time `.dbc` recovery pass for that project path.
- Recovered providers and command policy are applied when contract files exist.
- Recovered tasks and memory notes are merged by id, with `.dbc` records placed first.
- Workspace health shows recovery diagnostics for missing files, parse issues, and recovered counts.

## Release Package

- Run `pnpm tauri build` first.
- Run `pnpm release-package`, or open Control Tower and click `Generate package` in Release Gates.
- DBC writes `.dbc/release/latest.json` and `.dbc/release/latest.md`.
- The package records product, version, identifier, `.app`, `.dmg`, binary paths, FNV checksums, configured icons, and a local checklist.
- Signing, notarization, publishing, and update distribution stay manual approval-gated release steps.

## Git Safety

- DBC never creates branches, stages files, commits, pushes, resets, cleans, or checks out automatically.
- Every loop writes `.dbc/git/<loop-id>/workspace.json`, `.dbc/git/<loop-id>/diff.patch`, and `.dbc/git/<loop-id>/diff-stat.txt`.
- Commit proposals stage only task `allowedPaths`; they do not use broad `git add .` when the task has a path contract.
- `git switch -c`, `git add`, `git commit`, and `git push` remain manual operator actions.
- DBC records git branch, short HEAD, status, diff stat, and changed files as evidence.
- Baseline capture is write-once per loop; later retries do not overwrite the starting git snapshot.
- Commit proposals are Markdown instructions only. DBC does not run `git commit`, `git push`, `git reset`, `git clean`, destructive checkout, or branch deletion automatically.
- Push/deploy/reset/clean remain command-policy gated and require explicit human action.

## Security Gates

- Real CLI prompts are scanned before they are sent to a provider. Secret-like content blocks the step and records only finding type/line metadata.
- CLI output and git evidence are redacted before being persisted.
- Security reports never store secret values; they store source, line, finding kind, severity, and gate status.
- A completed loop is not accepted while security findings are present.

## Native Commands

- `environment_check`
- `classify_command`
- `test_cli_provider`
- `run_cli_provider`
- `check_cli_contract`
- `run_controlled_smoke_loop`
- `save_task_spec`
- `list_task_specs`
- `save_memory_note`
- `list_memory_notes`
- `save_project_config`
- `load_project_config`
- `generate_release_package`
- `start_loop_run`
- `advance_loop_run`
- `resume_loop_run`
- `retry_loop_step`
- `resolve_loop_approval`
- `get_loop_run`
- `create_task_contract`
- `freeze_task_contract`
- `approve_task_contract`
- `reject_task_contract`
- `create_work_slice`
- `approve_work_slice`
- `start_harness_run`
- `advance_harness_run`
- `generate_evidence_pack`
- `accept_or_rework_harness_result`
- `load_harness_overview`
- `create_workspace`
- `list_workspaces`

These commands connect the React shell to the local-first Tauri runtime.
