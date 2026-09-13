// Current-checkout decisions for /implement-this (ADR-0031, ADR-0034, ADR-0041).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  checkoutDecision,
  decideDeliveryCompletion,
  decideTicketPath,
  isDelivered,
  isVerifiedContinuationEdits,
  type ContinuationEditsFact,
} from "../command-session.ts";

function continuation(overrides: Partial<ContinuationEditsFact> = {}): ContinuationEditsFact {
  return {
    recordedTicket: 100,
    authorizedTicket: 100,
    recordedRepository: "o/r",
    authorizedRepository: "o/r",
    recordedBaseSha: "base1",
    observedBaseSha: "base1",
    recordedPaths: ["a.ts"],
    observedPaths: ["a.ts"],
    recordedIndexDigest: "index1",
    observedIndexDigest: "index1",
    recordedWorktreeDigest: "work1",
    observedWorktreeDigest: "work1",
    ...overrides,
  };
}

describe("checkoutDecision", () => {
  test("creates the feature branch when invoked from the pinned default branch", () => {
    const d = checkoutDecision({ worktreeClean: true, currentBranch: "main", expectedBranch: "impl/100-x", defaultBranch: "main" });
    assert.deepEqual(d, { action: "create-branch", branch: "impl/100-x", reason: d.action === "create-branch" || d.action === "reuse-branch" ? d.reason : "" });
    assert.equal(d.action, "create-branch");
  });
  test("follows the observed default branch instead of hard-coded main", () => {
    const trunk = checkoutDecision({ worktreeClean: true, currentBranch: "trunk", expectedBranch: "impl/100-x", defaultBranch: "trunk" });
    assert.equal(trunk.action, "create-branch");
    const missing = checkoutDecision({ worktreeClean: true, currentBranch: "main", expectedBranch: "impl/100-x" });
    assert.equal(missing.action, "stop");
    if (missing.action === "stop") assert.match(missing.reason, /default branch/);
  });
  test("reuses the current feature branch", () => {
    const d = checkoutDecision({ worktreeClean: true, currentBranch: "impl/100-x", expectedBranch: "impl/100-x", defaultBranch: "main" });
    assert.equal(d.action, "reuse-branch");
  });
  test("verified same-run dirty edits resume instead of failing the clean-entry gate", () => {
    const d = checkoutDecision({
      worktreeClean: false,
      currentBranch: "impl/100-x",
      expectedBranch: "impl/100-x",
      defaultBranch: "main",
      continuation: continuation(),
    });
    assert.equal(d.action, "reuse-branch");
    if (d.action === "reuse-branch") assert.match(d.reason, /resume in place/);
  });
  test("unverified dirty edits route to preservation, never destructive action", () => {
    const d = checkoutDecision({ worktreeClean: false, currentBranch: "main", expectedBranch: "impl/100-x", defaultBranch: "main" });
    assert.equal(d.action, "preserve");
    if (d.action === "preserve") {
      assert.match(d.reason, /preserve/);
      assert.match(d.reason, /never discarding/);
    }
    const wrongTicket = checkoutDecision({
      worktreeClean: false,
      currentBranch: "impl/100-x",
      expectedBranch: "impl/100-x",
      defaultBranch: "main",
      continuation: continuation({ authorizedTicket: 101 }),
    });
    assert.equal(wrongTicket.action, "preserve");
  });
  test("wrong branch stops with no worktree intent", () => {
    const d = checkoutDecision({ worktreeClean: true, currentBranch: "impl/999-other", expectedBranch: "impl/100-x", defaultBranch: "main" });
    assert.equal(d.action, "stop");
    if (d.action === "stop") assert.match(d.reason, /not impl\/100-x/);
  });
  test("existing expected branch reuses automatically via a safe switch", () => {
    const d = checkoutDecision({ worktreeClean: true, currentBranch: "main", expectedBranch: "impl/100-x", defaultBranch: "main", expectedBranchExists: true });
    assert.equal(d.action, "switch-branch");
    if (d.action === "switch-branch") assert.match(d.reason, /verified existing/);
  });
  test("existing ticket branch can be reached from another clean branch", () => {
    assert.equal(checkoutDecision({ worktreeClean: true, currentBranch: "other", expectedBranch: "impl/100-x", defaultBranch: "trunk", expectedBranchExists: true }).action, "switch-branch");
  });
  test("dirty task edits never switch onto an unknown or different revision", () => {
    const base = { worktreeClean: false, currentBranch: "trunk", expectedBranch: "impl/100-x", defaultBranch: "trunk", expectedBranchExists: true, continuation: continuation() };
    assert.equal(checkoutDecision(base).action, "preserve");
    assert.equal(checkoutDecision({ ...base, expectedBranchHeadSha: "different" }).action, "preserve");
    assert.equal(checkoutDecision({ ...base, expectedBranchHeadSha: "base1" }).action, "switch-branch");
  });
  test("blank branch identity stops", () => {
    assert.equal(checkoutDecision({ worktreeClean: true, currentBranch: "", expectedBranch: "impl/100-x", defaultBranch: "main" }).action, "stop");
    assert.equal(checkoutDecision({ worktreeClean: true, currentBranch: "main", expectedBranch: "  ", defaultBranch: "main" }).action, "stop");
  });
  test("expected branch equal to the default branch stops", () => {
    const d = checkoutDecision({ worktreeClean: true, currentBranch: "main", expectedBranch: "main", defaultBranch: "main" });
    assert.equal(d.action, "stop");
  });
});

describe("isVerifiedContinuationEdits", () => {
  test("ownership requires target, revisions, exact paths, and digests", () => {
    assert.equal(isVerifiedContinuationEdits(continuation()), true);
    assert.equal(isVerifiedContinuationEdits(undefined), false);
    assert.equal(isVerifiedContinuationEdits(continuation({ authorizedTicket: 101 })), false);
    assert.equal(isVerifiedContinuationEdits(continuation({ authorizedRepository: "o/other" })), false);
    assert.equal(isVerifiedContinuationEdits(continuation({ recordedRepository: "" })), false);
    assert.equal(isVerifiedContinuationEdits(continuation({ observedBaseSha: "other" })), false);
    assert.equal(isVerifiedContinuationEdits(continuation({ observedPaths: ["a.ts", "b.ts"] })), false);
    assert.equal(isVerifiedContinuationEdits(continuation({ observedPaths: [] })), false);
    assert.equal(isVerifiedContinuationEdits(continuation({ observedIndexDigest: "other" })), false);
    assert.equal(isVerifiedContinuationEdits(continuation({ observedWorktreeDigest: "other" })), false);
    assert.equal(isVerifiedContinuationEdits(continuation({ recordedWorktreeDigest: "  " })), false);
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
