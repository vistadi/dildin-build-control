# DBC Design And Usability Audit

Date: 2026-07-05
Scope: Dildin Build Control desktop/web preview, primary operator flow.
Evidence folder: `docs/design-audit/`

## Captured Screens

1. `01-control-tower.png` - Control Tower dashboard.
2. `02-tasks.png` - Tasks and Smoke Loop.
3. `03-preflight.png` - Loop Preflight.
4. `04-loops.png` - Harness Runs and loop monitoring.
5. `05-approvals.png` - Approval Queue and Harness Approval Gates.
6. `06-reports.png` - Reports and Evidence Packs.
7. `07-settings.png` - Settings, provider routing, project contract actions.

## User Goal

The user should be able to start from a TZ/spec, create a task, run the DBC methodology safely, approve risky gates, inspect evidence, and decide Accept/Rework/Reject without understanding internal implementation terms first.

## Overall Decision

The product direction is strong, but the current UI feels like an engineering console with inconsistent action scale. The main usability issue is not the palette or sidebar; it is action hierarchy. Several ordinary commands look like large cards, while some important workflow states look like passive diagnostics. This makes the app harder to operate than the methodology itself needs to be.

## Strengths

1. The left navigation is stable and easy to scan.
2. The product has a consistent restrained palette: dark sidebar, white panels, teal primary actions, muted status surfaces.
3. The panel/card system is already suitable for a local-first engineering control tower.
4. Status pills are understandable at a glance when they are short: Ok, Warning, Missing, Ready.
5. The Control Tower screen has the best balance of density, hierarchy, and operational clarity.

## Critical UX Risks

### 1. Smoke Loop buttons look like cards, not controls

Evidence: `02-tasks.png`

The buttons `Prepare smoke task`, `Run smoke loop`, and `Controlled smoke` are too tall, too bold, and wrap into stacked text. They visually compete with the panel title and input. The user sees three large blocks but cannot tell which is primary, secondary, or diagnostic.

Recommendation:
- Make this row an action toolbar, not a form grid.
- Keep buttons single-line where possible.
- Use one primary action only: `Run smoke loop`.
- Make `Prepare smoke task` and `Controlled smoke` secondary/tertiary.
- Move the safe micro-task input above the actions or let it span the row.

### 2. Settings repeats the same action hierarchy problem

Evidence: `07-settings.png`

In Project Contract, buttons like `Sync .dbc config`, `Load .dbc config`, `Apply real micro`, and `Apply mock` become tall square tiles. These are command buttons, not feature cards. `Apply real micro` is also a risky mode switch but does not visually communicate enough caution.

Recommendation:
- Convert Project Contract to a compact action bar.
- Use `Sync .dbc config` as primary.
- Use `Load` and `Apply mock` as secondary.
- Use `Apply real micro` as a guarded/warning action with a separate confirmation or warning treatment.

### 3. The main user journey is hidden behind internal vocabulary

Evidence: `02-tasks.png`, `04-loops.png`, `05-approvals.png`

DBC exposes terms like HarnessRun, TaskContract, WorkSlice, approval gates, compatibility loop, run journal. These are correct architecturally, but the first-time operator needs a simpler path: "Describe task", "Run safely", "Review evidence", "Accept or send to rework".

Recommendation:
- Keep internal terms visible as secondary metadata.
- Add plain workflow labels to main screens:
  - Tasks: "1. Describe the task"
  - Loops: "2. Run and monitor"
  - Approvals: "3. Approve blocked actions"
  - Reports: "4. Decide from evidence"

### 4. Empty and browser-preview states look like system failure

Evidence: `04-loops.png`, `05-approvals.png`

Screens frequently show `browser preview`, `0`, `missing`, or empty Harness Runs. This is technically accurate but does not tell the user what to do next. It reads like a broken backend even when it is just preview mode.

Recommendation:
- Replace raw `browser preview` with a clearer state: `Preview mode - desktop backend required`.
- Add one next action per empty state.
- In Loops, show a guided empty state: `Start from Tasks -> Start safe run`.
- In Approvals, show: `No approval gates yet. Start a safe run to generate gates.`

### 5. Action density is inconsistent across screens

Evidence: `01-control-tower.png`, `02-tasks.png`, `07-settings.png`

Control Tower actions feel reasonable. Tasks and Settings feel heavier. This inconsistency makes the product look less mature even though the underlying system is coherent.

Recommendation:
- Define action sizes:
  - Header actions: 38-40px height.
  - Panel toolbar actions: 34-36px height.
  - Primary workflow CTA: 40px max, single line.
  - Large buttons only for rare first-run/onboarding cards.

## Major Design Issues

### 6. Form layout mixes input fields and buttons in the same grid

Evidence: `02-tasks.png`, `07-settings.png`

The CSS `.provider-form` uses `grid-template-columns: repeat(4, minmax(0, 1fr)) auto;`. When a label/input and buttons share that layout, buttons inherit a card-like footprint.

Recommendation:
- Split forms into `.form-row` and `.action-toolbar`.
- Let long inputs span available width.
- Keep actions in a flex row with wrapping and compact sizing.

### 7. The primary action is sometimes globally visible but locally ambiguous

Evidence: all screens

`Start provider loop` is always in the topbar, while local actions like `Start safe run`, `Run smoke loop`, `Run loop`, `Evidence Pack`, and `Approve` appear inside panels. It is not always clear whether the topbar action or local action is the correct next step.

Recommendation:
- Keep topbar action only for global/default demo loop.
- Rename it or de-emphasize it on task-specific screens.
- On Tasks, make `Start safe run` the dominant CTA.

### 8. Status cards are readable but repetitive

Evidence: `02-tasks.png`, `05-approvals.png`

Repeated audit rows with pale backgrounds work, but many rows have the same visual weight. The eye does not land on blockers or next actions quickly enough.

Recommendation:
- Give blocker rows a stronger left border or icon.
- Keep Ok rows quieter.
- Group warnings at top when they affect launch readiness.

### 9. Reports screen needs a clearer decision area

Evidence: `06-reports.png`

Reports contains evidence text, but the product goal is evidence-backed acceptance. The final decision area should be more prominent than raw report text.

Recommendation:
- Add a top decision strip: `Evidence status`, `Open risks`, `Final decision`.
- Make Accept/Rework/Reject available only when evidence exists.
- Show missing evidence as checklist items.

## Accessibility Risks

1. Large wrapped buttons may have poor accessible names and confusing reading rhythm.
2. Some status is communicated mainly by color: green/amber/red pills need explicit text, which exists, but the visual grouping can still be improved.
3. Focus states are not visible in the captured screenshots; keyboard testing is still required.
4. Icon-only signals in buttons are secondary, but labels exist. Keep labels.
5. Repeated text like `Control Tower` and identical button classes can make automated targeting and assistive navigation less clear unless semantic labels are explicit.
6. Dense screens need zoom/reflow testing at 125%, 150%, and narrow window widths.

## Recommended Fix Order

### Pass 1: Button and action layout polish

1. Add a reusable `.action-toolbar` class.
2. Add compact button variants: `.btn-sm`, `.btn-secondary`, `.btn-warning`.
3. Update Smoke Loop action row so buttons are single-line and visually ranked.
4. Update Settings Project Contract action row with the same pattern.
5. Ensure buttons do not grow into card-like blocks when labels wrap.

### Pass 2: Guided workflow language

1. Add plain step labels to the main methodology path.
2. Rename or annotate `Start provider loop` so it does not compete with `Start safe run`.
3. Improve empty states in Loops and Approvals.
4. Replace raw `browser preview` labels with helpful preview-mode explanations.

### Pass 3: Evidence and approvals clarity

1. Make approval phase groups more visible: Spec, Plan, Slice, Command, Real Provider, Evidence.
2. Add a stronger final decision strip in Reports.
3. Make warnings and blockers sort above Ok rows.

## Suggested Button System

Use this hierarchy:

- Primary: one per local panel, teal background, single-line label.
- Secondary: white background, border, normal weight.
- Tertiary: text or subtle ghost button for refresh/load/non-critical actions.
- Warning: amber-tinted for real provider or risky mode switches.
- Danger: red-tinted only for destructive/reject actions.

Recommended sizing:

- Default button height: 38px.
- Compact panel toolbar button height: 34px.
- Minimum icon button size: 36px.
- Max border radius: 6px, matching current system.
- Font weight: 650-700, not 800+, except status pills.

## Evidence Limits

This audit is based on screenshots and visible UI behavior in browser preview. It does not prove full accessibility compliance, keyboard navigation quality, screen reader output, backend desktop runtime behavior, or responsive behavior below 1280px width. Those should be tested separately.

## Step Health Summary

1. Control Tower - healthy foundation; good hierarchy, moderate density.
2. Tasks - needs action hierarchy fix; Smoke Loop buttons are the most visible issue.
3. Preflight - structurally useful; needs clearer next action and blocker/warning priority.
4. Loops - conceptually correct; empty/preview states need guidance.
5. Approvals - important screen; phase grouping and next action need stronger treatment.
6. Reports - useful evidence surface; final decision should be more prominent.
7. Settings - powerful but dense; Project Contract buttons repeat the tile-button issue.
