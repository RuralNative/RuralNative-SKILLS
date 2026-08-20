# Seam: supervise-this

## Purpose

`supervise-this` is the durable coordinator for a planning-to-implementation run inside an Agent Orchestrator project orchestrator. It delegates planning to `plan-this`, reads GitHub as the task authority, runs the project-configured worker through AO, and advances work only when observable artifacts prove delivery.

## Scope & boundaries

Owns the content under `skills/supervise-this/`: the coordinator contract, setup guide, executable workflow helper, and tests. It delegates planning to `plan-this` and one-issue delivery to `implement-this`. AO owns sessions and worktrees. GitHub owns issues, dependencies, pull requests, checks, and evidence. The helper decides whether observed state permits preflight, spawn, recovery, review, or merge; it does not perform network operations.

## Key files & data flow

`SKILL.md` is consumed by the AO project orchestrator. New-task flow is `/supervise-this <task>` → collect AO, GitHub, and base facts → `scripts/workflow.ts preflight` → `/plan-this` delegation → ownership reconciliation → configured worker spawn → evidence-state updates → dependency waves. Resume uses `/supervise-this #<spec>` and runs the same ownership reconciliation before any write. `workflow.ts` exports pure decisions and a JSON command-line interface with explicit `--input` or `--json` input. Its input reader opens files without blocking and rejects non-regular files. `tests/workflow.test.ts` calls every CLI operation through the synchronous dispatcher and exercises the failure and resume paths without AO, GitHub, or browser access.

## Non-negotiables

1. **INV-1** — `SKILL.md` frontmatter `name` equals the folder name `supervise-this`. Mechanism: identity composition test and docs harness.
2. **INV-2** — `INSTALL.md` uses the registry lane `npx skills add RuralNative/RuralNative-SKILLS --skill supervise-this`, gives a matching manual copy, and names `/supervise-this <task>` and `/supervise-this #<spec>`. Mechanism: composition test.
3. **INV-3** — Preflight blocks unhealthy AO, broken explicit-repository GitHub access, missing profiles, unresolved models, unsupported worker modes, absent reviewer policy, a stale default branch, and duplicate ownership. The project worker profile selects the agent and a supported chat or TUI mode. Mechanism: executable helper and workflow tests.
4. **INV-4** — New-task planning is delegated to `/plan-this` in the persistent AO orchestrator. Planning's delegated stages `/grill-with-docs`, `/to-spec`, and `/to-tickets` require explicit human invocation because each sets `disable-model-invocation: true`; the orchestrator cannot traverse planning unattended and pauses at each locked stage until a human invokes it. Planning and worker creation are intermediate checkpoints, never terminal summaries. Mechanism: composition test checks delegated planning in the persistent orchestrator session, the human-invocation requirement on delegated planning stages, persistent ownership, and the no-conclusive-summary boundary.
5. **INV-5** — Open PRs, AO sessions, branches, assignees, and issue links form one ownership record. Existing ownership returns `review` or `resume`; only an unowned ready ticket returns `spawn`. The active implementation limit is three. Mechanism: executable reconciliation tests.
6. **INV-6** — Progress uses `READY`, `CLAIMED`, `BASE_CURRENT`, `EDITING`, `PR_OPEN`, `REVIEWED`, `MERGED`, `EVIDENCED`, and `CLOSED`. AO activity labels cannot advance state. A merged blocker opens the next wave. Mechanism: delivery-state and wave tests.
7. **INV-7** — Each worker runs `/implement-this #<n>` in AO pull-request delivery. Workers do not push directly to `main` or close issues before merge. Mechanism: composition test checks one-issue prompts, PR delivery, and AO ownership.
8. **INV-8** — Merge preserves the reviewed head SHA. AO manages current owned PRs; an explicit-repository GitHub fallback handles a legacy PR only when AO cannot. Same-account review can record a verdict but cannot satisfy approval-only policy. Mechanism: merge and reviewer-policy tests.
9. **INV-9** — Idle plus an open issue, no PR, and no tracked change is red. Recovery counts infrastructure, task, and implementation failures separately. Resume collapses duplicate evidence to one action. Mechanism: idle, recovery, and idempotence tests.
10. **INV-10** — After planned PRs merge, the orchestrator runs full verification and `/code-review` from a fixed base. Confirmed findings become small follow-up tickets, with at most two automatic follow-up and review rounds. Mechanism: composition test checks the review boundary; workflow tests check reviewed-head policy.
11. **INV-11** — The seam documents only current AO controls and excludes retired configuration, batch spawning, and unverified per-spawn model flags. Mechanism: composition test checks the negative boundary.
12. **INV-12** — Composition tests, workflow tests, this leaf, ADR-0008, ADR-0010, the glossary, the architecture index, and derived human docs describe the same AO-first contract. Mechanism: composition test and `scripts/docs-check.sh`.

## Further notes

ADR-0007 remains the historical Agent Manager design. ADR-0008 chose AO as the runtime. ADR-0010 replaces its hardcoded worker and activity-based recovery details with executable, evidence-based decisions.

## Links

- Specification: [#72](https://github.com/RuralNative/RuralNative-SKILLS/issues/72)
- Hardening ticket: [#89](https://github.com/RuralNative/RuralNative-SKILLS/issues/89)
- Decision: `docs/adr/0008-supervise-this-agent-orchestrator.md`.
- Decision: `docs/adr/0009-delegation-invariants-human-invocation.md`.
- Decision: `docs/adr/0010-supervise-by-delivery-evidence.md`.
- Historical decision: `docs/adr/0007-supervise-this-coordinator.md`.
- Harness: `scripts/docs-check.sh`.
- Template: `skills/document-for-agents/reference/templates.md`.
