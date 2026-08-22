<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-22 · Regenerated: #136 REVIEW.md becomes doc-cache policy, review fixes · Sources: REVIEW.md, docs/leaves/document-for-agents.md, docs/leaves/document-for-humans.md, docs/leaves/unslopify.md, docs/leaves/plan-this.md, docs/leaves/implement-this.md, docs/leaves/release-skills.md, docs/adr/0011-retire-supervise-this.md, docs/adr/0012-manager-worktree-pull-request-delivery.md, docs/adr/0013-review-this-decoupled-code-review.md -->
# How information moves in plain words

The technical flow starts with a task you give to `/plan-this`.

1. Planning loads repository-owned `unslopify` before progress and reads only the focused agent cache `AGENTS.md → ARCHITECTURE.md → seam leaf → CONTEXT.md → relevant ADRs`; human pages remain derived and are not preloaded.
2. Planning publishes a parent specification, child tickets, and native GitHub dependency edges, with prose checked under unslopify scope, protected-content, preservation, and completion-report rules.
3. You pick a ready ticket — open, unblocked, unassigned — and run `/implement-this #<n>`.
4. Implementation loads `unslopify` under the same prose contract and focused cache, claims the ticket, and stops while any native blocker is open.
5. The worker runs `/implement`, updates the affected seam's leaf doc and tests, and verifies the repository: dependency install, tests, TypeScript, and the docs harness.
6. Delivery depends on where the session runs. Outside a manager worktree the work is rebased on `main`, pushed, and the ticket closes with an evidence comment. Inside a Kilo Agent Manager worktree the feature branch is pushed and a pull request opens with `Closes #<n>` in its body; acceptance evidence lands on the ticket, which closes only when the pull request merges.
7. Review is a separate step: run `/review-this <fixed-point>` whenever you want the changes since a commit, branch, or tag checked on the Standards and Spec axes. Both the local review and any cloud review follow the one written policy in `REVIEW.md`, which cloud review reads from the pull-request base branch. The split between implementation and review is recorded in the decision log (ADR-0013).

GitHub remains the task record. Native blockers decide what may start, and closure happens only after delivery is proven.

The documentation flow has its own rule. Agents update a seam's technical leaf with the seam, then regenerate these human pages from authored documents. These pages are for people and are never the source of technical truth.

Depth: `docs/leaves/implement-this.md`, `docs/leaves/plan-this.md`.
