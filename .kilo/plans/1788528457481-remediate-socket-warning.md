# Remediate the document-for-agents Socket warning

## Goal

Remove the Socket warning caused by the published `skills/document-for-agents/tests/fixtures/diagnostics-entry.json` payload while preserving the opt-in diagnostics sanitization contract and its test coverage.

## Confirmed cause

- The skills.sh Socket audit dated 2026-09-02 reports one medium alert against `tests/fixtures/diagnostics-entry.json`.
- The fixture ships realistic prompt-override text, a credential-looking token, a credential environment lookup, an absolute path, personal-data-like text, a repository remote, and proprietary-looking names.
- No executable malicious or network code is involved. `SKILL.md` explicitly requires that diagnostics remain local and states that no upload, network call, or telemetry exists.
- The test compares two prewritten objects. The realistic literals do not exercise a sanitizer implementation, so they add distribution risk without adding meaningful coverage.

## Settled decisions

- Keep the diagnostics feature and all ADR-0018 privacy guarantees.
- Keep the existing fixture path to minimize churn.
- Replace realistic payload values with inert, category-specific sentinel values. Do not encode, escape, or split realistic payloads to evade scanning.
- Preserve structural coverage: every forbidden field must exist in the candidate, must be absent from the sanitized entry, and its sentinel must not leak into sanitized output.
- Add a focused regression assertion against the literal payload classes named by Socket. Do not build a broad, repository-wide imitation of Socket's opaque scanner.
- Treat ADR-0018 as historical and leave it unchanged. Update current mechanism docs that describe the fixture.
- Treat skills.sh re-audit timing as an external rollout concern, not a reason to weaken local acceptance checks.

## Implementation plan

1. **Make the fixture inert.**
   - In `skills/document-for-agents/tests/fixtures/diagnostics-entry.json`, retain the approved sanitized entry and forbidden-field list.
   - Replace every realistic hostile or sensitive value with a clearly synthetic sentinel tied to its forbidden category.
   - Replace `sensitiveStrings` with a sentinel-oriented representation that contains no prompt injection, token prefix, credential lookup, concrete path, remote URL, personal data, or proprietary-looking identifier.

2. **Preserve and sharpen composition coverage.**
   - Update `skills/document-for-agents/tests/diagnostics.test.ts` so it proves:
     - the sanitized object has exactly the approved fields;
     - every forbidden field remains represented in the candidate;
     - no forbidden field appears in the sanitized object;
     - no candidate sentinel appears in serialized sanitized output.
   - Add a focused check over the raw fixture text for the specific static payload classes in the Socket finding: instruction-override wording, secret-looking token prefixes, credential environment lookups, concrete absolute paths or repository URLs, and contact-data-like literals.
   - Rename test prose from “hostile fixture” to “inert adversarial-category fixture” so the test describes what is actually shipped.

3. **Update current documentation with the code.**
   - Revise the fixture description in `skills/document-for-agents/reference/templates.md` and `docs/leaves/ext/document-for-agents.md` to state that inert sentinels represent forbidden categories without shipping realistic instructions or sensitive literals.
   - Leave `docs/adr/0018-opt-in-skill-diagnostics.md` verbatim because it records the accepted decision and its original consequence.
   - Review the compact seam leaf. Change it only if the INV-14 summary becomes inaccurate; otherwise preserve its concise invariant wording.
   - Review derived human docs for affected current claims. Regenerate only those required by the repository's derived-doc process; do not rewrite the historical ADR summary merely to hide that the original implementation used a hostile fixture.
   - Recompute the `document-for-agents` seam fingerprint in `docs/manifest.md` after reviewing affected claims, and record the fixture-hardening review in its Claims cell.

4. **Validate the repository change.**
   - Run the focused diagnostics tests first.
   - Run `npm test`, `npx tsc --noEmit`, and `./scripts/docs-check.sh`.
   - Run the final `unslopify` audit on changed prose.
   - Inspect the distributable `skills/document-for-agents/` tree to confirm the exact literals and payload classes cited by Socket are absent while the no-network diagnostics contract remains present.

5. **Verify rollout after the change reaches the default branch.**
   - Confirm skills.sh serves a new skill content hash or otherwise reflects the updated fixture.
   - Check `/api/v1/skills/audit/ruralnative/ruralnative-skills/document-for-agents` and the Socket detail page for a newer audit timestamp and zero Socket alerts.
   - Allow for the documented platform behavior that re-indexing and audits may lag or remain cached. If the public skill snapshot is current but the audit still cites the removed fixture content after the normal audit cycle, record evidence of the current snapshot and stale audit for a manual upstream re-audit request. Do not claim remediation complete from an unchanged 2026-09-02 audit.

## Risks and controls

- **Coverage weakens while the warning disappears.** Keep one sentinel per forbidden category and assert both field removal and value non-leakage.
- **Scanner evasion replaces remediation.** Do not preserve realistic payloads through encoding or string assembly; remove them from the distributed skill.
- **Opaque external scanner still warns.** Keep local checks tied to the reported classes, then use the new Socket report as external evidence rather than guessing at undocumented rules.
- **Audit remains stale.** Compare both skill snapshot freshness and audit timestamp before interpreting the public result.
- **Documentation coherence fails.** Update mechanism docs with the test and refresh the seam fingerprint only after claim review.

## Acceptance criteria

- `AC-1`: The distributed diagnostics fixture contains no realistic prompt-override instruction, credential-looking token, credential-source expression, concrete absolute path, repository remote, personal-data-like literal, or proprietary-looking identifier.
- `AC-2`: Tests still prove the sanitized diagnostics entry contains exactly the approved fields and excludes every forbidden field and every inert candidate sentinel.
- `AC-3`: A focused regression test fails if any static payload class cited by the Socket finding is reintroduced into the fixture.
- `AC-4`: Current mechanism documentation describes inert sentinel coverage, ADR-0018 remains unchanged, and the reviewed `document-for-agents` seam fingerprint is current.
- `AC-5`: Focused tests, the full test suite, TypeScript checking, the docs harness, and the final prose audit pass.
- `AC-6`: After skills.sh refreshes the current skill snapshot, Socket reports zero alerts. If the audit remains stale, the result is explicitly recorded as pending external re-audit rather than a repository failure or a false completion claim.

## Out of scope

- Removing or redesigning opt-in diagnostics.
- Adding runtime network behavior, telemetry, or automatic submission.
- Changing ADR-0018's accepted privacy decision.
- Refactoring unrelated adversarial fixtures in other skills.
- Creating or publishing GitHub specifications, tickets, labels, assignments, or blockers.
