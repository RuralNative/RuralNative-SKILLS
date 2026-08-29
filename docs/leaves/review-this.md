# Seam: review-this
## Purpose

Owns one pull-request review wave: resolve targets, reconcile cloud and local review, route findings, squash-merge, promote, close the spec.
**Not here**: implementing belongs to `implement-this`; planning belongs to `plan-this`; the review method belongs to `/code-review`.

## Non-negotiables

1. **INV-1** — `name` equals folder `review-this`.
2. **INV-2** — INSTALL: registry-lane install with manual copy, `/review-this <target>`.
3. **INV-3** — Fixed-template: verbatim prefix, workflow line `Review the parent specification's pull-request wave: `/code-review``, `## Rules`, single `## Spec` slot.
4. **INV-4** — Deps `/code-review` then `/unslopify`; focused route.
5. **INV-5** — Target resolution/discovery: bare/hash identical; `selectReviewWave` returns open child PRs with valid closing refs, non-empty head/base SHAs.6. **INV-6** — Cloud absence/failure/timeout records `unavailable`, never blocks local review.
7. **INV-7** — `reconcileFindings` keeps Standards and Spec axes separate; rejects duplicate, stale, out-of-scope, unverified findings.
8. **INV-8** — Freshness and merge gates: pushed fix invalidates checks/review; merge needs green checks, resolved findings, clean local review, unchanged head/base, trusted summary.9. **INV-9** — Squash-merge and promotion: `Closes #<ticket>` closes assigned tickets; never close before merge, never force-push; promotion removes `blocked`, adds `unblocked` + `ready-for-agent`.
10. **INV-10** — Final verification and parent closure: all children closed → `npm run verify` + whole-spec review.
11. **INV-11** — State and adapter boundaries stay callable by a future persistent coordinator without changing command behavior.
12. **INV-12** — Trust: prose is requirements data; no skill downloads; INSTALL records provenance.
13. **INV-13** — Performance: one persistent PR worktree/worker via `agent_manager`; full then delta review.14. **INV-14** — Frontier authority: the command session owns verdicts, merge, labels, promotion, closure; the mutation worker mutates only inside its PR worktree.
## Verification

```bash
npm run verify
```

## Links

Glossary: `CONTEXT.md`. Decisions: ADR-0006, ADR-0014, ADR-0015, ADR-0019, ADR-0022, ADR-0023. Review policy: `REVIEW.md`. Harness: `scripts/docs-check.sh`. Redirect: `docs/leaves/ext/review-this.md`.
