# 2026-10-11 — Current ecosystem improvements for DBC

## Objective and approved scope

Find improvements using current ecosystem information and actual DBC source, tailored
to the owner's goal of using the product daily. This is research and repository-memory
maintenance, not authorization to implement features, install CLIs, spend API credits,
change provider permissions, publish a release, commit, or push.

## Initial repository state

- Branch: `main`; HEAD `d688407` (`docs(memory): record v0.2.0-alpha.2 release`).
- Working tree was clean. The cached tracking ref matched; remote freshness was not
  established in this task.
- Product metadata is `0.2.0`; durable release records identify `v0.2.0-alpha.2` as
  the last verified unsigned prerelease (2026-09-01).
- No applicable filesystem AGENTS.md was found in the repository/checked ancestors;
  the user supplied the applicable memory and Git-preservation instructions.
- Read PROJECT_STATE, relevant DECISIONS, OPEN_QUESTIONS, PLANS, and provider/release
  worklogs. Preserve English-only UI and Dibi Workshop branding.

## Plan and work completed

1. Inspected repository status, architecture, adapter templates, native execution,
   MCP discovery, model catalog, evidence references, and packaging configuration.
2. Searched and opened official Kimi, Qwen, OpenAI, and MCP documentation.
3. Separated dated post-release changes, current undated documentation, older relevant
   capabilities, source-code findings, and untested proposals.
4. Prioritized improvements with acceptance criteria and conservative boundaries.
5. Updated useful project-memory observations and corrected obsolete translation
   wording in PLANS to match the accepted English-only product decision.

The `openai-docs` skill guided the official-source comparison for Codex integration.
No UI audit, runtime compatibility test, security scan, or benchmark was performed.

## Verified baseline and gaps

| Area | Source-backed local observation |
| --- | --- |
| Product foundation | TaskContract, WorkSlice, HarnessRun, EvidencePack v2, approvals, routing, MCP policy, and English Dibi UI already exist. These are not new feature proposals. |
| Kimi | `src-tauri/src/main.rs:2040` blocks real Kimi execution; the UI adapter alone is not working end-to-end integration. |
| Qwen | `src/providerAdapters.ts:109` and native normalization/readiness require Plan, safe mode, and zero tool calls. Controlled write is not enabled. |
| Runner | `src-tauri/src/main.rs:2115` pipes stdout/stderr, polls exit at 2153, and drains at 2192. Large output can stall a child before exit; this was not reproduced in a provider fixture. |
| MCP | Native discovery already tries `2026-07-28` and falls back to `2025-11-25`; remote connection validation returns before live HTTP discovery. A version bump alone is not the missing feature. |
| Models | `src/apiAdapters.ts` bundles entries with verification date `2026-08-12`; it also supports catalog merging. No current model-entitlement check was run. |
| Evidence | Git diff/report references and acceptance verification already exist. Improve their operator presentation and handoff rather than build a duplicate evidence subsystem. |
| Maintainability | `src/App.tsx` has 7,473 lines; native `main.rs` has 11,536. |
| Updates | Inspected Tauri config/Cargo dependencies do not configure an updater plugin. Release records distinguish prerelease tags, but app version alone is `0.2.0`. |

## Fresh evidence and its limits

- **2026-10-09 Qwen update:** documents a timing/usage trajectory view, worktree UI,
  and a periodically refreshed offline-capable model catalog. These are recent
  reference patterns for DBC, not evidence that copying them produces adoption.
  [Official update](https://qwenlm.github.io/qwen-code-docs/en/blog/updates/weekly-update-2026-10-09/).
- **2026-09-10 Qwen update:** describes Plan as separate from permissions, plus
  workflow history and context inspection. Current approval/headless documentation
  still lists Plan as an approval mode. Treat this as a documentation/compatibility
  discrepancy, not proof that DBC's arguments fail.
  [Update](https://qwenlm.github.io/qwen-code-docs/en/blog/updates/weekly-update-2026-09-10/),
  [approval reference](https://qwenlm.github.io/qwen-code-docs/en/users/features/approval-mode/).
- **Current Kimi ACP reference, checked 2026-10-11:** documents JSON-RPC sessions,
  permission requests, cancellation, restoration, and optional client-side filesystem
  and terminal handling. This creates a candidate route around the unmediated print
  limitation. Publication date and installed compatibility were not established.
  [Kimi ACP](https://www.kimi.com/code/docs/en/kimi-code-cli/reference/kimi-acp).
- **Current Qwen headless reference:** safe mode disables customizations, including
  context/skills/MCP and sandbox settings; it is not a sandbox. CLI budgets have
  transport-specific limits and cannot simply be assumed to govern ACP sessions.
  Keep host-enforced limits and explicit context delivery in the proposed design.
  [Headless reference](https://qwenlm.github.io/qwen-code-docs/en/users/features/headless/).
- **OpenAI article dated 2026-08-19:** distinguishes bounded `exec` jobs from
  app-server integration for persistent conversations, streaming and approvals.
  It predates DBC's September release; it is relevant available capability, not an
  October announcement. Model access is separate from the open integration layer.
  [Codex integration guidance](https://developers.openai.com/blog/codex-as-a-platform).
- **MCP specification dated 2026-07-28:** stateless requests, authorization changes,
  multi-round-trip input requests and the Tasks extension need negotiated semantics.
  DBC already references this protocol version. Validate behavior and compatibility
  rather than advertising unsupported completeness.
  [Official release](https://blog.modelcontextprotocol.io/posts/2026-07-28/).

## Proposed improvements in priority order

Priority means recommended sequence, not a vulnerability severity or approved scope.
Effort is relative: S = narrow slice, M = multiple modules, L = integration project;
none is a calendar commitment.

### 1. P0 — Trustworthy provider compatibility (M)

Extend existing Doctor/readiness with installed version, selected adapter contract,
last successful fixture, and distinct statuses: configured, authenticated, tested,
read-only, controlled-write, unsupported. Pin a supported Qwen version range after
fixtures resolve the Plan discrepancy. Do not downgrade safety just to get a green
status. Preserve disabled Kimi until its replacement is verified.

Acceptance: pinned CLI help/version plus harmless runtime fixture; refused write does
not modify files; unsupported versions are explicit; TS/Rust normalization agrees;
auth presence is never presented as successful inference. Paid calls require consent.

### 2. P0 — Streaming, cancellation, and resilient process lifecycle (M)

Drain stdout/stderr concurrently while the child runs, bound retained output without
ceasing to drain pipes, stream redacted events, support explicit cancellation, and
reap terminated processes. Define descendant-process ownership before group shutdown.
Distinguish timeout, cancellation, provider error, and budget exhaustion.

Acceptance: fixture exceeding pipe capacity on both streams completes; user sees
progress before exit; timeout/cancel preserve partial evidence; controlled child and
grandchild fixtures leave no owned processes running. No paid provider is needed for
these tests. This addresses a static code finding, not an observed production incident.

### 3. P1 — Interactive agent sessions, one adapter first (L)

Prototype Kimi ACP because it targets an existing blocked integration; Codex
app-server is an alternative first vertical slice if available local Codex is the
owner's main daily engine. Evaluate Qwen ACP against a pinned contract next. Keep a
common internal session/event model but do not pretend ACP and app-server are the same
wire protocol. MCP supplies tools/context; ACP connects the application to an agent.

Route tool permissions into DBC Approvals; implement supported host filesystem and
terminal mediation; keep actual sandbox/egress enforcement separate. Record provider
session id, policy snapshot, command/tool identity and decisions in evidence. Do not
remove the Kimi print block merely because an ACP handshake succeeds.

Acceptance: an agent proposes one temporary-workspace change, denial prevents it,
approval permits only the scoped operation, cancellation works, and restart restores
the correct session without replaying an already executed action. Host-side wall-time
and usage controls apply even where provider transport budgets do not.

### 4. P1 — Daily workspace with actionable progress (M, after #2/#3)

Extend the existing Run experience with active runs, waiting decisions, last result,
and Continue/Stop/Open evidence actions. Show model, tool, and check timing separately
from time waiting for the user. Persist event cursors and reconnect state. Notify only
on completion/failure/required decision, opt-in and without sensitive content.

Acceptance: close/reopen DBC and find the same task and pending decision; no duplicate
tool call after reconnect; a failed test links to its actual result. Retain English
labels and Dibi visual identity; this proposal is not a visual QA result.

### 5. P1 — Task workspaces plus evidence-to-Git handoff (L)

Use a dedicated Git worktree for a write-enabled task, with a clear base commit and
dirty-file preflight. Show original workspace versus task workspace. Build on existing
diff/evidence artifacts to display acceptance criteria, changed files, actual checks,
and unresolved failures together. Prepare a redacted PR summary/attachment as a later
explicit action; never equate acceptance with commit, push, merge, or deployment.

Acceptance: unrelated user edits remain untouched; evidence is invalidated when the
reviewed patch changes; conflicts are surfaced; archived work is recoverable. A
worktree isolates edits but is not a security sandbox. Git writes require approval.

### 6. P1 — One working remote MCP connection (L)

Complete Keychain-backed OAuth and Streamable HTTP for one approved fixture, with
issuer/resource validation, revocation and reconnect. Verify current/fallback protocol
paths and tool policy before broadening the supported set. Add extension capability
negotiation for long-running Tasks only when a real workflow needs it. Keep SSE legacy.

Acceptance: connect, list tools, perform an allowed read, deny a scoped-out write,
expire/revoke credentials, reconnect, and preserve redacted evidence. Unknown extension
or unverified transport cannot become silently trusted. A marketplace is not required.

### 7. P1 — Build identity and trustworthy distribution (S first, L for signing)

Show application version, prerelease/build identifier, commit, build date, architecture,
bundle path and signing/notarization state in About/Doctor. This directly answers the
owner's recurring question about which installed build is running. Add explicit update
checking and verified installation later; preserve project data and a recovery route.

Acceptance: two `0.2.0` builds are distinguishable; the displayed commit matches the
binary's build manifest; an unsigned build never looks notarized. Apple signing and
updater payload verification are separate requirements. Credential ownership remains
an open question; no signing credentials were inspected in this task.

### 8. P2 — Fresh model catalog and inspectable project context (M)

Extend the existing importable catalog with freshness/expiry, last-known-good offline
snapshot, provenance, region and capability checks. Never silently switch a sealed
run's model or confuse a catalog entry with account entitlement. Show observed usage
separately from estimated cost; absent billing data means unknown, not zero.

Show a per-run context manifest: approved AGENTS/project-memory files, relevant source,
skills and MCP tools, with sizes and approximate token contribution. Retrieve relevant
memory selectively and propose memory changes for review; do not silently rewrite
repository instructions. The current Qwen safe profile disables implicit context
customizations, so explicit context delivery must be tested, not assumed.

Acceptance: offline operation retains a dated snapshot; user overrides survive refresh;
secrets/excluded paths are absent; context provenance is inspectable; active execution
identity is unchanged. Suggested measures remain local-only.

### 9. P2 — Reduce change risk with incremental module boundaries (M)

Extract touched Run/session, Evidence, Connections, Provider and native runner modules
behind existing contracts. Add shared event/adapter fixtures and crash/cancel/large-
output tests before broad new UI. Do not schedule a framework migration or whole-app
rewrite solely because these files are large.

Acceptance: current behavior/fixtures remain stable, feature tests run independently,
and English-only accessibility/performance budgets do not regress.

## Recommended next milestone

Start with #1 + #2 + the build-identity slice of #7, then deliver one vertical slice
of #3 into the existing Run/Approvals/Evidence flow. The milestone is: open a project,
validate the installed provider, run one bounded change, see progress, approve/deny,
and receive evidence tied to the actual build and patch.

Only then expand to worktree concurrency, more providers, remote MCP, or background
workflows. Avoid a mascot redesign, another locale, a plugin marketplace, voice/email
control, unbounded autonomous execution, or enterprise roles in this milestone.

Suggested local evaluation (targets, not measured results): time to first verified
real run; percentage of runs with complete evidence; reconnect recovery success;
duplicate-side-effect count; unexplained timeout count; acceptance/rework reasons.

## Commands, checks, and limitations

- Read-only `git status`, log/ref inspection, `rg`, `sed`, `wc`, and PATH discovery.
- `command -v` found Codex and Claude; it did not find Kimi/Qwen in this session's
  PATH. This is not an exhaustive filesystem installation inventory.
- GitHub connector reads repeatedly returned an authentication/retry message.
- `git ls-remote origin refs/heads/main` failed because this sandbox could not resolve
  github.com. No fetch/push was performed. The report is grounded in local HEAD and
  opened official docs, not a freshly verified remote HEAD.
- No paid requests, installed-provider fixtures, application launches, builds, or
  automated product tests were run. Historical passing tests remain dated history.
- Documentation discrepancies are preserved as uncertainty; no upstream compatibility
  break, exploitable vulnerability, market demand, or business uplift is claimed.

## Files created and modified

- Created this worklog/report.
- Updated `.agent/memory/PROJECT_STATE.md`: dated source-review findings and proposed
  next priorities, without refreshing historical runtime verification dates.
- Updated `.agent/memory/OPEN_QUESTIONS.md`: evidence needed for Qwen baseline.
- Updated `.agent/PLANS.md`: removed stale future translation wording, consistent with
  the already accepted English-only decision.
- Application code, DECISIONS, release metadata and Git history are unchanged.

## Validation and Git handoff

Reviewed the tracked documentation diff, the new worklog contents, and staged versus
unstaged status. `git diff --check` passed; the new file also passed
`git diff --no-index --check /dev/null <worklog>`. A targeted credential-pattern scan
found no matches; manual review found no secret values or sensitive raw logs. The
staging area is empty and only the four intended memory files are changed/untracked.
No product tests were rerun. All recommendations are proposals; no new architecture
decision is accepted.

Proposed single commit, pending explicit approval:
`docs(memory): record current ecosystem improvement priorities`

Intended files are exactly the four memory files listed above. No commit or push is
authorized by this research request; changes remain only in the working tree.

## Manual verification / next action

1. Choose the first bounded implementation milestone, without assuming all proposals
   are approved merely because this report exists.
2. Obtain/install approved pinned provider versions in a disposable fixture workspace;
   confirm auth and spending permissions before any model request.
3. Resolve Qwen documentation conflicts with actual versioned behavior and fixtures.
4. Reproduce the runner backpressure case with a harmless local child process, then
   verify a separately approved fix with bounded output/cancel/timeout tests.
5. Recheck the remote branch/release before preparing a release or commit based on this
   report; no current distribution claim was established by the failed remote reads.
