---
name: document-for-humans
description: >-
  Create and maintain plain-language, human-facing documentation derived from
  an AI-first doc tree. Use when the user asks for human-readable docs, a
  stakeholder overview, plain-language explanations for non-technical readers,
  a decision journal, or docs for vibe coders — and wants them kept fresh
  without ever becoming an agent's source of truth.
---

# document-for-humans — plain-language documentation, derived not authored

Human-first docs are **derived artifacts**: their only input is the project's
authored docs — decisions, glossary, seam table, leaf docs, debt registry —
never the code itself. Agents **write** them (regenerate on source change) and
never **cite** them as technical ground truth. Trust and maintenance are
separate permissions.

## Principles — every branch obeys these

1. **Audience is an axis, not a tier.** The routing question gains a second
   clause: "and who reads it?" — agents get the cache; humans get a derived
   view of it.
2. **Derived, never primary.** Sources are authored docs only; code parsing is
   forbidden; every claim in a human doc traces to a source it names.
3. **Agents write, never cite.** Regeneration is required; citation as ground
   truth is forbidden.
4. **Plain language, one-way bridges.** Recent-graduate reading level; every
   term of art links the glossary or bridges to the AI-first doc for depth; no
   AI doc links back.
5. **Freshness is mechanical.** A `Derived:`/`Sources:` header per doc; a gate
   rule fails staleness; dormancy until the first human doc exists.
6. **Size to the audience.** One overview page; a journal that grows one entry
   per decision; guardrails only where invariants exist.

## Branch A — Establish: build the human view for a repo with none

1. **Size the audience.** Oversight stakeholders, vibe coders, juniors —
   which artifacts each gets.
   *Done when: the artifact set is chosen and defended.*
2. **Inventory derivable sources.** The AI-first tree's authored docs.
   *Done when: every planned artifact names its sources.*
3. **Create the tree and derive the first artifacts** under `docs/human/`,
   wire prevention and freshness (see `reference/coherence.md`).
   *Done when: the gate extension passes and prevention holds.*

## Branch B — Audit: diagnose an existing human-doc tree

1. **Digest audit.** For each existing human doc — sources resolvable, stamp
   honest, tone within budget, digests fresh.
   *Done when: a numbered findings list, each with its fix.*

## Branch C — Maintain: keep the human view coherent during normal work

1. **Same-diff regeneration.** A change to a source regenerates its derived
   docs in the same diff.
   *Done when: the gate stays green in the diff.*
2. **New decision ⇒ new journal entry** in the same diff.
   *Done when: the journal links every accepted ADR.*

## Reference

- `reference/routing.md` — audience routing, the derivation contract, tone.
- `reference/templates.md` — the four artifacts and the derived header.
- `reference/coherence.md` — the prevention stack and the freshness rule.
