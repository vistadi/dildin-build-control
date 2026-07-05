# Loop Engineering Manifesto

AI coding work should be fast, but it should not become invisible.

DBC is built around a simple idea: agent work is not a chat, it is an engineering loop. A loop has a task contract, a scope boundary, a plan, executable steps, evidence, review, security gates, acceptance, and a human-controlled handoff.

## Principles

1. **A task is a contract.**
   Before execution starts, the system should know the brief, acceptance criteria, allowed paths, denied paths, risk, reviewers, provider strategy, and budget.

2. **The operator owns authority.**
   Tools may propose. Tools may execute allowed steps. The human keeps control over provider spend, sensitive commands, git history, deployment, and release.

3. **Every step should leave evidence.**
   Build logs, test results, diffs, provider summaries, security checks, and acceptance packages should be recoverable after the UI closes.

4. **Scope is a gate, not a suggestion.**
   If a task permits `README.md`, changes outside that contract should block acceptance until reviewed and approved.

5. **Provider output is not proof.**
   A provider saying "done" is a signal, not an artifact. The loop still needs build/test evidence, review, security checks, and operator-visible reports.

6. **Mock mode matters.**
   Serious automation needs rehearsal. DBC treats deterministic mock loops as a way to test the harness before spending real model calls.

7. **Local-first does not mean opaque.**
   Local execution should produce portable manifests, reports, and support bundles that can be audited without the original UI session.

8. **Dangerous actions stay boring.**
   Push, deploy, reset, clean, secret edits, migrations, and broad filesystem writes should be explicit, logged, and approval-gated.

## What DBC Is Optimizing For

- Smaller blast radius per task.
- More repeatable agent-assisted delivery.
- Evidence that survives across sessions.
- Clearer handoff from AI-generated work to human git operations.
- A practical path from mock loops to real provider loops.

## What DBC Refuses To Optimize For

- One-click autonomous shipping.
- Hidden provider prompts.
- Automatic destructive git operations.
- Treating screenshots or chat summaries as sufficient release evidence.
- Storing secrets or provider credentials inside project config.

Loop engineering is not about slowing AI down. It is about giving speed a shape the operator can trust.
