# Remove arbitrary document-size gates

## Goal and confirmed decision

Remove fixed writing quotas and size-based documentation-reading gates from `document-for-agents`, `document-for-humans`, and the production workflows. Preserve relevant-source selection, completeness, source authority, and operational safeguards. The user approved this boundary during planning.

Readers are agents using these skills and humans consuming their documentation and planning output. Success means required information can grow without rejecting work, forcing artificial splits, or compressing away meaning.

Evidence supports the change. `docs/adr/0030-larger-orientation-ceilings.md:28–35` records that essential information was being trimmed to fit earlier caps. Its 50% increase preserved the same failure mechanism. `skills/plan-this/orientation.ts:86–103` rejects a ticket when its required orientation set exceeds a byte cap. Human-doc templates constrain decision explanations to one sentence per field.

No direct spec or ticket body-length ceiling was found in the inspected production skills. Their hard size restriction is the required-reading preflight, alongside writing-shape quotas and separate task-sizing guidance. Do not invent a body-limit subsystem to remove.

## Replacement contract

- Length alone never fails a document, rejects a ticket, blocks relevant reading, requires approval, forces a split, or justifies deleting necessary content.
- Keep requirements, exceptions, decision rationale, boundaries, and operational consequences needed for the task or audience. Remove repetition and irrelevant material rather than optimizing counts.
- Split documents by responsibility or reader question and tickets by independently verifiable behavior, dependency, risk, or release boundary. No automatic line, byte, sentence, reading-time, or execution-time sizing rule remains.
- Preserve the architecture index, affected-seam resolution, deduplication, relevant glossary/decision/policy selection, source authority, and current exclusions. Removing a cap does not authorize loading every document.
- Allow incremental reading of relevant authoritative documentation without approval solely because additional reading exceeds a former budget. Missing authoritative facts remain explicit gaps; agents must not invent answers. Approval remains necessary for substantive decisions and protected actions.
- Real model/tool context limits require staged reading or a continuity handoff. Disclose incomplete inspection. Never silently truncate essential material or claim complete review after a partial read.
- Optional existing byte/source counts may remain informational. Do not add advisory thresholds, warning gates, telemetry, or a replacement budgeting framework.

## Protected scope

Keep one-target implementation/review behavior, automatic fix-round limits, approval gates for protected changes, risk classification and evidence, source/provenance checks, freshness checks, seam fingerprints, stable invariant identities, and requirements-revision protection.

Keep one decision per planning question and clear recommendations. Remove forced sentence counts, word counts, and fixed numbers of alternatives; offer the choices the actual decision requires.

Keep human-doc derivation and audience routing. One entry per accepted decision is traceability, not a writing quota. Keep invariant counts that are explicitly diagnostic review prompts and never force a split; remove prescribed initial invariant counts. Preserve interface/serialization shapes that have a technical purpose rather than treating every number as a size quota.

Do not create specifications, tickets, labels, assignees, blockers, or other tracker records. Do not change unrelated skills or synchronize installed global copies as part of implementation. Release publishing is outside scope.

## Implementation order

1. **Inventory and record the replacement decision.** Recheck the affected source trees for numeric quotas, imperative template shapes, over-budget branches, tests, and generated instructions. Classify each as removed size policy or preserved semantic/safety rule. The approved change conflicts with `document-for-agents` invariants `INV-8` and `INV-17`. During implementation, record a superseding/narrowing ADR before changing those contracts; preserve historical ADRs and invariant identity/history. Link the approved replacement to ADR-0017, ADR-0024, and ADR-0030 where applicable. This plan authorizes the decision boundary, not unrelated invariant changes.

2. **Remove executable size vetoes.** Update `skills/document-for-agents/orientation.ts`, `skills/plan-this/orientation.ts`, `skills/implement-this/orientation.ts`, and `skills/review-this/orientation.ts` together. Preserve source resolution and validation, remove cap tables and comparison-based rejection, and update local consumers/types/renderers so no cap is required or reported as a validity condition. Do not leave an always-true budget validator or simulated unlimited cap. Preserve independently useful validation functions, including ticket orientation-shape validation, rather than deleting whole modules merely because they contain caps.

3. **Update the documentation gate.** Inspect `scripts/docs-check.sh` and remove only size-based failure from check 11. Preserve any non-size route/source validity checks it performs. If the check becomes empty, retire it and update numbering/count references consistently; otherwise rename it to describe its remaining validation. Existing caches with legacy budget columns must not fail solely because those numeric values remain. Update generated loading protocols to omit budgets without introducing a new manifest schema unless an existing consumer actually requires one.

4. **Replace instruction and template quotas.** Update affected `SKILL.md`, `INSTALL.md`, reference files, and templates in both documentation skills and planning/implementation/review skills. Remove index/policy line limits, leaf reading-time ceilings, ADR/glossary sentence limits, dependency-entry lengths, forced one-line explanations, human summary/paragraph/diagram quotas, and jargon-per-paragraph quotas. Replace them with audience-fit, explained terminology, relevance, and completeness requirements. Update `skills/plan-this/decisions.ts` to remove word/sentence/alternative-count rejection while preserving a clear decision, meaningful choices, and a recommendation. Review fresh-context/risk-SLO splitting language and consumers in `risk.ts`; remove estimated-time sizing enforcement or prompts without weakening risk classification or evidence. `release-skills` has no identified content-size gate; preserve its unrelated CLI pagination.

5. **Update repository docs in the same change.** Update `AGENTS.md`, `ARCHITECTURE.md`, affected leaf docs, relevant `CONTEXT.md` entries, templates, README/installation guidance, and applicable policies to state the replacement contract. Preserve the five-command structure and unslopify block; change the budget command through the newly recorded decision. Audit changed authoritative claims and regenerate affected human docs from those sources. Refresh seam fingerprints only after claim review. Do not rewrite historical ADRs to pretend the former caps never existed.

6. **Replace tests with behavioral proof.** Update per-skill orientation/composition tests, `tests/orientation-parity.test.ts`, document size-guidance tests, policy-length tests, and planning question tests. Replace assertions that pin cap values or quota wording; do not merely delete the tests. Keep standalone-install parity for the four independent orientation modules. Add oversized fixtures that preserve required sources and demonstrate successful planning, implementation, review, and docs validation.

7. **Validate and review the migration.** Run focused tests first, then the repository test suite, TypeScript checking, and `./scripts/docs-check.sh` using the existing package scripts. Search current instructions/generated templates for surviving quota enforcement while allowing historical ADRs and negative regression fixtures. Review representative outputs for complete rationale, readable human explanations, and relevant-only loading. Report unrelated baseline failures separately; do not silently refresh fingerprints or weaken unrelated gates to get a green result.

## Data flow and migration

Affected seam names continue to resolve authoritative orientation sources. Sources are validated and deduplicated, then read incrementally as needed. Their total size no longer determines whether work may proceed. Existing metrics, if retained, describe the set without producing an over-budget status.

Migrate repository sources, independent skill copies, templates, tests, and current documentation in one coordinated change. Existing adopted caches may still contain old budget instructions until maintained with the updated skill; document that maintenance path and replace those instructions without trimming content. No database or external service migration is involved.

Rollback is a coordinated revert of behavior and documentation, followed by the same validation. It must not truncate documents that grew after removal. Restoring old caps may reject newly valid reading sets, so any such rollback must disclose that consequence rather than silently compressing content.

## Risks and safeguards

- **Unbounded irrelevant loading:** retain source selection, deduplication, and incremental inspection; test excluded sources remain excluded.
- **Silent instruction-only limits:** inspect templates and composition tests, not just executable comparisons.
- **Accidental safety removal:** classify every numeric restriction and leave scope, retry, approval, and provenance rules unchanged.
- **Stale installed/generated contracts:** migrate templates and document adopter maintenance; no automatic edits outside this repository.
- **Completeness claims unsupported by evidence:** use representative scenarios and regressions; do not claim measured quality or cost improvements without a comparative evaluation.

## Acceptance criteria

- AC-1: A valid required orientation set larger than every former cap passes size-related preflight in all four orientation implementations and the documentation gate, without dropping required sources or seeking a size waiver.
- AC-2: Missing/invalid source and authority failures remain failures where they were previously enforced. Deduplication and exclusion of unrelated/derived/private sources remain intact.
- AC-3: No current affected skill, template, policy, or test requires fixed prose length, jargon density, or alternative counts as a validity condition. Long but necessary explanations remain valid; repetition and unclear explanations remain reviewable quality defects.
- AC-4: Planning permits adequate question wording and decision alternatives without word/sentence quotas, while still addressing one decision at a time and giving a clear recommendation.
- AC-5: No ticket is rejected or forcibly split solely because its supporting documents are long or a prescribed execution-time estimate is exceeded. Risk evidence and independently verifiable behavior boundaries remain required.
- AC-6: Actual tool/context exhaustion results in disclosed staged work or handoff, never silent truncation or an unsupported claim of complete inspection.
- AC-7: Operational safeguards, source traceability, freshness, seam coherence, and requirements-revision checks retain their existing behavior and regression coverage.
- AC-8: The replacement decision, current docs, generated instructions, and source behavior agree. Historical decisions remain intact, and affected human docs and seam fingerprints are refreshed after review.
- AC-9: Focused tests, full tests, TypeScript checks, and the docs harness pass, or any unrelated pre-existing failure is explicitly identified with evidence. No specifications or tracker artifacts are created.

## Validation status at planning completion

Source and test inspection completed. The attempted `./scripts/docs-check.sh` baseline run was blocked by planning-session execution permissions; no passing baseline is claimed. No source or non-plan documentation changes have been made. No unresolved product decision remains within the approved removal boundary.
