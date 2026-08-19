# Installing unslopify

`unslopify` is a model-invoked skill: once installed, the agent loads it
automatically when documentation or prose cleanup work appears — removing AI
tells, plain-language revision, or a final audit before publishing. You can
also invoke it by name at any time.

## Requirements

- A codebase or document set with prose you want to clean.
- Nothing else. The skill has no dependencies, no runtime, no language or
  framework requirements. It works on any prose you name.

## Install

### Via the skills registry (recommended)

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill unslopify
```

The registry CLI clones the repository, resolves the skill by name, and
installs it into your agent's standard skills directory.

### Manual install (copy-based fallback)

The copy commands below must run from the root of a clone of
`RuralNative/RuralNative-SKILLS` — the relative path `skills/unslopify`
only resolves there. Inside an installed skill directory that path does not
exist, so `cp` fails with `cp: cannot stat ... No such file or directory`.
Clone first if you have not:

```
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
```

From that clone's root, copy the folder into your skill directory. The
destination folder must be named `unslopify` and contain `SKILL.md` at
its root, alongside the `reference/` directory:

```
# Anthropic Claude Code (user-wide)
cp -r skills/unslopify ~/.claude/skills/unslopify

# Kilo (project scope)
cp -r skills/unslopify .kilo/skills/unslopify

# Kilo (user-wide)
cp -r skills/unslopify ~/.agents/skills/unslopify
```

For other platforms, place `SKILL.md`, `NOTICE.md`, and `reference/` in
whatever location your agent loads skills from, keeping the folder name
`unslopify`.

## Verify

Ask the agent:

> Clean this file with unslopify: docs/example.md

A healthy run scans the explicit scope, reports findings with upstream and
`AIT-*` identifiers, rewrites only supported spans, and self-audits the result.
It does not claim authorship detection and it leaves non-English passages and
protected content unchanged.

## Files

- `SKILL.md` — the four-step workflow and 31 pattern families.
- `reference/parity.md` — parity catalog mapping upstream 1..31 to `AIT-*`.
- `NOTICE.md` — upstream source, pinned commit, copyright, and MIT permission.
