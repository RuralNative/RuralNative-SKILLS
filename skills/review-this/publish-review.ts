// Review-only publication procedure for the single pull-request review
// (ADR-0035, narrowed by ADR-0038).
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
// dismissed. A pending review is created without an event and without a
// body; submission posts the final body to the review events endpoint with
// an explicit event (COMMENT, APPROVE, or REQUEST_CHANGES).
//
// The procedure never applies fixes, edits source, merges, labels, promotes,
// or closes, and it never repairs the pull-request body. Pending or failed
// publication never authorizes finalization. Uncertain responses reconcile by
// reading back once; if one reconciliation cannot establish the outcome the
// run stops and names the identified review for an explicit resume. A lost
// create response is reconciled through `listPendingReviews`: exactly one
// pending review authored by this actor at the pinned commit is adopted, zero
// or multiple pending reviews stop. Publication claims success only after the
// read-back body passes the full `validateReviewHandoff` provenance check.

import {
  renderReviewHandoff,
  validateReviewHandoff,
  type ReviewHandoffInput,
} from "./workflow-state.ts";

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

export interface ReadBackReview {
  reviewId: string;
  author: string;
  commitSha: string;
  state: ReviewState;
  body: string;
  submittedAt?: string;
  sourceUrl?: string;
  commentIds: readonly string[];
}

/**
 * Host transport for the one publication step. A host-shaped fake persists
 * created reviews and returns them on read-back; IDs are allocated on
 * creation only. `listPendingReviews` supports reconciliation when a create
 * response is lost.
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
  readBackReview(prNumber: number, reviewId: string): Promise<ReadBackReview | null>;
  listPendingReviews(
    prNumber: number,
    commitSha: string,
  ): Promise<readonly ReadBackReview[] | null>;
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
 * Render the final body with the native review identity: the handoff block
 * carries the real review ID captured from the create response, never a
 * guessed or placeholder value.
 */
export function composeReviewPublicationBodyFor(
  input: ReviewPublicationInput,
  reviewId: string,
): string {
  return composeReviewPublicationBody(input.reviewProse, {
    ...input.handoff,
    provenance: { ...input.handoff.provenance, reviewId },
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
  const state = readBack.state.toUpperCase();
  // A pending review carries no body yet: identity is the pinned commit.
  if (state === "PENDING") return true;
  return (
    readBack.body.includes("<!-- ruralnative:review-handoff:start -->") &&
    readBack.body.includes("<!-- ruralnative:review-handoff:end -->")
  );
}

/**
 * Full read-back validation (ADR-0038). Publication claims success only when
 * the read-back body validates `current` through `validateReviewHandoff`
 * with the native facts observed on the read-back: repository, PR, pinned
 * commit, native ID, author, reviewer permission, source URL, comment
 * ownership, and submission timestamp. A handoff whose payload author or
 * identity disagrees with the native read-back is stale, never published.
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
      reviewerPermission: input.handoff.provenance.reviewerPermission,
      reviewedCommit: readBack.commitSha,
      reviewedAt: readBack.submittedAt,
      sourceUrl: readBack.sourceUrl,
      commentIds: readBack.commentIds,
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
 * Reconcile a lost create response by discovery (ADR-0038). Exactly one
 * pending review authored by this actor at the pinned commit is adopted;
 * zero pending reviews, multiple pending reviews, or unavailable discovery
 * stop because the outcome is unknown. This is the only create-recovery
 * path: nothing blind-retries creation.
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
  const pendingHere = pending.filter(
    (review) => review.state.toUpperCase() === "PENDING" && review.commitSha === input.commitSha,
  );
  if (pendingHere.length === 1) {
    return {
      status: "adopted",
      reviewId: pendingHere[0].reviewId,
      reason: `pending review creation reported a failure (${createReason}) but discovery found the single pending review ${pendingHere[0].reviewId} at the pinned commit`,
    };
  }
  if (pendingHere.length === 0) {
    return {
      status: "stop",
      reason: `pending review creation failed (${createReason}) and discovery found no pending review at the pinned commit; the outcome is unknown, never blind-retry`,
      step: "create",
    };
  }
  return {
    status: "stop",
    reason: `pending review creation failed (${createReason}) and discovery found ${pendingHere.length} pending reviews at the pinned commit; never guess which one belongs to this publication`,
    step: "create",
  };
}

/**
 * Run the one bounded publication step. Every write is followed by
 * reconciliation against the read-back; a lost response causes one
 * read-back (or one discovery after a lost create), never a blind retry, and
 * stops when the outcome stays unknown.
 */
export async function publishReviewPublication(
  input: ReviewPublicationInput,
  transport: ReviewPublicationTransport,
): Promise<ReviewPublicationOutcome> {
  const submitEvent = input.submitEvent ?? "COMMENT";
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
        reason: `resume failed: review ${input.resumeReviewId} does not belong to this publication (commit mismatch); never resume an unrelated review`,
        reviewId: input.resumeReviewId,
        step: "read-back",
      };
    }
    const body = composeReviewPublicationBodyFor(input, input.resumeReviewId);
    if (isSubmittedReviewState(existing.state)) {
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
    const created = await transport.createPendingReview(input.prNumber, input.commitSha);
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
  // is rendered only after that identity exists (ADR-0038).
  const body = composeReviewPublicationBodyFor(input, reviewId);

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
