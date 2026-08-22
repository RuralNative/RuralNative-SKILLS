# 0017 — Doc cache attention boundary

Status: accepted
Date: 2026-08-23

Decision: the doc-cache lifecycle holds two equal outputs, cache accuracy and
attention control. Generated `AGENTS.md` starts with the approved five
commands, in this order:

1. Say the task goal.
2. Read only the matching row; its budget is a cap.
3. Follow the owning seam and its `Not here` routes.
4. Change code and docs together; code wins.
5. Put work docs in the tracker; decide invariant conflicts first.

The architecture index does not duplicate them. Loading rows and token budgets
are hard caps on orientation documents; they never block task-driven code
inspection inside the affected seam. A missing unrecoverable fact becomes a
named cache gap recorded in the issue tracker, and the documentation read set
widens only after owner approval. The standard leaf shape closes Scope &
boundaries with a `Not here` route that names the owning responsibility in
stable language, never a file path. A task that conflicts with a numbered
invariant stops before any change until an approved decision supersedes or
narrows that invariant; silent workarounds are forbidden, and doc-versus-code
conflicts keep the code-wins path. The vendor-facts home is the adopting
repository's singular `reference/vendor-facts.md`, and the `unslopify`
dependency adapter sits below principles and boundaries in `SKILL.md`.

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
- Derived human pages regenerate with their sources; public README text
  states the cap behavior.
- The harness stays ten checks; these behaviors are review-level contracts,
  not an eleventh gate.
