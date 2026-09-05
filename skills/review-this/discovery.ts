// Single pull-request readiness for /review-this (ADR-0031).
//
// Pure decisions over observed GitHub facts. No network, GitHub, git,
// filesystem, or Agent Manager calls.

export interface PullRequestLink {
  ticket: number | null;
  prNumber: number;
  headSha: string;
  baseSha: string;
  state: "open" | "closed" | "merged";
  mergeable: boolean;
  requiredChecksGreen: boolean;
  /** The ticket number of the PR's valid closing reference, or null. */
  closesTicket: number | null;
  /** Compact or legacy implementation evidence on the current head. */
  hasEvidence: boolean;
  /**
   * Requirements revision the implementation evidence pinned. Absent on
   * evidence posted before the revision contract existed; the session
   * compares only when a pin is present.
   */
  requirementsRevision?: string;
}

export interface ReviewReadinessFact {
  pullRequest: PullRequestLink;
  /** The current issue bodies still match the pinned requirements revision. */
  requirementsCurrent: boolean;
}

export type ReadinessDecision =
  | { ready: true; reason: string }
  | { ready: false; reason: string };

/**
 * A single pull request is ready when it is open, carries a valid closing
 * reference, has implementation evidence, and the current issue bodies still
 * match the pinned requirements revision. `ready-for-human` keeps its triage
 * meaning and is never readiness.
 */
export function isReviewReady(fact: ReviewReadinessFact): ReadinessDecision {
  const pr = fact.pullRequest;
  if (pr.headSha.trim() === "" || pr.baseSha.trim() === "") {
    return { ready: false, reason: `pull request #${pr.prNumber} has no trustworthy revision pair` };
  }
  if (pr.state !== "open") {
    return { ready: false, reason: `pull request #${pr.prNumber} is ${pr.state}` };
  }
  if (pr.closesTicket === null || pr.closesTicket !== pr.ticket) {
    return { ready: false, reason: `pull request #${pr.prNumber} has no valid closing reference` };
  }
  if (!pr.hasEvidence) {
    return { ready: false, reason: `pull request #${pr.prNumber} has no implementation evidence` };
  }
  if (!fact.requirementsCurrent) {
    return { ready: false, reason: "the issue bodies no longer match the pinned requirements revision" };
  }
  return { ready: true, reason: "open pull request with a valid closing reference, evidence, and current requirements" };
}
