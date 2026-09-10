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
  /**
   * True when the expected branch already exists locally or on the remote.
   * When invoked from `main` against an existing branch, the run stops with
   * a switch instruction instead of recreating it.
   */
  expectedBranchExists?: boolean;
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
  if (fact.expectedBranch.trim() === "" || fact.currentBranch.trim() === "") {
    return {
      action: "stop",
      reason: "no trustworthy branch identity; resolve the expected feature branch outside this command",
    };
  }
  if (fact.currentBranch === "main") {
    if (fact.expectedBranchExists === true) {
      return {
        action: "stop",
        reason: `branch ${fact.expectedBranch} already exists; switch to it outside this command instead of recreating it`,
      };
    }
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

export interface DeliveryCompletionFact extends DeliveryFact {
  /** Repository of the pull request, e.g. `owner/name`. */
  repository?: string;
  /** Expected repository of the ticket. */
  expectedRepository?: string;
  /** Pull-request base branch name. */
  baseBranch?: string;
  /** Pinned repository default branch; required, never defaults to `main`. */
  expectedBaseBranch?: string;
  /** Pull-request head branch name. */
  headBranch?: string;
  /** Expected feature branch for the ticket. */
  expectedBranch?: string;
  /** Pull-request head SHA. */
  headSha?: string;
  /** Local pushed commit the evidence was verified against. */
  expectedHeadSha?: string;
  /** Evidence status from the shared handoff validator. */
  evidenceStatus?: string;
}

export type DeliveryCompletion =
  | { delivered: true; reason: string }
  | { delivered: false; reason: string };

/**
 * Read-back completion: the observed pull request must be open in the
 * expected repository, against the pinned default branch, on the expected
 * head branch and SHA, with a valid closing reference and current validated
 * evidence. Never infer success from a write response. Evidence must carry
 * the shared-validator `current` status and the head SHA must equal the
 * pushed commit. A mid-run default-branch change or an incompatible existing
 * PR stops instead of retargeting silently (ADR-0040).
 */
export function decideDeliveryCompletion(fact: DeliveryCompletionFact): DeliveryCompletion {
  if (!fact.pullRequestOpen) return { delivered: false, reason: "the pull request is not open" };
  if (!fact.closingReferenceValid) {
    return { delivered: false, reason: "the pull request has no valid closing reference for this ticket" };
  }
  if (!fact.evidenceInPullRequestBody) {
    return { delivered: false, reason: "the pull-request body carries no validated implementation evidence" };
  }
  if (!fact.requirementsCurrent) {
    return { delivered: false, reason: "the issue bodies no longer match the pinned requirements revision" };
  }
  if (fact.evidenceStatus !== "current") {
    return { delivered: false, reason: `implementation evidence is ${fact.evidenceStatus ?? "unvalidated"}; reconcile it outside review` };
  }
  if (!fact.repository?.trim() || !fact.expectedRepository?.trim()) {
    return { delivered: false, reason: "no trustworthy repository identity for the pull request" };
  }
  if (fact.repository!.toLowerCase() !== fact.expectedRepository!.toLowerCase()) {
    return { delivered: false, reason: "the pull request lives in another repository" };
  }
  const expectedBase = (fact.expectedBaseBranch ?? "").trim();
  if (expectedBase === "") {
    return { delivered: false, reason: "no trustworthy default branch for delivery; pin the repository default branch from GitHub before delivery" };
  }
  if (!fact.baseBranch || fact.baseBranch !== expectedBase) {
    return { delivered: false, reason: `the pull request does not target the pinned default branch ${expectedBase}` };
  }
  if (!fact.headBranch?.trim() || !fact.expectedBranch?.trim()) {
    return { delivered: false, reason: "no trustworthy head branch identity for the pull request" };
  }
  if (fact.headBranch !== fact.expectedBranch) {
    return { delivered: false, reason: "the pull-request head branch does not match the ticket branch" };
  }
  if (!fact.headSha?.trim() || !fact.expectedHeadSha?.trim()) {
    return { delivered: false, reason: "no trustworthy head SHA binding for the implementation evidence" };
  }
  if (fact.headSha !== fact.expectedHeadSha) {
    return { delivered: false, reason: "the pull-request head SHA does not match the pushed implementation commit" };
  }
  return { delivered: true, reason: "open pull request with valid closing reference and current evidence on the pushed head" };
}

export type TicketPath = "fresh" | "repair";

export interface TicketPathFact {
  labels: readonly string[];
  /** Exactly one verified matching open PR exists. */
  hasSingleMatchingPr: boolean;
}

/** Fresh work carries `ready-for-agent`; repair continues `ready-for-human`. */
export function decideTicketPath(fact: TicketPathFact): TicketPath | null {
  const labels = new Set(fact.labels);
  if (labels.has("ready-for-agent")) return "fresh";
  if (labels.has("ready-for-human") && fact.hasSingleMatchingPr) return "repair";
  return null;
}
