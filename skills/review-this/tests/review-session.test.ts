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
  persistentWorktreePlan,
  planRevisionReview,
  reviewCanStart,
  reviewCapabilityGate,
  reviewCategoriesComplete,
  type CategoryResult,
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
