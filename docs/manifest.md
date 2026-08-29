# Doc-Cache Manifest

The harness owns this file: it is the exhaustive tier and coverage inventory
for this repository, machine-checked against disk by harness check 1. It is
**excluded from every orientation set** — no loading-protocol row routes
agents into it, and the runtime orientation resolver never adds it to a
resolved set (ADR-0024). `AGENTS.md` and the compact index `ARCHITECTURE.md`
are excluded from the listing itself. The `redirect` tier covers the
leaf-adjacent extended detail files that the orientation resolver never
follows (ADR-0024, `## Redirect`).

## Orientation routes

Declared canonical orientation routes the harness budget-checks (check 11). A
route row is `| band | affected seams |`; seams resolve through the compact
index exactly as a ticket's affected seams do. A route is declared only when
its whole-leaf, index, glossary, and linked-decision bytes fit the band's cap.
Each seam is declared as its own route so a task's resolved set stays
independently bounded; every seam fits every band at its strict cap.

| Band | Affected seams |
|---|---|
| ordinary | document-for-agents |
| ordinary | document-for-humans |
| ordinary | unslopify |
| ordinary | plan-this |
| ordinary | implement-this |
| ordinary | review-this |
| ordinary | release-skills |
| api-route | document-for-agents |
| api-route | document-for-humans |
| api-route | unslopify |
| api-route | plan-this |
| api-route | implement-this |
| api-route | review-this |
| api-route | release-skills |
| schema-data | document-for-agents |
| schema-data | document-for-humans |
| schema-data | unslopify |
| schema-data | plan-this |
| schema-data | implement-this |
| schema-data | review-this |
| schema-data | release-skills |
| re-orientation | document-for-agents |
| re-orientation | document-for-humans |
| re-orientation | unslopify |
| re-orientation | plan-this |
| re-orientation | implement-this |
| re-orientation | review-this |
| re-orientation | release-skills |

## Coverage

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
| docs/adr/0020-plan-this-structured-workflow.md | decision |
| docs/adr/0021-implement-this-worker-evidence-contract.md | decision |
| docs/adr/0022-frontier-review-authority-and-mutation-worker-routing.md | decision |
| docs/adr/0023-retain-workers-until-durable.md | decision |
| docs/adr/0024-bounded-orientation.md | decision |
| docs/leaves/document-for-agents.md | leaf |
| docs/leaves/document-for-humans.md | leaf |
| docs/leaves/unslopify.md | leaf |
| docs/leaves/plan-this.md | leaf |
| docs/leaves/implement-this.md | leaf |
| docs/leaves/review-this.md | leaf |
| docs/leaves/release-skills.md | leaf |
| docs/leaves/ext/document-for-agents.md | redirect |
| docs/leaves/ext/document-for-humans.md | redirect |
| docs/leaves/ext/unslopify.md | redirect |
| docs/leaves/ext/plan-this.md | redirect |
| docs/leaves/ext/implement-this.md | redirect |
| docs/leaves/ext/review-this.md | redirect |
| docs/leaves/ext/release-skills.md | redirect |
| docs/debt.md | debt |
| docs/human/overview.md | human |
| docs/human/decision-journal.md | human |
| docs/human/guardrails.md | human |
| docs/human/data-flow.md | human |
| docs/manifest.md | manifest |