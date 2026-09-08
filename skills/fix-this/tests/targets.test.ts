// Single-PR target resolution for /fix-this (ADR-0035).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { normalizeFixReference, resolveFixTarget } from "../targets.ts";

const repo = { owner: "o", name: "r" };
const pr = {
  prNumber: 285,
  state: "open" as const,
  repository: repo,
  fork: false,
  headSha: "h1",
  baseSha: "b1",
  baseBranch: "main",
  headBranch: "feature",
  draft: false,
  mergeable: true,
  closesTicket: 278,
};

describe("normalizeFixReference", () => {
  test("bare and hash PR numbers normalize identically", () => {
    assert.deepEqual(normalizeFixReference("285"), { form: "bare-number", repository: null, number: 285 });
    assert.deepEqual(normalizeFixReference("#285"), { form: "hash-number", repository: null, number: 285 });
  });
  test("pull-request URLs normalize", () => {
    assert.equal(normalizeFixReference("https://github.com/o/r/pull/285")?.form, "pull-request-url");
  });
  test("issue URLs and malformed input return null", () => {
    assert.equal(normalizeFixReference("https://github.com/o/r/issues/278"), null);
    assert.equal(normalizeFixReference("nope"), null);
    assert.equal(normalizeFixReference(""), null);
  });
});

describe("resolveFixTarget", () => {
  const observation = { currentRepository: repo, pullRequests: [pr] };
  test("PR number selects that pull request, never an issue", () => {
    const r = resolveFixTarget(["#285"], observation);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.selected.prNumber, 285);
  });
  test("multiple targets stop", () => {
    const r = resolveFixTarget(["#285", "#286"], observation);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.diagnostic, "multiple-targets");
  });
  test("missing, closed, and cross-repository PRs stop", () => {
    const missing = resolveFixTarget(["#999"], observation);
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.diagnostic, "target-not-found");
    const closed = resolveFixTarget(["#285"], { ...observation, pullRequests: [{ ...pr, state: "closed" as const }] });
    assert.equal(closed.ok, false);
    if (!closed.ok) assert.equal(closed.diagnostic, "closed-pull-request");
    const cross = resolveFixTarget(["https://github.com/x/y/pull/285"], observation);
    assert.equal(cross.ok, false);
    if (!cross.ok) assert.equal(cross.diagnostic, "cross-repository-target");
  });
  test("fork mutation is out of scope", () => {
    const r = resolveFixTarget(["#285"], { ...observation, pullRequests: [{ ...pr, fork: true }] });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.diagnostic, "fork-mutation-unsupported");
  });
});
