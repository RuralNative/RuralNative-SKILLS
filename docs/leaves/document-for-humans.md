# Seam: document-for-humans

## Purpose

The skill that turns the AI-first doc tree into stakeholder-readable derived
docs: plain-language overviews, a decision journal, guardrails, and data-flow
stories that agents regenerate but never cite as truth.

## Scope & boundaries

Owns: the content under `skills/document-for-humans/` — `SKILL.md`,
`reference/`. Derives from authored docs only — decisions, glossary, seam
table, leaf docs, debt registry; never parses code. Delegates freshness
enforcement to the adopting repo's gate.

## Key files & data flow

`SKILL.md` is the entry point; its frontmatter `name` is the skill identity.
`reference/` files resolve relative to it: `routing.md` maps audiences to
artifacts, `templates.md` holds the four artifact templates and the derived
header block, `coherence.md` the prevention stack and the freshness rule.
`INSTALL.md` covers the install path. The consumption path: sources → derived
docs → human readers; agents regenerate on source change, humans get plain
language with one-way bridges into depth. The gate extension in
`scripts/docs-check.sh` enforces read-set absence, one-way links, and derived
freshness for `docs/human/`, dormant until the tree exists.

## Non-negotiables

1. **INV-1** — `SKILL.md` frontmatter `name` equals the folder name
   `document-for-humans`.
2. **INV-2** — Sources are authored docs only, never code.
3. **INV-3** — Every human doc carries `Derived:`/`Sources:` headers.
4. **INV-4** — One-way bridges only: no AI doc links into `docs/human/`.
5. **INV-5** — Regenerating is an agent duty; citing as ground truth is
    forbidden.
6. **INV-6** — `unslopify` loads before any user-visible prose and audits it
    again before publication; parent scope and parent decisions outrank prose
    rewrites; missing `unslopify` stops the workflow with the exact
    registry-lane install instruction `npx skills add
    RuralNative/RuralNative-SKILLS --skill unslopify`, missing Python does not
    stop it; the skill does not copy the `AIT-*` catalog. Mechanism:
    hard dependency declared in `SKILL.md` load order (interview questions,
    progress prose, derived drafts, comments, issues, final summaries),
    final-audit order, parent-owned scope (routine passes changed sources, an
    audit may sweep), precedence rule (factual correctness, tier routing,
    derivation rules, glossary, invariants, approval gates), missing-dependency
    stop, and catalog-ownership note; dependency visible in `INSTALL.md`;
    composition tests in `skills/document-for-humans/tests/` encode the invariant.

## Links

- Glossary: `CONTEXT.md` — Human-first doc, derived artifact, decision
  journal, bridge link.
- Decision: `docs/adr/0003-human-first-derived-artifacts.md`.
- Harness: `scripts/docs-check.sh`.
- Template: `skills/document-for-agents/reference/templates.md` — the shape this
  leaf doc follows.
