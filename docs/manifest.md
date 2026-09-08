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

Declared canonical orientation routes the harness validity-checks (check 11). A
route row is `| band | affected seams |`; seams resolve through the compact
index exactly as a ticket's affected seams do.
Each seam is declared as its own route so a task's resolved set stays
independently described; length alone never fails a route.

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

## Governance

Declared tier (mirrored in `ARCHITECTURE.md`): `full`. Tier evidence: durable
decisions recorded through ADR-0028; multi-agent coordination across managed
worktrees; a harness-generated scorecard; and per-seam coherence fingerprints
armed at the standard tier. Promotion is monotonic and additive (ADR-0028).

## Seam verification

Harness check 2 recomputes each documented seam's code fingerprint (a canonical
SHA-256 over the seam's VCS-visible code root) and fails while the stored digest
is stale, in a dirty worktree or a clean CI checkout alike. A refresh is valid
only after Maintain reviews the seam's affected claims against current code
(ADR-0028). The code root resolves from the compact index seam table.

| Seam | Code root | Fingerprint | Verified | Claims |
|---|---|---|---|---|
| document-for-agents | skills/document-for-agents/ | sha256:7b7fa5f82fe7cb8d4e2363e068b26cf170d92b647c9d671d748f1813bd7e890b | 2026-09-08 | ADR-0032: incremental relevant reading without size approval, completeness-shaped index, diagnostic ~23 review trigger, and per-declaration route coverage; ADR-0033: review-policy expectations are review-only with no fix agent; claims reviewed against current code |
| document-for-humans | skills/document-for-humans/ | sha256:e9dfe40378239f2c7abfea2af310324c94e9d3037883de2c7f8ed613f47b6441 | 2026-09-07 | ADR-0032: template quotas and jargon-per-paragraph quotas removed; explained terminology and completeness preserved; claims reviewed against current code |
| unslopify | skills/unslopify/ | sha256:fbac22ce1a239117f675b9f7eda7c93981579782c35b08d570abf67e1f86523e | 2026-09-07 | ADR-0032: managed AGENTS.md fixture follows the relevant-sources command; claims reviewed against current code |
| plan-this | skills/plan-this/ | sha256:26a80d0b9a87bf88370c0d4ee55d1dece235376e5e6a18ae0a14934591ac8d5f | 2026-09-08 | ADR-0034: canonical bodies reject unsupported lines before pinning; shared handoff survives parsing into evidence and review; claims reviewed against current code |
| implement-this | skills/implement-this/ | sha256:2dfff8465cfdc9175c6c83f77cb932ef3a107d4024296e6d42ccb67b99127128 | 2026-09-08 | ADR-0034: self-contained stage with proof validation, commit, final head-bound envelope, ordered push/read-back delivery; repair on one verified PR; fenced examples and valid associations preserved; claims reviewed against current code |
| review-this | skills/review-this/ | sha256:9dc3b55b2c7e7c1106690f80a3204b629c6feaa4d413ac4d650cb013fe7c320a | 2026-09-08 | ADR-0034: optional REVIEW.md with base authority and skill-owned defaults, no draft creation; shared evidence validator required for readiness plus effective-policy revision; claims reviewed against current code |
| release-skills | skills/release-skills/ | sha256:2d89e68b76ac58448a26c1c9b1cd09bb91259380595b8a1790a38607861665c0 | 2026-09-02 | release workflow prose reviewed against code |

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
| docs/adr/0025-required-orientation-sources.md | decision |
| docs/adr/0026-unslopify-silent-publication.md | decision |
| docs/adr/0027-plan-this-ask-when-a-human-must-decide.md | decision |
| docs/adr/0028-adaptive-doc-cache-governance.md | decision |
| docs/adr/0029-unslopify-session-start-and-plain-language-live-output.md | decision |
| docs/adr/0030-larger-orientation-ceilings.md | decision |
| docs/adr/0031-single-target-production-workflows.md | decision |
| docs/adr/0032-remove-document-size-gates.md | decision |
| docs/adr/0033-review-only-with-policy-bootstrap.md | decision |
| docs/adr/0034-self-contained-handoffs-and-optional-review-policy.md | decision |
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
