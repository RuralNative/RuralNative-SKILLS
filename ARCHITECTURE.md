# Architecture — RuralNative-SKILLS

A public shelf of installable agent skills; each is a seam under `skills/<identity>/`. Compact index; the exhaustive tier and coverage inventory lives in the manifest `docs/manifest.md`, excluded from every orientation set.
Documentation tier: full
## Seams

| Seam | Responsibility | Code root | Tests | Doc |
|---|---|---|---|---|
| document-for-agents | doc-cache lifecycle; accuracy, attention, relevant sources, tier, coherence, diagnostics | skills/document-for-agents/ | `skills/document-for-agents/tests/` | docs/leaves/document-for-agents.md |
| document-for-humans | plain-language derived docs | skills/document-for-humans/ | `skills/document-for-humans/tests/` | docs/leaves/document-for-humans.md |
| unslopify | AI-tell detection, meaning-safe revision, always-on | skills/unslopify/ | `skills/unslopify/tests/` | docs/leaves/unslopify.md |
| plan-this | planning workflow; publishes spec and tickets | skills/plan-this/ | `skills/plan-this/tests/` | docs/leaves/plan-this.md |
| implement-this | implementation adapter; one ticket in the current checkout, PR-only delivery | skills/implement-this/ | `skills/implement-this/tests/` | docs/leaves/implement-this.md |
| review-this | one pull-request review in the current checkout with automatic clean-checkout alignment, publication-only findings, validated handoff, and optional review policy | skills/review-this/ | `skills/review-this/tests/` | docs/leaves/review-this.md |
| fix-this | final stage for one reviewed pull request: findings, conflicts, local verification, squash merge, bookkeeping | skills/fix-this/ | `skills/fix-this/tests/` | docs/leaves/fix-this.md |
| release-skills | universal release workflow; version-file detection | skills/release-skills/ | `skills/release-skills/tests/` | docs/leaves/release-skills.md |

New `skills/<identity>/` needs a row, leaf doc, matching `SKILL.md` name (check 3).## Non-seam docs

- REVIEW.md
- CONTEXT.md, README.md, docs/debt.md, reference/vendor-facts.md
- docs/agents/*, docs/manifest.md, docs/human/*
## Decisions

Accepted decisions in `docs/adr/` (incl. `docs/adr/0016-unslopify-always-on-output-contract.md`, `docs/adr/0018-opt-in-skill-diagnostics.md`, `docs/adr/0028-adaptive-doc-cache-governance.md`, `docs/adr/0029-unslopify-session-start-and-plain-language-live-output.md`, `docs/adr/0031-single-target-production-workflows.md`, `docs/adr/0032-remove-document-size-gates.md`, `docs/adr/0033-review-only-with-policy-bootstrap.md`, `docs/adr/0034-self-contained-handoffs-and-optional-review-policy.md`, `docs/adr/0035-fix-this-final-stage.md`, `docs/adr/0036-review-checkout-auto-alignment.md`, `docs/adr/0037-standardized-criteria-and-adapted-intake.md`); superseded set and tiers in `docs/manifest.md`.## Cross-cutting boundaries

- Orientation: task bands select relevant source categories; length alone never decides validity and never requires approval by itself; read relevant authoritative sources incrementally as the task requires; never block code inspection inside the affected seam; a missing fact is a cache gap — record it without inventing it, and ask the owner before changing source authority, expanding scope, or taking substantive or protected actions (ADR-0017, ADR-0024, ADR-0032).
- Tier promotes automatically and additively, never auto-demote; seam coherence fails a stale fingerprint, dirty or clean; manifest, fingerprints, and private consent state stay out of every orientation set (ADR-0024, ADR-0028).
- Frontier session owns review publication (ADR-0033); implementation owns its ticket delivery and review never merges, labels, promotes, or closes; `fix-this` owns post-review finalization (ADR-0035); one ticket or pull request runs in the current checkout with no workers.## Loading protocol

| Task | Read set |
|---|---|
| Any change | index → one leaf → required glossary → required decisions |
| API/route change | + required route, security, testing policy |
| Schema/data change | + required data doc, migrations policy, generated slice |
| Re-orient after compaction | index → task leaf (Non-negotiables) → required glossary |

## Checks

`./scripts/docs-check.sh` — eleven checks (check 2 `Seam coherence`, check 11 `Orientation routes`) plus scorecard. Freshness 30 days.
## Coverage

Every authored doc checked against disk via the manifest (check 1); `AGENTS.md` and this index excluded.
