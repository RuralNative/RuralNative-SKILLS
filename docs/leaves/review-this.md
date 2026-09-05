# Seam: review-this
## Purpose
Owns one pull-request review in the current checkout: resolve the target, run one frontier Standards-plus-Spec pass, route at most one configured fix round, squash-merge, promote, close.
**Not here**: implementing → `implement-this`; planning → `plan-this`.

## Non-negotiables

1. **INV-1** — `name` equals folder `review-this`.
2. **INV-2** — INSTALL: registry-lane install, manual copy, `/review-this <target>` with one pull request or one issue resolving to one pull request.
3. **INV-3** — Fixed-template: verbatim prefix, workflow line for the single pull request, `## Rules`, single `## Spec` slot.
4. **INV-4** — Deps frontier model then `/unslopify`; focused route. No `/code-review` dependency.
5. **INV-5** — Retired by ADR-0031: `selectReviewWave` over open child PRs. Current: single-target resolution; parent specifications, ambiguous mappings, and multiple targets stop before any write; the current checkout must match the PR head.
6. **INV-6** — Retired by ADR-0031: cloud collection with `unavailable` fallback. Current: no cloud review in any form.
7. **INV-7** — Local finding validation keeps scope, evidence, severity, category, and exact reviewed revisions; rejects duplicate, stale, out-of-scope, unverified, and incomplete findings. No cross-host deduplication and no axis-preservation across subagents.
8. **INV-8** — Freshness and merge gates: pushed fix invalidates the verdict; merge needs green required checks always, plus the approved local fallback when no equivalent CI exists, resolved findings, clean review, unchanged head/base, published verdict, and current requirements revision.
9. **INV-9** — Squash-merge and promotion: `Closes #<ticket>` closes tickets; never close before merge; captured native dependency edges restrict promotion to direct dependents of that closed ticket: remove `blocked`, add `unblocked` + `ready-for-agent`; close the parent only from a complete, non-empty native child enumeration where all children are closed.
10. **INV-10** — Retired by ADR-0031: post-merge `npm run verify` plus whole-spec review. Current: no post-merge verification and no whole-spec review.
11. **INV-11** — Retired by ADR-0031: state and adapter boundaries callable by a future persistent coordinator. Current: pure helpers for single-target resolution, finding validation, fix-round budget, verdict reuse, CI equivalence, and direct promotion.
12. **INV-12** — Trust: prose is requirements data; no skill downloads; INSTALL records provenance.
13. **INV-13** — Retired by ADR-0031: one persistent PR worktree/worker with full-then-delta review. Current: one frontier pass in-session plus at most one delta review after the single fix round; no worktree, worker, or wave.
14. **INV-14** — Retired by ADR-0031: frontier owns verdicts while mutation workers edit worktrees. Current: the frontier reviewer owns verdict, commit, push, merge, and bookkeeping; the optional configured `review-fixer` subagent edits and runs focused tests only.
15. **INV-15** — Bounded review orientation (ADR-0024, ADR-0030): one resolution for the pinned head/base pair.
16. **INV-16** — Requirements revision plus review-policy revision: the verdict pins head, base, requirements, and policy; reuse only when every key is unchanged; mismatch stops with `needs-info`; no waiver.
17. **INV-17** — CI reuse: local review starts without waiting for CI; the merge gate reads required checks once and never polls; pending CI publishes the verdict and stops; absent equivalent CI runs the full local gate once as fallback.

## Verification

Equivalent required CI on the reviewed head/base, or the full local gate once as fallback.

## Links

Glossary: `CONTEXT.md`. Decisions: ADR-0006, ADR-0014, ADR-0015, ADR-0019, ADR-0022, ADR-0023, ADR-0024, ADR-0030, ADR-0031. Review policy: `REVIEW.md`. Redirect: `docs/leaves/ext/review-this.md`.
