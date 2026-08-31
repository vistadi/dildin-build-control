# DBC Active Plans

## Evidence-first alpha activation

Status: completed, committed, and pushed to `main`.

- Make Run the default, low-friction path.
- Keep provider, policy, and recovery tools under Advanced.
- Let evaluators complete a deterministic browser lifecycle without side effects.
- Make EvidencePack and the human acceptance decision the visible outcome.
- Enforce evidence completeness in CI and release workflows.
- Prepare, but do not claim, signed and notarized macOS distribution.
- Use the 30-day go-to-market plan to recruit design partners and publish proof stories.

Next checkpoint: configure Apple credentials, produce a signed release candidate, and
verify both architectures before publishing Homebrew installation instructions.

## Dibi Workshop brand and Guided Run redesign

Status: implemented, locally verified, and committed on 2026-08-31; changes have not
been pushed.

- Keep DBC as the product name and use Dibi, a border collie, as the recognizable
  product mascot.
- Apply the selected light Dibi Workshop direction to the primary Run flow without
  weakening TaskContract, approval, provider, MCP, or EvidencePack safeguards.
- Use midnight navigation with cyan, violet, coral, lime, cream, and light-neutral
  product tokens.
- Add real raster assets for the sidebar mark, onboarding illustration, and desktop
  system icon; regenerate the full Tauri icon set.
- Keep the product interface English-only and verify desktop, tablet, mobile, keyboard,
  console, build, native, smoke, and performance behavior.

Completed checkpoints: selected visual matched at 1487×1058, side-by-side design QA
passed, the browser-safe demo lifecycle was exercised, the Guided Run screenshot was
updated, the runtime was reduced to one complete English interface, all automated checks
passed, and a verified local arm64 `.app` and DMG were built with the Dibi icon. The
implementation is recorded in `9950833` and `1b2cfa2`.

Next checkpoint: push only after separate approval, then produce a signed/notarized
universal release when Apple credentials are available.

## Priority product improvements

Status: P0 and operator-facing P1 completed, verified, committed, and pushed to `main`
on 2026-08-05.

- Scope Run, Approvals, Evidence, costs, and decisions to the current HarnessRun.
- Replace the technical nine-part progress model with Describe, Run checks, Decide.
- Keep acceptance/path controls available behind an optional disclosure.
- Make Evidence an explicit empty state until a run exists and a read-only decision
  surface once evidence is available.
- Collapse provider routing, command policy, sessions, and diagnostics under advanced
  Settings.
- Cover the new UI contracts in deterministic smoke checks and desktop tests.

The updated local arm64 application was rebuilt, installed, and launch-checked on
2026-08-05. Next checkpoint: complete native workflow QA, then manually verify a
signed/notarized universal macOS release after Apple credentials are available.

## UI/UX, MCP, Kimi and Qwen master plan

Status: functional slices Phase 0–6 were implemented, locally verified, and committed as
`9950833` on 2026-08-31. Native installed-CLI fixtures, approved remote OAuth MCP conformance,
frontend feature decomposition, full translation coverage, and signed/notarized release
verification remain external or hardening checkpoints.

- Preserve Run, Approvals, Evidence, and Settings as the result-oriented primary IA.
- Replace brand-coded provider strategies with capability-driven routing policies.
- Add supported Kimi Code and Qwen Code CLI adapters behind contract fixtures.
- Add MCP as an independent connections, policy, approval, and evidence layer.
- Use a DBC-owned MCP policy proxy for consistent CLI-provider safety semantics.
- Extend EvidencePack with provider/model/routing/MCP identity and tool-call evidence.
- Refactor the frontend into feature modules before expanding Connection Center UI.

Detailed plan: `docs/UI_UX_MCP_KIMI_QWEN_MASTER_PLAN_RU.md`.

Completed checkpoints: legacy RoutingPolicy migration, versioned CLI/API adapters,
immutable execution identity, official Kimi/Qwen read-only templates, stream-json and
usage normalization, MCP Connection Center and portable contracts, ToolPolicy proxy,
run-scoped approvals, malicious/proxy fixtures, dynamic fallback routing, balanced
preset, Team Builder, source-backed model catalog, EvidencePack v2 verification,
English-only UI, accessibility/CSP hardening, performance budget, and responsive QA.

Next checkpoint: validate supported installed Kimi/Qwen versions and an approved remote
OAuth MCP fixture, decompose `App.tsx`, complete translation/WCAG audit, then produce and
verify a signed/notarized universal release when Apple credentials are available. Kimi
built-in print/AFK tools and paid API calls remain disabled until separately verified.
