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

