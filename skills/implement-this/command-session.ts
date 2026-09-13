// Current-checkout decisions for /implement-this (ADR-0031).
//
// Pure: facts in, decisions out. No network, GitHub, git, filesystem, or
// Agent Manager calls. The run works only in the invoking checkout and never
// plans a worktree or session.

export interface ContinuationEditsFact {
  /** Ticket the recorded edits were made for. */
  recordedTicket: number;
  /** Ticket authorized for this run. Must equal the recorded ticket. */
  authorizedTicket: number;
  /** Repository identity scopes the ticket number. */
  recordedRepository: string;
  authorizedRepository: string;
  /** Recorded starting HEAD when the edits began. */
  recordedBaseSha: string;
  /** Currently observed base HEAD to compare against the record. */
  observedBaseSha: string;
  /** Exact recorded changed paths. */
  recordedPaths: readonly string[];
  /** Currently observed changed paths. */
  observedPaths: readonly string[];
  /** Recorded index digest. */
  recordedIndexDigest: string;
  /** Currently observed index digest. */
  observedIndexDigest: string;
  /** Recorded worktree digest. */
  recordedWorktreeDigest: string;
  /** Currently observed worktree digest. */
  observedWorktreeDigest: string;
}

export interface CheckoutFact {
  /** The worktree has no uncommitted changes. */
  worktreeClean: boolean;
  /** Current branch name, e.g. `main` or `impl/100-short-name`. */
  currentBranch: string;
  /** Expected feature branch for the ticket, e.g. `impl/100-short-name`. */
  expectedBranch: string;
  /**
   * True when the expected branch already exists locally or on the remote.
   * When invoked from the pinned default branch against an existing branch,
   * the run switches safely and reuses it instead of recreating it.
   */
  expectedBranchExists?: boolean;
  /** Observed destination commit; dirty edits can switch only at the same HEAD. */
  expectedBranchHeadSha?: string;
  /**
   * Observed pinned repository default branch; required, never assumes
   * `main`. The caller pins it from GitHub before deciding the checkout.
   */
  defaultBranch?: string;
  /**
   * Verified continuation provenance for dirty task-owned edits. Absent or
   * failing means no verified ownership: unknown edits route to preservation,
   * never to a destructive action. Ownership is derived here from the parts
   * (target, revisions, exact paths, index and worktree digests), never from
   * one caller-supplied flag, a branch name, or a matching filename.
   */
  continuation?: ContinuationEditsFact;
}

export type CheckoutDecision =
  | { action: "create-branch"; branch: string; reason: string }
  | { action: "reuse-branch"; branch: string; reason: string }
  | { action: "switch-branch"; branch: string; reason: string }
  | { action: "preserve"; reason: string }
  | { action: "stop"; reason: string };

function samePathSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, i) => value === sortedB[i]);
}

/**
 * True only when the dirty edits are attributable to this authorized run:
 * same ticket target, same base revision, same exact paths, and same index
 * plus worktree digests. Any missing or mismatched part is unverified.
 */
export function isVerifiedContinuationEdits(fact: ContinuationEditsFact | undefined): boolean {
  if (!fact) return false;
  if (!Number.isInteger(fact.recordedTicket) || fact.recordedTicket <= 0) return false;
  if (fact.recordedTicket !== fact.authorizedTicket) return false;
  if (!fact.recordedRepository?.trim() || !fact.authorizedRepository?.trim()) return false;
  if (fact.recordedRepository.trim().toLowerCase() !== fact.authorizedRepository.trim().toLowerCase()) return false;
  if (fact.recordedBaseSha.trim() === "" || fact.recordedBaseSha.trim() !== fact.observedBaseSha.trim()) {
    return false;
  }
  if (fact.observedPaths.length === 0 || !samePathSet(fact.recordedPaths, fact.observedPaths)) {
    return false;
  }
  if (fact.recordedIndexDigest.trim() === "" || fact.recordedIndexDigest.trim() !== fact.observedIndexDigest.trim()) {
    return false;
  }
  if (fact.recordedWorktreeDigest.trim() === "" || fact.recordedWorktreeDigest.trim() !== fact.observedWorktreeDigest.trim()) {
    return false;
  }
  return true;
}

/**
 * Decide branch handling in the current checkout (ADR-0041 narrowing). The
 * observed default branch selects the creation point, never a hard-coded
 * `main`. A verified existing feature branch is reused automatically via a
 * safe switch, not a manual-switch stop. Verified task-owned dirty edits
 * resume in place instead of failing the clean-entry gate. Unverified dirty
 * edits route to verified preservation before any necessary switch and are
 * never discarded. No worktree intent exists in any branch.
 */
export function checkoutDecision(fact: CheckoutFact): CheckoutDecision {
  if (fact.expectedBranch.trim() === "" || fact.currentBranch.trim() === "") {
    return {
      action: "stop",
      reason: "no trustworthy branch identity; resolve the expected feature branch before checkout preparation",
    };
  }
  const defaultBranch = (fact.defaultBranch ?? "").trim();
  if (defaultBranch === "") {
    return {
      action: "stop",
      reason: "no trustworthy default branch for checkout preparation; pin the repository default branch from GitHub before deciding the checkout",
    };
  }
  if (fact.expectedBranch === defaultBranch) {
    return {
      action: "stop",
      reason: "the expected feature branch must not equal the pinned default branch; resolve the ticket branch before checkout preparation",
    };
  }
  if (!fact.worktreeClean && !isVerifiedContinuationEdits(fact.continuation)) {
    return {
      action: "preserve",
      reason: "the checkout carries unverified edits; preserve them through checked recovery before any necessary switch, never discarding unknown edits; unsafe preservation stops the mutation",
    };
  }
  const resuming = !fact.worktreeClean;
  if (fact.currentBranch === fact.expectedBranch) {
    return {
      action: "reuse-branch",
      branch: fact.currentBranch,
      reason: resuming
        ? "verified task-owned edits resume in place on the ticket feature branch in the current checkout"
        : "already on the ticket feature branch in the current checkout",
    };
  }
  if (fact.expectedBranchExists === true) {
    if (resuming && fact.expectedBranchHeadSha?.trim() !== fact.continuation!.observedBaseSha.trim()) {
      return { action: "preserve", reason: "preserve task edits before switching to an unknown or different revision; never carry saved edits onto different content" };
    }
    return {
      action: "switch-branch",
      branch: fact.expectedBranch,
      reason: "switch safely to the verified existing feature branch after checking repository, target association, and revision; dirty task edits stay on their recorded revision",
    };
  }
  if (fact.currentBranch === defaultBranch) {
    return {
      action: "create-branch",
      branch: fact.expectedBranch,
      reason: resuming
        ? "verified task-owned edits resume; create the feature branch in the current checkout from the pinned default branch"
        : `invoked from the pinned default branch ${defaultBranch}; create the feature branch in the current checkout`,
    };
  }
  return {
    action: "stop",
    reason: `the current checkout is on ${fact.currentBranch}, not ${fact.expectedBranch}; verify the ticket branch and its creation point before checkout preparation`,
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
