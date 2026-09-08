// Single-PR session: checkout match, delta scope, CI gate, verdict reuse (review-only).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  checkoutMatchDecision,
  ciGateDecision,
  deltaReviewScope,
  shouldReuseVerdict,
} from "../review-session.ts";

describe("checkoutMatchDecision", () => {
  test("matching clean checkout proceeds", () => {
    assert.equal(
      checkoutMatchDecision({ worktreeClean: true, currentBranch: "impl/10-x", expectedBranch: "impl/10-x", localHeadSha: "h1", pullRequestHeadSha: "h1" }).match,
      true,
    );
  });
  test("dirty checkout stops", () => {
    assert.equal(
      checkoutMatchDecision({ worktreeClean: false, currentBranch: "impl/10-x", expectedBranch: "impl/10-x", localHeadSha: "h1", pullRequestHeadSha: "h1" }).match,
      false,
    );
  });
  test("branch or HEAD mismatch stops with no new worktree", () => {
    const branch = checkoutMatchDecision({ worktreeClean: true, currentBranch: "main", expectedBranch: "impl/10-x", localHeadSha: "h1", pullRequestHeadSha: "h1" });
    assert.equal(branch.match, false);
    const head = checkoutMatchDecision({ worktreeClean: true, currentBranch: "impl/10-x", expectedBranch: "impl/10-x", localHeadSha: "old", pullRequestHeadSha: "h1" });
    assert.equal(head.match, false);
  });
  test("empty revisions never match", () => {
    assert.equal(
      checkoutMatchDecision({ worktreeClean: true, currentBranch: "impl/10-x", expectedBranch: "impl/10-x", localHeadSha: "", pullRequestHeadSha: "" }).match,
      false,
    );
  });
});

describe("deltaReviewScope", () => {
  test("later revisions default to delta", () => {
    const s = deltaReviewScope({ addsSeam: false, touchesTrustBoundary: false, touchesSchema: false, touchesDependencyState: false, touchesGeneratedContract: false, touchesPublicInterface: false, materiallyWidensDiff: false });
    assert.equal(s.scope, "delta");
  });
  test("risk triggers require full review", () => {
    const s = deltaReviewScope({ addsSeam: true, touchesTrustBoundary: false, touchesSchema: false, touchesDependencyState: false, touchesGeneratedContract: false, touchesPublicInterface: false, materiallyWidensDiff: false });
    assert.equal(s.scope, "full");
  });
});

describe("ciGateDecision", () => {
  test("pending CI publishes the review and stops without polling", () => {
    assert.deepEqual(
      ciGateDecision({ requiredChecksGreen: false, requiredChecksPending: true, equivalentCiEstablished: false, localFallbackPassed: null }).action,
      "publish-and-stop",
    );
  });
  test("equivalent green CI publishes without delivery", () => {
    assert.deepEqual(
      ciGateDecision({ requiredChecksGreen: true, requiredChecksPending: false, equivalentCiEstablished: true, localFallbackPassed: null }).action,
      "publish",
    );
  });
  test("absent equivalence runs the local fallback once", () => {
    assert.deepEqual(
      ciGateDecision({ requiredChecksGreen: true, requiredChecksPending: false, equivalentCiEstablished: false, localFallbackPassed: null }).action,
      "run-fallback-once",
    );
  });
  test("failed verification publishes the failure and stops", () => {
    assert.deepEqual(
      ciGateDecision({ requiredChecksGreen: false, requiredChecksPending: false, equivalentCiEstablished: false, localFallbackPassed: false }).action,
      "publish-and-stop",
    );
  });
  test("failed equivalent CI publishes the failure even when the fallback passed", () => {
    assert.deepEqual(
      ciGateDecision({ requiredChecksGreen: false, requiredChecksPending: false, equivalentCiEstablished: true, localFallbackPassed: true }).action,
      "publish-and-stop",
    );
  });
  test("approved fallback publishes only with green checks and no equivalent CI", () => {
    assert.deepEqual(
      ciGateDecision({ requiredChecksGreen: true, requiredChecksPending: false, equivalentCiEstablished: false, localFallbackPassed: true }).action,
      "publish",
    );
  });
  test("failed required checks publish the failure even when the fallback passed", () => {
    assert.deepEqual(
      ciGateDecision({ requiredChecksGreen: false, requiredChecksPending: false, equivalentCiEstablished: false, localFallbackPassed: true }).action,
      "publish-and-stop",
    );
  });
  test("failed checks without equivalent CI publish the failure without running the fallback", () => {
    assert.deepEqual(
      ciGateDecision({ requiredChecksGreen: false, requiredChecksPending: false, equivalentCiEstablished: false, localFallbackPassed: null }).action,
      "publish-and-stop",
    );
  });
});

describe("shouldReuseVerdict", () => {
  const key = { prNumber: 11, headSha: "h1", baseSha: "b1", requirementsRevision: "r1", reviewPolicyRevision: "p1" };
  test("unchanged keys reuse without repeating review", () => {
    assert.equal(shouldReuseVerdict({ pinned: key, current: { ...key } }).reuse, true);
  });
  test("head, base, requirements, or policy movement invalidates", () => {
    for (const current of [
      { ...key, headSha: "h2" },
      { ...key, baseSha: "b2" },
      { ...key, requirementsRevision: "r2" },
      { ...key, reviewPolicyRevision: "p2" },
    ]) {
      assert.equal(shouldReuseVerdict({ pinned: key, current }).reuse, false);
    }
  });
});
