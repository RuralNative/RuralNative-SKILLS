# Installing document-for-agents

`document-for-agents` is a model-invoked skill: once installed, the agent loads
it automatically when documentation architecture work appears — setting up
agent-facing docs, diagnosing stale docs, or adding a lightweight ADR process.
You can also invoke it by name at any time.

## Requirements

- A codebase you want an AI agent to work in reliably.
- `unslopify` as a hard dependency. Install it before this skill — prose
  quality checks load before any user-visible prose and run a final audit
  before publishing. Missing `unslopify` stops the workflow with an install
  instruction; missing Python for the optional scanner does not stop it.
  The skill otherwise has no runtime or framework requirements and works on any
  codebase an agent can read.

## Install

### Via the skills registry (recommended)

Install the hard dependency first, then this skill. Both commands must succeed
before running a documentation workflow — missing `unslopify` stops the workflow
with the install instruction below, while missing Python does not stop it.

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill unslopify
npx skills add RuralNative/RuralNative-SKILLS --skill document-for-agents
```

The registry CLI clones the repository, resolves each skill by name, and
installs it into your agent's standard skills directory. If
`skills/unslopify/SKILL.md` is absent the workflow stops and emits the exact
instruction `npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`
before any draft or issue is published.

### Manual install (copy-based fallback)

The copy commands below must run from the root of a clone of
`RuralNative/RuralNative-SKILLS` — the relative path `skills/document-for-agents`
only resolves there. Inside an installed skill directory that path does not
exist, so `cp` fails with `cp: cannot stat ... No such file or directory`.
Clone first if you have not:

```
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
```

From that clone's root, copy both the dependency and this skill into your
skill directory. The dependency must be present before any documentation
workflow. Each destination folder must be named for its skill and contain
`SKILL.md` at its root, alongside the `reference/` directory:

```
# Anthropic Claude Code (user-wide) — install dependency first
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
`document-for-agents`. Verify `skills/unslopify/SKILL.md` exists before running
a workflow — the workflow stops with `npx skills add
RuralNative/RuralNative-SKILLS --skill unslopify` if it is absent.

## Verify

Ask the agent:

> Run the doc-cache audit on this repo.

A healthy run labels every documentation file into a tier and ends with a
diff-able plan. If the repo has no docs yet, run Branch A instead:

> Establish the doc tree for this repo.

## Integrate

1. **Establish** (Branch A) builds the tree and harness for your codebase. On
   a small repo, the size step intentionally keeps it minimal — index,
   glossary, conventions only.
2. **Audit** (Branch B) any existing documentation you distrust before
   building on it.
3. Add the harness check to your standard check path — a script entry,
   pre-commit hook, or CI job — so freshness is enforced mechanically.
4. **Maintain** (Branch C) is the steady state: same-diff doc updates, the
   code-wins rule, append-only ADRs, and a green harness.

## Files

- `SKILL.md` — the lifecycle: six principles, three branches, completion
  criteria.
- `reference/classify.md` — routes every fact to its doc tier.
- `reference/harness.md` — the portable change-aware gate.
- `reference/templates.md` — mini-ADR, leaf doc, index, policy set,
  vendor-facts, glossary, debt registry, loading protocol.
