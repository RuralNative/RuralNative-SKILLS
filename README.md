# RuralNative-SKILLS

A public collection of three skills that improve reliable agent output by treating documentation as a codebase cache for the unrecoverable where-and-why context. Agents use focused loading instead of reading all docs before acting, which keeps the working set small and current. The collection covers establishing and maintaining an AI-first doc tree, deriving plain-language human docs from that tree, and cleaning prose with a scoped, meaning-preserving pass.

## Installation

Install the dependency first. Both documentation skills depend on `unslopify` and stop with an install instruction if it is absent. Installed runtime resolves `unslopify` by skill identity, not by a repository-relative path. Missing Python for the optional scanner does not stop the workflow.

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill unslopify
npx skills add RuralNative/RuralNative-SKILLS --skill document-for-agents
npx skills add RuralNative/RuralNative-SKILLS --skill document-for-humans
```

Manual install (no npx). Copy folders to your agent's skills directory, keeping names. Install `unslopify` first:

```bash
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cp -r skills/unslopify ~/.claude/skills/unslopify
cp -r skills/document-for-agents ~/.claude/skills/document-for-agents
cp -r skills/document-for-humans ~/.claude/skills/document-for-humans
```

Verify: ask your agent to run the doc-cache audit, or to establish the doc tree on a repo with no docs. See Technical Requirements for the optional scanner and see AI-First Workflow Integration for the three modes.

## Getting Started

This is the installation guide. See Installation for the registry and manual commands above. See Technical Requirements for the optional scanner and see AI-First Workflow Integration for the three modes.

## Technical Requirements

- **Skills:** a codebase for an agent to work in. `document-for-agents` and `document-for-humans` require `unslopify` installed first. `document-for-humans` additionally requires an agent-first doc tree to derive from.
- **npx install:** Node.js.
- **Checker:** bash and Git for `scripts/docs-check.sh`.
- **Scanner (optional):** Python 3 for `skills/unslopify/scanner.py`. Its absence does not block `unslopify`; the model-only path applies. Missing Python does not stop the workflow.
- **Runtime:** installed skills resolve `unslopify` by skill identity, not by a repository-relative path.
- **License:** MIT.

## Our Shelf

| Skill | What it does |
|---|---|
| **document-for-agents** | Runs the doc-cache lifecycle (establish, audit, maintain) for AI-facing docs that hold decisions, vocabulary, and invariants. |
| **document-for-humans** | Derives plain-language human docs from the agent doc tree. Regenerated on source change, never hand-edited against code. |
| **unslopify** | Removes AI tells from explicit prose while preserving meaning. Explicit scope only; parent scope governs when called from a documentation skill. |

See Installation and see Getting Started for order and see Technical Requirements for the optional scanner and see AI-First Workflow Integration for the three modes.

## Motivation and Purpose

Agents start each session with no memory of the project. Without docs they re-read the codebase; with docs that restate the code they trust stale claims. This collection keeps docs as a cache: only the unrecoverable where-and-why that reading code cannot reveal. Human-facing pages are derived from that cache, so they can be regenerated instead of drifting. The checker verifies coherence so staleness fails visibly.

## Philosophy

1. Do not repeat the code. Docs hold why, not what.
2. Code wins. On conflict, fix the doc in the same change.
3. Place each claim on its lowest-decay tier. Vocabulary and invariants age slowly; navigational prose ages faster.
4. Two hops from the index to any fact.
5. Budgets keep the set small and loadable.
6. Size the cache to the codebase.

## Which skill, when — Which skill and when

| Situation | Skill |
|---|---|
| Project has no agent doc tree, or docs are stale and untrusted | document-for-agents (establish or audit, then maintain) |
| Stakeholders need a plain-language view, or that view is stale | document-for-humans (derive or regenerate from the agent tree) |
| Prose reads as model-generated or needs cleanup before publishing | unslopify (explicit scope; parent documentation skills pass their own scope) |

Use `unslopify` standalone to scan and rewrite explicit scope, or to run a final audit on named files (standalone). For documentation work, `document-for-agents` and `document-for-humans` load `unslopify` by skill identity before any user-visible prose and run a final audit before publishing. Parent decisions, tier routing, glossary terms, invariants, and approval gates outrank a rewrite. Missing `unslopify` stops with `npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`; missing Python does not. See Technical Requirements for the Python note and see Installation and see Getting Started for install order.

Establish, Audit, and Maintain are the three modes for the doc-cache lifecycle; see AI-First Workflow Integration for what each does. See Technical Requirements for runtime detail.

## AI-First Workflow Integration

Agents load the installed skills by description when documentation work appears. `document-for-agents` runs in three modes: Establish builds the tree for a new codebase, Audit measures staleness and returns a fix list, Maintain updates docs in the same commit as code. `document-for-humans` derives `docs/human/` from that tree with bridge links for depth; human docs are excluded from agent read sets. Agents use focused loading instead of reading all docs before acting: `AGENTS.md` → `ARCHITECTURE.md` → the seam leaf doc → `CONTEXT.md` and relevant ADRs. The harness `scripts/docs-check.sh` enforces coverage, same-diff freshness, and derived freshness.

## Comparative Analysis

| | Without this system | With this system |
|---|---|---|
| Orientation | Re-read code each session | Focused load from a two-hop cache |
| Trust | Docs drift silently | Checker fails on drift |
| Decisions | Lost in chat history | ADRs with status |
| Human view | Manual summaries that rot | Derived docs regenerated from sources |

## Critical Evaluation

Strengths: zero runtime dependencies beyond the host codebase, mechanically checked coherence, tiered growth that stays small on small projects.

Limits: some drift judgments still need human review, the checker must be wired into CI to be automatic, and derived human docs are only as honest as their last regeneration. These are tracked as debt with revisit triggers.

## Future Roadmap

- Run the checker in CI on every pull request.
- Reduce index-table merge conflicts as seam count grows.
- Add rehearsal that proves a fresh agent can orient from the index alone.
- Keep the shelf bounded; new skills land as separate folders with their own leaf docs.

## License

MIT
