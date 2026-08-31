# UI/UX, MCP, Kimi and Qwen master plan — 2026-08-12

## Task objective

Create a complete product and technical plan for improving DBC UI/UX and adding current
Kimi Code, Qwen Code, and MCP support.

## Approved scope

- Plan the complete operator-facing information architecture and user journeys.
- Plan provider-neutral Kimi/Qwen integration without weakening DBC evidence gates.
- Plan MCP connections, policies, approvals, secrets, health, and evidence.
- Define phased implementation, testing, performance, accessibility, metrics, risks,
  and Definition of Done.
- Do not implement providers, change runtime behavior, commit, push, or deploy.

## Initial repository state

- Branch `main`, tracking `origin/main`.
- Working tree was clean.
- Current providers: mock, local runner, Codex CLI, Claude Code CLI, and generic CLI.
- Current strategy type is hardcoded to Codex/Claude combinations.
- No first-class MCP data model or connection UI exists.

## Work completed

- Reviewed project state, decisions, open questions, recent worklog, roadmap, provider
  types, CLI normalization, storage migration, and existing provider UX specification.
- Verified current official Kimi Code CLI print/headless and MCP capabilities.
- Verified current official Qwen Code headless, budget, structured output, MCP transport,
  OAuth, and filtering capabilities.
- Verified official MCP host/client/server architecture, transports, and authorization
  guidance.
- Created `docs/UI_UX_MCP_KIMI_QWEN_MASTER_PLAN_RU.md`.
- Updated active plans, current limitations/priorities, architecture decision register,
  and open implementation questions.

## Important findings

- Kimi print mode auto-approves internal tool calls, so DBC cannot delegate approval
  semantics directly to Kimi for controlled execution.
- Qwen exposes useful headless budgets and MCP filtering, but `--yolo` must never be a
  default DBC preset.
- A DBC-owned MCP policy proxy is the most consistent path for CLI-managed MCP because
  provider trust and approval semantics differ.
- Provider strategies must become dynamic routing policies before adding new brands.

## Validation

- Documentation statements were checked against official MoonshotAI/Kimi CLI,
  QwenLM/Alibaba Cloud, and Model Context Protocol sources.
- No executable source files or runtime configuration were changed.
- No credentials or secret values were recorded.

## Files created and modified

- Added `docs/UI_UX_MCP_KIMI_QWEN_MASTER_PLAN_RU.md`.
- Updated `.agent/PLANS.md`.
- Updated `.agent/memory/PROJECT_STATE.md`.
- Updated `.agent/memory/DECISIONS.md`.
- Updated `.agent/memory/OPEN_QUESTIONS.md`.
- Added this worklog.

## Unresolved risks

- Supported CLI version ranges must be established through real fixtures.
- Direct API support remains dependent on OS keychain secret references.
- The first curated MCP starter servers still need a product/security decision.
- UI mockups and implementation have not been produced in this planning task.

## Recommended next action

Implement Phase 0 as a backward-compatible slice: RoutingPolicy migration, adapter
registry, invocation contract fixtures, immutable execution identity, and feature flags
for Kimi/Qwen before adding Connection Center UI.
