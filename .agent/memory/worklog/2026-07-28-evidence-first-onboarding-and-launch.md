# Evidence-first onboarding and launch pass

Date: 2026-07-28

## Task objective

Improve DBC's first-run product experience and prepare a credible promotion and
distribution plan after the user requested that all recommended improvements be made.

## Approved scope

- Product positioning and launch materials.
- Guided Run onboarding and EvidencePack decision flow.
- Safe browser preview.
- CI evidence verification.
- macOS signing readiness and Homebrew generation.
- Documentation, screenshots, and project memory.

No commit, push, release publication, credential configuration, or external outreach was
authorized.

## Initial repository state

- Branch: `main`.
- Working tree: clean and tracking `origin/main`.
- No existing `.agent` project-memory directory.
- DBC already had a Tauri/React/Rust application, Guided Run, harness primitives,
  release workflow, and launch notes.

## Plan

1. Simplify first-run navigation and onboarding.
2. Make the browser preview complete and honest.
3. Center the acceptance experience on EvidencePack.
4. Add positioning, demo, and go-to-market assets.
5. Prepare signing, Homebrew, CI verification, and validate the result.

## Work completed

- Made Run the default view and grouped specialist screens under Advanced.
- Reworked Guided Run into one task-to-decision path with a demo-task helper.
- Added an in-memory browser harness lifecycle with deterministic artifacts and no side
  effects.
- Prevented repeated final decisions and clarified missing evidence gates.
- Removed misleading preview approvals and costs.
- Added `dbc:verify` and integrated controlled evidence verification into CI and release.
- Fixed Git status path parsing in controlled smoke.
- Scoped approval checks to the current loop/task instead of unrelated ledger entries.
- Added a Homebrew Cask generator that rejects placeholder checksums.
- Added signing, positioning, demo, and 30-day promotion guides.
- Updated launch posts, roadmap, README, changelog, and screenshots.

## Files created

- `.agent/PLANS.md`
- `.agent/memory/PROJECT_STATE.md`
- `.agent/memory/DECISIONS.md`
- `.agent/memory/OPEN_QUESTIONS.md`
- `.agent/memory/worklog/2026-07-28-evidence-first-onboarding-and-launch.md`
- `docs/DEMO_SCRIPT.md`
- `docs/GTM_30_DAY_PLAN.md`
- `docs/POSITIONING.md`
- `docs/RELEASE_SIGNING.md`
- `scripts/dbc-verify.mjs`
- `scripts/generate-homebrew-cask.mjs`

## Files modified

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `CHANGELOG.md`
- `README.md`
- `docs/LAUNCH_POSTS.md`
- `docs/ROADMAP.md`
- `docs/screenshots-guide/02-guided-run.png`
- `docs/screenshots-guide/03-reports-checklist.png`
- `package.json`
- `scripts/controlled-smoke.mjs`
- `scripts/evidence-summary.mjs`
- `scripts/guided-run-smoke.mjs`
- `src/App.tsx`
- `src/data.ts`
- `src/styles.css`
- `src/tauriBridge.ts`

## Commands and checks executed

- `pnpm build`
- `pnpm guided-run-smoke`
- `pnpm controlled-smoke`
- `pnpm dbc:verify -- --latest --allow-existing-worktree-changes`
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- Homebrew generator with valid-format sample SHA-256 values.
- Homebrew generator with invalid placeholders to confirm rejection.
- Browser lifecycle QA from reset through accepted EvidencePack.
- Responsive browser QA at 820×900.

## Validation results

- Frontend production build: passed.
- Guided Run smoke: 22 passed, 0 failed.
- Controlled smoke: completed with seven step-evidence records.
- Evidence verifier: passed with the explicit existing-worktree scope waiver; CI remains
  strict.
- Rust formatting: passed.
- Rust tests: 24 passed, 0 failed.
- Homebrew generator: valid input passed; placeholders failed as intended.
- Visual QA: desktop and narrow layouts remained usable.

## Important discoveries

- Browser bridge calls previously prevented completion outside Tauri.
- Controlled smoke trimmed Git status before slicing its status prefix, corrupting file
  paths used by scope evidence.
- The evidence summary counted unrelated pending approvals from a global ledger.
- Apple credentials are not available in the repository, so signing readiness can be
  implemented but signed artifacts cannot be claimed.

## Decisions made

See `.agent/memory/DECISIONS.md` for positioning, navigation, safe preview, and signing
claim decisions.

## Unresolved risks

- Signing/notarization remains unverified until credentials and published artifacts exist.
- The browser preview is not a substitute for a native Tauri acceptance run.
- Promotion still requires real design partners and proof stories.
- Opt-in telemetry requires a separate privacy/product decision.

## Manual verification steps

1. Run `pnpm dev` and complete Load demo task → Create and start → Advance checks →
   Generate proof package → Accept.
2. Open Evidence and confirm the finalized decision and seven evidence references.
3. For a release candidate, follow `docs/RELEASE_SIGNING.md` on both architectures.

## Recommended next action

Review the diff, approve the proposed commits, then configure Apple release credentials
and recruit the first design partners using `docs/GTM_30_DAY_PLAN.md`.
