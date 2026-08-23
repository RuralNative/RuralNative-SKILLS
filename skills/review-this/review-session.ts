// Persistent PR review lifecycle decisions (#157, parent spec #152).
//
// Pure: observed revisions, capabilities, and operation counts in, bounded
// review plans out. The command session applies the plan through its host.

import { MAX_FIX_ROUNDS } from "./workflow-state.ts";

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
    action: fact.worktreeExists && fact.workerSessionExists ? "reuse" : "create",
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
