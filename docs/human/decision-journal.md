<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-20 · Sources: docs/adr/0001-distribute-as-public-catalog-shelf.md, docs/adr/0002-adopt-ten-check-gate.md, docs/adr/0003-human-first-derived-artifacts.md, docs/adr/0004-verb-named-skills-flat-shelf.md, docs/adr/0005-unslopify-utility-identity-and-hard-dependency.md, docs/adr/0006-plan-this-fixed-template-adapter.md, docs/adr/0007-supervise-this-coordinator.md, docs/adr/0008-supervise-this-agent-orchestrator.md -->

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

### 2026-08-20 — Make Agent Orchestrator the runtime

AO now owns the persistent supervisor. Planning runs inline. Kilo Code workers run in AO worktrees, open pull requests, and receive CI and review feedback through AO. GitHub remains the source of task and dependency state.

Why: a skill turn cannot wake itself after an asynchronous Agent Manager session finishes. AO supplies the persistent project orchestrator and worker lifecycle needed to continue without manual reinvocation.

What it costs: AO project role profiles must be configured before a run. Standalone `implement-this` and AO worker delivery use different merge paths.

Depth: `docs/adr/0008-supervise-this-agent-orchestrator.md`.
