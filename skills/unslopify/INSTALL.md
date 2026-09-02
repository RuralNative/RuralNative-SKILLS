# Installing unslopify

`unslopify` is a model-invoked skill: once installed, the agent loads it
automatically when documentation or prose cleanup work appears — removing AI
tells, plain-language revision, or a final audit before publishing. You can
also invoke it by name at any time.

## Session loading: one invocation per project

The Skills CLI has no skill-defined setup hook: `npx skills add` only clones,
discovers, and copies or links skill files. Installation therefore cannot
establish persistent session loading. After installing, invoke `unslopify`
once in each project: on that first load the skill creates or updates one
owned block in the project's root `AGENTS.md` (see the Session-start setup
section in `SKILL.md`), and later sessions in that project load the skill
before the first user-visible response. Existing installs updated to this
version gain persistence only after the skill is loaded once; do not imply
installation performed setup.

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
its root, alongside the `reference/` directory. `cp -r` replaces an existing
destination silently; check whether the folder already exists first, and
overwriting an existing `unslopify` install requires the user's explicit
approval:

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

## Source provenance and trust

Installing this skill is a trust decision in its source repository,
`RuralNative/RuralNative-SKILLS`. Record provenance for what you install:
note the resolved commit the registry CLI reports, or pin the revision you
reviewed where the installer accepts a ref. The upstream `unslop` baseline is
already pinned at commit `99559f2f52047978602ef365589275831e76af07` in
`NOTICE.md`; that pins the reviewed upstream revision, it does not certify it.

Provenance and pinning narrow what can change under you; they do not remove
the residual trust in the source repository. Snyk's August 2026 audit reported
Medium W011 for this skill's install path. Pinning reviewed revisions
addresses that exposure; the finding has not gone away and the underlying
repository trust remains yours to make.

`unslopify` performs no downloads at run time: the scanner is local, standard
library only, and makes no network requests. Workflow runs never fetch, clone,
or install skills mid-run. Manual installs must not overwrite an existing
`unslopify` folder without the user's explicit approval.
