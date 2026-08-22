// review-this:INV-7 — finding reconciliation keeps axes separate and rejects
// duplicate, stale, out-of-scope, and unverified findings with evidence.
// review-this:INV-8 — stale-head invalidation and merge gates via pure core.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { reconcileFindings, routeFixesToWorker } from "../reconciliation.ts";
import { reviewIsFresh, isMergeEligible } from "../workflow-state.ts";
import type { Finding } from "../reconciliation.ts";

const HEAD = "abc123";
const OTHER_HEAD = "def456";

function finding(overrides: Partial<Finding> & { file: string; line: number; message: string }): Finding {
  return {
    source: "standards",
    headSha: HEAD,
    inDiff: true,
    verified: true,
    evidence: "invariant INV-1: cited",
    ...overrides,
  };
}

describe("reconcileFindings keeps Standards and Spec axes separate", () => {
  test("retainedByAxis separates cloud, standards, and spec", () => {
    const findings: Finding[] = [
      finding({ source: "cloud", file: "a.ts", line: 10, message: "missing check" }),
      finding({ source: "standards", file: "b.ts", line: 20, message: "style drift" }),
      finding({ source: "spec", file: "c.ts", line: 30, message: "spec mismatch" }),
    ];
    const result = reconcileFindings(findings, HEAD);
    assert.equal(result.retainedByAxis.cloud.length, 1);
    assert.equal(result.retainedByAxis.standards.length, 1);
    assert.equal(result.retainedByAxis.spec.length, 1);
    assert.equal(result.retained.length, 3);
  });

  test("duplicate cloud and local finding counts once with clearest evidence retained", () => {
    const findings: Finding[] = [
      finding({ source: "cloud", file: "src/x.ts", line: 42, message: "Null check missing", evidence: "cloud evidence: line 42" }),
      finding({ source: "standards", file: "src/x.ts", line: 42, message: "Null check missing", evidence: "standards evidence: line 42" }),
    ];
    const result = reconcileFindings(findings, HEAD);
    assert.equal(result.retained.length, 1);
    assert.equal(result.rejected.duplicate.length, 1);
    assert.equal(result.retained[0].source, "cloud");
  });

  test("stale head after a pushed fix is rejected with evidence", () => {
    const findings: Finding[] = [
      finding({ source: "spec", file: "src/y.ts", line: 5, message: "stale", headSha: OTHER_HEAD }),
    ];
    const result = reconcileFindings(findings, HEAD);
    assert.equal(result.retained.length, 0);
    assert.equal(result.rejected.stale.length, 1);
    assert.equal(reviewIsFresh(HEAD, OTHER_HEAD), false);
    assert.equal(reviewIsFresh(HEAD, HEAD), true);
  });

  test("out-of-scope finding outside the diff is rejected", () => {
    const findings: Finding[] = [
      finding({ source: "standards", file: "src/z.ts", line: 1, message: "out", inDiff: false }),
    ];
    const result = reconcileFindings(findings, HEAD);
    assert.equal(result.rejected.outOfScope.length, 1);
    assert.equal(result.retained.length, 0);
  });

  test("unverified finding without invariant citation or observed output is rejected", () => {
    const findings: Finding[] = [
      finding({ source: "spec", file: "src/w.ts", line: 7, message: "broken", verified: false }),
      finding({ source: "spec", file: "src/w.ts", line: 8, message: "also broken", evidence: undefined, verified: true }),
    ];
    const result = reconcileFindings(findings, HEAD);
    assert.equal(result.rejected.unverified.length, 2);
  });

  test("confirmed findings route to the owning worker rather than being fixed in the review workspace", () => {
    const findings: Finding[] = [
      finding({ source: "spec", file: "a.ts", line: 1, message: "fix me" }),
    ];
    const result = reconcileFindings(findings, HEAD);
    const routed = routeFixesToWorker(result, 135);
    assert.ok(routed);
    assert.equal(routed?.ticket, 135);
    assert.equal(routed?.findings.length, 1);
  });

  test("no confirmed findings yields no routing", () => {
    const result = reconcileFindings([], HEAD);
    assert.equal(routeFixesToWorker(result, 135), null);
  });

  test("merge gates require green checks, resolved findings, clean local, unchanged head", () => {
    const pr = { headSha: HEAD, mergeable: true, requiredChecksGreen: true };
    const clean = { reviewedHeadSha: HEAD, unresolvedConfirmedFindings: 0, localReviewClean: true, cloudReviewAvailable: true };
    assert.equal(isMergeEligible(pr, clean).eligible, true);
    assert.equal(isMergeEligible(pr, { ...clean, cloudReviewAvailable: false }).eligible, true);
    assert.equal(isMergeEligible(pr, { ...clean, unresolvedConfirmedFindings: 1 }).eligible, false);
    assert.equal(isMergeEligible({ ...pr, requiredChecksGreen: false }, clean).eligible, false);
    assert.equal(isMergeEligible({ ...pr, headSha: OTHER_HEAD }, clean).eligible, false);
  });

  test("pure helper performs no network or worker calls", () => {
    const src = fs.readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), "../reconciliation.ts"), "utf8");
    assert.doesNotMatch(src, /\bfetch\s*\(/);
    assert.doesNotMatch(src, /\bXMLHttpRequest\b/);
    assert.doesNotMatch(src, /\bprocess\.env\b/);
  });
});
