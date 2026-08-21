<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-21 · Regenerated: #113 readme contract repair · Sources: docs/leaves/document-for-agents.md, docs/leaves/document-for-humans.md, docs/leaves/unslopify.md, docs/leaves/plan-this.md, docs/leaves/implement-this.md, docs/leaves/supervise-this.md, docs/leaves/release-skills.md, docs/adr/0008-supervise-this-agent-orchestrator.md, docs/adr/0010-supervise-by-delivery-evidence.md -->
# How information moves in plain words

The technical flow starts with a task in an AO project orchestrator.

1. The orchestrator checks AO health, the project, the agent catalog, and the orchestrator and worker role profiles.
2. It runs `/plan-this` in the persistent orchestrator session, which loads repository-owned `unslopify` before progress and reads only the focused agent cache `AGENTS.md → ARCHITECTURE.md → seam leaf → CONTEXT.md → relevant ADRs`; human pages remain derived and are not preloaded.
3. Planning publishes a parent specification, child tickets, and native GitHub dependency edges, with prose checked under unslopify scope, protected-content, preservation, and completion-report rules.
4. The supervisor records the AO project and role information on the parent issue.
5. It reads open blockers and starts no more than three ready tickets with `ao spawn`.
6. Each Kilo Code worker runs `/implement-this #<n>` in an AO worktree, loads repository-owned `unslopify` under the same prose contract and focused cache, and opens a pull request.
7. AO watches the worker, CI, review feedback, and merge conflicts. Completion or handoff messages return to the orchestrator.
8. The supervisor re-reads GitHub, starts the next ready tickets, and leaves descendants waiting while blockers remain open.
9. After the planned pull requests merge, the orchestrator runs full checks and `/code-review` from a fixed base.
10. Confirmed findings become follow-up tickets for no more than two automatic rounds. The parent closes only after the final review passes.

GitHub remains the task record. AO supplies persistent sessions and worktrees, but its current issue intake does not replace GitHub's dependency and closure state.

The standalone implementation path is different. `/implement-this #<n>` can push directly to `main` after its checks and review. An AO worker must use pull-request delivery instead, so AO can route feedback and the supervisor can verify merge before closing the issue.

The documentation flow has its own rule. Agents update a seam's technical leaf with the seam, then regenerate these human pages from authored documents. These pages are for people and are never the source of technical truth.

Depth: `docs/leaves/supervise-this.md`, `docs/leaves/implement-this.md`, `docs/leaves/plan-this.md`.
