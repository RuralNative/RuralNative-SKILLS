# Seam: release-skills

## Purpose

Prepares releases for any project type: detects version files and changelogs, handles annotated tags and GitHub Releases, and supports historical backfill across Node.js, Python, Rust, Claude Plugin, and generic projects.

## Scope & boundaries

Owns `skills/release-skills/` (`SKILL.md`, `INSTALL.md`, `tests/`). Delegates triggering to explicit user invocation; version file handling to language-specific tooling. Distribution only via the registry lane.
**Not here**: lifecycle decisions belong to `document-for-agents`; prose cleanup to `unslopify`.

## Key files & data flow

`SKILL.md` (entry, `name: release-skills`). Frontmatter declares trigger phrases; the body keeps the ten-step release path, multi-language changelog rules, backfill flow, `.releaserc.yml`. A trigger auto-detects version files (`package.json`, `pyproject.toml`, `Cargo.toml`, `marketplace.json`, `VERSION`/`version.txt`) and changelog globs (`CHANGELOG*.md`, `HISTORY*.md`, `CHANGES*.md`) in priority order, then bumps, tags, and releases. Install via `npx skills add RuralNative/RuralNative-SKILLS --skill release-skills` and manual copy in `INSTALL.md`. Tests in `skills/release-skills/tests/`.

## Non-negotiables

1. **INV-1** — `name` equals folder `release-skills`. Mechanism: composition test (identity, registry-lane install + manual copy, no install-command duplication, leaf/table references); `INSTALL.md` records provenance, residual trust (ADR-0015), explicit overwrite approval.
2. **INV-2** — Invoked via trigger phrases and auto-detects supported project types; supported files and changelog globs listed with priority order. Mechanism: composition test checks triggers and files against `SKILL.md`.

## Links

Glossary: `CONTEXT.md`. Harness: `scripts/docs-check.sh`. Install: `skills/release-skills/INSTALL.md`.

## Redirect

Restated detail in `docs/leaves/ext/release-skills.md`. Not a leaf; never followed by the resolver.
