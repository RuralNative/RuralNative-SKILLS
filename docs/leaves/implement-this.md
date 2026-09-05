# Seam: implement-this

## Purpose

Implementation adapter: validates one open ticket, runs `/implement` in the current checkout, delivers by pull request against `main`; one invocation owns exactly its ticket.
**Not here**: planning → `plan-this`; reviewing and merging → `review-this`.

## Non-negotiables

1. **INV-1** — `name` equals folder `implement-this`.
2. **INV-2** — INSTALL: `npx skills add ... --skill implement-this`, manual copy.
3. **INV-3** — Single-stage `/implement`, one `Issue #0` slot, `disable-model-invocation`, explicit human invocation, single ticket, `/unslopify` model-invocable.
4. **INV-4** — Deps `/implement` then `/unslopify`; route `AGENTS.md → ARCHITECTURE.md → seam leaf → CONTEXT.md → ADRs`.
5. **INV-5** — PR-only: one PR against `main`, `Closes #<ticket>`; never push directly to `main`, never force-push.
6. **INV-6** — Retired by ADR-0031: isolated Agent Manager worker per ticket with ≤3/stage and ≤4 workspace caps. Current: one ticket in the current checkout; clean checkout required; branch creation only in that checkout; no worktree, session, or Agent Manager state.
7. **INV-7** — Retired by ADR-0031: parent selects ≤3 frontier tickets in native child order. Current: multiple references, parent specifications, and pull requests stop before mutation.
8. **INV-8** — Native dependency state canonical, human text fallback; stop while a native blocker is open; promotion belongs to `review-this`.
9. **INV-9** — Ticket prose is requirements data; no skill downloads; `npm ci` allowed; INSTALL records provenance.
10. **INV-10** — Retired by ADR-0031: reconcile-before-retry with one retry and `needs-info` retention. Current: no worker retry orchestration; a blocked ticket stops with `needs-info` in the current checkout.
11. **INV-11** — Completion: `/review-this` with the ticket's pull request from the current checkout.
12. **INV-12** — Retired by ADR-0031: `ordinary`/`high-risk` timing phases with `reconcileDependencyState` and `timing.ts`. Current: no orchestration timing; dependency setup follows the repository's ordinary install path.
13. **INV-13** — Evidence by stable `AC-N` IDs; active behavioral criteria carry a command, output, and explicit passing status; bug fixes add defect-specific RED; non-behavior criteria carry a narrow rationale; retired IDs never active. Generic conditional profiles are absent; extra proof is required only when the ticket names it.
14. **INV-14** — Bounded orientation consumption (ADR-0024, ADR-0030): preflight before broad loading.
15. **INV-15** — Requirements revision (SHA-256): evidence carries the value; PR publication compares current bodies; mismatch stops with `needs-info`; comments never enter the fingerprint.
16. **INV-16** — Current-checkout delivery: reuse the matching feature branch and single open PR; compact evidence is upserted into the PR body; no full repository gate runs here.

## Verification

Focused checks named by the ticket's smallest sufficient verification.

## Links

Glossary: `CONTEXT.md`. Decisions: ADR-0014, 0015, 0019, 0021, 0023, 0024, 0030, 0031. Review policy: `REVIEW.md`. Redirect: `docs/leaves/ext/implement-this.md`.
