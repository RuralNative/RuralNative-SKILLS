// Stable acceptance-criterion identity (ADR-0031).
//
// Cross-stage: the same criterion wording moves between planning (published
// issue body), compact PR-body evidence, and review references. Matching
// always happens by the stable local ID `(authority issue number, local ID)`,
// never by full sentence text.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  activeCriteria,
  criterionKey,
  criteriaRevision,
  parseAcceptanceCriteria,
  validateCriterionRecords,
} from "../scripts/workflow-state.ts";
import {
  renderCompactEvidence,
  validateCompactEvidence,
} from "../skills/implement-this/acceptance-evidence.ts";

const VALID_REQUIREMENTS_REVISION = `requirements-v1:parent=${"a".repeat(64)};ticket=${"b".repeat(64)}`;
import { criterionReference } from "../skills/review-this/reconciliation.ts";

const TICKET_BODY = [
  "## Acceptance criteria",
  "",
  "- `AC-1`: Focused proof passes.",
  "- `AC-2` (retired): Old behavior.",
].join("\n");

describe("stable criterion identity", () => {
  test("parses active and retired records", () => {
    const criteria = parseAcceptanceCriteria(TICKET_BODY);
    assert.deepEqual(activeCriteria(criteria).map((c) => c.id), ["AC-1"]);
    assert.deepEqual(validateCriterionRecords(criteria), []);
  });
  test("criterionKey and criterionReference agree", () => {
    assert.equal(criterionKey(10, "AC-1"), "#10:AC-1");
    assert.equal(criterionReference(10, "AC-1"), "#10:AC-1");
  });
  test("wording clarification keeps the ID but changes the revision", () => {
    const a = parseAcceptanceCriteria("- `AC-1`: First wording.");
    const b = parseAcceptanceCriteria("- `AC-1`: Clearer wording.");
    assert.notEqual(criteriaRevision(a), criteriaRevision(b));
  });
  test("compact evidence matches by ID, never by sentence text", () => {
    const criteria = parseAcceptanceCriteria("- `AC-1`: Focused proof passes.");
    const input = {
      criteria,
      evidence: [{ criterionId: "AC-1", kind: "behavior", focusedCommand: "node --test x", result: "1 passed", passed: true } as const],
      isBugFix: false,
      requirementsRevision: VALID_REQUIREMENTS_REVISION,
    };
    assert.equal(validateCompactEvidence(input).ok, true);
    assert.ok(renderCompactEvidence(input).includes("`AC-1`"));
  });
  test("retired IDs are never accepted as active evidence", () => {
    const criteria = parseAcceptanceCriteria("- `AC-1`: Focused proof passes.\n- `AC-2` (retired): Old behavior.");
    const input = {
      criteria,
      evidence: [
        { criterionId: "AC-1", kind: "behavior", focusedCommand: "node --test x", result: "1 passed", passed: true } as const,
        { criterionId: "AC-2", kind: "behavior", focusedCommand: "node --test x", result: "1 passed", passed: true } as const,
      ],
      isBugFix: false,
      requirementsRevision: VALID_REQUIREMENTS_REVISION,
    };
    assert.equal(validateCompactEvidence(input).ok, false);
  });
});
