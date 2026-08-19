# Installing plan-this

`plan-this` is a user-invoked skill: the agent runs it only when you invoke `/plan-this <task>`. It applies the exact planning prefix and inserts your invocation text under `## Task:`, then delegates to `/grill-with-docs` → `/to-spec` → `/to-tickets` with `/unslop` active.

## Requirements

- A codebase you want to plan work for.
- Hard dependencies: `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/unslop`. Install the skills that provide those commands before invoking this one. This wrapper does not reimplement them.
- `/unslop` is the external identity `https://www.skills.sh/cursor/plugins/unslop` — do not confuse it with this repository's local `unslopify` utility.

## Install

### Via the skills registry (recommended)

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill plan-this
```

The registry CLI clones the repository, resolves the skill by name `plan-this`, and installs it into your agent's standard skills directory. The folder identity `plan-this` must match the frontmatter `name` `plan-this`.

Install the hard dependencies via their own registries before use:

```bash
# hard dependencies — example registry lanes
npx skills add mattpocock/skills --skill grill-with-docs
npx skills add mattpocock/skills --skill to-spec
npx skills add mattpocock/skills --skill to-tickets
npx skills add cursor/plugins --skill unslop
```

### Manual install (copy-based fallback)

Clone the repository if you have not. The relative path `skills/plan-this` only resolves from the clone root:

```bash
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
```

From that clone's root, copy the folder into your skill directory. The destination folder must be named `plan-this` and contain `SKILL.md` at its root:

```bash
# Anthropic Claude Code (user-wide)
cp -r skills/plan-this ~/.claude/skills/plan-this

# Kilo (project scope)
cp -r skills/plan-this .kilo/skills/plan-this

# Kilo (user-wide)
cp -r skills/plan-this ~/.agents/skills/plan-this
```

For other platforms, place `SKILL.md` in whatever location your agent loads skills from, keeping the folder name `plan-this`.

## Verify

Invoke explicitly:

> /plan-this Create a Next.js App

A healthy run loads `/unslop` before the first progress update, runs `/grill-with-docs` → `/to-spec` → `/to-tickets` in order, and places the task `Create a Next.js App` verbatim under `## Task:` without other substitution.

## Files

- `SKILL.md` — the fixed planning prefix, hard-dependency order, task substitution slot, and boundary.
