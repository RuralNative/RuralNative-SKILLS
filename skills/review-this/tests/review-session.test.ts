// review-this:INV-13 — persistent PR review worktrees, fresh agents, bounded operations, and escalation.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_FIX_ROUNDS,
  MAX_MANAGED_WORKERS_PER_WORKSPACE,
  MAX_REVIEW_WORKERS_PER_STAGE,
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
  planReviewWaveDispatch,
  persistentWorktreePlan,
  planRevisionReview,
  reviewCanStart,
  reviewCapabilityGate,
  reviewCategoriesComplete,
  reviewCleanupDecision,
  lifecycleOutcomeForStopAction,
  type CategoryResult,
  type PersistentPrWorkerFact,
  type PersistentWorktreeFact,
  type ReviewCapabilities,
  type ReviewCleanupFact,
  type ReviewOperationCounts,
  type ReviewStatus,
} from "../review-session.ts";
import type { ReviewWaveItem } from "../discovery.ts";

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
    assert.deepEqual(initialReviewAgents(), ["standards", "spec"]);
  });

  test("an existing worktree whose session disappeared is recovery-required, never duplicated or deleted", () => {
    const plan = persistentWorktreePlan({
      prNumber: 157,
      worktreeExists: true,
      workerSessionExists: false,
      worktreePath: ".kilo/worktrees/177-bounded-orientation",
      branchName: "177-bounded-orientation",
      pinnedHeadSha: "head-a",
      pinnedBaseSha: "base-a",
    });
    assert.equal(plan.action, "recovery-required");
    assert.equal(plan.prNumber, 157);
    assert.equal(plan.worktreePath, ".kilo/worktrees/177-bounded-orientation");
    assert.equal(plan.branchName, "177-bounded-orientation");
  });

  test("a missing session without a reported worktree path fails closed instead of inventing one", () => {
    const plan = persistentWorktreePlan({
      prNumber: 157,
      worktreeExists: true,
      workerSessionExists: false,
      pinnedHeadSha: "head-a",
      pinnedBaseSha: "base-a",
    });
    assert.equal(plan.action, "recovery-required");
    assert.equal(plan.worktreePath, undefined);
    assert.equal(plan.branchName, undefined);
  });

  test("a pre-ADR-0023 fact without a worktree state never creates; it reports recovery-required", () => {
    const plan = persistentWorktreePlan({
      prNumber: 157,
      // `worktreeExists` is absent — the pre-ADR-0023 fact shape.
      workerSessionExists: false,
      pinnedHeadSha: "head-a",
      pinnedBaseSha: "base-a",
    } as unknown as PersistentWorktreeFact);
    assert.equal(plan.action, "recovery-required");
    assert.equal(plan.worktreePath, undefined);
    assert.equal(plan.branchName, undefined);
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

describe("review cleanup and recovery", () => {
  const durable: ReviewCleanupFact = {
    prNumber: 157,
    lifecycleOutcome: "succeeded",
    worktreeExists: true,
    worktreeClean: true,
    localHeadSha: "sha-a",
    remoteBranchSha: "sha-a",
    pullRequestHeadSha: "sha-a",
    merged: true,
    unpushedFix: false,
    hostClosesWorktrees: true,
  };

  test("review cleanup preserves session and worktree for every non-terminal or unrecoverable state", () => {
    const table: Array<[string, Partial<ReviewCleanupFact>, string]> = [
      ["review still running preserves", { lifecycleOutcome: "running" }, "preserved-for-resume"],
      ["interrupted review preserves", { lifecycleOutcome: "interrupted" }, "preserved-for-resume"],
      ["offline review preserves for diagnosis", { lifecycleOutcome: "offline" }, "preserved-for-diagnosis"],
      ["failed review preserves for diagnosis", { lifecycleOutcome: "failed" }, "preserved-for-diagnosis"],
      ["blocked review preserves for diagnosis", { lifecycleOutcome: "blocked" }, "preserved-for-diagnosis"],
      ["needs-info review preserves for diagnosis", { lifecycleOutcome: "needs-info" }, "preserved-for-diagnosis"],
      ["dirty worktree preserves", { worktreeClean: false }, "preserved-for-resume"],
      ["absent remote SHA fails closed", { remoteBranchSha: "" }, "preserved-for-resume"],
      ["local/remote mismatch preserves", { remoteBranchSha: "sha-b" }, "preserved-for-resume"],
      ["remote/PR head mismatch preserves", { pullRequestHeadSha: "sha-b" }, "preserved-for-resume"],
      ["unmerged terminal review preserves", { merged: false }, "preserved-for-resume"],
      ["unpushed fix preserves", { unpushedFix: true }, "preserved-for-resume"],
      ["missing worktree preserves", { worktreeExists: false }, "preserved-for-resume"],
    ];
    for (const [name, patch, report] of table) {
      const decision = reviewCleanupDecision({ ...durable, ...patch });
      assert.equal(decision.stopSession, false, `${name}: session preserved`);
      assert.equal(decision.removeWorktree, false, `${name}: worktree preserved`);
      assert.equal(decision.report, report, name);
    }
  });

  test("a merged terminal review with exact SHA equality allows cleanup", () => {
    const closing = reviewCleanupDecision(durable);
    assert.equal(closing.stopSession, true);
    assert.equal(closing.removeWorktree, true);
    assert.equal(closing.report, "removed");
    const nonClosing = reviewCleanupDecision({ ...durable, hostClosesWorktrees: false });
    assert.equal(nonClosing.stopSession, true);
    assert.equal(nonClosing.removeWorktree, false);
    assert.equal(nonClosing.report, "cleanup-pending");
  });

  test("planner stop actions map to blocked or needs-info, never to a worker stop", () => {
    const table: Array<[string, string]> = [
      ["publication failure blocks", "review publication is incomplete; fixes and merge must stop"],
      ["missing capability blocks", "fresh fix context is unavailable"],
      ["fix-budget exhaustion blocks", "at most 2 code-fix rounds are allowed per pull request"],
      ["conflict stop blocks", "conflict resolution consumes one bounded fix round"],
      ["root-cause expansion blocks", "root-cause expansion is outside the approved affected seams"],
      ["needs-info stop is preserved", "continued failure adds needs-info and stops"],
    ];
    for (const [name, reason] of table) {
      const outcome = lifecycleOutcomeForStopAction(reason);
      if (reason.includes("needs-info")) {
        assert.equal(outcome, "needs-info", name);
      } else {
        assert.equal(outcome, "blocked", name);
      }
      const decision = reviewCleanupDecision({ ...durable, lifecycleOutcome: outcome });
      assert.equal(decision.stopSession, false, `${name}: worker session preserved`);
    }
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
    c.deltaReviews += 3;
    assert.equal(operationBudget({ ...c, deltaReviews: Number.MAX_SAFE_INTEGER }, "delta-review").allowed, true);
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

describe("bounded review-wave fan-out (plan #170)", () => {
  const wave = (count: number): ReviewWaveItem[] =>
    Array.from({ length: count }, (_, i) => ({
      ticket: 200 + i,
      prNumber: 10 + i,
      headSha: `head-${i}`,
      baseSha: `base-${i}`,
      mergeable: true,
      requiredChecksGreen: true,
    }));
  const emptyFact = {
    workers: [],
    activeManagedWorkers: 0,
    availableWorkspaceSlots: Number.MAX_SAFE_INTEGER,
  };

  test("empty capacity defers every ready PR without creating a worker", () => {
    const plan = planReviewWaveDispatch({
      wave: wave(2),
      ...emptyFact,
      availableWorkspaceSlots: 0,
    });
    assert.deepEqual(plan.reuse, []);
    assert.deepEqual(plan.create, []);
    assert.equal(plan.deferredByCapacity.length, 2);
    for (const deferred of plan.deferredByCapacity) {
      assert.match(deferred.reason, /no available worker-start slots/);
    }
  });

  test("partial capacity fills every available slot in native order and defers the rest", () => {
    const plan = planReviewWaveDispatch({
      wave: wave(3),
      ...emptyFact,
      availableWorkspaceSlots: 2,
    });
    assert.deepEqual(plan.create.map((item) => item.prNumber), [10, 11]);
    assert.deepEqual(plan.deferredByCapacity.map((item) => item.prNumber), [12]);
    assert.match(plan.deferredByCapacity[0].reason, /no available worker-start slots/);
  });

  test("four ready PRs dispatch at most three stage workers", () => {
    assert.equal(MAX_REVIEW_WORKERS_PER_STAGE, 3);
    const plan = planReviewWaveDispatch({ wave: wave(4), ...emptyFact });
    assert.deepEqual(plan.create.map((item) => item.prNumber), [10, 11, 12]);
    assert.deepEqual(plan.deferredByCapacity.map((item) => item.prNumber), [13]);
    assert.match(plan.deferredByCapacity[0].reason, /at most 3 review workers/);
    assert.equal(plan.activeReviewWorkers, 3);
  });

  test("existing running workers are reused instead of duplicated", () => {
    const plan = planReviewWaveDispatch({
      wave: wave(1),
      ...emptyFact,
      workers: [{
        prNumber: 10,
        workerSessionExists: true,
        worktreeExists: true,
        pinnedHeadSha: "head-0",
        pinnedBaseSha: "base-0",
      }],
    });
    assert.deepEqual(plan.reuse.map((item) => item.prNumber), [10]);
    assert.deepEqual(plan.create, []);
    assert.equal(plan.deferredByCapacity.length, 0);
    assert.equal(plan.activeReviewWorkers, 1);
  });

  test("a stopped worker with no prior worktree restarts through one create instead of duplicating", () => {
    const plan = planReviewWaveDispatch({
      wave: wave(1),
      ...emptyFact,
      workers: [{
        prNumber: 10,
        workerSessionExists: false,
        worktreeExists: false,
        pinnedHeadSha: "head-0",
        pinnedBaseSha: "base-0",
      }],
    });
    assert.deepEqual(plan.reuse, []);
    assert.deepEqual(plan.create.map((item) => item.prNumber), [10]);
  });

  test("a missing session with an existing worktree is recovery-required, never a duplicate creation", () => {
    const plan = planReviewWaveDispatch({
      wave: wave(1),
      ...emptyFact,
      workers: [{
        prNumber: 10,
        workerSessionExists: false,
        worktreeExists: true,
        worktreePath: ".kilo/worktrees/10-bounded-orientation",
        branchName: "10-bounded-orientation",
        pinnedHeadSha: "head-0",
        pinnedBaseSha: "base-0",
      }],
    });
    assert.deepEqual(plan.reuse, []);
    assert.deepEqual(plan.create, []);
    assert.equal(plan.recovery.length, 1);
    assert.equal(plan.recovery[0].prNumber, 10);
    assert.equal(plan.recovery[0].worktreePath, ".kilo/worktrees/10-bounded-orientation");
    assert.equal(plan.recovery[0].branchName, "10-bounded-orientation");
  });

  test("a missing session with an existing worktree but no reported path defers instead of creating", () => {
    const plan = planReviewWaveDispatch({
      wave: wave(1),
      ...emptyFact,
      workers: [{
        prNumber: 10,
        workerSessionExists: false,
        worktreeExists: true,
        pinnedHeadSha: "head-0",
        pinnedBaseSha: "base-0",
      }],
    });
    assert.deepEqual(plan.reuse, []);
    assert.deepEqual(plan.create, []);
    assert.deepEqual(plan.recovery, []);
    assert.equal(plan.deferredByCapacity.length, 1);
    assert.match(plan.deferredByCapacity[0].reason, /recovery is required/);
  });

  test("a worker fact captured before ADR-0023 without a worktree state fails closed instead of creating", () => {
    const plan = planReviewWaveDispatch({
      wave: wave(1),
      ...emptyFact,
      workers: [{
        prNumber: 10,
        workerSessionExists: false,
        // `worktreeExists` is absent — the pre-ADR-0023 fact shape.
        pinnedHeadSha: "head-0",
        pinnedBaseSha: "base-0",
      } as unknown as PersistentPrWorkerFact],
    });
    assert.deepEqual(plan.reuse, []);
    assert.deepEqual(plan.create, []);
    assert.deepEqual(plan.recovery, []);
    assert.equal(plan.deferredByCapacity.length, 1);
    assert.match(plan.deferredByCapacity[0].reason, /no recorded worktree state/);
  });

  test("recovery items count against the stage cap in mixed waves", () => {
    const items = wave(4);
    const plan = planReviewWaveDispatch({
      wave: items,
      ...emptyFact,
      workers: [
        {
          prNumber: 10,
          workerSessionExists: false,
          worktreeExists: true,
          worktreePath: ".kilo/worktrees/10-bounded-orientation",
          branchName: "10-bounded-orientation",
          pinnedHeadSha: "head-0",
          pinnedBaseSha: "base-0",
        },
      ],
    });
    // PR 10 is recovery (counts 1), then 11 and 12 create (counts 2 and 3);
    // the stage cap of three stops PR 13.
    assert.equal(plan.recovery.length, 1);
    assert.deepEqual(plan.create.map((item) => item.prNumber), [11, 12]);
    assert.deepEqual(plan.deferredByCapacity.map((item) => item.prNumber), [13]);
    assert.equal(plan.activeReviewWorkers, 3);
  });

  test("two PRs pinning one revision pair never receive two workers", () => {
    const shared: ReviewWaveItem[] = [
      { ticket: 200, prNumber: 10, headSha: "head-x", baseSha: "base-x", mergeable: true, requiredChecksGreen: true },
      { ticket: 201, prNumber: 11, headSha: "head-x", baseSha: "base-x", mergeable: true, requiredChecksGreen: true },
    ];
    const plan = planReviewWaveDispatch({ wave: shared, ...emptyFact });
    assert.deepEqual(plan.create.map((item) => item.prNumber), [10]);
    assert.deepEqual(plan.deferredByCapacity.map((item) => item.prNumber), [11]);
    assert.match(plan.deferredByCapacity[0].reason, /already pins this head-and-base pair/);
  });

  test("native child order survives mixed reuse and creation", () => {
    const items = wave(4);
    const plan = planReviewWaveDispatch({
      wave: [items[1], items[0], items[3], items[2]],
      ...emptyFact,
      workers: [{
        prNumber: 11,
        workerSessionExists: true,
        worktreeExists: true,
        pinnedHeadSha: "head-1",
        pinnedBaseSha: "base-1",
      }],
    });
    // Reuse first (native position), then creates fill slots in that same
    // order [11, 10, 13, 12] until the stage cap stops the fourth.
    assert.deepEqual(plan.reuse.map((item) => item.prNumber), [11]);
    assert.deepEqual(plan.create.map((item) => item.prNumber), [10, 13]);
    assert.deepEqual(
      [...plan.reuse, ...plan.create].map((item) => item.ticket),
      [201, 200, 203],
    );
    assert.deepEqual(plan.deferredByCapacity.map((item) => item.prNumber), [12]);
  });

  test("the workspace four-worker cap defers new starts even with free slots", () => {
    assert.equal(MAX_MANAGED_WORKERS_PER_WORKSPACE, 4);
    const plan = planReviewWaveDispatch({
      wave: wave(2),
      ...emptyFact,
      activeManagedWorkers: MAX_MANAGED_WORKERS_PER_WORKSPACE,
    });
    assert.deepEqual(plan.create, []);
    assert.equal(plan.deferredByCapacity.length, 2);
    for (const deferred of plan.deferredByCapacity) {
      assert.match(deferred.reason, /workspace cap allows at most 4 managed workers/);
    }
  });

  test("reuse does not consume a workspace start slot while creates do", () => {
    const items = wave(3);
    const plan = planReviewWaveDispatch({
      wave: items,
      ...emptyFact,
      activeManagedWorkers: 3,
      availableWorkspaceSlots: 1,
      workers: [{
        prNumber: 10,
        workerSessionExists: true,
        worktreeExists: true,
        pinnedHeadSha: "head-0",
        pinnedBaseSha: "base-0",
      }],
    });
    assert.deepEqual(plan.reuse.map((item) => item.prNumber), [10]);
    assert.deepEqual(plan.create.map((item) => item.prNumber), [11]);
    assert.deepEqual(plan.deferredByCapacity.map((item) => item.prNumber), [12]);
  });
});
