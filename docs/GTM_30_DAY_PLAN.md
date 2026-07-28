# DBC 30-Day Go-To-Market Plan

## Objective

Find ten teams with a real evidence or acceptance problem, get five through a
first EvidencePack, and convert at least three into repeat weekly users.

Mass reach is not the first objective. The first objective is verified product
use and language taken from real operators.

## Activation Metric

An evaluator generates a first EvidencePack within ten minutes of opening DBC.

Supporting metrics:

- preview opened;
- demo task loaded;
- safe run started;
- run reached `evidence_ready`;
- EvidencePack generated;
- final decision recorded;
- second run within seven days.

Any telemetry must be opt-in and must not include source code, prompts, file
contents, paths, provider credentials, or EvidencePack contents.

## Week 1 — Remove Adoption Friction

- Verify the complete deterministic browser preview.
- Record a 60–90 second demo using `docs/DEMO_SCRIPT.md`.
- Put the demo above the fold in README.
- Configure macOS signing and notarization when credentials are available.
- Publish checksums for every release asset.
- Create the first public GitHub issues from `docs/GOOD_FIRST_ISSUES.md`.

Exit condition: a new evaluator can understand the promise and complete the demo
without provider credentials.

## Week 2 — Design Partners

Contact 30 engineering leads or agency owners who already use coding agents.
Prioritize people who have publicly discussed review overhead, unsafe commands,
missing tests, or multi-agent workflows.

Offer a 25-minute working session:

1. choose one small repository task;
2. define allowed and forbidden paths;
3. run the task with their normal provider;
4. inspect the EvidencePack;
5. record what was confusing or missing.

Do not ask for generic product feedback. Ask:

- What evidence did you need before merge?
- Which part of the report changed your decision?
- What did DBC fail to capture?
- Would this replace an existing checklist or add another one?

Exit condition: five real tasks produce evidence and at least three users request
a second run.

## Week 3 — Proof-Led Content

Publish three concrete failure stories:

1. “The agent said done, but changed a forbidden file.”
2. “The test claim had no executable evidence.”
3. “Codex implemented, Claude reviewed, one EvidencePack decided the result.”

For each story include:

- a sanitized repository or demo project;
- exact approved scope;
- the failure or risk;
- the relevant EvidencePack section;
- the human decision;
- a 30–60 second clip.

Distribution:

- Habr article in Russian;
- DEV Community technical walkthrough;
- LinkedIn post aimed at engineering managers and agencies;
- concise X thread with the evidence screenshots;
- Show HN only after two or more external users have completed a run.

Exit condition: traffic converts to completed preview runs, not only repository
views.

## Week 4 — Launch and Retention

- Publish the best proof story as the release announcement.
- Open a GitHub Discussion asking for missing agent failure modes.
- Turn repeated setup problems into templates or Quick Setup fixes.
- Publish the first design-partner quote only with explicit permission.
- Review activation and second-run rates.
- Choose the next provider integration from observed use, not assumed popularity.

## Launch Assets

- README with problem, demo, install, EvidencePack, and comparison.
- 90-second demo video and short GIF.
- One sanitized EvidencePack example.
- Signed/notarized DMG or an explicit unsigned-alpha warning.
- Three proof stories.
- Five to ten scoped public issues.
- Contribution guide and issue templates.

## Decision Rules

- If fewer than 30% of evaluators finish the preview, improve onboarding before
  adding providers.
- If users finish the preview but do not try a real repository, improve import,
  provider readiness, and trust messaging.
- If users run once but not again, determine whether the EvidencePack changes a
  real merge or acceptance decision.
- Do not build organization dashboards until at least three teams need to compare
  multiple active projects.
