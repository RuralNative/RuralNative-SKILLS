# Installing release-skills

`release-skills` is invoked explicitly by the user as `/release-skills` or
`/release-skills --dry-run`. It auto-detects version files and changelogs
across Node.js, Python, Rust, Claude Plugin, and generic projects, then
performs the release workflow including annotated tags and GitHub Releases.

## Requirements

- A codebase with a detectable version file (`package.json`, `pyproject.toml`,
  `Cargo.toml`, `marketplace.json`, `VERSION`, or `version.txt`).
- `gh` CLI installed and authenticated for GitHub Releases (optional; the skill
  degrades gracefully without it).
- No other hard dependencies.

## Install

### Via the skills registry (recommended)

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill release-skills
```

The registry CLI clones the repository, resolves the skill by name
`release-skills`, and installs it into your agent's standard skills directory.
The folder identity `release-skills` must match the frontmatter `name`
`release-skills`.

### Manual install (copy-based fallback)

Clone the repository if you have not. The relative path `skills/release-skills`
only resolves from the clone root:

```bash
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
```

From that clone's root, copy the folder into your skill directory. The
destination folder must be named `release-skills` and contain `SKILL.md` at its
root:

```bash
# Anthropic Claude Code (user-wide)
cp -r skills/release-skills ~/.claude/skills/release-skills

# Kilo (project scope)
cp -r skills/release-skills .kilo/skills/release-skills

# Kilo (user-wide)
cp -r skills/release-skills ~/.agents/skills/release-skills
```

For other platforms, place `SKILL.md` in whatever location your agent loads
skills from, keeping the folder name `release-skills`.

## Verify

Invoke explicitly:

> /release-skills --dry-run

A healthy run auto-detects the project's version file and changelogs, proposes
a version bump, and reports the dry-run preview without making changes.

## Files

- `SKILL.md` — the release workflow: detection, changelog generation, tagging,
  and GitHub Release publishing.
