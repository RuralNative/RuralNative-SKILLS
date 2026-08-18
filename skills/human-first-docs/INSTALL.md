# Installing human-first-docs

`human-first-docs` is a model-invoked skill: once installed, the agent loads
it automatically when plain-language human-facing documentation work appears —
stakeholder overviews, decision journals, plain-language explanations for
non-technical readers, or docs for vibe coders. You can also invoke it by name
at any time.

## Requirements

- A repo with an AI-first doc tree (the doc-architecture skill's output).
- Nothing else. The skill has no dependencies, no runtime, no language or
  framework requirements.

## Install

### Via the skills registry (recommended)

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill human-first-docs
```

The registry CLI clones the repository, resolves the skill by name, and
installs it into your agent's standard skills directory.

### Manual install (copy-based fallback)

The copy commands below must run from the root of a clone of
`RuralNative/RuralNative-SKILLS` — the relative path `skills/human-first-docs`
only resolves there. Inside an installed skill directory that path does not
exist, so `cp` fails with `cp: cannot stat ... No such file or directory`.
Clone first if you have not:

```
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
```

From that clone's root, copy the folder into your skill directory. The
destination folder must be named `human-first-docs` and contain `SKILL.md` at
its root, alongside the `reference/` directory:

```
# Anthropic Claude Code (user-wide)
cp -r skills/human-first-docs ~/.claude/skills/human-first-docs

# Kilo (project scope)
cp -r skills/human-first-docs .kilo/skills/human-first-docs

# Kilo (user-wide)
cp -r skills/human-first-docs ~/.agents/skills/human-first-docs
```

For other platforms, place `SKILL.md` and `reference/` in whatever location
your agent loads skills from, keeping the folder name `human-first-docs`.

## Verify

Ask the agent:

> Establish human-first docs for this repo.

A healthy run creates the `docs/human/` tree with the overview artifact, wires
the prevention stack and freshness rule, and leaves the gate extension
installed and green.

For a repo that already has human docs, ask instead:

> Audit our human docs.

A healthy audit returns a numbered findings list — sources resolvable, stamps
honest, tone within budget — with a fix for each finding, or a clean pass.

## Integrate

1. **Establish** (Branch A) builds the tree and derives the first artifacts.
   On a small repo, the size step keeps the artifact set minimal.
2. Wire the gate extension into the repo's check path — a script entry,
   pre-commit hook, or CI job — so read-set absence, link direction, and
   derived freshness are enforced mechanically.
3. **Maintain** (Branch C) is the steady state: same-diff regeneration on
   source change, one new journal entry per accepted decision, and a green
   gate.

## Files

- `SKILL.md` — the lifecycle: six principles, three branches, completion
  criteria.
- `reference/routing.md` — audience routing, the derivation contract, tone.
- `reference/templates.md` — the four artifacts and the derived header.
- `reference/coherence.md` — the prevention stack and the freshness rule.
