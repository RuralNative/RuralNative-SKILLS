# Extended detail — review-this

Restated reference material for `docs/leaves/review-this.md`. Not a leaf, not
part of any orientation set. Code and tests are authoritative; this file
holds the longer key-file walk-through, workflow history, and coverage prose
that the compact leaf core points past.

## Key files & data flow

`SKILL.md` reviews one pull request in the current checkout: `targets.ts`
normalizes one `#<n>` or URL reference and resolves it to exactly one open
pull request (an issue must close through exactly one open pull request);
`review-session.ts` validates checkout match, evidence, and requirements
revision, records one frontier Standards-plus-Spec pass, applies at most one
configured fix round, and gates merge on one CI read. `reconciliation.ts`
validates local findings for scope, evidence, severity, category, and exact
revisions. `review-authority.ts` limits the optional `review-fixer` subagent
to editing and focused tests in the current checkout. `adapters.ts` carries
only local GitHub, check, and merge contracts. No cloud adapter, wave
planner, worktree, worker, execution-model catalog, or polling concept exists.

The skill packages a runtime copy of the pure workflow state core at
`workflow-state.ts`: requirements revision, freshness, one-round fix budget,
merge eligibility, verdict reuse, direct promotion, and parent closure. The
authored source is `scripts/workflow-state.ts`; the generator refreshes the
three skill copies and verification fails when a copy drifts.

## Workflow history

ADR-0014 through ADR-0023 record the retired wave contract: review waves,
persistent PR worktrees, cloud review, parallel Standards and Spec subagents,
mutation workers, execution-model selection, capacity caps, final verification,
and whole-spec review. ADR-0031 supersedes those clauses and is the current
contract; the older files stay verbatim as history.
