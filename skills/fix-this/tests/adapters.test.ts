// Fix-this host contracts (ADR-0035): merge confirmation only.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isConfirmedMerge } from "../adapters.ts";
import { fakeFixGitHubAdapter, fakeFixPublishAdapter, fakeFixVerificationAdapter } from "./fakes.ts";

describe("isConfirmedMerge", () => {
  test("merged with a merge commit confirms delivery", () => {
    assert.equal(isConfirmedMerge({ merged: true, mergeCommitSha: "m1" }), true);
  });
  test("missing merge commit or rejection never counts", () => {
    assert.equal(isConfirmedMerge({ merged: true, mergeCommitSha: "" }), false);
    assert.equal(isConfirmedMerge({ merged: false, mergeCommitSha: "m1" }), false);
  });
});

describe("fix fakes", () => {
  test("fakes expose host contracts without live GitHub", async () => {
    const github = fakeFixGitHubAdapter(null, null);
    assert.equal(await github.fetchPullRequest(285), null);
    const publish = fakeFixPublishAdapter();
    const merge = await publish.squashMerge(285, "h1");
    assert.equal(isConfirmedMerge(merge), true);
    const verify = fakeFixVerificationAdapter(true);
    assert.equal((await verify.runFocusedChecks(["node --test skills/fix-this/tests/fix-session.test.ts"])).passed, true);
  });
});
