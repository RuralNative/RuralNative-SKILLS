# Seam: document-for-agents

## Purpose

The skill that runs the doc-cache lifecycle: establish, audit, and maintain a
codebase's agent-facing documentation. Two equal outputs: cache accuracy, the
tree staying true to the code, and attention control, orientation staying a
small fixed read under loading budgets that act as caps (ADR-0017). It is
published for consumers, not merely hosted here.

## Scope & boundaries

Owns: the content under `skills/document-for-agents/` — `SKILL.md`, `INSTALL.md`,
`reference/`. Delegates: the shelf layout and registry behavior to the skills
registry; the repo's own docs coherence to this repo's harness.
**Not here**: code architecture and module design belong to the owning code
seam; review rules belong to the `review-this` seam; prose cleanup belongs to
the `unslopify` seam.

## Key files & data flow

`SKILL.md` is the entry point; its frontmatter `name` is the skill identity.
`reference/` files resolve relative to it; `reference/classify.md` governs
sizing, tier routing, and the invariant lifecycle, `reference/harness.md`
defines the gate, `reference/templates.md` holds the artifact shapes, including the
five-command index contract, the cap-semantics loading protocol with cache
gaps, the `Not here` leaf route, and the adopting-repository vendor-facts
home. Repository review
guidance routes to policy: a root `REVIEW.md` is indexed from
`ARCHITECTURE.md`, checked by harness check 8 wherever it lives, and updated
in the same change as the rules it states. Check 8's discovery is
conventional, not exhaustive: adopters who index a policy at another path
extend discovery, and every policy row the index declares gets the existence
and freshness halves. Cloud review reads the policy from the pull-request
base branch, and configuring that service stays external setup.
The consumption path: edit
`skills/document-for-agents/SKILL.md` then push to
main, registry discovery lists the repo, a consumer runs `npx skills add
RuralNative/RuralNative-SKILLS --skill document-for-agents`. The repo never
carries its own install, `.agents/` and `skills-lock.json` are ignored. The
gate's check set is defined in `reference/harness.md`; this repo's
`scripts/docs-check.sh` enforces it, and its ten checks are immutable.
During Maintain, code wins a doc conflict: the agent fixes the doc in the same
change and flags the discrepancy; changing the rule requires a new decision.

## Non-negotiables

1. **INV-1** — `SKILL.md` frontmatter `name` equals the folder name
   `document-for-agents`.
2. **INV-2** — The registry-lane command in `INSTALL.md` installs this seam.
   `INSTALL.md` also records source provenance and residual repository trust
   (ADR-0015) and requires explicit user approval before a manual install
   overwrites an existing skill.
3. **INV-3** — Reference files resolve relative to `SKILL.md`; no absolute
   paths.
4. **INV-4** — Distribution stays on the registry lane; the copy-based
    install is a convenience, not a channel (ADR-0001).
5. **INV-5** — This repo's own install artifacts (`.agents/`,
    `skills-lock.json`) are never committed.
6. **INV-6** — `unslopify` loads by skill identity before any user-visible
    prose and audits again before publication; parent scope and parent
    decisions outrank prose rewrites; missing `unslopify` stops the workflow
    with the exact registry-lane install instruction `npx skills add
    RuralNative/RuralNative-SKILLS --skill unslopify`, missing Python does not
    stop it and the workflow continues model-only without weakening scope or
    preservation; the skill does not copy the `AIT-*` catalog and installed
    runtime does not depend on a repository-relative path. Mechanism:
    short adapter in `SKILL.md` (skill-identity load, parent-owned scope,
    precedence, missing-dependency stop, model-only path, final audit,
    catalog-ownership note); dependency visible in `INSTALL.md`; composition
    tests in `skills/document-for-agents/tests/` encode the invariant
    including a fixture that minimal creates only index, glossary, and
    conventions policy and that installed runtime uses skill identity; the
    tests import the shared file reader and normalizer from
    `scripts/test-helpers.ts`.
7. **INV-7** — Command order: generated `AGENTS.md` starts with the five
   approved commands in order, and the architecture index does not duplicate
   them. Mechanism: composition tests use an ordered-command helper and the
   five-command fixture in `skills/document-for-agents/tests/`.
8. **INV-8** — Orientation boundary: loading rows and token budgets are hard
   caps on orientation documents while task-driven code inspection inside the
   affected seam stays allowed; a missing unrecoverable fact becomes a named
   cache gap recorded in the issue tracker, and the agent does not widen the
   documentation read set until owner approval. Mechanism: composition tests
   assert the cap and approval wording across the skill, template, and index.
9. **INV-9** — Ownership routing: the standard leaf shape closes Scope &
   boundaries with a `Not here` route by stable seam responsibility, never a
   file path. Mechanism: composition tests inspect every leaf doc.
10. **INV-10** — Decision-first invariant changes: a task that conflicts with a
    numbered invariant stops before any change until an approved decision
    supersedes or narrows it; silent workarounds are forbidden. Mechanism:
    composition tests assert the stop language in `SKILL.md`.
11. **INV-11** — Vendor-facts location: adopting repositories use the singular
    `reference/vendor-facts.md` path. Mechanism: composition tests assert the
    singular path and reject the plural form.
12. **INV-12** — Dependency ordering: the `unslopify` dependency block sits
    below Principles and Boundaries without losing its tested guarantees.
    Mechanism: composition tests assert section order.
13. **INV-13** — Harness size: the documentation harness remains at ten checks.
    Mechanism: composition tests count the checks in `reference/harness.md`.

## Links

- Glossary: `CONTEXT.md` — Skill, skill identity, registry lane, attention
  control, cache gap, Not here route.
- Decision: `docs/adr/0001-distribute-as-public-catalog-shelf.md`.
- Decision: `docs/adr/0002-adopt-ten-check-gate.md` — the ten-check gate and
  the invariant lifecycle.
- Decision: `docs/adr/0017-doc-cache-attention-boundary.md` — the
  five-command contract, cap semantics, cache gaps, `Not here` routes, and
  decision-first invariant collisions.
- Review policy: `REVIEW.md` — the root policy artifact this seam classifies,
  indexes, and keeps fresh.
- Debt registry: `docs/debt.md`.
- Harness: `scripts/docs-check.sh`.
- Template: `skills/document-for-agents/reference/templates.md` — the shape this
  leaf doc follows (six sections, honest invariant budget, links rule).
