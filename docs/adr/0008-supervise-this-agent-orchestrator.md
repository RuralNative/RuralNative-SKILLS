# 0008 — Agent Orchestrator as the supervise-this runtime

Status: accepted
Date: 2026-08-20
Supersedes: ADR-0007 execution backend and live-session rules
Amended by: ADR-0010 worker selection, delivery evidence, recovery, review, and merge rules

Decision: `supervise-this` targets the current Agent Orchestrator project orchestrator. AO owns the persistent run, so planning runs inline through `plan-this` and worker creation is an intermediate checkpoint. The supervisor reads GitHub's parent specification, child issues, native `blocked_by` edges, labels, assignees, comments, pull requests, checks, and merged commits before reconciling AO sessions. It starts no more than three project-configured workers, preserving one issue per worker and parent order. ADR-0010 defines worker mode selection and the executable spawn gate.

AO project role profiles are the model boundary. The project orchestrator profile supplies planning and final whole-spec review. The worker profile supplies implementation. The supervisor validates the daemon, project, agent catalog, and role profiles before planning, and it does not invent per-spawn model flags or rewrite profiles during a run.

The delegated `implement-this` path uses pull-request delivery inside AO. The worker runs the implementation and local review workflow, commits, and opens or updates its PR. It does not push directly to `main` or close the issue. AO owns the worker worktree, CI and review feedback, merge-conflict routing, and session recovery. The supervisor owns native dependency scheduling, acceptance evidence, GitHub labels and issue closure, parent state, whole-spec review, and follow-up tickets. Standalone `implement-this` keeps direct-main delivery.

The orchestrator remains active after planning and worker creation. AO completion or handoff events cause reconciliation rather than a terminal summary. Resume reads durable GitHub state before AO state and never creates a duplicate worker or PR. ADR-0010 replaces activity-only progress and one shared recovery count with delivery states and failure-class counts.

Why: Agent Manager sessions ended when the parent skill turn ended, leaving no process to observe planning or worker completion. AO supplies the persistent orchestrator, worktree lifecycle, worker adapters, session events, PR state, CI feedback, and restartable state needed for a durable outer loop. Keeping GitHub as the task authority prevents AO's read-only tracker intake from becoming a second issue system.

Consequences:

- `supervise-this` no longer promises Agent Manager scheduling, dynamic per-session model selection, or KiloClaw execution.
- AO project configuration must exist before the run and chooses phase models by role.
- `implement-this` has two delivery branches. Its direct path pushes `HEAD:main`; its AO path creates or updates a PR and leaves merge and issue closure to the supervisor and AO lifecycle.
- Native GitHub dependencies remain the scheduling gate because AO does not provide a `blocked_by` DAG scheduler.
- Current AO commands are the only documented controls. Retired YAML reactions, `batch-spawn`, and unverified per-spawn model flags are excluded.
- The parent issue records AO project identity, role models, review base, sessions, PRs, checks, recovery decisions, and final outcome so a later orchestrator can resume.
