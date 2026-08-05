# DBC product audit

Date: 2026-08-05
Surface: installed Dildin Build Control `0.1.1` desktop application
Mode: combined UX and screenshot-based accessibility audit

## User goal

Understand one bounded task, run it safely, see trustworthy evidence, and make a human
accept/rework/reject decision without learning DBC's internal architecture first.

## Captured steps

1. `01-start.png` — Run entry state. Health: needs improvement.
2. `02-demo-filled.png` — demo task populated. Health: usable but internally inconsistent.
3. `03-evidence-empty.png` — blocked Evidence state. Health: trust-breaking.
4. `04-settings.png` — setup and provider configuration. Health: functional but overloaded.
5. `05-approvals.png` — approval queue. Health: powerful but contradictory and too technical.

## Strengths

- The primary navigation is compact and the visual hierarchy is consistent.
- The Run screen explains the intended lifecycle and keeps destructive actions disabled.
- Form fields and buttons expose useful accessibility labels in the macOS accessibility tree.
- Evidence and approval concepts are visible instead of hidden in logs.
- Risk, pending, blocked, and successful states have consistent visual treatments.

## Highest-impact findings

### P0 — Use one current task/run as the source of truth

The Evidence screen says no HarnessRun or EvidencePack exists while also showing a
stale controlled-smoke task, old failed loop evidence, and `$3.74` estimated cost. The
Approvals screen similarly mixes current harness state, real-micro setup gates, policy
templates, and a legacy approved Git action.

Recommendation: require an explicit current task/run selection and scope every status,
cost, approval, report, and CTA to it. Put history and system-level setup gates in
separate views.

### P0 — Make readiness states logically consistent

Approvals is labelled `Ready` while three required approvals remain pending. Settings
says providers are ready, reports `Real providers 0`, and routes named real CLIs in mock
mode. These states are technically explainable but not understandable at a glance.

Recommendation: define one state model across the app: `Not configured`, `Safe mock
ready`, `Real run requires approval`, `Running`, `Evidence ready`, and `Decision
finalized`. Every screen should show the same current state and one next action.

### P0 — Shorten the first successful run

The task form is dense, the primary start button sits below the initial viewport, the
progress summary says `0/9` while the stepper shows six steps, and the bounded-scope
panel still says `No active task` after the demo fields are populated.

Recommendation: show a three-stage first-run path: `Describe`, `Run checks`, `Decide`.
Preview the parsed scope immediately, place the primary CTA above the fold, and move
advanced criteria/path editing behind an expandable section.

### P1 — Split Settings into setup and expert configuration

One page contains quick setup, project contract, routing, presets, provider creation,
sessions, raw command contracts, policy classification, audit history, and cost events.

Recommendation: keep a short Setup page with project, mode, provider readiness, and a
single validation button. Move routing, CLI contracts, policies, diagnostics, and audit
history into Advanced.

### P1 — Turn approvals into decisions, not artifact diagnostics

The queue leads with internal IDs such as `REAL-MICRO-HUMAN-GATE` and file paths. The
dependency between the three required approvals is described in text rather than shown
as an ordered sequence.

Recommendation: show `What will happen`, `Why approval is required`, `Scope/cost`, and
one available action. Display dependent approvals as a short ordered checklist and hide
informational templates by default.

### P1 — Replace the raw acceptance textarea with a report viewer

The final report is a long editable-looking textarea containing implementation paths and
Markdown. It is difficult to scan and suggests that evidence can be edited in place.

Recommendation: render a read-only summary with verdict, scope diff, checks, risks,
cost, and artifact links. Offer `View raw JSON/Markdown`, `Copy`, and `Export` as
secondary actions.

### P1 — Complete distribution trust

The installed build is ad-hoc signed and not notarized. This undermines the product's
evidence-and-trust positioning before the user reaches the first screen.

Recommendation: Developer ID signing, notarization, stapled tickets, verified update
artifacts, and an in-app version/update surface.

### P2 — Improve language and accessibility polish

The UI mixes plain English with internal terms such as TZ, Harness, WorkSlice, provider
contract, and real micro. Small grey explanatory text and pale status colors may be hard
to read, while some disabled buttons still look like colored actions.

Recommendation: add a RU/EN language choice or use one consistent language, introduce
plain-language labels with optional technical details, increase secondary-text contrast,
and make disabled states unmistakable. Run keyboard, focus-order, zoom, VoiceOver, and
contrast tests; screenshots alone cannot establish WCAG compliance.

## Recommended sequence

1. Fix task/run context isolation and contradictory state calculations.
2. Compress onboarding and make the primary CTA visible immediately.
3. Rebuild Evidence as a trustworthy read-only decision surface.
4. Simplify Settings and Approvals around one next action.
5. Add signed/notarized distribution and update checks.
6. Finish localization and accessibility verification.

## Evidence limits

- The audit used screenshots and the macOS accessibility tree from the installed app.
- No real provider run or destructive/approval action was triggered.
- Keyboard navigation, VoiceOver announcements, zoom/reflow, performance, error
  recovery, and real provider behavior require separate hands-on testing.
