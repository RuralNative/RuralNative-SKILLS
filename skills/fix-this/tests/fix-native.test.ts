// Native-state finalization recovery (ADR-0040).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { decideFixEntry, fixCheckoutDecision } from "../fix-session.ts";

describe("stale push-flag recovery", () => {
  test("verified remote result proceeds despite an unsaved push flag", () => {
    const decision = fixCheckoutDecision({
      worktreeClean: true,
      localHeadSha: "result",
      pullRequestHeadSha: "result",
      reviewedHeadSha: "start",
      needsFeatureBranch: false,
      entryAction: "resume-fixes",
      expectedHeadSha: "result",
      resumeCheckpoint: {
        startedHeadSha: "start",
        resultingHeadSha: "result",
        completedSteps: ["fixes", "evidence"],
      },
    });
    assert.equal(decision.action, "proceed");
  });
  test("unexplained remote movement still stops", () => {
    const decision = fixCheckoutDecision({
      worktreeClean: true,
      localHeadSha: "result",
      pullRequestHeadSha: "other",
      reviewedHeadSha: "start",
      needsFeatureBranch: false,
      entryAction: "resume-fixes",
      expectedHeadSha: "result",
      resumeCheckpoint: {
        startedHeadSha: "start",
        resultingHeadSha: "result",
        completedSteps: ["fixes", "evidence"],
      },
    });
    assert.equal(decision.action, "stop");
  });
});

describe("merged bookkeeping without a checkpoint", () => {
  test("verified merge associations resume bookkeeping only", () => {
    const entry = decideFixEntry({
      pullRequestState: "merged",
      hasCheckpoint: false,
      mergeVerifiedWithoutCheckpoint: true,
    });
    assert.equal(entry.action, "resume-bookkeeping");
  });
  test("unverified merges without a checkpoint still stop", () => {
    const entry = decideFixEntry({ pullRequestState: "merged", hasCheckpoint: false });
    assert.equal(entry.action, "stop");
  });
});

describe("independent fixer authority", () => {
  const checkpoint = {
    wellFormed: true,
    digestMatches: true,
    authorMatches: false,
    authorIndependentlyAuthorized: true,
    targetMatches: true,
    dispositionsCoverSource: true,
  };
  test("an authorized fixer may resume another author's review", () => {
    const entry = decideFixEntry({ pullRequestState: "open", hasCheckpoint: true, checkpoint });
    assert.equal(entry.action, "resume-fixes");
  });
  test("an unauthorized different author still stops", () => {
    const entry = decideFixEntry({
      pullRequestState: "open",
      hasCheckpoint: true,
      checkpoint: { ...checkpoint, authorIndependentlyAuthorized: false },
    });
    assert.equal(entry.action, "stop");
  });
});
