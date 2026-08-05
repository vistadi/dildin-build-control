# Desktop product audit

Date: 2026-08-05

## Task objective

Assess what should be improved in the current DBC desktop program using the installed
application rather than relying only on code or previous screenshots.

## Approved scope

- Read-only inspection of the installed desktop interface.
- Capture the Run, demo-filled, Evidence, Settings, and Approvals states.
- Report UX, trust, and screenshot-visible accessibility risks.

No implementation, real provider execution, approval decision, or destructive action
was authorized.

## Initial repository state

- Branch: `main`, synchronized with `origin/main` at commit `6304053`.
- Existing uncommitted memory changes from the local build/install task were preserved.
- Installed application: DBC `0.1.1` at `/Applications/Dildin Build Control.app`.

## Work completed

- Opened the installed Tauri application with macOS Computer Use.
- Inspected accessibility labels and visible hierarchy.
- Loaded the demo form without starting a native Harness run.
- Inspected Evidence, Settings, and Approvals without changing approvals or providers.
- Saved five current-run screenshots and a detailed audit report under
  `.agent/audits/2026-08-05-program-improvements/`.

## Important discoveries

- Evidence mixes an empty current Harness state with a stale controlled-smoke task,
  failed loop evidence, and unrelated `$3.74` estimated cost.
- Approvals reports `Ready` while three required real-micro approvals are pending and
  also shows legacy/informational records.
- Settings reports provider readiness in a way that conflates detected CLI tools, mock
  routing, and real-provider enablement.
- Run displays nine readiness checks but six lifecycle steps, keeps the primary CTA
  below the initial viewport, and does not preview bounded scope from populated fields.
- The accessibility tree exposes useful labels, but contrast, focus, keyboard, zoom,
  and VoiceOver behavior still require dedicated testing.

## Files created or modified

- `.agent/audits/2026-08-05-program-improvements/01-start.png`
- `.agent/audits/2026-08-05-program-improvements/02-demo-filled.png`
- `.agent/audits/2026-08-05-program-improvements/03-evidence-empty.png`
- `.agent/audits/2026-08-05-program-improvements/04-settings.png`
- `.agent/audits/2026-08-05-program-improvements/05-approvals.png`
- `.agent/audits/2026-08-05-program-improvements/audit.md`
- `.agent/memory/PROJECT_STATE.md`
- `.agent/memory/worklog/2026-08-05-desktop-product-audit.md`

## Validation performed

- Every saved screenshot was reopened and visually inspected.
- Findings were cross-checked against the macOS accessibility tree for the same state.
- No real run, provider call, approval, or external publication occurred.

## Recommended next action

Fix context isolation and the shared readiness state model before investing in further
visual polish or promotion.
