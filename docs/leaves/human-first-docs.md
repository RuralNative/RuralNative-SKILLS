# Seam: human-first-docs

## Purpose

The skill that turns the AI-first doc tree into stakeholder-readable derived
docs: plain-language overviews, a decision journal, guardrails, and data-flow
stories that agents regenerate but never cite as truth.

## Scope & boundaries

Owns: the content under `skills/human-first-docs/` — `SKILL.md`,
`reference/`. Derives from authored docs only — decisions, glossary, seam
table, leaf docs, debt registry; never parses code. Delegates freshness
enforcement to the adopting repo's gate.

## Key files & data flow

`SKILL.md` is the entry point; its frontmatter `name` is the skill identity.
`reference/` files resolve relative to it: `routing.md` maps audiences to
artifacts, `templates.md` holds the four artifact templates and the derived
header block. The consumption path: sources → derived docs → human readers;
agents regenerate on source change, humans get plain language with one-way
bridges into depth.

## Non-negotiables

1. **INV-1** — `SKILL.md` frontmatter `name` equals the folder name
   `human-first-docs`.
2. **INV-2** — Sources are authored docs only, never code.
3. **INV-3** — Every human doc carries `Derived:`/`Sources:` headers.
4. **INV-4** — One-way bridges only: no AI doc links into `docs/human/`.
5. **INV-5** — Regenerating is an agent duty; citing as ground truth is
   forbidden.

## Links

- Glossary: `CONTEXT.md` — Human-first doc, derived artifact, decision
  journal, bridge link.
- Decision: `docs/adr/0003-human-first-derived-artifacts.md`.
- Harness: `scripts/docs-check.sh`.
- Template: `skills/doc-architecture/reference/templates.md` — the shape this
  leaf doc follows.
