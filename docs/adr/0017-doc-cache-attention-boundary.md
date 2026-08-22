# 0017 — Doc cache attention boundary

Status: accepted
Date: 2026-08-23

Decision: the doc-cache lifecycle has two equal outputs, cache accuracy and
attention control. Generated `AGENTS.md` starts with the approved five
commands in this order:

1. Say the task goal.
2. Read only the matching row; its budget is a cap.
3. Follow the owning seam and its `Not here` routes.
4. Change code and docs together; code wins.
5. Put work docs in the tracker; decide invariant conflicts first.

The architecture index does not duplicate them. Loading rows and token budgets
cap orientation documents, task-driven code inspection remains allowed, missing
unrecoverable facts create a named cache gap and require owner approval before
the documentation read set widens, leaf docs use stable responsibility-based
`Not here` routes, and numbered invariant conflicts stop until an approved
decision narrows or supersedes the invariant. Doc-versus-code conflicts keep
the code-wins path.

Why: loading budgets read as guidance rather than caps, so agents preloaded
the tree; leaf docs described boundaries without routing wrong-turn work to
its owner; and an invariant collision had no stop-and-decide path, inviting
quiet exceptions. Caps paired with an approval gate make every widening of
attention visible, responsibility-named routes decay slower than paths, and
decision-first collision handling keeps rule changes attached to durable
reasons instead of per-task judgment calls.

Consequences:
- The seam leaf declares INV-7 with composition tests and the five-command
  fixture in `skills/document-for-agents/tests/`.
- This repository adopts the contract in the same change: five commands at
  the top of `AGENTS.md`, cap language in the architecture loading protocol,
  a `Not here` route in every leaf doc, and the glossary terms Attention
  control, Cache gap, and Not here route.
- The vendor-facts home is the adopting repository's singular
  `reference/vendor-facts.md`.
- The `unslopify` dependency adapter sits below principles and boundaries in
  `SKILL.md`.
- Derived human pages regenerate with their sources; public README text
  states the cap behavior.
- The harness stays ten checks; these behaviors are review-level contracts,
  not an eleventh gate.
