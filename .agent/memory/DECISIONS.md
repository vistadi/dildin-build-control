# DBC Decision Register

## 2026-07-28 — Position DBC as an evidence and acceptance layer

Status: accepted

### Context

AI coding tools already generate code. DBC needs a distinct, immediately legible
reason to exist.

### Decision

Position DBC as the provider-neutral evidence and acceptance layer between AI-assisted
work and merge, rather than as another coding agent or sandbox.

### Rationale

Task contracts, policy gates, review evidence, security evidence, and an explicit human
decision are the product's strongest differentiated assets.

### Affected modules

README, application navigation and copy, launch materials, demo script.

### Consequences

Marketing and onboarding lead with EvidencePack and acceptance outcomes. Provider
orchestration remains important but secondary.

## 2026-07-28 — Make Run the default and group specialist tools

Status: accepted

### Context

The previous control-tower navigation exposed too many concepts before a new evaluator
could reach a useful result.

### Decision

Open on Run and keep Run, Approvals, Evidence, and Settings visible. Put project,
workspace, task, preflight, provider-team, and loop-console screens under Advanced.

### Rationale

A single normal path reduces first-run cognitive load without removing expert tools.

### Affected modules

`src/App.tsx`, `src/styles.css`, smoke checks, screenshots.

### Consequences

New-user documentation should teach Run first. Specialist workflows remain available
but are not the first impression.

## 2026-07-28 — Browser evaluation must be deterministic and side-effect-free

Status: accepted

### Context

The web preview previously failed at native bridge boundaries, preventing evaluators
from seeing the complete product lifecycle.

### Decision

Maintain an in-memory browser harness fallback for task, slice, run, EvidencePack, and
decision operations. Label it prominently and generate no native files or provider calls.

### Rationale

This gives evaluators a complete proof journey while preserving accurate safety claims.

### Affected modules

`src/tauriBridge.ts`, `src/App.tsx`, Guided Run smoke test.

### Consequences

Preview paths and evidence are illustrative. Native artifact claims must remain limited
to Tauri runs.

## 2026-07-28 — Signing claims require artifact verification

Status: accepted

### Context

The release workflow can accept Apple credentials, but credentials and verified release
artifacts are not present in the repository.

### Decision

Prepare signing/notarization inputs and verification documentation, but never describe
a release as signed until `codesign`, Gatekeeper, and stapler checks pass on published
artifacts for both supported architectures.

### Rationale

Distribution trust is an evidence claim and must follow the same proof standard as DBC.

### Affected modules

Release workflow, signing guide, Homebrew generator, roadmap.

### Consequences

Unsigned alpha behavior remains valid when secrets are absent. Homebrew publication
waits for real release checksums.

## 2026-08-05 — Bind primary operator state to one HarnessRun

Status: accepted

### Context

The primary screens could combine the newest harness record with legacy controlled-smoke
steps, approvals, costs, or reports. A visually plausible screen could therefore describe
more than one task at once.

### Decision

Resolve Run, Approvals, Evidence, and their navigation badges from one current
HarnessRun. Show an explicit empty state when no run exists, and keep unrelated or
historical diagnostics out of the primary operator surface.

### Rationale

Evidence is trustworthy only when every displayed gate, artifact, approval, cost, and
human decision has the same task/run identity.

### Affected modules

`src/App.tsx`, Guided Run smoke coverage, operator-facing copy.

### Consequences

Legacy reports remain available through specialist diagnostics but cannot silently
populate the current acceptance decision. New primary-screen data must carry enough
task/run identity to pass the same scoping rule.

## 2026-08-12 — Expand DBC with provider-neutral Kimi, Qwen, and MCP support

Status: accepted

### Context

DBC currently supports Codex, Claude, mock, local, and generic CLI execution, but its
named strategy type is Codex/Claude-specific and MCP is not represented as a first-class
connection or policy surface.

### Decision

Add Kimi Code and Qwen Code as supported providers and add MCP as an independent layer
for connections, tools, resources, prompts, policy, approvals, and evidence. Preserve
the existing result-oriented primary navigation.

### Rationale

Provider-neutral evidence is more valuable when users can change AI systems without
changing task scope or acceptance semantics. MCP access must remain governed by DBC,
not by provider-specific auto-approval behavior.

### Affected modules

Provider types and adapters, routing, Settings/Connection Center, Run Contract,
Approvals, EvidencePack, storage, Rust execution, CLI verification, tests, and docs.

### Consequences

Brand-coded strategy combinations will be migrated to capability-driven routing
presets. New provider and MCP support will remain feature-flagged until contract,
security, and evidence fixtures pass.

## 2026-08-12 — Version adapters and seal execution identity per run

Status: accepted

### Context

Provider configuration can change after a run starts, and a brand-level provider name
does not identify the adapter contract, model, mode, fallback route, or MCP surface that
actually produced evidence.

### Decision

Use versioned adapter ids and dynamic routing policies. Capture one immutable execution
identity when HarnessRun starts, persist it in SQLite and the run manifest, copy it into
EvidencePack, and block acceptance when the two snapshots differ. Keep Kimi and Qwen
templates feature-flagged and disabled/mock until real read-only fixtures pass.

### Rationale

Evidence remains attributable even if current Settings later change. Versioned contracts
also let DBC roll out provider compatibility without silently changing prior runs.

### Affected modules

`src/types.ts`, `src/routing.ts`, `src/providerAdapters.ts`, `src/cliContracts.ts`,
`src/tauriBridge.ts`, `src/App.tsx`, `src-tauri/src/harness.rs`,
`src-tauri/src/main.rs`, storage migration, tests, CI, and operator documentation.

### Consequences

Legacy strategies migrate to named routing policies. Old SQLite rows receive an empty
backward-compatible identity. New Kimi runs warn about print-mode tool auto-approval;
new Qwen contracts cannot retain yolo mode. MCP ids are reserved in the snapshot but
remain empty until the policy proxy is implemented.

## 2026-08-12 — Ship only a zero-tool Qwen profile and block Kimi real execution

Status: accepted

### Context

Current Kimi headless print mode auto-approves internal tool calls. Qwen exposes safe
mode and explicit tool/session/time budgets, but UI health warnings alone cannot prevent
a manually edited unsafe command from reaching the backend.

### Decision

Keep every Kimi real run blocked until the DBC MCP/tool policy proxy mediates tool
access. Allow Qwen read-only readiness only when its installed CLI exposes the required
headless capabilities, auth/config presence is detected, and the effective backend args
contain plan approval, safe mode, and a zero tool-call budget. Normalize yolo, arbitrary
approval modes, and non-zero tool budgets before execution, and reject any unsafe direct
backend request.

### Rationale

Readiness must be an enforced runtime property, not a UI promise. This boundary permits
useful Qwen planning/review while preserving DBC's guarantee that new adapters cannot
silently expand tool authority.

### Affected modules

`src/providerAdapters.ts`, `src/cliContracts.ts`, `src/providerStreams.ts`,
`src/tauriBridge.ts`, `src/App.tsx`, `src-tauri/src/main.rs`, provider session checks,
fixtures, tests, and Settings UX.

### Consequences

Kimi can be discovered, authenticated, diagnosed, configured, and parsed but not run
for real yet. Qwen controlled write is not supported; native readiness still requires a
supported local CLI and credentials. The future policy proxy must supersede this hard
Kimi block with explicit tool-level authorization evidence.

## 2026-08-12 — Mediate external MCP calls with a DBC-owned run-scoped proxy

Status: accepted

### Context

Kimi and Qwen have different approval semantics, and an MCP server can expose filesystem,
network, destructive, or unknown tools. Provider-side permission prompts alone cannot
produce one consistent DBC evidence contract.

### Decision

Persist MCP connections and ToolPolicy separately from providers. Keep connections
disabled until discovery succeeds. Route CLI-managed stdio `tools/call` requests through
the DBC proxy, which evaluates intent, paths, hosts, argument limits, retries,
idempotency, and a run-scoped approval ledger before forwarding. Persist checksums and
redacted outcomes, not raw arguments or secrets.

### Rationale

The same policy and evidence semantics now apply regardless of which compatible AI
system requests an external MCP tool.

### Affected modules

`src/mcp.ts`, `src/tauriBridge.ts`, `src/App.tsx`, `src-tauri/src/main.rs`,
`scripts/dbc-mcp-proxy.mjs`, MCP fixtures, project config, approvals, and evidence.

### Consequences

External stdio MCP tools can be governed without enabling Kimi's unmediated built-ins.
Remote HTTP/OAuth execution remains disabled until an approved conformance fixture is
available. A connection health check never grants tool authority by itself.

## 2026-08-12 — Require EvidencePack v2 verification for acceptance

Status: accepted

### Context

Execution identity equality prevents provider drift but does not prove that the task
contract, slice, and run artifacts still exist or explain MCP, routing, and usage state.

### Decision

EvidencePack v2 verifies required artifact existence and checksums, seals the execution
identity checksum, summarizes MCP and routing activity, and records usage only with an
explicit confidence state. Native Accept requires schema v2, complete verification, and
exact HarnessRun identity.

### Rationale

Acceptance should fail closed when proof is missing and should never invent provider
cost or usage values.

### Affected modules

`src-tauri/src/harness.rs`, SQLite migration, `src/types.ts`, `src/tauriBridge.ts`,
Evidence UI, native tests, and reports.

### Consequences

Legacy packs remain readable but cannot authorize a new acceptance decision. Rework or
reject remains available for incomplete runs.

## 2026-08-12 — Keep analytics local-only and opt-in in the alpha

Status: accepted

### Context

Activation measurement could improve onboarding, but external telemetry would weaken
the local-first trust boundary before a privacy contract and endpoint are approved.

### Decision

Telemetry is disabled by default. The current toggle may preserve anonymous diagnostic
counters locally only; this build contains no exporter or endpoint. Any future transfer
requires a separate product/security decision and explicit operator approval.

### Rationale

This resolves the immediate UX question without collecting prompts, paths, outputs,
identifiers, or secrets.

### Affected modules

`src/types.ts`, `src/data.ts`, `src/storage.ts`, Settings UI, privacy copy, and roadmap.

### Consequences

Launch learning continues through interviews, GitHub signals, and local diagnostics.
Enabling the toggle does not transmit data.

## 2026-08-31 — Use Dibi Workshop as the DBC product identity

Status: accepted

### Context

The existing DBC interface communicated safety but looked generic and did not provide a
recognizable product symbol comparable to mascot-led AI developer products. The product
still needs to feel serious enough for approvals, evidence, and destructive-action
boundaries.

### Decision

Keep DBC as the product name and use Dibi, a black-and-white border collie, as the
mascot. Adopt the selected light Dibi Workshop visual direction: midnight navigation,
cream/light work surfaces, cyan/violet/coral accents, a protected-run summary, and a
three-stage Describe/Guardrails/Evidence workbench. Use Dibi in the sidebar, Guided Run
onboarding, desktop system icon, and documentation screenshot, but keep high-risk error
and approval states factual rather than playful.

### Rationale

A border collie expresses bounded coordination, attentiveness, and human-directed work,
which matches DBC's role as an independent evidence and control layer rather than another
coding agent. The colorful workshop direction increases recognition without weakening
the existing safety hierarchy.

### Affected modules

`src/App.tsx`, `src/styles.css`, `assets/brand`, `assets/app-icon-source.png`, the Tauri
icon set, Guided Run smoke checks, screenshot documentation, and product memory.

### Consequences

Future UI additions should use the recorded palette and Dibi asset family. Dibi may
support onboarding, empty, and success states; destructive approvals, denials, and
security failures must continue to prioritize explicit risk copy and standard status
semantics. The existing Lucide dependency remains the standard control icon family.

## 2026-08-31 — Focus the first public adoption wedge on solo AI developers

Status: accepted

### Context

The earlier design-partner question assumed small multi-provider teams, but the product
owner selected solo AI developers as the first users and wants to use DBC personally as
a complete product before expanding the market.

### Decision

Target solo AI developers who use one or more coding agents and need reproducible scope,
approvals, checks, and evidence before merge. Keep team and enterprise controls in the
architecture, but optimize first-run language, demo tasks, documentation, and public
distribution for one operator on one local workspace.

### Rationale

One operator can validate the full local-first loop with less onboarding and procurement
friction, while the same TaskContract, HarnessRun, ToolPolicy, and EvidencePack contracts
remain useful when the product later expands to teams.

### Affected modules

Guided Run onboarding, positioning, design-partner recruitment, demo content,
documentation, release packaging, and roadmap priorities.

### Consequences

Product activation should measure whether one developer can reach a trustworthy
EvidencePack quickly. Team governance remains supported but should not dominate the
first-run experience.

## 2026-08-31 — Ship one English-only product interface

Status: accepted

### Context

The Dibi Workshop implementation briefly exposed RU/EN runtime switching, while the
selected product visual and intended public distribution use English copy. Maintaining
two partial locales also increased QA surface without improving the first adoption
wedge.

### Decision

Ship the DBC application interface in English only. Remove the language toggle,
Russian copy branches, the `uiLanguage` application-state field, and locale-dependent
layout behavior. Discard any legacy stored language preference during state migration.
Russian planning and historical worklogs may remain as internal documentation.

### Rationale

One complete language produces a clearer and more consistent alpha while DBC validates
its core EvidencePack workflow with solo AI developers. A second locale can return only
as a fully scoped product decision with complete translation and QA coverage.

### Affected modules

`src/App.tsx`, `src/types.ts`, `src/data.ts`, `src/storage.ts`, `src/styles.css`, UI
smoke contracts, screenshots, README, design QA, and project memory.

### Consequences

The application always renders English copy and `lang=en`. Existing browser-local
state created by bilingual builds remains loadable, but its old locale preference is
ignored and removed on the next save.

## 2026-09-01 — Release the new product baseline as v0.2.0-alpha.1

Status: superseded by `2026-09-01 — Publish the first downloadable 0.2 alpha as v0.2.0-alpha.2`

### Context

The changes since `v0.1.1-alpha.3` add provider-neutral Kimi/Qwen contracts, MCP
connections and policy mediation, EvidencePack v2, dynamic routing, a new Dibi Workshop
identity, and an English-only primary experience. Keeping the `0.1.1` base version would
understate the expanded alpha contract.

### Decision

Advance the application version to `0.2.0` and prepare the public prerelease tag
`v0.2.0-alpha.1`. Publish it only after the complete release quality gate and both
macOS architecture jobs succeed. Treat artifacts as unsigned and not notarized unless
the published packages independently pass Developer ID, Gatekeeper, and stapler checks.

### Rationale

A minor-version alpha communicates a materially broader product surface without
claiming stable compatibility or production readiness. The prerelease label preserves
the current early-product expectations and keeps signing claims evidence-based.

### Affected modules

Package/Tauri/Cargo metadata, MCP client identity, changelog, installation and signing
documentation, GitHub release workflow, distribution artifacts, and project memory.

### Consequences

The release workflow produces Apple Silicon and Intel packages plus SHA-256 manifests.
Homebrew publication, signed/notarized language, and trusted-distribution claims remain
blocked until the published artifacts pass the recorded signing acceptance checks.

## 2026-09-01 — Publish the first downloadable 0.2 alpha as v0.2.0-alpha.2

Status: accepted

### Context

The `v0.2.0-alpha.1` quality gate passed, but both macOS jobs failed in the shared
Tauri packaging step before a GitHub Release existed. Compared with the last successful
release workflow, the failed workflow newly passed Apple signing/notarization variables
even though no verified Apple credentials are available. Rewriting the pushed alpha.1
tag would weaken the Git audit trail.

### Decision

Keep `v0.2.0-alpha.1` as an immutable record of the failed packaging attempt. Restore
the known unsigned alpha path by omitting Apple signing/notarization variables entirely,
state the unsigned status explicitly in release copy, and publish the corrected build
as `v0.2.0-alpha.2` after the same complete quality gate succeeds.

### Rationale

An additive prerelease tag preserves history and avoids destructive remote tag
rewriting. Omitting unavailable credentials matches Tauri's documented environment
contract and the last workflow that successfully produced both macOS architectures.

### Affected modules

`.github/workflows/release.yml`, changelog, release tags, distribution memory, and
release worklog.

### Consequences

The alpha.2 artifacts must be described as unsigned and not notarized. Future signing
support should use a separately verified signed-release workflow or explicit conditional
jobs rather than injecting empty signing variables into the unsigned path.

## 2026-10-24 — Bounded execution and honest operator diagnostics

Status: accepted

### Context

The user authorized review, planning and implementation of current improvements.
The October source review identified exit-before-drain CLI handling and missing
operator visibility into the running binary/process. Provider help checks alone
cannot establish live-model support or account entitlement.

### Decision

Use concurrent bounded CLI capture, timeout/cancellation with owned Unix process
groups, partial-output failure semantics and per-loop operation locks. Expose build
identity and metadata-only activity in English using existing Dibi tokens. Keep Kimi
blocked and Qwen plan/safe/zero-tool constraints unchanged; strengthen setup checks
without representing them as live certification. Do not infer signing from compilation.

### Rationale

Reliability and clear evidence improve daily operation without expanding provider
authority, adding a second design system, or requiring paid validation calls.

### Affected modules

Native CLI execution and probes, loop commands, build metadata, provider contracts,
Settings, process activity, smoke/regression fixtures, release build-label environment.

### Consequences

Output limits, I/O errors, cancellation and timeout cannot produce passing acceptance.
Cancellation does not roll back writes or sandbox a provider; process-group guarantees
are Unix-specific. Packaged native UI validation, pinned live-provider fixtures and
signing remain separate checkpoints. Git commits/pushes require explicit approval of
the proposed inventory; no merge, release or installation is included in this decision.

## 2026-10-24 — Persist lifecycle without automatic replay

Status: accepted

### Context

After approving PR #16 remediation, publication and green-check merge, the maintainer
requested Stop/Resume. Frontend-only pause cannot establish durable state; the previous
Resume reset a step without enforcing its attempt limit.

### Decision

Persist stopping/stopped/interrupted, claim/count attempts before execution, retain
late results without clearing Stop, and separate queued-work Resume from explicit
Retry of interrupted/failed work. Preserve evidence and approval/attempt boundaries.
Recover unfinished runs without launching providers. Coordinate this version's
instances with an exclusive SQLite runtime lease before startup recovery.

### Rationale

Operators must know whether execution settled and whether continuing repeats side
effects. Startup recovery must not race another cooperating runtime.

### Affected modules

Rust loop lifecycle, process metadata, harness synchronization, Tauri startup/bridge,
English lifecycle controls, browser fallback, tests, CI and operator documentation.

### Consequences

No rollback or exactly-once external-effect guarantee. Retrying an interrupted
multi-command step can repeat earlier commands; inspect crash-surviving/escaped
processes. Close older versions: they do not honor the lease or lifecycle semantics.
Stop/Resume remains local pending publication approval. This extends rather than
rewrites the earlier bounded-execution decision; no release or installation.

### Publication follow-up — 2026-10-24

The maintainer subsequently approved the two proposed implementation/memory commits,
push and a new PR, explicitly without merge or release. Runtime commit `5110d0a` is
published in PR #18. This changes publication authority only; the lifecycle decision,
compatibility warnings and outstanding native-window verification remain unchanged.

## 2026-10-25 — Merge Stop/Resume and retain the unsigned alpha release channel

Status: accepted

### Context

The maintainer explicitly requested merge and release after the PR #18 CI/CodeQL
review. The previous publication-only restriction is superseded for this operation;
historical implementation and publication decisions remain recorded above.

### Decision

Merge PR #18 preserving its two commits, then prepare the next unused prerelease
tag `v0.2.0-alpha.3` through the existing quality-gated arm64/x64 workflow. Keep
package, Tauri and Cargo versions at `0.2.0`, with the prerelease tag embedded as
the build label. Required new local commits remain subject to explicit inventory
approval under the project Git policy.

The maintainer subsequently approved both proposed release-preparation/outcome
memory commit inventories, push to `main` and creation of the alpha.3 tag on
2026-10-25. Installed-app replacement remains excluded.

### Rationale

The PR's five exact-head checks passed and no review threads were returned.
Developer ID credentials and packaged native-window end-to-end verification are
not available; these limits require an honest alpha release, not a stable claim.

### Affected modules

Release changelog, signing guide, Git tag/release workflow and persistent memory.
No runtime implementation, provider permissions or installed application change.

### Consequences

Do not move existing tags, weaken checks, inject empty Apple signing variables,
or claim signing/notarization. Verify both packaging jobs and published checksum
manifests before recording success. Stop/Retry and older-instance compatibility
warnings remain part of the release notes.

## 2026-10-25 — Use application-owned Retry confirmation

Status: accepted

### Context

Packaged alpha.3 native QA reproduced a Retry no-op because the browser-native
confirmation was not displayed. The maintainer requested a fix, desktop QA and PR,
explicitly excluding merge and release.

### Decision

Use an inline English confirmation in the existing lifecycle component. Focus
Cancel first; Cancel/Escape perform no IPC. Bind confirmation to the loop, workspace,
step, lifecycle and attempt budget; invalidate changed targets/pending actions and
consume confirmation before invoking Retry. Preserve backend approval/budget locks.
Show the selected loop's actual status instead of deriving Running from existence.

### Rationale

Application-rendered controls behave consistently in native WebView and browser,
reuse Dibi tokens, and avoid a new native dialog dependency or permissions. Explicit
Retry still warns about repeated side effects and never substitutes for approval.

### Affected modules

LoopLifecycleControls, loop lifecycle UI helpers, Loop Console, regression fixtures
and Stop/Resume operator documentation. No Rust execution or persistence change.

### Consequences

Separate arm64 desktop mock QA passed Cancel/Escape and explicit Retry. Installed
alpha.3 remains unchanged until a separately approved build/update. This extends the
2026-10-24 durable-lifecycle decision without weakening its guarantees or boundaries.

## 2026-10-25 — Merge native Retry fix and prepare alpha.4

Status: accepted

### Context

After PR #19's five exact-head checks passed, the maintainer explicitly requested
merge and release. This supersedes the earlier publication-only restriction for
this operation; prior implementation/QA decisions remain unchanged.

### Decision

Merge PR #19 preserving its three commits, then prepare the next unused tag
`v0.2.0-alpha.4` through the existing unsigned arm64/x64 release workflow. Keep
package, Tauri and Cargo numeric versions at `0.2.0` and embed the tag as build label.
The maintainer explicitly approved both presented release-preparation and outcome-memory
commit inventories, push to main and the new tag on 2026-10-25. Do not update the
installed application.

### Rationale

The native Retry/status fix is bounded, locally desktop-tested and green in CI and
CodeQL. Apple credentials remain unavailable; an unsigned prerelease preserves the
established distribution channel without claiming stable or signed certification.

### Affected modules

CHANGELOG, persistent project memory, Git merge/tag and existing release workflow.
No runtime implementation, provider permissions or signing configuration changes.

### Consequences

Do not rewrite old tags, bypass checks or claim the debug QA bundle certifies every
release binary. Verify published artifacts and checksums for both architectures.
Installed alpha.3 and its private rollback snapshots remain untouched.

## 2026-10-25 — Separate project task readiness from DBC distribution

Status: accepted

### Context

The maintainer approved fixing the two blockers reproduced in the disposable
alpha.4 README test, then repeating it within eight AI CLI calls. Native operator
readiness required local DBC/Tauri packaging in arbitrary target projects, and
Node helpers could not parse native-saved provider YAML. Adding `yaml` only to
DBC's development dependencies was separately approved; no Git publication.

### Decision

Treat local distribution artifacts as informational in task readiness, while
retaining independent release/signing/publishing checks. Preserve controlled
baseline, provider contracts, bounded task/budget, matching operator approval,
ledger and preflight gates. Share a strict YAML parser and structural profile
serializer across Node helpers; reject malformed/ambiguous configuration.

### Rationale

An ordinary workspace should not need to build DBC to run a one-line task.
Configuration data must survive native/CLI round trips without layout-dependent
parsing or changes to unrelated provider metadata.

### Affected modules and consequences

Native operator checklist, Node readiness/plan/profile/report helpers, regression
fixtures and CI. Adds `yaml` as a dev dependency, not to the frontend bundle.
Supports an explicit validated micro-task file without silently raising budgets.
Test-only QA bundle retains a separate app identifier; installed alpha.4 stays
unchanged. No task approval grants publish, push, install or secret access.
Live outcomes are recorded separately in the implementation worklog.

## 2026-10-25 — Bind evidence and distinguish comparison from attestation

Status: accepted

### Context

The real-provider example exposed unsubstantiated inter-step review, broad masking
misreported as credential findings, and no native scope evidence without Git.
The maintainer requested fixes/tests locally and prohibited new AI calls and Git
publication. Historical failures must not be rewritten as successes.

### Decision

Use step evidence v2 and SHA-256 pins in SQLite, current-run input packets and exact
citations for real QA/review/security/acceptance. Recheck input bytes after execution
and the chain at acceptance. Treat broad/legacy masking as informational, retain
typed blocking credential indicators, and deduplicate per source/kind. New non-Git
runs capture a bounded pre-execution filesystem baseline pinned in SQLite; compare
paths before/after execution. Missing, legacy or incomplete evidence stays blocked.

### Rationale

Step expectations, model prose and empty Git diffs cannot certify executed checks.
Redaction is a display/safety measure, not independent proof of a credential leak.
Native-owned pins prevent edited workspace reports from silently replacing the
recorded identity, assuming the application database itself remains trusted.

### Affected modules and consequences

Native runtime, additive SQLite columns, evidence_handoff, secret_diagnostics,
workspace_fingerprint and readiness documentation. Direct Rust SHA-256/regex
dependencies reuse already locked versions; no new package download was needed.
Old runs are readable but not silently upgraded to verified evidence. Sensitive
files use metadata only, generated namespaces are excluded and scan bounds fail
closed. Citations are not provider-tool-use attestation, and filesystem comparison
is not a hostile-process sandbox or a transient-write journal. A separately approved
new desktop/live fixture is needed; installed alpha.4 and failed evidence are intact.

## 2026-10-25 — Publish verified readiness and evidence changes for review

Status: accepted

The publication-only restriction was superseded for PR #20 by the separately
authorized merge/alpha.5 release decision below. Other execution boundaries remain.

### Context and decision

The maintainer explicitly requested commits of all verified readiness/evidence
changes, a separate branch, push and a PR to main. This supersedes the earlier
no-commit/no-push restriction for these changes, not the bans on new AI calls,
merge, release or installed-app changes. Use `codex/readiness-evidence-integrity`,
separate implementation groups and memory, and retain historical failed outcomes.

### Rationale, affected modules and consequences

Publish the tested work for CI/review without silently promoting it to production.
Affects Git publication and persistent project memory only; runtime contracts
remain the two accepted decisions above. No force-push, amended history, auto-merge,
tag, release dispatch or new model invocation. Record actual commit/PR identities
and leave merge/release for separate authorization.

## 2026-10-25 — Merge readiness/evidence fixes and release alpha.5

Status: accepted

### Context

The maintainer requested merge of PR #20 and a new release after all five checks
passed on documentation head `f6ff4da`. No new AI calls are allowed. This supersedes
the preceding publication-only restriction for this merge/release operation, not
the evidence contracts or restrictions on live execution and installed-app changes.

### Decision

Merge preserving all five PR commits, then create the next unused annotated tag
`v0.2.0-alpha.5` through the existing unsigned arm64/x64 workflow. Numeric package,
Tauri and Cargo versions stay at `0.2.0`; the build label carries the prerelease tag.
The maintainer explicitly approved both release-preparation/outcome-memory commit
inventories, push to main and the new tag. Do not change old tags or install the app.

### Rationale and affected modules

Readiness, native evidence handoff, typed findings and non-Git comparison passed
deterministic local and CI validation. Publish these fixes without claiming a new
live-provider success, full tool-read attestation, filesystem sandbox or signing.
Affects CHANGELOG, project memory and the existing Git/release workflow operation;
no additional runtime or signing configuration changes.

### Consequences

Verify release quality, both architectures and published assets/checksums. Legacy
runs remain readable but are not recertified. Keep the historical failed live test,
seven-of-eight call accounting, installed alpha.4 and private rollback data intact.
New installation or live tests require separate authorization.
