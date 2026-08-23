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
  planConflictResolution,
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

  test("a blocking fix at the round maximum is refused", () => {
    const plan = planFixBatch({
      findings: [{ id: "blocking-1", severity: "blocking" }],
      roundsUsed: MAX_FIX_ROUNDS,
      capabilities,
      publication: published,
    });
    assert.equal(plan.action, "stop");
    assert.equal(plan.allowed, false);
    assert.match(plan.reason, /at most 2/);
  });
});

describe("conflict resolution and base refresh", () => {
  test("a conflict-free base refresh consumes no fix round", () => {
    const plan = planConflictResolution({ hasConflict: false, roundsUsed: MAX_FIX_ROUNDS });
    assert.equal(plan.action, "base-refresh");
    assert.equal(plan.allowed, true);
    assert.equal(plan.consumesFixRound, false);
    assert.equal(plan.review, undefined);
  });

  test("conflict resolution consumes one round and receives semantic review", () => {
    const plan = planConflictResolution({ hasConflict: true, roundsUsed: 1 });
    assert.equal(plan.action, "resolve");
    assert.equal(plan.allowed, true);
    assert.equal(plan.consumesFixRound, true);
    assert.equal(plan.review?.depth, "delta");
  });

  test("a conflict at the round maximum is refused", () => {
    const plan = planConflictResolution({ hasConflict: true, roundsUsed: MAX_FIX_ROUNDS });
    assert.equal(plan.action, "stop");
    assert.equal(plan.allowed, false);
    assert.match(plan.reason, /at most 2/);
  });
});

describe("operation counts across lifecycle paths", () => {
  const start = (): ReviewOperationCounts => ({ ...counts });
  const blocking = [{ id: "blocking-1", severity: "blocking" as const }];

  test("clean path: one setup, one initial review, one final gate, each exhausted after use", () => {
    const c = start();
    assert.equal(operationBudget(c, "pr-worktree-setup").allowed, true);
    c.prWorktreeSetups += 1;
    assert.equal(operationBudget(c, "pr-worktree-setup").allowed, false);
    assert.equal(operationBudget(c, "initial-full-review").allowed, true);
    c.initialFullReviews += 1;
    assert.equal(operationBudget(c, "initial-full-review").allowed, false);
    assert.equal(operationBudget(c, "final-verification").allowed, true);
    c.finalVerificationRuns += 1;
    assert.equal(operationBudget(c, "final-verification").allowed, false);
  });

  test("one-fix path: fix round one, delta rereview, final gate, second round still available", () => {
    const c = start();
    c.prWorktreeSetups = 1;
    c.initialFullReviews = 1;
    const fix = planFixBatch({ findings: blocking, roundsUsed: 0, capabilities, publication: published });
    assert.equal(fix.allowed, true);
    assert.equal(fix.createsFixRound, true);
    c.fixBatches += 1;
    assert.equal(operationBudget(c, "delta-review").allowed, true);
    c.deltaReviews += 1;
    assert.equal(operationBudget(c, "final-verification").allowed, true);
    c.finalVerificationRuns += 1;
    assert.equal(operationBudget(c, "final-verification").allowed, false);
    assert.equal(operationBudget(c, "fix-batch").allowed, true);
  });

  test("two-fix path: both rounds run with delta rereviews, third fix refused", () => {
    const c = start();
    c.prWorktreeSetups = 1;
    c.initialFullReviews = 1;
    for (let roundsUsed = 0; roundsUsed < MAX_FIX_ROUNDS; roundsUsed += 1) {
      const fix = planFixBatch({ findings: blocking, roundsUsed, capabilities, publication: published });
      assert.equal(fix.allowed, true, `round ${roundsUsed}`);
      assert.equal(fix.createsFixRound, true, `round ${roundsUsed}`);
      c.fixBatches += 1;
      assert.equal(operationBudget(c, "delta-review").allowed, true);
      c.deltaReviews += 1;
    }
    assert.deepEqual(
      { setups: c.prWorktreeSetups, initial: c.initialFullReviews, fixes: c.fixBatches },
      { setups: 1, initial: 1, fixes: MAX_FIX_ROUNDS },
    );
    assert.equal(operationBudget(c, "fix-batch").allowed, false);
    const refused = planFixBatch({
      findings: blocking,
      roundsUsed: MAX_FIX_ROUNDS,
      capabilities,
      publication: published,
    });
    assert.equal(refused.action, "stop");
    assert.match(refused.reason, /at most 2/);
  });

  test("base-delta path: base movement triggers delta review without consuming a fix round", () => {
    const c = start();
    c.prWorktreeSetups = 1;
    c.initialFullReviews = 1;
    const review = planRevisionReview({ initialRevision: false, baseMoved: true });
    assert.equal(review.depth, "delta");
    c.deltaReviews += 1;
    assert.equal(operationBudget(c, "delta-review").allowed, true);
    c.deltaReviews += 2;
    assert.equal(operationBudget(c, "delta-review").allowed, true);
    assert.equal(operationBudget(c, "fix-batch").allowed, true);
    assert.equal(c.fixBatches, 0);
  });

  test("conflict path: conflict-free refresh keeps the budget, conflict consumes one, conflict at the maximum stops", () => {
    const c = start();
    c.prWorktreeSetups = 1;
    c.initialFullReviews = 1;
    const refresh = planConflictResolution({ hasConflict: false, roundsUsed: 0 });
    assert.equal(refresh.action, "base-refresh");
    assert.equal(refresh.consumesFixRound, false);
    assert.equal(c.fixBatches, 0);
    const resolve = planConflictResolution({ hasConflict: true, roundsUsed: 0 });
    assert.equal(resolve.action, "resolve");
    assert.equal(resolve.consumesFixRound, true);
    c.fixBatches += 1;
    assert.equal(operationBudget(c, "fix-batch").allowed, true);
    const exhausted = planConflictResolution({ hasConflict: true, roundsUsed: MAX_FIX_ROUNDS });
    assert.equal(exhausted.action, "stop");
    assert.equal(exhausted.allowed, false);
  });

  test("final-verification-repair path: failed gate repairs through one round, then stops", () => {
    const c = start();
    c.prWorktreeSetups = 1;
    c.initialFullReviews = 1;
    assert.equal(operationBudget(c, "final-verification").allowed, true);
    const repair = planFinalVerification({ passed: false, roundsUsed: 0, capabilities, publication: published });
    assert.equal(repair.action, "repair");
    assert.equal(repair.consumesFixRound, true);
    assert.equal(repair.review?.depth, "delta");
    c.fixBatches += 1;
    c.finalVerificationRuns += 1;
    assert.equal(operationBudget(c, "final-verification").allowed, false);
    const refused = planFinalVerification({
      passed: false,
      roundsUsed: MAX_FIX_ROUNDS,
      capabilities,
      publication: published,
    });
    assert.equal(refused.action, "stop");
    assert.match(refused.reason, /at most 2/);
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
