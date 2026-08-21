# Installing plan-this

`plan-this` is invoked directly by the user as `/plan-this <task>`. It applies the exact planning prefix and inserts the invocation task under `## Task:`, then delegates to `/grill-with-docs` → `/to-spec` → `/to-tickets` with `/unslopify` active. Unrelated invocation is rejected and no second planning contract is created.

## Requirements

- A codebase you want to plan work for.
- Hard dependencies: `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/unslopify`. Install the skills that provide those commands before invoking this one. This wrapper does not reimplement them.
- `/unslopify` is this repository's local prose-cleanup utility — install it before use; the workflow stops without it.

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
npx skills add RuralNative/RuralNative-SKILLS --skill unslopify
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

A healthy run loads `/unslopify` before the first progress update and keeps it active throughout `/grill-with-docs` → `/to-spec` → `/to-tickets`, runs those three delegated skills in order, and places the full task `Create a Next.js App` verbatim under `## Task:` without truncation or other substitution — matching the trimmed `SKILL.md` body exactly (workflow line, `## Rules:` with ten bullets, final `**Why / What / Where / How**` line, and single `## Task:` slot). Completion stops after its ELI18 summary.

## Drift guard

Former wrapper sections — Invocation details, Hard dependencies exposition, Rules preserved summary, Installation and discovery, and Boundary — now live only in `docs/leaves/plan-this.md`, this `INSTALL.md`, and `docs/adr/0006-plan-this-fixed-template-adapter.md`, not in `SKILL.md`. `SKILL.md` must stay within 18–35 lines including frontmatter (~21, target ~25-35) and must not contain wrapper phrases `Rules preserved`, `## Installation`, `## Boundary`, `--- start of supplied`, or `This skill is a thin fixed-template adapter`. The composition test in `skills/plan-this/tests/composition.test.ts` enforces this bound, the negative checks, the byte-for-byte body preservation, and the allowed-invocation contract (direct `/plan-this <task>` only, rejecting unrelated invocation).

## Files

- `SKILL.md` — the fixed planning prefix, hard-dependency order, task substitution slot, and boundary.
