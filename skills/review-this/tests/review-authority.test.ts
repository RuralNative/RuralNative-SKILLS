// review-this:INV-14 — frontier review authority and mutation-worker routing (#173).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  FRONTIER_OWNED_RESPONSIBILITIES,
  REQUIRED_STANDARDS_CATEGORIES,
  TRIGGERED_STANDARDS_CHECKS,
  WORKER_STATE_CHANGES,
  canPerformMerge,
  canRunMutationWorker,
  canRunReadOnlyReviewer,
  classifyCandidateCompleteness,
  frontierOwns,
  isStandardsCategoryTransportReady,
  planDeduplication,
  planSpecialistRouting,
  planWorkerFailure,
  preservedAxes,
  requiredCategoryStatusesTransported,
  resolveExecutionModel,
  validateSpecialistEvidence,
  type DeduplicationInput,
} from "../review-authority.ts";

describe("frontier review authority (review-this:INV-14)", () => {
  test("the frontier command session owns every review responsibility", () => {
    assert.deepEqual(FRONTIER_OWNED_RESPONSIBILITIES, [
      "revision-packets",
      "completeness-checks",
      "finding-verification",
      "reconciliation",
      "verdict-publication",
      "merge",
      "labels",
      "promotion",
      "closure",
    ]);
    for (const responsibility of FRONTIER_OWNED_RESPONSIBILITIES) {
      const decision = frontierOwns(responsibility);
      assert.equal(decision.owned, true);
      assert.ok(decision.reason.includes("frontier command session owns"));
    }
  });

  test("only the frontier performs merge; a mutation worker never merges", () => {
    assert.equal(canPerformMerge("frontier").allowed, true);
    const worker = canPerformMerge("mutation-worker");
    assert.equal(worker.allowed, false);
    assert.equal(worker.authority, "frontier-only");
    assert.ok(worker.reason.includes("never merges"));
  });

  test("mutation worker may mutate, repair, and fast-forward push only inside its worktree", () => {
    const allowed = canRunMutationWorker({
      role: "mutation-worker",
      capabilities: {
        mutate: true,
        instructedConflictRepair: true,
        verificationRepair: true,
        fastForwardPush: true,
      },
      insidePersistentPrWorktree: true,
      attemptedStateChanges: [],
      blocked: false,
    });
    assert.equal(allowed.allowed, true);

    const outsideWorktree = canRunMutationWorker({
      role: "mutation-worker",
      capabilities: { mutate: true, instructedConflictRepair: true, verificationRepair: true, fastForwardPush: true },
      insidePersistentPrWorktree: false,
      attemptedStateChanges: [],
      blocked: false,
    });
    assert.equal(outsideWorktree.allowed, false);
    assert.match(outsideWorktree.reason, /only inside its persistent PR worktree/);
  });

  test("mutation worker cannot publish verdicts or change merge, label, promotion, closure, or parent state", () => {
    assert.deepEqual(WORKER_STATE_CHANGES, [
      "publish-verdict",
      "merge",
      "labels",
      "promotion",
      "closure",
      "parent-state",
    ]);
    for (const change of WORKER_STATE_CHANGES) {
      const result = canRunMutationWorker({
        role: "mutation-worker",
        capabilities: { mutate: true, instructedConflictRepair: true, verificationRepair: true, fastForwardPush: true },
        insidePersistentPrWorktree: true,
        attemptedStateChanges: [change],
        blocked: true,
      });
      assert.equal(result.allowed, false, change);
      assert.ok(result.reason.includes(`cannot ${change}`), change);
    }
  });

  test("frontier-owned reviewers are read-only and inspect the exact pinned worktree", () => {
    const allowed = canRunReadOnlyReviewer({
      role: "frontier",
      worktreePath: "/tmp/kilo/pr-173",
      pinnedHeadSha: "head-a",
      pinnedBaseSha: "base-a",
      willEdit: false,
    });
    assert.equal(allowed.allowed, true);

    const editing = canRunReadOnlyReviewer({
      role: "frontier",
      worktreePath: "/tmp/kilo/pr-173",
      pinnedHeadSha: "head-a",
      pinnedBaseSha: "base-a",
      willEdit: true,
    });
    assert.equal(editing.allowed, false);
    assert.match(editing.reason, /read-only/);
  });
});

describe("execution model resolution through the live catalog (review-this:INV-14)", () => {
  const catalog = ["claude-opus-4-1", "deepseek-v4-flash"];

  test("resolves an exact model/provider/variant once through the catalog", () => {
    const result = resolveExecutionModel({
      model: "deepseek-v4-flash",
      provider: "commandcode",
      variant: "default",
      resuming: false,
      userConfirmed: false,
      catalogEntries: catalog,
    });
    assert.equal(result.resolved, true);
    assert.equal(result.model, "deepseek-v4-flash");
    assert.equal(result.provider, "commandcode");
    assert.equal(result.variant, "default");
  });

  test("an unresolved or ambiguous model stays unresolved without hardcoded fallback", () => {
    const missing = resolveExecutionModel({
      model: "",
      resuming: false,
      userConfirmed: false,
      catalogEntries: catalog,
    });
    assert.equal(missing.resolved, false);

    const unknown = resolveExecutionModel({
      model: "not-in-catalog",
      resuming: false,
      userConfirmed: false,
      catalogEntries: catalog,
    });
    assert.equal(unknown.resolved, false);
    assert.match(unknown.reason, /not in the live Agent Manager catalog/);
  });

  test("one selection per invocation; resume shows the previous choice but requires confirmation", () => {
    const resumeUnconfirmed = resolveExecutionModel({
      model: "deepseek-v4-flash",
      resuming: true,
      userConfirmed: false,
      catalogEntries: catalog,
    });
    assert.equal(resumeUnconfirmed.resolved, false);
    assert.match(resumeUnconfirmed.reason, /requires explicit user confirmation/);

    const resumeConfirmed = resolveExecutionModel({
      model: "deepseek-v4-flash",
      resuming: true,
      userConfirmed: true,
      catalogEntries: catalog,
    });
    assert.equal(resumeConfirmed.resolved, true);
    assert.equal(resumeConfirmed.model, "deepseek-v4-flash");
  });
});

describe("required Standards category status transport (review-this:INV-14)", () => {
  test("required statuses are requested, carried through the adapter, and checked before reconciliation", () => {
    assert.deepEqual(REQUIRED_STANDARDS_CATEGORIES, [
      "security",
      "performance",
      "correctness-and-edge-cases",
      "style",
      "tests-and-test-bloat",
      "documentation",
    ]);
    const complete = Object.fromEntries(REQUIRED_STANDARDS_CATEGORIES.map((c) => [c, "passed"]));
    const result = requiredCategoryStatusesTransported({ adapter: "local-adapter", requiredStatuses: complete });
    assert.equal(result.transported, true);
    assert.deepEqual(result.missing, []);
    assert.equal(isStandardsCategoryTransportReady(result), true);
  });

  test("a missing category status is reported, never defaulted to blocking correctness", () => {
    const partial = Object.fromEntries(
      REQUIRED_STANDARDS_CATEGORIES.slice(0, -1).map((c) => [c, "passed"]),
    );
    const result = requiredCategoryStatusesTransported({ adapter: "local-adapter", requiredStatuses: partial });
    assert.equal(result.transported, false);
    assert.deepEqual(result.missing, ["documentation"]);
    assert.equal(isStandardsCategoryTransportReady(result), false);
  });
});

describe("missing category or severity handling (review-this:INV-14)", () => {
  test("a candidate with missing category or severity is rejected or reported incomplete, never blocking correctness", () => {
    const missingCategory = classifyCandidateCompleteness({ category: undefined, severity: "blocking" });
    assert.equal(missingCategory.complete, false);
    assert.equal(missingCategory.action, "reject");
    assert.match(missingCategory.reason, /never defaulted to a blocking correctness finding/);

    const missingSeverity = classifyCandidateCompleteness({ category: "security", severity: undefined });
    assert.equal(missingSeverity.complete, false);
    assert.equal(missingSeverity.action, "reject");
    assert.match(missingSeverity.reason, /missing severity/);

    const complete = classifyCandidateCompleteness({ category: "security", severity: "advisory" });
    assert.equal(complete.complete, true);
  });
});

describe("axis-preserving deduplication (review-this:INV-14)", () => {
  const base: DeduplicationInput = {
    source: "standards",
    file: "src/a.ts",
    line: 10,
    message: "missing null check",
    headSha: "head-a",
    baseSha: "base-a",
    evidence: "observed on line 10",
  };

  test("Standards and Spec findings stay separate even at the same location", () => {
    const first: DeduplicationInput = { ...base };
    const second: DeduplicationInput = {
      ...base,
      source: "spec",
      evidence: "acceptance criterion 3 requires the check",
    };
    const result = planDeduplication(second, first);
    assert.equal(result.collapsed, false);
    assert.match(result.reason, /stay separate even at the same location/);
  });

  test("cloud/local duplicates collapse only when revisions and evidence identify one defect", () => {
    const cloud = { ...base, source: "cloud" as const, evidence: "cloud comment on line 10" };
    const collapse = planDeduplication(cloud, base);
    assert.equal(collapse.collapsed, true);
    assert.match(collapse.reason, /collapse only when revisions and evidence identify one defect/);

    const differentHead = { ...cloud, headSha: "head-b" };
    assert.equal(planDeduplication(differentHead, base).collapsed, false);

    const missingEvidence = { ...cloud, evidence: undefined };
    assert.equal(planDeduplication(missingEvidence, base).collapsed, false);
  });
});

describe("triggered Standards checks and specialist routing (review-this:INV-14)", () => {
  test("test strategy, accessibility, observability, migration, and simplification are triggered Standards checks", () => {
    assert.deepEqual(TRIGGERED_STANDARDS_CHECKS, [
      "test-strategy",
      "accessibility",
      "observability",
      "migration",
      "simplification",
    ]);
  });

  test("at most one specialist per full-review round; security wins for the strongest trust-boundary risk", () => {
    const security = planSpecialistRouting({
      trustBoundaryTriggered: true,
      measuredWebPerformanceWork: true,
      specialistsInRound: [],
      fullReviewRound: true,
    });
    assert.equal(security.specialist, "security");
    assert.match(security.reason, /security wins/);

    const webPerf = planSpecialistRouting({
      trustBoundaryTriggered: false,
      measuredWebPerformanceWork: true,
      specialistsInRound: [],
      fullReviewRound: true,
    });
    assert.equal(webPerf.specialist, "web-performance");

    const alreadyAssigned = planSpecialistRouting({
      trustBoundaryTriggered: true,
      measuredWebPerformanceWork: false,
      specialistsInRound: ["web-performance"],
      fullReviewRound: true,
    });
    assert.equal(alreadyAssigned.specialist, undefined);
    assert.match(alreadyAssigned.reason, /at most one specialist/);

    const deltaRound = planSpecialistRouting({
      trustBoundaryTriggered: true,
      measuredWebPerformanceWork: false,
      specialistsInRound: [],
      fullReviewRound: false,
    });
    assert.equal(deltaRound.specialist, undefined);
  });

  test("specialist evidence uses local severity, cites a rule, and pins head and base", () => {
    const accepted = validateSpecialistEvidence({
      severity: "blocking",
      governingRule: "REVIEW.md security severity rule",
      headSha: "head-a",
      baseSha: "base-a",
    });
    assert.equal(accepted.accepted, true);

    const missingSeverity = validateSpecialistEvidence({
      severity: undefined,
      governingRule: "rule",
      headSha: "head-a",
      baseSha: "base-a",
    });
    assert.equal(missingSeverity.accepted, false);
    assert.match(missingSeverity.reason, /local blocking\/advisory severity/);

    const missingRule = validateSpecialistEvidence({
      severity: "advisory",
      governingRule: "",
      headSha: "head-a",
      baseSha: "base-a",
    });
    assert.equal(missingRule.accepted, false);
    assert.match(missingRule.reason, /governing rule/);

    const missingPin = validateSpecialistEvidence({
      severity: "advisory",
      governingRule: "rule",
      headSha: "",
      baseSha: "",
    });
    assert.equal(missingPin.accepted, false);
    assert.match(missingPin.reason, /pin the reviewed head/);
  });
});

describe("worker failure budget (review-this:INV-14)", () => {
  test("one corrected execution packet may be sent within the existing fix-round budget", () => {
    const first = planWorkerFailure({ attempts: 1, correctedExecutionPacketsSent: 0, fixRoundsUsed: 0, maxFixRounds: 2 });
    assert.equal(first.action, "send-corrected-packet");
  });

  test("continued failure adds needs-info and stops without frontier-model takeover", () => {
    const stop = planWorkerFailure({ attempts: 2, correctedExecutionPacketsSent: 1, fixRoundsUsed: 1, maxFixRounds: 2 });
    assert.equal(stop.action, "stop-with-needs-info");
    assert.match(stop.reason, /needs-info/);

    const exhaustedBudget = planWorkerFailure({ attempts: 1, correctedExecutionPacketsSent: 0, fixRoundsUsed: 2, maxFixRounds: 2 });
    assert.equal(exhaustedBudget.action, "stop-with-needs-info");
  });
});

describe("axis-preserving reconciliation record (review-this:INV-14)", () => {
  test("Standards and Spec remain fresh, separate axes with no cross-axis reranking", () => {
    const result = preservedAxes({
      standards: [
        { id: "s1", source: "standards", category: "security", severity: "blocking", file: "a.ts", line: 1, message: "s", evidence: "e", headSha: "h", baseSha: "b", governingRule: "r" },
      ],
      spec: [
        { id: "p1", source: "spec", category: "correctness-and-edge-cases", severity: "blocking", file: "a.ts", line: 1, message: "p", evidence: "e", headSha: "h", baseSha: "b", governingRule: "criterion" },
      ],
    });
    assert.equal(result.preserved, true);
    assert.match(result.reason, /no cross-axis reranking/);
  });
});
