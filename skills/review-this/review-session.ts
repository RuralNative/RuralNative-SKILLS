// Single pull-request session decisions for /review-this (ADR-0031).
//
// Pure: facts in, decisions out. No network, GitHub, git, filesystem, or
// Agent Manager calls. Covers current-checkout match, delta-versus-full
// review, one-check CI gating with local fallback, and verdict reuse.

import {
  fixRoundDecision,
  isMergeEligible,
  reviewIsFresh,
  verdictReusable,
  type PullRequestFact,
  type ReviewFact,
  type TrustedVerdictKey,
} from "./workflow-state.ts";

export { fixRoundDecision, reviewIsFresh, verdictReusable, isMergeEligible };

export interface CheckoutMatchFact {
  /** The worktree has no uncommitted changes. */
  worktreeClean: boolean;
  /** Current branch name in the invoking checkout. */
  currentBranch: string;
  /** Expected pull-request head branch name. */
  expectedBranch: string;
  /** Local `HEAD` SHA in the invoking checkout. */
  localHeadSha: string;
  /** Pull-request head SHA. */
  pullRequestHeadSha: string;
}

export type CheckoutMatchDecision =
  | { match: true; reason: string }
  | { match: false; reason: string };

/**
 * The current checkout must match the selected pull-request head. A mismatch
 * stops instead of checking out or creating another worktree.
 */
export function checkoutMatchDecision(
  fact: CheckoutMatchFact,
): CheckoutMatchDecision {
  if (!fact.worktreeClean) {
    return { match: false, reason: "the current checkout is dirty; commit or stash outside this command" };
  }
  if (fact.localHeadSha.trim() === "" || fact.pullRequestHeadSha.trim() === "") {
    return { match: false, reason: "no trustworthy pull-request head revision to match" };
  }
  if (fact.currentBranch !== fact.expectedBranch) {
    return {
      match: false,
      reason: `the current checkout is on ${fact.currentBranch}, not the pull-request branch ${fact.expectedBranch}`,
    };
  }
  if (fact.localHeadSha !== fact.pullRequestHeadSha) {
    return {
      match: false,
      reason: "local HEAD does not match the pull-request head; fetch and align outside this command",
    };
  }
  return { match: true, reason: "the current checkout matches the pull-request head" };
}

export interface RevisionChangeFact {
  addsSeam: boolean;
  touchesTrustBoundary: boolean;
  touchesSchema: boolean;
  touchesDependencyState: boolean;
  touchesGeneratedContract: boolean;
  touchesPublicInterface: boolean;
  materiallyWidensDiff: boolean;
}

export type ReviewScope = "delta" | "full";

/** Later revisions receive delta review unless a named risk trigger requires full review again. */
export function deltaReviewScope(fact: RevisionChangeFact): { scope: ReviewScope; reason: string } {
  const triggered =
    fact.addsSeam ||
    fact.touchesTrustBoundary ||
    fact.touchesSchema ||
    fact.touchesDependencyState ||
    fact.touchesGeneratedContract ||
    fact.touchesPublicInterface ||
    fact.materiallyWidensDiff;
  return triggered
    ? { scope: "full", reason: "a risk trigger requires another full review" }
    : { scope: "delta", reason: "changed hunks and impacted callers only" };
}

/**
 * The post-fix review is always exactly one delta review over the accepted
 * fix diff. Risk triggers apply only to later independently-pushed revisions,
 * never to this bounded fix round.
 */
export function postFixReviewScope(): { scope: "delta"; reason: string } {
  return { scope: "delta", reason: "one delta review over the accepted fix diff" };
}

export interface CiGateFact {
  requiredChecksGreen: boolean;
  requiredChecksPending: boolean;
  /** Repository policy or checked-in workflow maps a required check to the full gate. */
  equivalentCiEstablished: boolean;
  /** Full local gate result when run once as fallback. */
  localFallbackPassed: boolean | null;
}

export type CiGateDecision =
  | { action: "merge-eligible"; reason: string }
  | { action: "publish-and-stop"; reason: string }
  | { action: "run-fallback-once"; reason: string }
  | { action: "stop"; reason: string };

/**
 * One-check CI gating. Pending CI publishes the pinned verdict and stops
 * without polling. Required checks must be green in every path; the local
 * fallback supplies broad verification only and never excuses failed
 * required checks. Green equivalent CI is merge-eligible. Green checks with
 * no equivalent mapping run the full local gate once as fallback.
 */
export function ciGateDecision(fact: CiGateFact): CiGateDecision {
  if (fact.requiredChecksPending) {
    return { action: "publish-and-stop", reason: "required CI is pending; publish the pinned verdict and stop" };
  }
  if (!fact.requiredChecksGreen) {
    return { action: "stop", reason: "required CI failed; do not merge" };
  }
  if (fact.equivalentCiEstablished) {
    return { action: "merge-eligible", reason: "equivalent required CI is green on the reviewed head and base" };
  }
  if (fact.localFallbackPassed === true) {
    return { action: "merge-eligible", reason: "required checks are green and the approved local fallback passed once" };
  }
  if (fact.localFallbackPassed === false) {
    return { action: "stop", reason: "verification failed; do not merge" };
  }
  return { action: "run-fallback-once", reason: "no equivalent CI mapping; run the full local gate once" };
}

export interface VerdictReuseFact {
  pinned: TrustedVerdictKey;
  current: TrustedVerdictKey;
}

/** Reuse a pinned verdict only when head, base, requirements, and policy are unchanged. */
export function shouldReuseVerdict(fact: VerdictReuseFact): { reuse: boolean; reason: string } {
  if (verdictReusable(fact.pinned, fact.current)) {
    return { reuse: true, reason: "head, base, requirements revision, and review policy are unchanged" };
  }
  return { reuse: false, reason: "a verdict key moved; review the current revision" };
}

export type { PullRequestFact, ReviewFact, TrustedVerdictKey };
