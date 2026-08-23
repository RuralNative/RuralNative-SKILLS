# Architecture — RuralNative-SKILLS

A public distribution shelf: a repository that publishes installable agent
skills. Each skill is a seam under `skills/<skill-identity>/`; the docs tree
under `docs/` caches what the code cannot express — decisions, vocabulary,
invariants, conventions. The repo runs the document-for-agents lifecycle on its
own docs.

## Seams

| Seam | Responsibility | Code root | Tests | Doc |
|---|---|---|---|---|
| document-for-agents | publishable agent instructions for the doc-cache lifecycle: cache accuracy, attention control, and the opt-in private skill diagnostics record | skills/document-for-agents/ | install smoke via `npx skills add`; identity == folder check; composition via `skills/document-for-agents/tests/` | docs/leaves/document-for-agents.md |
| document-for-humans | plain-language derived documentation for human stakeholders | skills/document-for-humans/ | gate extension via scripts/docs-check.sh; composition via `skills/document-for-humans/tests/` | docs/leaves/document-for-humans.md |
| unslopify | AI-tell detection and meaning-safe prose revision, always-on for agent-authored output once loaded | skills/unslopify/ | scanner contract via `skills/unslopify/scanner.py`; parity catalog via `skills/unslopify/reference/parity.md`; fixtures and composition via `skills/unslopify/tests/`; identity == folder check | docs/leaves/unslopify.md |
| plan-this | fixed-template planning adapter that applies the planning prefix and delegates to `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/unslop` | skills/plan-this/ | composition via `skills/plan-this/tests/`; identity == folder check | docs/leaves/plan-this.md |
| implement-this | fixed-template implementation adapter that applies the implementation prefix and delegates to `/implement` and `/unslopify`, dispatching bounded ticket sets to isolated workers with pull-request-only delivery | skills/implement-this/ | composition and worker-adapter tests via `skills/implement-this/tests/`; identity == folder check | docs/leaves/implement-this.md |
| review-this | owns one pull-request review wave through merge, promotion, and parent closure; reconciles Kilo cloud review with the local Standards and Spec review against each current head and delegates to `/code-review` and `/unslopify` | skills/review-this/ | composition, discovery, reconciliation, and adapter tests via `skills/review-this/tests/`; identity == folder check | docs/leaves/review-this.md |
| release-skills | universal release workflow that auto-detects version files and changelogs | skills/release-skills/ | composition via `skills/release-skills/tests/`; identity == folder check | docs/leaves/release-skills.md |

A new directory under `skills/` is a new seam: it needs a row here, a leaf
doc, and a `SKILL.md` whose frontmatter `name` matches its folder (harness
check 3).

Repo-level contract tests that check published artifacts rather than a
skill's own seam live in `tests/` at the repository root, outside the seam
scan; `tests/readme-contract.test.ts` pins the README contract for #107.

## Non-seam docs

Covered docs that are not seams — the seam table's counterpart, parsed by
harness check 6. A covered doc must be in the seam table or listed here:

- CONTEXT.md
- REVIEW.md
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

Retired ADRs. Their numbers are never reused; each carries a superseded status
banner pointing at its successor. Listed here so coverage stays complete
without the index referencing them as current:

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
- Attention is bounded: loading budgets are caps on orientation documents,
  `AGENTS.md` opens with the five-command contract, and invariant collisions
  stop for a decision. See ADR-0017.
- Skill diagnostics stay opt-in: consent-gated, private, sanitized, outside
  every read set, and never guidance; the management marker carries provenance.
  See ADR-0018.
- Known shortcuts and unfinished pieces are tracked in the debt registry. See `docs/debt.md`.
- Review scope, severity, trust, verification, and subagent rules live in
  `REVIEW.md`; cloud review reads it from the pull-request base branch.
- Workflow stages run in user-created command sessions; there is no supervisor
  or coordinator, and unsupported Kilo worktree closure is reported as
  `cleanup-pending` instead of improvised. See ADR-0019.

## Coverage

Every authored doc, machine-checked against disk by `scripts/docs-check.sh`
(harness check 1). The indexes `AGENTS.md` and this file are what the check is
parsed from, so they are not listed here.

| File | Tier |
|---|---|
| CONTEXT.md | glossary |
| README.md | pointer |
| REVIEW.md | policy |
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

The budgets are hard caps on orientation documents, not guidance to trim later; they
never block code inspection inside the affected seam. A missing unrecoverable fact
becomes a named cache gap: record it in the issue tracker, ask the
owner for approval before opening more documentation, and do not widen the read set until approval (ADR-0017).

## Checks

- `./scripts/docs-check.sh` — the coherence gate enforcing the ten checks of
  `skills/document-for-agents/reference/harness.md`, plus a scorecard
  reporting per-seam invariants and debt counts. Run it before finishing; a
  red harness is a work item, not a warning.
- Freshness threshold: 30 days — generated docs older than this fail check 7.
- Human-docs extension: read-set absence, link direction, derived freshness for docs/human/ (spec #28; dormant until the tree exists).
- The harness is tooling and is exempt from demanding its own doc.
