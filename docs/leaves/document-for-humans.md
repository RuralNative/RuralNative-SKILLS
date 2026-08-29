# Seam: document-for-humans

## Purpose

Turns the AI-first doc tree into stakeholder-readable derived docs: plain-language overviews, a decision journal, guardrails, and data-flow stories that agents regenerate but never cite as truth.

## Scope & boundaries

Owns `skills/document-for-humans/` (`SKILL.md`, `reference/`, `INSTALL.md`). Derives from authored docs only — decisions, glossary, seam table, leaf docs, debt registry; never parses code, issues, commit messages, or human-first docs. Delegates freshness to the adopting repo's gate.
**Not here**: authoring the agent-first tree belongs to `document-for-agents`; prose cleanup to `unslopify`.

## Key files & data flow

`SKILL.md` (entry, `name: document-for-humans`). `reference/routing.md`, `templates.md`, `coherence.md`. `INSTALL.md` records provenance, residual trust, overwrite approval (ADR-0015). Consumption: sources → derived docs → human readers; agents regenerate on source change. The gate extension in `scripts/docs-check.sh` enforces read-set absence, one-way links, derived freshness. Installed runtime resolves `unslopify` by skill identity.

## Non-negotiables

1. **INV-1** — `name` equals folder `document-for-humans`.
2. **INV-2** — Sources are authored docs only, never code, issues, commit messages, or human-first docs; no accepted ADR means no journal claims from commits.
3. **INV-3** — Every human doc carries `Derived:`/`Sources:` headers.
4. **INV-4** — One-way bridges only: no AI doc links into `docs/human/`.
5. **INV-5** — Regenerating is an agent duty; citing as ground truth is forbidden.
6. **INV-6** — `unslopify` loads by skill identity before any user-visible prose and audits again before publication; missing `unslopify` stops the workflow; no installer command in `SKILL.md`; missing Python continues model-only; no `AIT-*` catalog copy.

## Links

Glossary: `CONTEXT.md`. Decisions: ADR-0003. Harness: `scripts/docs-check.sh`.

## Redirect

Restated detail in `docs/leaves/ext/document-for-humans.md`. Not a leaf; never followed by the resolver.
