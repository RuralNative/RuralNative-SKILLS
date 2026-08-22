# Seam: implement-this

## Purpose

`implement-this` applies the one-issue implementation workflow. It runs `/implement`, keeps ticket authority and verification in one place, and chooses direct-main delivery for standalone use or manager-worktree pull-request delivery when the session runs inside a Kilo Agent Manager worktree.

## Scope & boundaries

Owns `skills/implement-this/`: the one-issue adapter, installation guide, and composition tests. It does not create worktrees, schedule dependency waves, choose models, or copy the supervisor contract. The direct path pushes only after rebase and verification. The manager-worktree path detects its location by path, creates or updates a pull request, posts evidence, and swaps `ready-for-agent` for `ready-for-human`; it leaves merge and issue closure to the pull request lifecycle.

## Key files & data flow

`SKILL.md` substitutes one requested issue for `Issue #0`. The worker reads the issue and native blockers, claims it, runs `/implement`, updates the affected leaf and tests, verifies the repository, then chooses delivery from the worktree location. A manager worktree is present when the worktree root sits under the Kilo Agent Manager worktree location; in that branch the worker opens or updates a pull request, posts evidence, and swaps the labels, and never pushes directly to `main`. Its composition tests import the shared file reader, normalizer, and frontmatter stripper from `scripts/test-helpers.ts`.

The skill packages a runtime copy of the pure workflow state core at `workflow-state.ts` (#132): a pure decision module that turns observed ticket, worker, pull-request, review, and verification facts into frontier selection, dispatch validation with the three-worker cap where every worker not yet stopped holds a slot, duplicate ownership is rejected, and a `needs-info` stop is refused, label transitions that also remove a stale `unblocked` label when a blocker reopens and scope the fresh-ticket `ready-for-agent` grant to unassigned children of the specification, one-retry recovery whose `needs-info` stop holds on every later pass, head freshness, merge eligibility, follow-up creation, and parent completion decisions. The authored source is `scripts/workflow-state.ts`; running `node scripts/generate-workflow-state.ts` regenerates byte-identical copies into all three workflow skills so each registry install is self-contained, and repository verification fails when a copy drifts.

## Non-negotiables

1. **INV-1** — `SKILL.md` frontmatter `name` equals the folder name `implement-this`. Mechanism: identity composition test and docs harness.
2. **INV-2** — `INSTALL.md` uses `npx skills add RuralNative/RuralNative-SKILLS --skill implement-this`, gives a matching manual copy, and documents direct and manager-worktree single-issue invocation. Mechanism: composition test.
3. **INV-3** — The workflow is a single-stage `/implement` flow with one `Issue #0` substitution point, ticket authority, blocker checks, and the repository verification command. `/implement` sets `disable-model-invocation: true` and requires explicit human invocation; an agent cannot traverse the chain unattended. `/unslopify` carries no such lock and remains model-invocable. Mechanism: composition test.
4. **INV-4** — Hard dependencies are `/implement` and `/unslopify`, in that order. Repository-owned `/unslopify` loads before the first progress update under scope, protected-content, preservation, and completion-report contracts; the worker uses the focused doc-cache route `AGENTS.md → ARCHITECTURE.md → affected seam leaf → CONTEXT.md → relevant ADRs` owned by `document-for-agents` and does not preload derived human docs from `document-for-humans`. The worker verifies dependency install, tests, TypeScript, and the docs harness before delivery. Mechanism: composition test.
5. **INV-5** — Standalone delivery keeps the fixed direct-main path: fixed review base, valid findings fixed, rebase, verification, `git push origin HEAD:main`, evidence, label removal, and assigned-ticket closure. Mechanism: composition test.
6. **INV-6** — Manager-worktree delivery detects that the session's worktree root sits under the Kilo Agent Manager worktree location; when it does, the worker pushes the feature branch, opens or updates a pull request against `main` whose body carries the closing reference for the assigned ticket, posts acceptance-criterion evidence on the ticket, removes `ready-for-agent`, and adds `ready-for-human`. It never closes the ticket before merge, never pushes directly to `main`, and never force-pushes. Mechanism: composition test (test-encoded invariant).
7. **INV-7** — The adapter accepts one issue only. An unclear delivery mode produces one ELI18 decision before pushing or creating a PR; scheduling remains the supervisor's job. Mechanism: composition test.
8. **INV-8** — Native dependency state is canonical (human Blocked by text is fallback). The adapter reads native blocked_by state before claiming and stops while an open native blocker exists. After closing its assigned ticket it recomputes the dependent frontier and updates only newly unblocked dependents (remove blocked, add unblocked + ready-for-agent when all native blockers are closed); it otherwise works only on its assigned ticket except for that explicit tracker-state transition. Mechanism: composition test.

## Verification

Run:

```bash
npm run verify
```

## Further notes

ADR-0006 records the original fixed-template adapter. ADR-0008 previously added an Agent Orchestrator delivery branch; that branch is retired by the supervise-this retirement (issues #116/#117) and replaced by the manager-worktree path-detection trigger recorded in ADR-0012. ADR-0009 records the decision to keep `disable-model-invocation` locks on `/implement` and to document the human-invocation requirement in the workflow invariant rather than unlock the skill for unattended model traversal. The direct-main delivery mode is unchanged by the manager-worktree mode.

The review stage was extracted from this seam (#124, parent #123): review now lives in the `review-this` seam (`docs/leaves/review-this.md`), which owns the `/code-review` invocation template and nothing about implementation or delivery. This skill does only implementation and delivery with a single delegated `/implement` stage. ADR-0013 records the decoupling; ADR-0009's mention of `/code-review` alongside this seam's workflow invariant is historical from that decision onward.

## Links

- Specification: [#72](https://github.com/RuralNative/RuralNative-SKILLS/issues/72).
- Split decision: [#125](https://github.com/RuralNative/RuralNative-SKILLS/issues/125) — review moved to the `review-this` seam (`docs/leaves/review-this.md`).
- Decision: `docs/adr/0013-review-this-decoupled-code-review.md` — the review decoupling and glossary exception.
- Decision: `docs/adr/0012-manager-worktree-pull-request-delivery.md` — manager-worktree path-detection trigger.
- Historical decision (retired): `docs/adr/0008-supervise-this-agent-orchestrator.md`.
- Decision: `docs/adr/0009-delegation-invariants-human-invocation.md` — locked delegation chains and human-invocation requirement.
- Historical template decision: `docs/adr/0006-plan-this-fixed-template-adapter.md`.
- Glossary: `CONTEXT.md`.
- Harness: `scripts/docs-check.sh`.
