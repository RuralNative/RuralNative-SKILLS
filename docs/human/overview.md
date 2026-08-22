<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-22 · Regenerated: #136 REVIEW.md becomes doc-cache policy · Sources: ARCHITECTURE.md, CONTEXT.md, REVIEW.md, docs/adr/0011-retire-supervise-this.md, docs/adr/0012-manager-worktree-pull-request-delivery.md, docs/adr/0013-review-this-decoupled-code-review.md, docs/leaves/implement-this.md, docs/leaves/plan-this.md, docs/leaves/review-this.md -->
# RuralNative-SKILLS in plain words

This repository publishes reusable skills for coding agents. The shelf includes documentation workflows, prose cleanup, planning, implementation, code review, and release work.

`plan-this` runs the planning interview, specification, and ticket workflow with repository-owned `unslopify` and the focused agent cache `AGENTS.md → ARCHITECTURE.md → seam leaf → CONTEXT.md → relevant ADRs` (human pages are derived from agent docs and not preloaded). `implement-this` handles one ticket at a time through a single `/implement` stage under the same prose and cache rules; it does not host code review. `review-this` reviews the changes since a fixed point on two axes, Standards and Spec, and reports them side by side whenever you run it. You plan first, then work each ready ticket through one of two delivery paths.

One written file governs every review. `REVIEW.md` at the repository root says what reviewers check, how findings are graded, and that review subagents only read while the main reviewer verifies each finding. Cloud review reads the same file from the pull-request base branch; setting up that cloud service is separate configuration work outside this repository.

A ticket starts only when its native GitHub blockers are closed. Outside a manager worktree, implementation ends with evidence: verification passes, the work is rebased and pushed to `main`, and the ticket closes with proof. Inside a Kilo Agent Manager worktree, the same work opens a pull request whose body closes the ticket on merge.

People install skills from the public registry. The technical details live in the agent-facing documents linked below.

Go deeper:

- `ARCHITECTURE.md` describes the shelf.
- `docs/leaves/implement-this.md` covers direct and manager-worktree pull-request delivery.
- `docs/leaves/plan-this.md` explains the planning workflow.
- `docs/leaves/review-this.md` shows how standalone review runs.
