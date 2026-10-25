# DBC Open Questions

## Active

### 2026-07-28 — Who owns Apple release credentials?

- Why it matters: signed and notarized binaries are the largest distribution trust gap.
- Affected modules: GitHub release workflow, macOS release operations, Homebrew tap.
- Current assumption: credentials will be stored only as GitHub Actions secrets.
- Owner: project maintainer.
- Status: open.

### 2026-08-12 — Which MCP connections form the supported starter set?

- Why it matters: a curated starter set makes onboarding testable, while an unrestricted
  marketplace increases schema, authentication, privacy, and support risk.
- Affected modules: Connection Center, docs, fixtures, security policy, support.
- Current assumption: support manual/imported stdio and Streamable HTTP first, validate
  with filesystem read-only plus one remote OAuth server, and label SSE as legacy.
- Owner: product owner and security owner.
- Status: open.

### 2026-08-12 — What is the supported Qwen Code version baseline?

- Why it matters: an explicit range improves supportability and reproducible native
  fixtures, but current official headless documentation is capability-oriented.
- Affected modules: provider health, adapter metadata, release notes, fixtures, support.
- Current assumption: require the documented prompt, stream-json, approval, safe-mode,
  and tool-budget flags through a capability probe; do not claim a hard minimum yet.
- Owner: provider integration maintainer.
- Status: open.
- Research update (2026-10-11): the official 2026-09-10 Qwen update describes Plan
  as separate from permission mode, while the current approval/headless references
  still document `--approval-mode plan`. DBC's template, argument normalizer, and
  backend gate require that value. Resolve the discrepancy with a pinned installed
  CLI fixture; neither a confirmed incompatibility nor a safe replacement is proven.
  See `worklog/2026-10-11-current-ecosystem-improvements.md` for sources and acceptance
  criteria. Kimi/Qwen were not found on this session's PATH; no model call was made.
- Implementation update (2026-10-24): bounded help/version probes now require the
  turn/time/tool limits and declared plan/stream-json option values. Official October
  references still document plan. Synthetic fixtures pass, but a pinned installed-CLI
  fixture is still required; this question remains open.

## Resolved

### 2026-10-25 — What evidence must a real review prove before acceptance?

- Opened/resolved: 2026-10-25; owner: product maintainer.
- Why it matters: the live test rejected unsubstantiated review; broad redaction
  markers and missing non-Git scope evidence prevented honest acceptance.
- Result: explicit current-run references, identity/attempt/hash validation and
  SQLite pins; informational masking separated from concrete credential indicators;
  pre-execution bounded filesystem comparison for new non-Git runs. Maintainer
  requested implementation and local tests only. All are implemented locally and
  verified by deterministic tests, not released or live-retested.
- Affected modules: native prompts, step evidence, report normalization, scanner,
  scope and acceptance; documented in the new accepted DECISIONS entry.
- Status: local contract resolved. Citations do not establish actual tool reads;
  generic text streams remain limited. No new AI invocation is authorized. The
  historical failed test and seven-of-eight accounting remain unchanged.
- Evidence: `worklog/2026-10-25-evidence-integrity-and-non-git-scope.md`.

### 2026-10-25 — What readiness contract should ordinary projects use?

- Opened/resolved: 2026-10-25; owner: product maintainer.
- Why it matters: installed alpha.4 required local DBC/Tauri packaging even for
  a README task, and its Node helpers could not read native provider YAML.
- Result: maintainer approved separating informational distribution evidence from
  task readiness, preserving task/budget/operator/preflight safeguards, and adding
  the shared standard YAML parser in DBC. Local tests and actual native Sync config
  plus ready-to-run in an ordinary project passed. Source is committed on the
  feature branch, not merged/released; see the publication worklog.
- Affected modules: native checklist, Node readiness/plan/profile/report helpers.
- Status: contract resolved by the accepted decision in DECISIONS.md. Subsequent
  login and native Retry passed QA/review/security; final acceptance identified
  separate evidence/finding reliability issues, resolved locally in the entry above.
- Evidence: `worklog/2026-10-25-generic-project-readiness-fix.md`.

### 2026-10-24 — How should PR #16 CodeQL alert #6 be resolved?

- Resolution date: 2026-10-24.
- Result: maintainer approved removing raw stderr from the test assertion, commits
  and push, then merge only after green CI/CodeQL. Keep all behavior assertions and
  CodeQL coverage; no alert dismissal or bypass. The edit and local formatting/51
  Rust tests passed. Subsequently `8358e63` and `ea402f1` were pushed, all five
  exact-head checks passed, and PR #16 merged into main as `3b21f74`. No dismissal.
- Affected modules: `src-tauri/src/main.rs` test diagnostic and PR #16.
- Owner: project maintainer.
- Status: resolved and merged; execution evidence is recorded in the worklog.
- Evidence: `worklog/2026-10-24-pr-16-review-and-ci.md`.

### 2026-07-28 — Which design partners represent the first target segment?

- Resolution date: 2026-08-31.
- Result: the first public adoption wedge is solo AI developers using coding agents on
  local workspaces and needing bounded scope, approvals, checks, and evidence before
  merge. Team governance remains a later expansion rather than the first-run message.
- Affected modules: positioning, onboarding, roadmap, launch content, and design-partner
  recruitment.
- Status: resolved by the product-owner segment decision.

### 2026-08-12 — Should DBC add opt-in activation telemetry?

- Resolution date: 2026-08-12.
- Result: telemetry remains off by default and no exporter exists. The opt-in setting
  stores anonymous diagnostics locally only; external transmission requires a new
  approved privacy/security decision.
- Affected modules: onboarding, Settings, state migration, privacy documentation.
- Status: resolved by the local-only diagnostics decision.

### 2026-08-12 — Which Kimi and Qwen connection modes ship first?

- Resolution date: 2026-08-12.
- Result: CLI contracts ship first behind feature flags. Direct APIs wait for OS keychain
  secret references, model/usage normalization, and the MCP policy layer.
- Affected modules: provider registry, Settings, routing, EvidencePack, release scope.
- Status: resolved by the accepted provider adapter architecture and Phase 0 foundation.
