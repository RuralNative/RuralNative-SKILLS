---
name: document-for-humans
description: >-
  Create and maintain plain-language, human-facing documentation derived from
  an AI-first doc tree. Use when the user asks for human-readable docs, a
  stakeholder overview, plain-language explanations for non-technical readers,
  a decision journal, or docs for vibe coders — and wants them kept fresh
  without ever becoming an agent's source of truth. Hard dependency on
  `unslopify` for prose quality — load it by skill identity before any
  user-visible prose and run a final audit before publishing; parent scope and
  decisions outrank prose rewrites.
---

# document-for-humans — plain-language documentation, derived not authored

Human-first docs are **derived artifacts**: their only input is the project's
authored docs — decisions, glossary, seam table, leaf docs, debt registry —
never the code itself. Agents **write** them (regenerate on source change) and
never **cite** them as technical ground truth. Trust and maintenance are
separate permissions.

## Dependency: `unslopify`

Load `unslopify` by skill identity before the first user-visible prose. Keep
its scope, protected-content, and rewrite contracts active while drafting
human pages and while revising them.
Parent scope governs: routine derived regeneration passes only prose whose
sources changed, an audit may sweep the repository.
Parent decisions outrank style findings: factual correctness, tier routing
from `reference/routing.md`, derivation rules, tone and plain-language
budgets, glossary terms and their forbidden synonyms, seam invariants,
derivation sources, and approval gates stand and the finding is rejected with
reason.
If `unslopify` is absent, stop before any draft and direct the owner to this
skill's `INSTALL.md` for the install commands; workflow execution performs no
skill downloads. Missing Python for the optional scanner does not stop the workflow, continue
model-only without weakening scope or preservation.
Before publishing or marking complete, run the final `unslopify` audit on the
exact prose the reader will see and record scope, accepted and rejected
findings, scanner availability, protected-content status, and preservation
result. The `AIT-*` catalog lives in `unslopify`, see its parity reference, it
is not copied here. Installed runtime resolves `unslopify` by skill identity,
not by a repository-relative path.

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
   AI doc links back. See `reference/routing.md` and `reference/templates.md`
   for bridge form and jargon budget.
5. **Freshness is mechanical.** A `Derived:`/`Sources:` header per doc; a gate
   rule fails staleness; dormancy until the first human doc exists. See
   `reference/coherence.md` for the rule.
6. **Size to the audience.** One overview page; a journal that grows one entry
   per decision; guardrails only where invariants exist. See
   `reference/routing.md` for the routing table.

## Branch A — Establish: build the human view for a repo with none

Entry: the repository has an authored agent-first doc tree and lacks a coherent
human-first view.

1. **Confirm the authored tree can be derived from.** Verify the agent-first
   tree is present and coherent: index, glossary, ADRs, seam table, leaf docs.
   If it is missing or incoherent, stop and establish it first; do not invent
   human docs from code or other non-authored inputs. See
   `reference/routing.md` for allowed sources.
   *Done when: the authored source set is listed and every source file exists.*
2. **Select artifacts by audience and question.** Using the routing table,
   match each reader and their question to one of the four artifacts. Do not
   create a dormant category early. See `reference/routing.md` and
   `reference/templates.md` for the four shapes.
   *Done when: the planned artifact set is chosen and each artifact names its
   intended reader and question.*
3. **Map each planned claim to its source.** For every claim the draft will make,
   name the authored doc that already holds it. Authored docs are the only
   derivation sources: decisions, glossary, seam table, leaf docs, debt
   registry. Code, issues, commit messages, and human-first docs cannot supply
   claims. An issue may appear as a discussion link in a decision-journal entry
   but it is not evidence and does not appear as a derivation source. A
   repository without an accepted ADR does not derive journal claims from commit
   messages. It records the decision in the authored tree first or leaves the
   journal category dormant. See `reference/routing.md`.
   *Done when: every planned claim lists its authored source; any claim without
   one is routed to its tier in the AI-first tree first.*
4. **Ask the human to approve the artifact set.** Present the artifact list,
   the audience and question for each, and the source map. Do not create files
   before approval.
   *Done when: the owner approved the artifact set.*
5. **Create the tree and derive the artifacts.** Create `docs/human/` and derive
   the approved artifacts under it. Each Derived doc carries valid `Derived:`
   and `Sources:` headers, uses one-way Bridge links for depth, and explains or
   links glossary terms on first use. Wire prevention and freshness as in
   `reference/coherence.md`. Run the final `unslopify` audit on all created
   prose before publishing and record its completion report.
   *Done when: every selected artifact exists with valid `Derived:` and
   `Sources:` headers, the gate extension passes, prevention holds, and source,
   freshness, language, and bridge checks all pass.*

## Branch B — Audit: diagnose an existing human-doc tree

Entry: an existing human-first tree needs diagnosis. It checks source
resolution, claim traceability, freshness, bridge direction, artifact need, and
plain-language limits separately, asks the owner to confirm each fix, and
completes with a numbered findings list.

1. **Check source resolution.** Confirm every `Sources:` header resolves to an
   authored doc. Flag any source that points to code, an issue, a commit
   message, or a human-first doc.
   *Done when: each header is marked pass or fail with evidence.*
2. **Check claim traceability.** Sample claims in each human doc and confirm
   each traces to a span in its declared sources. A claim with no source is a
   defect.
   *Done when: sampled claims are marked traceable or defect with fix.*
3. **Check freshness.** Confirm each `Derived:` stamp postdates its sources. A
   source committed after the stamp fails the gate. See
   `reference/coherence.md`.
   *Done when: each doc is marked fresh or stale with evidence.*
4. **Check bridge direction.** Confirm links point one way, human to AI, and no
   AI doc links into `docs/human/`. See `reference/coherence.md`.
   *Done when: each link direction is marked pass or fail.*
5. **Check artifact need.** Confirm each artifact still has a reader and a
   question from `reference/routing.md`. Flag any artifact created without
   audience demand.
   *Done when: each artifact is marked needed or dormant-until-used.*
6. **Check plain-language limits.** Check jargon budget, reading level, and
   tone against `reference/routing.md`. Flag unexplained terms and
   non-bridged depth.
   *Done when: each doc is marked within budget or over with fix.*
7. **Route fixes and confirm.** For each finding across the six checks, assign
   a fix and ask the owner to confirm each fix before editing. Do not batch
   silent fixes.
   *Done when: every finding has an owner-confirmed fix.*
8. **Finish with a plan.** Output a numbered findings list, each with its fix
   and owner, and run the final `unslopify` audit on the audit prose before
   publishing.
   *Done when: the numbered, owned findings list is published and the final
   audit passes.*

## Branch C — Maintain: keep the human view coherent during normal work

Entry: an authored source changed.

1. **Map changed sources to affected Derived docs.** Read the changed authored
   files and the `Sources:` headers of the human docs. Only docs whose sources
   intersect the change set are affected.
   *Done when: the affected doc list is produced and defended.*
2. **Decide if artifact scope changes.** If the change introduces a new
   audience, decision type, or invariant that needs a new artifact or retires
   one, ask the owner to approve the scope change. Otherwise, do not ask for
   approval when artifact scope is unchanged; regenerate in place.
   *Done when: scope change is approved when needed, or marked not applicable
   when the set is stable.*
3. **Regenerate affected docs.** For each affected doc, regenerate its claims
   from its sources in the same diff. Preserve valid `Derived:` and `Sources:`
   headers, one-way Bridge links, and glossary links on first use. Keep
   same-diff regeneration and dormant-until-used categories as in
   `reference/coherence.md` and `reference/templates.md`.
   *Done when: each affected doc reflects its current sources.*
4. **Add one Decision journal entry for each new accepted ADR.** In the same
   diff, append one entry per new `Status: accepted` ADR. Derive the entry only
   from the ADR; the linked issue remains a discussion link, not a derivation
   source.
   *Done when: the journal links every accepted ADR and no entry derives from
   commit messages when the ADR is missing.*
5. **Run the final checks.** Update `Derived:` stamps to the commit date,
   run the `unslopify` final audit on the regenerated prose and record its
   completion report, then confirm the gate passes for human docs.
   *Done when: headers are valid, the prose audit passes, and the gate passes.*

## Reference

- `reference/routing.md` — audience routing, the derivation contract, tone and
  plain-language budgets.
- `reference/templates.md` — the four artifacts, the derived header, and dormant
  rules.
- `reference/coherence.md` — the prevention stack, the freshness rule, and
  adaptation.
