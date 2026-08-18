# RuralNative-SKILLS

A public distribution shelf for agent skills. The repository's purpose is to
publish installable skills, not merely to host them locally.

## Language

**Skill**:
A distributable unit of agent instructions — a directory containing
`SKILL.md` and its supporting reference files.
_Avoid_: Prompt, plugin

**Skill identity**:
The `name` declared in a skill's `SKILL.md` frontmatter. The registry keys on
it, and it must equal the folder name the skill lives in.
_Avoid_: Slug, skill name (when the folder name is meant)

**Distribution shelf**:
The `skills/` directory at the repository root. The registry's discovery
engine walks this directory to find installable skills.
_Avoid_: Root folder, skills folder (when the convention is meant)

**Registry lane**:
The distribution channel where consumers install a skill straight from the
public GitHub repository via the skills CLI (`npx skills add`). No npm
packaging is involved.
_Avoid_: npx install, package install

**Catalog layout**:
The shelf shape of `skills/<skill-identity>/`, as opposed to a single skill
folder at the repository root.
_Avoid_: Monorepo, folder structure

**Harness**:
The change-aware docs gate (`scripts/docs-check.sh`) that keeps the doc tree
coherent. The check set it enforces is defined in
`skills/doc-architecture/reference/harness.md`.
_Avoid_: CI job, docs:check

**Leaf doc**:
The doc-cache entry for one seam — purpose, scope, key files, data flow,
non-negotiables, links — kept to a 1–2 minute read. Lives in `docs/leaves/`.
_Avoid_: Seam doc, readme

**Seam**:
A module an agent edits as a unit: its own directory, entry files, tests, and
its own leaf doc once the tree is established. In this repo, each skill under
`skills/` is a seam.
_Avoid_: Folder, module

**Work doc**:
A record of in-flight work (plans, audits, notes). Default policy: work docs
live in the issue tracker, not the repo, and die with the work.
_Avoid_: Notes, scratch

**Debt item**:
A numbered `DEBT-N` record of a known shortcut or unfinished piece, carrying
a `Status:` and a `Revisit-when:` trigger.
_Avoid_: TODO, known issue

**Debt registry**:
The official home of debt items — `docs/debt.md`, or per-seam debt sections
in leaf docs — linked from the index, reviewed in every diff.
_Avoid_: Backlog, issue list

**Tombstone**:
A retired invariant kept verbatim in the leaf doc with a pointer to the
decision that retired it. History survives; the number is never reused.
_Avoid_: deletion, removal

**Test-encoded invariant**:
An invariant whose identifier appears literally in a file under the test
location the seam table declares; the drift test becomes a deletion.
_Avoid_: covered by tests (a coverage claim, not a marker)

**Prose invariant**:
An invariant that is not test-encoded; it must carry a justification naming
the mechanism that keeps it true.
_Avoid_: unverified invariant

**Human-first doc**:
Plain-language documentation for non-technical readers, derived from authored
docs and excluded from agent read sets.
_Avoid_: README (when the human tree is meant)

**Derived doc**:
A doc whose only input is other authored docs, carrying Derived/Sources
headers; regenerated on source change, never hand-edited against code.
_Avoid_: generated doc (reserved for code-derived artifacts)

**Decision journal**:
The append-only plain-language digest of ADRs — the stakeholder intervention
surface.
_Avoid_: changelog

**Bridge link**:
A one-way pointer from a human doc to an AI-first doc for depth.
_Avoid_: cross-reference (when one-way is meant)
