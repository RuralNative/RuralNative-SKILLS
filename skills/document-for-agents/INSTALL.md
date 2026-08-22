# Installing document-for-agents

`document-for-agents` is a model-invoked skill: once installed, the agent loads
it automatically when documentation architecture work appears, setting up
agent-facing docs, diagnosing stale docs, or adding a lightweight ADR process.
You can also invoke it by name at any time.

## Requirements

- A codebase you want an AI agent to work in reliably.
- `unslopify` as a hard dependency. Install it before this skill. The skill has
  no other runtime or framework requirement and works on any codebase an agent
  can read.

## Install

### Via the skills registry (recommended)

Install the hard dependency first, then this skill:

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill unslopify
npx skills add RuralNative/RuralNative-SKILLS --skill document-for-agents
```

Both commands must succeed before running a documentation workflow. If
`unslopify` is absent the workflow stops before any draft and emits the exact
instruction `npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`.
Missing Python for the optional scanner at `skills/unslopify/scanner.py` does
not stop the workflow.

The registry CLI clones the repository, resolves each skill by name, and
installs it into your agent's standard skills directory.

### Manual install (copy-based fallback)

Clone the repository if you have not. The relative path
`skills/document-for-agents` only resolves from the clone root, inside an
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
cp -r skills/document-for-agents ~/.claude/skills/document-for-agents

# Kilo (project scope)
cp -r skills/unslopify .kilo/skills/unslopify
cp -r skills/document-for-agents .kilo/skills/document-for-agents

# Kilo (user-wide)
cp -r skills/unslopify ~/.agents/skills/unslopify
cp -r skills/document-for-agents ~/.agents/skills/document-for-agents
```

For other platforms, place each `SKILL.md` and `reference/` in whatever
location your agent loads skills from, keeping the folder names `unslopify` and
`document-for-agents`. Dependency order and recovery are as stated above for
the registry path: install `unslopify` first, and the workflow stops with
`npx skills add RuralNative/RuralNative-SKILLS --skill unslopify` if it is
absent while missing Python does not stop it.

## Verify

Ask the agent:

> Run the doc-cache audit on this repo.

A healthy run labels every documentation file into a tier and ends with a
diff-able plan. If the repo has no docs yet, run Branch A instead:

> Establish the doc tree for this repo.

## Integrate

1. **Establish** (Branch A) builds the tree and harness for your codebase. On
   a small repo, the size step intentionally keeps it minimal, index,
   glossary, conventions only.
2. **Audit** (Branch B) any existing documentation you distrust before
   building on it.
3. Add the harness check to your standard check path, a script entry,
   pre-commit hook, or CI job, so freshness is enforced mechanically.
4. **Maintain** (Branch C) is the steady state: same-diff doc updates, the
   code-wins rule, append-only ADRs, and a green harness.

## Files

- `SKILL.md`: the lifecycle, six principles, three branches, completion
  criteria.
- `reference/classify.md`: routes every fact to its doc tier.
- `reference/harness.md`: the portable change-aware gate.
- `reference/templates.md`: mini-ADR, leaf doc, index, policy set,
  vendor-facts, glossary, debt registry, loading protocol.

## Source provenance and trust

Installing this skill is a trust decision in its source repository,
`RuralNative/RuralNative-SKILLS`. Record provenance for what you install:
note the resolved commit the registry CLI reports, or pin the revision you
reviewed where the installer accepts a ref. `unslopify` is a hard dependency
from the same repository; record provenance for it the same way.

Provenance and pinning narrow what can change under you; they do not remove
the residual trust in the source repository. Snyk's August 2026 audit of this
shelf reported Critical E005 and Medium W011 for `plan-this` and Medium W011
for `implement-this` and `unslopify`; treat this skill's install path with the
same posture. Pinning reviewed revisions addresses that exposure, the findings
have not gone away, and the underlying repository trust remains yours to make.

Manual installs must not overwrite an existing `document-for-agents` folder
without the user's explicit approval.
