# Real micro tasks in ordinary projects

Project readiness and DBC distribution readiness are separate. A Node, Python or
README-only project does not need `src-tauri/tauri.conf.json`, a DBC executable,
an app bundle or a DMG to run a bounded task. Release/signing/publishing checks
remain separate and are not granted by a successful task checklist.

## Required evidence

Real execution still requires a successful controlled baseline, valid enabled CLI
contracts, an explicit bounded task and positive budget, prepared real plan,
baseline comparison, matching operator approval, approved ledger decisions and
ready-to-run preflight. Missing/failed project evidence remains blocking.
Authentication/entitlement and real execution must be checked separately from
help/version probes. Do not create passing reports by hand.

The project's `.dbc/providers.yaml` is parsed structurally by Node helpers. Both
native Sync config output and legacy hand-written YAML are supported, including
quoted strings, arrays, booleans and reordered fields. Invalid YAML, duplicate IDs
or keys, aliases and unsupported tags fail closed without logging source contents.
Profile generation preserves other configuration fields and switches only the
intended providers; applying real still requires the matching approval.

## Preparing a small example

Use installed tools and a disposable workspace with a real `pnpm build` check.
Do not install dependencies or create commits as an implicit part of verification.
Run DBC's helper scripts with **the target project as cwd**. The scripts and their
Node dependencies belong to DBC, not the target project. Example, with `DBC_ROOT`
set to the DBC checkout:

```sh
node "$DBC_ROOT/scripts/provider-profile.mjs" generate
node "$DBC_ROOT/scripts/controlled-smoke.mjs"
node "$DBC_ROOT/scripts/provider-contracts.mjs"
node "$DBC_ROOT/scripts/real-readiness.mjs"
node "$DBC_ROOT/scripts/real-micro-plan.mjs" --task-file /absolute/path/to/approved-task.json
node "$DBC_ROOT/scripts/compare-real-micro.mjs"
node "$DBC_ROOT/scripts/revert-evidence.mjs"
```

`--task-file` is optional; without it the historical README-marker task is used.
Custom tasks must retain version 1, `REAL-MICRO-README`, `real_micro`, and
`codex_build_claude_review`; provide non-empty criteria, constraints and stop
conditions; allow only README.md and the named generated `.dbc` artifact folders;
and deny `.env`. Invalid scope or non-positive/non-finite budget is rejected.

One budget unit allows four AI CLI invocations, not four dollars. The standard
seven-step route uses six AI calls plus one local build step if no retry occurs.
A full route therefore needs an explicitly approved budget such as 2 (eight
calls). Never silently increase an approved budget; changing it requires a fresh
checklist and approval. Existing tasks/defaults are not automatically upgraded.

In native Overview, generate Checklist, review the task/budget, Approve, then
Apply real. Generate the approval ledger using the actual recorded decisions:

```sh
node "$DBC_ROOT/scripts/approval-ledger.mjs" generate
```

Use Dry-run and run only when it reports `ready_to_run`. The advanced legacy-loop
path is the current real-provider path; the primary Guided Harness compatibility
path must not be represented as live AI execution.

After completion or a blocker, apply Mock and verify revert evidence. Preserve
logs/evidence privately, compare actual files and run checks. An empty Git diff is
never proof of no changes in a project without Git.

## Local evidence-integrity changes (not in installed alpha.4)

New native step-evidence records use version 2, including the actual artifact's
SHA-256. SQLite pins the evidence-file SHA-256. Before a real CLI step, DBC builds
an immutable per-attempt input packet from passed steps of this run: run/task/spec,
step/attempt/provider identity, paths, hashes and bounded redacted result summaries.
Expected evidence text is explicitly labelled as expectation, not execution proof.

Real QA, review, security and acceptance responses must return `evidenceRefs` with
every supplied reference's exact `stepId`, `attempt`, `evidencePath`,
`evidenceSha256`, `artifactPath` and `artifactSha256`. Missing, duplicated, foreign,
stale or changed input evidence blocks success. Input bytes are rechecked after
execution and at final acceptance. Citations demonstrate a matching evidence
contract, **not** proof that a provider actually opened a file or reasoned correctly.
Generic text streams still provide no complete tool-use attestation.

Redaction remains enabled. Broad/legacy masking markers are informational
`redactionEvents`, not automatically high-severity credential findings. Concrete
assignment, bearer, provider-token and private-key indicators produce typed masked
markers and remain blocking. Repeated indicators are deduplicated per source/kind;
counts are not counts of distinct leaked secrets. Detection is heuristic, not a
complete secret scanner or vulnerability audit. Raw credential values are not
needed in reports or test diagnostics.

New non-Git runs capture a filesystem baseline before any attempt and pin its
SHA-256 in SQLite. Scope comparison detects additions, modifications and deletions,
checks allow/deny paths before and after executable steps, and exposes the actual
changed paths in reports. It uses SHA-256 plus metadata for ordinary files and
metadata only for denied/sensitive paths (including `.env`, key files and credential
directories), without reading their contents. Limits: 10,000 entries, 16 MiB per
file, 128 MiB total content, depth 64 and five seconds per capture. Missing,
unreadable, symlinked, unsupported, oversized or incompatible snapshots and a
changed task specification remain unverified/blocked.

DBC-generated `.dbc/{artifacts,evidence,git,loops,reports,security,approvals}`
directories are excluded from the file comparison. Current-run evidence/artifacts
are checked separately against the pinned records; this does not attest every file
in excluded directories. Portable task/configuration files remain in scope.
This is a bounded comparison, not an OS sandbox, write journal or protection from
a hostile concurrent filesystem process. Transient writes later reverted are not
fully observable; metadata-only checks are weaker than content hashes.

Legacy runs without pre-execution pins or version-2 step records are not silently
upgraded or recertified. Preserve their evidence and use a new explicitly approved
run to obtain the new guarantees. The historical failed real-provider test remains
failed; local deterministic process tests do not certify a new live-provider run.
