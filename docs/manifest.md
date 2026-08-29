# Doc-Cache Manifest

The harness owns this file: it is the exhaustive tier and coverage inventory
for this repository, machine-checked against disk by harness check 1. It is
**excluded from every orientation set** — no loading-protocol row routes
agents into it, and the runtime orientation resolver never adds it to a
resolved set (ADR-0024). `AGENTS.md` and the compact index `ARCHITECTURE.md`
are excluded from the listing itself.

## Orientation routes

Declared canonical orientation routes the harness budget-checks (check 11). A
route row is `| band | affected seams |`; seams resolve through the compact
index exactly as a ticket's affected seams do. A route is declared only when
its whole-leaf, index, glossary, and linked-decision bytes fit the band's cap.
No routes are declared yet: this repository's own leaves still exceed their
caps and migrate to the bounded contract ticket by ticket, tracked by DEBT-9.

| Band | Affected seams |
|---|---|

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
| docs/debt.md | debt |
| docs/human/overview.md | human |
| docs/human/decision-journal.md | human |
| docs/human/guardrails.md | human |
| docs/human/data-flow.md | human |
| docs/manifest.md | manifest |