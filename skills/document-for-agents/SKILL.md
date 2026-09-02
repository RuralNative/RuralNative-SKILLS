---
name: document-for-agents
description: >-
  Run the doc-cache lifecycle for a codebase: establish, audit, or maintain
  architecture documentation so AI agents navigate and modify code accurately.
  Use when the user asks to set up agent-facing docs (AGENTS.md/ARCHITECTURE.md
  index, ADRs, glossary, a docs-check harness), says docs are stale, drifting,
  or out of sync with code, when a project grows past its documentation tier
  (more seams, the first durable decision, multi-agent coordination, generated
  artifacts), when an ADR's rationale is at risk of being lost, or when docs
  need restructuring around the why (decisions, invariants, vocabulary) instead
  of the restated what (file lists, schema dumps), and wants a lightweight ADR
  process. The lifecycle adapts its tier automatically, captures decision
  rationale while reasoning is available, and blocks stale docs with a seam
  code fingerprint. Other skills reach this skill when a documentation system is
  needed for their workflow. Hard dependency on `unslopify` for prose quality,
  load it before any user-visible prose and run a final audit before publishing;
  parent scope and decisions outrank prose rewrites.
---

# document-for-agents: the doc-cache lifecycle

Documentation is a **cache** of the codebase: it stores what re-deriving from
code would cost. Caches have a coherence problem: entries go **stale**, and a
stale entry misleads with confidence where an empty cache would force a read of
the source. The lifecycle has two equal outputs: **cache accuracy**, keeping
the tree true to the code, and **attention control**, bounding what an agent
reads through a runtime orientation resolver with strict byte caps on the
resolved orientation set (ADR-0024). This skill runs both, and it keeps the
cache's **tier** matched to the project as the project grows (ADR-0028).

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
5. **Budgets.** Resolved orientation sets are strict byte caps on whole
   sources, resolved at runtime from affected seams, the compact architecture
   index, whole bounded leaves, leaf-named glossary entries, and only the
   decisions and policies a leaf marks with an explicit `— requires.`
   declaration; compact citations — bare links or prose mentions — stay
   navigation and never load (ADR-0024, ADR-0025). Index under 150 lines;
   leaf docs 1 to 2 minute reads; policy docs under a page. The context window
   is priced, not free.
6. **Size to the codebase, then keep it sized.** The cache earns its coherence
   cost only past a threshold, and the threshold is crossed by evidence, not by
   a one-time guess. Start smaller than you think; when the preflight evidence
   demands a higher tier, promote it automatically and additively in the same
   run (ADR-0028). Never demote automatically.

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
reason. If `unslopify` is absent, stop before any draft and direct the owner
to this skill's `INSTALL.md` for the install commands; workflow execution
performs no skill downloads. Missing
Python for the optional scanner does not stop the workflow, continue
model-only without weakening scope or preservation. Before publishing or
marking complete, run the final `unslopify` audit on the exact prose the
reader will see and record scope, accepted and rejected findings, scanner
availability, protected-content status, and preservation result. The `AIT-*`
catalog lives in `unslopify`, see its parity reference, it is not copied here. Installed runtime resolves `unslopify` by skill identity, not by a repository-relative path.

## Preflight: every branch runs this first, and again before it finishes

The lifecycle is not a one-time build. Every branch — Establish, Audit,
Maintain, Improve — runs the same preflight before it touches anything, and
re-runs the tier and decision checks before it declares done, so evidence
raised mid-work cannot escape. The `governance.ts` reference implementation
makes each step deterministic.

1. **Resolve the tier.** Read the `Documentation tier:` line from the compact
   index, or infer it from the artifacts on disk for a legacy cache.
2. **Resolve diagnostics consent.** Run the consent checkpoint in *Optional
   diagnostics* below. A first run with no valid stored choice must ask before
   branch work starts; a remembered `enabled` or `declined` is honored without
   re-asking.
3. **Run the decision gate.** Name the choices in the requested work that would
   change what a future agent may assume — boundaries, contracts, security, data
   model, conventions, ownership. Each is a decision candidate; none may be left
   silently assumed. See *Decision capture* in Branch C.
4. **Promote on evidence.** Compute the required tier from evidence (see
   `reference/classify.md`): the first ADR-worthy durable decision or more than
   one independently editable seam raises minimal to standard; a
   review-confirmed code/doc contradiction, multi-agent or multi-package
   coordination, or a code-derived artifact that would replace high-decay
   restatement raises standard to full. A fingerprint mismatch alone is not
   confirmed drift; a review must prove a false claim first. Promotion is
   monotonic and additive: Establish, Maintain, and Improve create the missing
   higher-tier artifacts in this run without a second command or a separate
   approval, and the skill never demotes a tier automatically. Audit stays
   read-only and reports the required promotion instead of applying it
   (ADR-0028).

## Optional diagnostics: the private mistake record

This skill can keep one private record of confirmed agent mistakes that show
where its guidance failed. The record exists only by choice, and the choice is
an unavoidable first-run checkpoint, not an optional aside:

1. **Consent gates creation, and the checkpoint is unavoidable.** Ask once for
   explicit consent to create and maintain the record. No diagnostics file is
   created before the owner gives explicit consent to create and maintain it. If
   the owner declines, the topic stays closed. The choice is remembered in a
   private local consent-state record outside version control and every
   orientation set — the common Git directory for a Git repository so linked
   worktrees share it, the platform user-state directory keyed by the
   repository root otherwise — so a later run honors it without re-asking.
   Absent, corrupt, or unsupported state asks again; a failed write to the state
   record leaves diagnostics disabled and never infers consent.
2. **Every write gets notice.** Initial consent covers later maintenance, but
   before every later write, tell the owner what category of information will
   be added and that sensitive details will be removed. A write without prior
   notice breaks this contract.
3. **Revocation stops writes immediately.** On revocation, stop writing at
   once, then ask whether to keep, export, or delete the existing file. The
   skill never deletes the file without that separate choice.
4. **The files stay private.** One append-only local log, outside the doc
   cache and outside version control by default, excluded from every normal
   agent read set, alongside its private consent-state record. When creating the
   log, record its version-control exclusion, for example in
   `.git/info/exclude`, so no commit ever picks it up. Loading protocols and
   task guidance never include them. The log is
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

See `reference/templates.md` for the entry shape, the consent-state record, and
the management marker that carries provenance in generated `AGENTS.md`.

## Branch A: Establish, build the cache for a codebase with none

Entry: the repository lacks a coherent agent-facing doc tree.

1. **Size the tree.** Run the preflight. Classify the codebase by who will
   maintain it: a single session (minimal), sessions over time (standard), or
   multiple agents and a long life (full). Present the tier and defend it, then
   ask the owner to approve the tier before creating artifacts. The owner
   approves the initial tier; later growth promotes it automatically in the
   preflight, so a rebuild is never required to catch up.
   Tier artifacts: minimal is index (`AGENTS.md` + `ARCHITECTURE.md`) +
   glossary + one conventions policy; standard adds one leaf doc per seam, ADRs
   as decisions land, the applicable policy docs, the coverage manifest, an
   active seam fingerprint per documented seam, and the harness wired into the
   normal check path; full adds generated artifacts, package-local indexes,
   declared orientation routes, and the scorecard. See `reference/classify.md`
   and `reference/templates.md` for routing and template detail.
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
   *Done when: the coverage inventory matches the docs on disk for the selected
   tier — the compact index's coverage table for minimal, the harness-owned
   coverage manifest (`docs/manifest.md`) for standard and full; the compact
   index carries a `Documentation tier:` line; and the final `unslopify` audit
   on all created prose passes before publishing.*
5. **Wire the harness when the tier requires it.** When the selected tier
   includes the harness — standard and full — install the gate from
   `reference/harness.md` — eleven checks including check 2 `Seam coherence` and
   check 11 `Orientation budget` — create the harness-owned coverage manifest as
   the exhaustive tier and coverage inventory with a `Seam verification` row for
   every documented seam, and hook the gate into the project's standard check
   path so it runs without being remembered. The manifest is excluded from every
   resolved orientation set. See `reference/harness.md` for check detail and
   dormancy rules. Minimal tier skips this step.
   *Done when: for tiers with a harness, the coverage manifest exists and lists
   every covered doc, every documented seam has a reviewed `Seam verification`
   fingerprint, the harness fails on a deliberate violation and passes after the
   fix, proven by running both, and the final `unslopify` audit on the harness
   prose passes; for minimal, this step is marked not applicable.*

## Branch B: Audit, diagnose an existing doc system

Entry: an existing doc system needs diagnosis.

1. **Run mechanical checks.** Run the preflight, then the harness from
   `reference/harness.md` before manual review. It owns pointers, statuses,
   timestamps, expiry, debt form, seam-code coherence, and the declared
   orientation budget routes. Audit is read-only: it computes the required tier
   and reports a promotion it would need, but applies no change.
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
4. **Finish with a plan, not a report.** Audit makes no repository changes:
   it never creates, moves, deletes, or rewrites a file, and it never edits
   the coverage manifest. Output the tree delta, the required tier promotion,
   the fingerprint refreshes, harness changes, and the post-change re-orientation
   bytes so Improve can apply it.
   *Done when: the output is a numbered, owned, executable plan an executor
   can apply without re-deriving the analysis, and the final `unslopify`
   audit on the plan prose passes before publishing.*

## Branch C: Maintain, keep the cache coherent during normal work

Entry: a seam change or re-orientation. Generated `AGENTS.md` routes every seam
change here, so the preflight and the completion gate run as ordinary work, not
as a manual rebuild.

1. **Re-verify invariants and read the loading protocol.** Run the preflight.
   Before a seam change or after re-orientation, read the loading protocol in
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
2. **Same diff, then refresh the fingerprint.** Code changes carry their doc
   updates in the same diff and the same commit. A change to rules a policy
   states updates that policy doc, including the root review policy, in the
   same commit. Mid-work discoveries land on their tier in the same change, and
   a rule the skill is silent on is born in the repo's official structures,
   policy, decision record, or glossary, never a side channel. After the docs
   match the code, review every claim the seam's code change could have
   invalidated, correct any the code now contradicts, and refresh the seam's
   `Seam verification` fingerprint in the coverage manifest — recording whether
   the prose changed or was confirmed to still hold. A fingerprint refresh is
   valid only after that review; touching a leaf without refreshing does not
   clear the gate, and a further code change after a refresh turns it red again
   (ADR-0028).
3. **Code wins.** On a doc or code conflict, trust the code, fix the doc,
   flag the discrepancy in the change description.
4. **Capture decisions prospectively; supersede, do not rewrite.** Before
   implementation, the decision gate names each choice that changes what a
   future agent may assume; during implementation a newly discovered qualifying
   tradeoff pauses the work and is recorded before continuing. An ADR-worthy
   choice records the decision, its context, the alternatives genuinely
   considered with why each was rejected, and the consequences — written while
   the reasoner still holds them, not reconstructed later. A changed decision
   gets a new ADR, the original record is left verbatim; use the decision gate
   in `reference/templates.md` before superseding. Reversible trivia stays in
   the commit message. Completion requires an empty decision frontier.
5. **Recover lost rationale from evidence only.** When an existing ADR is
   missing trustworthy reasons, search repository history and tracker records.
   With sufficient evidence, add a separate accepted `Clarifies:` clarification
   record citing that evidence and leaving the original untouched; with
   insufficient evidence, record a cache gap with the rationale marked
   `unknown` and invent nothing.
6. **Work docs die with the work.** Plans and audits are mined for durable
   facts and deleted; nothing durable cites them.
7. **Run the final audit and the harness.** Re-run the preflight tier and
   decision checks, then run `unslopify` on the exact prose the reader will
   see, record its completion report, then keep the scorecard current. A red
   harness is a work item, not a warning.
   *Done when: the prose audit and harness both pass, the seam fingerprints are
   refreshed, and the decision frontier is empty.*

## Branch D: Improve, repair an existing doc cache

Entry: an existing cache is over budget or needs repair beyond diagnosis.
Audit stays read-only; destructive repository change in this branch lands only
through one approved Improve run, while additive tier promotion is automatic
(ADR-0028).

1. **Diagnose.** Run the preflight, then the harness and resolve the current
   orientation sets (`reference/orientation.md`) for the affected seams and
   routes. Name every over-budget route and its sources, and every stale or
   missing seam fingerprint. A legacy cache without the coverage manifest
   remains diagnosable: the manifest is created inside the previewed delta, never
   claimed retroactively.
   *Done when: every over-budget route, its contributing sources, and every
   stale fingerprint are named.*
2. **Preview.** Prepare one complete migration preview, showing the full tree
   delta: trims, additions, moves, deletions, coverage-manifest changes,
   fingerprint refreshes, and generated-doc actions, plus the resolved
   orientation bytes after the change. Preserve unrecoverable facts by routing
   durable decisions and vocabulary to their tiers, and remove code-recoverable
   restatement and work history before proposing a seam split; a seam split is
   proposed only when code ownership, invariants, entry points, and change
   cadence are independently meaningful. Additive tier promotion needs no
   approval and runs automatically; destructive change and demotion do, so show
   the preview and wait for one explicit approval.
   *Done when: one complete preview sits in front of the owner with an approval
   gate for the destructive half.*
3. **Apply.** Additive promotion already ran in the preflight; for the
   destructive half, Improve makes no changes before that approval. After it,
   apply the complete approved delta, including manifest changes,
   fingerprint refreshes, and generated-doc actions, exactly as previewed.
   Cache-gap approval may substitute or narrow sources of the resolved set but
   can never waive a cap.
   *Done when: the complete approved delta is applied.*
4. **Verify.** Run the prose audit and the harness and finish only after the
   prose audit and harness pass.
   *Done when: the prose audit and the harness both pass, and the resolved
   orientation bytes match the preview.*

## Reference

- `reference/classify.md`: routing table, tier definitions, tier-governor
  evidence, stay-true mechanisms, invariant lifecycle.
- `reference/harness.md`: the eleven checks including check 2 `Seam coherence`,
  adaptation and dormancy rules, scorecard.
- `reference/orientation.md`: the runtime orientation resolver contract — caps,
  resolution inputs, deduplication, superseded-ADR exclusion, the coverage
  manifest, failure reporting, and cache-gap approval.
- `reference/templates.md`: mini-ADR, clarification record, leaf doc, index,
  policy set, vendor-facts, glossary, debt registry, loading protocol,
  decision gate, consent-state record.
- `governance.ts`: the deterministic tier governor, seam fingerprint, and
  consent-resolution reference implementation, runnable as a CLI.
