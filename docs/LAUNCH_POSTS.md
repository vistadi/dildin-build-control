# Launch Post Drafts

## LinkedIn

An AI coding agent can say “done.” That is not the same as proving the work is ready to merge.

I am building Dildin Build Control (DBC), a local-first evidence and acceptance layer for AI-assisted software delivery.

One bounded request becomes one EvidencePack containing approved scope, build/test evidence, review and security verdicts, unresolved risks, approvals, and the final Accept/Rework/Reject decision.

DBC does not replace Codex CLI, Claude Code, or their permissions. It gives teams one provider-neutral record for deciding whether agent work is actually acceptable.

The safe interactive preview requires no provider credentials and touches no project files.

What I am looking for:

- engineering leads already reviewing agent-generated changes
- agencies that need an acceptance record for customer work
- real examples of scope expansion, missing test evidence, or unverifiable “done” claims

Repository: <GitHub URL>

## X / Twitter

AI agent: “Done.”

DBC: Show the approved scope, checks that actually ran, review/security verdicts, unresolved risks, and the human decision.

Evidence before merge. Safe interactive preview; no credentials required.

Repo: <GitHub URL>

## Short Version

Dildin Build Control is a provider-neutral evidence and acceptance layer for AI-assisted software delivery. It turns one bounded task into an EvidencePack with scope, checks, review, security, approvals, risks, and a final human decision.

Apache-2.0. Feedback welcome: <GitHub URL>

## Proof Story 1 — Scope Expansion

The prompt looked small: update one README sentence.

The acceptance boundary was smaller: only `README.md` could change.

The useful question was not “did the agent finish?” It was “can we prove every changed file stayed inside the approved scope?”

DBC records the task contract, changed-file scope gate, checks, review, and final decision in one EvidencePack. A forbidden-file change keeps acceptance blocked even if the provider reports success.

Try the deterministic safe preview: <GitHub URL>

## Proof Story 2 — Missing Test Evidence

“Tests pass” is a claim until the run identifies the command, result, and linked evidence.

DBC keeps the result blocked when required build/test evidence is missing. The operator sees exactly which gate is incomplete before deciding Accept, Rework, or Reject.

The goal is not more agent autonomy. It is a shorter, reviewable path from agent output to justified acceptance.

Demo: <Demo URL>

## Proof Story 3 — Cross-Provider Review

Codex can implement. Claude can review. Local commands can run the checks.

The merge decision should not require reconstructing three transcripts.

DBC normalizes those results into one provider-neutral EvidencePack: scope, artifacts, build/test, review, security, approvals, risks, and the final human decision.

Repository: <GitHub URL>
