# 0034 — Self-contained handoffs and optional review policy

Status: accepted
Date: 2026-09-08
Supersedes: 0031 (`/implement` clause only), 0033 (missing-policy bootstrap only)

Decision:

- `/implement-this` is self-contained: it implements directly with focused
  tests and delivers through an ordered, read-back-verified pull-request
  procedure. No `/implement` invocation and no mandatory `/code-review`.
- Initial work requires `ready-for-agent`. A `ready-for-human` ticket with
  exactly one verified matching open PR may repair delivery; ambiguity,
  changed requirements, blockers, `needs-info`, assignees, and dirty or
  mismatched checkouts still stop. Missing historical proof is reported, never
  reconstructed.
- Planning bodies validate with `validateAuthoritativeBody` before pinning.
  New evidence uses the `evidence-v2` envelope binding proof to the verified
  head SHA. Implementation and review share `validateEvidenceHandoff`; a
  missing pin is never provenance, and legacy evidence passes only with
  established pre-contract provenance.
- `REVIEW.md` is optional project guidance. General workflow rules live in
  the `review-this` skill. Absence never blocks review and nothing is
  created. The effective-policy revision covers the resolved governing
  sources, so adding, removing, or changing one invalidates verdict reuse.
  Review stays review-only: it never repairs the PR body.

Why: delegated completion conflicted with focused delivery, publication could
precede the freshness check, repeat runs rejected the delivered label state,
and review discovered missing implementation evidence instead of delivery
refusing to claim success.

Consequences:

- implement-this INV-3/INV-4 drop the `/implement` dependency; review-this
  INV-18 drops create-and-stop bootstrap; INV-16 narrows the policy-revision
  input to the effective governing sources.
- The shared workflow-state core gains the evidence handoff validator,
  planning body validator, repair eligibility, and effective-policy revision.
- Historical ADRs stay verbatim as evidence.

Activation: this decision governs new invocations of all three commands from
today. Roll out the three skills from the same repository revision.
