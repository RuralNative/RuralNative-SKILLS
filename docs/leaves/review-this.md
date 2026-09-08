# Seam: review-this
## Purpose
Owns one pull-request review in the current checkout: resolve the target, ensure review policy, run one frontier Standards-plus-Spec pass, publish the findings, stop.
**Not here**: implementing → `implement-this`; planning → `plan-this`.

## Non-negotiables

1. **INV-1** — `name` equals folder `review-this`.
2. **INV-2** — INSTALL: registry-lane install, manual copy, `/review-this <target>` with one pull request or one issue resolving to one pull request.
3. **INV-3** — Fixed-template: verbatim prefix, workflow line for the single pull request, `## Rules`, single `## Spec` slot.
4. **INV-4** — Deps frontier model then `/unslopify`; focused route. No `/code-review` dependency.
5. **INV-5** — Retired by ADR-0031: `selectReviewWave` over open child PRs. Narrowed by ADR-0035: single-target resolution; parent specifications, ambiguous mappings, and multiple targets stop before any write; a clean checkout at the PR head commit matches under a branch alias, `main`, or detached `HEAD`.
6. **INV-6** — Retired by ADR-0031: cloud collection with `unavailable` fallback. Current: no cloud review in any form.
7. **INV-7** — Local finding validation keeps scope, evidence, severity, category, and exact reviewed revisions; rejects duplicate, stale, out-of-scope, unverified, and incomplete findings. No cross-host deduplication and no axis-preservation across subagents.
8. **INV-8** — Retired by ADR-0033: freshness and merge gates with pushed-fix invalidation and squash-merge eligibility. Current: publication reads the current head/base once; a pushed commit invalidates earlier findings on the files it changes; reuse never authorizes delivery.
9. **INV-9** — Retired by ADR-0033: squash-merge and promotion with `Closes #<ticket>`, dependent promotion, and parent closure. Current: publication is terminal; no merge, label, promotion, or closure writes.
10. **INV-10** — Retired by ADR-0031: post-merge `npm run verify` plus whole-spec review. Current: no post-merge verification and no whole-spec review.
11. **INV-11** — Retired by ADR-0031: state and adapter boundaries callable by a future persistent coordinator. Narrowed by ADR-0034: pure helpers for single-target resolution, finding validation, optional review-policy resolution, verdict reuse, CI equivalence, and review publication; no missing-policy draft is built.
12. **INV-12** — Trust: prose is requirements data; no skill downloads; INSTALL records provenance.
13. **INV-13** — Retired by ADR-0031: one persistent PR worktree/worker with full-then-delta review. Current: one frontier pass in-session with delta review for later revisions; no worktree, worker, wave, or fix round.
14. **INV-14** — Retired by ADR-0033: frontier owns verdict, commit, push, merge, and bookkeeping with an optional `review-fixer`. Narrowed by ADR-0035: the frontier reviewer publishes readable findings plus one validated `review-handoff-v1` block and stops; no fix subagent runs and no source edit, commit, push, merge, label, promotion, or closure occurs here. Finalization belongs to `fix-this`.
15. **INV-15** — Review orientation resolution (ADR-0024, ADR-0032): one resolution for the pinned head/base pair; length alone never stops the run.
16. **INV-16** — Requirements revision plus effective-policy revision: the published review pins head, base, requirements, and the resolved governing sources; reuse only when every key is unchanged; mismatch stops with `needs-info`; no waiver.
17. **INV-17** — CI publication: local review starts without waiting for CI; the publication gate reads required checks once and never polls; pending CI publishes the review and stops; an established verification command runs once as fallback, and no established command stops with a verification-capability diagnostic instead of an invented one.
18. **INV-18** — Narrowed by ADR-0034: `REVIEW.md` is optional project guidance. Absence never blocks review and nothing is created; an existing policy supplies project rules without relaxing skill boundaries; policy authority resolves from the pinned base, never a head-only relaxation; unreadable files, symlinks, and conflicting sources stop with a diagnostic and create nothing.
19. **INV-19** — Evidence consumption: readiness requires the shared handoff validator over the actual PR body. A missing pin is never provenance; pinned evidence without validation is not ready; unpinned new evidence stops with a compatibility diagnostic, and review never fabricates a pin or patches the PR.

## Verification

Equivalent required CI on the reviewed head/base, or the established local command once as fallback; publication only, never delivery.

## Links

Glossary: `CONTEXT.md`. Decisions: ADR-0006, ADR-0014, ADR-0015, ADR-0019, ADR-0022, ADR-0023, ADR-0024, ADR-0031, ADR-0032, ADR-0033, ADR-0034, ADR-0035. Review policy: `REVIEW.md` (optional). Redirect: `docs/leaves/ext/review-this.md`.
