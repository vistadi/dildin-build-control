# 2026-08-31 — Dibi Workshop UI redesign

## Task objective

Implement the user-selected visual direction 2 for DBC, replace the generic product
identity with the Dibi border-collie mascot, improve the primary Run UX, keep all safety
contracts intact, verify the result, and prepare the work for Git without committing or
pushing.

## Approved scope

- Keep DBC as the product name and use Dibi as the mascot.
- Match the selected light Dibi Workshop concept.
- Update the primary Run screen, responsive behavior, RU/EN copy, system icon, relevant
  product documentation, screenshots, and project memory.
- Preserve Run, Approvals, Evidence, Settings, TaskContract, HarnessRun, ToolPolicy,
  provider, MCP, and EvidencePack behavior.
- Build and verify a local macOS bundle, but do not install it into `/Applications`,
  commit, push, publish, or deploy.

## Initial repository state

- Branch: `main`.
- HEAD: `546ede4`.
- Remote `origin/main` matched HEAD at the start of this task.
- Working tree was not clean: 23 tracked files were already modified and 19 files were
  untracked from the prior Phase 0–6 Kimi/Qwen/MCP/routing/Evidence v2 work.
- The existing UI used a flat gray/teal system, a text-only DBC sidebar mark, and a
  generic card-heavy Guided Run.
- The installed desktop application and published release were older than the current
  working tree; this task did not overwrite the installed application or publish a
  release.

## Plan

1. Re-verify the current build, native tests, provider/MCP contracts, and Git state.
2. Create three grounded visual directions and get the product-owner selection.
3. Build the selected Dibi Workshop direction using real raster assets and the existing
   icon/component system.
4. Verify desktop, tablet, mobile, localization, interaction, accessibility, console,
   build, native, smoke, and performance behavior.
5. Regenerate the desktop icon set, build a local app/DMG, update durable project memory,
   and prepare Git commit groups without committing or pushing.

## Work completed

- Created three independent visual concepts and implemented selected option 2.
- Added `assets/brand/dibi-mark.png`, a transparent Dibi sidebar mark.
- Added `assets/brand/dibi-workshop.png`, a real onboarding illustration containing the
  mascot, blueprint, tools, plant, and coral toolbox.
- Replaced the old desktop icon source with a midnight Dibi icon and regenerated all
  Tauri desktop/mobile icon outputs.
- Reworked the global palette around midnight, cream, cyan, violet, coral, and lime
  semantic tokens while preserving existing component class contracts.
- Rebuilt Guided Run around a protected-run summary, three localized stages, larger task
  composer, visible safety principles, scoped preview, and preserved EvidencePack
  decision flow.
- Completed English/Russian copy for the full Guided Run path.
- Added responsive desktop, tablet, and mobile treatments. Mobile navigation uses five
  visible icon targets with accessible names instead of clipped long labels.
- Kept the existing Lucide dependency for standard controls to avoid a second icon
  family; no custom SVG or CSS illustration substitutes were added.
- Exercised `Load demo` and `Start safe run` in browser-safe mode. The run created a
  scoped browser HarnessRun without touching project files, providers, or credentials.
- Updated the Guided Run screenshot, README instructions, positioning, Russian quick
  guide, QA report, active plan, project state, decisions, and open questions.
- Updated the Guided Run smoke assertion to validate the new localized
  Describe/Guardrails/Evidence stage labels.

## Files created and modified by this task

- Created: `assets/brand/dibi-mark.png`.
- Created: `assets/brand/dibi-workshop.png`.
- Created: `design-qa.md`.
- Created: `.agent/memory/worklog/2026-08-31-dibi-workshop-ui-redesign.md`.
- Modified: `src/App.tsx`.
- Modified: `src/styles.css`.
- Modified: `scripts/guided-run-smoke.mjs`.
- Modified: `assets/app-icon-source.png`.
- Modified: generated Tauri icons under `src-tauri/icons/`, including PNG, ICNS, ICO,
  Android, iOS, Store, and Windows tile variants.
- Modified: `docs/screenshots-guide/02-guided-run.png`.
- Modified: `README.md`.
- Modified: `docs/POSITIONING.md`.
- Modified: `docs/DBC_USER_GUIDE_RU.md`.
- Modified: `.agent/PLANS.md`.
- Modified: `.agent/memory/PROJECT_STATE.md`.
- Modified: `.agent/memory/DECISIONS.md`.
- Modified: `.agent/memory/OPEN_QUESTIONS.md`.

Other modified and untracked Phase 0–6 files existed before this task and were
preserved.

## Commands and checks executed

- `pnpm build`: passed; 1,592 modules transformed.
- Frontend output: 424,696 B JS / 115,868 B gzip; 40,806 B CSS / 8,194 B gzip.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 36 passed, 0 failed.
- Provider adapter contract smoke: passed, 2 adapters, 4 legacy routes, 2 stream
  fixtures.
- MCP policy contract smoke: 20 assertions passed.
- MCP stdio proxy smoke: passed discovery, approval, idempotency, evidence, and
  exfiltration guards.
- API adapter contract smoke: passed catalog, keychain-reference, request-shape, usage,
  and structured-report checks.
- UI quality smoke: 10 assertions passed.
- Native contract smoke: 11 assertions passed.
- Performance budget: passed.
- Guided Run smoke initially reported 27 passed and 1 failed because the assertion
  still expected the superseded `Run checks` and `Decide` labels. The assertion was
  updated to the selected localized stage contract; rerun result: 28 passed, 0 failed.
- `git diff --check`: passed.
- Browser console on the final clean tab: no warnings or errors.
- Visual comparison: selected concept and implementation combined at 1487×1058;
  `design-qa.md` records the closed P2 findings and final `passed` result.
- Responsive checks: 1487×1058 desktop, 1024×768 tablet, 430×932 mobile; no horizontal
  overflow.
- `pnpm tauri icon assets/app-icon-source.png`: regenerated the complete icon set.
- `pnpm tauri build --bundles app,dmg`: initial sandboxed DMG step could not run the
  system bundler; approved system execution completed both `.app` and DMG successfully.
- `hdiutil verify`: DMG valid.
- DMG size: 10,188,565 bytes.
- DMG SHA-256: `ca2e773ee52e7970ecb3e75533d99ca674e7d26b9dc82282e4318bb4b61f5315`.
- Bundle architecture: arm64.
- Code signature: ad-hoc/linker-signed; no TeamIdentifier.

## Validation results

- The selected visual structure, palette, mascot imagery, protected-run hierarchy, and
  three-stage workbench are present in the real application.
- Existing safe validation remains: Start safe run is disabled until title and request
  are present.
- The main safe-preview path works with realistic demo data.
- All automated checks pass after the smoke contract was updated.
- A new local Dibi-branded arm64 `.app` and verified DMG exist under
  `src-tauri/target/release/bundle/`.
- No commit, push, release upload, deployment, or `/Applications` installation was
  performed.

## Important discoveries and decisions

- The prior open design-partner assumption conflicted with the product owner's chosen
  first segment. It is now resolved in favor of solo AI developers.
- Dibi is the accepted mascot and Dibi Workshop is the accepted product visual language.
- The 2026-08-31 local package is still not suitable for public trust claims because it
  is arm64-only and ad-hoc signed.
- Large frontend decomposition remains important; the redesign intentionally avoided a
  risky broad refactor of the already large `App.tsx`.

## Unresolved risks

- The full working tree combines this task with substantial prior uncommitted Phase 0–6
  work; staging must use explicit file groups.
- Kimi and Qwen installed CLI fixtures remain unavailable on this Mac.
- Remote OAuth MCP conformance remains unverified.
- Advanced screens still need complete RU/EN coverage and an independent WCAG 2.2 AA
  audit.
- A universal signed/notarized release requires Apple credentials and clean-machine
  verification.

## Manual verification steps

1. Run `pnpm dev` or `pnpm tauri dev`.
2. Open `Run` / `Запуск` and confirm the Dibi Workshop interface.
3. Switch EN/RU and confirm the full Guided Run copy changes without overflow.
4. Click `Load demo`, confirm both required fields and the scope preview, then click
   `Start safe run`.
5. Advance checks, generate the EvidencePack, and verify Accept remains blocked until
   every required proof and approval exists.
6. Inspect the local app/DMG icon at 32 px and in Finder before any release upload.

## Recommended next action

Review the complete diff and approve the proposed logical commit groups. After commits,
approve a separate push if the GitHub repository should be updated. Do not publish the
current DMG as signed, notarized, or universal.

## Follow-up completion on 2026-08-31

- The product owner approved the proposed Git checkpoints and changed the release
  language scope to English only.
- Runtime RU copy, the language toggle, and the `uiLanguage` state contract were
  removed. Legacy browser-local locale state is ignored during migration.
- Desktop and mobile browser checks confirmed `lang=en`, no Cyrillic runtime copy, no
  language toggle, and no horizontal overflow.
- The integration checkpoint was committed as `9950833` with message
  `feat(integrations): add Kimi Qwen MCP routing and EvidencePack v2`.
- The visual checkpoint was committed as `1b2cfa2` with message
  `feat(ui): introduce Dibi Workshop brand and English-only Guided Run`.
- A replacement arm64 app and DMG were built. The DMG is 10,185,774 bytes, passed
  `hdiutil verify`, and has SHA-256
  `4e13bf48234381258e668081e08e348591a37c4ac1976c6bbb0faf6b74e51d5a`.
- No push, release upload, deployment, or `/Applications` installation was performed.
