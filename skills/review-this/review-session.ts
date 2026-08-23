// Persistent PR review lifecycle decisions (#157-#158, parent spec #152).
//
// Pure: observed revisions, capabilities, and operation counts in, bounded
// review plans out. The command session applies the plan through its host.

import { fixRoundDecision, MAX_FIX_ROUNDS } from "./workflow-state.ts";

export { MAX_FIX_ROUNDS };

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
}

export interface PersistentWorktreePlan {
  action: "create" | "reuse";
  prNumber: number;
  headSha: string;
  baseSha: string;
}

export interface ReviewStartFact {
  pullRequestOpen: boolean;
  closingReferenceValid: boolean;
  headSha: string;
  baseSha: string;
  implementationEvidencePosted: boolean;
  /** Recorded so evidence shows siblings never delay an eligible PR. */
  siblingImplementationWorkersActive?: boolean;
}

export function reviewCanStart(fact: ReviewStartFact): boolean {
  return (
    fact.pullRequestOpen &&
    fact.closingReferenceValid &&
    fact.headSha.trim() !== "" &&
    fact.baseSha.trim() !== "" &&
    fact.implementationEvidencePosted
  );
}

export function persistentWorktreePlan(
  fact: PersistentWorktreeFact,
): PersistentWorktreePlan {
  return {
    action: fact.worktreeExists ? "reuse" : "create",
    prNumber: fact.prNumber,
    headSha: fact.pinnedHeadSha,
    baseSha: fact.pinnedBaseSha,
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
