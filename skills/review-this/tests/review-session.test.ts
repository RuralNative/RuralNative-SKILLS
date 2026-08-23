// review-this:INV-13 — persistent PR review worktrees, fresh agents, bounded operations, and escalation.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_FIX_ROUNDS,
  STRICT_REVIEW_CATEGORIES,
  canContinueAfterPublication,
  initialReviewAgents,
  initialReviewOperationPlan,
  missingReviewCategories,
  operationBudget,
  planFinalVerification,
  planFixBatch,
  planPush,
  persistentWorktreePlan,
  planRevisionReview,
  reviewCanStart,
  reviewCapabilityGate,
  reviewCategoriesComplete,
  type CategoryResult,
  type ReviewCapabilities,
  type ReviewOperationCounts,
  type ReviewStatus,
} from "../review-session.ts";

const counts: ReviewOperationCounts = {
  prWorktreeSetups: 0,
  initialFullReviews: 0,
  fixBatches: 0,
  deltaReviews: 0,
  finalVerificationRuns: 0,
};

const capabilities: ReviewCapabilities = {
  persistentPrWorktree: true,
  freshStandardsAgent: true,
  freshSpecAgent: true,
  freshFixAgent: true,
};

const published = {
  trustedSummaryUpdated: true,
  inlineFindingsVerified: true,
};

describe("persistent PR worktree", () => {
  test("review starts immediately when the PR and implementation evidence are ready", () => {
    assert.equal(reviewCanStart({
      pullRequestOpen: true,
      closingReferenceValid: true,
      headSha: "head-a",
      baseSha: "base-a",
      implementationEvidencePosted: true,
    }), true);
    assert.equal(reviewCanStart({
      pullRequestOpen: true,
      closingReferenceValid: true,
      headSha: "head-a",
      baseSha: "",
      implementationEvidencePosted: true,
    }), false);
  });

  test("active sibling implementation workers do not delay an eligible PR", () => {
    assert.equal(reviewCanStart({
      pullRequestOpen: true,
      closingReferenceValid: true,
      headSha: "head-a",
      baseSha: "base-a",
      implementationEvidencePosted: true,
      siblingImplementationWorkersActive: true,
    }), true);
  });

  test("creates once and reuses the same pinned worktree through review", () => {
    const first = persistentWorktreePlan({
      prNumber: 157,
      worktreeExists: false,
      workerSessionExists: false,
      pinnedHeadSha: "head-a",
      pinnedBaseSha: "base-a",
    });
    const later = persistentWorktreePlan({
      prNumber: 157,
      worktreeExists: true,
      workerSessionExists: true,
      pinnedHeadSha: "head-b",
      pinnedBaseSha: "base-a",
    });
    assert.equal(first.action, "create");
    assert.equal(later.action, "reuse");
    assert.equal(persistentWorktreePlan({
      prNumber: 157,
      worktreeExists: true,
      workerSessionExists: false,
      pinnedHeadSha: "head-c",
      pinnedBaseSha: "base-a",
    }).action, "reuse");
    assert.deepEqual(initialReviewAgents(), ["standards", "spec"]);
  });

  test("stops before a verdict when fresh nested agents are unavailable", () => {
    const decision = reviewCapabilityGate(
      {
        persistentPrWorktree: true,
        freshStandardsAgent: true,
        freshSpecAgent: false,
        freshFixAgent: true,
      },
      "initial-review",
    );
    assert.equal(decision.allowed, false);
    assert.match(decision.reason ?? "", /fresh Standards and Spec/);
  });
});

describe("review operation budgets", () => {
  test("allows one setup and initial full review, two fix batches, and one final gate", () => {
    assert.equal(operationBudget(counts, "pr-worktree-setup").allowed, true);
    assert.equal(operationBudget(counts, "initial-full-review").allowed, true);
    assert.equal(operationBudget({ ...counts, fixBatches: MAX_FIX_ROUNDS }, "fix-batch").allowed, false);
    assert.equal(operationBudget({ ...counts, finalVerificationRuns: 1 }, "final-verification").allowed, false);
    assert.deepEqual(initialReviewOperationPlan(counts), {
      allowed: true,
      operations: ["pr-worktree-setup", "initial-full-review"],
    });
    assert.equal(initialReviewOperationPlan({ ...counts, prWorktreeSetups: 1 }).allowed, false);
  });
});

describe("full versus delta review", () => {
  test("initial review is full and later ordinary changes are delta", () => {
    assert.equal(planRevisionReview({ initialRevision: true, baseMoved: false }).depth, "full");
    assert.equal(planRevisionReview({ initialRevision: false, baseMoved: false }).depth, "delta");
  });

  test("every named risk trigger escalates later review to full", () => {
    for (const trigger of [
      "new-affected-seam",
      "trust-boundary",
      "schema",
      "dependency-state",
      "generated-contract",
      "public-interface",
      "materially-widened-diff",
    ] as const) {
      const plan = planRevisionReview({
        initialRevision: false,
        baseMoved: true,
        triggers: { [trigger]: true },
      });
      assert.equal(plan.depth, "full", trigger);
      assert.deepEqual(plan.triggers, [trigger], trigger);
    }
  });
});

describe("strict review category coverage", () => {
  test("records every category through pass, not-applicable, advisory, and blocking fixtures", () => {
    const statuses: ReviewStatus[] = ["blocking", "not-applicable", "advisory", "passed"];
    const results: CategoryResult[] = STRICT_REVIEW_CATEGORIES.map((category, index) => ({
      category,
      status: statuses[index % statuses.length],
      evidence: `evidence-${category}`,
    }));
    assert.deepEqual(
      [...new Set(results.map((result) => result.status))].sort(),
      [...statuses].sort(),
    );
    assert.equal(missingReviewCategories(results).length, 0);
    assert.equal(reviewCategoriesComplete(results), true);
    assert.equal(reviewCategoriesComplete(results.slice(0, -1)), false);
  });
});

describe("publication gate", () => {
  test("a failed summary or inline publication stops fixes and merge", () => {
    assert.equal(canContinueAfterPublication({ trustedSummaryUpdated: true, inlineFindingsVerified: true }), true);
    assert.equal(canContinueAfterPublication({ trustedSummaryUpdated: false, inlineFindingsVerified: true }), false);
    assert.equal(canContinueAfterPublication({ trustedSummaryUpdated: true, inlineFindingsVerified: false }), false);
  });
});

describe("fresh fix batches and bounded rereview", () => {
  test("one fresh fix context receives all blocking findings and safe advisories", () => {
    const plan = planFixBatch({
      findings: [
        { id: "blocking-1", severity: "blocking" },
        { id: "advisory-1", severity: "advisory" },
      ],
      roundsUsed: 0,
      capabilities,
      publication: published,
      approvedAffectedSeams: ["review-this"],
      rootCauseExpansion: {
        paths: ["skills/review-this/sibling.ts"],
        affectedSeams: ["review-this"],
      },
    });
    assert.equal(plan.action, "fix");
    assert.equal(plan.createsFixRound, true);
    assert.deepEqual(plan.findings.map((finding) => finding.id), ["blocking-1", "advisory-1"]);
    assert.deepEqual(plan.expandedPaths, ["skills/review-this/sibling.ts"]);
    assert.deepEqual(plan.expandedAffectedSeams, ["review-this"]);
  });

  test("advisory-only findings are deferred without a fix round", () => {
    const plan = planFixBatch({
      findings: [{ id: "advisory-1", severity: "advisory" }],
      roundsUsed: 2,
      capabilities: { ...capabilities, freshFixAgent: false },
      publication: published,
    });
    assert.equal(plan.action, "defer-advisories");
    assert.equal(plan.allowed, true);
    assert.equal(plan.createsFixRound, false);
    assert.equal(plan.deferredAdvisories.length, 1);
  });

  test("root-cause expansion outside approved seams stops the fix", () => {
    const plan = planFixBatch({
      findings: [{ id: "blocking-1", severity: "blocking" }],
      roundsUsed: 0,
      capabilities,
      publication: published,
      approvedAffectedSeams: ["review-this"],
      rootCauseExpansion: {
        paths: ["skills/plan-this/unrelated.ts"],
        affectedSeams: ["plan-this"],
      },
    });
    assert.equal(plan.allowed, false);
    assert.match(plan.reason, /approved affected seams/);
  });

  test("publication or fresh-agent failure stops a blocking fix", () => {
    const base = {
      findings: [{ id: "blocking-1", severity: "blocking" as const }],
      roundsUsed: 0,
      capabilities,
      publication: published,
    };
    assert.equal(planFixBatch({ ...base, publication: { trustedSummaryUpdated: false, inlineFindingsVerified: true } }).allowed, false);
    assert.equal(planFixBatch({ ...base, capabilities: { ...capabilities, freshFixAgent: false } }).allowed, false);
  });
});

describe("final verification repair", () => {
  test("a failed final gate consumes one round and receives delta or escalated review", () => {
    const delta = planFinalVerification({
      passed: false,
      roundsUsed: 0,
      capabilities,
      publication: published,
    });
    assert.equal(delta.action, "repair");
    assert.equal(delta.consumesFixRound, true);
    assert.equal(delta.review?.depth, "delta");

    const full = planFinalVerification({
      passed: false,
      roundsUsed: 1,
      capabilities,
      publication: published,
      triggers: { "dependency-state": true },
    });
    assert.equal(full.action, "repair");
    assert.equal(full.review?.depth, "full");
  });

  test("a third repair is refused and a passing final gate completes", () => {
    const exhausted = planFinalVerification({
      passed: false,
      roundsUsed: MAX_FIX_ROUNDS,
      capabilities,
      publication: published,
    });
    assert.equal(exhausted.action, "stop");
    assert.equal(exhausted.allowed, false);
    assert.match(exhausted.reason, /at most 2/);

    const complete = planFinalVerification({
      passed: true,
      roundsUsed: MAX_FIX_ROUNDS,
      capabilities,
      publication: published,
    });
    assert.equal(complete.action, "complete");
    assert.equal(complete.allowed, true);
  });
});

describe("review push trust", () => {
  test("same-repository updates require fast-forward and forks stay static", () => {
    assert.equal(planPush("same-repository", true).action, "fast-forward-push");
    assert.equal(planPush("same-repository", false).allowed, false);
    assert.equal(planPush("untrusted-fork", false).action, "static-review");
    assert.equal(planPush("untrusted-fork", false).allowed, true);
  });
});
