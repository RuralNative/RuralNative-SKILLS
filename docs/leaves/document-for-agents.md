# Seam: document-for-agents

## Purpose

The skill that runs the doc-cache lifecycle: establish, audit, and maintain a
codebase's agent-facing documentation so agents re-orient in one fixed read.
It is published for consumers, not merely hosted here.

## Scope & boundaries

Owns: the content under `skills/document-for-agents/` — `SKILL.md`, `INSTALL.md`,
`reference/`. Delegates: the shelf layout and registry behavior to the skills
registry; the repo's own docs coherence to this repo's harness.

## Key files & data flow

`SKILL.md` is the entry point; its frontmatter `name` is the skill identity.
`reference/` files resolve relative to it; `reference/classify.md`'s Notes
govern the invariant lifecycle and the birth of missing rules. The
consumption path: edit
`skills/document-for-agents/SKILL.md` → push to main → registry discovery lists
the repo → a consumer runs `npx skills add
RuralNative/RuralNative-SKILLS --skill document-for-agents`. The repo never
carries its own install — `.agents/` and `skills-lock.json` are ignored.
The gate's check set is defined in `reference/harness.md`; this repo's
`scripts/docs-check.sh` enforces it, and its ten checks are immutable.

## Non-negotiables

1. **INV-1** — `SKILL.md` frontmatter `name` equals the folder name
   `document-for-agents`.
2. **INV-2** — The registry-lane command in `INSTALL.md` installs this seam.
3. **INV-3** — Reference files resolve relative to `SKILL.md`; no absolute
   paths.
4. **INV-4** — Distribution stays on the registry lane; the copy-based
    install is a convenience, not a channel (ADR-0001).
5. **INV-5** — This repo's own install artifacts (`.agents/`,
    `skills-lock.json`) are never committed.
6. **INV-6** — `unslopify` loads before any user-visible prose and audits it
    again before publication; parent scope and parent decisions outrank prose
    rewrites; missing `unslopify` stops the workflow with the exact
    registry-lane install instruction `npx skills add
    RuralNative/RuralNative-SKILLS --skill unslopify`, missing Python does not
    stop it; the skill does not copy the `AIT-*` catalog. Mechanism:
    hard dependency declared in `SKILL.md` load order (interview questions,
    progress prose, drafts, comments, issues, final summaries), final-audit
    order, parent-owned scope (routine passes changed prose, an audit may sweep),
    precedence rule (factual correctness, tier routing, glossary, invariants,
    derivation rules, approval gates), missing-dependency stop, and
    catalog-ownership note; dependency visible in `INSTALL.md`; composition
    tests in `skills/document-for-agents/tests/` encode the invariant.

## Links

- Glossary: `CONTEXT.md` — Skill, skill identity, registry lane.
- Decision: `docs/adr/0001-distribute-as-public-catalog-shelf.md`.
- Decision: `docs/adr/0002-adopt-ten-check-gate.md` — the ten-check gate and
  the invariant lifecycle.
- Debt registry: `docs/debt.md`.
- Harness: `scripts/docs-check.sh`.
- Template: `skills/document-for-agents/reference/templates.md` — the shape this
  leaf doc follows (six sections, honest invariant budget, links rule).
