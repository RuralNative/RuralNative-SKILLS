<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-21 · Regenerated: #117 supervise-this retirement · Sources: docs/adr/0001-distribute-as-public-catalog-shelf.md, docs/adr/0002-adopt-ten-check-gate.md, docs/adr/0003-human-first-derived-artifacts.md, docs/adr/0004-verb-named-skills-flat-shelf.md, docs/adr/0005-unslopify-utility-identity-and-hard-dependency.md, docs/adr/0006-plan-this-fixed-template-adapter.md, docs/adr/0007-supervise-this-coordinator.md, docs/adr/0008-supervise-this-agent-orchestrator.md, docs/adr/0009-delegation-invariants-human-invocation.md, docs/adr/0010-supervise-by-delivery-evidence.md, docs/adr/0011-retire-supervise-this.md, docs/adr/0012-manager-worktree-pull-request-delivery.md -->

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

### 2026-08-20 — Keep human-gated delegated stages locked

Planning and implementation delegate to steps that a model cannot start on its own: `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/implement`. A supervised run pauses at each of those steps until a person invokes it. The docs now say so instead of implying the chain runs unattended.

Why: a live supervised run stalled when it reached planning, and nothing warned that the chain would stop. Unlocking the four skills was considered and rejected because the human gate is the point of the setting.

What it costs: runs need a person at the locked stages. `/unslop` and `/code-review` remain agent-run.

Depth: `docs/adr/0009-delegation-invariants-human-invocation.md`.

### 2026-08-20 — Supervise by delivery evidence

The AO project chooses its worker and a supported chat or TUI mode. Preflight blocks stale bases, unresolved models, broken GitHub access, missing review policy, and duplicate ownership before a spawn.

Progress now means a tracked change, pull request, review, merge, evidence, or closure. Recovery limits are separate for infrastructure, task, and implementation failures. Review and merge keep the reviewed commit fixed.

Why: the #73 run looked active while several tickets had no tracked delivery artifact. Hardcoded worker and merge assumptions also turned routine setup failures into repeated recovery prompts.

What it costs: the orchestrator must collect structured facts and run the bundled helper before spawn, recovery, review, and merge decisions.

Depth: `docs/adr/0010-supervise-by-delivery-evidence.md`.

### 2026-08-21 — Deliver pull requests from manager worktrees

When `/implement-this` runs inside a Kilo Agent Manager worktree, detected by path, it pushes the feature branch and opens or updates a pull request against `main` whose body carries `Closes #<n>`. Acceptance evidence lands on the ticket with `ready-for-human`; merge closes it.

Why: standalone work needs a reviewable path that does not push straight to `main`, without reviving a coordinator.

What it costs: two delivery paths now exist, chosen by worktree location; an unclear location asks one decision before pushing.

Depth: `docs/adr/0012-manager-worktree-pull-request-delivery.md`.

### 2026-08-21 — Retire supervise-this

Nothing in the maintained workflow started a supervised multi-worker run anymore, so the coordinator left the shelf whole. `plan-this` now accepts direct invocation only. Three coordination ADRs carry superseded banners pointing at the retirement decision; their numbers are never reused.

Why: keeping the seam forced neighboring contracts to promise delegation and delivery branches that never run.

What it costs: multi-ticket coordination is manual for now — you plan once, then work ready tickets one at a time through the two delivery paths above.

Depth: `docs/adr/0011-retire-supervise-this.md`.
