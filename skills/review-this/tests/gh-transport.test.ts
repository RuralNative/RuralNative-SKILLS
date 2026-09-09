// Exact argument-array contract of the `gh api` publication transport
// (ADR-0038): argument arrays only, never shell interpolation, and the real
// GitHub REST shapes. Creating a pending review posts to the pull-request
// reviews endpoint with the commit id and no event (blank event means
// PENDING); submitting posts the body to the review events endpoint with an
// explicit event; no PUT update and no made-up SUBMITTED state anywhere.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createGhReviewTransport, type GhRunner } from "../gh-review-transport.ts";

const BODY = "## Standards\n\nok\n\n<!-- ruralnative:review-handoff:start -->\nblock\n<!-- ruralnative:review-handoff:end -->\n";

function recordingRunner(script: { api: (request: string) => string | null }): {
  runner: GhRunner;
  calls: string[][];
} {
  const calls: string[][] = [];
  const runner: GhRunner = (args) => {
    calls.push([...args]);
    const command = args[1] ?? "";
    const pathIndex = args.findIndex((arg) => typeof arg === "string" && arg.startsWith("repos/"));
    const resource = pathIndex >= 0 ? args[pathIndex] : "";
    const key = `${command} ${resource}`.trim();
    const canned = script.api(key);
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
        if (request.endsWith("/comments")) return "[1,2]";
        // The read-back projection is what `gh api --jq` prints.
        return JSON.stringify({
          reviewId: "42",
          author: "reviewer",
          commitSha: "abc123",
          state: "COMMENTED",
          body: BODY,
          submittedAt: "2026-09-09T09:00:00Z",
          sourceUrl: "https://github.com/o/r/pull/300#pullrequestreview-42",
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
    assert.ok(calls.every((args) => Array.isArray(args) && args.every((entry) => typeof entry === "string")), "argument arrays only");
  });
  test("discovery lists only pending reviews at the commit authored by the actor", async () => {
    const { runner, calls } = recordingRunner({
      api: (request) => {
        if (request === "user") return "reviewer";
        // Mimic the `gh api --jq` projection: only the one matching pending
        // review survives the select inside the jq program.
        return JSON.stringify([
          {
            reviewId: "7",
            author: "reviewer",
            commitSha: "abc123",
            state: "PENDING",
            body: "",
            submittedAt: null,
            sourceUrl: "https://github.com/o/r/pull/300#pullrequestreview-7",
          },
        ]);
      },
    });
    const transport = createGhReviewTransport("o/r", runner);
    const pending = await transport.listPendingReviews(300, "abc123");
    assert.equal(pending?.length, 1);
    assert.equal(pending?.[0].reviewId, "7");
    assert.equal(pending?.[0].author, "reviewer");
    const listCall = calls.find((args) => args.some((entry) => entry.startsWith("[.[] | select")));
    assert.ok(listCall !== undefined);
    assert.ok(String(listCall).includes('"PENDING"'));
    assert.ok(String(listCall).includes("abc123"));
    assert.ok(String(listCall).includes("reviewer"));
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
