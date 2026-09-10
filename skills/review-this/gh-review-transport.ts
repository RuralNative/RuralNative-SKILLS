// Allowlisted `gh api` transport for the one review publication step
// (ADR-0038, narrowed by ADR-0040). Argument arrays only, never shell
// interpolation. Native calls follow the GitHub REST contract: creating a
// pending review posts to the pull-request reviews endpoint without an event;
// submitting posts the final body to the review events endpoint with an
// explicit event; a submitted review reads back as COMMENTED, APPROVED, or
// CHANGES_REQUESTED, and never reports a made-up SUBMITTED state.
//
// Pagination (ADR-0040): REST lists use `gh api --paginate --slurp` without
// `--jq` (installed `gh 2.98.0` rejects `--slurp` with `--jq`). Pages parse
// and flatten in code. Filters apply in code, never by interpolating caller
// values into a jq program. A failed or malformed comment read returns null
// so publication stops instead of succeeding with an empty list.
import { spawnSync } from "node:child_process";
import type { GhRunner, GhRunResult } from "./github-facts.ts";
import type {
  CreatePendingOptions,
  PendingInlineComment,
  TransportReadBack,
} from "./adapters.ts";

export type { GhRunner, GhRunResult };

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

/**
 * Flatten one `gh api --paginate --slurp` stdout into items. With `--slurp`,
 * gh wraps every page body in one outer array. A single page without slurp
 * parses as an array or object for backward compatibility with recorded
 * fixtures. Malformed or truncated output returns null so callers stop
 * instead of certifying an incomplete enumeration.
 */
export function flattenPaginatedJson(stdout: string): unknown[] | null {
  const trimmed = stdout.trim();
  if (trimmed === "") return [];
  const direct = parseJson(trimmed);
  if (Array.isArray(direct)) {
    // `--slurp` shape is an array of pages: flatten one level when every
    // entry is itself an array, otherwise this is the single page.
    if (direct.length > 0 && direct.every((entry) => Array.isArray(entry))) {
      return (direct as unknown[][]).flat();
    }
    return direct;
  }
  if (direct !== null && typeof direct === "object") return [direct];
  // Without --slurp, gh prints one JSON document per page separated by
  // newlines. Every line must parse; any failure is malformed, never empty.
  const items: unknown[] = [];
  for (const line of trimmed.split("\n")) {
    const text = line.trim();
    if (text === "") continue;
    const value = parseJson(text);
    if (value === null) return null;
    if (Array.isArray(value)) items.push(...value);
    else if (typeof value === "object") items.push(value);
    else return null;
  }
  if (items.length > 0) return items;
  return null;
}

/** Project one raw or pre-projected review value into read-back shape. */
function projectReview(value: unknown, fallbackId: string): Omit<TransportReadBack, "commentIds" | "commentsComplete"> | null {
  if (value === null || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const user = raw["user"];
  const userLogin =
    typeof raw["author"] === "string"
      ? (raw["author"] as string)
      : user !== null && typeof user === "object"
        ? String((user as Record<string, unknown>)["login"] ?? "")
        : "";
  const idRaw = raw["reviewId"] ?? raw["id"];
  const reviewId = idRaw === undefined || idRaw === null ? fallbackId : String(idRaw);
  if (reviewId.trim() === "") return null;
  const commitRaw = raw["commitSha"] ?? raw["commit_id"] ?? "";
  const bodyRaw = raw["body"] ?? "";
  const stateRaw = raw["state"] ?? "";
  const submittedRaw = raw["submittedAt"] ?? raw["submitted_at"];
  const urlRaw = raw["sourceUrl"] ?? raw["html_url"];
  return {
    reviewId,
    author: String(userLogin ?? ""),
    commitSha: String(commitRaw ?? ""),
    state: String(stateRaw ?? ""),
    body: String(bodyRaw ?? ""),
    submittedAt: typeof submittedRaw === "string" ? submittedRaw : undefined,
    sourceUrl: typeof urlRaw === "string" ? urlRaw : undefined,
  };
}

function projectCommentId(value: unknown): string | null {
  if (typeof value === "number" && Number.isInteger(value)) return String(value);
  if (typeof value === "string" && value.trim() !== "") return value;
  if (value !== null && typeof value === "object") {
    const raw = value as Record<string, unknown>;
    const id = raw["id"];
    if (typeof id === "number" && Number.isInteger(id)) return String(id);
    if (typeof id === "string" && id.trim() !== "") return id;
  }
  return null;
}

export function validatePendingInlineComment(comment: PendingInlineComment): string | null {
  if (comment.path.trim() === "" || comment.path.includes("..")) return "inline comment needs a repository-relative path";
  if (!Number.isInteger(comment.line) || comment.line < 1) return "inline comment needs a 1-based line";
  if (comment.body.trim() === "") return "inline comment needs a body";
  if (comment.side !== undefined && comment.side !== "LEFT" && comment.side !== "RIGHT") {
    return "inline comment side is invalid";
  }
  if (comment.startLine !== undefined && (!Number.isInteger(comment.startLine) || comment.startLine < 1 || comment.startLine > comment.line)) {
    return "inline comment range is invalid";
  }
  return null;
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
    async createPendingReview(prNumber: number, commitSha: string, options: CreatePendingOptions = {}) {
      // No event: GitHub creates the review in the PENDING state. An
      // optional marker body identifies the intended draft after a lost
      // response; validated inline comments ride the same create call.
      const args: string[] = [
        "api",
        "--method",
        "POST",
        `${reviewsUrl(prNumber)}`,
        "-f",
        `commit_id=${commitSha}`,
      ];
      if (options.body !== undefined) {
        args.push("-f", `body=${options.body}`);
      }
      if (options.comments !== undefined) {
        for (const comment of options.comments) {
          const error = validatePendingInlineComment(comment);
          if (error !== null) {
            return { ok: false as const, reason: error };
          }
        }
        // Typed array payload per `gh api` manual: `key[][subkey]=value`
        // builds a JSON array of objects. `--raw-field` would send the whole
        // array as one string, which GitHub rejects for `comments`.
        for (const comment of options.comments) {
          args.push("-F", `comments[][path]=${comment.path}`);
          args.push("-F", `comments[][line]=${comment.line}`);
          args.push("-F", `comments[][side]=${comment.side ?? "RIGHT"}`);
          if (comment.startLine !== undefined) {
            args.push("-F", `comments[][start_line]=${comment.startLine}`);
            args.push("-F", `comments[][start_side]=${comment.startSide ?? "RIGHT"}`);
          }
          args.push("-F", `comments[][body]=${comment.body}`);
        }
      }
      args.push("--jq", ".id");
      const result = runner(args);
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
        `${reviewsUrl(prNumber)}/${reviewId}`,
      ]);
      if (!result.ok) return null;
      const parsed = parseJson(result.stdout) as Record<string, unknown> | null;
      // Tests project with `--jq`; accept both raw and projected shapes.
      const projected = projectReview(parsed, reviewId);
      if (projected === null) return null;
      // Complete enumeration: paginate with `--slurp` without `--jq` and
      // flatten in code. A failed or malformed comment read is null, never
      // an empty success list.
      const comments = runner([
        "api",
        "--paginate",
        "--slurp",
        `${reviewsUrl(prNumber)}/${reviewId}/comments`,
      ]);
      if (!comments.ok) return null;
      let commentIds: string[] = [];
      const trimmed = comments.stdout.trim();
      if (trimmed !== "") {
        const items = flattenPaginatedJson(trimmed);
        if (items === null) return null;
        for (const item of items) {
          if (typeof item === "number" || typeof item === "string") {
            const id = projectCommentId(item);
            if (id === null) return null;
            commentIds.push(id);
            continue;
          }
          const id = projectCommentId(item);
          if (id === null) return null;
          commentIds.push(id);
        }
      }
      return {
        ...projected,
        commentIds,
        commentsComplete: true,
      };
    },
    async listPendingReviews(prNumber: number, commitSha: string): Promise<readonly TransportReadBack[] | null> {
      const actor = currentActor();
      if (actor === null) return null;
      // Fetch the complete list, then filter in code. Caller values never
      // enter a jq program.
      const result = runner([
        "api",
        "--paginate",
        "--slurp",
        `${reviewsUrl(prNumber)}`,
      ]);
      if (!result.ok) return null;
      const trimmed = result.stdout.trim();
      if (trimmed === "") return [];
      const items = flattenPaginatedJson(trimmed);
      if (items === null) return null;
      const out: TransportReadBack[] = [];
      for (const item of items) {
        const projected = projectReview(item, "");
        if (projected === null) return null;
        if (projected.state.toUpperCase() !== "PENDING") continue;
        if (projected.commitSha !== commitSha) continue;
        if (projected.author !== actor) continue;
        out.push({ ...projected, commentIds: [], commentsComplete: false });
      }
      return out;
    },
    async listReviews(prNumber: number): Promise<readonly TransportReadBack[] | null> {
      const result = runner([
        "api",
        "--paginate",
        "--slurp",
        `${reviewsUrl(prNumber)}`,
      ]);
      if (!result.ok) return null;
      const trimmed = result.stdout.trim();
      if (trimmed === "") return [];
      const items = flattenPaginatedJson(trimmed);
      if (items === null) return null;
      const out: TransportReadBack[] = [];
      for (const item of items) {
        const projected = projectReview(item, "");
        if (projected === null) return null;
        out.push({ ...projected, commentIds: [], commentsComplete: false });
      }
      return out;
    },
    currentActor,
    async observeReviewerPermission(username: string): Promise<"policy" | "write" | "maintain" | "admin" | "unknown"> {
      if (username.trim() === "") return "unknown";
      const result = runner(["api", `repos/${repository}/collaborators/${username}/permission`]);
      if (!result.ok) return "unknown";
      const parsed = parseJson(result.stdout) as { permission?: unknown } | null;
      const permission = String(parsed?.permission ?? "");
      if (permission === "admin" || permission === "maintain" || permission === "write") return permission;
      if (permission === "triage" || permission === "read") return "unknown";
      return "unknown";
    },
  };
}
