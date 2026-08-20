# Seam: release-skills

## Purpose

The skill that automates versioning and release for any project type, detecting version files and changelogs, handling annotated tags, GitHub Releases, and historical backfill across Node.js, Python, Rust, Claude Plugin, and generic projects.

## Scope & boundaries

Owns: the content under `skills/release-skills/` — `SKILL.md`, `INSTALL.md`, and `tests/composition.test.ts`. Delegates: triggering to explicit user invocation via `/release-skills` variants; version file handling to language-specific tooling. The seam does not own distribution beyond `npx skills add`.

## Key files & data flow

`SKILL.md` is the entry point; its frontmatter `name` is the skill identity `release-skills` and its `description` declares trigger phrases like `release`, `bump version`, `GitHub Release`. `INSTALL.md` documents the registry-lane and manual-copy install paths. The consumption path: user runs a release trigger → skill auto-detects version files (`package.json`, `pyproject.toml`, `Cargo.toml`, etc.) and changelogs → determines bump, tags, and GitHub Release steps → performs historical backfill when requested. Installation uses the registry lane `npx skills add` with the skill published under this repository's distribution shelf. The composition test in `skills/release-skills/tests/composition.test.ts` covers identity, install commands, trigger phrases, and auto-detection.

## Non-negotiables

1. **INV-1** — `SKILL.md` frontmatter `name` equals the folder name `release-skills`. Test-encoded in `skills/release-skills/tests/composition.test.ts`.
2. **INV-2** — The skill is invoked via release trigger phrases and auto-detects supported project types without manual configuration. Test-encoded in `skills/release-skills/tests/composition.test.ts`: checks trigger phrases in frontmatter description, supported project types in the body, and auto-detection declaration.

## Links

- Glossary: `CONTEXT.md` — Skill, skill identity, distribution shelf.
- Harness: `scripts/docs-check.sh`.
- Composition test: `skills/release-skills/tests/composition.test.ts` — test-encoded identity and trigger/auto-detection.
- Template: `skills/document-for-agents/reference/templates.md` — the shape this leaf doc follows.
