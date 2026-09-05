// Local finding validation for the single-PR review (ADR-0031).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { criterionReference, reconcileFindings, unresolvedBlocking, type Finding } from "../reconciliation.ts";

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    source: "standards",
    category: "correctness-and-edge-cases",
    severity: "blocking",
    file: "a.ts",
    line: 1,
    message: "breaks x",
    evidence: { kind: "inline", quote: "breaks x" },
    headSha: "h1",
    baseSha: "b1",
    governingRule: "INV-1",
    inDiff: true,
    verified: true,
    ...overrides,
  };
}

describe("criterionReference", () => {
  test("names the stable authority-plus-local key", () => {
    assert.equal(criterionReference(188, "AC-1"), "#188:AC-1");
  });
});

describe("reconcileFindings", () => {
  test("retains verified in-scope findings on the current revision", () => {
    const r = reconcileFindings([finding()], "h1", "b1");
    assert.equal(r.retained.length, 1);
  });
  test("one-pass Standards and Spec output deduplicates identical defects", () => {
    const r = reconcileFindings(
      [finding({ source: "standards" }), finding({ source: "spec" })],
      "h1",
      "b1",
    );
    assert.equal(r.retained.length, 1);
    assert.equal(r.rejected.duplicate.length, 1);
  });
  test("stale, out-of-scope, unverified, and incomplete findings are rejected", () => {
    const r = reconcileFindings(
      [
        finding({ headSha: "old" }),
        finding({ inDiff: false }),
        finding({ verified: false }),
        finding({ category: undefined }),
      ],
      "h1",
      "b1",
    );
    assert.equal(r.retained.length, 0);
    assert.equal(r.rejected.stale.length, 1);
    assert.equal(r.rejected.outOfScope.length, 1);
    assert.equal(r.rejected.unverified.length, 1);
    assert.equal(r.rejected.incomplete.length, 1);
  });
  test("missing or malformed evidence is unverified, never trusted", () => {
    for (const bad of [
      finding({ evidence: undefined }),
      finding({ evidence: { kind: "inline", quote: "   " } }),
      finding({ evidence: { kind: "failure", command: "node --test x", output: "" } }),
    ]) {
      const r = reconcileFindings([bad], "h1", "b1");
      assert.equal(r.retained.length, 0);
      assert.equal(r.rejected.unverified.length, 1);
    }
  });
  test("a reproduced failure requires command and output", () => {
    const r = reconcileFindings(
      [finding({ evidence: { kind: "failure", command: "node --test x", output: "1 failed" } })],
      "h1",
      "b1",
    );
    assert.equal(r.retained.length, 1);
  });
  test("omitted or empty revisions are stale", () => {
    const noBase = reconcileFindings([finding({ baseSha: undefined })], "h1", "b1");
    assert.equal(noBase.retained.length, 0);
    assert.equal(noBase.rejected.stale.length, 1);
    const emptyHead = reconcileFindings([finding({ headSha: "" })], "", "b1");
    assert.equal(emptyHead.retained.length, 0);
    assert.equal(emptyHead.rejected.stale.length, 1);
  });
  test("unresolvedBlocking filters blocking findings", () => {
    const r = reconcileFindings([finding(), finding({ severity: "advisory", message: "nit" })], "h1", "b1");
    assert.equal(unresolvedBlocking(r.retained).length, 1);
  });
});
