<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-20 · Regenerated: #80 Regenerate the human-first tree from the corrected source · Sources: docs/leaves/document-for-agents.md, docs/leaves/document-for-humans.md, docs/leaves/unslopify.md, docs/leaves/plan-this.md, docs/leaves/implement-this.md, docs/leaves/supervise-this.md, docs/leaves/release-skills.md, docs/adr/0008-supervise-this-agent-orchestrator.md, docs/adr/0010-supervise-by-delivery-evidence.md -->

# How information moves in plain words

The technical flow starts with a task in an AO project orchestrator.

1. The orchestrator passes explicit JSON or a regular input file to the workflow helper, which checks AO health, explicit-repository GitHub access, role models, worker mode, review policy, and the current default branch.
2. It delegates planning to `/plan-this` in the persistent orchestrator session.
3. Planning publishes a parent specification, child tickets, and native GitHub dependency edges. The planning stages `/grill-with-docs`, `/to-spec`, and `/to-tickets` need a person to start them, so planning pauses until someone invokes each one.
4. The supervisor records the AO project and role information on the parent issue.
5. It combines open pull requests, AO sessions, branches, assignees, and issue links into one ownership record.
6. Existing ownership resumes or reviews work. An unowned ready ticket starts with the project-configured worker and mode.
7. The worker proves its base is current before editing and runs `/implement-this #<n>` in pull-request mode.
8. The supervisor advances through delivery states backed by artifacts. A red idle signal triggers the matching recovery class.
9. Review fixes the head commit. AO merges current managed pull requests; an explicit GitHub fallback handles legacy pull requests AO cannot manage.
10. A merged blocker opens the next wave. Final checks and `/code-review` still gate parent closure.

GitHub remains the task record. AO supplies persistent sessions and worktrees, but its current issue intake does not replace GitHub's dependency and closure state.

The standalone implementation path is different. `/implement-this #<n>` can push directly to `main` after its checks and review. An AO worker must use pull-request delivery instead, so AO can route feedback and the supervisor can verify merge before closing the issue.

The documentation flow has its own rule. Agents update a seam's technical leaf with the seam, then regenerate these human pages from authored documents. These pages are for people and are never the source of technical truth.

Depth: `docs/leaves/supervise-this.md`, `docs/leaves/implement-this.md`, `docs/leaves/plan-this.md`.
