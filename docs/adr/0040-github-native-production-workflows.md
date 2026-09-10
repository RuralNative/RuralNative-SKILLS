# 0040 — GitHub-Native Production Workflows

Status: accepted
Date: 2026-09-10
Narrows: 0031 (single-target), 0033 (review-only), 0034 (self-contained handoffs), 0035 (fix-this final stage), 0037 (criteria), 0038 (verified handoff and publication), 0039 (automatic recovery)

## Context

Production stages computed decisions from caller-supplied facts and text
parsing instead of observed GitHub records. Review publication reused the
claimed reviewer permission as observed permission, accepted pending drafts by
commit equality alone, and could not create the native inline comments the
skill promises. Comment reads failed into an empty list. Closing-reference
parsing did not check repository identity. Delivery hard-coded `main`.
Finalization required a custom checkpoint even after GitHub confirmed the
merge, and required the checkpoint author to equal the reviewer.

## Decision

Use native GitHub records as authority. Each stage reads current native
facts, computes the permitted next operation, performs it, and reads back
before recording success. A timeout reconciles, never blindly replays.

- Review publication uses native `COMMENT` reviews by default. Blocking
  findings stay explicit mandatory fix input. Never select `APPROVE` or
  `REQUEST_CHANGES` from finding counts. Non-default events need explicit
  human intent and GitHub eligibility; never retry rejection as another
  event. Existing approved and change-requested reviews stay readable.
  Required independent approvals stay GitHub's job.
- Read and pin the repository default branch. Use it for new delivery and
  finalization; stop on a mid-run change or an incompatible existing PR.
  Never retarget silently. `implement-this` INV-5 and INV-16 and `fix-this`
  INV-14 narrow for the pinned default branch instead of hard-coded `main`.
- Authorize reviewer, fixer, and checkpoint writer independently. A verified
  collaborator may fix another person's review. Keep the original review;
  check GitHub permission or narrowly scoped source-backed project
  authorization. `fix-this` INV-2, INV-5, and INV-15 narrow for independent
  fixer authority and native-state recovery. `review-this` INV-9 and INV-14
  narrow for owned pending-review recovery and independent provenance:
  permission comes from a fresh read, never the handoff payload or
  `author_association`; movement between still-authorized collaborator roles
  alone does not invalidate review content.
- A confirmed native merge allows bookkeeping-only recovery without a
  current checkpoint. Check exact PR and issue associations and remaining
  operations. Never invent test receipts, repeat a merge, or claim an
  externally merged PR passed this workflow.
- Keep explicit human stage invocation, single-target and current-checkout
  execution, mandatory local fix verification, and the no-force-push,
  no-admin-override, no-CI-polling, no-auto-merge, and no-automatic-next-stage
  boundaries. Historical ADRs stay unchanged.

## Consequences

- `scripts/workflow-state.ts` stays pure and carries the shared checks;
  `scripts/github-facts.ts` with `github-facts.mjs` carries the small shared
  native reads; `skills/review-this/gh-review-transport.ts` paginates REST
  lists and creates validated inline comments; `skills/fix-this/gh-fix-transport.ts`
  carries the bounded native merge and bookkeeping writes.
- Failed comment reads block publication success. Empty claimed comment sets
  pass only against a complete empty observation. Unrelated pending drafts
  never adopt at the same commit.
- Native closing links with full repository identity decide PR-to-ticket
  association; `Closes #<ticket>` text stays presentation for new PRs.
- Leaf docs narrow the named invariants by this ADR; `SKILL.md`,
  `INSTALL.md`, `REVIEW.md`, and glossary entries state the retained limits.
