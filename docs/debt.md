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
Verdict 2026-08-29: ADR-0024 moved the coverage table out of
`ARCHITECTURE.md` into the harness-owned `docs/manifest.md`, so the coverage
half of the hotspot now lives in one manifest row per doc; the seam table
remains in the compact index and still collides. Debt stands; trigger reset
to `seams > 10` or the next index merge conflict, whichever first.

### DEBT-9 — Orientation routes not yet declared; own leaves exceed the caps

Status: resolved
Revisit-when: none — resolved 2026-08-29 by the repository-migration child of #176
What: ADR-0024 makes the resolved orientation byte caps strict, and harness
check 11 arms a cap the moment a route is declared. This repository's own
leaves still exceed their aggregate route caps (the review leaf alone was
31.6 KB against a 6,000-byte ordinary cap), so no orientation route was
declared in `docs/manifest.md` and check 11 reported dormant here. The index
has been compacted (coverage moved to the manifest); the leaf migration —
trimming restatement and history so each seam's resolved route fits its band —
is the repository-migration ticket's work, and declaring routes without that
trim would fail the gate loudly rather than silently.
Verdict 2026-08-29: #178 migrated this repository to the bounded contract.
Each leaf keeps its specific invariants and links and points restated detail
into `docs/leaves/ext/` redirect files that the resolver never follows.
Every seam now resolves under every band cap (ordinary 6,000, api-route
9,000, schema-data 12,000, re-orientation 7,000), all routes are declared in
`docs/manifest.md`, and check 11 passes.

### DEBT-4 — Re-orientation unverified

Status: resolved
Revisit-when: none — drill run 2026-08-29 under #178
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
Verdict 2026-08-23: the loading protocol changed again in #147 — budgets
became caps on orientation documents with a cache-gap approval gate and a
five-command contract atop `AGENTS.md`. No formal drill has run; informal
evidence still shows agents re-orienting via the protocol. Debt stands;
trigger reset to the next drill only.
Verdict 2026-08-29: #178 ran the bounded re-orientation drill. A fresh
context read only the permitted set — `AGENTS.md` (five commands), the
compact `ARCHITECTURE.md` seam index, the affected seam leaf in
`docs/leaves/`, and the leaf-named glossary entries — under the re-orientation
cap, and re-derived each seam's purpose, ownership, invariants, and routing
without reading redirect files, the coverage manifest, or derived human docs.
No cache gap surfaced: every fact needed to orient (seam table, loading
protocol, invariant identifiers, `Not here` routes, decision pointers) is
present in the permitted set, and every seam's re-orientation route resolves
within its 7,000-byte cap. The drill is reproducible via the resolver
(`node skills/document-for-agents/orientation.ts --band re-orientation
--seams <seam>`).

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
What: the verify chain runs dependency install, tests, TypeScript, and the docs
harness; nothing guards formatting or lint style. The former `format`,
`format:check`, `lint`, and `build` scripts were echo stubs that could never
fail (#121), so their removal narrows the chain to checks that can fail rather
than adopting real tooling. Choosing and wiring a formatter or linter closes
this entry.
