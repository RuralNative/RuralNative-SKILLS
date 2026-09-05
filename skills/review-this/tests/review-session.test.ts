// Single-PR session: checkout match, delta scope, CI gate, verdict reuse (ADR-0031).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  checkoutMatchDecision,
  ciGateDecision,
  deltaReviewScope,
  fixRoundDecision,
  postFixReviewScope,
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

describe("one fix round", () => {
  test("first round allowed, second stopped", () => {
    assert.equal(fixRoundDecision(0).allowed, true);
    assert.equal(fixRoundDecision(1).allowed, false);
  });
});

describe("ciGateDecision", () => {
  test("pending CI publishes the verdict and stops without polling", () => {
    assert.deepEqual(
      ciGateDecision({ requiredChecksGreen: false, requiredChecksPending: true, equivalentCiEstablished: false, localFallbackPassed: null }).action,
      "publish-and-stop",
    );
  });
  test("equivalent green CI is merge-eligible", () => {
    assert.deepEqual(
      ciGateDecision({ requiredChecksGreen: true, requiredChecksPending: false, equivalentCiEstablished: true, localFallbackPassed: null }).action,
      "merge-eligible",
    );
  });
  test("absent equivalence runs the local fallback once", () => {
    assert.deepEqual(
      ciGateDecision({ requiredChecksGreen: true, requiredChecksPending: false, equivalentCiEstablished: false, localFallbackPassed: null }).action,
      "run-fallback-once",
    );
  });
  test("failed verification stops", () => {
    assert.deepEqual(
      ciGateDecision({ requiredChecksGreen: false, requiredChecksPending: false, equivalentCiEstablished: false, localFallbackPassed: false }).action,
      "stop",
    );
  });
  test("failed equivalent CI blocks even when the fallback passed", () => {
    assert.deepEqual(
      ciGateDecision({ requiredChecksGreen: false, requiredChecksPending: false, equivalentCiEstablished: true, localFallbackPassed: true }).action,
      "stop",
    );
  });
  test("approved fallback satisfies the gate only with green checks and no equivalent CI", () => {
    assert.deepEqual(
      ciGateDecision({ requiredChecksGreen: true, requiredChecksPending: false, equivalentCiEstablished: false, localFallbackPassed: true }).action,
      "merge-eligible",
    );
  });
  test("failed required checks stop even when the fallback passed", () => {
    assert.deepEqual(
      ciGateDecision({ requiredChecksGreen: false, requiredChecksPending: false, equivalentCiEstablished: false, localFallbackPassed: true }).action,
      "stop",
    );
  });
  test("failed checks without equivalent CI stop without running the fallback", () => {
    assert.deepEqual(
      ciGateDecision({ requiredChecksGreen: false, requiredChecksPending: false, equivalentCiEstablished: false, localFallbackPassed: null }).action,
      "stop",
    );
  });
});

describe("postFixReviewScope", () => {
  test("the post-fix review is always one delta review", () => {
    assert.deepEqual(postFixReviewScope().scope, "delta");
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
