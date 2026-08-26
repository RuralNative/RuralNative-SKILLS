# Single-pass `/review-this` cycle

## Goal

Change `/review-this` to run exactly one review cycle per pull request: one mandatory local Standards and Spec review plus all configured cloud reviews on one pinned revision, one reconciliation, zero or one consolidated fix pass, required checks, merge, dependent promotion, and closure. Do not review the fixed head and do not repair code after the single fix pass.

## Decisions

- Local Standards and Spec review always runs.
- Local review and all configured cloud adapters run concurrently on the same pinned head and base.
- Wait for every configured cloud adapter. `pending` blocks reconciliation and merge; use the existing 30-minute no-progress checkpoint and resume policy. Failed, absent, disabled, or timed-out adapters become `unavailable` and do not block the mandatory local review.
- Reconcile all available cloud findings and both local axes once. Keep provider attribution and deduplicate equivalent findings.
- One fresh fix context receives every confirmed blocking finding. It may edit and locally verify the work before one push. A code-caused required-check failure after that push stops the PR. Infrastructure retries do not consume the pass.
- Do not run local or cloud rereview after the fix. Preserve the original reviewed SHA. Record the sole fix lineage separately instead of claiming that the old verdict covered the fixed head.
- A conflict-free base refresh reruns required checks without rereview. Conflict resolution after review consumes the sole fix pass; if that pass was already used, stop.
- Drop the whole-spec Standards and Spec closure review. Parent closure requires all children closed and `npm run verify` passing on updated `main`.
- If final verification fails, create the smallest independently verifiable native child ticket and keep the parent open. Do not repair `main` in the review run.

## Target state and merge gates

Persist a versioned single-pass lifecycle record in the trusted PR summary so resume never repeats local review, cloud collection, reconciliation, or a fix push. Record the pinned reviewed head/base, each configured cloud provider and terminal status, local axis completion, reconciled blocking finding IDs, publication state, optional fix lineage, exact required-check head/base, phase timings, and terminal reason.

For a PR with no blocking findings, merge only when the current head is the reviewed head. For a PR with fixes, merge only when one fix-lineage record proves `reviewed head -> current head`, maps every blocking finding ID to resolution evidence, records successful targeted local verification, and required checks are green for the exact current head/base. Keep trusted-summary publication, verified inline findings, mergeability, same-repository trust, and closing-reference gates. Advisory-only findings remain reasoned deferrals.

A conflict-free base move may change the reviewed base only when the host records that no conflict resolution changed code and required checks are green for the new exact head/base. Never overwrite `reviewedHeadSha` or `reviewedBaseSha` to manufacture freshness.

## Implementation plan

1. Record the policy change in `docs/adr/0020-single-pass-review-cycle.md`. Supersede only ADR-0019's review freshness, two-fix, delta-rereview, final-review, final-repair, and whole-spec-review clauses; leave the rest of ADR-0019 as history. Add ADR-0020 to `ARCHITECTURE.md` coverage and decision references.

2. Update the authored state core in `scripts/workflow-state.ts`, then regenerate all packaged copies with `node scripts/generate-workflow-state.ts`.
   - Replace `MAX_FIX_ROUNDS` with a one-pass contract such as `MAX_FIX_PASSES = 1`.
   - Replace exact reviewed-head merge freshness with explicit reviewed revision plus optional `FixLineageFact` from reviewed head to merge-candidate head.
   - Require all confirmed blocking finding IDs to have fix evidence when the head changed.
   - Replace `localReviewClean` as a merge prerequisite with truthful local-review completion plus zero unresolved confirmed findings.
   - Pin required-check evidence to the exact merge-candidate head/base rather than trusting an unqualified green boolean.
   - Allow a recorded conflict-free base refresh with exact new-base checks; count real conflict resolution as the one fix pass.
   - Reduce `FinalVerificationFact`, `followUpRequired`, and `parentClosureReady` to repository verification only. Remove `wholeSpecReviewPassed`.

3. Generalize cloud collection in `skills/review-this/adapters.ts` without adding provider dependencies.
   - Change `CloudReviewStatus` to `pending | available | unavailable`.
   - Accept the configured `CloudAdapter[]`, collect them concurrently, and return one provider-attributed result per adapter.
   - Treat adapter exceptions and terminal failures as `unavailable`; retain exact reviewed head/base checks for available evidence.
   - Add provider identity to cloud findings while retaining `source: "cloud"` so Standards and Spec axes remain separate.
   - Remove `VerificationAdapter.wholeSpecReview()`.

4. Simplify `skills/review-this/review-session.ts` to the single-pass lifecycle.
   - Keep one persistent PR worktree, one initial full local review, strict categories, one trusted summary, advisory deferral, and one fresh fix context.
   - Remove delta/full rereview planning, escalation triggers, unlimited delta-review operation counts, the two-fix path, and final-verification repair planning.
   - Cap `fix-batch` at one. A second code edit, code-caused check failure, or conflict after the pass returns a terminal stop.
   - Make conflict-free refresh checks-only. Make conflict resolution consume the pass without rereview.
   - Add pure decisions for cloud aggregation and lifecycle resume so `pending` checkpoints preserve completed local results and never rerun them.

5. Make discovery distinguish reviewed revisions from processed fixed revisions in `skills/review-this/discovery.ts`.
   - Read the versioned trusted-summary phase record.
   - Do not select a fixed head awaiting checks or merge as a new review revision.
   - Continue rediscovering genuinely new PRs and user-pushed heads that are not the recorded sole fix head.
   - Treat legacy summaries without the new lifecycle version as ineligible for automatic merge; start one fresh single-pass cycle on the current revision.

6. Rewrite the executable workflow contract in `skills/review-this/SKILL.md`.
   - Discovery creates/reuses the persistent worktree before nested agents.
   - Cloud adapters and the local Standards/Spec agents start concurrently on one pinned pair.
   - Pending cloud adapters checkpoint/resume; terminal unavailable adapters fall back to local evidence.
   - Reconciliation and publication happen once, followed by zero or one consolidated fix pass.
   - After a fix, run targeted local verification and exact-revision required checks only. Never invoke a review agent again for that PR cycle.
   - Stop on any second code change or code-caused red check. Merge only through the new lineage-aware gate, then promote dependents.
   - On final `npm run verify` failure, create a child follow-up and keep the parent open; otherwise close when every child is closed.

7. Update tests with the new contracts.
   - `skills/review-this/tests/adapters.test.ts` and `fakes.ts`: pending, multiple configured adapters, wait-for-all aggregation, provider attribution, exact revision mismatch, exception-to-unavailable fallback, and removal of whole-spec review.
   - `skills/review-this/tests/reconciliation.test.ts`: findings from several cloud providers deduplicate while preserving provider evidence and local axes.
   - `skills/review-this/tests/review-session.test.ts`: clean no-fix path; one fix with no rereview; second fix refusal; code-caused check failure stop; pending checkpoint/resume without rerunning local review; conflict-free checks-only refresh; conflict consuming the unused pass; conflict after the pass stopping; no final-verification repair.
   - `skills/review-this/tests/discovery.test.ts`: recorded fixed head does not reenter review, unrelated user-pushed head does, and legacy lifecycle data starts one fresh cycle.
   - `tests/workflow-state.test.ts` and generated-copy checks: one-pass cap, exact check head/base, valid and invalid fix lineage, missing finding resolution, no dishonest SHA restamping, checks-only base refresh, and verification-only parent closure.
   - `skills/review-this/tests/composition.test.ts` and `tests/readme-contract.test.ts`: replace two-round, delta-rereview, fixed-head verdict, final repair, and whole-spec assertions with the single-pass wording and gates.

8. Update the doc cache and public guidance in the same change.
   - In `docs/leaves/review-this.md`, preserve retired INV-6, INV-8, INV-10, and INV-13 text as tombstones with ADR-0020 pointers. Add new numbered invariants for configured cloud waiting plus mandatory local review, one reconciliation and fix pass, lineage-aware merge checks, and verification-only closure.
   - Update `REVIEW.md`, `README.md`, `skills/review-this/INSTALL.md`, and the `review-this` row/cross-cutting notes in `ARCHITECTURE.md`.
   - Regenerate or update the derived human docs that describe this lifecycle: `docs/human/overview.md`, `docs/human/guardrails.md`, `docs/human/data-flow.md`, and `docs/human/decision-journal.md`.
   - Remove stale Kilo-only, two-fix, delta-rereview, final-repair, exact-fixed-head-review, and whole-spec-review claims outside historical ADRs.

## Failure behavior

- Any configured adapter still pending: wait; checkpoint after 30 minutes without progress; resume from the trusted summary.
- Cloud adapter unavailable or failed: record the provider and reason; continue once all adapters are terminal because local review is mandatory.
- Trusted summary or inline publication failure: stop before fix or merge.
- Fix lineage missing, mismatched, or incomplete: stop before merge.
- Second code edit needed, code-caused required-check failure, or conflict after the fix pass: leave the PR open with the terminal reason and evidence.
- Infrastructure-only check failure: retry without consuming the pass.
- Final `npm run verify` failure: create a follow-up child and keep the parent open.
- Untrusted fork or PR without an originating specification: retain existing static-review/no-auto-merge behavior.

## Validation

1. Run targeted tests: `node --test skills/review-this/tests/*.test.ts tests/workflow-state.test.ts tests/readme-contract.test.ts`.
2. Run `node scripts/generate-workflow-state.ts` and verify packaged copies are byte-identical.
3. Run `npm run verify`.
4. Run `./scripts/docs-check.sh` explicitly and treat any red result as part of the change.
5. Exercise the documented three-ticket Kilo smoke with: one clean PR, one PR fixed once then merged without rereview, and one terminal path such as pending cloud resume or red post-fix checks. Confirm the trusted summary records one local review, one reconciliation, at most one fix push, zero rereviews, exact check revisions, and the correct merge or stop result.

## Out of scope

- Implementing provider-specific cloud integrations beyond the provider-neutral configured adapter contract.
- Trusting arbitrary GitHub bots or checks as review evidence.
- Automatic repair after the sole fix pass or after final verification.
- Changing target resolution, ticket frontier ordering, squash merge, dependent promotion labels, worktree trust rules, or Agent Manager permissions.
