# Seam: doc-architecture

## Purpose

The skill that runs the doc-cache lifecycle: establish, audit, and maintain a
codebase's agent-facing documentation so agents re-orient in one fixed read.
It is published for consumers, not merely hosted here.

## Scope & boundaries

Owns: the content under `skills/doc-architecture/` — `SKILL.md`, `INSTALL.md`,
`reference/`. Delegates: the shelf layout and registry behavior to the skills
registry; the repo's own docs coherence to this repo's harness.

## Key files & data flow

`SKILL.md` is the entry point; its frontmatter `name` is the skill identity.
`reference/` files resolve relative to it; `reference/classify.md`'s Notes
govern the invariant lifecycle and the birth of missing rules. The
consumption path: edit
`skills/doc-architecture/SKILL.md` → push to main → registry discovery lists
the repo → a consumer runs `npx skills add
RuralNative/RuralNative-SKILLS --skill doc-architecture`. The repo never
carries its own install — `.agents/` and `skills-lock.json` are ignored.
The gate's check set is defined in `reference/harness.md`; this repo's
`scripts/docs-check.sh` enforces it, and its ten checks are immutable. Check 10
guarantees invariant integrity: ids are unique per leaf doc and every
reference resolves. The scorecard marks each invariant test-encoded (`enc`)
when its id appears literally under a path the seam table's Tests column
names, else prose.

## Non-negotiables

1. **INV-1** — `SKILL.md` frontmatter `name` equals the folder name
   `doc-architecture`.
2. **INV-2** — The registry-lane command in `INSTALL.md` installs this seam.
3. **INV-3** — Reference files resolve relative to `SKILL.md`; no absolute
   paths.
4. **INV-4** — Distribution stays on the registry lane; the copy-based
   install is a convenience, not a channel (ADR-0001).
5. **INV-5** — This repo's own install artifacts (`.agents/`,
   `skills-lock.json`) are never committed.

## Links

- Glossary: `CONTEXT.md` — Skill, skill identity, registry lane.
- Decision: `docs/adr/0001-distribute-as-public-catalog-shelf.md`.
- Debt registry: `docs/debt.md`.
- Harness: `scripts/docs-check.sh`.
- Template: `skills/doc-architecture/reference/templates.md` — the shape this
  leaf doc follows (six sections, honest invariant budget, links rule).
