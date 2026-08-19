# Installing document-for-humans

`document-for-humans` is a model-invoked skill: once installed, the agent loads
it automatically when plain-language human-facing documentation work appears —
stakeholder overviews, decision journals, plain-language explanations for
non-technical readers, or docs for vibe coders. You can also invoke it by name
at any time.

## Requirements

- A repo with an AI-first doc tree (the document-for-agents skill's output).
- `unslopify` as a hard dependency. Install it before this skill. The skill has
  no other runtime or framework requirement and works on any codebase an agent
  can read.

## Install

### Via the skills registry (recommended)

Install the hard dependency first, then this skill:

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill unslopify
npx skills add RuralNative/RuralNative-SKILLS --skill document-for-humans
```

Both commands must succeed before running a human-docs workflow. If
`unslopify` is absent the workflow stops before any draft and emits the exact
instruction `npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`.
Missing Python for the optional scanner at `skills/unslopify/scanner.py` does
not stop the workflow.

The registry CLI clones the repository, resolves each skill by name, and
installs it into your agent's standard skills directory.

### Manual install (copy-based fallback)

Clone the repository if you have not. The relative path
`skills/document-for-humans` only resolves from the clone root, inside an
installed skill directory it does not exist and `cp` fails with
`cp: cannot stat ... No such file or directory`:

```
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
```

From that clone's root, copy the dependency first, then this skill. Each
destination folder must be named for its skill and contain `SKILL.md` at its
root alongside the `reference/` directory:

```
# Anthropic Claude Code (user-wide)
cp -r skills/unslopify ~/.claude/skills/unslopify
cp -r skills/document-for-humans ~/.claude/skills/document-for-humans

# Kilo (project scope)
cp -r skills/unslopify .kilo/skills/unslopify
cp -r skills/document-for-humans .kilo/skills/document-for-humans

# Kilo (user-wide)
cp -r skills/unslopify ~/.agents/skills/unslopify
cp -r skills/document-for-humans ~/.agents/skills/document-for-humans
```

For other platforms, place each `SKILL.md` and `reference/` in whatever
location your agent loads skills from, keeping the folder names `unslopify` and
`document-for-humans`. Dependency order and recovery are as stated above for
the registry path: install `unslopify` first, and the workflow stops with
`npx skills add RuralNative/RuralNative-SKILLS --skill unslopify` if it is
absent while missing Python does not stop it.

## Verify

Ask the agent:

> Establish human-first docs for this repo.

A healthy run creates the `docs/human/` tree with the overview artifact, wires
the prevention stack and freshness rule into the repo's gate script, and leaves
the human-docs extension installed with a green gate.

For a repo that already has human docs, ask instead:

> Audit our human docs.

A healthy audit returns a numbered findings list — sources resolvable, stamps
honest, tone within budget — with a fix for each finding, or a clean pass.

## Integrate

1. **Establish** (Branch A) builds the tree, derives the first artifacts, and
   installs the gate extension. On a small repo, the size step keeps the
   artifact set minimal.
2. Make the gate actually run in your change path — a script entry, pre-commit
   hook, or CI job — so read-set absence, link direction, and derived
   freshness are enforced mechanically rather than by memory.
3. **Maintain** (Branch C) is the steady state: same-diff regeneration on
   source change, one new journal entry per accepted decision, and a green
   gate.

## Files

- `SKILL.md` — the lifecycle: six principles, three branches, completion
  criteria.
- `reference/routing.md` — audience routing, the derivation contract, tone.
- `reference/templates.md` — the four artifacts and the derived header.
- `reference/coherence.md` — the prevention stack and the freshness rule.
