// Current-checkout decisions for /implement-this (ADR-0031).
//
// Pure: facts in, decisions out. No network, GitHub, git, filesystem, or
// Agent Manager calls. The run works only in the invoking checkout and never
// plans a worktree or session.

export interface CheckoutFact {
  /** The worktree has no uncommitted changes. */
  worktreeClean: boolean;
  /** Current branch name, e.g. `main` or `impl/100-short-name`. */
  currentBranch: string;
  /** Expected feature branch for the ticket, e.g. `impl/100-short-name`. */
  expectedBranch: string;
}

export type CheckoutDecision =
  | { action: "create-branch"; branch: string; reason: string }
  | { action: "reuse-branch"; branch: string; reason: string }
  | { action: "stop"; reason: string };

/**
 * Decide branch handling in the current checkout. A dirty checkout stops
 * before edits. From `main`, create the expected feature branch in this
 * checkout. Otherwise reuse the current branch when it matches, or stop when
 * it does not. No worktree intent exists in any branch.
 */
export function checkoutDecision(fact: CheckoutFact): CheckoutDecision {
  if (!fact.worktreeClean) {
    return {
      action: "stop",
      reason: "the current checkout is dirty; commit or stash before implementing",
    };
  }
  if (fact.currentBranch === "main") {
    return {
      action: "create-branch",
      branch: fact.expectedBranch,
      reason: "invoked from main; create the feature branch in the current checkout",
    };
  }
  if (fact.currentBranch === fact.expectedBranch) {
    return {
      action: "reuse-branch",
      branch: fact.currentBranch,
      reason: "already on the ticket feature branch in the current checkout",
    };
  }
  return {
    action: "stop",
    reason: `the current checkout is on ${fact.currentBranch}, not ${fact.expectedBranch}; switch checkouts outside this command`,
  };
}

export interface DeliveryFact {
  pullRequestOpen: boolean;
  closingReferenceValid: boolean;
  /** Compact evidence is upserted into the pull-request body. */
  evidenceInPullRequestBody: boolean;
  /**
   * The current parent and ticket bodies still match the pinned
   * requirements revision. A body edit invalidates delivery.
   */
  requirementsCurrent: boolean;
}

/**
 * Durable delivery lives on GitHub: an open pull request with a valid
 * closing reference and compact evidence in its body, computed against a
 * requirements revision that still matches the current issue bodies.
 */
export function isDelivered(fact: DeliveryFact): boolean {
  return (
    fact.pullRequestOpen &&
    fact.closingReferenceValid &&
    fact.evidenceInPullRequestBody &&
    fact.requirementsCurrent
  );
}
