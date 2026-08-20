# Seam: implement-this

## Purpose

`implement-this` applies the one-issue implementation workflow. It runs `/implement` and `/code-review`, keeps ticket authority and verification in one place, and chooses direct-main delivery for standalone use or pull-request delivery when an Agent Orchestrator worker invokes it.

## Scope & boundaries

Owns `skills/implement-this/`: the one-issue adapter, installation guide, and composition tests. It does not create worktrees, schedule dependency waves, choose AO models, or copy the supervisor contract. The direct path pushes only after rebase and verification. The AO path creates or updates a pull request and leaves CI, review feedback, merge, session recovery, and issue closure to AO and `supervise-this`.

## Key files & data flow

`SKILL.md` substitutes one requested issue for `Issue #0`. The worker reads the issue and native blockers, claims it, runs `/implement`, updates the affected leaf and tests, verifies the repository, runs `/code-review`, then chooses delivery from AO context. AO context is present when `AO_SESSION_ID` and `AO_PROJECT_ID` exist or the active supervisor names AO pull-request delivery. The worker reports the PR and evidence to AO and never pushes directly to `main` in that branch.

## Non-negotiables

1. **INV-1** — `SKILL.md` frontmatter `name` equals the folder name `implement-this`. Mechanism: identity composition test and docs harness.
2. **INV-2** — `INSTALL.md` uses `npx skills add RuralNative/RuralNative-SKILLS --skill implement-this`, gives a matching manual copy, and documents direct and AO single-issue invocation. Mechanism: composition test.
3. **INV-3** — The workflow contains the `/implement` → `/code-review` order, one `Issue #0` substitution point, ticket authority, blocker checks, and the repository verification command. Mechanism: composition test.
4. **INV-4** — `/unslop` loads before the first progress update, and the worker verifies formatting, tests, lint, TypeScript, docs, and build before delivery. Mechanism: composition test.
5. **INV-5** — Standalone delivery keeps the fixed direct-main path: fixed review base, valid findings fixed, rebase, verification, `git push origin HEAD:main`, evidence, label removal, and assigned-ticket closure. Mechanism: composition test.
6. **INV-6** — AO delivery creates or updates a pull request after local verification and review, does not push directly to `main`, and does not close the issue before merge. AO owns worker lifecycle and feedback. Mechanism: composition test.
7. **INV-7** — The adapter accepts one issue only. An unclear delivery mode produces one ELI18 decision before pushing or creating a PR; scheduling remains the supervisor's job. Mechanism: composition test.

## Verification

Run:

```bash
npm run verify
```

## Further notes

ADR-0006 records the original fixed-template adapter. ADR-0008 adds the AO delivery branch without changing the direct-main path. `/supervise-this` is the only delegated coordinator named by this seam.

## Links

- Specification: [#72](https://github.com/RuralNative/RuralNative-SKILLS/issues/72).
- Decision: `docs/adr/0008-supervise-this-agent-orchestrator.md`.
- Historical template decision: `docs/adr/0006-plan-this-fixed-template-adapter.md`.
- Glossary: `CONTEXT.md`.
- Harness: `scripts/docs-check.sh`.
