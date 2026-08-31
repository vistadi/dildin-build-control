# 2026-08-31 — English-only UI and Git checkpoints

## Task objective

Apply the product-owner decision to keep only the English DBC interface, rebuild and
verify the desktop artifacts, and create the three previously approved logical Git
checkpoints without pushing.

## Approved scope

- Remove RU runtime copy, the language toggle, and locale-dependent UI behavior.
- Preserve internal Russian plans and historical worklogs as documentation.
- Re-run frontend, integration, native, responsive, and packaging verification.
- Commit integrations, visual implementation, and project memory separately.
- Do not push, publish, deploy, or install the new app into `/Applications`.

## Initial repository state

- Branch: `main`.
- HEAD: `546ede4`.
- The working tree already contained the uncommitted Phase 0–6 integration work and
  Dibi Workshop redesign recorded in their earlier worklogs.
- No files were staged when this follow-up began.

## Work completed

- Removed all Russian runtime branches from `src/App.tsx` and deleted the language
  switch control.
- Removed `uiLanguage` from the active application contract and discarded the legacy
  stored field during state migration.
- Removed obsolete language-toggle CSS and updated UI smoke contracts for fixed
  English behavior.
- Updated current product documentation, design QA, project state, plans, and the
  decision register. Russian internal documents remain available but do not represent
  a second application locale.
- Replaced the durable Guided Run screenshot with the final English-only screen.
- Created integration commit `9950833` and UI commit `1b2cfa2` after validating each
  staged tree independently.

## Files created and modified by this follow-up

- Modified: `src/App.tsx`, `src/types.ts`, `src/data.ts`, `src/storage.ts`,
  `src/styles.css`.
- Modified: `scripts/guided-run-smoke.mjs`, `scripts/ui-quality-smoke.mjs`.
- Modified: `README.md`, `CHANGELOG.md`, `design-qa.md`,
  `docs/DBC_USER_GUIDE_RU.md`, `docs/screenshots-guide/02-guided-run.png`.
- Modified: `.agent/PLANS.md`, `.agent/memory/PROJECT_STATE.md`,
  `.agent/memory/DECISIONS.md`.
- Created: this worklog.

## Commands and checks executed

- Production TypeScript/Vite build: passed.
- UI quality smoke: 11 assertions passed.
- Guided Run smoke: 28 passed, 0 failed.
- Provider adapter, API adapter, MCP policy, MCP proxy, native contract, and performance
  checks: passed.
- Rust tests: 36 passed, 0 failed.
- Browser QA at 1280×720 and 430×932: `lang=en`, no Cyrillic runtime copy, no language
  toggle, and no horizontal overflow.
- Integration staged-tree build: passed; its isolated Rust suite passed 36/36.
- UI staged-tree build, UI quality, Guided Run, and performance checks: passed.
- Final DMG: 10,185,774 bytes; `hdiutil verify` valid; SHA-256
  `4e13bf48234381258e668081e08e348591a37c4ac1976c6bbb0faf6b74e51d5a`.
- Final app architecture: arm64; signature remains ad-hoc/linker-signed with no Team ID.
- `git diff --check` and staged diff checks: passed before each commit.

## Decisions made

- The runtime product interface is English only.
- Internal Russian planning material may remain in the repository because it does not
  create or advertise a second shipped locale.
- A future locale must be reintroduced only as a complete translation and QA scope.

## Unresolved risks

- Kimi/Qwen installed CLI fixtures and remote OAuth MCP conformance are still external
  validation gaps.
- The package is arm64-only, ad-hoc signed, and not notarized.
- `App.tsx` remains large and should be decomposed before more major UI expansion.

## Manual verification steps

1. Open Run and confirm every visible control is English.
2. Confirm there is no language switch in the top bar.
3. Use Load demo and Start safe run, then complete checks and EvidencePack generation.
4. Verify the DMG on a clean Apple Silicon Mac before any public distribution.

## Recommended next action

Review the three local commits, then approve a separate push if GitHub should be
updated. Configure Apple signing/notarization credentials before calling the DMG a
trusted public release.
