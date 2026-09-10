// Exact argument-array contract of the `gh api` publication transport
// (ADR-0038, narrowed by ADR-0040): argument arrays only, never shell
// interpolation, and the real GitHub REST shapes. Creating a pending review
// posts to the pull-request reviews endpoint with the commit id and no event;
// submitting posts the body to the review events endpoint with an explicit
// event; no PUT update and no made-up SUBMITTED state anywhere. REST lists
// use `gh api --paginate --slurp` without `--jq` (`--slurp` with `--jq` is
// rejected by installed `gh 2.98.0`); pages flatten and filter in code.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createGhReviewTransport, type GhRunner } from "../gh-review-transport.ts";

const BODY = "## Standards\n\nok\n\n<!-- ruralnative:review-handoff:start -->\nblock\n<!-- ruralnative:review-handoff:end -->\n";

function recordingRunner(script: { api: (request: string, args: readonly string[]) => string | null }): {
  runner: GhRunner;
  calls: string[][];
} {
  const calls: string[][] = [];
  const runner: GhRunner = (args) => {
    calls.push([...args]);
    const pathIndex = args.findIndex((arg) => typeof arg === "string" && arg.startsWith("repos/"));
    const resource = pathIndex >= 0 ? args[pathIndex] : (args[1] ?? "");
    const canned = script.api(resource, args);
    if (canned === null) return { ok: false, stdout: "", reason: "scripted failure" };
    return { ok: true, stdout: canned };
  };
  return { runner, calls };
}

describe("gh review publication transport", () => {
  test("create pending review posts commit_id with no event and returns the native id", async () => {
    const { runner, calls } = recordingRunner({
      api: () => "42",
    });
    const transport = createGhReviewTransport("o/r", runner);
    const created = await transport.createPendingReview(300, "abc123");
    assert.deepEqual(created, { ok: true, reviewId: "42" });
    assert.deepEqual(calls, [
      ["api", "--method", "POST", "repos/o/r/pulls/300/reviews", "-f", "commit_id=abc123", "--jq", ".id"],
    ]);
    assert.equal(calls[0].includes("event"), false, "pending creation must not send an event");
  });
  test("submit posts the final body to the review events endpoint with the event", async () => {
    const { runner, calls } = recordingRunner({
      // `gh api --jq .state` prints the bare string, not JSON-quoted.
      api: () => "COMMENTED",
    });
    const transport = createGhReviewTransport("o/r", runner);
    const submitted = await transport.submitReview(300, "42", BODY, "COMMENT");
    assert.deepEqual(submitted, { ok: true });
    assert.deepEqual(calls, [
      [
        "api",
        "--method",
        "POST",
        "repos/o/r/pulls/300/reviews/42/events",
        "-f",
        "event=COMMENT",
        "-f",
        `body=${BODY}`,
        "--jq",
        ".state",
      ],
    ]);
    assert.equal(calls[0].includes("PUT"), false, "submission is a POST to events, never a PUT");
  });
  test("submission accepts only native submitted states", async () => {
    const { runner } = recordingRunner({
      api: () => "PENDING",
    });
    const transport = createGhReviewTransport("o/r", runner);
    const submitted = await transport.submitReview(300, "42", BODY, "COMMENT");
    assert.equal(submitted.ok, false);
    assert.ok(String(submitted.ok === false && submitted.reason).includes("PENDING"));
  });
  test("read-back reports the native state and comment ids", async () => {
    const { runner, calls } = recordingRunner({
      api: (request) => {
        if (request.endsWith("/comments")) return JSON.stringify([{ id: 1 }, { id: 2 }]);
        return JSON.stringify({
          id: 42,
          user: { login: "reviewer" },
          commit_id: "abc123",
          state: "COMMENTED",
          body: BODY,
          submitted_at: "2026-09-09T09:00:00Z",
          html_url: "https://github.com/o/r/pull/300#pullrequestreview-42",
        });
      },
    });
    const transport = createGhReviewTransport("o/r", runner);
    const readBack = await transport.readBackReview(300, "42");
    assert.equal(readBack?.reviewId, "42");
    assert.equal(readBack?.author, "reviewer");
    assert.equal(readBack?.commitSha, "abc123");
    assert.equal(readBack?.state, "COMMENTED");
    assert.equal(readBack?.body, BODY);
    assert.equal(readBack?.submittedAt, "2026-09-09T09:00:00Z");
    assert.deepEqual(readBack?.commentIds, ["1", "2"]);
    assert.equal(readBack?.commentsComplete, true);
    assert.ok(calls.every((args) => Array.isArray(args) && args.every((entry) => typeof entry === "string")), "argument arrays only");
    const commentCall = calls.find((args) => args.some((entry) => entry.endsWith("/comments")));
    assert.ok(commentCall?.includes("--paginate"), "comment reads paginate");
    assert.ok(commentCall?.includes("--slurp"), "comment reads slurp pages into one array");
    assert.equal(commentCall?.some((entry) => entry.includes("--jq") && entry.includes("[.[].id]")), false);
  });
  test("failed comment reads stop instead of succeeding with an empty list", async () => {
    const { runner } = recordingRunner({
      api: (request) => {
        if (request.endsWith("/comments")) return null;
        return JSON.stringify({
          id: 42,
          user: { login: "reviewer" },
          commit_id: "abc123",
          state: "COMMENTED",
          body: BODY,
          submitted_at: "2026-09-09T09:00:00Z",
          html_url: "https://github.com/o/r/pull/300#pullrequestreview-42",
        });
      },
    });
    const transport = createGhReviewTransport("o/r", runner);
    assert.equal(await transport.readBackReview(300, "42"), null);
  });
  test("malformed comment pages stop instead of certifying partial IDs", async () => {
    const { runner } = recordingRunner({
      api: (request) => {
        if (request.endsWith("/comments")) return `[{"id":12`;
        return JSON.stringify({
          id: 42,
          user: { login: "reviewer" },
          commit_id: "abc123",
          state: "COMMENTED",
          body: BODY,
          submitted_at: "2026-09-09T09:00:00Z",
          html_url: "https://github.com/o/r/pull/300#pullrequestreview-42",
        });
      },
    });
    const transport = createGhReviewTransport("o/r", runner);
    assert.equal(await transport.readBackReview(300, "42"), null);
  });
  test("slurp pages flatten without dropping interleaved IDs", async () => {
    const { flattenPaginatedJson } = await import("../gh-review-transport.ts");
    assert.deepEqual(flattenPaginatedJson(JSON.stringify([[{ id: 1 }, { id: 2 }], [{ id: 3 }]])), [{ id: 1 }, { id: 2 }, { id: 3 }]);
    assert.equal(flattenPaginatedJson(`[{"id":12`), null);
    assert.equal(flattenPaginatedJson(`[{"id":1}]\n[{"id":2`), null);
  });
  test("discovery lists only pending reviews at the commit authored by the actor", async () => {
    const { runner, calls } = recordingRunner({
      api: (request) => {
        if (request === "user") return "reviewer";
        return JSON.stringify([
          {
            id: 7,
            user: { login: "reviewer" },
            commit_id: "abc123",
            state: "PENDING",
            body: "",
            submitted_at: null,
            html_url: "https://github.com/o/r/pull/300#pullrequestreview-7",
          },
          {
            id: 8,
            user: { login: "reviewer" },
            commit_id: "other",
            state: "PENDING",
            body: "",
            html_url: "https://github.com/o/r/pull/300#pullrequestreview-8",
          },
          {
            id: 9,
            user: { login: "other" },
            commit_id: "abc123",
            state: "PENDING",
            body: "",
            html_url: "https://github.com/o/r/pull/300#pullrequestreview-9",
          },
        ]);
      },
    });
    const transport = createGhReviewTransport("o/r", runner);
    const pending = await transport.listPendingReviews(300, "abc123");
    assert.equal(pending?.length, 1);
    assert.equal(pending?.[0].reviewId, "7");
    assert.equal(pending?.[0].author, "reviewer");
    const listCall = calls.find((args) => args.includes("--paginate"));
    assert.ok(listCall !== undefined, "discovery paginates");
    assert.ok(listCall?.includes("--slurp"), "discovery slurps pages into one array");
    assert.equal(
      calls.some((args) => args.some((entry) => typeof entry === "string" && entry.includes("abc123") && entry.includes("select"))),
      false,
      "caller values never enter a jq program",
    );
  });
  test("page-two discovery finds the pending review", async () => {
    const { runner } = recordingRunner({
      api: (request) => {
        if (request === "user") return "reviewer";
        return JSON.stringify([
          [
            { id: 1, user: { login: "other" }, commit_id: "abc123", state: "COMMENTED", body: "x" },
          ],
          [
            { id: 7, user: { login: "reviewer" }, commit_id: "abc123", state: "PENDING", body: "" },
          ],
        ]);
      },
    });
    const transport = createGhReviewTransport("o/r", runner);
    const pending = await transport.listPendingReviews(300, "abc123");
    assert.equal(pending?.length, 1);
    assert.equal(pending?.[0].reviewId, "7");
  });
  test("pending creation can carry the marker body and validated inline comments", async () => {
    const { runner, calls } = recordingRunner({
      api: () => "42",
    });
    const transport = createGhReviewTransport("o/r", runner);
    const created = await transport.createPendingReview(300, "abc123", {
      body: "marker",
      comments: [{ path: "src/a.ts", line: 10, body: "fix this" }],
    });
    assert.deepEqual(created, { ok: true, reviewId: "42" });
    const call = calls[0].join(" ");
    assert.ok(call.includes("body=marker"));
    assert.ok(call.includes("comments[][path]=src/a.ts"));
    assert.ok(call.includes("comments[][line]=10"));
    assert.ok(call.includes("comments[][body]=fix this"));
    assert.equal(call.includes("--raw-field"), false, "inline comments must use typed -F array fields, never a string --raw-field");
  });
  test("invalid inline anchors never reach gh", async () => {
    const { runner, calls } = recordingRunner({
      api: () => "42",
    });
    const transport = createGhReviewTransport("o/r", runner);
    const created = await transport.createPendingReview(300, "abc123", {
      comments: [{ path: "", line: 0, body: "" }],
    });
    assert.equal(created.ok, false);
    assert.equal(calls.length, 0);
  });
  test("unavailable discovery returns null and never fabricates reviews", async () => {
    const { runner } = recordingRunner({
      api: () => null,
    });
    const transport = createGhReviewTransport("o/r", runner);
    const created = await transport.createPendingReview(300, "abc123");
    assert.equal(created.ok, false);
    const pending = await transport.listPendingReviews(300, "abc123");
    assert.equal(pending, null);
  });
});
