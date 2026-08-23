# Installing plan-this

`plan-this` is invoked directly by the user as `/plan-this <task>`. It applies the exact planning prefix and inserts the invocation task under `## Task:`, then delegates to `/grill-with-docs` → `/to-spec` → `/to-tickets` with `/unslopify` active. One direct invocation authorizes that full interactive chain, but nothing publishes until the run completes at least one full grill frontier round, shows the shared understanding and the proposed ticket graph after the frontier is empty, and receives your explicit approval; an interrupted run resumes its recorded decision tree. Unrelated invocation is rejected and no second planning contract is created.

## Requirements

- A codebase you want to plan work for.
- Hard dependencies: `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/unslopify`. Install the skills that provide those commands before invoking this one. This wrapper does not reimplement them.
- `/unslopify` is this repository's local prose-cleanup utility — install it before use; the workflow stops without it.

## Install

### Via the skills registry (recommended)

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill plan-this
```

The registry CLI clones the repository, resolves the skill by name `plan-this`, and installs it into your agent's standard skills directory. The folder identity `plan-this` must match the frontmatter `name` `plan-this`.

Install the hard dependencies via their own registries before use:

```bash
# hard dependencies — example registry lanes
npx skills add mattpocock/skills --skill grill-with-docs
npx skills add mattpocock/skills --skill to-spec
npx skills add mattpocock/skills --skill to-tickets
npx skills add RuralNative/RuralNative-SKILLS --skill unslopify
```

### Manual install (copy-based fallback)

Clone the repository if you have not. The relative path `skills/plan-this` only resolves from the clone root:

```bash
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
```

From that clone's root, copy the folder into your skill directory. The destination folder must be named `plan-this` and contain `SKILL.md` at its root. `cp -r` replaces an existing destination silently, so check whether the folder already exists first; overwriting an existing `plan-this` install requires the user's explicit approval:

```bash
# Anthropic Claude Code (user-wide)
cp -r skills/plan-this ~/.claude/skills/plan-this

# Kilo (project scope)
cp -r skills/plan-this .kilo/skills/plan-this

# Kilo (user-wide)
cp -r skills/plan-this ~/.agents/skills/plan-this
```

For other platforms, place `SKILL.md` in whatever location your agent loads skills from, keeping the folder name `plan-this`.

## Verify

Invoke explicitly:

> /plan-this Create a Next.js App

A healthy run loads `/unslopify` before the first progress update and keeps it active throughout `/grill-with-docs` → `/to-spec` → `/to-tickets`, asks at least one full grill frontier round, shows the shared understanding and the proposed ticket graph, waits for your explicit approval before calling `/to-spec` and `/to-tickets`, runs those three delegated skills in order, and places the full task `Create a Next.js App` verbatim under `## Task:` without truncation or other substitution — matching the trimmed `SKILL.md` body exactly (workflow line, authorization-and-approval-gate paragraph, `## Rules:` with thirteen bullets, final `**Why / What / Where / How**` line, and single `## Task:` slot). Completion stops after its ELI18 summary.

## Drift guard

Former wrapper sections — Invocation details, Hard dependencies exposition, Rules preserved summary, Installation and discovery, and Boundary — now live only in `docs/leaves/plan-this.md`, this `INSTALL.md`, and `docs/adr/0006-plan-this-fixed-template-adapter.md`, not in `SKILL.md`. `SKILL.md` must stay within 18–35 lines including frontmatter (~26, target ~25-35) and must not contain wrapper phrases `Rules preserved`, `## Installation`, `## Boundary`, `--- start of supplied`, or `This skill is a thin fixed-template adapter`. The composition test in `skills/plan-this/tests/composition.test.ts` enforces this bound, the negative checks, the byte-for-byte body preservation, and the allowed-invocation contract (direct `/plan-this <task>` only, rejecting unrelated invocation).

## Files

- `SKILL.md` — the fixed planning prefix, hard-dependency order, task substitution slot, and boundary.

## Source provenance and trust

Installing this skill is a trust decision in its source repository, `RuralNative/RuralNative-SKILLS`. Record provenance for what you install: note the resolved commit the registry CLI reports, or pin the revision you reviewed where the installer accepts a ref. Review the external hard dependencies the same way — `/grill-with-docs`, `/to-spec`, and `/to-tickets` come from `mattpocock/skills`; pin the reviewed revision where their installer supports it and record the commit you reviewed otherwise.

Provenance and pinning narrow what can change under you; they do not remove the residual trust in the source repository. Snyk's August 2026 audit reported Critical E005 and Medium W011 for this skill's install path. Pinning reviewed revisions addresses that exposure; the findings have not gone away and the underlying repository trust remains yours to make.

Workflow runs perform no skill downloads: once installed, `/plan-this` never fetches, clones, or installs skills mid-run. Installation stays a user step outside the run. Manual installs must not overwrite an existing `plan-this` folder without the user's explicit approval.
