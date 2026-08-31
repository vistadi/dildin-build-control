# DBC Positioning

## Category

Provider-neutral evidence and acceptance layer for AI-assisted software delivery.

DBC is not another coding agent and should not be presented as a replacement for
Codex CLI, Claude Code, GitHub Copilot, or their native sandbox and permission
controls.

## One-Sentence Promise

DBC proves what an AI coding agent changed, checked, and was allowed to do before
a human accepts the result.

## Primary User

Start with solo AI developers who already use one or more coding agents on local
projects and want trustworthy proof before accepting a change.

The strongest early-fit operator:

- works actively in one or more local repositories;
- uses Codex CLI, Claude Code, Kimi, Qwen, or a compatible local/API agent;
- personally reviews AI-generated changes before merge;
- has experienced missing tests, scope expansion, or unverifiable “done” claims;
- values local-first operation and explicit human approval.

Engineering leads, small agencies, and teams with audit or customer-acceptance
requirements are the next expansion segment, not the first-run message.

## Core Job To Be Done

When an AI coding agent finishes a task, help me verify scope, checks, review,
security, and approvals in one provider-neutral record so I can accept, send to
rework, or reject the result with confidence.

## Message Hierarchy

1. Evidence before merge.
2. One bounded request becomes one reviewable EvidencePack.
3. Missing proof blocks acceptance.
4. Human approval remains explicit.
5. Codex, Claude Code, Kimi, Qwen, generic CLI, and local checks can participate in the
   same acceptance workflow when their adapter and safety requirements are satisfied.

## What Not To Lead With

Avoid leading with internal terms such as HarnessRun, WorkSlice, provider
strategy, state machine, or “AI loop operating layer.” These concepts remain
useful in expert documentation but do not explain the first user benefit.

Avoid generic claims such as “safer AI development.” Native agent products
already provide sandbox, permissions, and hooks. DBC’s distinction is the
portable evidence and acceptance record across those products.

## Proof Stories

### Scope expansion

The agent changed a file outside the approved paths. DBC records the violation
and blocks acceptance.

### False completion

The agent reports completion, but a configured test fails or no machine-readable
test evidence exists. DBC keeps the result in rework.

### Cross-provider delivery

Codex implements, Claude reviews, local commands run checks, and the product
owner decides from one EvidencePack.

## Primary Call To Action

Try the deterministic safe preview:

1. Click `Load demo`.
2. Click `Start safe run`.
3. Advance the checks.
4. Generate the proof package.
5. Accept, request rework, or reject.

The preview must remain explicit that it does not touch project files, providers,
or credentials.
