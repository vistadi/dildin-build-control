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
