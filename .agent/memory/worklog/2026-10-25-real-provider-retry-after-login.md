# Real provider Retry after confirmed login

## Objective, authority and initial state

On 2026-10-25 the maintainer confirmed loggedIn=true and explicitly requested
continuing the failed step within the remaining five CLI invocations. No commits,
push, release, dependency installation, secret access or unrelated source fix.
Return to safe mock and preserve actual evidence, including failure.

- Branch `main`, HEAD `0a05edf3a80eccafae3b178edd356b40ec919895`.
- Initial tree already dirty: all 27 pending readiness/YAML implementation and
  memory files from the preceding task. They were preserved; no code edit here.
- Separate `DBC Readiness QA` app, isolated identifier and SQLite. Installed
  `/Applications/Dildin Build Control.app` remains official alpha.4.
- Existing loop `loop-1792954022432`, failed at QA index 3. Plan/code/build passed
  at one attempt each; QA failed before authentication at attempt 1. Review,
  security and acceptance had zero attempts. Three of eight calls already used.
- Fixture `/private/tmp/dbc-readiness-live-j8i6j9/project`; initial and post-edit
  scope hashes and the pre-retry private snapshot were available for comparison.

## Plan and work completed

1. Read Git state, project memory, active plan, applicable fixture instructions
   and the earlier implementation worklog. Rechecked stored run/attempt counts.
2. Ran unrestricted, bounded read-only auth status for the exact configured Claude
   executable, normal and safe-mode. Both now returned exit 0, loggedIn=true,
   authMethod=claude.ai. Printed no account data or credentials.
3. Opened the existing isolated QA bundle. Loop History loaded the same failed
   SQLite run. Inspected partial evidence, then clicked Retry step and Confirm retry.
   No new task/loop, re-approval, task change or profile mutation was needed.
   Retry retained the frozen real-provider identity; mock profiles for future runs
   do not rewrite execution identity of the explicitly retried existing run.
4. Watched the native run and queried its database read-only. QA/review/security
   returned pass, then acceptance returned request_changes. The run stopped itself
   at failed; the acceptance package verdict is blocked. No additional retry.
5. Independently reran both Node assertions, compared original fixture files and
   prior successful evidence, verified archived failure, saved screenshots and
   preserved a second private app/project snapshot. Verified safe mock and closed QA.

## Actual step results and call accounting

| Step | Final provider/status | Total attempts | New CLI calls |
| --- | --- | ---: | ---: |
| plan | Codex / passed | 1 | 0 |
| code | Codex / passed | 1 | 0 |
| build | local terminal / passed | 1 | 0 |
| test/QA | Claude / passed | 2 | 1 |
| review | Claude / passed | 1 | 1 |
| security | Claude / passed | 1 | 1 |
| accept | Codex / failed, request_changes | 1 | 1 |

**Four of the remaining five invocations used; seven of eight total.** The original
failed-before-auth Claude invocation is included. This is a call allowance, not
a monetary budget or claim of seven billed model responses. One call is unused.
No changes to timeout, scope, budget, providers, sandbox or permission mode.

## Acceptance blockers and important discoveries

- README contains the exact expected verified marker and native build evidence
  records both check.mjs and verify.mjs succeeding. Independent reruns also passed.
- Claude QA/review/security claimed pass but did not cite current-loop executed
  build evidence. Review predicted verify.mjs would pass; security stated no
  additional evidence artifacts were present requiring review. Acceptance inspected
  actual artifacts and refused to treat those assertions as substantiated review.
- Generic text provider normalization reports events=1, toolCalls=0. This is not
  proof that no tool ran, nor a complete trace of which files were actually read.
  Do not upgrade self-reported actions into verified tool evidence.
- The prompt's Evidence so far uses the current step's evidence string rather
  than an explicit list of prior current-loop artifact paths/checksums
  (`main.rs` step prompt construction). Better handoff and verifiable citations
  are proposed follow-up work, not implemented or waived in this test.
- Acceptance saw 17 security findings before its own output was persisted. Final
  report has **67**, all kind redacted-secret-line. `redact_text` masks any line
  containing words such as secret/password; `scan_text_for_secret_findings` then
  marks every redaction placeholder high. Echoes of earlier reports amplify the
  count. This proves marker-based classification, not 67 actual exposed credentials.
  No redaction or detection logic was disabled; no alerts were dismissed.
- Native scope remains passed but verified=false, mode unverified_non_git. This
  fixture deliberately has no Git history. External byte comparisons prove the
  fixture result but are not native scoped-baseline evidence; acceptance correctly
  retained that uncertainty. No fake passing gate/artifact was injected.

Final report gates include realProviderCallsUsed=7, realProviderCallLimit=8,
realProviderBudgetOk=true, realOpsApprovalReady/operatorReady/preflightReady=true,
pendingApprovals=0, allStepsPassed=false, scopeVerified=false, securityFindings=67.
The example is **not accepted**, despite a correct one-line product result.

## Validation and preservation

- `check.mjs`: passed, README structure and verified marker valid.
- `verify.mjs`: passed, exactly the approved one-line change.
- README, AGENTS.md, check.mjs, verify.mjs and package.json byte-match the pre-retry
  snapshot. The README still differs from original only by pending -> verified.
- `01-plan.json`, `02-code.json`, `03-build.json` byte-match the pre-retry snapshot.
  Corresponding SQLite attempt counts stay 1: successful work was not replayed.
- Prior failed QA evidence was saved as
  `.dbc/evidence/loop-1792954022432/attempts/attempt-1/04-test.json` and byte-matches
  the previous snapshot's 04-test.json. Current QA evidence records attempt 2.
- Native Settings confirms safe mock, real execution off, telemetry off, isolated
  QA label and the same fixture project. Revert helper: reverted, 0 blockers,
  1 warning for the failed/blocked loop. QA process exit confirmed after normal Quit.
- New private snapshot:
  `/Users/vitaliy/Library/Application Support/DBC Backups/2026-10-25-readiness-retry-eCRTYI`.
  Contains project, task JSON, original README, four screenshots and isolated
  Application Support/SQLite and WebKit. All three directory comparisons passed.
  The prior `2026-10-25-readiness-fix-D7Dva5` snapshot was not changed.
- New screenshots: `03-retry-acceptance-blocked.png`, `04-retry-safe-mock.png`.
- Installed alpha.4 executable remains SHA-256
  `7fcde40baaa5f82916e1a1af03c8ea5379c72a513b92a9cc81ef1efefb4fd02b`;
  original production SQLite still byte-matches its preceding restored backup.
- No source/build change this continuation, so the earlier 63 Rust tests and smoke
  suite results belong to that implementation checkpoint, not newly rerun here.
  Current checks are auth probes, native Retry, read-only SQL, file assertions,
  byte comparisons, process exit and final Git/memory review.
- Final `git diff --check` passed; staged diff is empty. A bounded credential-pattern
  check across all 28 pending files found no matches; this is not a comprehensive
  secret audit. Post-acceptance comparisons again confirmed all five fixture files
  and the three earlier successful evidence files unchanged since Retry.

## Remaining risk and next action

Do not spend the final call retrying unchanged acceptance evidence. Obtain scope
approval for the evidence-handoff/citation, redaction-finding semantics and non-Git
baseline improvements, with regression tests that retain real security safeguards.
Any further live verification must account for the one unused call or receive a
new explicitly bounded allowance. Do not claim full Guided Harness, production
acceptance, real-process Stop/Resume or forced-crash coverage from this test.

No new architecture/security decision was accepted in this continuation. The
unresolved evidence contract is recorded in OPEN_QUESTIONS; DECISIONS is unchanged.
Raw provider output, credentials, app data and fixture artifacts stay out of Git.

## Changed-file inventory and Git report

This continuation modifies only:

- `.agent/PLANS.md`
- `.agent/memory/PROJECT_STATE.md`
- `.agent/memory/OPEN_QUESTIONS.md`
- `.agent/memory/worklog/2026-10-25-generic-project-readiness-fix.md`
- `.agent/memory/worklog/2026-10-25-real-provider-retry-after-login.md` (new)

All other previous pending changes are preserved. Tree now has 28 pending files,
still on main. No staging, commit, push, PR, tag or release. No installed-app update.
The earlier proposed implementation commit and combined memory commit remain
unapproved; add this worklog to the documented memory inventory. For a separate
future checkpoint the proposed message is
`docs(memory): record real-provider retry and acceptance blockers`, with only the
five files above and explicit review of overlapping earlier memory changes.
