# Extended detail — release-skills

Restated reference material for `docs/leaves/release-skills.md`. Not a leaf,
not part of any orientation set. Code and tests are authoritative; this file
holds the longer key-file walk-through and invariant mechanism detail that the
compact leaf core points past.

## Key files & data flow

`SKILL.md` is the entry point. Its frontmatter `name` is the skill identity
`release-skills`, and its `description` declares trigger phrases such as
`release`, `发布`, `new version`, `bump version`, `push`, `推送`, `release
notes`, `GitHub Release`, and `回填 Release`. The body uses sentence-case
headings and keeps the ten-step release path, multi-language changelog rules,
backfill flow, and `.releaserc.yml` configuration. A user runs a release
trigger, the skill auto-detects version files (`package.json`,
`pyproject.toml`, `Cargo.toml`, `marketplace.json`, `VERSION`/`version.txt`)
and changelogs (`CHANGELOG*.md`, `HISTORY*.md`, `CHANGES*.md`) in priority
order, then determines the bump, tags, and GitHub Release steps. Installation
uses the registry lane `npx skills add RuralNative/RuralNative-SKILLS --skill
release-skills` and the manual copy `cp -r skills/release-skills` documented
in `INSTALL.md`. Tests live in `skills/release-skills/tests/composition.test.ts`
and encode the invariants; they import the shared file reader and normalizer
from `scripts/test-helpers.ts`.

## Invariant mechanisms

- INV-1 mechanism: composition test in `skills/release-skills/tests/` verifies
  identity, that `INSTALL.md` exists with the registry-lane command and
  matching manual copy, that `SKILL.md` prose does not duplicate the install
  command, and that the leaf and seam table reference the seam.
- INV-2 mechanism: the composition test in `skills/release-skills/tests/`
  checks trigger phrases and supported files against `SKILL.md`.
