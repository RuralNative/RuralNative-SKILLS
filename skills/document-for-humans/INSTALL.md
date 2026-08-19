# Installing document-for-humans

`document-for-humans` is a model-invoked skill: once installed, the agent loads
it automatically when plain-language human-facing documentation work appears —
stakeholder overviews, decision journals, plain-language explanations for
non-technical readers, or docs for vibe coders. You can also invoke it by name
at any time.

## Requirements

- A repo with an AI-first doc tree (the document-for-agents skill's output).
- `unslopify` as a hard dependency. Install it before this skill — prose
  quality checks load before any user-visible prose and run a final audit
  before publishing. Missing `unslopify` stops the workflow with an install
  instruction; missing Python for the optional scanner does not stop it.
  The skill otherwise has no runtime or framework requirements.

## Install

### Via the skills registry (recommended)

Install the hard dependency first, then this skill. Both commands must succeed
before running a human-docs workflow — missing `unslopify` stops the workflow
with the install instruction below, while missing Python does not stop it.

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill unslopify
npx skills add RuralNative/RuralNative-SKILLS --skill document-for-humans
```

The registry CLI clones the repository, resolves each skill by name, and
installs it into your agent's standard skills directory. If
`skills/unslopify/SKILL.md` is absent the workflow stops and emits the exact
instruction `npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`
before any draft is published.

### Manual install (copy-based fallback)

The copy commands below must run from the root of a clone of
`RuralNative/RuralNative-SKILLS` — the relative path `skills/document-for-humans`
only resolves there. Inside an installed skill directory that path does not
exist, so `cp` fails with `cp: cannot stat ... No such file or directory`.
Clone first if you have not:

```
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
```

From that clone's root, copy both the dependency and this skill into your
skill directory. The dependency must be present before any human-docs workflow.
Each destination folder must be named for its skill and contain `SKILL.md` at
its root, alongside the `reference/` directory:

```
# Anthropic Claude Code (user-wide) — install dependency first
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
`document-for-humans`. Verify `skills/unslopify/SKILL.md` exists before running
a workflow — the workflow stops with `npx skills add
RuralNative/RuralNative-SKILLS --skill unslopify` if it is absent.

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
