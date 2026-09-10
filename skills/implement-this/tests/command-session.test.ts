// Current-checkout decisions for /implement-this (ADR-0031, ADR-0034).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { checkoutDecision, decideDeliveryCompletion, decideTicketPath, isDelivered } from "../command-session.ts";

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
  test("existing expected branch from main stops with a switch instruction", () => {
    const d = checkoutDecision({ worktreeClean: true, currentBranch: "main", expectedBranch: "impl/100-x", expectedBranchExists: true });
    assert.equal(d.action, "stop");
    if (d.action === "stop") assert.match(d.reason, /already exists/);
  });
  test("blank branch identity stops", () => {
    assert.equal(checkoutDecision({ worktreeClean: true, currentBranch: "", expectedBranch: "impl/100-x" }).action, "stop");
    assert.equal(checkoutDecision({ worktreeClean: true, currentBranch: "main", expectedBranch: "  " }).action, "stop");
  });
});

describe("decideDeliveryCompletion", () => {
  const base = {
    pullRequestOpen: true,
    closingReferenceValid: true,
    evidenceInPullRequestBody: true,
    requirementsCurrent: true,
  };
  test("delivered on the verified read-back PR", () => {
    const d = decideDeliveryCompletion({
      ...base,
      repository: "o/r",
      expectedRepository: "o/r",
      baseBranch: "main",
      expectedBaseBranch: "main",
      headBranch: "impl/100-x",
      expectedBranch: "impl/100-x",
      headSha: "abc",
      expectedHeadSha: "abc",
      evidenceStatus: "current",
    });
    assert.equal(d.delivered, true);
  });
  test("missing default-branch pin stops instead of defaulting to main", () => {
    const d = decideDeliveryCompletion({
      ...base,
      repository: "o/r",
      expectedRepository: "o/r",
      baseBranch: "main",
      headBranch: "impl/100-x",
      expectedBranch: "impl/100-x",
      headSha: "abc",
      expectedHeadSha: "abc",
      evidenceStatus: "current",
    });
    assert.equal(d.delivered, false);
    if (d.delivered === false) assert.match(d.reason, /default branch/);
  });
  test("wrong repository, base, branch, head, or evidence stops", () => {
    assert.equal(decideDeliveryCompletion({ ...base, repository: "o/other", expectedRepository: "o/r" }).delivered, false);
    assert.equal(decideDeliveryCompletion({ ...base, baseBranch: "dev" }).delivered, false);
    assert.equal(
      decideDeliveryCompletion({ ...base, headBranch: "impl/999-y", expectedBranch: "impl/100-x" }).delivered,
      false,
    );
    assert.equal(decideDeliveryCompletion({ ...base, headSha: "x", expectedHeadSha: "y" }).delivered, false);
    assert.equal(decideDeliveryCompletion({ ...base, evidenceStatus: "stale" }).delivered, false);
  });
  test("delivery follows the pinned default branch instead of hard-coded main", () => {
    const trunk = {
      ...base,
      repository: "o/r",
      expectedRepository: "o/r",
      headBranch: "impl/100-x",
      expectedBranch: "impl/100-x",
      headSha: "abc",
      expectedHeadSha: "abc",
      evidenceStatus: "current",
    };
    assert.equal(decideDeliveryCompletion({ ...trunk, baseBranch: "trunk", expectedBaseBranch: "trunk" }).delivered, true);
    assert.equal(decideDeliveryCompletion({ ...trunk, baseBranch: "main", expectedBaseBranch: "trunk" }).delivered, false);
    assert.equal(decideDeliveryCompletion({ ...trunk, baseBranch: "trunk", expectedBaseBranch: "  " }).delivered, false);
  });
});

describe("decideTicketPath", () => {
  test("ready-for-agent is fresh work and ready-for-human with a match is repair", () => {
    assert.equal(decideTicketPath({ labels: ["ready-for-agent"], hasSingleMatchingPr: false }), "fresh");
    assert.equal(decideTicketPath({ labels: ["ready-for-human"], hasSingleMatchingPr: true }), "repair");
    assert.equal(decideTicketPath({ labels: ["ready-for-human"], hasSingleMatchingPr: false }), null);
    assert.equal(decideTicketPath({ labels: [], hasSingleMatchingPr: false }), null);
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
