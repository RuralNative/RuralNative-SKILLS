// Fix-this checkout, push, and bookkeeping decisions (ADR-0035).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  fixBookkeepingDecision,
  fixCheckoutDecision,
  fixPushDecision,
  isForbiddenFixAction,
} from "../fix-session.ts";

describe("fixCheckoutDecision", () => {
  test("clean alias checkout at the reviewed head proceeds", () => {
    const sha = "9240da36037cf1ea6f078edf7129d733c209563e";
    assert.deepEqual(
      fixCheckoutDecision({ worktreeClean: true, localHeadSha: sha, pullRequestHeadSha: sha, reviewedHeadSha: sha, needsFeatureBranch: false }).action,
      "proceed",
    );
  });
  test("main or detached HEAD creates a feature branch before edits", () => {
    assert.deepEqual(
      fixCheckoutDecision({ worktreeClean: true, localHeadSha: "h1", pullRequestHeadSha: "h1", reviewedHeadSha: "h1", needsFeatureBranch: true }).action,
      "create-feature-branch",
    );
  });
  test("dirty or mismatched revisions stop", () => {
    assert.deepEqual(
      fixCheckoutDecision({ worktreeClean: false, localHeadSha: "h1", pullRequestHeadSha: "h1", reviewedHeadSha: "h1", needsFeatureBranch: false }).action,
      "stop",
    );
    assert.deepEqual(
      fixCheckoutDecision({ worktreeClean: true, localHeadSha: "old", pullRequestHeadSha: "h1", reviewedHeadSha: "h1", needsFeatureBranch: false }).action,
      "stop",
    );
    assert.deepEqual(
      fixCheckoutDecision({ worktreeClean: true, localHeadSha: "h1", pullRequestHeadSha: "h1", reviewedHeadSha: "old", needsFeatureBranch: false }).action,
      "stop",
    );
  });
});

describe("fixPushDecision", () => {
  const base = {
    repository: "o/r",
    pullRequestRepository: "o/r",
    pushRef: "refs/heads/feature",
    expectedHeadRef: "refs/heads/feature",
    remoteHeadSha: "h1",
    localHeadSha: "h1",
    remoteMoved: false,
  };
  test("verified head ref pushes", () => {
    assert.deepEqual(fixPushDecision(base).action, "push");
  });
  test("wrong repository, wrong ref, or moved remote stops", () => {
    assert.deepEqual(fixPushDecision({ ...base, pullRequestRepository: "x/y" }).action, "stop");
    assert.deepEqual(fixPushDecision({ ...base, pushRef: "refs/heads/other" }).action, "stop");
    assert.deepEqual(fixPushDecision({ ...base, remoteMoved: true }).action, "stop");
    assert.deepEqual(fixPushDecision({ ...base, remoteHeadSha: "other" }).action, "stop");
  });
});

describe("fixBookkeepingDecision", () => {
  test("merged PR with open ticket closes the ticket", () => {
    assert.deepEqual(
      fixBookkeepingDecision({ pullRequestState: "merged", mergeCommitSha: "m1", ticketState: "open", enumerationComplete: true }).action,
      "close-ticket",
    );
  });
  test("merged PR with closed ticket proceeds to promotion", () => {
    assert.deepEqual(
      fixBookkeepingDecision({ pullRequestState: "merged", mergeCommitSha: "m1", ticketState: "closed", enumerationComplete: true }).action,
      "promote-and-close-parent",
    );
  });
  test("open or closed-unmerged PRs never count as delivered", () => {
    assert.deepEqual(
      fixBookkeepingDecision({ pullRequestState: "open", mergeCommitSha: "", ticketState: "open", enumerationComplete: true }).action,
      "stop",
    );
    assert.deepEqual(
      fixBookkeepingDecision({ pullRequestState: "closed", mergeCommitSha: "", ticketState: "open", enumerationComplete: true }).action,
      "stop",
    );
  });
  test("missing merge commit or partial enumeration records partial progress", () => {
    assert.deepEqual(
      fixBookkeepingDecision({ pullRequestState: "merged", mergeCommitSha: "", ticketState: "open", enumerationComplete: true }).action,
      "record-partial",
    );
    assert.deepEqual(
      fixBookkeepingDecision({ pullRequestState: "merged", mergeCommitSha: "m1", ticketState: "closed", enumerationComplete: false }).action,
      "record-partial",
    );
  });
});

describe("fix authority", () => {
  test("review, CI gating, and destructive delivery actions are forbidden", () => {
    for (const action of ["invoke-review-this", "wait-for-ci", "use-ci-as-merge-gate", "bypass-branch-protection", "force-push", "close-unmerged-pull-request"]) {
      assert.equal(isForbiddenFixAction(action), true);
    }
    assert.equal(isForbiddenFixAction("squash-merge"), false);
  });
});
