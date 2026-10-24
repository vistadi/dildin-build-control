# Stop, Resume and Retry

Native loops persist their lifecycle in SQLite. Browser preview remains in-memory
and does not run processes or persist native evidence.

- **Stop loop** records `stopping`, cancels owned execution and waits for the loop
  operation (including evidence persistence) to settle before reporting `stopped`.
  If confirmation times out or fails, use **Confirm stop**; Resume/Retry stay disabled.
- **Resume** continues a queued step or finalizes already completed work. It never
  silently repeats a failed/interrupted attempt or clears a pending approval.
- **Retry step** explicitly starts another attempt after a confirmation warning.
  Inspect partial evidence, workspace changes and external processes first: retrying
  can repeat side effects. Attempts remain bounded and previous evidence is archived
  under the corresponding artifact/evidence directory's `attempts/attempt-N/` folder.
- An unfinished run becomes **interrupted** after application restart. It does not
  start automatically. Open it from Loop Console history, inspect its state, then
  explicitly retry if safe. Previously settled stops remain stopped.
- Pending step approvals are restored when a run is opened; resolve them in Approvals.
  Neither Resume nor Retry grants permission or resets the attempt budget.

## Boundaries

Stop is not rollback or an OS sandbox. Normal Stop covers owned Unix process groups;
detached/escaped descendants and non-Unix descendants are outside that guarantee.
After an application crash, surviving external processes cannot be certified stopped;
inspect them before retrying. Earlier completed local commands within an interrupted
multi-command step may run again on Retry.

This version uses an exclusive runtime lease to prevent two cooperating DBC instances
from sharing the same runtime database. Close older DBC versions before using this
build; older versions do not honor the lease. Do not downgrade against an active loop:
older builds do not understand `stopping`, `interrupted` or `executing` semantics.

## Verification

Automated Rust fixtures cover persistent transitions, real local-process cancellation,
partial evidence, reopened SQLite, attempt/approval guards, runtime lease and archived
evidence. `pnpm loop-lifecycle-smoke` runs frontend continuation/recovery scenarios.
`tests/loop-lifecycle.html` is an interactive browser-only fixture for actual controls.
Packaged native-window IPC/restart QA and real-provider fixtures are separate checks.
