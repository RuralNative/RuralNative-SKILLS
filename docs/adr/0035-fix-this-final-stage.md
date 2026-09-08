# 0035 — Fix-this final stage after review

Status: accepted
Date: 2026-09-08

Decision: `/fix-this` finalizes exactly one reviewed pull request.

- `/fix-this <PR-number>` (or a same-repository PR URL) selects one open PR,
  never an implementation issue. Fork mutation, multiple targets, ambiguous
  associations, and cross-repository targets stop before mutation.
- The stage consumes only a validated `review-handoff-v1` block from the
  latest completed non-dismissed native review, with native review identity,
  author, permission, commit, and source observed separately. Forged,
  partial, dismissed, stale, or mismatched reports never authorize work.
- The stage addresses every published blocking and advisory finding, resolves
  merge conflicts without rebasing published history, and records proven
  dispositions. Unresolvable findings and conflicts needing a new product
  decision stop merge with evidence.
- No additional review runs after fixes or conflict resolution. Local
  verification is mandatory; the stage adds no CI wait and no CI merge gate.
  GitHub branch protection remains authoritative: a rejected merge is a
  restriction report, never an override. Successful local checks without CI or
  fresh review are weaker assurance; that tradeoff was explicitly selected.
- Checkout matching is commit-based: a clean checkout at the reviewed PR head
  matches under a branch alias, `main`, or detached `HEAD`. Dirty worktrees
  and different commits still stop. Pushes target the verified PR head ref
  only, with fast-forward updates and no force-push.
- Merge uses normal squash merge into `main` with the expected head
  constraint. A confirmed merge commit is required before bookkeeping.
  Closed-unmerged PRs never count as delivered.
- Bookkeeping closes the implementation ticket through its valid closing
  reference, removes completed-work labels while preserving unrelated labels
  and `needs-info`, promotes only direct dependents whose final blocker
  closed, and closes the parent only after a complete nonempty child
  enumeration. Partial failures are reported as `merged; bookkeeping
  incomplete`. Reruns resume from the `fix-progress-v1` checkpoint without
  repeating verified commits.
- `/review-this` stays review-only. It publishes the readable review plus the
  machine-readable handoff, validates publication by read-back, then directs
  the user to `/fix-this`; it never launches the final stage.

Why: checkout validation rejected clean checkouts on branch aliases even when
the commit matched the PR head, and no owned stage existed for applying
review findings, resolving conflicts, merging, and completing tracker
bookkeeping. Review-only publication needed a compatible consumer without
turning the reviewer into a fixer or merger.

Consequences:

- The shared workflow-state core gains the review-handoff validator, fix
  finalization eligibility, and fix-progress checkpoint. Generated copies now
  include `skills/fix-this/`.
- Legacy `isMergeEligible` stays untouched for existing consumers; `fix-this`
  uses its dedicated finalization gate.
- The pipeline becomes `plan-this -> implement-this -> review-this ->
  fix-this`. Producer and consumer must upgrade together for the handoff
  contract.

Activation: this decision governs new `/review-this` and `/fix-this`
invocations from today.
