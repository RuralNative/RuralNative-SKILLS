# Architecture — RuralNative-SKILLS

A public distribution shelf for installable agent skills. Each skill is a seam
under `skills/<skill-identity>/`; the docs tree caches decisions, vocabulary,
invariants, and conventions that code cannot express.

## Seams

| Seam | Responsibility | Code root | Tests | Doc |
|---|---|---|---|---|
| document-for-agents | publishable agent instructions for the doc-cache lifecycle: cache accuracy, attention control, and the opt-in private skill diagnostics record | skills/document-for-agents/ | install smoke via `npx skills add`; identity == folder check; composition via `skills/document-for-agents/tests/` | docs/leaves/document-for-agents.md |
| document-for-humans | plain-language derived documentation for human stakeholders | skills/document-for-humans/ | gate extension via scripts/docs-check.sh; composition via `skills/document-for-humans/tests/` | docs/leaves/document-for-humans.md |
| unslopify | AI-tell detection and meaning-safe prose revision, always-on for agent-authored output once loaded | skills/unslopify/ | scanner contract via `skills/unslopify/scanner.py`; parity catalog via `skills/unslopify/reference/parity.md`; fixtures and composition via `skills/unslopify/tests/`; identity == folder check | docs/leaves/unslopify.md |
| plan-this | fixed-template planning adapter that applies the planning prefix and delegates to `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/unslop` | skills/plan-this/ | composition via `skills/plan-this/tests/`; identity == folder check | docs/leaves/plan-this.md |
| implement-this | fixed-template implementation adapter that applies the implementation prefix and delegates to `/implement` and `/unslopify`, dispatching bounded ticket sets through real Agent Manager workers with pull-request-only delivery | skills/implement-this/ | composition and command-session tests via `skills/implement-this/tests/`; identity == folder check | docs/leaves/implement-this.md |
| review-this | owns one pull-request review wave through merge, promotion, and parent closure; resolves invocation targets from parent issues, child issues, pull requests, and URLs; reconciles Kilo cloud review with the local Standards and Spec review against each current head and delegates to `/code-review` and `/unslopify` | skills/review-this/ | composition, discovery, target-resolution, reconciliation, and adapter tests via `skills/review-this/tests/`; identity == folder check | docs/leaves/review-this.md |
| release-skills | universal release workflow that auto-detects version files and changelogs | skills/release-skills/ | composition via `skills/release-skills/tests/`; identity == folder check | docs/leaves/release-skills.md |

A new `skills/<skill-identity>/` directory needs a row, leaf doc, and matching
`SKILL.md` name (harness check 3). Root `tests/` holds published-artifact tests
outside the seam scan; `tests/readme-contract.test.ts` pins README for #107.

## Non-seam docs

Covered non-seam docs are listed here; harness check 6 uses this list.

- CONTEXT.md
- REVIEW.md
- reference/vendor-facts.md
- docs/debt.md
- README.md
- docs/agents/domain.md
- docs/agents/issue-tracker.md
- docs/agents/triage-labels.md
- docs/adr/0001-distribute-as-public-catalog-shelf.md
- docs/adr/0002-adopt-ten-check-gate.md
- docs/adr/0003-human-first-derived-artifacts.md
- docs/adr/0004-verb-named-skills-flat-shelf.md
- docs/adr/0005-unslopify-utility-identity-and-hard-dependency.md
- docs/adr/0006-plan-this-fixed-template-adapter.md
- docs/adr/0011-retire-supervise-this.md
- docs/adr/0014-three-skill-development-workflow.md
- docs/adr/0015-requirements-data-trust-and-install-provenance.md
- docs/adr/0016-unslopify-always-on-output-contract.md
- docs/adr/0017-doc-cache-attention-boundary.md
- docs/adr/0018-opt-in-skill-diagnostics.md
- docs/adr/0019-command-session-lifecycle-and-platform-limits.md
- docs/leaves/document-for-humans.md
- docs/human/overview.md
- docs/human/decision-journal.md
- docs/human/guardrails.md
- docs/human/data-flow.md

## Superseded decisions

Retired ADRs stay listed for complete coverage; their numbers are never reused.

| ADR | Superseded by |
|---|---|
| docs/adr/0007-supervise-this-coordinator.md | docs/adr/0011-retire-supervise-this.md |
| docs/adr/0008-supervise-this-agent-orchestrator.md | docs/adr/0011-retire-supervise-this.md |
| docs/adr/0009-delegation-invariants-human-invocation.md | docs/adr/0014-three-skill-development-workflow.md |
| docs/adr/0010-supervise-by-delivery-evidence.md | docs/adr/0011-retire-supervise-this.md |
| docs/adr/0012-manager-worktree-pull-request-delivery.md | docs/adr/0014-three-skill-development-workflow.md |
| docs/adr/0013-review-this-decoupled-code-review.md | docs/adr/0014-three-skill-development-workflow.md |

## Cross-cutting boundaries

- Distribution is the registry lane only — no npm packaging. See ADR-0001.
- Work docs (plans, audits) live in the issue tracker, never the repo. See `docs/agents/issue-tracker.md`.
- Glossary vocabulary is binding; forbidden synonyms are listed. See `CONTEXT.md`.
- Attention is bounded: loading budgets are hard caps on orientation documents,
  and code inspection inside the affected seam is never blocked. See ADR-0017.
- Skill diagnostics stay opt-in, private, sanitized, outside every read set,
  and never guidance; the management marker carries provenance. See ADR-0018.
- Known shortcuts and unfinished pieces are tracked in the debt registry. See `docs/debt.md`.
- Review scope, severity, trust, verification, and subagent rules live in
  `REVIEW.md`; cloud review reads it from the pull-request base branch.
- Accepted target in ADR-0019: user-created command sessions run workflow stages
  independently, and unsupported Kilo worktree closure reports
  `cleanup-pending`. Behavior tickets #154, #155, and #156 are shipped; #157
  and #158 remain pending, so their seam leaves retain current shipped behavior
  until those tickets merge.

## Coverage

Every authored doc is machine-checked against disk by `scripts/docs-check.sh`
(check 1); `AGENTS.md` and this parsed index are excluded.

| File | Tier |
|---|---|
| CONTEXT.md | glossary |
| README.md | pointer |
| REVIEW.md | policy |
| reference/vendor-facts.md | vendor-facts |
| docs/agents/domain.md | pointer |
| docs/agents/issue-tracker.md | pointer |
| docs/agents/triage-labels.md | pointer |
| docs/adr/0001-distribute-as-public-catalog-shelf.md | decision |
| docs/adr/0002-adopt-ten-check-gate.md | decision |
| docs/adr/0003-human-first-derived-artifacts.md | decision |
| docs/adr/0004-verb-named-skills-flat-shelf.md | decision |
| docs/adr/0005-unslopify-utility-identity-and-hard-dependency.md | decision |
| docs/adr/0006-plan-this-fixed-template-adapter.md | decision |
| docs/adr/0007-supervise-this-coordinator.md | decision (superseded by 0011) |
| docs/adr/0008-supervise-this-agent-orchestrator.md | decision (superseded by 0011) |
| docs/adr/0009-delegation-invariants-human-invocation.md | decision (superseded by 0014) |
| docs/adr/0010-supervise-by-delivery-evidence.md | decision (superseded by 0011) |
| docs/adr/0011-retire-supervise-this.md | decision |
| docs/adr/0012-manager-worktree-pull-request-delivery.md | decision (superseded by 0014) |
| docs/adr/0013-review-this-decoupled-code-review.md | decision (superseded by 0014) |
| docs/adr/0014-three-skill-development-workflow.md | decision |
| docs/adr/0015-requirements-data-trust-and-install-provenance.md | decision |
| docs/adr/0016-unslopify-always-on-output-contract.md | decision |
| docs/adr/0017-doc-cache-attention-boundary.md | decision |
| docs/adr/0018-opt-in-skill-diagnostics.md | decision |
| docs/adr/0019-command-session-lifecycle-and-platform-limits.md | decision |
| docs/leaves/document-for-agents.md | leaf |
| docs/leaves/document-for-humans.md | leaf |
| docs/leaves/unslopify.md | leaf |
| docs/leaves/plan-this.md | leaf |
| docs/leaves/implement-this.md | leaf |
| docs/leaves/review-this.md | leaf |
| docs/leaves/release-skills.md | leaf |
| docs/debt.md | debt |
| docs/human/overview.md | human |
| docs/human/decision-journal.md | human |
| docs/human/guardrails.md | human |
| docs/human/data-flow.md | human |

## Loading protocol

| Task | Read set | Budget (cap) |
|---|---|---|
| Any change | AGENTS.md → ARCHITECTURE.md → the seam's leaf doc → glossary | small |
| Re-orient after compaction | ARCHITECTURE.md → task leaf doc → glossary | one small fixed read |

Budgets are hard caps on orientation documents, and they never block code
inspection inside the affected seam. A missing fact becomes a named cache gap
recorded in the issue tracker; owner approval is required before widening the
documentation read set (ADR-0017).

## Checks

- `./scripts/docs-check.sh` — the coherence gate enforcing ten checks from
  `skills/document-for-agents/reference/harness.md`, plus a seam-invariant and
  debt scorecard. Run it before finishing; a red harness is a work item.
- Freshness threshold: 30 days — generated docs older than this fail check 7.
- Human-docs extension: read-set absence, link direction, derived freshness for docs/human/ (spec #28; dormant until the tree exists).
- The harness is tooling and is exempt from demanding its own doc.
