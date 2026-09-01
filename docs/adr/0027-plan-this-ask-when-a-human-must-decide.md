# 0027 — plan-this asks only when a human must decide

Status: accepted
Narrows: 0020 (forced decision round and capsule confirmation clause only)
Date: 2026-09-01

Decision: planning asks the user a question only when repository facts and
the confirmed task cannot decide a choice, and the choice changes product
behavior, scope, cost, risk, or an action that is hard to undo. A run no
longer forces a decision round or a capsule confirmation when the capsule is
complete and settled; a complete task with a settled solution reaches the
publication preview without a forced question. Every question states the
choice in one plain sentence, uses at most three short options, gives one
short recommendation based on effects the user can understand, and explains
any needed technical term in plain words where it appears. Repository facts,
standard safe defaults, reversible implementation choices, and internal
process choices never become user questions. Explicit approval remains the
only action that authorizes GitHub publication.

Why: the fresh-run decision round and capsule confirmation made already
settled tasks pay for a question the user could not use. Specification #183
names the forced round as a confirmed usability gap: a non-programmer can
miss the real choice inside process language. This narrow supersede keeps
ADR-0020's five structured phases, intent capsule, three-direction
exploration gate, one-decision rule, risk classification, and publication
guarantees.

Consequences:
- `skills/plan-this/SKILL.md` phase 1 asks only when a human must decide and
  drops the fresh-run round and forced capsule confirmation; phase 3 records
  an empty frontier without a question; phase 4 and phase 5 keep the
  preview plain, and the explicit approval gate stays.
- `skills/plan-this/decisions.ts` models the ask-or-proceed rule, question
  shape, capsule completeness, and publication approval as a pure module with
  scenario tests.
- `docs/leaves/plan-this.md` INV-5 states the narrowed decision gate with at
  most three short options and one short recommendation, and the leaf Links
  carry this decision.
- Derived human pages and README describe the narrower behavior in the same
  change.