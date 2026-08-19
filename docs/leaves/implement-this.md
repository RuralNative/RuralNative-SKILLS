# Seam: implement-this

## Purpose

The skill that applies the implementation prefix as a fixed template. It is user-invoked as `/implement-this #<n>`, preserves the supplied implementation workflow verbatim, substitutes the requested issue reference in place of `Issue #0`, and delegates to `/implement` and `/code-review` with `/unslop` active.

## Scope & boundaries

Owns: the content under `skills/implement-this/` — `SKILL.md`, `INSTALL.md`, `tests/`. Delegates: the implementation workflow to `/implement` and `/code-review`; prose quality to `/unslop` (external, not `unslopify`). The seam is a fixed-template adapter — it does not reimplement delegated skills, copy the `AIT-*` catalog, add runtime scripts, or create `.kilo/command/` entries. Installation uses the registry lane only. The second slice extends shared catalog documentation established by the `plan-this` slice.

## Key files & data flow

`SKILL.md` is the entry point; its frontmatter `name` is the skill identity `implement-this` and its `description` declares the explicit invocation `/implement-this #<n>`. The consumption path: user runs `/implement-this #<n>` → skill loads `/unslop` before the first progress update and keeps it active → runs `/implement` followed by `/code-review` in order, substituting only the issue reference in place of `Issue #0` → follows worktree checks, ticket authority, claiming, verification, documentation, review, rebase, push, and issue-closing steps per the prefix. The template carries the exact implementation prefix, including Rules, Start, Build and verify, Review & Deliver, and the `## Ticket Issue #0` slot with the exact Git commands `git branch --show-current`, `git status --short`, `git fetch origin`, `gh issue edit <n> --add-assignee @me`, `npm ci`, `npm run format && npm test && npm run lint && npx tsc --noEmit && npm run docs:check && npm run build`, `BASE=$(git merge-base origin/main HEAD)`, `git rebase origin/main`, and `git push origin HEAD:main` with never force-push. `INSTALL.md` documents the registry lane `npx skills add RuralNative/RuralNative-SKILLS --skill implement-this` and the manual copy `cp -r skills/implement-this`. The registry discovery walks `skills/implement-this/` and a consumer installs by skill identity. The repo never carries its own install — `.agents/` and `skills-lock.json` are ignored. Tests live in `skills/implement-this/tests/` and encode the invariants.

## Non-negotiables

1. **INV-1** — `SKILL.md` frontmatter `name` equals the folder name `implement-this`.
2. **INV-2** — The registry-lane command in `INSTALL.md` installs this seam as `npx skills add RuralNative/RuralNative-SKILLS --skill implement-this` with matching manual copy `cp -r skills/implement-this`; discovery text names the explicit user invocation `/implement-this #<n>` and preserves the example `Issue #100` in place of `Issue #0`.
3. **INV-3** — Fixed-template boundary: `SKILL.md` preserves the exact supplied implementation prefix, including `Implement the GitHub ticket in this dedicated worktree: ` + `` `/implement` → `/code-review` ``, the six Rules bullets, the five Start steps, the Build and verify block, the five Review & Deliver steps with never force-push, and the `## Ticket Issue #0` slot, substituting only the issue reference; it preserves exact Git commands, identifiers `ready-for-agent`, `AGENTS.md`, `docs/agents/issue-tracker.md`, `Issue #0`, `/tmp/kilo`, dependency names, quotations, and technical meaning, and does not add router skills, `.kilo/command/` files, runtime scripts, or model evals. Mechanism: prose invariant — `SKILL.md` contains the verbatim prefix and a single `Issue #0` substitution point, with no extra machinery file on disk.
4. **INV-4** — Hard dependencies are `/unslop`, `/implement`, and `/code-review` with workflow order `/implement` followed by `/code-review` and `/unslop` loaded before the first progress update and kept active throughout; hard dependencies, in order, are `/implement`, `/code-review`, and `/unslop`, following the supplied implementation prefix. The skill does not silently map `/unslop` to `unslopify`; the local `unslopify` seam stays unchanged. Mechanism: composition test in `skills/implement-this/tests/` verifies dependency names appear and workflow order is preserved.
5. **INV-5** — The skill is user-invoked only via `/implement-this #<n>`; its `description` makes the explicit slash command and accepted input clear and it does not introduce broad automatic triggering. Preserved rules include worktree checks, ticket and specification authority, dependency checks, claiming, verification, documentation, review, rebase, push, issue comment, label removal, and closure with the final ELI18 Why / What / Where / How summary including commit SHA, verification results, and closed ticket link. Mechanism: composition test verifies explicit invocation phrasing and presence of preserved rule sections and exact Git commands.

## Links

- Glossary: `CONTEXT.md` — Skill, skill identity, skill naming convention, distribution shelf, registry lane.
- Decision: `docs/adr/0006-plan-this-fixed-template-adapter.md` — task-scoped exception and template boundary for both adapters.
- Harness: `scripts/docs-check.sh`.
- Template: `skills/document-for-agents/reference/templates.md` — the shape this leaf doc follows.
