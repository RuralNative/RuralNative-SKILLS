# 0011 — Retire supervise-this

Status: accepted
Date: 2026-08-21
Supersedes: ADR-0007 coordinator design, ADR-0008 Agent Orchestrator runtime, ADR-0010 delivery-evidence rules

Decision: `supervise-this` is removed from the distribution shelf whole — skill folder, install guide, workflow helper, both test files, and its leaf doc. Nothing in the maintained workflow starts a supervised multi-worker run anymore, so every neighboring contract that carried coordination machinery shrinks to match reality:

- `plan-this` accepts direct user invocation as `/plan-this <task>` only. Its locked fixed-template body stays byte-for-byte unchanged; only frontmatter, install guide, leaf doc, and tests drop the delegated path.
- `implement-this` keeps direct-main delivery as its sole mode for now. The Agent Orchestrator worker branch, its precedence language, and its test assertions are removed without changing the direct-main contract's semantics.
- The glossary drops the Agent Orchestrator run entry and the retired identity leaves the naming-convention examples.

What replaces coordinated runs: a user plans with `/plan-this <task>` and implements each ticket with `/implement-this #<n>`, one issue at a time on the direct-main path. Pull-request delivery from manager worktrees arrives through the already-published feature issue, amended so no Agent Orchestrator precedence is built.

Final invariant set at removal, kept here because the leaf doc that held them is deleted:

1. Skill identity equaled the folder name `supervise-this`; install used the registry lane `npx skills add RuralNative/RuralNative-SKILLS --skill supervise-this`.
2. Preflight blocked unhealthy AO, broken explicit-repository GitHub access, missing role profiles, unresolved models, unsupported worker modes, absent reviewer policy, a stale default branch, and duplicate ownership before any spawn.
3. New-task planning was delegated to `/plan-this` in the persistent orchestrator session and paused at each locked stage (`/grill-with-docs`, `/to-spec`, `/to-tickets`) until a human invoked it.
4. Open PRs, AO sessions, branches, assignees, and issue links formed one ownership record; only an unowned ready ticket could spawn, with at most three active workers.
5. Progress used the ordered states `READY`, `CLAIMED`, `BASE_CURRENT`, `EDITING`, `PR_OPEN`, `REVIEWED`, `MERGED`, `EVIDENCED`, `CLOSED`; activity labels never advanced state.
6. Each worker ran `/implement-this #<n>` in pull-request delivery and never pushed directly to `main` or closed issues before merge.
7. Merge preserved the reviewed head SHA; same-account review could record a verdict but not satisfy approval-only policy; recovery counted infrastructure, task, and implementation failures separately.
8. After planned PRs merged, the orchestrator ran full verification and `/code-review` from a fixed base, with at most two automatic follow-up rounds.

Why: keeping the seam forced `plan-this` to promise a delegated invocation path that cannot happen, `implement-this` to carry a delivery branch nothing selects, and four docs plus a glossary entry to describe orchestration that never runs. Deleting the seam lets those contracts state what is true. The ADRs are superseded, not deleted, and their numbers are never reused.

Consequences:

- Registry consumers can no longer install a coordinator from this shelf.
- ADR-0007, ADR-0008, and ADR-0010 carry superseded status banners pointing here; ADR-0009 stays accepted because it governs the surviving locked-skill contracts of `plan-this` and `implement-this`.
- The architecture index lists this file as the retirement decision and moves the three coordination ADRs to its superseded section treatment.
- The harness's seam-table completeness check accepts a labeled superseded section so retired decisions stay covered without being referenced as current.
