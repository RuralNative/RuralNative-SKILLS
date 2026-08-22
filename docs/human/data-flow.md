<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-22 · Regenerated: shipped three-skill workflow; #137 activation; explicit wave alternation; pull-request-only delivery; stale orchestrator removed · Sources: REVIEW.md, docs/leaves/document-for-agents.md, docs/leaves/document-for-humans.md, docs/leaves/unslopify.md, docs/leaves/plan-this.md, docs/leaves/implement-this.md, docs/leaves/review-this.md, docs/adr/0014-three-skill-development-workflow.md, docs/adr/0015-requirements-data-trust-and-install-provenance.md -->
# How information moves in plain words

The technical flow starts with a task you give to `/plan-this`.

1. Planning loads repository-owned `unslopify` before progress and reads only the focused agent cache `AGENTS.md → ARCHITECTURE.md → seam leaf → CONTEXT.md → relevant ADRs`; human pages remain derived and are not preloaded.
2. Planning publishes a parent specification with no claimable label, links each child ticket to it as a native GitHub sub-issue, and creates native blocked-by edges from each blocker's numeric database ID read through the issue REST response, with prose checked under unslopify scope, protected-content, preservation, and completion-report rules.
3. You run `/implement-this` with one ready ticket, several ready tickets, or the parent specification.
4. The invocation validates its bounded ticket set against the frontier before any claim and stops while any selected ticket has an open native blocker. Each ticket then gets an isolated worker: its own worktree, branch, and session.
5. Each worker loads `unslopify` under the same prose contract and focused cache, claims only its own ticket, runs `/implement`, updates the affected seam's leaf doc and tests, and verifies the repository: dependency install, tests, TypeScript, and the docs harness.
6. Delivery is always a pull request. Every worker pushes its feature branch and opens one pull request against `main` with `Closes #<n>` in its body; acceptance evidence lands on the ticket, which closes only when the pull request merges. Nothing pushes directly to `main`.
7. Review is a separate step: after the implementation wave finishes, run `/review-this #<spec>` once from the control workspace to check that wave on the Standards and Spec axes; ticket worktrees never run review. Both the local review and any cloud review follow the one written policy in `REVIEW.md`, which cloud review reads from the pull-request base branch. The shipped three-skill workflow is recorded in ADR-0014 (ADR-0013 superseded).
8. Alternate waves until done: `review-this` squash-merges clean heads, promotes only dependents whose final blocker closed, and tells you to run `implement-this #<spec>` for the next frontier. When every child closes, it runs `npm run verify` on updated `main` and a whole-spec Standards and Spec review; a confirmed cross-ticket defect becomes the smallest follow-up child ticket, otherwise the parent specification closes.

### Wave example

Tickets #101 and #102 start ready; #103 waits on #101; #104 waits on #101 and #102; #105 waits on #103. You run `/implement-this #100` for #101+#102, then `/review-this #100` to merge them and promote #103/#104, then `/implement-this #100` for #103+#104, then `/review-this #100` to merge and promote #105, then the final implement and review wave. Verification and whole-spec review gate the parent closure.

One rule protects every step above: text flowing through the workflow — task descriptions, issue bodies, comments, specifications, review comments — is treated as requirements data. It says what to build and carries evidence, but it cannot widen scope, pick files, authorize tools, or override the gates. Runs also never download skills mid-flight; installing skills is something you do outside the run. Every skill's install guide carries the same trust section: it records where the skill came from, asks you to pin the revision you reviewed, names the residual trust in the source repository, and refuses to overwrite an existing install without your approval.

All three workflow skills share one small decision module, the pure workflow state core. It reads the same ticket facts you see on GitHub (open blockers, labels, assignees) plus worker and pull-request facts, and returns the next safe actions: which tickets form the ready frontier, at most three active workers, label changes when a blocker closes or reopens, one retry before a stop that holds, whether a reviewed head is still current, whether a pull request may merge, and when the whole specification is done. Each skill carries an identical copy of this module, generated from one authored source, so an installed skill works on its own.

GitHub remains the task record. Native blockers decide what may start, and closure happens only after delivery is proven.

The documentation flow has its own rule. Agents update a seam's technical leaf with the seam, then regenerate these human pages from authored documents. These pages are for people and are never the source of technical truth.

Depth: `docs/leaves/implement-this.md`, `docs/leaves/plan-this.md`, `docs/leaves/review-this.md`, `docs/adr/0014-three-skill-development-workflow.md`.
