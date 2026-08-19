---
name: document-for-humans
description: >-
  Create and maintain plain-language, human-facing documentation derived from
  an AI-first doc tree. Use when the user asks for human-readable docs, a
  stakeholder overview, plain-language explanations for non-technical readers,
  a decision journal, or docs for vibe coders — and wants them kept fresh
  without ever becoming an agent's source of truth. Hard dependency on
  `unslopify` for prose quality — load it before any user-visible prose and run
  a final audit before publishing; parent scope and decisions outrank prose
  rewrites.
---

# document-for-humans — plain-language documentation, derived not authored

Human-first docs are **derived artifacts**: their only input is the project's
authored docs — decisions, glossary, seam table, leaf docs, debt registry —
never the code itself. Agents **write** them (regenerate on source change) and
never **cite** them as technical ground truth. Trust and maintenance are
separate permissions.

## Hard dependency: `unslopify` — prose quality

This skill declares `unslopify` as a hard dependency. The prose-quality
contract in `skills/unslopify/SKILL.md` must be active for every workflow that
produces user-visible prose.

**Load order.** Load `skills/unslopify/SKILL.md` before the first interview
question, progress update, derived draft, or final summary. Keep its scope,
protected-content, and rewrite contracts active while drafting human pages and
while revising them. Do not publish or complete a human-doc change without a
final `unslopify` audit on the exact prose the reader will see.

**Scope belongs to the caller.** This skill owns scope. Routine derived
regeneration passes only prose whose sources changed; an audit may request a
repository sweep of all derived prose. Pass the chosen scope to `unslopify`
without expansion. When `unslopify` runs as a standalone cleanup, it uses
explicit scope the human provides; when it runs under this skill, this skill's
chosen scope governs.

**Parent decisions outrank prose rewrites.** Derivation rules from
`reference/routing.md`, tone and plain-language budgets, glossary terms and
their forbidden synonyms, seam invariants, and approval gates are authoritative.
`unslopify` may not override a decision, glossary entry, leaf invariant,
derivation source, or workflow decision, and it may not change facts, numbers,
dates, citations, quotations, or invented sources to satisfy a style finding.
If a style finding conflicts with a parent decision, the parent decision stands
and the finding is rejected with reason.

**Missing dependency.** If `skills/unslopify/SKILL.md` is absent, stop the
workflow before the first user-visible prose and emit the exact registry-lane
install instruction: `npx skills add RuralNative/RuralNative-SKILLS --skill
unslopify` then retry. Do not draft or publish. Missing Python for the optional
scanner at `skills/unslopify/scanner.py` does not stop the workflow; continue
model-only without weakening scope or preservation.

**Catalog ownership.** This skill does not copy the `AIT-*` pattern catalog. It
references `unslopify` for all findings. Do not duplicate rule definitions
here; see `skills/unslopify/reference/parity.md` for the canonical catalog.

**Completion audit.** Before marking a workflow complete or publishing human
docs, run `unslopify` on the final prose and record its completion report:
scope used, accepted and rejected findings, scanner availability,
protected-content status, and preservation audit result.

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
    *Done when: the gate extension passes, prevention holds, and the final
    `unslopify` audit on all created prose passes before publishing.*

## Branch B — Audit: diagnose an existing human-doc tree

1. **Digest audit.** For each existing human doc — sources resolvable, stamp
    honest, tone within budget, digests fresh.
    *Done when: a numbered findings list, each with its fix, and the final
    `unslopify` audit on the audit prose passes before publishing.*

## Branch C — Maintain: keep the human view coherent during normal work

1. **Same-diff regeneration.** A change to a source regenerates its derived
    docs in the same diff. Run the `unslopify` final audit on the regenerated
    prose before publishing and record its completion report.
    *Done when: the gate stays green in the diff.*
2. **New decision ⇒ new journal entry** in the same diff. Run the `unslopify`
    final audit on the journal entry before publishing.
    *Done when: the journal links every accepted ADR.*

## Reference

- `reference/routing.md` — audience routing, the derivation contract, tone.
- `reference/templates.md` — the four artifacts and the derived header.
- `reference/coherence.md` — the prevention stack and the freshness rule.
