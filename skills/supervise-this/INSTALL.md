# Installing supervise-this

`supervise-this` coordinates model-aware planning and implementation. Invoke as `/supervise-this <task>` for a new run or `/supervise-this #<spec>` to resume. It requires planning model, planning variant, implementation model, and implementation variant before the task or spec reference, with an optional review model and review variant that default together to the confirmed planning selection. Every model name and variant is resolved through `agent_manager_models` with no hard-coded allowlist, the exact resolved planning, implementation, and review selections are shown for approval before any session starts, and planning runs as a local Agent Manager session that delegates to `plan-this`.

## Requirements

- A codebase with GitHub issues enabled for durable specifications and tickets.
- Kilo with Agent Manager for live session routing and model catalog via `agent_manager_models`.
- Hard delegation targets: `plan-this` and `implement-this` remain the single sources for planning and per-ticket implementation. This skill does not copy their prefixes.
- `agent_manager_models` is available for live model and variant resolution. The skill accepts catalog model names and qualified provider and model identifiers.

## Install

### Via the skills registry (recommended)

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill supervise-this
```

The registry CLI clones the repository, resolves the skill by name `supervise-this`, and installs it into your agent's standard skills directory. The folder identity `supervise-this` must match the frontmatter `name` `supervise-this`.

Install the hard delegation targets via their own registry lanes before use:

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill plan-this
npx skills add RuralNative/RuralNative-SKILLS --skill implement-this
```

### Manual install (copy-based fallback)

Clone the repository if you have not. The relative path `skills/supervise-this` only resolves from the clone root:

```bash
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
```

From that clone's root, copy the folder into your skill directory. The destination folder must be named `supervise-this` and contain `SKILL.md` at its root:

```bash
# Anthropic Claude Code (user-wide)
cp -r skills/supervise-this ~/.claude/skills/supervise-this

# Kilo (project scope)
cp -r skills/supervise-this .kilo/skills/supervise-this

# Kilo (user-wide)
cp -r skills/supervise-this ~/.agents/skills/supervise-this
```

For other platforms, place `SKILL.md` in whatever location your agent loads skills from, keeping the folder name `supervise-this`.

## Verify

New run with complete input:

> /supervise-this planning: Muse Spark 1.2 Contributor / high | implementation: Muse Spark 1.2 Contributor / low | review: DeepSeek V4 Flash / high | task: Add supervised coordinator

A healthy run resolves every model name and variant through `agent_manager_models`, verifies each variant, shows the exact resolved planning, implementation, and review selections, waits for one confirmation, then starts `plan-this` in a local Agent Manager session with the confirmed planning model and variant. Review defaults to the confirmed planning selection when both review fields are omitted. A partial review selection or any missing required field produces one ELI18 decision before any session starts. An unavailable or ambiguous model or variant pauses planning and returns one ELI18 decision with a recommendation; no silent fallback is permitted. The delegated planning session honors all `plan-this` approval gates and returns the published specification and ticket references to the supervisor.

After planning publishes the parent and tickets, the supervisor posts one structured parent comment that records the resolved planning, implementation, and review model and variant selections before implementation starts. The skill does not claim to change the model of the current Kilo session; it starts a separate local session with the confirmed planning selection and never claims to change the model of the current Kilo session.

Review defaulting:

> /supervise-this planning: Muse Spark 1.2 Contributor / high | implementation: Muse Spark 1.2 Contributor / low | task: Add supervised coordinator

Review defaults together to the confirmed planning selection.

Partial review (should ask):

> /supervise-this planning: Muse Spark 1.2 Contributor / high | implementation: Muse Spark 1.2 Contributor / low | review: DeepSeek V4 Flash | task: Add supervised coordinator

Produces one ELI18 decision asking to finish or remove the review pair, before any session.

Qualified provider identifier:

> /supervise-this planning: openai/gpt-5.6-sol / high | implementation: anthropic/claude-opus-4.1 / low | task: Add supervised coordinator

Catalog resolution accepts the qualified identifier and validates the variant.

Unavailable variant (should pause):

> /supervise-this planning: Muse Spark 1.2 Contributor / ultra | implementation: Muse Spark 1.2 Contributor / low | task: Add supervised coordinator

Pauses and returns one ELI18 decision; no fallback model is substituted.

## Drift guard

This skill contains no hard-coded model allowlist. Model and variant validation always goes through `agent_manager_models`. The composition test in `skills/supervise-this/tests/composition.test.ts` enforces the invocation contract, review defaulting, partial-review handling, catalog resolution, qualified identifier acceptance, approval before execution, unavailable-selection pause, local planning-session routing, and the ban on silent fallback.

## Files

- `SKILL.md` — the supervised coordination contract, preflight via `agent_manager_models`, approval, local planning delegation, and parent recording.
