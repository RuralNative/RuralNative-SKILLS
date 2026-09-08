// Review-policy resolution for /review-this (review-only).
//
// Pure: facts in, decisions out. No network, GitHub, git, filesystem, or
// Agent Manager calls. REVIEW.md is optional project guidance: general
// workflow rules live in the skill, repository-specific standards come from
// existing docs and configuration. A missing file never blocks review and
// nothing is created here.

import { REVIEW_CONTRACT_VERSION, effectivePolicyRevision as sharedEffectivePolicyRevision, type PolicySource as SharedPolicySource } from "./workflow-state.ts";

export { REVIEW_CONTRACT_VERSION };

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
 */
export const effectivePolicyRevision = sharedEffectivePolicyRevision;

// Retired by ADR-0034: the missing-policy draft bootstrap is removed.
// REVIEW.md is optional; absence uses skill-owned defaults and creates nothing.
