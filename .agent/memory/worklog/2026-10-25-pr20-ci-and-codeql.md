# PR #20 CI and CodeQL verification

## Objective, authority and initial state

Inspect CI and CodeQL for PR #20; fix failures, test, commit and push fixes to its
feature branch if needed. No new AI/provider calls, merge, auto-merge, tag, release,
installed-app or historical live-fixture changes are authorized.

Initial branch `codex/readiness-evidence-integrity`, clean working tree and empty
index, at `face7108a2a4b9af1c07608aa4599d805a4332ca`. GitHub PR #20 is open,
non-draft and unmerged with four commits and 35 changed paths. Its base is main
at `0a05edf3a80eccafae3b178edd356b40ec919895`. SSH `git ls-remote` independently
confirmed both branch tips. Applicable memory, accepted readiness/evidence and
publication decisions, active plans and the publication worklog were inspected.

## Plan

1. Bind all observations to the current PR head, not the earlier publication head.
2. Inspect CI jobs, annotations and CodeQL's aggregate result as well as its jobs.
3. Diagnose and fix actual failures only; otherwise leave runtime/workflows intact.
4. Record exact verification and remaining limitations; retain publication limits.

## Checks performed and current observations

- PR API, exact-head check diagnostics, workflow/job/step summaries and annotations.
- CI run `40231602459`: successful Frontend build and Rust tests. All frontend
  steps passed, including typecheck/build, ten smoke suites and deterministic
  EvidencePack generation/verification. Rust log confirms 75 passed, zero failed;
  Rust formatting passed too.
- CodeQL run `40231602444`: JavaScript/TypeScript successful; Rust analysis was
  still running at 20:40 UTC. Aggregate CodeQL was temporarily neutral, reporting
  a missing Rust configuration result. This is not a verified final pass or a
  reason to remove the Rust matrix entry; both language entries are configured.
- The completed jobs' annotations contain only GitHub's informational notice
  about the `ubuntu-latest` migration to Ubuntu 26, not source errors.
- PR review-thread query returned an empty list.
- Local `git status`, current commit and origin, `git diff --check` and
  `git diff --cached --check` inspected; initial source/index unchanged.

No local tests or model CLI calls were needed to reproduce the already successful
CI jobs. The investigation made no code or workflow change, Git commit or push.
The subsequent approved documentation-publication checkpoint is described below.

## Final result and next action

Verified at 2026-10-25 20:42 UTC on the unchanged exact head:

- CI run `40231602459`: completed, success.
- CodeQL run `40231602444`: completed, success.
- All five check runs are successful: Frontend build (`121284325748`), Rust tests
  (`121284325862`), Analyze JavaScript/TypeScript (`121284325736`), Analyze Rust
  (`121284325899`) and aggregate CodeQL (`121284517734`).
- Aggregate CodeQL reports no new alerts in code changed by this PR. The temporary
  missing-Rust configuration warning cleared automatically after Rust completed;
  no workflow change or rerun was necessary. This is not a repository-wide audit
  or a claim that every historical branch alert is resolved.
- Rust's remaining annotation is the same informational runner-migration notice.
- Final PR API read confirms open/unmerged, the same head and unchanged main base.

No failing check or new CodeQL finding required a repair, so no implementation
commit/push was made. Three memory paths were updated locally: this worklog,
`.agent/PLANS.md` and `.agent/memory/PROJECT_STATE.md`. Suggested single commit:
`docs(memory): record PR 20 CI and CodeQL verification`, limited to those three
paths. The original request conditionally authorized fix commits; documentation
was left unstaged pending explicit approval, subsequently granted below.

Evidence links:

- PR: https://github.com/vistadi/dildin-build-control/pull/20
- CI: https://github.com/vistadi/dildin-build-control/actions/runs/40231602459
- CodeQL workflow: https://github.com/vistadi/dildin-build-control/actions/runs/40231602444
- Aggregate: https://github.com/vistadi/dildin-build-control/runs/121284517734

CI success does not certify the installed alpha.4 or the failed historical live
provider test; those states remain unchanged. Any merge/release or new live test
requires separate authorization.

## File inventory and decisions

Created this worklog; updated the current verification in PLANS and PROJECT_STATE.
No architecture, security policy or product decision was changed; existing accepted
evidence/readiness contracts remain in effect. DECISIONS and OPEN_QUESTIONS do not
need changes because no new unresolved technical issue or decision was found.

## Approved documentation-publication checkpoint

The maintainer explicitly approved one commit of these exact three files and push
to `codex/readiness-evidence-integrity`, retaining the bans on new AI calls, merge
and release. At the start of publication, HEAD was still `face710`; the worktree
contained only the two modified memory files and this untracked worklog, and the
index was empty. No unrelated changes are included.

Commit inventory: `.agent/PLANS.md`, `.agent/memory/PROJECT_STATE.md`, and
`.agent/memory/worklog/2026-10-25-pr20-ci-and-codeql.md`.
Approved message: `docs(memory): record PR 20 CI and CodeQL verification`.
Update the obsolete approval-pending wording, review all three files for sensitive
data, stage explicitly, inspect the staged diff and whitespace checks, then create
one normal commit and push only this branch. No amend, force-push, tag or main push.
Code, tests and workflows are unchanged, so no new local test execution is needed.
The verified checks above apply to `face710`; a new documentation head must not
inherit a claimed CI result. Verify the published SHA and PR state after pushing.
