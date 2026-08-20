# Seam: supervise-this

## Purpose

`supervise-this` is the durable coordinator for a planning-to-implementation run inside an Agent Orchestrator project orchestrator. It runs `plan-this` inline, reads GitHub as the task authority, starts Kilo Code workers through AO, waits for AO completion or handoff events, follows native issue blockers, routes recovery, runs whole-spec review, and closes the parent only after merged pull requests and evidence prove completion.

## Scope & boundaries

Owns the content under `skills/supervise-this/`: the coordinator contract, AO setup guide, and composition tests. It delegates planning to `plan-this` and one-issue delivery to `implement-this`. AO owns worker sessions, worktrees, CI feedback, review feedback, merge conflicts, and session recovery. GitHub owns specifications, child tickets, native dependencies, labels, comments, pull requests, checks, and closure evidence. This seam does not schedule through Agent Manager, KiloClaw, or retired AO configuration.

## Key files & data flow

`SKILL.md` is consumed by the AO project orchestrator. New-task flow is `/supervise-this <task>` → AO preflight → inline `/plan-this` → structured parent comment → GitHub ready frontier → `ao spawn` Kilo Code workers → AO completion or handoff event → GitHub reconciliation → later frontier. Resume uses `/supervise-this #<spec>` and reads GitHub before AO sessions. Worker prompts invoke `/implement-this #<n>` with AO pull-request delivery. After all planned pull requests merge, the orchestrator runs `/code-review` from a fixed base, creates bounded follow-up tickets for confirmed findings, and closes the parent only after the final review passes.

## Non-negotiables

1. **INV-1** — `SKILL.md` frontmatter `name` equals the folder name `supervise-this`. Mechanism: identity composition test and docs harness.
2. **INV-2** — `INSTALL.md` uses the registry lane `npx skills add RuralNative/RuralNative-SKILLS --skill supervise-this`, gives a matching manual copy, and names `/supervise-this <task>` and `/supervise-this #<spec>`. Mechanism: composition test.
3. **INV-3** — The run requires a healthy AO daemon, an AO project, the current project orchestrator, a Kilo Code worker agent, and orchestrator and worker role profiles. An optional reviewer profile is validated when configured. AO role profiles supply models; the skill does not invent per-spawn model flags or rewrite project configuration. Mechanism: composition test checks the documented AO preflight commands and decision gate.
4. **INV-4** — New-task planning runs inline through `/plan-this` in the persistent AO orchestrator. Planning and worker creation are intermediate checkpoints, never terminal summaries. Mechanism: composition test checks inline delegation, persistent ownership, and the no-conclusive-summary boundary.
5. **INV-5** — The ready frontier contains open child tickets with no open native blocker, `ready-for-agent`, and no assignee. AO workers are spawned one issue at a time and the active implementation limit is three. Mechanism: composition test checks the frontier, `ao session ls`, `ao spawn`, and cap.
6. **INV-6** — The orchestrator consumes AO completion or handoff events and reconciles GitHub before starting the next wave. A spawn does not end the run. Mechanism: composition test checks persistent event-loop language.
7. **INV-7** — Each worker runs `/implement-this #<n>` in AO pull-request delivery. Workers do not push directly to `main` or close issues before merge. Mechanism: composition test checks one-issue prompts, PR delivery, and AO ownership.
8. **INV-8** — A ticket is complete only after its PR merges, acceptance evidence exists, and the issue closes with that evidence. Descendants wait for every native blocker to close. Mechanism: composition test checks merged PR, evidence, closure, refill, and descendant blocking.
9. **INV-9** — Resume reads durable GitHub state before AO sessions and never duplicates a specification, ticket, worker, or PR. One mechanical recovery message is allowed; a still-blocked ticket receives `needs-info` and one ELI18 decision while unrelated work continues. Mechanism: composition test checks reconciliation and escalation language.
10. **INV-10** — After planned PRs merge, the orchestrator runs full verification and `/code-review` from a fixed base. Confirmed findings become small follow-up tickets, with at most two automatic follow-up and review rounds. Mechanism: composition test checks review, follow-up, and round limit.
11. **INV-11** — The seam documents only current AO controls and excludes retired configuration, batch spawning, and unverified per-spawn model flags. Mechanism: composition test checks the negative boundary.
12. **INV-12** — Composition tests, this leaf, ADR-0008, the glossary, the architecture index, and derived human docs describe the same AO-first contract. Mechanism: composition test and `scripts/docs-check.sh`.

## Further notes

ADR-0007 remains the historical Agent Manager design. ADR-0008 supersedes its execution backend and live-session rules. The implementation adapter retains direct-main delivery for standalone use and adds an AO pull-request branch for this seam.

Planning delegation does not run unattended. `plan-this` depends on `/grill-with-docs`, `/to-spec`, and `/to-tickets`, which each require explicit human invocation; an agent cannot traverse the planning chain without human input at each locked stage. Similarly, `implement-this` depends on `/implement`, which requires explicit human invocation. See ADR-0009.

## Links

- Specification: [#72](https://github.com/RuralNative/RuralNative-SKILLS/issues/72)
- Decision: `docs/adr/0008-supervise-this-agent-orchestrator.md`.
- Decision: `docs/adr/0009-delegation-invariants-human-invocation.md` — locked delegation chains and human-invocation requirement.
- Historical decision: `docs/adr/0007-supervise-this-coordinator.md`.
- Harness: `scripts/docs-check.sh`.
- Template: `skills/document-for-agents/reference/templates.md`.
