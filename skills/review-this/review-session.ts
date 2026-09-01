// Persistent PR review lifecycle decisions (#157-#158, parent spec #152).
//
// Pure: observed revisions, capabilities, and operation counts in, bounded
// review plans out. The command session applies the plan through its host.

import { fixRoundDecision, MAX_FIX_ROUNDS } from "./workflow-state.ts";
import type { ReviewWaveItem } from "./discovery.ts";

export { MAX_FIX_ROUNDS };

/**
 * Bounded review-wave fan-out (#170).
 *
 * At most three review workers serve one review-wave stage, and at most four
 * managed workers stay active across the whole workspace. The command session
 * feeds this planner the native-order wave selections, the persistent PR
 * worker facts observed in the Agent Manager overview, and the workspace
 * capacity the overview reports; it applies the returned plan through its host
 * without ever exceeding either cap.
 */
export const MAX_REVIEW_WORKERS_PER_STAGE = 3;
export const MAX_MANAGED_WORKERS_PER_WORKSPACE = 4;

export interface PersistentPrWorkerFact {
  prNumber: number;
  workerSessionExists: boolean;
  /** Whether the managed worktree for this pull request still exists. */
  worktreeExists: boolean;
  pinnedHeadSha: string;
  pinnedBaseSha: string;
  /** Worktree path reported for a missing-session recovery (ADR-0023). */
  worktreePath?: string;
  /** Branch name reported for a missing-session recovery (ADR-0023). */
  branchName?: string;
}

export interface ReviewWaveDispatchFact {
  wave: readonly ReviewWaveItem[];
  workers: readonly PersistentPrWorkerFact[];
  /** Managed workers active across the whole workspace, from the overview. */
  activeManagedWorkers: number;
  /** Worker-start slots the overview reports as available right now. */
  availableWorkspaceSlots: number;
}

export interface ReviewWaveDispatchItem {
  ticket: number;
  prNumber: number;
  headSha: string;
  baseSha: string;
  /** Same requirements revision the implementation evidence pinned. */
  requirementsRevision?: string;
}

/** A PR whose worktree exists but whose worker session is missing (ADR-0023). */
export interface ReviewRecoveryRequiredItem extends ReviewWaveDispatchItem {
  worktreePath: string;
  branchName: string;
}

export interface DeferredReviewWaveItem extends ReviewWaveDispatchItem {
  reason: string;
}

export interface ReviewWaveDispatchPlan {
  reuse: ReviewWaveDispatchItem[];
  create: ReviewWaveDispatchItem[];
  recovery: ReviewRecoveryRequiredItem[];
  deferredByCapacity: DeferredReviewWaveItem[];
  /** Review workers actively serving the wave after this dispatch. */
  activeReviewWorkers: number;
}

function toDispatchItem(item: ReviewWaveItem): ReviewWaveDispatchItem {
  return {
    ticket: item.ticket,
    prNumber: item.prNumber,
    headSha: item.headSha,
    baseSha: item.baseSha,
    requirementsRevision: item.requirementsRevision,
  };
}

export function planReviewWaveDispatch(
  fact: ReviewWaveDispatchFact,
): ReviewWaveDispatchPlan {
  const plan: ReviewWaveDispatchPlan = {
    reuse: [],
    create: [],
    recovery: [],
    deferredByCapacity: [],
    activeReviewWorkers: 0,
  };
  const workerByPr = new Map(
    fact.workers.map((worker) => [worker.prNumber, worker]),
  );
  const pinnedPairs = new Set<string>();
  let reviewWorkers = 0;
  let starts = 0;

  // Native child order: the wave arrives pre-sorted by selectReviewWave and
  // every slot fills in that order without reordering.
  for (const item of fact.wave) {
    const dispatchItem = toDispatchItem(item);
    const defer = (reason: string) =>
      plan.deferredByCapacity.push({ ...dispatchItem, reason });

    const pair = `${item.headSha}:${item.baseSha}`;
    if (pinnedPairs.has(pair)) {
      defer(
        "another selected pull request already pins this head-and-base pair; no duplicate worker",
      );
      continue;
    }
    pinnedPairs.add(pair);

    const worker = workerByPr.get(item.prNumber);
    if (worker?.workerSessionExists) {
      // One persistent worker per pull request: reuse instead of duplicating.
      plan.reuse.push(dispatchItem);
      reviewWorkers += 1;
      continue;
    }
    // An existing worktree whose session disappeared is recovery-required
    // (ADR-0023): never a duplicate worker and never a deletion. The worktree
    // path and branch are required facts; without them the state fails closed
    // into a deferral rather than inventing a duplicate creation.
    if (worker?.worktreeExists) {
      const worktreePath = worker.worktreePath;
      const branchName = worker.branchName;
      if (worktreePath && branchName) {
        plan.recovery.push({ ...dispatchItem, worktreePath, branchName });
        // A recovery item means a worker will actively serve this PR; it
        // counts against the stage cap like reuse and create so mixed waves
        // never exceed MAX_REVIEW_WORKERS_PER_STAGE.
        reviewWorkers += 1;
        continue;
      }
      defer(
        "the persistent worktree exists without its session, but its path and branch are not reported; recovery is required before any new worker starts",
      );
      continue;
    }
    // `worktreeExists` absent (a worker fact captured before ADR-0023) must
    // fail closed: the old fact shape cannot prove there is no worktree, so a
    // sessionless worker with an unknown worktree state never receives a
    // duplicate creation. Only an explicitly reported `false` reaches the
    // clean-creation path below.
    if (worker && worker.worktreeExists === undefined) {
      defer(
        "the worker reports no session and no recorded worktree state; recovery is required before any new worker starts",
      );
      continue;
    }
    // No prior worktree exists: a clean creation may start here.

    if (reviewWorkers >= MAX_REVIEW_WORKERS_PER_STAGE) {
      defer(`review-wave stage cap allows at most ${MAX_REVIEW_WORKERS_PER_STAGE} review workers`);
      continue;
    }
    if (fact.activeManagedWorkers + starts >= MAX_MANAGED_WORKERS_PER_WORKSPACE) {
      defer(
        `workspace cap allows at most ${MAX_MANAGED_WORKERS_PER_WORKSPACE} managed workers`,
      );
      continue;
    }
    if (starts >= fact.availableWorkspaceSlots) {
      defer("the Agent Manager overview reports no available worker-start slots");
      continue;
    }
    plan.create.push(dispatchItem);
    reviewWorkers += 1;
    starts += 1;
  }

  plan.activeReviewWorkers = reviewWorkers;
  return plan;
}

export const STRICT_REVIEW_CATEGORIES = [
  "security",
  "performance",
  "correctness-and-edge-cases",
  "style",
  "tests-and-test-bloat",
  "documentation",
] as const;

export type StrictReviewCategory = (typeof STRICT_REVIEW_CATEGORIES)[number];
export type ReviewStatus = "passed" | "not-applicable" | "advisory" | "blocking";
export type ReviewDepth = "full" | "delta";
export type ReviewEscalationTrigger =
  | "new-affected-seam"
  | "trust-boundary"
  | "schema"
  | "dependency-state"
  | "generated-contract"
  | "public-interface"
  | "materially-widened-diff";

export interface CategoryResult {
  category: StrictReviewCategory;
  status: ReviewStatus;
  evidence?: string;
}

export function missingReviewCategories(
  results: readonly CategoryResult[],
): StrictReviewCategory[] {
  const present = new Set(results.map((result) => result.category));
  return STRICT_REVIEW_CATEGORIES.filter((category) => !present.has(category));
}

export function reviewCategoriesComplete(
  results: readonly CategoryResult[],
): boolean {
  return missingReviewCategories(results).length === 0;
}

export interface RevisionReviewInput {
  initialRevision: boolean;
  baseMoved: boolean;
  triggers?: Partial<Record<ReviewEscalationTrigger, boolean>>;
}

export interface RevisionReviewPlan {
  depth: ReviewDepth;
  triggers: ReviewEscalationTrigger[];
  reason: string;
}

export function planRevisionReview(input: RevisionReviewInput): RevisionReviewPlan {
  if (input.initialRevision) {
    return { depth: "full", triggers: [], reason: "initial PR revision requires full review" };
  }
  const triggers = Object.entries(input.triggers ?? {})
    .filter(([, enabled]) => enabled === true)
    .map(([trigger]) => trigger as ReviewEscalationTrigger);
  if (triggers.length > 0) {
    return {
      depth: "full",
      triggers,
      reason: "a named risk trigger requires full Standards and Spec review",
    };
  }
  return {
    depth: "delta",
    triggers: [],
    reason: input.baseMoved
      ? "base movement receives effective-diff delta review"
      : "later revision reviews changed hunks and impacted callers",
  };
}

export interface ReviewCapabilities {
  persistentPrWorktree: boolean;
  freshStandardsAgent: boolean;
  freshSpecAgent: boolean;
  freshFixAgent: boolean;
}

export interface ReviewCapabilityDecision {
  allowed: boolean;
  reason?: string;
}

export function reviewCapabilityGate(
  capabilities: ReviewCapabilities,
  stage: "initial-review" | "fix" | "delta-review",
): ReviewCapabilityDecision {
  if (!capabilities.persistentPrWorktree) {
    return { allowed: false, reason: "persistent PR worktree is unavailable" };
  }
  if (!capabilities.freshStandardsAgent || !capabilities.freshSpecAgent) {
    return { allowed: false, reason: "fresh Standards and Spec agents are unavailable" };
  }
  if (stage === "fix" && !capabilities.freshFixAgent) {
    return { allowed: false, reason: "fresh fix agent is unavailable" };
  }
  return { allowed: true };
}

export interface PersistentWorktreeFact {
  prNumber: number;
  worktreeExists: boolean;
  workerSessionExists: boolean;
  pinnedHeadSha: string;
  pinnedBaseSha: string;
  /** Worktree path reported for a missing-session recovery (ADR-0023). */
  worktreePath?: string;
  /** Branch name reported for a missing-session recovery (ADR-0023). */
  branchName?: string;
}

export interface PersistentWorktreePlan {
  action: "create" | "reuse" | "recovery-required";
  prNumber: number;
  headSha: string;
  baseSha: string;
  /** Worktree path reported for a missing-session recovery (ADR-0023). */
  worktreePath?: string;
  /** Branch name reported for a missing-session recovery (ADR-0023). */
  branchName?: string;
}

export interface ReviewStartFact {
  pullRequestOpen: boolean;
  closingReferenceValid: boolean;
  headSha: string;
  baseSha: string;
  implementationEvidencePosted: boolean;
  /**
   * The current issue bodies still match the pinned requirements revision
   * (ticket #190); true when no pin exists (legacy evidence). A changed
   * body invalidates review against the old revision.
   */
  requirementsCurrent: boolean;
  /** Recorded so evidence shows siblings never delay an eligible PR. */
  siblingImplementationWorkersActive?: boolean;
}

export function reviewCanStart(fact: ReviewStartFact): boolean {
  return (
    fact.pullRequestOpen &&
    fact.closingReferenceValid &&
    fact.headSha.trim() !== "" &&
    fact.baseSha.trim() !== "" &&
    fact.implementationEvidencePosted &&
    fact.requirementsCurrent === true
  );
}

/**
 * One persistent PR worktree per pull request (ADR-0023). An existing
 * worktree with a live session is reused; no prior worktree is created; an
 * existing worktree whose session disappeared is `recovery-required` — never
 * duplicated and never deleted.
 */
/**
 * One persistent PR worktree per pull request (ADR-0023). An existing
 * worktree with a live session is reused; no prior worktree is created; an
 * existing worktree whose session disappeared is `recovery-required` — never
 * duplicated and never deleted. The worktree path and branch are required
 * facts; without them the recovery state cannot be reported and the plan
 * fails closed rather than inventing a location.
 */
export function persistentWorktreePlan(
  fact: PersistentWorktreeFact,
): PersistentWorktreePlan {
  if (fact.worktreeExists && !fact.workerSessionExists) {
    const worktreePath = fact.worktreePath;
    const branchName = fact.branchName;
    if (!worktreePath || !branchName) {
      return {
        action: "recovery-required",
        prNumber: fact.prNumber,
        headSha: fact.pinnedHeadSha,
        baseSha: fact.pinnedBaseSha,
        worktreePath: undefined,
        branchName: undefined,
      };
    }
    return {
      action: "recovery-required",
      prNumber: fact.prNumber,
      headSha: fact.pinnedHeadSha,
      baseSha: fact.pinnedBaseSha,
      worktreePath,
      branchName,
    };
  }
  // `worktreeExists` absent (a pre-ADR-0023 fact) cannot prove there is no
  // worktree, so it never authorizes a create; it reports recovery-required
  // with no invented location, exactly like a reported worktree.
  if (fact.worktreeExists === undefined && !fact.workerSessionExists) {
    return {
      action: "recovery-required",
      prNumber: fact.prNumber,
      headSha: fact.pinnedHeadSha,
      baseSha: fact.pinnedBaseSha,
      worktreePath: undefined,
      branchName: undefined,
    };
  }
  return {
    action: fact.worktreeExists ? "reuse" : "create",
    prNumber: fact.prNumber,
    headSha: fact.pinnedHeadSha,
    baseSha: fact.pinnedBaseSha,
  };
}

export type ReviewLifecycleOutcome =
  | "running"
  | "interrupted"
  | "offline"
  | "failed"
  | "blocked"
  | "needs-info"
  | "succeeded";

/**
 * Map a planner `stop` action to the lifecycle outcome the cleanup gate sees.
 * A `stop` action means the workflow cannot continue in this context, not that
 * the worker is being stopped (ADR-0023): publication failure, missing
 * capability, fix-budget exhaustion, conflict refusal, and root-cause
 * expansion refusal are blocked states that preserve the session and worktree.
 */
export function lifecycleOutcomeForStopAction(
  reason: string,
): Extract<ReviewLifecycleOutcome, "blocked" | "failed" | "needs-info"> {
  const normalized = reason.toLowerCase();
  if (normalized.includes("needs-info")) return "needs-info";
  if (
    normalized.includes("capability") ||
    normalized.includes("cap") ||
    normalized.includes("unavailable") ||
    normalized.includes("budget") ||
    normalized.includes("exhausted") ||
    normalized.includes("publication") ||
    normalized.includes("conflict") ||
    normalized.includes("round") ||
    normalized.includes("expansion") ||
    normalized.includes("seams")
  ) {
    return "blocked";
  }
  return "failed";
}

export type ReviewWorktreeOutcome =
  | "removed"
  | "cleanup-pending"
  | "preserved-for-resume"
  | "preserved-for-diagnosis";

export interface ReviewCleanupFact {
  prNumber: number;
  lifecycleOutcome: ReviewLifecycleOutcome;
  worktreeExists: boolean;
  worktreeClean: boolean;
  localHeadSha: string;
  remoteBranchSha: string;
  pullRequestHeadSha: string;
  /** The pull request merged — the implemented terminal review state. */
  merged: boolean;
  unpushedFix: boolean;
  hostClosesWorktrees: boolean;
}

function reviewShaPresent(sha: string): boolean {
  return sha.trim() !== "";
}

/**
 * Exact source recovery evidence for a review worker (ADR-0023): the review is
 * terminal, the worktree is clean, and local `HEAD`, the remote feature branch,
 * and the pull-request head are one non-empty SHA. Missing SHAs fail closed.
 *
 * For a merged pull request the feature branch may have been deleted by the
 * squash-merge, so the three SHAs must be the values recorded before the merge
 * (the observed evidence that the merged head was recoverable). Reading the
 * remote feature branch after merge would fail closed on a deleted branch.
 */
export function reviewExactRecovery(fact: ReviewCleanupFact): boolean {
  if (fact.lifecycleOutcome !== "succeeded") return false;
  if (!fact.worktreeExists || !fact.worktreeClean) return false;
  if (fact.unpushedFix) return false;
  if (
    !reviewShaPresent(fact.localHeadSha) ||
    !reviewShaPresent(fact.remoteBranchSha) ||
    !reviewShaPresent(fact.pullRequestHeadSha)
  ) {
    return false;
  }
  return (
    fact.localHeadSha === fact.remoteBranchSha &&
    fact.remoteBranchSha === fact.pullRequestHeadSha
  );
}

/**
 * Review cleanup (ADR-0023). Only the command session cleans up, and only
 * after a terminal successful review state with no unpushed fix, a clean
 * worktree, and exact local/remote/PR head equality. A merged pull request
 * retains the SHA evidence recorded before merge as proof the merged head was
 * recoverable. A blocked review (publication failure, missing capability,
 * fix-budget exhaustion, conflict stop), an exhausted fix budget, a dirty
 * worktree, an unpushed fix, an offline worker, or a `needs-info` state
 * preserves the session and worktree.
 */
export function reviewCleanupDecision(fact: ReviewCleanupFact): {
  stopSession: boolean;
  removeWorktree: boolean;
  report: ReviewWorktreeOutcome;
} {
  if (
    fact.lifecycleOutcome === "needs-info" ||
    fact.lifecycleOutcome === "failed" ||
    fact.lifecycleOutcome === "blocked" ||
    fact.lifecycleOutcome === "offline"
  ) {
    return {
      stopSession: false,
      removeWorktree: false,
      report: "preserved-for-diagnosis",
    };
  }
  if (
    fact.lifecycleOutcome !== "succeeded" ||
    !fact.merged ||
    !reviewExactRecovery(fact)
  ) {
    return {
      stopSession: false,
      removeWorktree: false,
      report: "preserved-for-resume",
    };
  }
  if (fact.hostClosesWorktrees) {
    return { stopSession: true, removeWorktree: true, report: "removed" };
  }
  return {
    stopSession: true,
    removeWorktree: false,
    report: "cleanup-pending",
  };
}

export interface ReviewOperationCounts {
  prWorktreeSetups: number;
  initialFullReviews: number;
  fixBatches: number;
  deltaReviews: number;
  finalVerificationRuns: number;
}

export type ReviewOperation =
  | "pr-worktree-setup"
  | "initial-full-review"
  | "fix-batch"
  | "delta-review"
  | "final-verification";

export function operationBudget(
  counts: ReviewOperationCounts,
  operation: ReviewOperation,
): { allowed: boolean; reason: string } {
  const limits: Record<ReviewOperation, number> = {
    "pr-worktree-setup": 1,
    "initial-full-review": 1,
    "fix-batch": MAX_FIX_ROUNDS,
    "delta-review": Number.POSITIVE_INFINITY,
    "final-verification": 1,
  };
  const countKey: Record<ReviewOperation, keyof ReviewOperationCounts> = {
    "pr-worktree-setup": "prWorktreeSetups",
    "initial-full-review": "initialFullReviews",
    "fix-batch": "fixBatches",
    "delta-review": "deltaReviews",
    "final-verification": "finalVerificationRuns",
  };
  const count = counts[countKey[operation]];
  const limit = limits[operation];
  return count < limit
    ? { allowed: true, reason: "operation remains within the PR lifecycle budget" }
    : { allowed: false, reason: `${operation} operation budget is exhausted` };
}

export function initialReviewOperationPlan(
  counts: ReviewOperationCounts,
): { allowed: boolean; operations: readonly ["pr-worktree-setup", "initial-full-review"] } {
  const setup = operationBudget(counts, "pr-worktree-setup");
  const initial = operationBudget(counts, "initial-full-review");
  return {
    allowed: setup.allowed && initial.allowed,
    operations: ["pr-worktree-setup", "initial-full-review"],
  };
}

export interface ReviewPublicationFact {
  trustedSummaryUpdated: boolean;
  inlineFindingsVerified: boolean;
}

export function canContinueAfterPublication(
  fact: ReviewPublicationFact,
): boolean {
  return fact.trustedSummaryUpdated && fact.inlineFindingsVerified;
}

export function initialReviewAgents(): readonly ["standards", "spec"] {
  return ["standards", "spec"];
}

export interface FixFinding {
  id: string;
  severity: "advisory" | "blocking";
}

export interface RootCauseExpansion {
  paths: readonly string[];
  affectedSeams: readonly string[];
}

export interface FixBatchInput {
  findings: readonly FixFinding[];
  roundsUsed: number;
  capabilities: ReviewCapabilities;
  publication: ReviewPublicationFact;
  approvedAffectedSeams?: readonly string[];
  rootCauseExpansion?: RootCauseExpansion;
}

export interface FixBatchPlan {
  action: "fix" | "defer-advisories" | "stop";
  allowed: boolean;
  createsFixRound: boolean;
  findings: FixFinding[];
  deferredAdvisories: FixFinding[];
  expandedPaths: string[];
  expandedAffectedSeams: string[];
  reason: string;
}

function validatedExpansion(input: FixBatchInput):
  | { paths: string[] }
  | { error: string } {
  const expansion = input.rootCauseExpansion;
  if (!expansion) return { paths: [] };

  const paths = [...new Set(expansion.paths.filter((path) => path.trim() !== ""))];
  const approvedSeams = new Set(input.approvedAffectedSeams ?? []);
  if (
    paths.length > 0 &&
    (expansion.affectedSeams.length === 0 ||
      expansion.affectedSeams.some((seam) => !approvedSeams.has(seam)))
  ) {
    return { error: "root-cause expansion is outside the approved affected seams" };
  }
  return { paths };
}

/**
 * Plan one fresh fix context for a PR and round.
 *
 * Blocking findings carry safe advisories in the same batch. Advisory-only
 * results are recorded as a deferral and never consume a code-fix round.
 */
export function planFixBatch(input: FixBatchInput): FixBatchPlan {
  const findings = [...input.findings];
  if (findings.length === 0) {
    return {
      action: "stop",
      allowed: false,
      createsFixRound: false,
      findings: [],
      deferredAdvisories: [],
      expandedPaths: [],
      expandedAffectedSeams: [],
      reason: "no confirmed findings require a fix batch",
    };
  }

  if (!canContinueAfterPublication(input.publication)) {
    return {
      action: "stop",
      allowed: false,
      createsFixRound: false,
      findings: [],
      deferredAdvisories: [],
      expandedPaths: [],
      expandedAffectedSeams: [],
      reason: "review publication is incomplete; fixes and merge must stop",
    };
  }

  const blocking = findings.filter((finding) => finding.severity === "blocking");
  const advisories = findings.filter((finding) => finding.severity === "advisory");
  if (blocking.length === 0) {
    return {
      action: "defer-advisories",
      allowed: true,
      createsFixRound: false,
      findings: [],
      deferredAdvisories: advisories,
      expandedPaths: [],
      expandedAffectedSeams: [],
      reason: "advisory-only findings are deferred and do not create a fix round",
    };
  }

  const capability = reviewCapabilityGate(input.capabilities, "fix");
  if (!capability.allowed) {
    return {
      action: "stop",
      allowed: false,
      createsFixRound: false,
      findings: [],
      deferredAdvisories: [],
      expandedPaths: [],
      expandedAffectedSeams: [],
      reason: capability.reason ?? "fresh fix context is unavailable",
    };
  }

  const round = fixRoundDecision(input.roundsUsed, "code-fix");
  if (!round.allowed) {
    return {
      action: "stop",
      allowed: false,
      createsFixRound: false,
      findings: [],
      deferredAdvisories: [],
      expandedPaths: [],
      expandedAffectedSeams: [],
      reason: round.reason,
    };
  }

  const expansion = validatedExpansion(input);
  if ("error" in expansion) {
    return {
      action: "stop",
      allowed: false,
      createsFixRound: false,
      findings: [],
      deferredAdvisories: [],
      expandedPaths: [],
      expandedAffectedSeams: [],
      reason: expansion.error,
    };
  }

  return {
    action: "fix",
    allowed: true,
    createsFixRound: true,
    findings,
    deferredAdvisories: [],
    expandedPaths: expansion.paths,
    expandedAffectedSeams: [...new Set(input.rootCauseExpansion?.affectedSeams ?? [])],
    reason: "one fresh fix context receives all confirmed findings for this PR and round",
  };
}

export interface FinalVerificationInput {
  passed: boolean;
  roundsUsed: number;
  capabilities: ReviewCapabilities;
  publication: ReviewPublicationFact;
  baseMoved?: boolean;
  triggers?: Partial<Record<ReviewEscalationTrigger, boolean>>;
}

export interface FinalVerificationPlan {
  action: "complete" | "repair" | "stop";
  allowed: boolean;
  consumesFixRound: boolean;
  review?: RevisionReviewPlan;
  reason: string;
}

/**
 * A failed final gate may use one remaining code-fix round, then receives the
 * same delta or risk-triggered full review as any other pushed revision.
 */
export function planFinalVerification(input: FinalVerificationInput): FinalVerificationPlan {
  if (!canContinueAfterPublication(input.publication)) {
    return {
      action: "stop",
      allowed: false,
      consumesFixRound: false,
      reason: "review publication is incomplete; final verification cannot continue",
    };
  }
  if (input.passed) {
    return {
      action: "complete",
      allowed: true,
      consumesFixRound: false,
      reason: "final verification passed on the semantically reviewed head",
    };
  }

  const capability = reviewCapabilityGate(input.capabilities, "fix");
  if (!capability.allowed) {
    return {
      action: "stop",
      allowed: false,
      consumesFixRound: false,
      reason: capability.reason ?? "fresh fix context is unavailable",
    };
  }
  const round = fixRoundDecision(input.roundsUsed, "code-fix");
  if (!round.allowed) {
    return {
      action: "stop",
      allowed: false,
      consumesFixRound: false,
      reason: `final verification failed and ${round.reason}`,
    };
  }
  return {
    action: "repair",
    allowed: true,
    consumesFixRound: true,
    review: planRevisionReview({
      initialRevision: false,
      baseMoved: input.baseMoved ?? false,
      triggers: input.triggers,
    }),
    reason: "final verification repair consumes one available fix round before rereview",
  };
}

export interface ConflictResolutionInput {
  hasConflict: boolean;
  roundsUsed: number;
}

export interface ConflictResolutionPlan {
  action: "base-refresh" | "resolve" | "stop";
  allowed: boolean;
  consumesFixRound: boolean;
  review?: RevisionReviewPlan;
  reason: string;
}

/**
 * A conflict-free base refresh reuses the existing verdict without consuming
 * a fix round. Resolving a real merge conflict consumes one bounded fix
 * round and the resolved revision receives fresh semantic review.
 */
export function planConflictResolution(
  input: ConflictResolutionInput,
): ConflictResolutionPlan {
  if (!input.hasConflict) {
    const refresh = fixRoundDecision(input.roundsUsed, "conflict-free-base-refresh");
    return {
      action: "base-refresh",
      allowed: true,
      consumesFixRound: false,
      reason: refresh.reason,
    };
  }
  const round = fixRoundDecision(input.roundsUsed, "conflict-resolution");
  if (!round.allowed) {
    return {
      action: "stop",
      allowed: false,
      consumesFixRound: false,
      reason: round.reason,
    };
  }
  return {
    action: "resolve",
    allowed: true,
    consumesFixRound: true,
    review: planRevisionReview({ initialRevision: false, baseMoved: true }),
    reason: "conflict resolution consumes one bounded fix round before rereview",
  };
}

export type RepositoryTrust = "same-repository" | "untrusted-fork";

export interface PushPlan {
  action: "fast-forward-push" | "static-review" | "stop";
  allowed: boolean;
  reason: string;
}

export function planPush(
  repositoryTrust: RepositoryTrust,
  fastForward: boolean,
): PushPlan {
  if (repositoryTrust === "untrusted-fork") {
    return {
      action: "static-review",
      allowed: true,
      reason: "untrusted forks remain static-review-only",
    };
  }
  if (!fastForward) {
    return {
      action: "stop",
      allowed: false,
      reason: "same-repository review updates must be fast-forward pushes",
    };
  }
  return {
    action: "fast-forward-push",
    allowed: true,
    reason: "same-repository review update is fast-forward",
  };
}
