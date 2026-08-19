# Installing implement-this

`implement-this` is a user-invoked skill: the agent runs it either when you invoke `/implement-this #<n>` directly or when an active `supervise-this` run delegates one assigned issue in a dedicated Agent Manager worktree. It applies the exact implementation prefix and substitutes your issue reference in place of `Issue #0`, then delegates to `/implement` → `/code-review` with `/unslop` active. Delegated use still works on only the assigned issue, stops if its native blocker is open, and keeps worktree safety, verification, review, rebase, push, evidence, label removal, and single-ticket closure.

## Requirements

- A GitHub repository with an issue tracker and a dedicated worktree for the ticket.
- Hard dependencies: `/implement`, `/code-review`, and `/unslop`. Install the skills that provide those commands before invoking this one. This wrapper does not reimplement them.
- `/unslop` is the external identity `https://www.skills.sh/cursor/plugins/unslop` — do not confuse it with this repository's local `unslopify` utility.

## Install

### Via the skills registry (recommended)

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill implement-this
```

The registry CLI clones the repository, resolves the skill by name `implement-this`, and installs it into your agent's standard skills directory. The folder identity `implement-this` must match the frontmatter `name` `implement-this`.

Install the hard dependencies via their own registries before use:

```bash
# hard dependencies — example registry lanes
npx skills add mattpocock/skills --skill implement
npx skills add mattpocock/skills --skill code-review
npx skills add cursor/plugins --skill unslop
```

### Manual install (copy-based fallback)

Clone the repository if you have not. The relative path `skills/implement-this` only resolves from the clone root:

```bash
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
```

From that clone's root, copy the folder into your skill directory. The destination folder must be named `implement-this` and contain `SKILL.md` at its root:

```bash
# Anthropic Claude Code (user-wide)
cp -r skills/implement-this ~/.claude/skills/implement-this

# Kilo (project scope)
cp -r skills/implement-this .kilo/skills/implement-this

# Kilo (user-wide)
cp -r skills/implement-this ~/.agents/skills/implement-this
```

For other platforms, place `SKILL.md` in whatever location your agent loads skills from, keeping the folder name `implement-this`.

## Verify

Invoke explicitly:

> /implement-this #100

A healthy run loads `/unslop` before the first progress update, runs `/implement` followed by `/code-review` in order, and places the requested reference in place of `Issue #0` — for example `Issue #100` for `/implement-this #100` — without other substitution, matching the trimmed `SKILL.md`. An active `supervise-this` run delegating one issue uses the same single-issue substitution and retains the same worktree checks, ticket authority, blocker gate, verification, documentation, review, rebase, push, evidence, label removal, and single-ticket closure contract. The exact Git commands `git branch --show-current`, `git status --short`, `git fetch origin`, `gh issue edit <n> --add-assignee @me`, `npm ci`, `npm run format && npm test && npm run lint && npx tsc --noEmit && npm run docs:check && npm run build`, `BASE=$(git merge-base origin/main HEAD)`, `git rebase origin/main`, and `git push origin HEAD:main` remain unchanged.

## Files

- `SKILL.md` — the fixed implementation prefix, hard-dependency order, issue substitution slot, and boundary.

## Notes

Former wrapper sections — Invocation details, Hard dependencies exposition, Rules preserved summary, Installation, and Boundary — now live only in the leaf doc, this INSTALL guide, and the ADR, not in `SKILL.md`. The trimmed `SKILL.md` contains only frontmatter plus the fixed prefix with the single `Issue #0` substitution point.

### Drift guard

`SKILL.md` must not contain wrapper phrases such as `Rules preserved`, `## Installation`, `## Boundary`, `--- start of supplied`, `This skill is a thin fixed-template adapter`, `## Invocation`, or `## Hard dependencies`. The composition test `skills/implement-this/tests/composition.test.ts` enforces the trimmed shape and fails if any wrapper phrase leaks back. Keep this file and the leaf doc as the single home for wrapper reference material.
