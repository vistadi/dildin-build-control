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

### 2026-10-24 — How should PR #16 CodeQL alert #6 be resolved?

- Resolution date: 2026-10-24.
- Result: maintainer approved removing raw stderr from the test assertion, commits
  and push, then merge only after green CI/CodeQL. Keep all behavior assertions and
  CodeQL coverage; no alert dismissal or bypass. The edit and local formatting/51
  Rust tests passed; remote verification and merge remain pending at this checkpoint.
- Affected modules: `src-tauri/src/main.rs` test diagnostic and PR #16.
- Owner: project maintainer.
- Status: resolution approach approved; execution tracked in the worklog.
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
