# Seam: document-for-humans

## Purpose

The skill that turns the AI-first doc tree into stakeholder-readable derived
docs: plain-language overviews, a decision journal, guardrails, and data-flow
stories that agents regenerate but never cite as truth.

## Scope & boundaries

Owns: the content under `skills/document-for-humans/` — `SKILL.md`,
`reference/`. Derives from authored docs only — decisions, glossary, seam
table, leaf docs, debt registry; never parses code, issues, commit messages, or
human-first docs. Delegates freshness enforcement to the adopting repo's gate.

## Key files & data flow

`SKILL.md` is the entry point; its frontmatter `name` is the skill identity.
`reference/` files resolve relative to it: `routing.md` maps audiences to
artifacts and defines the derivation contract, `templates.md` holds the four
artifact templates and the derived header block, `coherence.md` the prevention
stack and the freshness rule. `INSTALL.md` covers the install path. The
consumption path: sources → derived docs → human readers; agents regenerate on
source change, humans get plain language with one-way bridges into depth. The
gate extension in `scripts/docs-check.sh` enforces read-set absence, one-way
links, and derived freshness for `docs/human/`, dormant until the tree exists.
Installed runtime resolves `unslopify` by skill identity, not by a
repository-relative path.

## Non-negotiables

1. **INV-1** — `SKILL.md` frontmatter `name` equals the folder name
   `document-for-humans`.
2. **INV-2** — Sources are authored docs only, never code, issues, commit
   messages, or human-first docs. An issue may appear as a discussion link in a
   decision-journal entry but it is not evidence and does not appear as a
   derivation source. A repository without an accepted ADR does not derive
   journal claims from commit messages.
3. **INV-3** — Every human doc carries `Derived:`/`Sources:` headers.
4. **INV-4** — One-way bridges only: no AI doc links into `docs/human/`.
5. **INV-5** — Regenerating is an agent duty; citing as ground truth is
   forbidden.
6. **INV-6** — `unslopify` loads by skill identity before any user-visible prose
   and audits it again before publication; parent scope and parent decisions
   outrank prose rewrites; missing `unslopify` stops the workflow with the exact
   registry-lane install instruction `npx skills add
   RuralNative/RuralNative-SKILLS --skill unslopify`, missing Python does not
   stop it and the workflow continues model-only without weakening scope or
   preservation; the skill does not copy the `AIT-*` catalog and installed
   runtime does not depend on a repository-relative path. Mechanism:
   short adapter in `SKILL.md` (skill-identity load, parent-owned scope,
   precedence, missing-dependency stop, model-only path, final audit,
   catalog-ownership note); dependency visible in `INSTALL.md`; composition
   tests in `skills/document-for-humans/tests/` encode the invariant
   including fixtures that reject code, issues, commits, and human-first docs as
   sources and behavior-based checks that README routing headings and install
   order hold against the current README without locking whole prose passages;
   the single-source check pins the four section headings (routing, workflow,
   installation, requirements) and keeps shelf and routing from repeating
   install commands; runtime resolution by skill identity is asserted on the
   skill body, not on the README. The composition tests import the shared
   file reader and normalizer from `scripts/test-helpers.ts`.

## Links

- Glossary: `CONTEXT.md` — Human-first doc, derived artifact, decision
  journal, bridge link.
- Decision: `docs/adr/0003-human-first-derived-artifacts.md`.
- Harness: `scripts/docs-check.sh`.
- Template: `skills/document-for-agents/reference/templates.md` — the shape this
  leaf doc follows.
