// Review-only publication procedure for the single pull-request review
// (ADR-0035, narrowed by ADR-0038 and ADR-0040).
//
// One complete, verifiable review publication is one bounded step: refresh
// pinned inputs happens before this procedure; here the run creates one
// pending review at the pinned commit, retrieves the native review identity,
// submits that same review with the final rendered body, reads it back, and
// validates the read-back. Tests replace the transport with host-shaped
// fakes that allocate IDs only on creation and return persisted bodies; they
// never call live GitHub.
//
// Native review states follow the GitHub REST contract: PENDING before
// submission, then COMMENTED, APPROVED, or CHANGES_REQUESTED (never a
// made-up SUBMITTED value), and DISMISSED for reviews a maintainer
// dismissed. A pending review is created without an event; submission posts
// the final body to the review events endpoint with an explicit event
// (COMMENT, APPROVE, or REQUEST_CHANGES).
//
// The procedure never applies fixes, edits source, merges, labels, promotes,
// or closes, and it never repairs the pull-request body. Pending or failed
// publication never authorizes finalization. Uncertain responses reconcile by
// reading back once; if one reconciliation cannot establish the outcome the
// run stops and names the identified review for an explicit resume. A lost
// create response is reconciled through `listPendingReviews`: exactly one
// pending review authored by this actor at the pinned commit carrying the
// publication marker is adopted, zero or multiple pending reviews stop.
// Publication claims success only after the read-back body passes the full
// `validateReviewHandoff` provenance check with independently observed
// permission and complete comment enumeration.

import { createHash } from "node:crypto";
import {
  renderReviewHandoff,
  validateReviewHandoff,
  type ReviewHandoffInput,
} from "./workflow-state.ts";
import type {
  PendingInlineComment,
  ReviewPublicationTransport,
  TransportReadBack,
} from "./adapters.ts";
import { decidePublicationResume } from "./prepare-review.ts";

function isAuthorizedPublicationPermission(
  value: unknown,
): value is "policy" | "write" | "maintain" | "admin" {
  return value === "policy" || value === "write" || value === "maintain" || value === "admin";
}

export type { PendingInlineComment, ReviewPublicationTransport, TransportReadBack };
export type ReadBackReview = TransportReadBack;

export interface ReviewPublicationInput {
  /** Repository in `owner/name` form. */
  repository: string;
  /** Pull-request number the review is published to. */
  prNumber: number;
  /** Pinned commit the pending review is attached to. */
  commitSha: string;
  /** Reviewer-readable `## Standards` and `## Spec` prose. */
  reviewProse: string;
  /** Validated handoff content rendered into the same published body. */
  handoff: ReviewHandoffInput;
  /** Native event used to submit the pending review; defaults to `COMMENT`. */
  submitEvent?: "COMMENT" | "APPROVE" | "REQUEST_CHANGES";
  /**
   * Explicit human approval for a non-default submit event. `COMMENT` needs
   * no approval; `APPROVE` and `REQUEST_CHANGES` stop without it and never
   * retry as another event.
   */
  nonDefaultEventApproved?: boolean;
  /**
   * Reviewer permission from an independent fresh read, never the handoff
   * payload or `author_association`. `unknown` stops.
   */
  observedReviewerPermission: "policy" | "write" | "maintain" | "admin" | "unknown";
  /** Expected native author login for ownership checks, when known. */
  expectedAuthor?: string;
  /** Validated inline findings published as native pending-review comments. */
  inlineComments?: readonly PendingInlineComment[];
  /**
   * Identified review from a stopped publication to resume. The read-back
   * must confirm the review belongs to this publication before any write;
   * a completed submission with the same body is not repeated.
   */
  resumeReviewId?: string;
}

export type ReviewState =
  | "PENDING"
  | "COMMENTED"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "DISMISSED"
  | string;

/** Native states a submitted review reads back as (GitHub REST). */
export const SUBMITTED_REVIEW_STATES = [
  "COMMENTED",
  "APPROVED",
  "CHANGES_REQUESTED",
] as const;

export function isSubmittedReviewState(state: string): boolean {
  const normalized = state.toUpperCase();
  return (SUBMITTED_REVIEW_STATES as readonly string[]).includes(normalized);
}

export type ReviewPublicationOutcome =
  | {
      status: "published";
      reason: string;
      reviewId: string;
      /** Exact body submitted with the native review identity. */
      body: string;
      readBack: ReadBackReview;
    }
  | {
      status: "stop";
      reason: string;
      /** Identified review when one was created; allows an explicit resume. */
      reviewId?: string;
      step: "create" | "submit" | "read-back";
    };

/**
 * Deterministic publication marker identifying the intended draft
 * (ADR-0040). GitHub provides no review-create idempotency key; this marker
 * in the pending review body identifies the intended draft after a lost
 * response. It carries target, actor, pins, and content identity, never
 * workflow state. Any change to the pinned base, prose, or handoff content
 * changes the marker so a changed publication never adopts an old draft.
 */
export function publicationContentDigest(input: ReviewPublicationInput): string {
  const handoff = input.handoff;
  const material = [
    input.reviewProse,
    handoff.requirementsRevision,
    handoff.reviewPolicyRevision,
    handoff.reviewedHeadSha,
    handoff.reviewedBaseSha,
    String(handoff.closesTicket),
    handoff.verificationCommand,
    handoff.verificationResult,
    String(handoff.verificationPassed),
    JSON.stringify(handoff.findings ?? []),
  ].join("\n");
  return createHash("sha256").update(material, "utf8").digest("hex").slice(0, 16);
}

export function buildPublicationMarker(input: ReviewPublicationInput): string {
  const event = input.submitEvent ?? "COMMENT";
  const author = input.expectedAuthor !== undefined ? ` author=${input.expectedAuthor}` : "";
  return `<!-- ruralnative:publication-marker repository=${input.repository} pr=${input.prNumber} commit=${input.commitSha} base=${input.handoff.reviewedBaseSha} requirements=${input.handoff.requirementsRevision} policy=${input.handoff.reviewPolicyRevision} event=${event}${author} content=${publicationContentDigest(input)} -->`;
}

/**
 * Render the final body with the native review identity: the handoff block
 * carries the real review ID captured from the create response, never a
 * guessed or placeholder value. Observed comment IDs replace the claimed
 * set so the read-back coverage check compares real identities.
 */
export function composeReviewPublicationBodyFor(
  input: ReviewPublicationInput,
  reviewId: string,
  commentIds?: readonly string[],
): string {
  return composeReviewPublicationBody(input.reviewProse, {
    ...input.handoff,
    provenance: {
      ...input.handoff.provenance,
      reviewId,
      commentIds: commentIds ?? input.handoff.provenance.commentIds,
    },
  });
}

/** Compose the single published body: readable prose plus the handoff block. */
export function composeReviewPublicationBody(
  prose: string,
  handoff: ReviewHandoffInput,
): string {
  const block = renderReviewHandoff(handoff);
  const trimmed = prose.trimEnd();
  return trimmed.length > 0 ? `${trimmed}\n\n${block}\n` : `${block}\n`;
}

function reviewMatchesDraft(
  readBack: ReadBackReview,
  input: ReviewPublicationInput,
): boolean {
  if (readBack.commitSha !== input.commitSha) return false;
  if (input.expectedAuthor !== undefined && readBack.author !== input.expectedAuthor) return false;
  const marker = buildPublicationMarker(input);
  const state = readBack.state.toUpperCase();
  // A pending review body is exactly the marker: identity is pinned commit
  // plus full marker plus author when known. Inclusion alone would let an
  // edited draft pass and then be overwritten, so edited content stops.
  // Never adopt an unmarked legacy draft by commit equality alone.
  if (state === "PENDING") return readBack.body === marker;
  return (
    readBack.body.includes("<!-- ruralnative:review-handoff:start -->") &&
    readBack.body.includes("<!-- ruralnative:review-handoff:end -->")
  );
}

/**
 * Full read-back validation (ADR-0038, narrowed by ADR-0040). Publication
 * claims success only when the read-back body validates `current` through
 * `validateReviewHandoff` with independently observed native facts:
 * repository, PR, pinned commit, native ID, author, reviewer permission,
 * source URL, complete comment enumeration, and submission timestamp. A
 * handoff whose payload author or identity disagrees with the native
 * read-back is stale, never published.
 */
function validatePublishedReadBack(
  input: ReviewPublicationInput,
  readBack: ReadBackReview,
  body: string,
): ReviewPublicationOutcome {
  const reviewCompleted = isSubmittedReviewState(readBack.state);
  const dismissed = readBack.state.toUpperCase() === "DISMISSED";
  const result = validateReviewHandoff({
    body: readBack.body,
    repository: input.repository,
    prNumber: input.prNumber,
    currentHeadSha: input.commitSha,
    currentBaseSha: input.handoff.reviewedBaseSha,
    currentRequirementsRevision: input.handoff.requirementsRevision,
    currentReviewPolicyRevision: input.handoff.reviewPolicyRevision,
    observedProvenance: {
      reviewId: readBack.reviewId,
      reviewAuthor: readBack.author,
      reviewerPermission: input.observedReviewerPermission,
      reviewedCommit: readBack.commitSha,
      reviewedAt: readBack.submittedAt,
      sourceUrl: readBack.sourceUrl,
      commentIds: readBack.commentIds,
      commentIdsComplete: readBack.commentsComplete,
    },
    reviewCompleted,
    reviewDismissed: dismissed,
  });
  if (result.status !== "current") {
    return {
      status: "stop",
      reason: `review ${readBack.reviewId} read back but does not validate (${result.reason}); a provenance-deficient publication never counts as published`,
      reviewId: readBack.reviewId,
      step: "read-back",
    };
  }
  return {
    status: "published",
    reason: `review ${readBack.reviewId} submitted and read back on the pinned commit with validated provenance`,
    reviewId: readBack.reviewId,
    body,
    readBack,
  };
}

/**
 * Reconcile a lost create response by discovery (ADR-0038, narrowed by
 * ADR-0040). Exactly one pending review authored by this actor at the pinned
 * commit carrying the publication marker is adopted; zero pending reviews,
 * multiple pending reviews, unmarked drafts, or unavailable discovery stop
 * because the outcome is unknown. This is the only create-recovery path:
 * nothing blind-retries creation.
 */
async function adoptPendingReviewAfterLostCreate(
  input: ReviewPublicationInput,
  transport: ReviewPublicationTransport,
  createReason: string,
): Promise<
  { status: "adopted"; reviewId: string; reason: string } | ReviewPublicationOutcome
> {
  const pending = await transport.listPendingReviews(input.prNumber, input.commitSha);
  if (pending === null) {
    return {
      status: "stop",
      reason: `pending review creation failed (${createReason}) and discovery is unavailable; stop and re-read before any retry`,
      step: "create",
    };
  }
  const marker = buildPublicationMarker(input);
  const pendingHere = pending.filter(
    (review) =>
      review.state.toUpperCase() === "PENDING" &&
      review.commitSha === input.commitSha &&
      review.body === marker &&
      (input.expectedAuthor === undefined || review.author === input.expectedAuthor),
  );
  if (pendingHere.length === 1) {
    return {
      status: "adopted",
      reviewId: pendingHere[0].reviewId,
      reason: `pending review creation reported a failure (${createReason}) but discovery found the single marked pending review ${pendingHere[0].reviewId} at the pinned commit`,
    };
  }
  if (pendingHere.length === 0) {
    return {
      status: "stop",
      reason: `pending review creation failed (${createReason}) and discovery found no marked pending review at the pinned commit; the outcome is unknown, never blind-retry`,
      step: "create",
    };
  }
  return {
    status: "stop",
    reason: `pending review creation failed (${createReason}) and discovery found ${pendingHere.length} marked pending reviews at the pinned commit; never guess which one belongs to this publication`,
    step: "create",
  };
}

/**
 * Run the one bounded publication step. Every write is followed by
 * reconciliation against the read-back; a lost response causes one
 * read-back (or one discovery after a lost create), never a blind retry, and
 * stops when the outcome stays unknown.
 */
async function reuseExactCompletedReview(
  input: ReviewPublicationInput,
  transport: ReviewPublicationTransport,
): Promise<ReviewPublicationOutcome | null> {
  // Scratch-free recovery: reuse one exact completed publication instead of
  // creating a second review. Exact means same commit, same author when
  // known, submitted state, and a body that already equals the body this
  // input would submit for that review identity with its observed comments.
  // Zero matches proceed to creation; multiple matches or unreadable
  // discovery stop because the outcome is ambiguous.
  if (typeof transport.listReviews !== "function") return null;
  const listed = await transport.listReviews(input.prNumber);
  if (listed === null) return null;
  const candidates: TransportReadBack[] = [];
  for (const summary of listed) {
    if (!isSubmittedReviewState(summary.state)) continue;
    if (summary.commitSha !== input.commitSha) continue;
    if (input.expectedAuthor !== undefined && summary.author !== input.expectedAuthor) continue;
    const full = await transport.readBackReview(input.prNumber, summary.reviewId);
    if (full === null) {
      return {
        status: "stop",
        reason: `completed-review discovery found ${summary.reviewId} but it is unreadable; stop instead of creating a duplicate`,
        step: "create",
      };
    }
    if (full.commitSha !== input.commitSha) continue;
    if (input.expectedAuthor !== undefined && full.author !== input.expectedAuthor) continue;
    if (!isSubmittedReviewState(full.state)) continue;
    const expected = composeReviewPublicationBodyFor(input, full.reviewId, full.commentIds);
    if (full.body !== expected) continue;
    candidates.push(full);
  }
  if (candidates.length === 0) return null;
  if (candidates.length > 1) {
    return {
      status: "stop",
      reason: `discovery found ${candidates.length} matching completed reviews; never guess which one belongs to this publication`,
      step: "create",
    };
  }
  const match = candidates[0];
  const body = composeReviewPublicationBodyFor(input, match.reviewId, match.commentIds);
  return validatePublishedReadBack(input, match, body);
}

export async function publishReviewPublication(
  input: ReviewPublicationInput,
  transport: ReviewPublicationTransport,
): Promise<ReviewPublicationOutcome> {
  const submitEvent = input.submitEvent ?? "COMMENT";
  if (submitEvent !== "COMMENT" && input.nonDefaultEventApproved !== true) {
    return {
      status: "stop",
      reason: `submit event ${submitEvent} needs explicit human approval; never choose APPROVE or REQUEST_CHANGES automatically`,
      step: "submit",
    };
  }
  if (!isAuthorizedPublicationPermission(input.observedReviewerPermission)) {
    return {
      status: "stop",
      reason: "reviewer permission was not independently observed; verify it before publication",
      step: "read-back",
    };
  }
  let reviewId: string | undefined = input.resumeReviewId;
  if (input.resumeReviewId !== undefined) {
    const existing = await transport.readBackReview(input.prNumber, input.resumeReviewId);
    if (existing === null) {
      return {
        status: "stop",
        reason: `resume failed: review ${input.resumeReviewId} is not readable; re-read before any retry`,
        step: "read-back",
      };
    }
    const resumeGate = decidePublicationResume({
      hasResumeId: true,
      pinsUnchanged: existing.commitSha === input.commitSha,
      authorOwnershipVerified:
        input.expectedAuthor === undefined || existing.author === input.expectedAuthor,
      dismissed: existing.state.toUpperCase() === "DISMISSED",
      ambiguous: false,
      unreadable: false,
      alreadySubmittedMatching: isSubmittedReviewState(existing.state),
    });
    if (resumeGate.action === "stop") {
      return {
        status: "stop",
        reason: `resume failed: ${resumeGate.reason}`,
        reviewId: input.resumeReviewId,
        step: "read-back",
      };
    }
    if (existing.state.toUpperCase() === "DISMISSED") {
      return {
        status: "stop",
        reason: `resume failed: review ${input.resumeReviewId} was dismissed; never republish a dismissed review`,
        reviewId: input.resumeReviewId,
        step: "read-back",
      };
    }
    if (!reviewMatchesDraft(existing, input)) {
      return {
        status: "stop",
        reason: `resume failed: review ${input.resumeReviewId} does not belong to this publication (commit, marker, or author mismatch); never resume an unrelated review`,
        reviewId: input.resumeReviewId,
        step: "read-back",
      };
    }
    if (isSubmittedReviewState(existing.state)) {
      const body = composeReviewPublicationBodyFor(input, input.resumeReviewId, existing.commentIds);
      if (existing.body !== body) {
        return {
          status: "stop",
          reason: `resume failed: review ${input.resumeReviewId} is already submitted with another body; never overwrite a completed publication`,
          reviewId: input.resumeReviewId,
          step: "read-back",
        };
      }
      return validatePublishedReadBack(input, existing, body);
    }
    if (existing.state.toUpperCase() !== "PENDING") {
      return {
        status: "stop",
        reason: `resume failed: review ${input.resumeReviewId} is in state ${existing.state}; only a pending review may be submitted`,
        reviewId: input.resumeReviewId,
        step: "read-back",
      };
    }
  }

  if (reviewId === undefined) {
    const reused = await reuseExactCompletedReview(input, transport);
    if (reused !== null) return reused;
    const marker = buildPublicationMarker(input);
    const created = await transport.createPendingReview(input.prNumber, input.commitSha, {
      body: marker,
      comments: input.inlineComments,
    });
    if (!created.ok) {
      const adopted = await adoptPendingReviewAfterLostCreate(input, transport, created.reason);
      if (adopted.status === "adopted") {
        reviewId = adopted.reviewId;
      } else {
        return adopted;
      }
    } else {
      reviewId = created.reviewId;
    }
  }
  // The native identity is captured from the create response; the final body
  // is rendered only after that identity exists (ADR-0038). When inline
  // comments were created with the pending review, read back the pending
  // review first so the handoff carries the real comment identities. This
  // applies to both fresh creation and an explicit resume of a still-pending
  // review; otherwise the resume would submit without observed comment IDs.
  let pendingCommentIds: readonly string[] | undefined;
  if (input.inlineComments !== undefined && input.inlineComments.length > 0) {
    const pending = await transport.readBackReview(input.prNumber, reviewId);
    if (pending === null || !reviewMatchesDraft(pending, input)) {
      // A submitted review on the resume path carries its own observed IDs
      // and needs no pending read; only a non-pending mismatch stops here.
      const resumeSubmitted = input.resumeReviewId !== undefined && pending !== null && isSubmittedReviewState(pending.state);
      if (!resumeSubmitted) {
        return {
          status: "stop",
          reason: `review ${reviewId} is not the marked pending review for this publication; never submit an unrelated draft`,
          reviewId,
          step: "submit",
        };
      }
      pendingCommentIds = pending.commentIds;
    } else {
      if (pending === null) {
        return {
          status: "stop",
          reason: `review ${reviewId} is not readable before submission; re-read before any retry`,
          reviewId,
          step: "submit",
        };
      }
      if (pending.state.toUpperCase() !== "PENDING") {
        // Already submitted between creation and this read: keep its observed
        // IDs for the final body instead of failing the resume.
        pendingCommentIds = pending.commentIds;
      } else {
        pendingCommentIds = pending.commentIds;
      }
    }
  }
  const body = composeReviewPublicationBodyFor(input, reviewId, pendingCommentIds);

  const submitted = await transport.submitReview(input.prNumber, reviewId, body, submitEvent);
  if (!submitted.ok) {
    const readBack = await transport.readBackReview(input.prNumber, reviewId);
    if (readBack !== null) {
      if (isSubmittedReviewState(readBack.state)) {
        if (readBack.body !== body || readBack.commitSha !== input.commitSha) {
          return {
            status: "stop",
            reason: `review ${reviewId} submission reported a failure (${submitted.reason}) and the read-back shows another body or commit; never overwrite it`,
            reviewId,
            step: "submit",
          };
        }
        return validatePublishedReadBack(input, readBack, body);
      }
      if (readBack.state.toUpperCase() === "PENDING" && reviewMatchesDraft(readBack, input)) {
        return {
          status: "stop",
          reason: `review ${reviewId} was created but submission is incomplete (${submitted.reason}); resume that identified review, never a new one`,
          reviewId,
          step: "submit",
        };
      }
    }
    return {
      status: "stop",
      reason: `review submission failed and the read-back cannot establish the outcome (${submitted.reason}); stop and re-read before retrying`,
      reviewId,
      step: "submit",
    };
  }

  const readBack = await transport.readBackReview(input.prNumber, reviewId);
  if (readBack === null) {
    return {
      status: "stop",
      reason: `review ${reviewId} submitted but the read-back returned nothing; re-read before any retry`,
      reviewId,
      step: "read-back",
    };
  }
  if (readBack.state.toUpperCase() === "DISMISSED") {
    return {
      status: "stop",
      reason: `review ${reviewId} reads back dismissed; publication is incomplete`,
      reviewId,
      step: "read-back",
    };
  }
  if (!isSubmittedReviewState(readBack.state)) {
    return {
      status: "stop",
      reason: `review ${reviewId} is ${readBack.state}, not submitted; publication is incomplete`,
      reviewId,
      step: "read-back",
    };
  }
  if (readBack.body !== body || readBack.commitSha !== input.commitSha) {
    return {
      status: "stop",
      reason: `review ${reviewId} read-back does not match the submitted body or pinned commit; stop and re-read before retrying`,
      reviewId,
      step: "read-back",
    };
  }
  return validatePublishedReadBack(input, readBack, body);
}
