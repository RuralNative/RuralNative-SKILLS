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
  `unslopify` for prose quality — load it before any user-visible prose and run
  a final audit before publishing; parent scope and decisions outrank prose
  rewrites.
---

# document-for-agents — the doc-cache lifecycle

Documentation is a **cache** of the codebase: it stores what re-deriving from
code would cost. Caches have a coherence problem — entries go **stale**, and a
stale entry misleads with confidence where an empty cache would force a read of
the source. This skill runs the coherence protocol.

A **seam** is a module with one distinct responsibility that an agent edits as
a unit: its own directory, entry files, tests, and — once the tree is
established — its own leaf doc.

## Hard dependency: `unslopify` — prose quality

This skill declares `unslopify` as a hard dependency. The prose-quality
contract in `skills/unslopify/SKILL.md` must be active for every workflow that
produces user-visible prose.

**Load order.** Load `skills/unslopify/SKILL.md` before the first interview
question, progress update, draft, comment, issue body, or final summary. Keep
its scope, protected-content, and rewrite contracts active while drafting and
revising. Do not publish or complete a documentation change without a final
`unslopify` audit on the exact prose the reader will see.

**Scope belongs to the caller.** This skill owns scope. Standalone audits may
request a repository sweep; routine maintenance passes only changed prose. Pass
the chosen scope to `unslopify` without expansion. When `unslopify` runs as a
standalone cleanup, it uses explicit scope the human provides; when it runs
under this skill, this skill's chosen scope governs.

**Parent decisions outrank prose rewrites.** Factual correctness, tier routing
from `reference/classify.md`, glossary terms and their forbidden synonyms, seam
invariants, derivation rules for generated content, and approval gates are
authoritative. `unslopify` may not override an ADR, glossary entry, leaf
invariant, or workflow decision, and it may not change facts, numbers, dates,
citations, or invented sources to satisfy a style finding. If a style finding
conflicts with a parent decision, the parent decision stands and the finding is
rejected with reason.

**Missing dependency.** If `skills/unslopify/SKILL.md` is absent, stop the
workflow before the first user-visible prose and emit the exact registry-lane
install instruction: `npx skills add RuralNative/RuralNative-SKILLS --skill
unslopify` then retry. Do not draft, file an issue, or publish. Missing Python
for the optional scanner at `skills/unslopify/scanner.py` does not stop the
workflow; continue model-only without weakening scope or preservation.

**Catalog ownership.** This skill does not copy the `AIT-*` pattern catalog. It
references `unslopify` for all lexical, structural, formatting, conversational,
evidence, and voice findings. Do not duplicate rule definitions here; see
`skills/unslopify/reference/parity.md` for the canonical catalog.

**Completion audit.** Before marking a workflow complete or publishing an
issue, PR description, or generated doc, run `unslopify` on the final prose
and record its completion report: scope used, accepted and rejected findings,
scanner availability, protected-content status, and preservation audit result.

## Principles — every branch obeys these

1. **Recoverability.** If reading the code answers a question, the docs must
   not answer it by restating the code. Docs exist for what code cannot
   express: decisions, vocabulary, invariants, ownership.
2. **Code wins.** When a doc and the code disagree, the code is correct. Fix
   the doc in the same change and flag the discrepancy — never resolve it
   silently.
3. **Drift tiers.** Claims decay at different rates; place each claim on the
   lowest-decay tier that still serves its reader. Vocabulary and invariants
   decay slowest; pointers decay slowly and are mechanically checkable;
   navigational prose decays; restatements decay fastest. Generated artifacts
   cannot decay at all — the code is their only input. Work docs are dead on
   arrival — true once, false forever.
4. **Two hops.** Every fact an agent needs is at most two links from the
   index, so re-orientation after context compaction is one small fixed read.
5. **Budgets.** Index under 150 lines; leaf docs 1–2 minute reads; policy docs
   under a page; generated docs carry slice instructions. The context window
   is priced, not free.
6. **Size to the codebase.** The cache earns its coherence cost only past a
   threshold. A repo a single session can fully hold gets an index, a
   glossary, and a conventions policy; ADRs, the harness, and generated
   artifacts scale in as sessions multiply and decisions accumulate. When
   unsure, start smaller than you think.

## Boundaries

This skill governs the documentation system — tree, decisions, vocabulary,
harness. The internal design of the code (deep modules, abstractions, code
seams) is code-architecture work, not this skill's job.

## Branch A — Establish: build the cache for a codebase with none

1. **Size the tree.** Classify the codebase by who will maintain it: a single
   session (minimal), sessions over time (standard), or multiple agents and a
   long life (full). Choose the tier set — minimal: index + glossary +
   conventions; standard: + one leaf doc per seam + ADRs as decisions land;
   full: + the harness, generated artifacts, scorecard.
   *Done when: the tier set is chosen and defended; a minimal repo has no ADR
   directory and no harness yet.*
2. **Map the seams.** Identify the modules an agent can edit, each with a
   distinct responsibility, its entry files, and its test location. Produce
   the seam table: doc | responsibility | code root | tests.
   *Done when: every editable module is a row; no row lacks a code root.*
3. **Inventory the unrecoverable.** Walk the code for facts reading it cannot
   reveal: decisions and rejected alternatives, vocabulary with forbidden
   synonyms, invariants and limits, conventions, wire contracts. Classify each
   with the routing table in `reference/classify.md`.
   *Done when: every fact has a tier; none is left unclassified.*
4. **Create the tree.** Index (`AGENTS.md` + `ARCHITECTURE.md`), one leaf doc
   per seam, an ADR directory, a glossary, one conventions policy, a generated
   directory with regeneration scripts where schemas or contracts exist, and a
   work-docs policy whose default is "work docs live in the issue tracker, not
   the repo." The glossary, the policy set, the debt registry, and the
   vendor-facts entry are created per the templates in `reference/templates.md`.
    *Done when: the index's coverage table matches the docs on disk, and the
    final `unslopify` audit on all created prose passes before publishing.*
5. **Wire the harness.** Install the change-aware gate from
   `reference/harness.md` — ten checks: coverage ↔ disk, same-diff freshness,
   new-seam-requires-doc, decision status parse, work-doc expiry, seam-table
   completeness, generated freshness, policy coverage, debt register,
   invariant identifier integrity. Hook it into the project's standard check
   path — a script entry, pre-commit hook, or CI job — so it runs without
   being remembered.
    *Done when: the harness fails on a deliberate violation and passes after
    the fix — proven by running both, and the final `unslopify` audit on the
    harness prose passes.*

## Branch B — Audit: diagnose an existing doc system

1. **Label every file.** Classify each existing doc into a tier: pointer,
   decision, vocabulary/invariant, policy, restatement, generated, work.
   Nothing is exempt — unindexed and unharnessed files get labels too.
   *Done when: every documentation file in the repo has a tier.*
2. **Measure drift.** For authored docs, check claims against code; for
   generated docs, check regeneration timestamps; for work docs, check age
   against expiry.
   Measure tier-first: the harness owns the mechanical tiers (pointers,
   statuses, timestamps, expiry, debt form); spend manual budget on the
   highest-decay claims — navigational prose and restatements — before slow
   tiers.
   Name the tier each violation belongs to.
   *Done when: a numbered findings list exists, each finding with its tier
   and its fix.*
3. **Route the findings.** Durable facts → their tier (decision → ADR, term →
   glossary, limit → invariant); restatements → generate or delete; work docs
   → migrate durable content, then delete; superseded decisions → new ADR with
   `Supersedes`, old record untouched.
   *Done when: every finding has a landing spot; none is deferred with no
   owner.*
4. **Finish with a plan, not a report.** Output the tree delta (files created,
   edited, deleted), harness changes, and the token cost of the post-change
   re-orientation read.
    *Done when: the output is diff-able — an executor can apply it without
    re-deriving the analysis, and the final `unslopify` audit on the plan prose
    passes before publishing.*

## Branch C — Maintain: keep the cache coherent during normal work

1. **Re-verify invariants.** Before a seam change or after re-orientation,
   read that seam's Non-negotiables and confirm each still holds; on a
   violation, code wins — fix the code or supersede the invariant via a
   decision.
2. **Same diff.** A change touching a seam updates its doc in the same commit;
   a fact discovered mid-work lands on its tier in the same change — new term
   (with its `_Avoid:` list) in the glossary, new decision in an ADR, new
   limit in the seam's invariants, new debt item (`DEBT-N`) in the debt
   registry.
    A rule the skill is silent on is born in the repo's official structures —
    policy, decision record, or glossary — never a side channel.
3. **Code wins.** On a doc/code conflict: trust the code, fix the doc, flag
   the discrepancy in the change description.
4. **Supersede, don't rewrite.** A changed decision gets a new ADR; the
   original record is left verbatim.
5. **Work docs die with the work.** Plans and audits are mined for durable
    facts and deleted; nothing durable cites them.
6. **Run the `unslopify` final audit and the harness.** Run `unslopify` on the
    exact prose the reader will see, record its completion report, then keep
    the scorecard current: coverage, stale counts,
   ADR statuses, invariant re-verification. A red harness is a work item, not
   a warning.

## Reference

- `reference/classify.md` — the routing table: claim type → tier →
  stay-true mechanism.
- `reference/harness.md` — the portable gate: checks, adaptation rules,
  scorecard.
- `reference/templates.md` — mini-ADR, leaf doc, index, policy set,
  vendor-facts, glossary, debt registry, loading protocol.
