# Extended detail — document-for-humans

Restated reference material for `docs/leaves/document-for-humans.md`. Not a
leaf, not part of any orientation set. Code and tests are authoritative; this
file holds the longer key-file walk-through and invariant mechanism detail
that the compact leaf core points past.

## Key files & data flow

`SKILL.md` is the entry point; its frontmatter `name` is the skill identity.
`reference/` files resolve relative to it: `routing.md` maps audiences to
artifacts and defines the derivation contract, `templates.md` holds the four
artifact templates and the derived header block, `coherence.md` the prevention
stack and the freshness rule. `INSTALL.md` covers the install path and records
source provenance, residual repository trust, and the overwrite-approval guard
for manual copies (ADR-0015). The consumption path: sources → derived docs →
human readers; agents regenerate on source change, humans get plain language
with one-way bridges into depth. The gate extension in `scripts/docs-check.sh`
enforces read-set absence, one-way links, and derived freshness for
`docs/human/`, dormant until the tree exists. Installed runtime resolves
`unslopify` by skill identity, not by a repository-relative path.

## Invariant mechanisms

- INV-6 mechanism: short adapter in `SKILL.md` (skill-identity load,
  parent-owned scope, precedence, missing-dependency stop, model-only path,
  final audit, catalog-ownership note); dependency visible in `INSTALL.md`;
  composition tests in `skills/document-for-humans/tests/` encode the
  invariant including fixtures that reject code, issues, commits, and
  human-first docs as sources and behavior-based checks that README routing
  headings and install order hold against the current README without locking
  whole prose passages; the single-source check pins the four section headings
  (routing, workflow, installation, requirements) and keeps shelf and routing
  from repeating install commands; runtime resolution by skill identity is
  asserted on the skill body, not on the README. The composition tests import
  the shared file reader and normalizer from `scripts/test-helpers.ts`.
