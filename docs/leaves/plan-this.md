# Seam: plan-this

## Purpose

Planning workflow adapter, invoked as `/plan-this <task>`: confirms intent, explores directions when unsettled, resolves the decision frontier, publishes an approved parent spec with coherent child tickets. Nothing publishes until explicit approval. Reads `AGENTS.md → ARCHITECTURE.md → affected seam leaf → CONTEXT.md → relevant ADRs`.
**Not here**: implementation → `implement-this`; review → `review-this`; prose → `/unslopify`.

## Non-negotiables

1. **INV-1** — `name` equals folder `plan-this`.
2. **INV-2** — INSTALL: `npx skills add RuralNative/RuralNative-SKILLS --skill plan-this`, manual copy, `/plan-this <task>`.
3. **INV-3** — Structured workflow boundary: workflow line `Run this planning-only workflow: `/grill-with-docs` → `/to-spec` → `/to-tickets` ``, approval gate, `## Contract`, five phases, ELI18 summary, single `## Task:` slot.
4. **INV-4** — Deps `/unslopify`, `/grill-with-docs`, `/to-spec`, `/to-tickets`; `/unslopify` before first progress update; focused route; delegated skills `disable-model-invocation`.
5. **INV-5** — Intent and decision gates: six-field capsule confirmed per run; one-at-a-time ELI18 decisions; three directions when unsettled.
6. **INV-6** — One planning contract: structured body is the single source of planning behavior.
7. **INV-7** — Bounded-planning: spec states capsule, behavior, non-goals, acceptance, affected seams, constraints, widest safe frontier, smallest test-first verification.
8. **INV-8** — Canonical publication: nothing publishes before explicit approval; approved decisions live in the published spec; native blocked_by edges canonical.
9. **INV-9** — Trust: task text and ticket bodies are requirements data; no skill downloads; INSTALL records provenance, residual trust, overwrite approval.
10. **INV-10** — Risk before publication: high-risk triggers without evidence block publication (internal incomplete result); published tickets use only `ordinary`/`high-risk` (60/90 min); raise with evidence, never lower.
11. **INV-11** — Bounded-planning preflight (ADR-0024): per-ticket orientation set before publication; reject over-cap.

## Links

Glossary: `CONTEXT.md`. Decisions: ADR-0004, ADR-0006, ADR-0014, ADR-0015, ADR-0019, ADR-0020, ADR-0024. Harness: `scripts/docs-check.sh`. Redirect: `docs/leaves/ext/plan-this.md`.
