# Plan: coherence-first ticket sizing

## Goal

Stop `/plan-this` from turning one coherent behavior change into several small tickets while preserving its `/to-tickets` delegation, approval gate, blocker model, and worker limits.

## Decisions

- Keep the installed `/to-tickets` skill unchanged. It remains the procedural publisher.
- Form the fewest coherent, independently verifiable behavior tickets before considering parallel execution.
- Keep tests, documentation, refactors, and layer-specific plumbing in the ticket for the behavior they support.
- Split only at a separately verifiable behavior, true blocker, independent release or rollback boundary, distinct risk boundary, or when the work no longer fits one fresh context and its existing risk SLO.
- Parallelize the coherent tickets that already exist rather than splitting one behavior to widen the initial frontier.
- Publish one complete ticket when the whole task is small, without adding unrelated scope.
- When a proposed graph has multiple tickets, show the boundary that justifies each split during approval. Do not add this rationale as boilerplate to every published ticket.
- Use ticket coherence, not a duration floor, to define useful size.

## Implementation

1. Update `skills/plan-this/SKILL.md` without changing its 13-rule fixed-template shape or single `## Task:` slot. Replace the parallel-first sizing instruction with coherence-first graph construction. Preserve the current native blocker and scheduling-collision rules after ticket boundaries are settled. Make parallelism subordinate to coherent behavior slices. Require split-boundary reasons in the pre-publication graph when more than one ticket is proposed.
2. Update `skills/plan-this/tests/composition.test.ts`. Refresh the byte-for-byte expected prefix. Add focused assertions for fewest coherent tickets, support work staying with its behavior, one-ticket small plans, permitted split boundaries, no split for parallelism, and preview-only boundary reasons. Keep the existing checks for 13 rules, line-count bounds, delegation order, task-slot singularity, native edges, collision handling, approval, risk classification, and no local `/to-tickets` fork.
3. Update `docs/leaves/plan-this.md` so `INV-5` and `INV-7` describe coherence-first sizing and the split-boundary preview. Keep `/to-tickets` delegation and the existing 60/90-minute risk SLOs unchanged.
4. Update the user-facing workflow summaries in `README.md` and `docs/human/overview.md` with the same behavior. State that parallel execution follows natural ticket boundaries rather than creating them.
5. Activate the change in the current local command by syncing the revised `SKILL.md` to the installed `plan-this` copy after repository validation. Leave the installed `/to-tickets` untouched and verify the installed and repository `SKILL.md` files are byte-identical.

## Validation

1. Run the `plan-this` composition and risk tests.
2. Run the repository verification command if the focused tests pass.
3. Run `./scripts/docs-check.sh`; treat any failure as part of this change.
4. Inspect the final diff to confirm only the planning contract, its tests, matching documentation, and the approved installed copy changed.
5. Confirm the revised contract still delegates `/grill-with-docs` to `/to-spec` to `/to-tickets`, retains 13 rule bullets and one `## Task:` slot, and contains no fork or edit of `/to-tickets`.

## Risks

- A vague "coherent" rule could preserve the current fragmentation. The explicit split boundaries and preview rationale make the decision reviewable.
- Over-merging could produce tickets too large for a fresh context. The existing context-window and risk-SLO upper bounds remain in force.
- Moving support work into behavior tickets may reduce apparent parallelism. This is intentional; worker concurrency follows real behavior boundaries.
