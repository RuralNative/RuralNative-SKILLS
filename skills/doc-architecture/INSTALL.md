# Installing doc-architecture

`doc-architecture` is a model-invoked skill: once installed, the agent loads
it automatically when documentation architecture work appears — setting up
agent-facing docs, diagnosing stale docs, or adding a lightweight ADR process.
You can also invoke it by name at any time.

## Requirements

- A codebase you want an AI agent to work in reliably.
- Nothing else. The skill has no dependencies, no runtime, no language or
  framework requirements. It works on any codebase an agent can read.

## Install

### Via the skills registry (recommended)

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill doc-architecture
```

The registry CLI clones the repository, resolves the skill by name, and
installs it into your agent's standard skills directory.

### Manual install (copy-based fallback)

The copy commands below must run from the root of a clone of
`RuralNative/RuralNative-SKILLS` — the relative path `skills/doc-architecture`
only resolves there. Inside an installed skill directory that path does not
exist, so `cp` fails with `cp: cannot stat ... No such file or directory`.
Clone first if you have not:

```
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
```

From that clone's root, copy the folder into your skill directory. The
destination folder must be named `doc-architecture` and contain `SKILL.md` at
its root, alongside the `reference/` directory:

```
# Anthropic Claude Code (user-wide)
cp -r skills/doc-architecture ~/.claude/skills/doc-architecture

# Kilo (project scope)
cp -r skills/doc-architecture .kilo/skills/doc-architecture

# Kilo (user-wide)
cp -r skills/doc-architecture ~/.agents/skills/doc-architecture
```

For other platforms, place `SKILL.md` and `reference/` in whatever location
your agent loads skills from, keeping the folder name `doc-architecture`.

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
