// Allowlisted `gh api` transport for the one review publication step
// (ADR-0038). Argument arrays only, never shell interpolation. Native calls
// follow the GitHub REST contract: creating a pending review posts to the
// pull-request reviews endpoint without an event and without a body;
// submitting posts the final body to the review events endpoint with an
// explicit event; a submitted review reads back as COMMENTED, APPROVED, or
// CHANGES_REQUESTED, and never reports a made-up SUBMITTED state.
//
// The runner is injectable so tests assert the exact argument arrays without
// spawning `gh`; the default runner spawns the allowlisted binary.
import { spawnSync } from "node:child_process";

export interface GhRunResult {
  ok: boolean;
  stdout: string;
  reason?: string;
}

export type GhRunner = (args: readonly string[]) => GhRunResult;

const GH = "gh";

export function defaultGhRunner(args: readonly string[]): GhRunResult {
  const result = spawnSync(GH, [...args], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) {
    return { ok: false, stdout: "", reason: result.error.message };
  }
  const stdout = (result.stdout ?? "").trim();
  const stderr = (result.stderr ?? "").trim();
  if (result.status !== 0) {
    return { ok: false, stdout: "", reason: stderr !== "" ? stderr : `gh exited ${result.status}` };
  }
  return { ok: true, stdout };
}

function parseJson(stdout: string): unknown {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

interface TransportReadBack {
  reviewId: string;
  author: string;
  commitSha: string;
  state: string;
  body: string;
  submittedAt?: string;
  sourceUrl?: string;
  commentIds: readonly string[];
}

export function createGhReviewTransport(
  repository: string,
  runner: GhRunner = defaultGhRunner,
) {
  const reviewsUrl = (prNumber: number): string => `repos/${repository}/pulls/${prNumber}/reviews`;
  let actorLogin: string | null = null;
  const currentActor = (): string | null => {
    if (actorLogin !== null) return actorLogin;
    const result = runner(["api", "user", "--jq", ".login"]);
    if (!result.ok || result.stdout.trim() === "") return null;
    actorLogin = result.stdout.trim();
    return actorLogin;
  };
  return {
    name: "gh-review-transport",
    async createPendingReview(prNumber: number, commitSha: string) {
      // No event and no body: GitHub creates the review in the PENDING state.
      const result = runner([
        "api",
        "--method",
        "POST",
        `${reviewsUrl(prNumber)}`,
        "-f",
        `commit_id=${commitSha}`,
        "--jq",
        ".id",
      ]);
      if (!result.ok) {
        return { ok: false as const, reason: `gh could not create the pending review: ${result.reason ?? "unknown error"}` };
      }
      const reviewId = Number(result.stdout);
      if (!Number.isInteger(reviewId) || reviewId < 1) {
        return { ok: false as const, reason: `gh created a review without a usable native ID: ${result.stdout}` };
      }
      return { ok: true as const, reviewId: String(reviewId) };
    },
    async submitReview(
      prNumber: number,
      reviewId: string,
      body: string,
      event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES",
    ) {
      const result = runner([
        "api",
        "--method",
        "POST",
        `${reviewsUrl(prNumber)}/${reviewId}/events`,
        "-f",
        `event=${event}`,
        "-f",
        `body=${body}`,
        "--jq",
        ".state",
      ]);
      if (!result.ok) {
        return { ok: false as const, reason: `gh could not submit the review: ${result.reason ?? "unknown error"}` };
      }
      const state = result.stdout.toUpperCase();
      if (state !== "COMMENTED" && state !== "APPROVED" && state !== "CHANGES_REQUESTED") {
        return { ok: false as const, reason: `the review is in state ${result.stdout} after submission` };
      }
      return { ok: true as const };
    },
    async readBackReview(prNumber: number, reviewId: string): Promise<TransportReadBack | null> {
      const result = runner([
        "api",
        "--jq",
        "{reviewId: (.id|tostring), author: .user.login, commitSha: (.commit_id // \"\"), state: .state, body: (.body // \"\"), submittedAt: .submitted_at, sourceUrl: .html_url}",
        `${reviewsUrl(prNumber)}/${reviewId}`,
      ]);
      if (!result.ok) return null;
      const parsed = parseJson(result.stdout) as {
        reviewId?: unknown;
        author?: unknown;
        commitSha?: unknown;
        state?: unknown;
        body?: unknown;
        submittedAt?: unknown;
        sourceUrl?: unknown;
      } | null;
      if (parsed === null) return null;
      const comments = runner([
        "api",
        "--jq",
        "[.[].id]",
        `${reviewsUrl(prNumber)}/${reviewId}/comments`,
      ]);
      let commentIds: string[] = [];
      if (comments.ok) {
        const ids = parseJson(comments.stdout);
        if (Array.isArray(ids)) commentIds = ids.map(String);
      }
      return {
        reviewId: String(parsed.reviewId ?? reviewId),
        author: String(parsed.author ?? ""),
        commitSha: String(parsed.commitSha ?? ""),
        state: String(parsed.state ?? ""),
        body: String(parsed.body ?? ""),
        submittedAt: typeof parsed.submittedAt === "string" ? parsed.submittedAt : undefined,
        sourceUrl: typeof parsed.sourceUrl === "string" ? parsed.sourceUrl : undefined,
        commentIds,
      };
    },
    async listPendingReviews(prNumber: number, commitSha: string): Promise<readonly TransportReadBack[] | null> {
      const actor = currentActor();
      if (actor === null) return null;
      const result = runner([
        "api",
        "--jq",
        `[.[] | select(.state == "PENDING" and .commit_id == "${commitSha}" and .user.login == "${actor}") | {reviewId: (.id|tostring), author: .user.login, commitSha: (.commit_id // ""), state: .state, body: (.body // ""), submittedAt: .submitted_at, sourceUrl: .html_url}]`,
        `${reviewsUrl(prNumber)}`,
      ]);
      if (!result.ok) return null;
      const parsed = parseJson(result.stdout);
      if (!Array.isArray(parsed)) return null;
      const reviews = parsed as {
        reviewId?: unknown;
        author?: unknown;
        commitSha?: unknown;
        state?: unknown;
        body?: unknown;
        submittedAt?: unknown;
        sourceUrl?: unknown;
      }[];
      return reviews.map((review) => ({
        reviewId: String(review.reviewId ?? ""),
        author: String(review.author ?? ""),
        commitSha: String(review.commitSha ?? ""),
        state: String(review.state ?? ""),
        body: String(review.body ?? ""),
        submittedAt: typeof review.submittedAt === "string" ? review.submittedAt : undefined,
        sourceUrl: typeof review.sourceUrl === "string" ? review.sourceUrl : undefined,
        commentIds: [],
      }));
    },
  };
}
