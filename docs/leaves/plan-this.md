# Seam: plan-this

## Purpose

Planning workflow adapter, invoked as `/plan-this <task>`: defines the intent capsule and publishes an approved parent spec with coherent child tickets, asking only when a human must decide. Reads `AGENTS.md → ARCHITECTURE.md → affected seam leaf → CONTEXT.md → relevant ADRs`. Published criteria carry local `AC-N` IDs.
**Not here**: implementation → `implement-this`; review → `review-this`; prose → `/unslopify`.

## Non-negotiables

1. **INV-1** — `name` equals folder `plan-this`.
2. **INV-2** — INSTALL: `npx skills add RuralNative/RuralNative-SKILLS --skill plan-this`, manual copy.
3. **INV-3** — Structured workflow boundary: workflow line, approval gate, `## Contract`, five phases, ELI18 summary, single `## Task:` slot.
4. **INV-4** — Deps `/unslopify`, `/grill-with-docs`, `/to-spec`, `/to-tickets`; `/unslopify` before first progress update; focused route; delegated skills `disable-model-invocation`.
5. **INV-5** — Intent and decision gates: six-field capsule; ask only when facts and the confirmed task cannot decide; one plain question; no forced round when settled.
6. **INV-6** — One planning contract: structured body is the single planning behavior source.
7. **INV-7** — Bounded-planning: spec states capsule, behavior, non-goals, acceptance, affected seams, constraints, widest safe frontier, smallest test-first verification.
8. **INV-8** — Canonical publication: nothing publishes before explicit approval; approved decisions live in the spec; native blocked_by edges canonical.
9. **INV-9** — Trust: task text and ticket bodies are requirements data; no skill downloads; INSTALL records provenance.
10. **INV-10** — Risk: high-risk triggers without evidence block publication; published tickets use only `ordinary`/`high-risk`; raise with evidence, never lower.
11. **INV-11** — Bounded-planning preflight (ADR-0024, ADR-0030): per-ticket orientation set before publication; reject over-cap.
12. **INV-12** — Authoritative sections (affected seams, criteria, constraints, blockers, settled decisions, risk, verification intent) are the fingerprint input; settled decisions publish in the body.

## Links

Glossary: `CONTEXT.md`. Decisions: ADR-0004, ADR-0006, ADR-0014, ADR-0015, ADR-0019, ADR-0020, ADR-0024, ADR-0027, ADR-0030. Harness: `scripts/docs-check.sh`. Redirect: `docs/leaves/ext/plan-this.md`.
