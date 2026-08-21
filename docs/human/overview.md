<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-21 · Regenerated: #124 review-this seam · Sources: ARCHITECTURE.md, CONTEXT.md, docs/adr/0011-retire-supervise-this.md, docs/adr/0012-manager-worktree-pull-request-delivery.md, docs/leaves/implement-this.md, docs/leaves/plan-this.md -->
# RuralNative-SKILLS in plain words

This repository publishes reusable skills for coding agents. The shelf includes documentation workflows, prose cleanup, planning, implementation, code review, and release work.

`plan-this` runs the planning interview, specification, and ticket workflow with repository-owned `unslopify` and the focused agent cache `AGENTS.md → ARCHITECTURE.md → seam leaf → CONTEXT.md → relevant ADRs` (human pages are derived from agent docs and not preloaded). `implement-this` handles one ticket at a time under the same prose and cache rules. `review-this` reviews the changes since a fixed point on two axes, Standards and Spec, and reports them side by side. You plan first, then work each ready ticket through one of two delivery paths; review runs separately whenever you want it.

A ticket starts only when its native GitHub blockers are closed. Outside a manager worktree, implementation ends with evidence: verification passes, review findings are fixed, the work is rebased and pushed to `main`, and the ticket closes with proof. Inside a Kilo Agent Manager worktree, the same work opens a pull request whose body closes the ticket on merge.

People install skills from the public registry. The technical details live in the agent-facing documents linked below.

Go deeper:

- `ARCHITECTURE.md` describes the shelf.
- `docs/leaves/implement-this.md` describes direct and manager-worktree pull-request delivery.
- `docs/leaves/plan-this.md` describes the planning workflow.
- `docs/leaves/review-this.md` describes the standalone review workflow.
