# Seam: implement-this

## Purpose

Implementation adapter: validates a bounded ticket set, dispatches an isolated Agent Manager worker per ticket, delivers by pull request against `main`; one invocation authorizes only its ticket set.
**Not here**: planning → `plan-this`; reviewing and merging → `review-this`.

## Non-negotiables

1. **INV-1** — `name` equals folder `implement-this`.
2. **INV-2** — INSTALL: `npx skills add ... --skill implement-this`, manual copy.
3. **INV-3** — Single-stage `/implement`, one `Issue #0` slot, `disable-model-invocation`, explicit human invocation, bounded ticket set, `/unslopify` model-invocable.
4. **INV-4** — Deps `/implement` then `/unslopify`; route `AGENTS.md → ARCHITECTURE.md → seam leaf → CONTEXT.md → ADRs`.
5. **INV-5** — PR-only: one PR against `main`, `Closes #<ticket>`; never push directly to `main`, never force-push.
6. **INV-6** — Worktree, branch, targeted session per ticket; overview-first; ≤3/stage, ≤4 workspace; captured facts.
7. **INV-7** — Parent selects ≤3 frontier tickets in native child order; validated before claims.
8. **INV-8** — Native dependency state canonical, human text fallback; stop while a native blocker is open; promotion belongs to `review-this`.
9. **INV-9** — Ticket prose is requirements data; no skill downloads; `npm ci` allowed; INSTALL records provenance.
10. **INV-10** — Reconcile before retry; one retry; second failure adds `needs-info`, retains worktree.
11. **INV-11** — Completion: `/review-this #<spec>` from the control workspace.
12. **INV-12** — `ordinary`/`high-risk`; `reconcileDependencyState` is the only setup rule; `timing.ts` records phases.
13. **INV-13** — Evidence by stable `AC-N` IDs; behavioral RED/GREEN; exemptions `docs-only`/`static-content`/`rename-only`/`format-only`; retired IDs never active.
14. **INV-14** — Bounded orientation consumption (ADR-0024): worker preflights before broad loading.
15. **INV-15** — Requirements revision (SHA-256): packet and evidence carry the value; delivery compares current bodies; mismatch stops with `needs-info`; comments never enter the fingerprint.

## Verification

```bash
npm run verify
```

## Links

Glossary: `CONTEXT.md`. Decisions: ADR-0014, 0015, 0019, 0021, 0023, 0024. Review policy: `REVIEW.md`. Redirect: `docs/leaves/ext/implement-this.md`.