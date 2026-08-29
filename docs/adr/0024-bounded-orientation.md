# 0024 — Bounded orientation and approved existing-cache improvement

Status: accepted
Supersedes: 0017 (exact-ten-check clause only)
Date: 2026-08-29

Decision: attention control becomes machine-enforced. A runtime orientation
resolver computes the unique orientation set a command needs before code
inspection: the compact architecture index, whole affected seam leaf docs,
leaf-named glossary entries, and linked accepted ADRs or policies. The sets
resolve from affected seam names and repository-owned routing data — never
from a path or anchor list transported in a ticket. Byte caps are strict:

- Ordinary change: 6,000 bytes.
- API or route change: 9,000 bytes.
- Schema or data change: 12,000 bytes.
- Re-orientation after compaction: 7,000 bytes.
- New-dependency material fits the selected task cap.
- No orientation set exceeds 12,000 bytes.

Duplicate sources count once; superseded or historical ADRs stay out of
current guidance unless a leaf explicitly requires them. An over-budget route
fails before broad content loading and reports its task band, resolved bytes,
cap, source count, and exact sources. The exhaustive tier and coverage
inventory moves to a harness-owned coverage manifest excluded from every
resolved set, and `ARCHITECTURE.md` becomes a compact seam index. The harness
grows an eleventh check, **`Orientation budget`**, which is introduced through
this decision and never hidden in the scorecard. Audit remains read-only. A
new Improve path diagnoses an existing cache, shows one complete migration
preview, waits for one explicit approval, applies the complete approved trims,
additions, moves, deletions, coverage-manifest changes, and generated-doc
actions, and finishes only after the prose audit and harness pass. Improve
preserves unrecoverable facts, routes durable decisions and vocabulary to
their tiers, and removes code-recoverable restatement and work history before
considering a seam split; a split is proposed only when code ownership,
invariants, entry points, and change cadence are independently meaningful.

Why: budgets were prose-only, so the mandatory index and leaves of a growing
repository exceeded their own published caps; the ten-check gate had no
machine-enforced budget; the architecture index doubled as the exhaustive
coverage inventory and grew without bound; and the Audit branch could diagnose
an older bloated cache but no branch could apply an approved repair, so the
skill appeared reluctant to finish the job. One real worker used nearly 200k
tokens before editing, exact attribution unavailable without telemetry.

Consequences:
- Supersedes ADR-0017's "the harness stays ten checks" clause, the change
  recorded here rather than in the scorecard.
- Narrows `document-for-agents:INV-13`: the documentation harness remains at
  eleven checks while this decision is accepted.
- Freezes the glossary terms Orientation set, Task band, Coverage manifest,
  Orientation budget, and Improve in the adopting glossary.
- The architecture index stays a compact seam index; coverage inventory moves
  to the harness-owned manifest, excluded from every orientation set.
- The loading protocol in `reference/templates.md` states byte caps;
  `reference/orientation.md` documents the resolver contract; the reference
  implementation ships as `orientation.ts` in the skill.
- Harness check 11 (`Orientation budget`) validates declared routes and stays
  dormant until a repository declares its first route, so a legacy cache
  remains diagnosable while it migrates.
- Audit and Improve become distinct public behaviors: Audit is read-only;
  Improve changes the repository only after one explicit preview approval.
- This repository adopts the contract in the same change: its own index is
  compacted, its coverage moves to `docs/manifest.md`, and its leaf migration
  to the caps is tracked in the debt registry.