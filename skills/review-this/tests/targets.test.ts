// Single-target resolution for /review-this (ADR-0031).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { normalizeReference, resolveSingleTarget } from "../targets.ts";

const repo = { owner: "o", name: "r" };

describe("normalizeReference", () => {
  test("bare and hash numbers normalize identically", () => {
    assert.deepEqual(normalizeReference("100"), { form: "bare-number", repository: null, number: 100 });
    assert.deepEqual(normalizeReference("#100"), { form: "hash-number", repository: null, number: 100 });
  });
  test("issue and pull-request URLs normalize", () => {
    assert.equal(normalizeReference("https://github.com/o/r/issues/10")?.form, "issue-url");
    assert.equal(normalizeReference("https://github.com/o/r/pull/11")?.form, "pull-request-url");
  });
  test("malformed input returns null", () => {
    assert.equal(normalizeReference("nope"), null);
    assert.equal(normalizeReference(""), null);
  });
});

describe("resolveSingleTarget", () => {
  const pr = { prNumber: 11, state: "open" as const, headSha: "h1", baseSha: "b1", closesTicket: 10, hasEvidence: true };
  const observation = {
    currentRepository: repo,
    issues: [
      { number: 10, state: "open" as const, isParentSpecification: false },
      { number: 50, state: "open" as const, isParentSpecification: true },
      { number: 60, state: "open" as const, isParentSpecification: false },
    ],
    pullRequests: [pr],
  };
  test("pull-request number selects that pull request", () => {
    const r = resolveSingleTarget(["#11"], observation);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.selected.prNumber, 11);
  });
  test("issue with exactly one open closing PR resolves", () => {
    const r = resolveSingleTarget(["#10"], observation);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.selected.ticket, 10);
  });
  test("parent specification stops", () => {
    const r = resolveSingleTarget(["#50"], observation);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.diagnostic, "parent-specification");
  });
  test("standalone issue without a PR stops", () => {
    const r = resolveSingleTarget(["#60"], observation);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.diagnostic, "standalone-issue-without-pull-request");
  });
  test("ambiguous issue-to-PR mapping stops", () => {
    const obs = {
      ...observation,
      pullRequests: [pr, { ...pr, prNumber: 12 }],
    };
    const r = resolveSingleTarget(["#10"], obs);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.diagnostic, "ambiguous-pull-requests");
  });
  test("multiple targets stop", () => {
    const r = resolveSingleTarget(["#10", "#11"], observation);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.diagnostic, "multiple-targets");
  });
  test("closed pull request stops", () => {
    const obs = { ...observation, pullRequests: [{ ...pr, state: "closed" as const }] };
    const r = resolveSingleTarget(["#11"], obs);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.diagnostic, "closed-pull-request");
  });
  test("cross-repository target stops", () => {
    const r = resolveSingleTarget(["https://github.com/x/y/pull/11"], observation);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.diagnostic, "cross-repository-target");
  });
  test("pull-request URL wins when the same number is also an issue", () => {
    const obs = {
      ...observation,
      issues: [...observation.issues, { number: 11, state: "open" as const, isParentSpecification: false }],
    };
    const r = resolveSingleTarget(["https://github.com/o/r/pull/11"], obs);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.selected.prNumber, 11);
  });
  test("issue URL resolves through its closing pull request", () => {
    const r = resolveSingleTarget(["https://github.com/o/r/issues/10"], observation);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.selected.prNumber, 11);
  });
  test("repository-qualified target stops when current identity is unknown", () => {
    const obs = { ...observation, currentRepository: null };
    const r = resolveSingleTarget(["https://github.com/o/r/pull/11"], obs);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.diagnostic, "cross-repository-target");
  });
  test("repository comparison is case-insensitive", () => {
    const r = resolveSingleTarget(["https://github.com/O/R/pull/11"], observation);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.selected.prNumber, 11);
  });
});
