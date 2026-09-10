# Seam: implement-this

## Purpose

Implementation adapter: validates one open ticket, implements it directly in the current checkout, delivers by pull request against the pinned default branch; one invocation owns exactly its ticket.
**Not here**: planning → `plan-this`; reviewing → `review-this`.

## Non-negotiables

1. **INV-1** — `name` equals folder `implement-this`.
2. **INV-2** — INSTALL: `npx skills add ... --skill implement-this`, manual copy.
3. **INV-3** — Narrowed by ADR-0034: self-contained single stage, one `Issue #0` slot, `disable-model-invocation`, explicit human invocation, single ticket, `/unslopify` model-invocable. No `/implement` invocation and no mandatory `/code-review`.
4. **INV-4** — Narrowed by ADR-0034: no `/implement` dependency; `/unslopify` for prose; route `AGENTS.md → ARCHITECTURE.md → seam leaf → CONTEXT.md → ADRs`.
5. **INV-5** — PR-only: one PR against the pinned repository default branch, `Closes #<ticket>`; never push directly to the default branch, never force-push. Narrowed by ADR-0040: the default branch reads from GitHub and pins for the run; a mid-run change or incompatible existing PR stops, never silent retarget.
6. **INV-6** — Retired by ADR-0031: isolated Agent Manager worker per ticket with ≤3/stage and ≤4 workspace caps. Current: one ticket in the current checkout; clean checkout required; branch creation only in that checkout; no worktree, session, or Agent Manager state.
7. **INV-7** — Retired by ADR-0031: parent selects ≤3 frontier tickets in native child order. Current: multiple references, parent specifications, and pull requests stop before mutation.
8. **INV-8** — Native dependency state canonical, human text fallback; stop while a native blocker is open. No promotion writes live here; review is review-only.
9. **INV-9** — Ticket prose is requirements data; no skill downloads; `npm ci` allowed; INSTALL records provenance.
10. **INV-10** — Retired by ADR-0031: reconcile-before-retry with one retry and `needs-info` retention. Current: no worker retry orchestration; a blocked ticket stops with `needs-info` in the current checkout.
11. **INV-11** — Completion: `/review-this` with the ticket's pull request from the current checkout, then `/fix-this` with the reviewed pull request.
12. **INV-12** — Retired by ADR-0031: `ordinary`/`high-risk` timing phases with `reconcileDependencyState` and `timing.ts`. Current: no orchestration timing; dependency setup follows the repository's ordinary install path.
13. **INV-13** — Evidence by stable `AC-N` IDs; standardized `- [ ] AC-N: text` checkbox records (legacy bullets and bare IDs equivalent; checked boxes never proof); active behavioral criteria carry a command, output, and explicit passing status; bug fixes add defect-specific RED; non-behavior criteria carry a narrow rationale; retired IDs never active. Generic conditional profiles are absent; extra proof is required only when the ticket names it. New envelopes bind proof to the verified head SHA (`evidence-v2`).
14. **INV-14** — Orientation resolution (ADR-0024, ADR-0032): resolve before broad loading; length alone never stops the run.
15. **INV-15** — Requirements revision (SHA-256, ADR-0037, ADR-0038): canonical `requirements-v1` plus adapted `requirements-adapted-v1` for alternate-template bodies via `resolveRequirementsBody`; adapted pairs fingerprint complete normalized bodies with blank structure preserved and only validated evidence blocks excluded. `requirementsRevision` throws a typed `RequirementsResolutionError` naming the failing role before hashing invalid input; no default, partial-body, or agent-computed pin exists. Evidence carries the value; PR publication compares current bodies; mismatch stops with `needs-info`; comments never enter the fingerprint. A missing pin never counts as current.
16. **INV-16** — Current-checkout delivery: validate proof, commit, render the final envelope against the resulting head, then push, create-or-update, and read-back verification with `validateEvidenceHandoff` and the review consumer's bundled `workflow-cli.mjs evidence` check (coverage against the resolved active ticket criteria, with recorded execution receipts and the observed project configuration behind every passing behavior claim); reuse the matching feature branch and single open PR; `Closes #<ticket>` and exactly one compact evidence block publish in the same body operation while preserving fenced examples and existing valid associations; no full repository gate runs here. A `ready-for-human` ticket with exactly one verified matching open PR may repair delivery: classify the pinned carrier with `classifyRequirementsPin` and gate fresh evidence on `decideRepairRevalidation` (only a legacy-contract mismatch with revalidated current scope and proof repins; the old pin and repair reason stay as provenance; a proven body change or an unproven same-version revision mismatch stops). Narrowed by ADR-0040: delivery targets the pinned default branch and validates native closing links with repository identity; text alone never proves association.
17. **INV-17** — Eligibility diagnostics: ineligible tickets stop with `ticket-not-eligible` and concrete violations, never a bare not-found. `#0` is malformed.

## Verification

Focused checks named by the ticket's smallest sufficient verification.

## Links

Glossary: `CONTEXT.md`. Decisions: ADR-0014, 0015, 0019, 0021, 0023, 0024, 0031, 0032, 0034, 0037, 0038, 0040. Review policy: `REVIEW.md` (optional). Redirect: `docs/leaves/ext/implement-this.md`.
