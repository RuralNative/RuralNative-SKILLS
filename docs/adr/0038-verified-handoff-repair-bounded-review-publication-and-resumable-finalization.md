# 0038 — Verified handoff repair, bounded review publication, and resumable finalization

Status: accepted
Date: 2026-09-09
Narrows: 0034 (delivery repair), 0035 (review publication and fix resumption),
0036 (review publication boundary), 0037 (adapted intake and revision errors)

## Background

A live handoff exposed four gaps between the workflow stages. The parent
specification #287 in the incident repository carried both `## Solution` and
`## Settled decisions`, twelve criteria under `Project-level acceptance
criteria`, and a ticket with nine checkbox criteria under an alternate
template. The installed producer and consumer disagreed about the
requirements pin: the old evidence pin was `requirements-v1`, while current
parsing resolves the pair as adapted or stops on coexistence. Review
publication could not capture the native review identity its own handoff
requires, and fix-this lost its checkpoint after its own push and rejected
merged targets before bookkeeping. The audit recorded no proof that any
publisher edited the incident requirements after implementation; pin
inequality alone never proves a requirements edit.

## Decisions

- A requirements revision is emitted only for resolved requirements.
  `requirementsRevision` throws a typed `RequirementsResolutionError` naming
  the failing role or roles and their diagnostics before hashing any body.
  Every caller and CLI boundary treats the throw as a stop with `needs-info`;
  there is no default, partial-body, or agent-computed replacement pin.
  Diagnostics distinguish resolution failure, a missing or malformed or
  unsupported pin, an incompatible contract, and a revision mismatch whose
  cause is unproven. Only proven content changes are described as changed
  requirements.
- Consumption treats a body carrying both `## Solution` and
  `## Settled decisions` as adapted: the complete normalized body is
  fingerprinted with both homes retained, and coexistence is never called a
  contradiction. Strict canonical publication validation still rejects such a
  body, so new canonical output keeps one settlement home per role.
- Adapted intake recognizes heading-styled acceptance sections whose label
  ends in `acceptance criteria` (for example `Project-level acceptance
  criteria`) alongside the exact `Acceptance criteria` label; duplicate
  acceptance sections, unbalanced workflow markers, duplicate or missing
  criterion IDs, and ambiguous records still stop. Parent criteria resolve
  with their issue-scoped identity (`#287:AC-1` and `#288:AC-1` are different
  obligations); implementation evidence covers the ticket's active criteria,
  and inherited parent contracts stay in the fingerprint without requiring
  one ticket to finish its siblings' scope.
- Each workflow stage executes a bundled validator command
  (`workflow-cli.mjs` generated into all four packages) before writes and
  again over published read-back artifacts. The command checks Node 24+,
  computes revisions and active-criterion coverage itself, and returns JSON
  with exit 0 for valid input, 1 for contract rejection, and 2 for
  input/runtime failure. It runs inside isolated copies without repository
  dependencies. Runtime metadata stays dependency-free so execution works
  inside a CommonJS target too.
- `/plan-this` ships literal canonical parent and ticket bodies in
  `skills/plan-this/reference/canonical-bodies.md`, and the publication rules
  override the delegated `/to-spec` and `/to-tickets` default templates
  without modifying those external skills. Publication validates before
  approval, publishes without claimable labels, reads back the actual bodies,
  native parent links, and the complete blocker graph, and applies
  ready/blocked labels only after canonical and consumer checks pass.
  Reused issues follow uncertain publication; read-back mismatch stops
  readiness and reports the partial state.
- `/implement-this` runs an approved repair branch before ordinary stale-pin
  rejection: one same-repository open PR with the exact ticket association
  and a clean matching checkout may be recovered after the full current scope
  and real proof are revalidated, with the old pin and repair reason retained
  as provenance. Publish fresh evidence only after successful revalidation;
  never call a legacy pin proof of historical equivalence. At delivery the
  run re-reads requirements, verifies the pushed head, publishes one closing
  reference plus evidence block in the same operation, and runs the review
  consumer's validator against the read-back PR; evidence IDs must match the
  resolved active ticket criteria.
- `/review-this` publishes one complete, verifiable review as one bounded
  step: refresh pinned inputs, create a pending review at the pinned commit,
  retrieve the native identity and comment IDs, render the final body, submit
  that same review with the body, read it back, and validate. A callable
  procedure with an injectable transport and a review-only
  `publish-review.mjs` entry point uses an allowlisted `gh` adapter with
  argument arrays, never shell interpolation. Repository/PR, native ID,
  author permission, commit, source URL, and comment ownership are validated
  independently. The native submission timestamp is omitted while pending and
  obtained from GitHub after submission; a supplied timestamp must match
  observation. Uncertain responses read back before retrying; pending CI and
  failed CI publish truthfully with a non-passing result. Pending publication
  never authorizes fixes, and review never repairs the PR body.
- `/fix-this` consumes pure evidence render/upsert helpers from the shared
  core and maintains strict `fix-progress-v2` receipts: target, ticket, and
  parent, source review, a digest over the deterministic rendering of the
  validated source handoff, started and resulting head/base, complete finding
  dispositions, verification receipts, the intended remote operation,
  completed steps, and a confirmed merge receipt. Legacy `fix-progress-v1`
  checkpoints stay diagnostic input, never permission to skip work. A fresh
  entry keeps clean HEAD = PR head = reviewed head; a resume validates the
  original review on its original revisions and independently validates the
  checkpoint's resulting commit, ancestry, unchanged requirements and policy,
  dispositions, and exact local/remote state. Confirmed merged PRs resume
  bookkeeping only; closed-unmerged PRs stop. The intended result is updated
  and read back before push or merge, and remote state is observed before
  marking completion. `isFixEligible` consumes validated source-review and
  resulting-state facts, never an unchecked status string.
- Node 24 or newer is an explicit runtime prerequisite for the bundled
  commands; root and skill runtime metadata declare it. Repository checks
  align with that prerequisite where needed.

## Why

The four stages exchanged artifacts one direction only: each producer
published prose plus a machine block and trusted its own write response, and
each consumer trusted the block without mechanical validation of the actual
published artifact. Two real bodies then failed resolution at the boundary
between canonical and adapted parsing, review could not complete the handoff
it had already promised, and fix-this could not resume after its own
interruption. Bounded, verified, read-back-checked publication at each stage
replaces write-response trust without widening any stage's authority.

## Consequences

- The shared core (`scripts/workflow-state.ts`) gains the typed resolution
  error, suffixed acceptance-section intake, criterion coverage helpers,
  shared evidence render/upsert helpers, review publication validation
  pieces, and `fix-progress-v2` render/parse/reconciliation. Generated
  copies stay byte-identical, and drift checks cover every shipped runtime
  file.
- plan-this INV-12/INV-13, implement-this INV-15/INV-16, review-this
  INV-9/INV-14, and fix-this INV-2/INV-5/INV-7/INV-11/INV-13/INV-15 wording
  narrows with this decision; leaf docs, stage docs, and documentation
  fingerprints update with the code.
- Adapted fingerprints remain strictly more sensitive than v1. Canonical v1
  serialization is unchanged; valid fixtures for `requirements-v1`,
  `requirements-adapted-v1`, `evidence-v2`, and `review-handoff-v1` keep
  their serialization. Historical ADRs stay verbatim as evidence.
- Work evidence stays in the issue tracker, not in new repository audit
  documents.

Activation: this decision governs new invocations of all four commands from
today. The four skills roll out from the same repository revision, and the
incident PR recovers through `/implement-this`'s verified repair branch
without review publication or merge.
