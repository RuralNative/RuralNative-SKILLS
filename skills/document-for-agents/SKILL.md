---
name: document-for-agents
description: >-
  Run the doc-cache lifecycle for a codebase: establish, audit, or maintain
  architecture documentation so AI agents navigate and modify code accurately.
  Use when the user asks to set up agent-facing docs (AGENTS.md/ARCHITECTURE.md
  index, ADRs, glossary, a docs-check harness), says docs are stale, drifting,
  or out of sync with code, wants docs restructured around the why (decisions,
  invariants, vocabulary) instead of restated what (file lists, schema dumps),
  or wants a lightweight ADR process. Other skills can reach this skill when a
  documentation system is needed for their workflow. Hard dependency on
  `unslopify` for prose quality, load it before any user-visible prose and run
  a final audit before publishing; parent scope and decisions outrank prose
  rewrites.
---

# document-for-agents: the doc-cache lifecycle

Documentation is a **cache** of the codebase: it stores what re-deriving from
code would cost. Caches have a coherence problem: entries go **stale**, and a
stale entry misleads with confidence where an empty cache would force a read of
the source. The lifecycle has two equal outputs: **cache accuracy**, keeping
the tree true to the code, and **attention control**, bounding what an agent
reads through loading rows and token budgets that act as caps. This skill runs
both.

A **seam** is a module with one distinct responsibility that an agent edits as
a unit: its own directory, entry files, tests, and, once the tree is
established, its own leaf doc.

## Principles: every branch obeys these

1. **Recoverability.** If reading the code answers a question, the docs must
   not answer it by restating the code. Docs exist for what code cannot
   express: decisions, vocabulary, invariants, ownership.
2. **Code wins.** When a doc and the code disagree, the code is correct. Fix
   the doc in the same change and flag the discrepancy, never resolve it
   silently.
3. **Drift tiers.** Claims decay at different rates; place each claim on the
   lowest-decay tier that still serves its reader. Vocabulary and invariants
   decay slowest; pointers decay slowly and are mechanically checkable;
   navigational prose decays; restatements decay fastest. Generated artifacts
   cannot decay at all, the code is their only input. Work docs are dead on
   arrival, true once, false forever.
4. **Two hops.** Every fact an agent needs is at most two links from the
   index, so re-orientation after context compaction is one small fixed read.
5. **Budgets.** Index under 150 lines; leaf docs 1 to 2 minute reads; policy docs
   under a page; generated docs carry slice instructions. The context window
   is priced, not free.
6. **Size to the codebase.** The cache earns its coherence cost only past a
   threshold. A repo a single session can fully hold gets an index, a
   glossary, and a conventions policy; ADRs, the harness, and generated
   artifacts scale in as sessions multiply and decisions accumulate. When
   unsure, start smaller than you think.

## Boundaries

This skill governs the documentation system, tree, decisions, vocabulary,
harness. The internal design of the code (deep modules, abstractions, code
seams) is code-architecture work, not this skill's job.

## Dependency: `unslopify`

Load `unslopify` by skill identity before the first user-visible prose. Keep
its scope, protected-content, and rewrite contracts active while drafting.
Parent scope governs: routine work passes changed prose, an audit may sweep
the repository. Parent decisions outrank style findings: factual correctness,
tier routing, glossary terms and forbidden synonyms, seam invariants,
derivation rules, and approval gates stand and the finding is rejected with
reason. If `unslopify` is absent, stop before any draft and emit
`npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`. Missing
Python for the optional scanner does not stop the workflow, continue
model-only without weakening scope or preservation. Before publishing or
marking complete, run the final `unslopify` audit on the exact prose the
reader will see and record scope, accepted and rejected findings, scanner
availability, protected-content status, and preservation result. The `AIT-*`
catalog lives in `unslopify`, see its parity reference, it is not copied here. Installed runtime resolves `unslopify` by skill identity, not by a repository-relative path.

## Optional diagnostics: the private mistake record

This skill can keep one private record of confirmed agent mistakes that show
where its guidance failed. The record exists only by choice:

1. **Consent gates creation.** Ask once for explicit consent to create and
   maintain the record. No diagnostics file is created before the owner gives
   explicit consent to create and maintain it. If the owner declines, the
   topic stays closed.
2. **Every write gets notice.** Initial consent covers later maintenance, but
   before every later write, tell the owner what category of information will
   be added and that sensitive details will be removed. A write without prior
   notice breaks this contract.
3. **Revocation stops writes immediately.** On revocation, stop writing at
   once, then ask whether to keep, export, or delete the existing file. The
   skill never deletes the file without that separate choice.
4. **The file stays private.** One append-only local file, outside the doc
   cache and outside version control by default, excluded from every normal
   agent read set. When creating it, record its version-control exclusion,
   for example in `.git/info/exclude`, so no commit ever picks it up.
   Loading protocols and task guidance never include it. It is
   never task guidance: it is evidence for optional user-reviewed submission
   to the skill developer, not policy, debt, an invariant, or task guidance.
5. **Confirmed mistakes only.** Log a mistake only when it was confirmed by
   the user or proved from the prompt, code, checks, or docs. Use sanitized
   summaries with the approved fields from `reference/templates.md`: category,
   intended outcome in paraphrase, observed mistake, impact, correction,
   relevant documentation role, available pinned skill revision evidence or
   `none`, attribution confidence, and redactions applied.
6. **Sanitization is unconditional.** Entries omit raw prompts, code, secrets,
   personal data, absolute paths, repository remotes, and proprietary names.
   Entries describe evidence and correction and never become a general
   prohibition or instruction for future work.
7. **Nothing leaves the machine by itself.** No upload, network call, or
   telemetry exists. The owner reviews the file before any manual submission.

See `reference/templates.md` for the entry shape and the management marker
that carries provenance in generated `AGENTS.md`.

## Branch A: Establish, build the cache for a codebase with none

Entry: the repository lacks a coherent agent-facing doc tree.

1. **Size the tree.** Classify the codebase by who will maintain it: a single
   session (minimal), sessions over time (standard), or multiple agents and a
   long life (full). Present the tier and defend it, then ask the owner to approve the tier before creating artifacts.
   Tier artifacts: minimal is index (`AGENTS.md` + `ARCHITECTURE.md`) +
   glossary + one conventions policy; standard adds one leaf doc per seam and
   ADRs as decisions land; full adds the harness, generated artifacts, and
   scorecard. See `reference/classify.md` and `reference/templates.md` for
   routing and template detail.
   *Done when: owner approved the tier.*
2. **Map the seams.** Identify the modules an agent can edit, each with a
   distinct responsibility, its entry files, and its test location. Produce
   the seam table: responsibility, code root, tests, and a leaf doc only when
   the selected tier requires one.
   *Done when: every editable module is a row; each row has a code root; a
   leaf doc appears only when the tier requires it.*
3. **Inventory the unrecoverable.** Walk the code for facts reading it cannot
   reveal: decisions and rejected alternatives, vocabulary with forbidden
   synonyms, invariants and limits, conventions, wire contracts. Classify each
   with the routing table in `reference/classify.md`.
   *Done when: every fact has a tier; none is left unclassified.*
4. **Create the tiered tree.** Create only the artifacts the approved tier
   requires. Minimal creates the index, glossary, and conventions policy. It
   does not create per-seam leaf docs, an ADR directory, generated-doc
   directories, or the harness unless a later verified need crosses the
   threshold documented in `reference/classify.md`. Standard and full add
   only their assigned artifacts. See `reference/templates.md` for the shape
   of each artifact.
   *Done when: the index's coverage table matches the docs on disk for the
   selected tier, and the final `unslopify` audit on all created prose passes
   before publishing.*
5. **Wire the harness when the tier requires it.** When the selected tier
   includes the harness, install the gate from `reference/harness.md`, ten
   checks, and hook it into the project's standard check path so it runs
   without being remembered. See `reference/harness.md` for check detail and
   dormancy rules. Minimal tier skips this step.
   *Done when: for tiers with a harness, the harness fails on a deliberate
   violation and passes after the fix, proven by running both, and the final
   `unslopify` audit on the harness prose passes; for minimal, this step is
   marked not applicable.*

## Branch B: Audit, diagnose an existing doc system

Entry: an existing doc system needs diagnosis.

1. **Run mechanical checks.** Run the harness from `reference/harness.md`
   before manual review. It owns pointers, statuses, timestamps, expiry, and
   debt form.
   *Done when: harness output is captured and each mechanical finding has a
   tier and fix.*
2. **Label every file and measure high-decay drift.** Classify each existing
   doc into a tier: pointer, decision, vocabulary or invariant, policy,
   restatement, generated, work. Nothing is exempt. Then spend manual budget
   on the highest-decay claims: navigational prose and restatements before
   slow tiers. Name the tier each violation belongs to. See
   `reference/classify.md` for tier definitions.
   *Done when: every documentation file has a tier, and a numbered findings
   list exists with tier and fix for each.*
3. **Route the findings.** Durable facts go to their tier, restatements are
   generated or deleted, work docs migrate durable content then are deleted,
   superseded decisions get a new ADR with `Supersedes` and the old record is
   left untouched. Ask the owner to confirm each tier and fix. See
   `reference/classify.md` and `reference/templates.md` for routing and ADR
   shape.
   *Done when: every finding has a landing spot and an owner-confirmed tier
   and fix; none is deferred with no owner.*
4. **Finish with a plan, not a report.** Output the tree delta, harness
   changes, and the token cost of the post-change re-orientation read.
   *Done when: the output is a numbered, owned, executable plan an executor
   can apply without re-deriving the analysis, and the final `unslopify`
   audit on the plan prose passes before publishing.*

## Branch C: Maintain, keep the cache coherent during normal work

Entry: a seam change or re-orientation.

1. **Re-verify invariants and read the loading protocol.** Before a seam
   change or after re-orientation, read the loading protocol in
   `reference/templates.md` and that seam's Non-negotiables and confirm each
   still holds. If code and the invariant conflict, trust the code, fix the
   doc in the same change, and flag the discrepancy. If the rule itself must
   change, supersede the invariant via a decision. A task whose work would
   violate a numbered invariant is different: stop before changing code or
   docs, name the collision, and resume only when an approved decision
   supersedes or narrows the invariant; working around it silently is
   forbidden. When the orientation documents lack an unrecoverable fact the
   task needs, name a cache gap, record it in the issue tracker, and ask the
   owner for approval before widening the documentation read set; do not widen
   it until approval. The caps never block code inspection inside the affected
   seam.
   See `reference/classify.md`
   for the invariant lifecycle and `reference/harness.md` for check detail.
2. **Same diff.** Code changes carry their doc updates in the same commit. A
   change to rules a policy states updates that policy doc, including the
   root review policy, in the same commit. Mid-work discoveries land on their
   tier in the same change, and a rule the skill is silent on is born in the
   repo's official structures, policy, decision record, or glossary, never a
   side channel.
3. **Code wins.** On a doc or code conflict, trust the code, fix the doc,
   flag the discrepancy in the change description.
4. **Supersede, do not rewrite.** A changed decision gets a new ADR, the
   original record is left verbatim. Use the decision gate in
   `reference/templates.md` before superseding.
5. **Work docs die with the work.** Plans and audits are mined for durable
   facts and deleted; nothing durable cites them.
6. **Run the final audit and the harness.** Run `unslopify` on the exact prose
   the reader will see, record its completion report, then keep the scorecard
   current. A red harness is a work item, not a warning.
   *Done when: the prose audit and harness both pass.*

## Reference

- `reference/classify.md`: routing table, tier definitions, stay-true
  mechanisms, invariant lifecycle.
- `reference/harness.md`: the ten checks, adaptation and dormancy rules,
  scorecard.
- `reference/templates.md`: mini-ADR, leaf doc, index, policy set,
  vendor-facts, glossary, debt registry, loading protocol, decision gate.
