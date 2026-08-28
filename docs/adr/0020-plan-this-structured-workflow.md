# 0020 — plan-this structured workflow for intent, exploration, and concise specification

Status: accepted
Date: 2026-08-28
Amends: 0006

Decision: `plan-this` moves from a byte-for-byte fixed-template adapter into a structured workflow adapter. The skill still has identity `plan-this`, explicit invocation `/plan-this <task>`, and a single `## Task:` substitution slot, but its body is no longer checked byte-for-byte against thirteen dense rule bullets. Instead it carries a structured contract: `## Contract` plus five numbered phases `## 1. Define intent` through `## 5. Approve and publish`, verified by semantic composition tests that check phase order, required fields, and behavioral guarantees.

The workflow adds three repository-owned improvements taken from the Addy Osmani comparison while keeping every existing GitHub and execution guarantee:

- Every run defines and confirms an intent capsule with `Outcome`, `User`, `Why now`, `Success`, `Constraints`, and `Non-goals`. The capsule is gathered from task text, conversation, code, and documentation before asking the user. A fresh run completes at least one real decision round, and confirmation of a complete capsule satisfies that round.
- When the intended outcome is clear but the solution form is unsettled, the run presents exactly three materially different directions, including the simplest viable one, compares user value, feasibility, and the most likely invalidating risk or assumption for each, and updates the capsule from the user's selection. When the solution form is already settled, it skips this phase.
- Decisions are asked one at a time in ELI18 language with a recommended answer and supporting reasoning. Questions are grouped only to show the current frontier; each decision is presented separately so a concrete proposal can be corrected. The command's one-decision rule overrides the installed `/grilling` skill's frontier batching, and its planning-only boundary overrides `/domain-modeling` write-as-you-go behavior: approved decisions are recorded in the future GitHub specification and no repository ADR or glossary file is edited during the planning run. An interrupted decision tree resumes its recorded state.
- The parent specification carries the confirmed capsule and only the user stories needed to distinguish observable behavior, not an exhaustive restatement. Coherence-first ticket sizing, native blocker versus scheduling-collision semantics, risk classification, worker limits, publication guarantees, trust boundaries, and the docs-check invariants remain unchanged.

Why: the prior thirteen-bullet template hid intent discovery, divergent ideation, and delegation precedence inside dense prose. Comparing against Addy Osmani's `interview-me`, `idea-refine`, and `spec-driven-development` showed those stages catch framing errors before the decision tree and produce tighter specifications, while the repository's publication, label, and ticket-graph rules remain the stronger back half. Keeping the byte-for-byte check would force every improvement to masquerade as a preservation of a single long paragraph; a structured check preserves the contract without freezing the prose.

Consequences:
- `docs/leaves/plan-this.md` carries the revised invariants INV-3, INV-5, and INV-7 for the structured shape, capsule, and concise specification.
- `skills/plan-this/SKILL.md` grows from ~28 lines to ~50 lines and is verified by semantic phase and content checks rather than byte-for-byte equality.
- `skills/plan-this/tests/composition.test.ts` encodes the new gate contracts without reviving an exhaustive user-story requirement.
- `ARCHITECTURE.md` updates the `plan-this` seam description from fixed-template to structured workflow.
- No change to `implement-this`, `review-this`, GitHub publication, worker limits, or `ready-for-dev` retirement.
