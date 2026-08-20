# Installing release-skills

`release-skills` is the universal release workflow. It auto-detects version files and changelogs for Node.js, Python, Rust, Claude Plugin, and generic projects, then handles version bumps, annotated tags, GitHub Releases, and historical backfill. Use it when you say `release`, `bump version`, `GitHub Release`, and the other trigger phrases listed in `SKILL.md`.

## Requirements

- A Git repository with a version file (`package.json`, `pyproject.toml`, `Cargo.toml`, `marketplace.json`, `VERSION` or `version.txt`) and at least one changelog (`CHANGELOG*.md`, `HISTORY*.md`, or `CHANGES*.md`).
- `git` and, for GitHub Releases, an authenticated `gh` CLI.

## Install

### Via the skills registry (recommended)

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill release-skills
```

The registry CLI clones the repository, resolves the skill by name `release-skills`, and installs it into your agent's standard skills directory. The folder identity `release-skills` must match the frontmatter `name` `release-skills`.

### Manual install (copy-based fallback)

Clone the repository if you have not. The relative path `skills/release-skills` only resolves from the clone root:

```bash
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
```

From that clone's root, copy the folder into your skill directory. The destination folder must be named `release-skills` and contain `SKILL.md` at its root:

```bash
# Anthropic Claude Code (user-wide)
cp -r skills/release-skills ~/.claude/skills/release-skills

# Kilo (project scope)
cp -r skills/release-skills .kilo/skills/release-skills

# Kilo (user-wide)
cp -r skills/release-skills ~/.agents/skills/release-skills
```

For other platforms, place `SKILL.md` in whatever location your agent loads skills from, keeping the folder name `release-skills`.

## Verify

Invoke with a dry run:

> /release-skills --dry-run

A healthy run auto-detects the version file and changelogs, shows the proposed bump with grouped changes by skill or module, and previews changelog inserts without writing tags or GitHub Releases.

For a real release, run:

> /release-skills

The skill walks the ten-step workflow described in `SKILL.md` — detection, change analysis, version bump, changelog generation, grouping, commits, version update, confirmation, tag, and publish.

To backfill missing releases for existing tags:

> /release-skills --backfill-releases

## Files

- `SKILL.md` — the ten-step release workflow, trigger phrases, supported project types, hooks, and configuration.
