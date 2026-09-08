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

export type EvidenceProvenance = "pre-contract" | "unknown";

export interface ReviewReadinessFact {
  pullRequest: PullRequestLink;
  /** The current issue bodies still match the pinned requirements revision. */
  requirementsCurrent: boolean;
  /**
   * Validated evidence status from `validateEvidenceHandoff`. Required for
   * normal readiness: callers must parse the actual PR body. Only unpinned
   * pre-contract evidence may proceed without it via `evidenceProvenance`.
   */
  evidenceStatus?: string;
  /**
   * Positive provenance for evidence that predates the revision contract.
   * Defaults to `unknown`: unpinned evidence without `pre-contract`
   * provenance is not ready.
   */
  evidenceProvenance?: EvidenceProvenance;
}

export type ReadinessDecision =
  | { ready: true; reason: string }
  | { ready: false; reason: string };

/**
 * A single pull request is ready when it is open, carries a valid closing
 * reference, has validated current implementation evidence, and the current
 * issue bodies still match the pinned requirements revision.
 * `ready-for-human` keeps its triage meaning and is never readiness. Review
 * never fabricates a pin or repairs the PR body.
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
  if (fact.evidenceStatus !== undefined) {
    if (fact.evidenceStatus !== "current") {
      return {
        ready: false,
        reason: `pull request #${pr.prNumber} implementation evidence is ${fact.evidenceStatus}; reconcile it outside review`,
      };
    }
  } else if ((pr.requirementsRevision ?? "").trim() === "" && fact.evidenceProvenance === "pre-contract") {
    // Legacy compatibility: unpinned pre-contract evidence with established
    // provenance proceeds to the requirements-current check below.
  } else if ((pr.requirementsRevision ?? "").trim() === "") {
    return {
      ready: false,
      reason: `pull request #${pr.prNumber} carries no requirements pin; reconcile implementation evidence outside review`,
    };
  } else {
    return {
      ready: false,
      reason: `pull request #${pr.prNumber} implementation evidence was not validated with validateEvidenceHandoff; reconcile it outside review`,
    };
  }
  if (!fact.requirementsCurrent) {
    return { ready: false, reason: "the issue bodies no longer match the pinned requirements revision" };
  }
  return { ready: true, reason: "open pull request with a valid closing reference, evidence, and current requirements" };
}
