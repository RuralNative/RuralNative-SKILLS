// Test-only adapter fakes. Production adapters expose host contracts only.
import type { GitHubAdapter, ReviewPublicationTransport, TransportReadBack } from "../adapters.ts";
import type { PullRequestLink } from "../discovery.ts";
import { buildPublicationMarker, type ReviewPublicationInput } from "../publish-review.ts";

export function fakeGitHubAdapter(
  pr: PullRequestLink | null,
  checks: { green: boolean; pending: boolean; headSha: string; baseSha: string } = {
    green: true,
    pending: false,
    headSha: "h1",
    baseSha: "b1",
  },
  overrides: Partial<GitHubAdapter> = {},
): GitHubAdapter {
  return {
    name: "fake-github",
    async fetchPullRequest(_prNumber) {
      return pr;
    },
    async fetchRequiredChecks(_prNumber) {
      return checks;
    },
    ...overrides,
  };
}

export interface HostShapedReview extends TransportReadBack {
  state: "PENDING" | "COMMENTED" | "APPROVED" | "CHANGES_REQUESTED" | "DISMISSED";
}

/**
 * Host-shaped review publication fake (ADR-0038, narrowed by ADR-0040): it
 * allocates native IDs only on creation, persists the review, and returns
 * the persisted body on read-back. A submitted review can never be created
 * again; failures and lost responses are injected per call so tests exercise
 * read-back and discovery reconciliation without live GitHub. State
 * transitions follow the native contract: creation leaves the review PENDING
 * with the publication marker body; submission applies an event (COMMENT,
 * APPROVE, or REQUEST_CHANGES) and the review reads back as COMMENTED,
 * APPROVED, or CHANGES_REQUESTED. Comment IDs allocate only for inline
 * comments passed at creation; a failed comment read is null, never empty.
 */
export function fakeReviewPublicationHost(options: {
  failCreate?: string;
  /** Creation succeeds on the host but the response is lost to the caller. */
  loseCreateResponse?: boolean;
  failSubmit?: string;
  failReadBack?: boolean;
  failComments?: boolean;
  /** Author assigned to reviews this actor creates. */
  author?: string;
  /** Discovery returns no pending reviews even when one exists. */
  failDiscovery?: boolean;
} = {}): ReviewPublicationTransport & { host: Map<string, HostShapedReview>; calls: string[] } {
  const host = new Map<string, HostShapedReview>();
  const calls: string[] = [];
  let counter = 0;
  let createFailuresLeft = options.failCreate === undefined ? 0 : 1;
  let submitFailuresLeft = options.failSubmit === undefined ? 0 : 1;
  const actor = options.author ?? "reviewer";
  const nextId = (): string => {
    counter += 1;
    return `review-${counter}`;
  };
  const stateFor = (event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES"): HostShapedReview["state"] => {
    if (event === "COMMENT") return "COMMENTED";
    if (event === "APPROVE") return "APPROVED";
    return "CHANGES_REQUESTED";
  };
  const transport: ReviewPublicationTransport & {
    host: Map<string, HostShapedReview>;
    calls: string[];
  } = {
    host,
    calls,
    name: "fake-review-host",
    async createPendingReview(prNumber, commitSha, createOptions = {}) {
      if (options.failCreate !== undefined && createFailuresLeft > 0) {
        createFailuresLeft -= 1;
        if (options.loseCreateResponse === true) {
          // The host did create the review; only the response is lost.
          const reviewId = nextId();
          calls.push(`create pr#${prNumber} review=${reviewId} response-lost`);
          const comments = createOptions.comments ?? [];
          host.set(reviewId, {
            reviewId,
            author: actor,
            commitSha,
            state: "PENDING",
            body: createOptions.body ?? "",
            sourceUrl: `https://github.com/o/r/pull/${prNumber}#review-${reviewId}`,
            commentIds: comments.map((_, i) => `c-${reviewId}-${i + 1}`),
            commentsComplete: true,
          });
        } else {
          calls.push(`create pr#${prNumber} failed`);
        }
        return { ok: false, reason: options.failCreate };
      }
      const reviewId = nextId();
      calls.push(`create pr#${prNumber} review=${reviewId}`);
      const comments = createOptions.comments ?? [];
      host.set(reviewId, {
        reviewId,
        author: actor,
        commitSha,
        state: "PENDING",
        body: createOptions.body ?? "",
        sourceUrl: `https://github.com/o/r/pull/${prNumber}#review-${reviewId}`,
        commentIds: comments.map((_, i) => `c-${reviewId}-${i + 1}`),
        commentsComplete: true,
      });
      return { ok: true, reviewId };
    },
    async submitReview(prNumber, reviewId, body, event) {
      const review = host.get(reviewId);
      if (review === undefined) return { ok: false, reason: `unknown review ${reviewId}` };
      if (review.state !== "PENDING") {
        return { ok: false, reason: `review ${reviewId} is already ${review.state}` };
      }
      if (options.failSubmit !== undefined && submitFailuresLeft > 0) {
        submitFailuresLeft -= 1;
        return { ok: false, reason: options.failSubmit };
      }
      calls.push(`submit pr#${prNumber} review=${reviewId} event=${event}`);
      host.set(reviewId, {
        ...review,
        state: stateFor(event),
        body,
        submittedAt: "2026-09-09T09:00:00Z",
        commentsComplete: true,
      });
      return { ok: true };
    },
    async readBackReview(prNumber, reviewId) {
      calls.push(`read-back pr#${prNumber} review=${reviewId}`);
      if (options.failReadBack === true) return null;
      if (options.failComments === true) return null;
      const review = host.get(reviewId);
      if (review === undefined) return null;
      return { ...review, commentIds: [...review.commentIds] };
    },
    async listPendingReviews(prNumber, commitSha) {
      calls.push(`discover pr#${prNumber} commit=${commitSha}`);
      if (options.failDiscovery === true) return null;
      const pending = [...host.values()].filter(
        (review) =>
          review.state === "PENDING" &&
          review.commitSha === commitSha &&
          review.author === actor,
      );
      return pending.map((review) => ({ ...review, commentIds: [...review.commentIds] }));
    },
    async listReviews(prNumber) {
      calls.push(`list pr#${prNumber}`);
      if (options.failDiscovery === true) return null;
      return [...host.values()].map((review) => ({ ...review, commentIds: [...review.commentIds] }));
    },
    currentActor() {
      return actor;
    },
    async observeReviewerPermission() {
      return "write" as const;
    },
  };
  return transport;
}

/** Marker input helper for tests that pre-seed a marked pending draft. */
export function markedPendingBody(input: ReviewPublicationInput): string {
  return buildPublicationMarker(input);
}
