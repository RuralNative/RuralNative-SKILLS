// Review-policy resolution for /review-this (review-only).
//
// Pure: facts in, decisions out. No network, GitHub, git, filesystem, or
// Agent Manager calls. REVIEW.md is optional project guidance: general
// workflow rules live in the skill, repository-specific standards come from
// existing docs and configuration. A missing file never blocks review and
// nothing is created here.

import {
  REVIEW_CONTRACT_VERSION,
  REVIEW_POLICY_VERSION,
  SUPPORTED_POLICY_VERSIONS,
  buildPolicyBlockingFindings,
  classifyPolicyChange,
  effectivePolicyRevision as sharedEffectivePolicyRevision,
  isSupportedPolicyVersion,
  policyCanonicalText,
  policyRevisionWellFormed,
  reviewPolicyRevision as sharedReviewPolicyRevision,
  verifyOwnerDecision,
  type OwnerDecisionExpectation,
  type OwnerDecisionFact,
  type PolicyChangeFact,
  type PolicySource as SharedPolicySource,
} from "./workflow-state.ts";

export {
  REVIEW_CONTRACT_VERSION,
  REVIEW_POLICY_VERSION,
  SUPPORTED_POLICY_VERSIONS,
  buildPolicyBlockingFindings,
  classifyPolicyChange,
  isSupportedPolicyVersion,
  policyCanonicalText,
  policyRevisionWellFormed,
  verifyOwnerDecision,
};

export interface ReviewPolicyFact {
  /** A root REVIEW.md exists on disk. */
  policyExists: boolean;
  /** The existing policy file is readable as text. */
  policyReadable: boolean;
  /** The existing policy path is a symlink. */
  isSymlink: boolean;
  /** Declared governing sources conflict or are unreadable. */
  conflictingSources: boolean;
  /** Exactly one open pull request resolved with no diagnostic. */
  targetValid: boolean;
  /** The current checkout matches the selected pull-request head. */
  checkoutMatches: boolean;
  /** The worktree has no uncommitted changes before review. */
  worktreeClean: boolean;
}

export type ReviewPolicyDecision =
  | { action: "use-existing"; reason: string }
  | { action: "use-defaults"; reason: string }
  | { action: "stop"; reason: string };

/**
 * Decide the review-policy path before any review publication.
 *
 * An existing readable policy supplies additional project rules without
 * relaxing skill safety boundaries. When no policy exists, skill-owned
 * workflow defaults apply and review continues. Every other invalid state
 * stops with a diagnostic and creates nothing.
 */
export function reviewPolicyDecision(
  fact: ReviewPolicyFact,
): ReviewPolicyDecision {
  if (!fact.targetValid) {
    return { action: "stop", reason: "resolve one valid pull-request target before reading review policy" };
  }
  if (!fact.checkoutMatches || !fact.worktreeClean) {
    return { action: "stop", reason: "the checkout must match the pull-request head and be clean before review policy" };
  }
  if (fact.isSymlink) {
    return { action: "stop", reason: "the REVIEW.md path is a symlink; resolve it outside this command" };
  }
  if (fact.conflictingSources) {
    return { action: "stop", reason: "review policy sources conflict; reconcile them outside this command" };
  }
  if (fact.policyExists) {
    if (!fact.policyReadable) {
      return { action: "stop", reason: "the existing REVIEW.md is unreadable; fix permissions outside this command" };
    }
    return { action: "use-existing", reason: "the existing root REVIEW.md supplies project rules alongside skill defaults" };
  }
  return {
    action: "use-defaults",
    reason: "no root REVIEW.md exists; skill-owned workflow defaults govern this review",
  };
}

export type PolicySource = SharedPolicySource;

/**
 * Deterministic effective-policy revision over the resolved governing
 * sources. Single implementation lives in the shared workflow core;
 * this re-export preserves the skill-local import path.
 *
 * Legacy contract: multi-source values contain newlines and do not survive
 * publication. New publication uses `reviewPolicyRevision` (single-line
 * SHA-256 carrier). Both are re-exported here so callers keep one import
 * path.
 */
export const effectivePolicyRevision = sharedEffectivePolicyRevision;
export const reviewPolicyRevision = sharedReviewPolicyRevision;

export type { OwnerDecisionExpectation, OwnerDecisionFact, PolicyChangeFact };

// --- Source-backed policy resolution (automatic recovery) -------------------
//
// The single `conflictingSources` boolean cannot distinguish a reviewable
// proposed violation (head-only policy change without approval) from
// inaccessible, ambiguous, or genuinely contradictory governing authority.
// New code resolves established rules from pinned base objects and verifies
// owner decisions against native identity/authority/revisions/scope.

export interface ReviewPolicySourceFact {
  baseSources: readonly PolicySource[];
  headSources: readonly PolicySource[];
  baseReadable: boolean;
  headReadable: boolean;
  baseIsSymlink: boolean;
  headIsSymlink: boolean;
  gitObjectFallbackReadable: boolean;
  baseContradictory: boolean;
  baseAmbiguous: boolean;
  targetValid: boolean;
  checkoutMatches: boolean;
  worktreeClean: boolean;
}

export type ReviewPolicyOutcome =
  | { action: "use-existing"; reason: string; governingSources: readonly PolicySource[] }
  | { action: "use-defaults"; reason: string; governingSources: readonly PolicySource[] }
  | {
      action: "reviewable-with-blockers";
      reason: string;
      governingSources: readonly PolicySource[];
      blockingDrafts: readonly { governingRule: string; sourcePath: string; message: string }[];
    }
  | { action: "stop"; reason: string };

/**
 * Resolve governing policy from pinned base objects.
 *
 * - A head-only change never authorizes itself; the established base rule
 *   stays in force. Missing REVIEW.md continues under skill defaults.
 * - A reviewable proposed violation continues with validated blocking
 *   findings tied to the actual changed source and governing base rule.
 * - Inaccessible, ambiguous, or contradictory authority stops.
 * - Never follows an untrusted symlink or substitutes defaults for
 *   unreadable policy. A safe git-object read may supply sources when the
 *   working-tree read fails.
 */
export function resolveReviewPolicySources(
  fact: ReviewPolicySourceFact,
): ReviewPolicyOutcome {
  if (!fact.targetValid) {
    return { action: "stop", reason: "resolve one valid pull-request target before reading review policy" };
  }
  if (!fact.checkoutMatches || !fact.worktreeClean) {
    return { action: "stop", reason: "the checkout must match the pull-request head and be clean before review policy" };
  }
  const classification = classifyPolicyChange({
    baseSources: fact.baseSources,
    headSources: fact.headSources,
    baseReadable: fact.baseReadable,
    headReadable: fact.headReadable,
    baseIsSymlink: fact.baseIsSymlink,
    headIsSymlink: fact.headIsSymlink,
    gitObjectFallbackReadable: fact.gitObjectFallbackReadable,
    baseContradictory: fact.baseContradictory,
    baseAmbiguous: fact.baseAmbiguous,
  });
  if (classification.kind === "inaccessible") {
    return { action: "stop", reason: classification.reason };
  }
  if (classification.kind === "ambiguous" || classification.kind === "contradictory") {
    return { action: "stop", reason: classification.reason };
  }
  if (classification.kind === "proposed-violation-reviewable") {
    const basePaths = new Set(fact.baseSources.map((s) => s.path));
    const headPaths = new Set(fact.headSources.map((s) => s.path));
    const drafts: { governingRule: string; sourcePath: string; message: string }[] = [];
    for (const head of fact.headSources) {
      const baseMatch = fact.baseSources.find((b) => b.path === head.path);
      if (!baseMatch || baseMatch.hash !== head.hash) {
        const governing = fact.baseSources.find((b) => b.path === head.path);
        drafts.push({
          governingRule: governing ? `${governing.path} (established base rule)` : "established base policy (head-only addition)",
          sourcePath: head.path,
          message: `proposed governing change at ${head.path} has no verified owner approval; the established base rule stays in force`,
        });
      }
    }
    for (const base of fact.baseSources) {
      if (!headPaths.has(base.path)) {
        drafts.push({
          governingRule: `${base.path} (established base rule)`,
          sourcePath: base.path,
          message: `proposed removal of governing source ${base.path} has no verified owner approval; the established base rule stays in force`,
        });
      }
    }
    void basePaths;
    return {
      action: "reviewable-with-blockers",
      reason: classification.reason,
      governingSources: fact.baseSources,
      blockingDrafts: drafts,
    };
  }
  // Unchanged: missing REVIEW.md continues under defaults; otherwise the
  // existing readable base policy governs.
  const hasPolicy = fact.baseSources.length > 0;
  if (hasPolicy) {
    return {
      action: "use-existing",
      reason: "the established base governing sources supply project rules alongside skill defaults",
      governingSources: fact.baseSources,
    };
  }
  return {
    action: "use-defaults",
    reason: "no governing policy exists at the pinned base; skill-owned workflow defaults govern this review",
    governingSources: [],
  };
}

export interface VerifiedApprovalInput {
  decision: OwnerDecisionFact;
  expected: OwnerDecisionExpectation;
  hash: (text: string) => string;
}

/**
 * Apply a verified owner decision to a reviewable violation.
 * A matching decision supplies only its named repository-local exceptions;
 * every other proposed change stays a blocking draft. Edited, revoked,
 * unrelated, or stale approvals cannot be reused blindly: the caller must
 * re-fetch before publication and re-verify here.
 */
export function applyVerifiedApproval(
  outcome: ReviewPolicyOutcome,
  verified: { valid: boolean; reason: string },
  exceptionScope: readonly string[],
): ReviewPolicyOutcome {
  if (outcome.action !== "reviewable-with-blockers") return outcome;
  if (!verified.valid) return outcome;
  const allowed = new Set(exceptionScope);
  // Exact-granularity matching: a file-level draft clears only on an exact
  // file approval. A rule-scoped approval (`REVIEW.md:rule-3`) never clears a
  // whole-file draft. A file approval may clear rule-granular drafts in that
  // file, but narrow approvals never clear broader drafts.
  const isCleared = (sourcePath: string): boolean => {
    if (allowed.has(sourcePath)) return true;
    if (sourcePath.includes(":")) {
      const file = sourcePath.split(":")[0];
      if (allowed.has(file)) return true;
    }
    return false;
  };
  const remaining = outcome.blockingDrafts.filter((d) => !isCleared(d.sourcePath));
  if (remaining.length === 0) {
    return {
      action: "use-existing",
      reason: `verified owner approval covers the named repository-local exceptions (${[...allowed].sort().join(", ")}); remaining review continues under the established base plus approved exceptions`,
      governingSources: outcome.governingSources,
    };
  }
  return {
    action: "reviewable-with-blockers",
    reason: `${outcome.reason} Verified approval covers only its named exceptions; ${remaining.length} unapproved change(s) remain blocking.`,
    governingSources: outcome.governingSources,
    blockingDrafts: remaining,
  };
}

// Retired by ADR-0034: the missing-policy draft bootstrap is removed.
// REVIEW.md is optional; absence uses skill-owned defaults and creates nothing.
