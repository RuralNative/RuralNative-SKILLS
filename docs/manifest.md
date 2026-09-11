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
| ordinary | fix-this |
| ordinary | release-skills |
| api-route | document-for-agents |
| api-route | document-for-humans |
| api-route | unslopify |
| api-route | plan-this |
| api-route | implement-this |
| api-route | review-this |
| api-route | fix-this |
| api-route | release-skills |
| schema-data | document-for-agents |
| schema-data | document-for-humans |
| schema-data | unslopify |
| schema-data | plan-this |
| schema-data | implement-this |
| schema-data | review-this |
| schema-data | fix-this |
| schema-data | release-skills |
| re-orientation | document-for-agents |
| re-orientation | document-for-humans |
| re-orientation | unslopify |
| re-orientation | plan-this |
| re-orientation | implement-this |
| re-orientation | review-this |
| re-orientation | fix-this |
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
| document-for-agents | skills/document-for-agents/ | sha256:cb18324984130da07adf082a0e37f4d6513a6751f0a0149a255d24d76129797f | 2026-09-11 | ADR-0032: incremental relevant reading without size approval, completeness-shaped index, diagnostic ~23 review trigger, and per-declaration route coverage; ADR-0033: review-policy expectations are review-only with no fix agent; claims reviewed against current code; owner-approved root REVIEW.md removal: repository tests require skill defaults and no policy links, adopter policy fixtures retained; root AGENTS.md tests check the owner's narrower durable documentation policy |
| document-for-humans | skills/document-for-humans/ | sha256:e9dfe40378239f2c7abfea2af310324c94e9d3037883de2c7f8ed613f47b6441 | 2026-09-07 | ADR-0032: template quotas and jargon-per-paragraph quotas removed; explained terminology and completeness preserved; claims reviewed against current code |
| unslopify | skills/unslopify/ | sha256:fbac22ce1a239117f675b9f7eda7c93981579782c35b08d570abf67e1f86523e | 2026-09-07 | ADR-0032: managed AGENTS.md fixture follows the relevant-sources command; claims reviewed against current code |
| plan-this | skills/plan-this/ | sha256:d64be010e31447d5b2fa3f8d7c93cb8664c57deebde9ad974ba9b1ba477291f1 | 2026-09-10 | bounded-review pass: the planning/requirements checks exit 2 with JSON on missing or wrong-type required input and reject unsupported input schema versions ; ADR-0037: standardized `- [ ] AC-N` checkbox criteria and adapted alternate-template intake via `resolveRequirementsBody` with `requirements-adapted-v1`; ADR-0035: shared core gains review-handoff-v1, fix eligibility, and fix progress; ADR-0038: literal canonical bodies in `reference/canonical-bodies.md`, the bundled `workflow-cli.mjs planning` gate before approval, and read-back of bodies, native links, and the blocker graph before readiness labels; ADR-0039: shared core gains single-line review-policy-v1 carrier, review evidence recovery, reversible repair records, fence-aware closing guard with CRLF preservation, and handoff-block policy versioning; ADR-0040: native issue/sub-issue/blocked_by reads through github-facts.mjs with complete-empty distinguished from unknown; claims reviewed against current code; shared core repair helpers: precise pin-presence, multi-line RED, declared-behavior detection, and repair-record composition plus byte-preserving single-region replacement for review preparation |
| implement-this | skills/implement-this/ | sha256:a58622bd82ee050020fd70a0a590b5ab0c2140384d6dbd72b2f8dcb2397dc258 | 2026-09-11 | bounded-review pass: evidence and review claims require recorded execution receipts plus the observed project configuration; same-version pin inequality is a revision mismatch with unproven cause unless separate evidence proves the body changed ; ADR-0037: adapted intake with whole-body fingerprint preserving blank structure and shared pin validation; ADR-0035: shared core gains review-handoff-v1, fix eligibility, and fix progress; implement-this completion routes to review-this then fix-this; ADR-0038: `requirementsRevision` throws a typed resolution error so no pin is emitted for unresolved bodies, repaired delivery repins only after `classifyRequirementsPin`/`decideRepairRevalidation`, and delivery read-back runs the consumer’s bundled `workflow-cli.mjs evidence` check against the resolved active ticket criteria; ADR-0039: shared core gains review-policy-v1, reversible evidence-repair, fence-aware closing guard with CRLF preservation, and handoff-block policy versioning (implementation repair stays narrow); ADR-0040: required pinned default branch with native closing identity and github-facts reads; claims reviewed against current code; shared core repair helpers: precise pin-presence, multi-line RED, declared-behavior detection, and repair-record composition plus byte-preserving single-region replacement for review preparation; intake reads ticket parent and incoming blockers, with optional child enumeration on the specification only; same-session continuation recovers original human authorization and reconciles recorded edits without treating handoffs as permission |
| review-this | skills/review-this/ | sha256:82506a2772c7c2eee981266a78b3e404554c4a857a7c75766224cb0384bd951d | 2026-09-11 | bounded-review pass: pending reviews are created without an event and submitted through the native events endpoint with COMMENTED/APPROVED/CHANGES_REQUESTED read-back states; a lost create response adopts exactly one pending review by discovery; publication succeeds only after full read-back provenance validation ; ADR-0037: recomputed canonical/adapted requirements revision with resolution errors stopping review; ADR-0036: clean-checkout alignment to the pinned PR head in detached HEAD with unfinished-operation, ignored-collision, and post-checkout verification as final gates; publication carries validated review-handoff-v1 and directs to fix-this; ADR-0038: one bounded publication through the review-only preparation helper (pending review at the pinned commit, native identity capture, submit, read-back, one automatic resume, auth-denied as restriction) with independent provenance validation and the read-only `workflow-cli.mjs review` check reading policy version from the handoff block; ADR-0039: bounded automatic recovery via `prepare-review.mjs` with frozen-boundary validation, full observation payloads, real policy/evidence/verify operations, review-specific evidence recovery with reversible repair records, fence-aware closing guard with CRLF preservation, source-backed policy with exact-granularity owner exceptions, single-line review-policy-v1 carrier, frozen installs, compatible runtimes, and one-resume publication; tracked least-privilege agent in `.kilo/kilo.jsonc` with installation-bound helpers and effective-deny evaluation; complete install parity in `install-check.mjs`; ADR-0040: exact-marker drafts binding base and content, typed inline payloads, slurp pagination with strict completeness, duplicate reuse, and independent permission; claims reviewed against current code; ADR-0039 repair completion: observation-based `recover-evidence` is the sole scoped writer with read-only `repair-record`; shared native readers give complete bodies and positive head-repository identity; checks established from the pinned configuration cover the observed `requiredCommands` intent and every active criterion with complete receipts; truncated output, downgraded declared-behavior records, moved guards, and changed governing sources stop the write; multi-line RED is preserved; one byte-preserving region carries an inner repair record; bundled consumer acceptance, re-read guards before each body-only PATCH, and exact read-back/adopt; owner-approved root REVIEW.md removal: composition tests check the skill's optional-policy defaults directly |
| fix-this | skills/fix-this/ | sha256:7cf65605c78919b6a87aadb2d9a6c818213340f45a52d68583b4c6b2bb6baff3 | 2026-09-10 | bounded-review pass: strict fix-progress-v2 parsing rejects duplicate dispositions, missing ticket/parent fields, and completed merge steps without receipts; checkpoint trust derives from reconciled parts; resume checkouts verify the recorded remote state and fixPushDecision gates on the recorded pre-push head, stopping no-op pushes ; ADR-0037: finalization against canonical/adapted requirements revisions; ADR-0035: final stage for one reviewed PR with handoff consumption, conflict discipline, local verification, squash merge, and resumable bookkeeping; ADR-0038: `fix-progress-v2` receipts digest the validated source handoff, `decideFixEntry` gates fresh/resume/merged-bookkeeping paths, shared evidence helpers in the core render and check evidence, and `isFixEligible` consumes validated facts; ADR-0039: shared core `review-policy-v1` carrier recomputes from the handoff block for fix consumption with reversible repair records and fence-aware closing; blocking findings are work to fix, never approval; ADR-0040: stale push-flag recovery, verified merge bookkeeping without a checkpoint, independent fixer authority, and bounded native FixPublishAdapter; claims reviewed against current code; shared core repair helpers: precise pin-presence, multi-line RED, declared-behavior detection, and repair-record composition plus byte-preserving single-region replacement for review preparation |
| release-skills | skills/release-skills/ | sha256:2d89e68b76ac58448a26c1c9b1cd09bb91259380595b8a1790a38607861665c0 | 2026-09-02 | release workflow prose reviewed against code |

## Coverage

| File | Tier |
|---|---|
| CONTEXT.md | glossary |
| README.md | pointer |
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
| docs/adr/0035-fix-this-final-stage.md | decision |
| docs/adr/0036-review-checkout-auto-alignment.md | decision |
| docs/adr/0037-standardized-criteria-and-adapted-intake.md | decision |
| docs/adr/0038-verified-handoff-repair-bounded-review-publication-and-resumable-finalization.md | decision |
| docs/adr/0039-review-this-automatic-recovery.md | decision |
| docs/adr/0040-github-native-production-workflows.md | decision |
| docs/leaves/document-for-agents.md | leaf |
| docs/leaves/document-for-humans.md | leaf |
| docs/leaves/unslopify.md | leaf |
| docs/leaves/plan-this.md | leaf |
| docs/leaves/implement-this.md | leaf |
| docs/leaves/review-this.md | leaf |
| docs/leaves/fix-this.md | leaf |
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
