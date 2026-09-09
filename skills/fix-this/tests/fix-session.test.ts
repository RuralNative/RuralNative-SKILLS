// Fix-this checkout, push, and bookkeeping decisions (ADR-0035).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  decideFixEntry,
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

describe("decideFixEntry (ADR-0038)", () => {
  const reconciled = {
    wellFormed: true,
    digestMatches: true,
    authorMatches: true,
    targetMatches: true,
    dispositionsCoverSource: true,
  };
  test("open PR without a checkpoint starts fresh", () => {
    const decision = decideFixEntry({ pullRequestState: "open", hasCheckpoint: false });
    assert.equal(decision.action, "fresh");
  });
  test("reconciled checkpoint on an open PR resumes missing fixes", () => {
    const decision = decideFixEntry({ pullRequestState: "open", hasCheckpoint: true, checkpoint: reconciled });
    assert.equal(decision.action, "resume-fixes");
  });
  test("confirmed merged PR resumes bookkeeping only with a reconciled checkpoint", () => {
    const decision = decideFixEntry({ pullRequestState: "merged", hasCheckpoint: true, checkpoint: reconciled });
    assert.equal(decision.action, "resume-bookkeeping");
    assert.equal(
      decideFixEntry({ pullRequestState: "merged", hasCheckpoint: true, checkpoint: { ...reconciled, digestMatches: false } }).action,
      "stop",
    );
    assert.equal(
      decideFixEntry({ pullRequestState: "merged", hasCheckpoint: false }).action,
      "stop",
    );
  });
  test("closed-unmerged PRs and unreconciled checkpoints stop", () => {
    assert.equal(decideFixEntry({ pullRequestState: "closed", hasCheckpoint: true, checkpoint: reconciled }).action, "stop");
    assert.equal(decideFixEntry({ pullRequestState: "open", hasCheckpoint: true, checkpoint: reconciled }).action, "resume-fixes");
    assert.equal(decideFixEntry({ pullRequestState: "open", hasCheckpoint: true, checkpoint: { ...reconciled, authorMatches: false } }).action, "stop");
    assert.equal(decideFixEntry({ pullRequestState: "open", hasCheckpoint: true, checkpoint: { ...reconciled, wellFormed: false } }).action, "stop");
    assert.equal(decideFixEntry({ pullRequestState: "open", hasCheckpoint: true, checkpoint: { ...reconciled, targetMatches: false } }).action, "stop");
    assert.equal(decideFixEntry({ pullRequestState: "open", hasCheckpoint: true, checkpoint: { ...reconciled, dispositionsCoverSource: false } }).action, "stop");
    assert.equal(decideFixEntry({ pullRequestState: "open", hasCheckpoint: true }).action, "stop");
  });
  test("checkpoint trust is derived from the parts, never one caller flag", () => {
    const open = decideFixEntry({ pullRequestState: "open", hasCheckpoint: true, checkpoint: reconciled });
    assert.equal(open.action, "resume-fixes");
    for (const partial of [
      { ...reconciled, wellFormed: false },
      { ...reconciled, digestMatches: false },
      { ...reconciled, authorMatches: false },
      { ...reconciled, targetMatches: false },
      { ...reconciled, dispositionsCoverSource: false },
    ]) {
      const decision = decideFixEntry({ pullRequestState: "open", hasCheckpoint: true, checkpoint: partial });
      assert.equal(decision.action, "stop", JSON.stringify(partial));
    }
    const missingParts = decideFixEntry({ pullRequestState: "open", hasCheckpoint: true, checkpoint: undefined });
    assert.equal(missingParts.action, "stop");
  });
  test("resume checkouts match the checkpoint's resulting head and recorded remote state", () => {
    const checkpoint = { startedHeadSha: "h1", resultingHeadSha: "h2", completedSteps: ["fixes", "evidence"] };
    const resume = {
      worktreeClean: true,
      localHeadSha: "h2",
      pullRequestHeadSha: "h1",
      reviewedHeadSha: "h1",
      needsFeatureBranch: false,
      entryAction: "resume-fixes" as const,
      expectedHeadSha: "h2",
      resumeCheckpoint: checkpoint,
    };
    assert.equal(fixCheckoutDecision(resume).action, "proceed");
    const localMismatch = { ...resume, localHeadSha: "h1", expectedHeadSha: "h2" };
    assert.equal(fixCheckoutDecision(localMismatch).action, "stop");
    const remoteMoved = { ...resume, pullRequestHeadSha: "h3" };
    assert.equal(fixCheckoutDecision(remoteMoved).action, "stop");
    const pushed = {
      ...resume,
      resumeCheckpoint: { ...checkpoint, completedSteps: ["fixes", "evidence", "push"] },
      pullRequestHeadSha: "h2",
    };
    assert.equal(fixCheckoutDecision(pushed).action, "proceed");
    const pushedRemoteStale = { ...pushed, pullRequestHeadSha: "h1" };
    assert.equal(fixCheckoutDecision(pushedRemoteStale).action, "stop");
    const missingCheckpoint = { ...resume, resumeCheckpoint: undefined };
    assert.equal(fixCheckoutDecision(missingCheckpoint).action, "stop");
    const bookkeeping = { worktreeClean: true, localHeadSha: "h1", pullRequestHeadSha: "h2", reviewedHeadSha: "h1", needsFeatureBranch: false, entryAction: "resume-bookkeeping" as const };
    assert.equal(fixCheckoutDecision(bookkeeping).action, "proceed");
  });
});

describe("fixPushDecision", () => {
  const base = {
    repository: "o/r",
    pullRequestRepository: "o/r",
    pushRef: "refs/heads/feature",
    expectedHeadRef: "refs/heads/feature",
    recordedRemoteHeadSha: "h1",
    observedRemoteHeadSha: "h1",
    localHeadSha: "h2",
  };
  test("a meaningful push of the verified result proceeds", () => {
    assert.deepEqual(fixPushDecision(base).action, "push");
  });
  test("wrong repository, wrong ref, moved remote, or a no-op push stops", () => {
    assert.deepEqual(fixPushDecision({ ...base, pullRequestRepository: "x/y" }).action, "stop");
    assert.deepEqual(fixPushDecision({ ...base, pushRef: "refs/heads/other" }).action, "stop");
    assert.deepEqual(fixPushDecision({ ...base, observedRemoteHeadSha: "other" }).action, "stop");
    assert.deepEqual(fixPushDecision({ ...base, localHeadSha: "h1" }).action, "stop");
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
