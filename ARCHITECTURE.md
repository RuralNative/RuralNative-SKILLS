# Architecture — RuralNative-SKILLS

A public shelf of installable agent skills; each is a seam under `skills/<identity>/`. Compact index; the exhaustive tier and coverage inventory lives in the manifest `docs/manifest.md`, excluded from every orientation set.
Documentation tier: full
## Seams

| Seam | Responsibility | Code root | Tests | Doc |
|---|---|---|---|---|
| document-for-agents | doc-cache lifecycle; accuracy, attention, budgets, tier, coherence, diagnostics | skills/document-for-agents/ | `skills/document-for-agents/tests/` | docs/leaves/document-for-agents.md |
| document-for-humans | plain-language derived docs | skills/document-for-humans/ | `skills/document-for-humans/tests/` | docs/leaves/document-for-humans.md |
| unslopify | AI-tell detection, meaning-safe revision, always-on | skills/unslopify/ | `skills/unslopify/tests/` | docs/leaves/unslopify.md |
| plan-this | planning workflow; publishes spec and tickets | skills/plan-this/ | `skills/plan-this/tests/` | docs/leaves/plan-this.md |
| implement-this | implementation adapter; bounded tickets, workers, PR-only delivery | skills/implement-this/ | `skills/implement-this/tests/` | docs/leaves/implement-this.md |
| review-this | one review wave through merge, promotion, closure | skills/review-this/ | `skills/review-this/tests/` | docs/leaves/review-this.md |
| release-skills | universal release workflow; version-file detection | skills/release-skills/ | `skills/release-skills/tests/` | docs/leaves/release-skills.md |

New `skills/<identity>/` needs a row, leaf doc, matching `SKILL.md` name (check 3).## Non-seam docs

- REVIEW.md
- CONTEXT.md, README.md, docs/debt.md, reference/vendor-facts.md
- docs/agents/*, docs/manifest.md, docs/human/*
## Decisions

Accepted decisions in `docs/adr/` (incl. `docs/adr/0016-unslopify-always-on-output-contract.md`, `docs/adr/0018-opt-in-skill-diagnostics.md`, `docs/adr/0028-adaptive-doc-cache-governance.md`, `docs/adr/0029-unslopify-session-start-and-plain-language-live-output.md`, `docs/adr/0030-larger-orientation-ceilings.md`); superseded set and tiers in `docs/manifest.md`.## Cross-cutting boundaries

- Orientation: ordinary 9,000, API/route 13,500, schema/data 18,000, re-orientation 10,500, absolute 18,000; hard caps on orientation documents; ceilings are caps, not targets; never block code inspection inside the affected seam; a missing fact is a cache gap — ask the owner for approval before widening the read set (ADR-0017, ADR-0024, ADR-0030).
- Tier promotes automatically and additively, never auto-demote; seam coherence fails a stale fingerprint, dirty or clean; manifest, fingerprints, and private consent state stay out of every orientation set (ADR-0024, ADR-0028).
- Frontier session owns verdicts, merge, labels, promotion, closure (ADR-0022); workers retained until durable (ADR-0023).## Loading protocol

| Task | Read set | Budget (cap) |
|---|---|---|
| Any change | index → one leaf → required glossary → required decisions | 9,000 |
| API/route change | + required route, security, testing policy | 13,500 |
| Schema/data change | + required data doc, migrations policy, generated slice | 18,000 |
| Re-orient after compaction | index → task leaf (Non-negotiables) → required glossary | 10,500 |

## Checks

`./scripts/docs-check.sh` — eleven checks (check 2 `Seam coherence`, check 11 `Orientation budget`) plus scorecard. Freshness 30 days.
## Coverage

Every authored doc checked against disk via the manifest (check 1); `AGENTS.md` and this index excluded.
