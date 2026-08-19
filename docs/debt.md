# Debt Registry

Known shortcuts and unfinished pieces, tracked per the document-for-agents debt
tier: `DEBT-N` entries with a `Status:` and a `Revisit-when:` trigger. Trigger
maturity is a review act, not a parse. Linked from `ARCHITECTURE.md`.

### DEBT-1 — Checker under-implemented (5 of 8 checks)

Status: resolved
Revisit-when: none — paid off by the ten-check gate (ADR-0002)
What: the repo's checker enforced five of the rulebook's eight checks, so the
repo under-practiced its own doctrine. Resolved by implementing checks 6–9 in
`scripts/docs-check.sh`.

### DEBT-2 — Harness not wired into CI

Status: open
Revisit-when: a second contributor joins the repo
What: the gate runs only when someone remembers to run it; it should run on
every pull request without being remembered.

### DEBT-3 — Index tables are merge hotspots

Status: open
Revisit-when: seams > 3
What: parallel agents adding seams will collide in `ARCHITECTURE.md`'s seam
and coverage tables; no merge semantics are defined for them.

### DEBT-4 — Re-orientation unverified

Status: open
Revisit-when: a second agent works in this repo
What: the two-hop re-orientation read is asserted by construction; no drill
proves a fresh agent can re-orient from the index alone.

### DEBT-5 — Layout-agnostic gaps in seam discovery

Status: open
Revisit-when: a seam spans multiple roots or a stray root-level code file
appears
What: checks 3 and 6 reason about single directories; seams spanning multiple
roots and stray root-level code files are not covered by the gate.

### DEBT-6 — Wrapper parity for review-this-spec

Status: open
Revisit-when: next adapter trim slice after implement-this and plan-this
What: `review-this-spec` shares a similar wrapper pattern to the pre-trim `implement-this` and `plan-this` adapters and could be pruned for parity to keep a single home for wrapper material outside `SKILL.md`. No code change in this slice; tracked here and in `docs/leaves/implement-this.md` Further Notes for follow-up.

### DEBT-7 — implement-this wrapper parity with plan-this trim

Status: open
Revisit-when: next fixed-template adapter grooming slice
What: `implement-this` at 83 lines still carries the pre-trim wrapper pattern
that `plan-this` had before #55 — title intro, Invocation, Hard dependencies,
Rules preserved summary, Installation and discovery, and Boundary — duplicated
from reference material already in its leaf, INSTALL, and ADR. It should be
pruned to the same trimmed shape (~25-35 lines including frontmatter, workflow
line plus Rules plus `## Ticket Issue #0` slot) with leaf/INSTALL/ADR as the
single home for wrapper reference and with negative composition guards for
`Rules preserved`, `## Installation`, `## Boundary`, and marker phrases. An
optional `review-this-spec` slice would share the same pattern if introduced.
This slice (#57) tracks the debt without editing `implement-this`.

