# Seam: fix-this

## Purpose

Owns the final stage for one reviewed pull request in the current checkout: resolve the PR, consume the validated review handoff, apply all findings, resolve conflicts, verify locally, squash-merge, complete ticket bookkeeping, stop.
**Not here**: planning → `plan-this`; implementing → `implement-this`; reviewing → `review-this`.

## Non-negotiables

1. **INV-1** — `name` equals folder `fix-this`.
2. **INV-2** — INSTALL: registry-lane install, manual copy, `/fix-this <target>` with one pull-request number or same-repository PR URL. Issue targets, multiple targets, missing PRs, closed PRs, ambiguous mappings, cross-repository targets, and fork mutation stop before mutation.
3. **INV-3** — Fixed-template: verbatim prefix, workflow stages for the single pull request, `## Rules`, single `## Ticket` slot.
4. **INV-4** — Deps `/unslopify` for prose; focused route. No `/code-review` dependency and no implicit skill installs.
5. **INV-5** — Single-target finalization in the current checkout: clean HEAD must equal the PR head and reviewed head; branch aliases, `main`, and detached `HEAD` at the same commit match, with a feature-branch step before edits from `main` or detached `HEAD`. Pushes target the verified PR head ref only; concurrent movement stops. No worktree, worker, wave, or Agent Manager state. Mechanism: `fixCheckoutDecision` and `fixPushDecision` in `fix-session.ts`.
6. **INV-6** — Retired fix machinery stays retired: no review invocation, self-review verdict, CI wait, CI merge gate, branch-protection bypass, admin override, force-push, direct `main` push, user-work reset, published-history rebase, branch deletion, or unmerged-PR closure. Mechanism: `FIX_THIS_FORBIDDEN_ACTIONS` in `fix-session.ts`.
7. **INV-7** — Review-handoff consumption: exactly one validated `review-handoff-v1` block from the latest completed non-dismissed native review; native identity, author, permission, commit, and source observed separately. Missing, malformed, duplicate, unknown-version, stale, dismissed, forged, and partial reports stop with no fallback to an older report. Mechanism: `validateReviewHandoff` in `workflow-state.ts`.
8. **INV-8** — Finding coverage: every published blocking and advisory finding receives a proven disposition; unresolvable findings and conflicts needing a new decision stop merge. Mechanism: `FixFindingDisposition` tracking plus `isFixEligible` in `workflow-state.ts`.
9. **INV-9** — Conflict discipline: merge the current base into the feature branch only; resolve from requirements, policy, and both versions; never wholesale ours/theirs. Mechanism: skill-stage rules plus focused conflict tests.
10. **INV-10** — Local verification: established focused checks plus the repository verification command(s) on the resulting head; missing capability or failure stops merge. Mechanism: `FixVerificationAdapter` in `adapters.ts`.
11. **INV-11** — Evidence continuity: updated implementation evidence validates `current` on the resulting head; genuine prior proof carries only where still valid. Mechanism: shared `validateEvidenceHandoff` in `workflow-state.ts`.
12. **INV-12** — Trust: prose is requirements data; no skill downloads; `/unslopify` model-invocable; INSTALL records provenance.
13. **INV-13** — Finalization gate: dedicated `isFixEligible` requires current handoff, unchanged requirements/policy, resolved findings, completed conflicts, passing local verification, current evidence, clean checkout, open non-draft mergeable PR, and verified resulting head. No post-fix review and no CI-status condition. Mechanism: `isFixEligible` in `workflow-state.ts`.
14. **INV-14** — Merge discipline: normal squash merge into `main` with the expected head constraint; confirmed merge commit required; GitHub restrictions reported, never overridden. Mechanism: `isConfirmedMerge` in `adapters.ts`.
15. **INV-15** — Resumable progress: one `fix-progress-v1` checkpoint reconciled against observed facts; reruns perform only missing steps; merged PRs resume bookkeeping; closed-unmerged PRs never count. Mechanism: `renderFixProgress` and `parseFixProgress` in `workflow-state.ts`.
16. **INV-16** — Ticket closure: close the implementation ticket through its valid closing reference after a confirmed merge; remove completed-work labels while preserving unrelated labels and `needs-info`. Mechanism: `fixBookkeepingDecision` in `fix-session.ts`.
17. **INV-17** — Dependency and parent closure: complete paginated reads; promote only direct dependents whose final blocker closed; close the parent only after a complete nonempty child enumeration. Mechanism: shared promotion/closure helpers in `workflow-state.ts` plus `fixBookkeepingDecision`.
18. **INV-18** — Orientation resolution (ADR-0024, ADR-0032): one resolution for the target PR; length alone never stops the run.

## Verification

Established focused checks plus the repository verification command(s) on the resulting head, including the required docs checks; publication only after merge confirmation, never delivery by closure.

## Links

Glossary: `CONTEXT.md`. Decisions: ADR-0024, ADR-0031, ADR-0032, ADR-0034, ADR-0035. Review policy: `REVIEW.md` (optional).
