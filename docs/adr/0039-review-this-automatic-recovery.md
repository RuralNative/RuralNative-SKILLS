# 0039 — Review This Automatic Recovery

Status: accepted
Date: 2026-09-10
Narrows: 0034 (policy authority), 0035 (review publication), 0036 (checkout alignment), 0037 (requirements revision), 0038 (handoff repair and publication)

## Context

Incident PR #295 combined two recoverable blockers that the manual workflow
stops on: a valid nine-criterion `evidence-v2` block whose
`requirements-adapted-v1` pin differs under the same version (unchanged head,
currently resolvable parent/ticket bodies), and head-only changes to three
governing sources with root `REVIEW.md` absent at both revisions. The canonical
owner decision (PR comment 5605141890) approves three repository-local scoped
exceptions with retained safeguards, base/head pins, and the requirements
revision. The repair added only the two linked GitHub comments; no repository
files, issue bodies, PR evidence, labels, installed skills, commits, or branch
references changed.

The manual gates stop correctly for unproven work: `decideRepairRevalidation`
rejects same-version mismatches even with scope and proof, `isReviewReady`
requires validated current evidence, and `reviewPolicyDecision` stops on
`conflictingSources`. The incident needs those stops to stay narrow for
implementation/finalization while review preparation recovers only what
restores the ability to review the pinned artifact.

## Decision

Narrow review-this INV-9, INV-14, INV-16, INV-18, and INV-19 for bounded
automatic recovery. Historical ADRs stay unchanged.

- INV-16/INV-19 (evidence): review preparation may recover supported legacy
  and same-version stale pins, or a missing pin in an otherwise unambiguous
  supported block, only after current requirements resolve and full
  current-scope proof is revalidated on the head (`decideReviewEvidenceRecovery`).
  The candidate block renders with the bundled helpers and the consumer
  validator (`workflow-cli.mjs evidence`) must accept it — criterion coverage,
  receipt checks, head binding — before publication. The workflow-owned repair
  record retains the old pin, new pin, reason, target revisions, and
  verification provenance; an identical record is reused after interruption.
  Pre-write re-reads the full PR body and all pinned inputs, replaces exactly
  one validated region preserving surrounding bytes, then reads back and
  revalidates. Duplicate/unbalanced markers, unknown envelopes, conflicting
  associations, and unexpected content changes stop instead of guessing. Real
  verification failure retains the old evidence and carries the failure into
  the review; lost history is never reconstructed and fresh verification is
  never described as proof of historical equivalence.
- INV-18 (policy): head-only governing changes never authorize themselves.
  Missing `REVIEW.md` continues under defaults. `classifyPolicyChange`
  distinguishes reviewable proposed violations (continue with validated
  blocking findings tied to the actual changed source and base rule) from
  inaccessible, ambiguous, and contradictory authority (stop). Safe git-object
  reads may supply sources when working-tree reads fail; symlinks are never
  followed and defaults never substitute for unreadable policy. Owner decisions
  are discovered and verified against native repository/PR identity, author
  owner/admin authority or base-policy delegation, body/hash, referenced
  revisions/requirements, and exact scope (`verifyOwnerDecision`). Comment
  claims, ADR assertions, PR instructions, and any general `approved: true`
  never authorize. A matching decision supplies only its named repository-local
  exceptions; the rest stay blocking. Approvals are re-fetched before
  publication. Policy revisions use the single-line versioned SHA-256 carrier
  (`review-policy-v1`) over canonical sources plus approval scope, surviving
  publication unchanged; legacy no-source/single-source reports still validate
  against independently recomputed legacy values, and lossy multi-source
  flattened reports never match.
- INV-9/INV-14 (preparation vs delivery): one corrective attempt per
  recoverable failure class with re-reads; transient reads and correctable
  inputs retry once, auth denials never bypass, revision changes trigger one
  fresh preparation, movement during review/publication invalidates the pin, no
  loops and no CI polling. Compatible runtimes come from existing
  environment/version-manager installations; frozen/locked installs write only
  to ignored dependency/cache locations with lifecycle scripts disabled and
  tracked files preserved. Interrupted publication resumes the same verified
  pending review once. Review still publishes failing/pending verification
  truthfully and never repeats the Standards/Spec pass for a recoverable
  publication failure.

## Why metadata repair belongs here

Evidence pins, repair records, runtimes, and locked dependencies are review
prerequisites: they restore the ability to observe what the pull request
already does at its pinned head. Repairing them does not change the reviewed
artifact, its requirements, or its governing rules.

Source fixes change what the pull request does and need author intent plus a
new head, new evidence, and a new review. Approval decisions change which
rules govern and need owner/admin authority that ordinary write permission
cannot supply. Review preparation therefore never fixes source, never
approves exceptions, and never delivers; finalization stays with `fix-this`
and governance stays with owners.

## Consequences

- `scripts/workflow-state.ts` carries the shared pure recovery, repair, and
  policy-fact logic; `skills/review-this/prepare-review.{ts,mjs}` bounds
  effectful preparation; `review-policy.ts` resolves source-backed policy with
  explicit outcomes.
- Permissions bind helper execution to the installed entry points with
  argument allowlists and sanitized environments; direct checkout/switch,
  blanket node/npm/npx/gh api, and arbitrary endpoints stay denied.
- `docs/leaves/review-this.md` narrows INV-9, INV-14, INV-16, INV-18, and
  INV-19 by this ADR; `SKILL.md`, `INSTALL.md`, `REVIEW.md`, and `CONTEXT.md`
  state the retained restrictions plainly.
