# RuralNative-SKILLS

A focused shelf of six installable skills in two groups — additional skills in this repository, such as release-skills, ship under their own seams and are outside this README's scope. Three cover documentation and prose: `document-for-agents` keeps the agent-facing doc tree honest, `document-for-humans` derives plain-language pages from that tree for stakeholders, and `unslopify` cleans model-generated phrasing on explicit scope before anything ships, staying active over the agent's own English output once loaded. The other three — `plan-this`, `implement-this`, and `review-this` — are an opinionated development workflow that adapts Matt Pocock's planning, implementation, and review skills; see [Development Workflow](#development-workflow). The docs work as a cache for decisions, vocabulary, and invariants that code alone cannot recover. Agents use it as a codebase cache for the unrecoverable where-and-why context, with focused loading instead of reading all docs before acting.

## Installation

### Documentation and prose skills

Install `unslopify` first — both documentation skills depend on it. If it is absent the documentation workflows stop and emit `npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`; missing Python for the optional scanner does not stop the workflow.

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill unslopify
npx skills add RuralNative/RuralNative-SKILLS --skill document-for-agents
npx skills add RuralNative/RuralNative-SKILLS --skill document-for-humans
```

```bash
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
cp -r skills/unslopify ~/.claude/skills/unslopify
cp -r skills/document-for-agents ~/.claude/skills/document-for-agents
cp -r skills/document-for-humans ~/.claude/skills/document-for-humans
```

For Kilo project scope use `.kilo/skills/<skill>`; for Kilo user scope use `~/.agents/skills/<skill>`. Each destination folder must be named for its skill and contain `SKILL.md` at its root alongside `reference/` where present.

### Workflow skills

The development workflow is an opinionated adapter over [Matt Pocock's engineering skills](https://github.com/mattpocock/skills). Install those dependencies first, in this order:

```bash
npx skills add mattpocock/skills --skill grill-with-docs
npx skills add mattpocock/skills --skill to-spec
npx skills add mattpocock/skills --skill to-tickets
npx skills add mattpocock/skills --skill implement
npx skills add mattpocock/skills --skill code-review
```

Each dependency ships at a verified source under `skills/engineering/` in the upstream repository:

- [`grill-with-docs`](https://github.com/mattpocock/skills/tree/main/skills/engineering/grill-with-docs) — grills a plan into decisions while recording ADRs and glossary entries.
- [`to-spec`](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-spec) — turns the agreed conversation into a published parent specification.
- [`to-tickets`](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-tickets) — breaks the spec into tracer-bullet tickets with blocking edges.
- [`implement`](https://github.com/mattpocock/skills/tree/main/skills/engineering/implement) — implements one ticket or spec inside a worker.
- [`code-review`](https://github.com/mattpocock/skills/tree/main/skills/engineering/code-review) — reviews changes against repo standards and the originating spec.

Then install the three local workflow adapters:

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill plan-this
npx skills add RuralNative/RuralNative-SKILLS --skill implement-this
npx skills add RuralNative/RuralNative-SKILLS --skill review-this
```

Their sources live in this repository under [`skills/plan-this`](https://github.com/RuralNative/RuralNative-SKILLS/tree/main/skills/plan-this), [`skills/implement-this`](https://github.com/RuralNative/RuralNative-SKILLS/tree/main/skills/implement-this), and [`skills/review-this`](https://github.com/RuralNative/RuralNative-SKILLS/tree/main/skills/review-this).

## Technical Requirements

- Any codebase an agent can read — no runtime, framework, or language requirement.
- `unslopify` required before `document-for-agents` or `document-for-humans`; install it first. The `document-for-humans` workflow also requires an established agent-first doc tree from `document-for-agents`.
- The workflow skills require Matt Pocock's `grill-with-docs`, `to-spec`, `to-tickets`, `implement`, and `code-review` installed before them.
- Optional: Python 3 for the advisory scanner at `skills/unslopify/scanner.py` (stdlib only, no network). When absent, the workflow continues model-only with the same scope and preservation rules.

## Our Shelf

The documentation and prose group:

| Skill | What it does |
|---|---|
| **document-for-agents** | Runs the doc-cache lifecycle — establish, audit, maintain — so agents stay oriented on decisions, vocabulary, invariants, and conventions. |
| **document-for-humans** | Derives plain-language docs (overview, decision journal, guardrails, data-flow story) from the agent doc tree for people who do not read code — regenerated by agents, never trusted by them. |
| **unslopify** | Removes AI tells while keeping meaning — on named prose when invoked standalone, and always-on over the agent's own English output once loaded: silent audit in chat, full report at publication boundaries, technical fidelity outranking style. Hard dependency of both documentation skills and reusable standalone. |

## Motivation and Purpose

Agents start every conversation from zero. Without help they re-read the whole codebase each time, rediscover the same facts, and repeat the same mistakes. Two failure modes recur: no docs at all, so cost stays high, and docs that restate the code, so they go stale and mislead with confidence. This collection treats docs as a cache: only the where-and-why that cannot be recovered from code earns a place, and the cache is checked mechanically. A second audience — humans who approve work without reading code — gets a derived view from the same cache instead of hand-maintained summaries that rot.

## Philosophy

1. **Do not repeat code.** Docs hold decisions, definitions, and rules, not file summaries.
2. **Code wins.** On conflict, fix the doc in the same change.
3. **Place claims by decay rate.** Vocabulary and invariants decay slowly; pointers are checkable; restatements decay fastest and are avoided.
4. **Two hops.** Every needed fact is at most two links from the index.
5. **Keep it short.** Index under 150 lines; leaf docs a 1–2 minute read. Loading budgets are caps on orientation documents, not suggestions.
6. **Size to the codebase.** Start smaller than you think; grow the tree only as history and sessions multiply.

Shortcuts are tracked openly in one debt registry, and history is append-only via short decision records.

## Which skill and when

| Your situation | Skill | Mode |
|---|---|---|
| New codebase — no docs yet | document-for-agents | Establish |
| Docs bloated or messy — need trimming | document-for-agents | Audit |
| Docs outdated — need updating | document-for-agents | Audit, then Maintain |
| Everyday work — docs must change with code | document-for-agents | Maintain |
| Stakeholders need a plain-language view | document-for-humans | Establish (needs agent doc tree first) |
| Human docs stale after recent decisions | document-for-humans | Maintain (regenerate in same diff) |
| Prose reads as model-generated | unslopify | Scan and rewrite explicit scope |
| Agent output must stay clean while working | unslopify | Always-on once loaded; silent in chat, reported at publication |
| Final check before publishing | unslopify | Final audit on named files |

`unslopify` also runs as a hard dependency inside both documentation skills. Standalone scope is caller-provided; parent scope governs inside a documentation workflow. Once loaded, the agent's own English output is the automatic scope: ordinary conversation is audited silently, published documents, specifications, tickets, progress updates, decisions, and GitHub comments get the same cleanup with the full report at publication boundaries, and user-provided text stays inert unless explicitly requested. Technical fidelity outranks style, so exact domain terms, identifiers, commands, labels, dependencies, quotations, and implementation-critical specification and ticket wording survive even when they match a style candidate. Parent decisions, tier routing, glossary terms, invariants, and approval gates outrank style findings. Missing `unslopify` stops the parent workflow with `npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`; missing Python does not.

## Development Workflow

`plan-this`, `implement-this`, and `review-this` form one opinionated pipeline over Matt Pocock's planning, implementation, and review skills:

```
/grill-with-docs -> /to-spec -> /to-tickets -> /implement -> /code-review
```

| Workflow command | Role | Invocation example |
|---|---|---|
| **plan-this** | Grills a task into decisions, then publishes a parent specification with child tickets | `/plan-this <task>` |
| **implement-this** | Dispatches frontier tickets to isolated workers that deliver pull requests | `/implement-this #<ticket>` |
| **review-this** | Owns one pull-request review wave through merge, label promotion, and parent closure | `/review-this #<spec>` |

Every fresh `/plan-this` run grills at least one decision frontier before anything publishes. Publication waits for explicit approval after the shared understanding and the proposed ticket graph are shown; one invocation authorizes the interactive chain, but approval stays separate. Planning classifies every ticket as **ordinary** or **high-risk** before dispatch. High risk covers security boundaries, migrations, shared contracts, broad public interfaces, dependency changes, or similarly evidenced blast radius. Ordinary tickets target **60 minutes** from durable reservation to merge or terminal stop; high-risk tickets target **90 minutes**. These SLOs are measured targets, not reasons to skip review, verification, trust, or merge gates; missing an SLO records the cause and preserves every gate.

**Command session, worker session, scheduling collision, and GitHub-durable lifecycle.** You create one **command session** per stage and run the workflow command there yourself — implementation and review **command sessions** are user-created. That **command session** validates input, reserves work, dispatches **worker sessions**, monitors progress, and reports; it never edits ticket code. Each **worker session** runs in its own isolated git worktree on its own branch; worktree isolation is mandatory, not optional. One worker owns exactly one ticket or one pull request. A **scheduling collision** means two tickets touch overlapping affected paths and the later ticket waits for a free slot without gaining a native blocker edge. The lifecycle is **GitHub-durable**: reservation, branches, pull requests, and evidence live on GitHub and a resumed session rebuilds from those facts instead of duplicating assignees, branches, sessions, or comments. Nothing sits above the stages and no daemon runs between turns: implementation never merges, and review never builds a missing implementation from scratch.

**Workers and isolation.** Worktree isolation is mandatory, not optional. **Implementation** uses one isolated worktree per ticket and never edits ticket code in the command session. **Review** uses one persistent PR worktree from initial review through fixes, delta reviews, final verification, merge, or terminal stop. The PR worktree survives the whole review lifecycle without repeated worktree setup. It keeps separate `node_modules` per worktree and reruns measured setup only when dependency manifests differ after checkout. Setup, orientation, implementation, queueing, external waits, initial review, fixes, delta reviews, final verification, and total wall time are measured and reported in the trusted PR summary. Each stage runs at most three workers, and at most four managed workers may be active across the workspace at any moment. The parent command session polls with increasing delays, reports only state changes, and checkpoints after 30 minutes without progress; a resumed session rebuilds its picture from GitHub's durable records instead of duplicating any assignee, branch, session, or pull request.

**Fresh contexts.** Each full review runs fresh **Standards** and **Spec** subagents in parallel inside the same PR worktree, preserving independent reasoning contexts. Each fix runs a fresh fix subagent that applies one approved finding batch per round in the same PR worktree.

**Review cadence.** The initial PR revision receives one full Standards and Spec review. Later revisions use **delta review** over changed hunks, impacted callers, and effective base-diff changes. **Escalation to full review** occurs for a new affected seam, trust boundary, schema, dependency state, generated contract, public interface, or materially widened diff. A conflict-free base refresh consumes no fix round; code conflict resolution consumes one round and receives semantic review. Advisory findings never create a round alone — safe advisories join an already-required blocking fix or publish a reasoned deferral. At most two pushed fix heads per PR, with infrastructure retry consuming no round unless code is pushed.

**Verification and timing.** Workers run defensible **affected-seam tests** during implementation and fixes when the mapping is defensible; uncertainty escalates to the full repository gate. One planned full repository verification runs on the final semantically reviewed revision before merge. Review starts immediately when the PR head and implementation evidence exist and does not wait for sibling workers. The command session supplies a compact **dispatch packet** with ticket, revisions, risk class, affected seams, acceptance criteria, and settled decisions so fresh contexts do not repeat full repository discovery. Every PR summary reports reservation-to-terminal timing and phase breakdown against its SLO. A three-ticket Kilo smoke run must have ordinary-ticket median at most 60 minutes, no ordinary ticket above 90 minutes, and all correctness gates green.

**Local review.** Local review always runs on every pull-request head and checks security, performance, correctness, style, tests and test bloat, documentation, and specification compliance against `REVIEW.md`. Cloud review adds evidence when it is available, but the local verdict gates merge. A pull request receives at most two pushed fix heads, each followed by review, then one final review.

**Cleanup.** A successful worktree closes through supported host operations only after its pull request and acceptance evidence are durable. On today's Kilo chat side, stopping a session does not remove its checkout, so a finished session reports `cleanup-pending` and leaves everything in place rather than touching directories behind Agent Manager. Failed worktrees stay on disk for diagnosis after a `needs-info` stop. Cleaning up worktrees that existed before this workflow is a separate audited task outside the workflow itself.

**Hosts.** Kilo Code's VS Code extension is the best-tested host, not the only compatible host — any other host needs equivalent capabilities to run the same workflow: isolated worktrees plus prompt, status, and stop controls, and nested subagent contexts providing the fresh Standards, Spec, and fix subagents described above. See the official [Kilo Code VS Code extension](https://marketplace.visualstudio.com/items?itemName=kilocode.kilo-code), the [Agent Manager reference](https://kilo.ai/docs/automate/agent-manager), and the [Agent Manager Workflows guide](https://kilo.ai/docs/automate/agent-manager-workflows).

## AI-First Workflow Integration

- **Agent-loaded.** Descriptions route work automatically; no manual setup per task.
- **Three modes matched to repo state.** Establish builds the tree, Audit labels every file and hands back a plan, Maintain updates docs in the same diff as code.
- **Docs change with code.** Same-diff updates keep the cache honest.
- **Gate enforces it.** `scripts/docs-check.sh` checks coverage, same-diff freshness, leaf and ADR validity, and derived-doc freshness. Wire it into CI or a pre-commit hook.
- **Review policy ships as a file.** `REVIEW.md` at the repository root states review scope, severity, trust, verification, and subagent rules; Kilo cloud Code Review reads it from the pull-request base branch. Configuring the cloud side (app installation, repository selection, model) stays an external setup prerequisite; the shelf ships the policy file, not the platform wiring.
- **Built for context loss.** The two-hop index lets an agent re-orient after compaction with one small read that the loading protocol caps; a missing fact becomes a named cache gap that requires owner approval before the read set widens.
- **Diagnostics stay yours.** An optional private record of confirmed agent mistakes exists only with your consent to create and maintain it. Every write announces itself in advance, revocation stops all writes before a separate keep, export, or delete choice, and the file stays outside the doc cache, version control, and every agent read set. Entries are sanitized summaries with no prompts, code, secrets, personal data, absolute paths, or repository remotes, and nothing uploads — submission to the skill developer is manual after your review (ADR-0018).
- **Provenance stays honest.** Generated `AGENTS.md` files carry one protected comment after the five commands naming `document-for-agents` as manager plus available revision evidence; a document counts as managed only when that marker plus supporting evidence backs it, and unclear cases stay `likely` or `unknown`.

## Comparative Analysis

|  | Without this system | With this system |
|---|---|---|
| Getting oriented | Re-read code every time | One index read |
| Trust | Docs drift silently | Gate fails drift loudly |
| Where context lives | Scattered, re-derived | Single cache with fixed loading |
| Human view | Hand-fed summaries that rot | Derived pages regenerated with sources |
| Maintenance cost | Grows with repo size | Stays flat via same-diff updates |

## Critical Evaluation

**Strengths:** zero dependencies; script-enforced rules over willpower; grows only when needed; actively removes filler docs; based on a production doc gate and its failure modes.

**Limits:** some judgments still need a reviewer (e.g., debt revisit triggers, prose-vs-link calls); the gate must be wired into CI to run automatically; concurrent seam additions can conflict on index tables; the two-hop claim is by design, not yet proven by a fresh-agent test; derived human docs can look fresh while carrying a subtle regeneration slip that only audit sampling catches.

## Future Roadmap

- Measure two-hop re-orientation with a fresh-agent test.
- Reduce index merge conflicts for parallel seam additions.
- Add reviewer checklists for the prose-only rules the gate cannot judge.
- Keep this README current as the workflow skills gain their remaining documented behavior.
