// Compact evidence for /implement-this (ADR-0031).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  parseCompactEvidenceBlock,
  readEvidenceForReview,
  renderCompactEvidence,
  upsertCompactEvidenceBlock,
  validateCompactEvidence,
  type CompactEvidenceInput,
} from "../acceptance-evidence.ts";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function input(overrides: Partial<CompactEvidenceInput> = {}): CompactEvidenceInput {
  return {
    criteria: [
      { id: "AC-1", text: "Ship one behavior", status: "active" },
      { id: "AC-2", text: "Docs note", status: "active" },
    ],
    evidence: [
      { criterionId: "AC-1", kind: "behavior", focusedCommand: "node --test skills/x/tests/a.test.ts", result: "3 passed", passed: true },
      { criterionId: "AC-2", kind: "non-behavior", rationale: "docs-only wording change verified by diff" },
    ],
    isBugFix: false,
    requirementsRevision: `requirements-v1:parent=${HASH_A};ticket=${HASH_B}`,
    ...overrides,
  };
}

describe("validateCompactEvidence", () => {
  test("accepts active criterion coverage with focused proof", () => {
    assert.equal(validateCompactEvidence(input()).ok, true);
  });
  test("missing evidence for a criterion fails", () => {
    const bad = input({ evidence: [input().evidence[0]] });
    const r = validateCompactEvidence(bad);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("AC-2")));
  });
  test("retired criterion is never accepted as active evidence", () => {
    const bad = input({
      criteria: [{ id: "AC-1", text: "old", status: "retired" }],
      evidence: [{ criterionId: "AC-1", kind: "behavior", focusedCommand: "cmd", result: "ok", passed: true }],
    });
    assert.equal(validateCompactEvidence(bad).ok, false);
  });
  test("bug fix requires defect-specific RED command and output", () => {
    assert.equal(validateCompactEvidence(input({ isBugFix: true })).ok, false);
    assert.equal(
      validateCompactEvidence(input({ isBugFix: true, bugRedCommand: "node repro.ts", bugRedOutput: "TypeError: x" })).ok,
      true,
    );
  });
  test("feature criteria do not require a RED run", () => {
    assert.equal(validateCompactEvidence(input({ isBugFix: false })).ok, true);
  });
  test("requirements revision must carry the contract version", () => {
    assert.equal(validateCompactEvidence(input({ requirementsRevision: "bogus" })).ok, false);
    assert.equal(validateCompactEvidence(input({ requirementsRevision: "requirements-v1:nonsense" })).ok, false);
  });
  test("failed behavioral runs are not acceptance proof", () => {
    const failed = input({
      evidence: [
        { criterionId: "AC-1", kind: "behavior", focusedCommand: "false", result: "1 test failed", passed: false },
        input().evidence[1],
      ],
    });
    assert.equal(validateCompactEvidence(failed).ok, false);
  });
});

describe("render and upsert", () => {
  test("renders a deterministic block carrying the revision", () => {
    const block = renderCompactEvidence(input());
    assert.ok(block.includes("<!-- ruralnative:compact-evidence:start -->"));
    assert.ok(block.includes("Requirements revision:"));
    assert.ok(block.includes("AC-1"));
  });
  test("upsert is deterministic with exactly one block", () => {
    const block = renderCompactEvidence(input());
    const once = upsertCompactEvidenceBlock("Body\n\nCloses #100\n", block);
    const twice = upsertCompactEvidenceBlock(once, block);
    assert.equal(twice, once);
    assert.equal(twice.split("<!-- ruralnative:compact-evidence:start -->").length - 1, 1);
    assert.ok(twice.includes("Closes #100"));
  });
  test("reads legacy comment evidence during migration", () => {
    const legacy = "x\n<!-- ruralnative:acceptance-evidence:start -->\n## Acceptance evidence\n<!-- ruralnative:acceptance-evidence:end -->\n";
    assert.ok(readEvidenceForReview(legacy)?.includes("Acceptance evidence"));
    assert.equal(readEvidenceForReview("no evidence"), null);
    assert.ok(parseCompactEvidenceBlock(renderCompactEvidence(input()))?.includes("AC-1"));
  });
  test("compact evidence lives only in the body; comments carry legacy only", () => {
    const legacyComment = "c\n<!-- ruralnative:acceptance-evidence:start -->\n## Acceptance evidence\n<!-- ruralnative:acceptance-evidence:end -->\n";
    assert.ok(readEvidenceForReview("no evidence", ["nothing", legacyComment])?.includes("Acceptance evidence"));
    const compactBody = renderCompactEvidence(input());
    assert.ok(readEvidenceForReview(compactBody, [legacyComment])?.includes("AC-1"));
    assert.equal(readEvidenceForReview("no evidence", ["nothing"]), null);
    const compactComment = `prefix\n${compactBody}\n`;
    assert.equal(readEvidenceForReview("no evidence", [compactComment]), null);
  });
});
