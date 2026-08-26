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
`unslopify` is absent the workflow stops before any draft and directs the
owner to this file's Install section; workflow execution performs no skill
downloads. Missing Python for the optional scanner at
`skills/unslopify/scanner.py` does not stop the workflow.

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
root alongside the `reference/` directory. `cp -r` replaces an existing
destination silently; check whether the folder already exists first, and
overwriting an existing install requires the user's explicit approval:

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
`document-for-humans`. Dependency order and recovery are as stated in the
Install section above: install `unslopify` first, and if it is absent the
workflow stops before any draft and directs the owner to this file's Install
section while missing Python does not stop it.

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

## Source provenance and trust

Installing this skill is a trust decision in its source repository,
`RuralNative/RuralNative-SKILLS`. Record provenance for what you install:
note the resolved commit the registry CLI reports, or pin the revision you
reviewed where the installer accepts a ref. `unslopify` is a hard dependency
from the same repository; record provenance for it the same way.

Provenance and pinning narrow what can change under you; they do not remove
the residual trust in the source repository. Snyk's August 2026 audit of this
shelf reported Critical for this skill's install path — an executable
installer instruction embedded in its agent-facing `SKILL.md`, removed under
ADR-0015 so no install command remains in this skill's `SKILL.md` — along
with Critical E005 and Medium W011 for `plan-this` and Medium W011 for
`implement-this` and `unslopify`; treat this skill's install path with the
same posture. Pinning reviewed revisions addresses that exposure, the findings
have not gone away, and the underlying repository trust remains yours to make.

Manual installs must not overwrite an existing `document-for-humans` folder
without the user's explicit approval.
