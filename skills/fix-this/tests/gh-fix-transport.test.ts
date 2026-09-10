// Bounded native merge transport (ADR-0040): PUT with verified sha.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createGhFixPublishAdapter, createGhFixTransport, type GhRunner } from "../gh-fix-transport.ts";

function runnerWith(script: (args: readonly string[]) => string | null): { runner: GhRunner; calls: string[][] } {
  const calls: string[][] = [];
  const runner: GhRunner = (args) => {
    calls.push([...args]);
    const canned = script(args);
    if (canned === null) return { ok: false, stdout: "", reason: "scripted failure" };
    return { ok: true, stdout: canned };
  };
  return { runner, calls };
}

describe("gh fix transport", () => {
  test("squash merge uses PUT with sha and squash method", async () => {
    const { runner, calls } = runnerWith(() => JSON.stringify({ merged: true, sha: "merge-sha" }));
    const transport = createGhFixTransport("o/r", runner);
    const result = await transport.squashMerge(300, "abc123");
    assert.equal(result.merged, true);
    assert.equal(result.mergeCommitSha, "merge-sha");
    assert.deepEqual(calls[0], [
      "api",
      "--method",
      "PUT",
      "repos/o/r/pulls/300/merge",
      "-f",
      "sha=abc123",
      "-f",
      "merge_method=squash",
    ]);
  });
  test("blank head sha never reaches gh", async () => {
    const { runner, calls } = runnerWith(() => JSON.stringify({ merged: true, sha: "x" }));
    const transport = createGhFixTransport("o/r", runner);
    const result = await transport.squashMerge(300, "  ");
    assert.equal(result.merged, false);
    assert.equal(calls.length, 0);
  });
  test("rejected merges report instead of overriding", async () => {
    const { runner } = runnerWith(() => JSON.stringify({ merged: false, message: "Required status checks" }));
    const transport = createGhFixTransport("o/r", runner);
    const result = await transport.squashMerge(300, "abc123");
    assert.equal(result.merged, false);
    assert.match(result.rejection, /Required status checks/);
  });
  test("merge without a commit records partial instead of success", async () => {
    const { runner } = runnerWith(() => JSON.stringify({ merged: true }));
    const transport = createGhFixTransport("o/r", runner);
    const result = await transport.squashMerge(300, "abc123");
    assert.equal(result.merged, false);
  });
  test("fix publisher uses bounded comment, patch, merge, close, and label calls", async () => {
    const { runner, calls } = runnerWith(() => JSON.stringify({}));
    const publish = createGhFixPublishAdapter("o/r", runner);
    await publish.publishFixProgress(300, "progress");
    await publish.updateImplementationEvidence(300, "evidence");
    await publish.closeTicket(100, "merged");
    await publish.updateLabels(100, ["ready-for-human"], ["ready-for-agent"]);
    const flat = calls.map((args) => args.join(" "));
    assert.ok(flat.some((c) => c.includes("issues/300/comments") && c.includes("body=progress")));
    assert.ok(flat.some((c) => c.includes("pulls/300") && c.includes("PATCH") && c.includes("body=evidence")));
    assert.ok(flat.some((c) => c.includes("issues/100") && c.includes("state=closed")));
    assert.ok(flat.some((c) => c.includes("issues/100/labels") && c.includes("ready-for-human")));
    assert.ok(flat.some((c) => c.includes("issues/100/labels/ready-for-agent") && c.includes("DELETE")));
  });
  test("blank fix bodies never reach gh", async () => {
    const { runner, calls } = runnerWith(() => JSON.stringify({}));
    const publish = createGhFixPublishAdapter("o/r", runner);
    await assert.rejects(() => publish.publishFixProgress(300, "  "));
    await assert.rejects(() => publish.updateImplementationEvidence(300, ""));
    assert.equal(calls.length, 0);
  });
});
