# Installing unslopify

`unslopify` is a model-invoked skill: once installed, the agent loads it
automatically when documentation or prose cleanup work appears — removing AI
tells, plain-language revision, or a final audit before publishing. You can
also invoke it by name at any time.

## Requirements

- A codebase or document set with prose you want to clean.
- Optional: Python 3 for the advisory scanner at `skills/unslopify/scanner.py`
  (standard library only, no network, no install). When Python is absent the
  skill runs the same meaning-safe workflow model-only without weakening scope
  or preservation rules.

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

## Optional scanner

When Python 3 is available, run the repeatable advisory scan before rewriting:

```bash
python3 skills/unslopify/scanner.py docs/example.md
python3 skills/unslopify/scanner.py --json docs/example.md | python3 -m json.tool
```

The scanner emits human text by default and stable versioned JSON with
`--json`. Every finding carries its `AIT-*` identifier, family, line span,
excerpt, evidence, measured value, threshold, and confidence. Thresholds are
advisory and never fail the repository gate. A valid scan exits `0` even with
findings; invalid input, unmatched `unslopify:off` ranges, parse failure, and
internal failures exit `1`–`4` with no partial JSON.

## Files

- `SKILL.md` — the workflow, pattern catalog, and advisory scanner contract.
- `scanner.py` — optional Python 3 scanner (stdlib only, no network, never writes source).
- `reference/parity.md` — parity catalog mapping upstream 1..31 to `AIT-*`.
- `NOTICE.md` — upstream source, pinned commit, copyright, and MIT permission.
