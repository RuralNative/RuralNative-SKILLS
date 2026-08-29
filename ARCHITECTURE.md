# Architecture — RuralNative-SKILLS

A public distribution shelf for installable agent skills. Each skill is a seam
under `skills/<skill-identity>/`; the docs tree caches decisions, vocabulary,
invariants, and conventions that code cannot express. This index is a compact
seam index: the exhaustive tier and coverage inventory lives in the
harness-owned coverage manifest `docs/manifest.md`, excluded from every
orientation set.

## Seams

| Seam | Responsibility | Code root | Tests | Doc |
|---|---|---|---|---|
| document-for-agents | publishable agent instructions for the doc-cache lifecycle: cache accuracy, attention control, runtime orientation budgets, and the opt-in private skill diagnostics record | skills/document-for-agents/ | install smoke via `npx skills add`; identity == folder check; composition via `skills/document-for-agents/tests/` | docs/leaves/document-for-agents.md |
| document-for-humans | plain-language derived documentation for human stakeholders | skills/document-for-humans/ | gate extension via scripts/docs-check.sh; composition via `skills/document-for-humans/tests/` | docs/leaves/document-for-humans.md |
| unslopify | AI-tell detection and meaning-safe prose revision, always-on for agent-authored output once loaded | skills/unslopify/ | scanner contract via `skills/unslopify/scanner.py`; parity catalog via `skills/unslopify/reference/parity.md`; fixtures and composition via `skills/unslopify/tests/`; identity == folder check | docs/leaves/unslopify.md |
| plan-this | structured planning workflow that defines and confirms intent, optionally explores directions, resolves the decision frontier, and publishes an approved GitHub specification and coherent tickets through `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/unslopify` | skills/plan-this/ | composition via `skills/plan-this/tests/`; identity == folder check | docs/leaves/plan-this.md |
| implement-this | fixed-template implementation adapter that applies the implementation prefix and delegates to `/implement` and `/unslopify`, dispatching bounded ticket sets through real Agent Manager workers with pull-request-only delivery | skills/implement-this/ | composition and command-session tests via `skills/implement-this/tests/`; identity == folder check | docs/leaves/implement-this.md |
| review-this | owns one pull-request review wave through merge, promotion, and parent closure; resolves invocation targets from parent issues, child issues, pull requests, and URLs; reconciles Kilo cloud review with the local Standards and Spec review against each current head, routes the frontier-owned authority split and mutation-worker model selection, and delegates to `/code-review` and `/unslopify` | skills/review-this/ | composition, discovery, target-resolution, reconciliation, review-authority, and adapter tests via `skills/review-this/tests/`; identity == folder check | docs/leaves/review-this.md |
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
- docs/adr/0020-plan-this-structured-workflow.md
- docs/adr/0021-implement-this-worker-evidence-contract.md
- docs/adr/0022-frontier-review-authority-and-mutation-worker-routing.md
- docs/adr/0023-retain-workers-until-durable.md
- docs/adr/0024-bounded-orientation.md
- docs/leaves/document-for-humans.md
- docs/manifest.md
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
- Attention is bounded: orientation sets are resolved at runtime and capped in
  UTF-8 bytes — ordinary 6,000, API/route 9,000, schema/data 12,000,
  re-orientation 7,000, absolute 12,000 — while code inspection inside the
  affected seam is never blocked. The exact-ten-check clause yields to the
  superseding budget decision. See ADR-0017, ADR-0024.
- Coverage inventory is harness-owned: the exhaustive tier table lives in
  `docs/manifest.md` and is excluded from every orientation set; this index
  stays compact. `ARCHITECTURE.md` and `AGENTS.md` are excluded from the
  manifest's coverage listing. See ADR-0024.
- Skill diagnostics stay opt-in, private, sanitized, outside every read set,
  and never guidance; the management marker carries provenance. See ADR-0018.
- Known shortcuts and unfinished pieces are tracked in the debt registry. See `docs/debt.md`.
- Review scope, severity, trust, verification, and subagent rules live in
  `REVIEW.md`; cloud review reads it from the pull-request base branch.
- Review authority splits at the frontier command session: it owns verdicts,
  merge, labels, promotion, and closure, while one live-catalog execution
  model drives every new persistent PR mutation worker, which may mutate and
  fast-forward push only inside its worktree. See ADR-0022.
- Workers are retained until delivery is durable: stop and removal are
  separate decisions, only the command session cleans up, and cleanup requires
  a terminal state, a clean worktree, and exact local/remote/PR head equality.
  See ADR-0023.
- Accepted target in ADR-0019: user-created command sessions run workflow stages
  independently, and unsupported Kilo worktree closure reports
  `cleanup-pending`. Behavior tickets #154, #155, #156, #157, and #158 are
   shipped; review fixes and delta rereviews stay in one persistent PR worktree.

## Loading protocol

| Task | Read set | Budget (cap) |
|---|---|---|
| Any change | index → one leaf doc → glossary terms in use → linked accepted ADRs | 6,000 bytes |
| API/route change | + linked route, security, testing policy | 9,000 bytes |
| Schema/data change | + data doc, migrations policy, generated schema slice | 12,000 bytes |
| Re-orient after compaction | index → task leaf doc → glossary | 7,000 bytes |

Budgets are hard caps on orientation documents, resolved at runtime from
affected seams, the index, whole bounded leaves, leaf-named glossary entries,
and linked accepted ADRs or policies; duplicate sources count once, superseded
ADRs stay out of current guidance unless a leaf explicitly requires them, and
no set exceeds 12,000 bytes. Over-budget routes fail before broad loading and
report band, resolved bytes, cap, source count, and exact sources. They never
block code inspection inside the affected seam. A missing fact becomes a named
cache gap recorded in the issue tracker; cache-gap approval may substitute or
narrow sources but can never waive a cap. Ask the owner for approval before
widening the documentation read set (ADR-0017, ADR-0024).

## Checks

- `./scripts/docs-check.sh` — the coherence gate enforcing eleven checks from
  `skills/document-for-agents/reference/harness.md`, including check 11
  `Orientation budget`, plus a seam-invariant and debt scorecard. Run it
  before finishing; a red harness is a work item.
- Freshness threshold: 30 days — generated docs older than this fail check 7.
- Human-docs extension: read-set absence, link direction, derived freshness for docs/human/ (spec #28; dormant until the tree exists).
- The harness is tooling and is exempt from demanding its own doc.

## Coverage

Every authored doc is checked against disk by the harness (check 1) through
the coverage table in `docs/manifest.md`; `AGENTS.md` and this compact index
are excluded. The manifest is harness-owned and excluded from every normal
orientation set.