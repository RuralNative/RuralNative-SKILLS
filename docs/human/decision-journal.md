<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-22 · Regenerated: shipped three-skill workflow; #137 activation; ADR-0014 now shipped, ADR-0009/0012/0013 superseded; pull-request-only delivery; explicit wave example · Sources: docs/adr/0001-distribute-as-public-catalog-shelf.md, docs/adr/0002-adopt-ten-check-gate.md, docs/adr/0003-human-first-derived-artifacts.md, docs/adr/0004-verb-named-skills-flat-shelf.md, docs/adr/0005-unslopify-utility-identity-and-hard-dependency.md, docs/adr/0006-plan-this-fixed-template-adapter.md, docs/adr/0007-supervise-this-coordinator.md, docs/adr/0008-supervise-this-agent-orchestrator.md, docs/adr/0009-delegation-invariants-human-invocation.md, docs/adr/0010-supervise-by-delivery-evidence.md, docs/adr/0011-retire-supervise-this.md, docs/adr/0012-manager-worktree-pull-request-delivery.md, docs/adr/0013-review-this-decoupled-code-review.md, docs/adr/0014-three-skill-development-workflow.md, docs/adr/0015-requirements-data-trust-and-install-provenance.md -->

# Decision journal in plain words

This is the short record of accepted repository decisions. The full reasoning lives in the ADR files.

### 2026-08-11 — Publish skills through the registry

The repository is a public shelf. Consumers install skills from the registry, not from an npm package.

### 2026-08-18 — Keep agent and human docs separate

Technical docs guide agents. Human pages explain the same decisions in plain language and never become an agent's source of truth.

### 2026-08-19 — Use fixed-template planning and implementation adapters

`plan-this` and `implement-this` keep their workflow prefixes in one place and substitute only the task or issue reference.

### 2026-08-19 — Add supervised coordination

`supervise-this` connects planning, tickets, implementation, and review. The first design targeted Agent Manager and ended when its parent turn ended.

### 2026-08-20 — Use repository-owned unslopify and focused cache for planning/implementation

`plan-this` and `implement-this` now depend on repository-owned `unslopify` (not external `unslop`) and enforce its scope, protected-content, preservation, and completion-report contracts. Agents read only the focused cache `AGENTS.md → ARCHITECTURE.md → seam leaf → CONTEXT.md → relevant ADRs` owned by `document-for-agents`; `document-for-humans` output remains derived and is not preloaded.

### 2026-08-20 — Make Agent Orchestrator the runtime

AO now owns the persistent supervisor. Planning runs delegated in the same persistent orchestrator session. Kilo Code workers run in AO worktrees, open pull requests, and receive CI and review feedback through AO. GitHub remains the source of task and dependency state.

Why: a skill turn cannot wake itself after an asynchronous Agent Manager session finishes. AO supplies the persistent project orchestrator and worker lifecycle needed to continue without manual reinvocation.

What it costs: AO project role profiles must be configured before a run. Standalone `implement-this` and AO worker delivery use different merge paths.

Depth: `docs/adr/0008-supervise-this-agent-orchestrator.md`.

### 2026-08-20 — Keep human-gated delegated stages locked (superseded by 2026-08-22)

Planning and implementation delegate to steps that a model cannot start on its own: `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/implement`. A run pauses at each of those steps until a person invokes it. The docs now say so instead of implying the chain runs unattended.

Why: a live supervised run stalled when it reached planning, and nothing warned that the chain would stop. Unlocking the four skills was considered and rejected because the human gate is the point of the setting.

What it costs: runs need a person at the locked stages. `/unslopify` and `/code-review` remain agent-run.

Depth: `docs/adr/0009-delegation-invariants-human-invocation.md` (superseded by `docs/adr/0014-three-skill-development-workflow.md`; explicit per-stage authorization now shipped).

### 2026-08-20 — Supervise by delivery evidence (superseded by 2026-08-21)

The AO project chose its worker and a supported chat or TUI mode. Preflight blocked stale bases, unresolved models, broken GitHub access, missing review policy, and duplicate ownership before a spawn.

Progress meant a tracked change, pull request, review, merge, evidence, or closure. Recovery limits were separate for infrastructure, task, and implementation failures. Review and merge kept the reviewed commit fixed.

Now: supervise-this left the whole shelf (see 2026-08-21), so no AO project or preflight runs anything; tracked-change delivery evidence carries into the three-skill workflow.

Depth: `docs/adr/0010-supervise-by-delivery-evidence.md` (superseded by `docs/adr/0011-retire-supervise-this.md`).

### 2026-08-21 — Deliver pull requests from manager worktrees (superseded by 2026-08-22)

When `/implement-this` ran inside a Kilo Agent Manager worktree, detected by path, it pushed the feature branch and opened or updated a pull request against `main` whose body carries `Closes #<n>`. Acceptance evidence lands on the ticket with `ready-for-human`; merge closes it. The path-selected delivery mode and direct-main alternative were operative.

Why: standalone work needed a reviewable path that did not push straight to `main`, without reviving a coordinator.

What it cost: two delivery paths existed, chosen by worktree location; an unclear location asked one decision before pushing.

Now: every ticket delivers by pull request; no path pushes directly to `main`. History preserved.

Depth: `docs/adr/0012-manager-worktree-pull-request-delivery.md` (superseded by `docs/adr/0014-three-skill-development-workflow.md`).

### 2026-08-21 — Retire supervise-this

Nothing in the maintained workflow started a supervised multi-worker run anymore, so the coordinator left the shelf whole. `plan-this` now accepts direct invocation only. Three coordination ADRs carry superseded banners pointing at the retirement decision; their numbers are never reused.

Why: keeping the seam forced neighboring contracts to promise delegation and delivery branches that never run.

What it costs: multi-ticket coordination is manual for now — you plan once, then work ready tickets one at a time through the two delivery paths above.

Depth: `docs/adr/0011-retire-supervise-this.md`.

### 2026-08-22 - Three skills own the workflow (shipped)

`plan-this`, `implement-this`, and `review-this` own planning, isolated pull-request implementation, and review through merge and closure. GitHub holds the resumable state. Up to three ticket workers run at once, and dependency waves alternate between implementation and review: `implement-this #<spec>` for the frontier, `review-this #<spec>` from the control workspace to reconcile cloud and local findings against each current head, merge clean heads, and promote newly unblocked dependents. Ticket worktrees never run review.

Kilo cloud review adds comments where available while the local Standards and Spec review remains the required gate; an unavailable cloud review never blocks a complete local review. Repository review rules live in `REVIEW.md`. External prose counts as requirements data, not executable instruction, and runs never download skills.

Why: the prior skills did not join into one complete workflow, and the tracked orchestrator contradicted its retirement. The shipped design keeps three explicit human entry points while giving each stage one durable input, one owner, and testable state transitions.

What it costs: all implementation uses pull requests, multi-ticket runs require isolated workers, and review must reconcile cloud comments, local findings, checks, and the current pull-request head before merge. The stale `.kilo` orchestrator command and agent are removed; only `plan-this`, `implement-this`, and `review-this` remain as user-facing workflow commands.

People run implementation and review once per dependency wave from the control workspace. The shared state and adapter contracts stay reusable by a future persistent coordinator, but this ship does not build one.

Activation: shipped as of #137; ADR-0014 is now the operative contract superseding ADR-0009, ADR-0012, and ADR-0013.

Depth: `docs/adr/0014-three-skill-development-workflow.md`.
