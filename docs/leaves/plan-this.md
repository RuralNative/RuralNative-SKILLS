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
11. **INV-11** — Planning orientation resolution (ADR-0024, ADR-0032): per-ticket orientation set before publication; length alone never rejects.
12. **INV-12** — Authoritative sections (affected seams, criteria, constraints, blockers, settled decisions, risk, verification intent) are the fingerprint input; settled decisions publish in the body. New output follows the literal canonical templates in `reference/canonical-bodies.md` (one settlement home per role). Bodies validate with `validateAuthoritativeBody` and the bundled `workflow-cli.mjs planning` check before approval: missing or duplicate sections, duplicate criterion IDs, and unsupported criterion lines stop publication. New criteria publish as single-line `- [ ] AC-N: text` checkbox records (legacy bullets and bare IDs fingerprint identically; checked boxes never retire).
13. **INV-13** — Shared handoff (ADR-0034, narrowed by ADR-0037, ADR-0038): canonical parent and ticket output must survive requirements parsing into implementation evidence and review readiness without hand-editing. Publication starts without claimable labels and applies readiness labels only after read-back of the actual bodies, native parent links, and the complete blocker graph; uncertain publication reuses the identified issue, never a duplicate. Narrowed by ADR-0040: native reads execute through `github-facts.mjs` (`issue`, `sub-issues`, `blocked-by`, `blocking`) with complete-empty distinguished from unavailable, forbidden, malformed, or partial; unknown graphs never become zero.

## Links

Glossary: `CONTEXT.md`. Decisions: ADR-0004, ADR-0006, ADR-0014, ADR-0015, ADR-0019, ADR-0020, ADR-0024, ADR-0027, ADR-0032, ADR-0034, ADR-0037, ADR-0038, ADR-0040. Harness: `scripts/docs-check.sh`. Redirect: `docs/leaves/ext/plan-this.md`.
