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
(ADR-0005), and for task-scoped fixed-template workflow adapters and
coordinators such as `plan-this`, `implement-this`, and `supervise-this`
where the identity is the user-facing slash command and a suffix would
obscure the explicit invocation contract. See ADR-0006 and ADR-0007.
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

**Supervised run**:
The lifecycle managed by `supervise-this` from model preflight through planning, implementation, and review. The user supplies explicit planning and implementation model and variant selections plus an optional review pair that defaults to planning, the supervisor resolves every choice through `agent_manager_models` and requires approval before any session, planning runs as a local Agent Manager session delegating to `plan-this`, the supervisor reads the structured model configuration recorded by #67 before starting implementation, records a fixed implementation review base, runs the ready frontier through at most three Agent Manager worktrees each delegating to `implement-this` with the exact confirmed implementation model and variant, uses `list` for live session IDs and states without editing persisted Agent Manager state, treats a ticket as complete only when GitHub shows it closed with evidence and a commit reachable from `origin/main`, refills freed slots in parent order, runs full repository verification after all children land, then runs integrated `code-review` in a local Agent Manager session with the exact confirmed review model and variant, the recorded base, and #62 as authority, posts parent evidence, and closes #62 only when checks pass and the review has no confirmed finding. Implementation and final-review model routing are explicit: every worker and every follow-up uses the confirmed implementation selection, every review session uses the confirmed review selection, and the final review does not inherit the supervisor or implementation model unless that model is the recorded review selection.
_Avoid_: supervised workflow, auto-run
