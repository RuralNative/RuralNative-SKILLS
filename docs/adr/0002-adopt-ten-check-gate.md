# 0002 — Adopt the ten-check gate and the invariant lifecycle

Status: accepted
Date: 2026-08-18

Decision: the harness enforces ten checks; check 10 is invariant identifier
integrity — duplicate `INV-N` within a seam and unresolved cross-doc `INV-N`
references are fatal; numbering gaps are unchecked. Invariants retire by
tombstone tied to a decision, are never deleted, and are never renumbered
except recorded duplicate repair. Test-encoded means the identifier appears
literally under the seam table's declared test location; a prose invariant
carries a justification naming its mechanism.

Why: a consumer repo shipped a duplicate `INV-N` through a green nine-check
gate — the exact silent-drift class this skill exists to prevent.
Gap-fatality was rejected because adopters with pre-existing numbering would
fail on day one and delete the gate.

Consequences:
- The scorecard marks each invariant enc/prose; prose invariants name their
  mechanism.
- Check 10 stays layout-agnostic by anchoring to the seam table.
- Deferred findings (multi-root seams, stray root-level code files) are debt.
