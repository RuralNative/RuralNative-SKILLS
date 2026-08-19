---
name: supervise-this
description: Coordinate model-aware planning via /supervise-this <task> and /supervise-this #<spec> with explicit planning model and variant, implementation model and variant, and optional review model and variant resolved through agent_manager_models, approval before execution, and a local Agent Manager planning session that delegates to plan-this.
---

Coordinate the supervised run from model preflight through planning.

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
