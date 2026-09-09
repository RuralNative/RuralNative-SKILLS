// Host contracts for the single pull-request review (review-only).
//
// Host-neutral interfaces for GitHub facts, required checks, and review
// publication. No fixes, merge, label, promotion, or closure adapters. No
// cloud review, no local-review adapter, no wave orchestration. Tests supply
// fakes and never call live GitHub.

import type { PullRequestLink } from "./discovery.ts";

export interface GitHubAdapter {
  readonly name: string;
  fetchPullRequest(prNumber: number): Promise<PullRequestLink | null>;
  fetchRequiredChecks(prNumber: number): Promise<{ green: boolean; pending: boolean; headSha: string; baseSha: string }>;
}

/**
 * Review publication transport (ADR-0035, narrowed by ADR-0038). One
 * publication is create-pending at the pinned commit, submit that same
 * review with the final body, read back, and validate. The native review
 * identity is captured from the create response and never guessed; a
 * completed publication's handoff carries the observed native ID, comment
 * IDs, source URL, and (once GitHub reports it) the submission timestamp.
 *
 * Native semantics follow the GitHub REST contract: a pending review is
 * created without an event and without a body; the review is submitted
 * through the events endpoint with an explicit event (COMMENT, APPROVE, or
 * REQUEST_CHANGES) and the final body. Submitted reviews read back as
 * COMMENTED, APPROVED, or CHANGES_REQUESTED, never as PENDING or a made-up
 * SUBMITTED state. Uncertain responses reconcile by read-back, never by
 * blind retry, and a stopped publication resumes only the identified review.
 * When a create response is lost, `listPendingReviews` is the single
 * discovery operation used to adopt exactly one pending review authored by
 * this actor at the pinned commit; zero or multiple pending reviews stop.
 */
export interface ReviewPublicationTransport {
  readonly name: string;
  createPendingReview(
    prNumber: number,
    commitSha: string,
  ): Promise<{ ok: true; reviewId: string } | { ok: false; reason: string }>;
  submitReview(
    prNumber: number,
    reviewId: string,
    body: string,
    event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES",
  ): Promise<{ ok: true } | { ok: false; reason: string }>;
  readBackReview(prNumber: number, reviewId: string): Promise<{
    reviewId: string;
    author: string;
    commitSha: string;
    state: string;
    body: string;
    submittedAt?: string;
    sourceUrl?: string;
    commentIds: readonly string[];
  } | null>;
  /**
   * Pending reviews authored by this actor at the pinned commit, used only
   * to reconcile a lost create response. `null` means discovery itself is
   * unavailable, which never authorizes a blind retry.
   */
  listPendingReviews(prNumber: number, commitSha: string): Promise<readonly {
    reviewId: string;
    author: string;
    commitSha: string;
    state: string;
    body: string;
    submittedAt?: string;
    sourceUrl?: string;
    commentIds: readonly string[];
  }[] | null>;
}

/**
 * A required CI check counts as broad verification only when repository
 * policy or checked-in workflow configuration maps that check to the full
 * repository gate. A matching check name alone is insufficient.
 */
export function isEquivalentCi(
  policyMapsCheckToFullGate: boolean,
  workflowMapsCheckToFullGate: boolean,
): boolean {
  return policyMapsCheckToFullGate || workflowMapsCheckToFullGate;
}
