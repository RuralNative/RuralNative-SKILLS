<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-20 · Regenerated: #80 Regenerate the human-first tree from the corrected source · Sources: ARCHITECTURE.md, CONTEXT.md, docs/adr/0008-supervise-this-agent-orchestrator.md, docs/adr/0010-supervise-by-delivery-evidence.md, docs/leaves/supervise-this.md, docs/leaves/implement-this.md, docs/leaves/plan-this.md -->

# RuralNative-SKILLS in plain words

This repository publishes reusable skills for coding agents. The shelf includes documentation workflows, prose cleanup, planning, implementation, supervision, and release work.

`plan-this` runs the planning interview, specification, and ticket workflow. `implement-this` handles one ticket. `supervise-this` connects those pieces inside Agent Orchestrator.

An AO project orchestrator owns a supervised run. It delegates planning in the same persistent session, then starts the worker configured for that project. Kilo Code is one option, not a requirement. Before a worker starts, the supervisor checks its model and supported mode, GitHub access, the current base branch, review policy, and whether another session or pull request already owns the issue.

The supervisor stays active after planning and worker creation. It counts a tracked change, pull request, review, merge, evidence, or closure as progress. An idle label or recent activity time does not count. A merged blocker can open the next dependency wave.

Recovery has separate limits for infrastructure trouble, task continuation, and code correction. The workflow helper accepts explicit JSON or a regular input file, so a missing input or pipe fails instead of waiting. Review keeps the reviewed commit fixed. A same-account verdict works only when the recorded policy allows it.

People install skills from the public registry. The technical details live in the agent-facing documents linked below.

Go deeper:

- `ARCHITECTURE.md` describes the shelf.
- `docs/leaves/supervise-this.md` describes the coordinator contract.
- `docs/leaves/implement-this.md` describes direct and AO delivery.
