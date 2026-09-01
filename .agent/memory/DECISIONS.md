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
