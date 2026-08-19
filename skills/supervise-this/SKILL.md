---
name: supervise-this
description: Coordinate model-aware planning and execution via /supervise-this <task> and /supervise-this #<spec> with explicit planning model and variant, implementation model and variant, and optional review model and variant resolved through agent_manager_models, approval before execution, a local Agent Manager planning session that delegates to plan-this, bounded implementation worktrees that delegate to implement-this, and integrated code-review with the review selection.
---

Coordinate the supervised run from model preflight through planning and happy-path execution.

## Invocation

Accepts `/supervise-this <task>` for a new run and `/supervise-this #<spec>` for later resume. Every run requires planning model, planning variant, implementation model, and implementation variant fields before the task or spec reference. Review model and review variant may be supplied together as an optional pair. When both review fields are omitted they default to the confirmed planning selection. A partial review selection or any missing required field produces one ELI18 decision before any session starts. The skill accepts review model and review variant together and defaults review to planning when both are omitted.

## Model preflight

Every model name and variant is resolved through `agent_manager_models`; the skill contains no hard-coded model allowlist. The supervisor accepts catalog model names and qualified provider and model identifiers such as `provider/model`. It verifies each variant against the resolved model. An unavailable or ambiguous model or variant pauses planning and never triggers an unapproved fallback. No hard-coded allowlist is used and no silent fallback is permitted.

## Approval

The user sees and approves the exact resolved planning, implementation, and review selections before execution. The supervisor shows the resolved model names and variants exactly as returned by the catalog and requires one confirmation before creating any session. An unavailable or ambiguous model or variant pauses the affected phase and returns one ELI18 decision with a recommendation.

## Planning

The planning phase starts as an Agent Manager local session with the confirmed planning model and variant and a delegated `plan-this` task. The skill does not claim to change the model of the current Kilo session; it starts a separate local session with the confirmed planning selection. The delegated planning session honors all `plan-this` approval gates and returns the published specification and ticket references to the supervisor. Planning uses local mode because it publishes GitHub work docs and does not edit the repository.

## Recording

After planning publishes the parent specification and child tickets, the supervisor records the resolved phase configuration on that parent for later execution and resume. Before implementation starts, one structured parent comment records the resolved planning, implementation, and review model and variant selections. Resume reuses that comment and revalidates through `agent_manager_models` before creating missing sessions.

## Execution

The supervisor reads the structured model configuration recorded by #67 before starting implementation. The supervisor records a fixed implementation review base on the parent before starting the first implementation worktree. The ready frontier contains only open child tickets with no open native blocker, the `ready-for-agent` label, and no assignee. The supervisor does not schedule blocked or assigned tickets.

The supervisor creates one Agent Manager worktree per selected ticket and keeps no more than three implementation worktrees active. Every worker receives one delegated `implement-this` issue plus the exact confirmed implementation model and variant. Every follow-up implementation session created by the happy path uses the same confirmed implementation selection. The supervisor never replaces an unavailable implementation model or variant with an inherited or cheaper fallback. The supervisor never replaces an unavailable model with an inherited or cheaper fallback.

The supervisor uses Agent Manager `list` for live session IDs and states and never edits persisted Agent Manager state. The supervisor uses Agent Manager `list` as the only source of live session IDs and states. Never edits `.kilo/agent-manager.json` or invents session and section IDs. The supervisor does not copy the planning or implementation prefixes. The skill contains only coordination and model-routing rules.

## Completion

A ticket counts as complete only when GitHub shows it closed, acceptance evidence exists, and its commit is reachable from `origin/main`. Agent Manager idle state alone does not satisfy completion. The supervisor does not treat idle as success. Completed work frees a slot and the supervisor starts newly unblocked tickets in parent order.

## Verification and integrated review

After all planned children land, the supervisor runs full repository verification with `npm run format && npm test && npm run lint && npx tsc --noEmit && npm run docs:check && npm run build`. Integrated `code-review` starts in a local Agent Manager session with the exact confirmed review model and variant, the recorded base, and #62 as authority. The final review session does not inherit the supervisor or implementation model unless that model is the recorded review selection. Every review session receives the exact confirmed review model and variant.

## Parent evidence and closure

The supervisor posts parent evidence with all phase model selections, review base, checks, commits, ticket links, and review outcome. The supervisor closes #62 only when all children are closed, checks pass, and the integrated review has no confirmed finding. The supervisor closes the parent only when every planned and follow-up ticket is closed, every required check passes, and the final review has no confirmed finding. The supervisor does not close the parent early and does not create more than three active worktrees.
