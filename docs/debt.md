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
Revisit-when: seams > 10 or next ARCHITECTURE.md merge conflict requiring manual resolution — whichever first
What: parallel agents adding seams will collide in `ARCHITECTURE.md`'s seam
and coverage tables; no merge semantics are defined for them. Verdict
2026-08-20 at 7 seams: trigger `seams > 3` matured without review as the repo
grew from 4 to 7 seams. Spot-checked ARCHITECTURE.md: both tables remain
sequential markdown requiring line-adjacent edits with no defined merge
strategy, and the #73 slice family touched the same tables serially. Contention
risk is confirmed and debt still stands. Trigger reset to `seams > 10` to allow
two more seam additions before mandatory review, or immediate review if a merge
conflict in ARCHITECTURE.md forces manual resolution — whichever first.
Reasoning: 10 doubles the window since the missed trigger while any real
conflict proves semantics are needed sooner than count alone.

### DEBT-4 — Re-orientation unverified

Status: open
Revisit-when: next simulated compaction drill or ARCHITECTURE.md loading protocol change
What: the two-hop re-orientation read (AGENTS.md → ARCHITECTURE.md → leaf →
CONTEXT.md) is asserted by construction; no drill proves a fresh agent can
re-orient from the index alone. Verdict 2026-08-20: trigger `a second agent
works in this repo` matured many times — multiple Kilo and AO workers have
oriented since the debt was opened, including this #74 slice. No formal
re-orientation drill has been run (simulate compaction, then one small fixed
read: ARCHITECTURE.md → task leaf → CONTEXT.md under token budget and report
gaps). Informal evidence shows second agents do re-orient via the protocol,
yet this ticket's findings (DEBT-7 at 48 not 83 lines, a former debt naming a seam
absent from skills/) show the protocol surfaces structure but not claim
fidelity — false entries survived harness-green. Debt still stands.
Trigger reset to the next drill (time-boxed fresh agent, compaction
simulation) or any change to the loading protocol, whichever first.

### DEBT-5 — Layout-agnostic gaps in seam discovery

Status: open
Revisit-when: a seam spans multiple roots or a stray root-level code file
appears
What: checks 3 and 6 reason about single directories; seams spanning multiple
roots and stray root-level code files are not covered by the gate.

### DEBT-7 — implement-this wrapper parity with plan-this trim

Status: resolved
Revisit-when: none — verified 2026-08-20 against skills/implement-this/SKILL.md at 48 lines including frontmatter, with no wrapper sections
What: before #57, `implement-this` at 83 lines carried the pre-trim wrapper
pattern that `plan-this` had before #55 — title intro, Invocation, Hard
dependencies, Rules preserved summary, Installation and discovery, and Boundary
— duplicated from reference material already in its leaf, INSTALL, and ADR.
Verified 2026-08-20: `skills/implement-this/SKILL.md` is 48 lines including
frontmatter and contains none of those five wrapper markers; trimmed shape is
workflow line → Rules → Start → Build and verify → Delivery → Ticket Issue #0
with leaf/INSTALL/ADR-0008 as the single home for wrapper reference and
composition guards for `Rules preserved`, `## Installation`, `## Boundary`, and
related marker phrases. Payoff completed before #74 and never closed; resolved
here.

### DEBT-8 — No formatter or linter wired

Status: open
Revisit-when: a real formatter or linter is chosen
What: the verify chain runs dependency install, tests, typecheck, and the docs
harness; nothing guards formatting or lint style. The former `format`,
`format:check`, `lint`, and `build` scripts were echo stubs that could never
fail (#121), so their removal narrows the chain to checks that can fail rather
than adopting real tooling. Choosing and wiring a formatter or linter closes
this entry.
