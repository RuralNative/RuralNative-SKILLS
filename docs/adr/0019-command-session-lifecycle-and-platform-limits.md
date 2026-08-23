# 0019 - Command-session lifecycle and platform limits

Status: accepted
Supersedes: 0014
Date: 2026-08-23

Decision: The three workflow commands stay exactly as they are. A **command session** is the user-created session running `/implement-this` or `/review-this`. A **worker session** is a targeted session inside an isolated worktree that claims exactly one ticket or one pull-request task. The user starts implementation and review command sessions independently, whenever each stage has work. Nothing sits above them. Supervisor and coordinator designs were rejected before (ADR-0007, ADR-0008, ADR-0011) and stay rejected: there is no supervisor, no coordinator, no daemon, and no fourth workflow command.

Each stage owns its own output and stops there. Implementation turns reserved tickets into pull requests with posted acceptance evidence. Review examines, fixes, and merges compatible pull requests. Neither silently performs the other stage's missing work: implementation never merges, and review never builds a missing implementation from scratch.

This decision supersedes three clauses of ADR-0014. First, one human invocation per dependency wave is retired; a command session manages its own frontier, fills compatible worker slots, and discovers follow-up children while it runs. Second, confirmed review findings no longer return to the ticket's owning implementation worker; each pull request with confirmed findings gets one fresh fix context per round inside its persistent PR worktree. Third, the clause reserving the pure helpers for a future persistent coordinator is withdrawn; the helpers stay host-neutral because purity keeps them testable, not because a coordinator is planned.

Monitoring and resume: parent command sessions poll with increasing delays and report only state changes. Progress means a lifecycle change in any ticket, worker, branch, pull request, check, review, or merge. After 30 minutes without progress a session checkpoints and ends its turn. A resumed session reads GitHub first, rebuilds its picture from durable records, and never creates a second assignee, branch, session, or pull request for work that already has one.

Lifecycle states: reservation, dispatch, delivery, review, fixes, merge, promotion, interruption, needs-info, cleanup, completion. GitHub carries the durable record of each. Reservation happens before asynchronous creation so retries reconcile against it. Interruption is ordinary and resume is idempotent. A `needs-info` stop preserves evidence and stops work on that ticket.

Planning gate: every fresh `/plan-this` run completes at least one grill frontier round before anything publishes. Publication waits for explicit approval after the shared understanding and the proposed ticket graph are shown; one invocation authorizes the interactive chain but approval stays separate. An interrupted grill may resume its recorded decision tree instead of starting over.

References: bare and hash forms (`123` and `#123`) are equivalent by declaration and normalize to one form before any object resolution. The resolved GitHub object's own type decides whether the number names an issue or a pull request.

Worker limits: each stage runs at most three workers. Across the workspace, at most four active managed workers may exist at any moment, counted before any spawn.

Review freshness: a verdict pins both the head revision and the base revision it examined. Either revision moving invalidates the verdict.

Fix budget: a pull request receives at most two pushed fix heads, each followed by a review, then one final review. One fresh fix context receives all confirmed findings for that PR and round; safe advisories join a blocking fix and advisory-only findings are deferred. Resolving a code conflict changes behavior and consumes a fix round. A conflict-free base refresh triggers delta rereview but consumes none. A final-verification repair consumes one available fix round and receives delta or risk-triggered full rereview; no third round starts.

Labels: `ready-for-human` keeps its triage meaning, requires human implementation. It stops being the signal that a pull request awaits review. Review readiness comes from an open pull request, a valid closing reference, current revisions, and posted acceptance evidence.

Platform limits: current Kilo exposes five chat-side Agent Manager capabilities, start (worktree or local mode), overview, prompt, stop-session, and move. The Agent Manager reference documents managed-worktree closure as a panel action that removes the checkout directory under `.kilo/worktrees/` and the local branch; the chat-side stop action only stops the session and removes it from the panel. The workflow guide says the branch is preserved after a merge, so branch retention is not a workflow dependency; this documentation discrepancy is recorded in `reference/vendor-facts.md`. When a finished worktree cannot be closed through a supported action, the stopped session reports `cleanup-pending` and leaves everything in place. The workflow never deletes directories behind Agent Manager's back and never edits `.kilo/agent-manager.json`. Failed worktrees stay on disk for diagnosis after a `needs-info` stop; only successful work whose pull request and acceptance evidence are durable becomes eligible for supported closure. Cleaning up worktrees created before this workflow is a separate audited operation outside this specification.

Why: ADR-0014 made every dependency wave wait for a fresh human invocation, sent fixes back to workers that had often already stopped, and parked worker management with an imagined future coordinator. Real runs need stages that finish their own frontiers, fixes that survive the original worker's death, and cleanup that respects what the host actually permits.

Consequences:

- `plan-this`, `implement-this`, and `review-this` remain separate user-facing seams. Command sessions own stage lifecycle, workers own isolated ticket or pull-request tasks, and GitHub remains the durable record. No supervisor or coordinator seam is added.
- `cleanup-pending` records unsupported worktree closure without deleting directories behind Agent Manager or editing `.kilo/agent-manager.json`; failed worktrees remain available for diagnosis.
- Ticket #154 shipped the planning grill gate and parallel-first ticket graphs. Ticket #155 shipped implementation command sessions, #156 shipped target resolution, #157 shipped risk, timing, setup reconciliation, and persistent initial review contracts, and #158 shipped fresh fix contexts, advisory batching, delta/full rereview, and bounded final-verification repair. The seam leaf records the resulting behavior.

Activation: this decision governs spec #152 from today. Ticket #154 ships the planning grill gate and parallel-first ticket graphs in `plan-this`; #155 and #156 ship implementation workers and target resolution; #157 ships the performance contract and persistent initial review path; #158 ships the remaining fix and delta-review behavior. Platform statements rest on the pinned Kilo Agent Manager sources in `reference/vendor-facts.md`, retrieved 2026-08-23.
