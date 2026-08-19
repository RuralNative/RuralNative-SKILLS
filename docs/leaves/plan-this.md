# Seam: plan-this

## Purpose

The skill that applies the planning prefix as a fixed template. It is user-invoked as `/plan-this <task>`, preserves the supplied planning workflow verbatim, places the invocation task under `## Task:`, and delegates to `/grill-with-docs`, `/to-spec`, and `/to-tickets` with `/unslop` active.

## Scope & boundaries

Owns: the content under `skills/plan-this/` — `SKILL.md`, `INSTALL.md`, `tests/`. Delegates: the planning workflow to `/grill-with-docs`, `/to-spec`, `/to-tickets`; prose quality to `/unslop` (external, not `unslopify`). The seam is a fixed-template adapter — it does not reimplement delegated skills, copy the `AIT-*` catalog, add runtime scripts, or create `.kilo/command/` entries. Installation uses the registry lane only.

## Key files & data flow

`SKILL.md` is the entry point; its frontmatter `name` is the skill identity `plan-this` and its `description` declares the explicit invocation `/plan-this <task>` and delegation to `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/unslop`. The consumption path: user runs `/plan-this <task>` → skill loads `/unslop` before the first progress update and keeps it active → runs `/grill-with-docs` → `/to-spec` → `/to-tickets` in order, substituting only the task under `## Task:` → produces specification and tickets following the prefix rules. The body after frontmatter is exactly the workflow line `Run this planning-only workflow: ` + `` `/grill-with-docs` → `/to-spec` → `/to-tickets` ``, `## Rules:` with eight bullets, the `Finish with an ELI18 **Why / What / Where / How** summary` line, and the `## Task:` slot, totaling ~21 lines including frontmatter with no wrapper sections. `INSTALL.md` documents the registry lane `npx skills add RuralNative/RuralNative-SKILLS --skill plan-this` and the manual copy `cp -r skills/plan-this`. The registry discovery walks `skills/plan-this/` and a consumer installs by skill identity. The repo never carries its own install — `.agents/` and `skills-lock.json` are ignored. Tests live in `skills/plan-this/tests/` and encode the invariants, including a line-count bound and negative checks for wrapper phrases.

## Non-negotiables

1. **INV-1** — `SKILL.md` frontmatter `name` equals the folder name `plan-this`.
2. **INV-2** — The registry-lane command in `INSTALL.md` installs this seam as `npx skills add RuralNative/RuralNative-SKILLS --skill plan-this` with matching manual copy `cp -r skills/plan-this`; discovery text names the explicit user invocation `/plan-this <task>` and preserves the example task verbatim under `## Task:`.
3. **INV-3** — Fixed-template boundary: `SKILL.md` body after frontmatter equals the exact supplied planning prefix verbatim, including `Run this planning-only workflow: ` + `` `/grill-with-docs` → `/to-spec` → `/to-tickets` ``, the eight Rules bullets, the `Finish with an ELI18 **Why / What / Where / How** summary` line, and the single `## Task:` slot, substituting only the task text; it preserves exact domain terms, identifiers, commands `ready-for-agent`, dependency names, quotations, and technical meaning, and does not add router skills, `.kilo/command/` files, runtime scripts, or model evals, and does not contain wrapper phrases `Rules preserved`, `## Installation`, `## Boundary`, `--- start of supplied`, or `This skill is a thin fixed-template adapter`. The file totals 18–35 lines including frontmatter (~21). Mechanism: composition test in `skills/plan-this/tests/` verifies verbatim body equality, single `## Task:` in body, absence of wrapper phrases, and line-count bound, plus no `scripts/` or `package.json` machinery.
4. **INV-4** — Hard dependencies are `/unslop`, `/grill-with-docs`, `/to-spec`, `/to-tickets` with workflow order `/grill-with-docs` followed by `/to-spec` followed by `/to-tickets` and `/unslop` loaded before the first progress update and kept active throughout; hard dependencies, in order, are `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/unslop` and are declared via the workflow line and first Rules bullet plus frontmatter description, not via a separate Hard dependencies section. The skill does not silently map `/unslop` to `unslopify`; the local `unslopify` seam stays unchanged. Mechanism: composition test in `skills/plan-this/tests/` verifies dependency names appear in body and frontmatter and workflow order is preserved.
5. **INV-5** — The skill is user-invoked only via `/plan-this <task>`; its `description` makes the explicit slash command and accepted input clear and it does not introduce broad automatic triggering. Preserved rules include the concise To-Do List covering Discovery, Decisions, Specification, Tickets, and Delivery, approval gates, ticket design as independently verifiable vertical slices with blockers and parallel-safety notes, `ready-for-agent` labels with native dependency edges, and the final ELI18 Why / What / Where / How summary. Mechanism: composition test verifies explicit invocation phrasing and presence of preserved rule sections.

## Links

- Glossary: `CONTEXT.md` — Skill, skill identity, skill naming convention, distribution shelf, registry lane.
- Decision: `docs/adr/0004-verb-named-skills-flat-shelf.md` — default naming.
- Decision: `docs/adr/0006-plan-this-fixed-template-adapter.md` — task-scoped exception and template boundary.
- Harness: `scripts/docs-check.sh`.
- Template: `skills/document-for-agents/reference/templates.md` — the shape this leaf doc follows.
