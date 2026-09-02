# 0030 — Larger orientation ceilings

Status: accepted
Narrows: 0024 (cap values only)
Date: 2026-09-02

Decision: every `document-for-agents` size ceiling rises by 50%: the compact
index stays under 225 lines, a leaf doc is at most a three-minute read, a
policy doc including the root `REVIEW.md` stays within 105 lines, a
dependency reference entry is about 15 lines, a leaf carries 3–8 invariants
at establishment, and the leaf complexity review triggers past about 23
invariants — review, never an automatic seam split. Task-band byte caps
become ordinary 9,000, API or route 13,500, schema or data 18,000, and
re-orientation 10,500, with an absolute maximum of 18,000. The ceilings stay
strict caps, not targets: existing documents and routes remain valid,
nothing is padded to fill the room, and no migration is needed. The trimming
order and effort are unchanged — work history, stale text, duplication,
code-recoverable detail, long file tours, and coverage restatement come out
before essential material; decisions, rejected alternatives needed to
understand them, vocabulary, boundaries, invariants, and operational warnings
stay; extended detail files hold only nonessential reference; and an
essential rule is never silently truncated to fit a limit — if essential
content still exceeds the new cap, the route fails with the existing
over-limit report and decision path. Small units keep their limits: an ADR
decision stays two to four sentences, a glossary definition one to two
sentences, and a routing statement one line.

Why: byte-based orientation pressure had become the binding constraint — an
ordinary route combining the index and one leaf already approached the
6,000-byte cap before required glossary or decision text, and `REVIEW.md` sat
at 60 lines against its 70-line test — so essential information was being
trimmed to fit rather than because it was nonessential. A 50% relaxation
restores room for essential content while keeping every cap strict; source
selection, deduplication, cache-gap handling, and stop behavior are
untouched, so the cost of attention stays bounded and visible.

Consequences:
- Narrows ADR-0024's cap values; strict-cap semantics, the over-budget
  report, cache-gap approval, and the eleven-check harness stand unchanged.
- The four self-contained orientation modules (`document-for-agents`,
  `plan-this`, `implement-this`, `review-this`) and `scripts/docs-check.sh`
  share one cap table, kept in agreement by the repository-level parity test
  in `tests/`; installs stay self-contained with no shared runtime import.
- The affected seam leaves cite this decision beside ADR-0024.
- Larger caps relax prior failures and authorize no broader source selection.
