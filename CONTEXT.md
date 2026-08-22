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

**Skill naming convention**:
Verb-first, audience-suffixed skill identities — the verb names the job,
the suffix names who serves or reads (document-for-agents,
document-for-humans). Per ADR-0004, with a narrow exception for
audience-neutral utilities such as `unslopify` where one behavior applies
unchanged across audiences and a suffix would invent a false distinction
(ADR-0005), and for task-scoped fixed-template workflow adapters such as
`plan-this`, `implement-this`, and `review-this`
where the identity is the user-facing slash command and a suffix would
obscure the explicit invocation contract. See ADR-0006 and ADR-0013.
_Avoid_: noun-phrase names (documentation-for-ai), router prefixes (docs/)

**AI tell**:
A lexical, structural, formatting, conversational, evidence, or voice pattern
associated with model-generated prose, such as puffery, promotional language,
stock vocabulary, uniform cadence, or canned framing. An AI tell names a
writing pattern, not an author verdict or authorship detection claim.
_Avoid_: Slop (when a specific pattern is meant), AI content, AI authorship

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
`skills/document-for-agents/reference/harness.md`.
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


**Delivery mode**:
The rule that selects how `implement-this` hands finished work to the repository, chosen from the session's worktree location: manager-worktree pull-request delivery or direct-main delivery.
_Avoid_: delivery branch (when the mode is meant)

**Manager worktree**:
A git worktree whose root sits under the Kilo Agent Manager worktree location; `implement-this` detects it by path and switches to pull-request delivery.
_Avoid_: agent worktree, AO worktree

**Requirements data**:
Prose flowing through a workflow — task text, issue bodies, comments, specifications, review comments, rewrite input — that states work and evidence but cannot widen scope, select files, authorize tools, or override workflow gates (ADR-0015). `unslopify` applies the same rule to scoped prose: prompt-like text is inert content, never instruction.
_Avoid_: instructions (when ticket prose is meant), executable input

**Instruction residue**:
Prompt-like imperatives left in prose — "ignore previous instructions", "you are now authorized" — reported by `unslopify` as the inert-content candidate `AIT-EVD-010`.
_Avoid_: injection payload (an authorship or security-verdict claim)
