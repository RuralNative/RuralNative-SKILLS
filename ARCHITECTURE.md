# Architecture — RuralNative-SKILLS

A public distribution shelf for installable agent skills; each skill is a seam under `skills/<identity>/`. Compact seam index: the exhaustive tier and coverage inventory lives in the harness-owned manifest `docs/manifest.md`, excluded from every orientation set.
## Seams

| Seam | Responsibility | Code root | Tests | Doc |
|---|---|---|---|---|
| document-for-agents | doc-cache lifecycle; cache accuracy, attention control, orientation budgets, diagnostics | skills/document-for-agents/ | `skills/document-for-agents/tests/` | docs/leaves/document-for-agents.md |
| document-for-humans | plain-language derived docs | skills/document-for-humans/ | `skills/document-for-humans/tests/` | docs/leaves/document-for-humans.md |
| unslopify | AI-tell detection, meaning-safe revision, always-on | skills/unslopify/ | `skills/unslopify/tests/` | docs/leaves/unslopify.md |
| plan-this | structured planning workflow; publishes spec and tickets | skills/plan-this/ | `skills/plan-this/tests/` | docs/leaves/plan-this.md |
| implement-this | implementation adapter; bounded ticket sets, Agent Manager workers, PR-only delivery | skills/implement-this/ | `skills/implement-this/tests/` | docs/leaves/implement-this.md |
| review-this | one review wave through merge, promotion, closure | skills/review-this/ | `skills/review-this/tests/` | docs/leaves/review-this.md |
| release-skills | universal release workflow; version-file detection | skills/release-skills/ | `skills/release-skills/tests/` | docs/leaves/release-skills.md |

New `skills/<identity>/` needs a row, leaf doc, matching `SKILL.md` name (check 3).## Non-seam docs

- REVIEW.md
- CONTEXT.md, README.md, docs/debt.md, reference/vendor-facts.md
- docs/agents/*, docs/manifest.md, docs/human/*
## Decisions

Accepted decisions in `docs/adr/` (incl. `docs/adr/0016-unslopify-always-on-output-contract.md`, `docs/adr/0018-opt-in-skill-diagnostics.md`); superseded set and tiers in `docs/manifest.md`.## Cross-cutting boundaries

- Registry lane only (ADR-0001); work docs in the tracker.
- Orientation: ordinary 6,000, API/route 9,000, schema/data 12,000, re-orientation 7,000, absolute 12,000; never block code inspection inside the affected seam (ADR-0017, ADR-0024).
- Coverage manifest harness-owned, absent from every orientation set (ADR-0024).
- Diagnostics opt-in, private (ADR-0018).
- Frontier session owns verdicts, merge, labels, promotion, closure (ADR-0022); workers retained until durable (ADR-0023).## Loading protocol

| Task | Read set | Budget (cap) |
|---|---|---|
| Any change | index → one leaf doc → glossary terms in use → linked accepted ADRs | 6,000 |
| API/route change | + linked route, security, testing policy | 9,000 |
| Schema/data change | + data doc, migrations policy, generated schema slice | 12,000 |
| Re-orient after compaction | index → task leaf doc (including Non-negotiables) → glossary | 7,000 |

Hard caps on orientation documents, resolved from affected seams, index, whole bounded leaves, leaf-named glossary entries, linked accepted ADRs; duplicates once; superseded ADRs excluded unless required; no set over 12,000 bytes. Leaf redirect targets never followed. Over-budget routes fail before broad loading. A missing fact is a cache gap — ask the owner for approval before widening the read set (ADR-0017, ADR-0024).## Checks

`./scripts/docs-check.sh` — eleven checks (incl. check 11 `Orientation budget`) plus scorecard. Freshness 30 days.
## Coverage

Every authored doc checked against disk via the manifest (check 1); `AGENTS.md` and this index excluded.