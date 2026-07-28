# DBC 90-Second Demo Script

## Goal

Show one complete proof-led workflow without provider credentials or filesystem
side effects.

## Recording Setup

- Use the browser preview at a 1440 × 900 viewport.
- Start from a clean state with `Reset demo`.
- Keep the cursor movements deliberate.
- Do not open Advanced screens.
- Show the safety notice before starting.

## Timeline

### 0–10 seconds — The problem

Voiceover:

> An AI coding agent can say the task is done. DBC records the proof you need
> before accepting it.

Show the Run screen and the `Safe interactive preview` notice.

### 10–25 seconds — Bound the task

Click `Load demo task`.

Voiceover:

> This task may change only README.md. Source code, credentials, dependencies,
> and build output are explicitly out of scope.

Click `Create and start safe run`.

### 25–50 seconds — Run the checks

Show the approved Scope and Work steps. Click `Advance checks` until the run is
evidence-ready.

Voiceover:

> DBC advances through deterministic build, test, review, and security evidence.
> Missing proof keeps acceptance blocked.

### 50–70 seconds — Generate proof

Click `Generate proof package`.

Voiceover:

> The EvidencePack joins approved scope, artifacts, checks, review, security,
> risks, and approvals into one provider-neutral record.

### 70–85 seconds — Decide

Click `Accept`, then open `Evidence`.

Voiceover:

> The final human decision becomes part of the EvidencePack. DBC never pushes or
> deploys the code for you.

### 85–90 seconds — Call to action

Voiceover:

> Evidence before merge. Try the safe preview without credentials.

End on the finalized EvidencePack.

## Short GIF Cut

For a README GIF, keep only:

1. Load demo task.
2. Create and start.
3. Advance checks.
4. Generate proof package.
5. Accept.

Target 20–30 seconds and keep text readable.
