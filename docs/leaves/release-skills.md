# Seam: release-skills

## Purpose

The skill that automates versioning and release for any project type, detecting version files and changelogs, handling annotated tags, GitHub Releases, and historical backfill across Node.js, Python, Rust, Claude Plugin, and generic projects.

## Scope & boundaries

Owns: the content under `skills/release-skills/` — `SKILL.md`, `INSTALL.md`, `tests/`. Delegates: triggering to explicit user invocation via `/release-skills` variants; version file handling to language-specific tooling. The seam does not own distribution beyond `npx skills add`.

## Key files & data flow

`SKILL.md` is the entry point; its frontmatter `name` is the skill identity `release-skills` and its `description` declares trigger phrases like `release`, `发布`, `new version`, `bump version`, `push`, `推送`, `release notes`, `GitHub Release`, `回填 Release`. The consumption path: user runs a release trigger → skill auto-detects version files (`package.json`, `pyproject.toml`, `Cargo.toml`, `marketplace.json`, `VERSION`/`version.txt`) and changelogs (`CHANGELOG*.md`, `HISTORY*.md`, `CHANGES*.md`) in priority order → determines bump, tags, and GitHub Release steps → performs historical backfill when requested. Installation uses the registry lane `npx skills add RuralNative/RuralNative-SKILLS --skill release-skills` and the manual copy `cp -r skills/release-skills` documented in `INSTALL.md`. Tests live in `skills/release-skills/tests/composition.test.ts` and encode the invariants.

## Non-negotiables

1. **INV-1** — `SKILL.md` frontmatter `name` equals the folder name `release-skills`. Mechanism: composition test in `skills/release-skills/tests/` verifies identity, that `INSTALL.md` exists with the registry-lane command `npx skills add RuralNative/RuralNative-SKILLS --skill release-skills` and matching manual copy `cp -r skills/release-skills`, that `SKILL.md` prose does not duplicate the install command, and that the leaf and seam table reference the seam.
2. **INV-2** — The skill is invoked via release trigger phrases and auto-detects supported project types without manual configuration. The `description` and body list trigger phrases (`release`, `发布`, `new version`, `bump version`, `push`, `推送`, `release notes`, `GitHub Release`, `回填 Release`) and the Supported Projects table lists `package.json`, `pyproject.toml`, `Cargo.toml`, `marketplace.json`, `VERSION`/`version.txt` with priority order and changelog globs `CHANGELOG*.md`, `HISTORY*.md`, `CHANGES*.md`. Mechanism: composition test in `skills/release-skills/tests/` verifies trigger phrases and supported files against `SKILL.md`.

## Links

- Glossary: `CONTEXT.md` — Skill, skill identity, distribution shelf, registry lane, test-encoded invariant.
- Harness: `scripts/docs-check.sh`.
- Template: `skills/document-for-agents/reference/templates.md` — the shape this leaf doc follows.
- Install: `skills/release-skills/INSTALL.md` — registry lane and manual copy.
