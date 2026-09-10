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

/** Validated inline comment for the pending-review `comments` payload. */
export interface PendingInlineComment {
  path: string;
  line: number;
  side?: "LEFT" | "RIGHT";
  startLine?: number;
  startSide?: "LEFT" | "RIGHT";
  body: string;
}

export interface CreatePendingOptions {
  /** Deterministic publication marker identifying the intended draft. */
  body?: string;
  comments?: readonly PendingInlineComment[];
}

export interface TransportReadBack {
  reviewId: string;
  author: string;
  commitSha: string;
  state: string;
  body: string;
  submittedAt?: string;
  sourceUrl?: string;
  commentIds: readonly string[];
  /** True when the comment list is a complete native enumeration. */
  commentsComplete: boolean;
}

/**
 * Review publication transport (ADR-0035, narrowed by ADR-0038 and ADR-0040).
 * One publication is create-pending at the pinned commit, submit that same
 * review with the final body, read back, and validate. The native review
 * identity is captured from the create response and never guessed; a
 * completed publication's handoff carries the observed native ID, comment
 * IDs, source URL, and (once GitHub reports it) the submission timestamp.
 *
 * Native semantics follow the GitHub REST contract: a pending review is
 * created without an event; the review is submitted through the events
 * endpoint with an explicit event (COMMENT, APPROVE, or REQUEST_CHANGES)
 * and the final body. Submitted reviews read back as COMMENTED, APPROVED,
 * or CHANGES_REQUESTED, never as PENDING or a made-up SUBMITTED state.
 * Uncertain responses reconcile by read-back, never by blind retry, and a
 * stopped publication resumes only the identified review. When a create
 * response is lost, `listPendingReviews` is the single discovery operation
 * used to adopt exactly one pending review authored by this actor at the
 * pinned commit; zero or multiple pending reviews stop. A failed comment
 * read is null, never an empty success list.
 */
export interface ReviewPublicationTransport {
  readonly name: string;
  createPendingReview(
    prNumber: number,
    commitSha: string,
    options?: CreatePendingOptions,
  ): Promise<{ ok: true; reviewId: string } | { ok: false; reason: string }>;
  submitReview(
    prNumber: number,
    reviewId: string,
    body: string,
    event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES",
  ): Promise<{ ok: true } | { ok: false; reason: string }>;
  readBackReview(prNumber: number, reviewId: string): Promise<TransportReadBack | null>;
  /**
   * Pending reviews authored by this actor at the pinned commit, used only
   * to reconcile a lost create response. `null` means discovery itself is
   * unavailable, which never authorizes a blind retry.
   */
  listPendingReviews(prNumber: number, commitSha: string): Promise<readonly TransportReadBack[] | null>;
  /**
   * Complete review list for exact completed-publication reuse. `null` means
   * discovery is unavailable; callers stop on ambiguity and never guess.
   */
  listReviews(prNumber: number): Promise<readonly TransportReadBack[] | null>;
  /** Authenticated actor login, or null when it cannot be observed. */
  currentActor?(): string | null | Promise<string | null>;
  /**
   * Independently observed reviewer permission for one user. `triage`/`read`
   * map to `unknown` because they never authorize publication. `null` transport
   * support means the caller must stop, never trust a payload claim.
   */
  observeReviewerPermission?(username: string): Promise<"policy" | "write" | "maintain" | "admin" | "unknown">;
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
