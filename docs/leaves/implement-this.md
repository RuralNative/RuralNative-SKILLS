# Seam: implement-this

## Purpose

`implement-this` applies the one-issue implementation workflow. It runs `/implement` and `/code-review`, keeps ticket authority and verification in one place, and chooses direct-main delivery for standalone use or pull-request delivery when the worktree sits under the Kilo Agent Manager worktree location.

## Scope & boundaries

Owns `skills/implement-this/`: the one-issue adapter, installation guide, and composition tests. It does not create worktrees, schedule dependency waves, or choose models. The direct path pushes only after rebase and verification. The manager-worktree path creates or updates a pull request and leaves review, merge, and issue closure to the pull request; the agent posts evidence and swaps labels.

## Key files & data flow

`SKILL.md` substitutes one requested issue for `Issue #0`. The worker reads the issue and native blockers, claims it, runs `/implement`, updates the affected leaf and tests, verifies the repository, runs `/code-review`, then chooses delivery by path detection. Manager-worktree context is present when the worktree root sits under the Kilo Agent Manager worktree location. The worker opens or updates a pull request and never pushes directly to `main` in that branch; direct-main context pushes `HEAD:main` after rebase and verification.

## Non-negotiables

1. **INV-1** — `SKILL.md` frontmatter `name` equals the folder name `implement-this`. Mechanism: identity composition test and docs harness.
2. **INV-2** — `INSTALL.md` uses `npx skills add RuralNative/RuralNative-SKILLS --skill implement-this`, gives a matching manual copy, and documents direct and AO single-issue invocation. Mechanism: composition test.
3. **INV-3** — The workflow contains the `/implement` → `/code-review` order, one `Issue #0` substitution point, ticket authority, blocker checks, and the repository verification command. `/implement` sets `disable-model-invocation: true` and requires explicit human invocation; an agent cannot traverse the chain unattended. `/code-review` and `/unslop` carry no such lock and remain model-invocable. Mechanism: composition test.
4. **INV-4** — Repository-owned `/unslopify` loads before the first progress update under scope, protected-content, preservation, and completion-report contracts; the worker uses the focused doc-cache route `AGENTS.md → ARCHITECTURE.md → affected seam leaf → CONTEXT.md → relevant ADRs` owned by `document-for-agents` and does not preload derived human docs from `document-for-humans`. The worker verifies formatting, tests, lint, TypeScript, docs, and build before delivery. Mechanism: composition test.
5. **INV-5** — Standalone delivery keeps the fixed direct-main path: fixed review base, valid findings fixed, rebase, verification, `git push origin HEAD:main`, evidence, label removal, and assigned-ticket closure. Mechanism: composition test.
6. **INV-6** — Manager-worktree delivery creates or updates a pull request after local verification and review, does not push directly to `main`, and does not close the issue before merge. Path detection is the trigger: the worktree root under the manager worktree location selects this branch. Mechanism: composition test.
7. **INV-7** — The adapter accepts one issue only. An unclear delivery mode produces one ELI18 decision before pushing or opening a PR; path detection runs first, direct-main is the fallback. Mechanism: composition test.
8. **INV-8** — Native dependency state is canonical (human Blocked by text is fallback). The adapter reads native blocked_by state before claiming and stops while an open native blocker exists. After closing its assigned ticket it recomputes the dependent frontier and updates only newly unblocked dependents (remove blocked, add unblocked + ready-for-agent when all native blockers are closed); it otherwise works only on its assigned ticket except for that explicit tracker-state transition. Mechanism: composition test.

## Verification

Run:

```bash
npm run verify
```

## Further notes

ADR-0006 records the original fixed-template adapter. ADR-0008 added the Agent Orchestrator delivery branch; ADR-0012 replaces it with manager-worktree path detection after the coordinator seam was retired (ADR-0011), leaving the direct-main path unchanged. ADR-0009 records the decision to keep `disable-model-invocation` locks on `/implement` and to document the human-invocation requirement in the workflow invariant rather than unlock the skill for unattended model traversal.

## Links

- Specification: [#72](https://github.com/RuralNative/RuralNative-SKILLS/issues/72).
- Decision: `docs/adr/0012-manager-worktree-pull-request-delivery.md` — manager-worktree path detection replaces the retired AO delivery branch.
- Decision: `docs/adr/0009-delegation-invariants-human-invocation.md` — locked delegation chains and human-invocation requirement.
- Historical template decision: `docs/adr/0006-plan-this-fixed-template-adapter.md`.
- Glossary: `CONTEXT.md`.
- Harness: `scripts/docs-check.sh`.
