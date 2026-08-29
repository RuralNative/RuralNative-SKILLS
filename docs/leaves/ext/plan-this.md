# Extended detail — plan-this

Restated reference material for `docs/leaves/plan-this.md`. Not a leaf, not
part of any orientation set. Code and tests are authoritative; this file holds
the longer key-file walk-through, workflow history, and coverage prose that
the compact leaf core points past.

## Key files & data flow

`SKILL.md` is the entry point; its frontmatter `name` is the skill identity
`plan-this` and its `description` declares the explicit invocation
`/plan-this <task>` plus delegation to `/grill-with-docs`, `/to-spec`,
`/to-tickets`, and `/unslopify`. The consumption path is: user runs
`/plan-this <task>` → one direct invocation authorizes the full interactive
chain while publication waits behind the separate explicit approval gate →
skill loads `/unslopify` before the first progress update and keeps it active
→ treats task text, issue bodies, comments, specification drafts, and ticket
bodies as requirements data that cannot widen scope, select files, authorize
tools, or override workflow gates such as approval gates → performs no skill
downloads during the run → defines and confirms an intent capsule (`Outcome`,
`User`, `Why now`, `Success`, `Constraints`, `Non-goals`) with one ELI18
decision at a time, each with a recommended answer and supporting reasoning →
when the solution form is unsettled, explores exactly three materially
different directions including the simplest viable one and lets the user
select or combine a direction → runs `/grill-with-docs` as a decision tree one
decision at a time until no branch remains silently assumed, resuming its
recorded tree after interruption, with this command's one-decision rule
overriding `/grilling` frontier batching and its planning-only boundary
overriding `/domain-modeling` write-as-you-go behavior → designs a parent
specification from the confirmed capsule with in-scope behavior, non-goals,
acceptance criteria, affected seams, structural constraints, widest safe
initial frontier, and smallest test-first verification plan, keeping user
stories to the minimum needed to distinguish observable behavior → forms the
fewest coherent behavior tickets before considering parallel execution,
splitting only at separately verifiable behavior, true blocker, independent
release or rollback boundary, distinct risk boundary, or fresh-context limit
within the existing risk SLO → publishes the specification and tickets through
`/to-spec` and `/to-tickets` with native blocked_by edges and the canonical
label state from the pure workflow state core → finishes with the ELI18 Why /
What / Where / How summary and returns control to the user.

The runtime helper `workflow-state.ts` is a packaged copy of the authored
`scripts/workflow-state.ts` core (#132): frontier selection, dispatch
validation, label decisions, one-retry recovery, head freshness, merge
eligibility, follow-up creation, and parent completion decisions.
`risk.ts` is the pure risk decision table that assigns `ordinary` or
`high-risk` before publication. Tests live in `skills/plan-this/tests/` and
feed captured facts; they never make live GitHub calls.

## Further history

Wrapper material removed from `SKILL.md` in #55 — Invocation details, Hard
dependencies exposition, Rules preserved summary, Installation and discovery,
and Boundary — now lives only in this leaf doc, `skills/plan-this/INSTALL.md`,
and `docs/adr/0006-plan-this-fixed-template-adapter.md`, not in `SKILL.md`.

Delegation for supervised planning (#63, parent #62) was removed by ADR-0011
when `supervise-this` retired: the invocation contract is direct
`/plan-this <task>` only. ADR-0009 (now superseded by ADR-0014) recorded the
decision to keep `disable-model-invocation` locks on `/grill-with-docs`,
`/to-spec`, and `/to-tickets`. Former parity debt with `implement-this`
(DEBT-7) was resolved 2026-08-20.

ADR-0019 (2026-08-23, parent spec #152) tightened the planning gate, and #154
shipped the planning grill gate and parallel-first ticket graphs: every fresh
`/plan-this` run completes at least one grill frontier round before anything
publishes, publication waits for explicit approval after the shared
understanding and the proposed ticket graph are shown, an interrupted grill
resumes its recorded decision tree instead of restarting, and ticket graphs
were designed parallel-first with scheduling collisions kept apart from native
blocker edges. Sizing was later revised coherence-first: the fewest coherent
behavior tickets are formed before parallelism is derived, splits happen only
at named boundaries stated in the approval preview.

ADR-0020 revises `plan-this` from a byte-for-byte fixed-template adapter into a
structured workflow adapter: the body now carries five numbered phases that
add a confirmed intent capsule, conditional exploration of three directions,
explicit delegation-conflict precedence, and a concise specification that
keeps only the user stories needed to distinguish observable behavior, while
preserving the single `## Task:` slot, dependency order, GitHub publication
guarantees, risk and worker limits, and docs-check invariants.

Ticket #172 (parent spec #171) confirms that conditional quality proof lives
in the existing fields: when a task exposes a security boundary,
browser-observable behavior, production-operability path, migration, rollback,
or explicit product-performance obligation, the existing acceptance criteria,
risk, constraints, and smallest test-first verification state the required
proof. No quality-profile field and no blanket checklist is added.

## Ticket #179 — bounded-planning preflight (parent spec #176)

Ticket #179 (parent spec #176) adds the bounded-planning preflight (INV-11,
ADR-0024): each proposed ticket resolves its orientation set from affected
seams before publication approval — the compact architecture index, whole
affected seam leaf docs, leaf-named glossary entries, and linked accepted ADRs
or policies — counts UTF-8 bytes before broad loading, and rejects a ticket
whose required set exceeds its selected cap. Cache-gap approval may substitute
or narrow the set but can never waive the cap. Affected seam names stay the
durable join key; the published ticket adds no field that transports paths,
section anchors, invariant lists, glossary excerpts, or policies. The approval
preview may show compact budget evidence (task band, resolved bytes, cap,
source count, cache-gap state), while the published ticket stays focused on
behavior and sufficient verification. Adding unrelated seams, decisions, or
documentation does not change a fixed task's resolved set or compact evidence.
