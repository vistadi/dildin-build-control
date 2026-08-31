# Dibi Workshop design QA

Date: 2026-08-31

## Visual target

- Selected concept: Dibi Workshop, option 2.
- Source: `/Users/vitaliy/.codex/generated_images/019fa80e-6a95-7403-947f-3b17cd82dd04/exec-1c29b41f-1e1d-473b-8a3f-45e076ed7bf7.png`
- Source size: 1487 × 1058.
- Target state: clean Guided Run in safe browser preview, English locale.

## Asset catalog

| Slot | Implementation | Result |
| --- | --- | --- |
| Sidebar brand mark | `assets/brand/dibi-mark.png`, 512 × 512 RGBA | Passed: transparent background, clean silhouette, DBC collar tag remains legible at sidebar size. |
| Guided Run illustration | `assets/brand/dibi-workshop.png`, 800 × 600 RGB | Passed: Dibi, blueprint, tools, plant, and coral toolbox match the selected concept. |
| Desktop/system icon | `assets/app-icon-source.png`, 1024 × 1024 RGB plus generated Tauri icon set | Passed: midnight rounded tile, cyan/violet rim, recognizable Dibi silhouette at 32 px. |
| Standard interface icons | Existing `lucide-react` dependency | Passed: one consistent stroke family; no second icon library or custom SVG substitutes added. |

The project already used Lucide as its interface icon system, so the implementation intentionally retained it instead of introducing a competing icon library.

## Comparison evidence

- Final implementation screenshot: `/private/tmp/dbc-dibi-workshop-qa-final.png`, 1487 × 1058.
- Side-by-side comparison: `/private/tmp/dbc-dibi-comparison-final.png`.
- Durable product screenshot: `docs/screenshots-guide/02-guided-run.png`, 1280 × 720.

The reference and implementation were compared in one side-by-side raster at the same 1487 × 1058 viewport and the same clean Guided Run state.

## Iteration history

### Pass 1

- P2 layout: the sidebar footer followed the full document height and was outside the first viewport. Fixed with a desktop sticky, viewport-height sidebar and a mobile height reset.
- P2 fidelity: the sidebar and mascot lockup were narrower than the selected concept. Fixed by aligning the sidebar to 288 px and increasing the Dibi brand slot to 104 px.
- P2 responsiveness: mobile navigation clipped the fourth primary destination. Fixed with an icon-only navigation treatment below 700 px while preserving accessible names and titles.
- P2 responsiveness: the 1024 px top bar cramped the title and actions, and the Evidence step wrapped awkwardly. Fixed with a stacked tablet top bar and denser three-step tabs.
- P2 language scope: the first implementation exposed a partial RU/EN switch. The accepted release direction is now English-only, so the switch, alternate copy branches, and persisted language preference were removed.

### Final pass

- Desktop 1487 × 1058: no horizontal overflow; workbench bounds 1109.8 × 761 px at x=332.6, visually aligned with the selected concept.
- Tablet 1024 × 768: no horizontal overflow; all three step labels remain on one line; header actions remain usable.
- Mobile 430 × 932: no horizontal overflow; all five navigation controls are visible; visible top-level tap targets are at least 40 px high and primary navigation targets are 46 px high.
- Imagery: no crop distortion, placeholder art, CSS illustration, or inline SVG approximation.
- Console: zero warnings and errors on the final clean tab.
- Language: the runtime is English-only, `document.documentElement.lang` is fixed to `en`, no language toggle is rendered, and legacy stored language preferences are discarded.
- Interaction: `Load demo` fills realistic bounded work; `Start safe run` becomes enabled and creates a browser-safe HarnessRun without touching project files or providers.
- Accessibility: semantic headings, labeled inputs, meaningful image alt text, `aria-current`, the existing skip link, visible focus rings, and reduced-motion handling remain present.

## Intentional product differences from the concept

- The implementation keeps a separate change-title field because the existing Task and TaskContract flow requires a stable human-readable title.
- The interface is intentionally English-only following the product-owner decision; internal historical plans may remain in Russian without creating a second runtime locale.
- The primary run button is disabled until both required fields are filled; the concept showed the visual CTA, while the shipped behavior preserves the existing safe validation rule.

## Final result

Passed. No open P0, P1, or P2 design QA findings remain for the implemented Guided Run redesign.
