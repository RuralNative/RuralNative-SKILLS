# Architecture — RuralNative-SKILLS

A public distribution shelf: a repository that publishes installable agent
skills. Each skill is a seam under `skills/<skill-identity>/`; the docs tree
under `docs/` caches what the code cannot express — decisions, vocabulary,
invariants, conventions. The repo runs the doc-architecture lifecycle on its
own docs.

## Seams

| Seam | Responsibility | Code root | Tests | Doc |
|---|---|---|---|---|
| doc-architecture | publishable agent instructions for the doc-cache lifecycle | skills/doc-architecture/ | install smoke via `npx skills add`; identity == folder check | docs/leaves/doc-architecture.md |

A new directory under `skills/` is a new seam: it needs a row here, a leaf
doc, and a `SKILL.md` whose frontmatter `name` matches its folder (harness
check 3).

## Cross-cutting boundaries

- Distribution is the registry lane only — no npm packaging. See ADR-0001.
- Work docs (plans, audits) live in the issue tracker, never the repo. See
  `docs/agents/issue-tracker.md`.
- Glossary vocabulary is binding; forbidden synonyms are listed. See
  `CONTEXT.md`.

## Coverage

Every authored doc, machine-checked against disk by `scripts/docs-check.sh`
(harness check 1). The indexes `AGENTS.md` and this file are what the check is
parsed from, so they are not listed here.

| File | Tier |
|---|---|
| CONTEXT.md | glossary |
| README.md | pointer |
| docs/agents/domain.md | pointer |
| docs/agents/issue-tracker.md | pointer |
| docs/agents/triage-labels.md | pointer |
| docs/adr/0001-distribute-as-public-catalog-shelf.md | decision |
| docs/leaves/doc-architecture.md | leaf |

## Loading protocol

| Task | Read set | Budget |
|---|---|---|
| Any change | AGENTS.md → ARCHITECTURE.md → the seam's leaf doc → glossary | small |
| Re-orient after compaction | ARCHITECTURE.md → task leaf doc → glossary | one small fixed read |

## Checks

- `./scripts/docs-check.sh` — the coherence gate: checks 1–5 of the
  eight-check gate in `skills/doc-architecture/reference/harness.md`
  (coverage ↔ disk, same-diff freshness, new-seam-requires-doc, ADR status
  parse, no work docs), plus a scorecard. Run it before finishing; a red
  harness is a work item, not a warning.
- The harness is tooling and is exempt from demanding its own doc.
