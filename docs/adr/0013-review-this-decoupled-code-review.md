# 0013 — review-this decoupled from code-review hosting

Status: superseded
Date: 2026-08-21
Superseded by: ADR-0014 — three-skill development workflow (review through closure)
Parent specification: issue #123
Split decisions: #124, #125

Decision: The review stage ships as its own seam, `review-this`, a fixed-template adapter invoked as `/review-this <fixed-point>` that delegates the two-axis review to repository-independent `/code-review` with repository-owned `/unslopify` active. `implement-this` keeps only implementation and delivery: a single delegated `/implement` stage plus the direct-main or manager-worktree pull-request delivery path. It computes a fixed review base for rebase or pull-request creation but no longer runs review internally; callers who want the chaining run `/review-this <base>` explicitly. `/code-review` itself stays outside this shelf and is unchanged.

Why: One skill that implements, reviews, and delivers forced every consumer to accept all three stages. Splitting lets a caller review any fixed point without an implementation run, keeps the review contract pinned to one seam, and leaves `/code-review` free to evolve in its own home. The split also removes the duplicated review prefix that previously lived inside `implement-this`'s delivery branches.

Rejected alternative:

- Keep review inside `implement-this`. That preserves one-command chaining but welds two distinct contracts together: every implementation run pays review overhead whether or not it is wanted, review cannot be invoked on work this skill did not produce, and each change to the review prefix mutates the implementation seam. The explicit two-step invocation (`/implement-this #<n>`, then `/review-this <base>`) costs one extra command and loses nothing else.

Consequences:

- The glossary's skill naming convention carries `review-this` in the task-scoped fixed-template exception alongside `plan-this` and `implement-this` (ADR-0006), because the identity is the user-facing slash command.
- `ARCHITECTURE.md` gains the `review-this` seam row, leaf coverage row, and this ADR in its non-seam list and coverage table; no entry in `docs/debt.md` is created by the split.
- `docs/leaves/review-this.md` and `docs/leaves/implement-this.md` reference this decision and state each other's scope boundaries.
- `README.md` does not list the workflow adapters on the shelf table; the README contract test pins their absence there.
- Composition tests for both seams keep encoding the split: single-stage `/implement` flow here, fixed-template review prefix in `review-this`.

Superseded 2026-08-22 by ADR-0014: the review stage no longer reports a fixed-point diff; it owns one pull-request wave through merge, dependent promotion, final verification, and parent closure via `/review-this #<spec>` from the control workspace. History preserved.
