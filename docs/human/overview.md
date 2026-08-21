<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-21 · Regenerated: #89 evidence-based AO workflow · Sources: ARCHITECTURE.md, CONTEXT.md, docs/adr/0008-supervise-this-agent-orchestrator.md, docs/adr/0010-supervise-by-delivery-evidence.md, docs/leaves/supervise-this.md, docs/leaves/implement-this.md, docs/leaves/plan-this.md -->
# RuralNative-SKILLS in plain words

This repository publishes reusable skills for coding agents. The shelf includes documentation workflows, prose cleanup, planning, implementation, supervision, and release work.

`plan-this` runs the planning interview, specification, and ticket workflow with repository-owned `unslopify` and the focused agent cache `AGENTS.md → ARCHITECTURE.md → seam leaf → CONTEXT.md → relevant ADRs` (human pages are derived from agent docs and not preloaded). `implement-this` handles one ticket under the same prose and cache rules. `supervise-this` connects those pieces inside Agent Orchestrator.

An AO project orchestrator owns a supervised run. It plans in the same persistent session, then starts Kilo Code workers in separate AO worktrees. GitHub issues and their native blockers decide what may start. Each worker opens a pull request. AO routes CI failures, review requests, and merge conflicts back to the worker that owns the branch.

The supervisor stays active after planning and worker creation. AO completion messages trigger the next dependency check. The supervisor does not treat an idle worker as finished. It waits for a merged pull request, acceptance evidence, issue closure, and a passing final review.

AO project roles choose the models. The orchestrator role handles planning and whole-spec review. The worker role handles implementation. The supervisor checks that those profiles exist before it starts and does not rewrite them mid-run.

People install skills from the public registry. The technical details live in the agent-facing documents linked below.

Go deeper:

- `ARCHITECTURE.md` describes the shelf.
- `docs/leaves/supervise-this.md` describes the coordinator contract.
- `docs/leaves/implement-this.md` describes direct and AO delivery.
