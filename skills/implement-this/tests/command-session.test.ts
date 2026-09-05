// Current-checkout decisions for /implement-this (ADR-0031).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { checkoutDecision, isDelivered } from "../command-session.ts";

describe("checkoutDecision", () => {
  test("creates the feature branch when invoked from main", () => {
    const d = checkoutDecision({ worktreeClean: true, currentBranch: "main", expectedBranch: "impl/100-x" });
    assert.deepEqual(d, { action: "create-branch", branch: "impl/100-x", reason: d.action === "create-branch" || d.action === "reuse-branch" ? d.reason : "" });
    assert.equal(d.action, "create-branch");
  });
  test("reuses the current feature branch", () => {
    const d = checkoutDecision({ worktreeClean: true, currentBranch: "impl/100-x", expectedBranch: "impl/100-x" });
    assert.equal(d.action, "reuse-branch");
  });
  test("dirty checkout stops before edits", () => {
    const d = checkoutDecision({ worktreeClean: false, currentBranch: "main", expectedBranch: "impl/100-x" });
    assert.equal(d.action, "stop");
  });
  test("wrong branch stops with no worktree intent", () => {
    const d = checkoutDecision({ worktreeClean: true, currentBranch: "impl/999-other", expectedBranch: "impl/100-x" });
    assert.equal(d.action, "stop");
    if (d.action === "stop") assert.match(d.reason, /not impl\/100-x/);
  });
});

describe("isDelivered", () => {
  test("delivered only with open PR, closing ref, body evidence, and current requirements", () => {
    assert.equal(
      isDelivered({ pullRequestOpen: true, closingReferenceValid: true, evidenceInPullRequestBody: true, requirementsCurrent: true }),
      true,
    );
    for (const fact of [
      { pullRequestOpen: false, closingReferenceValid: true, evidenceInPullRequestBody: true, requirementsCurrent: true },
      { pullRequestOpen: true, closingReferenceValid: false, evidenceInPullRequestBody: true, requirementsCurrent: true },
      { pullRequestOpen: true, closingReferenceValid: true, evidenceInPullRequestBody: false, requirementsCurrent: true },
      { pullRequestOpen: true, closingReferenceValid: true, evidenceInPullRequestBody: true, requirementsCurrent: false },
    ]) {
      assert.equal(isDelivered(fact), false);
    }
  });
});
