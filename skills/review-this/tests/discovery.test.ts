// Single pull-request readiness (ADR-0031).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isReviewReady, type PullRequestLink } from "../discovery.ts";

function pr(overrides: Partial<PullRequestLink> = {}): PullRequestLink {
  return {
    ticket: 10,
    prNumber: 11,
    headSha: "h1",
    baseSha: "b1",
    state: "open",
    mergeable: true,
    requiredChecksGreen: false,
    closesTicket: 10,
    hasEvidence: true,
    ...overrides,
  };
}

describe("isReviewReady", () => {
  test("ready with open PR, closing ref, evidence, and current requirements", () => {
    assert.equal(isReviewReady({ pullRequest: pr(), requirementsCurrent: true }).ready, true);
  });
  test("closed PR is not ready", () => {
    assert.equal(isReviewReady({ pullRequest: pr({ state: "closed" }), requirementsCurrent: true }).ready, false);
  });
  test("missing closing reference is not ready", () => {
    assert.equal(isReviewReady({ pullRequest: pr({ closesTicket: null }), requirementsCurrent: true }).ready, false);
  });
  test("missing evidence is not ready", () => {
    assert.equal(isReviewReady({ pullRequest: pr({ hasEvidence: false }), requirementsCurrent: true }).ready, false);
  });
  test("stale requirements revision is not ready", () => {
    const d = isReviewReady({ pullRequest: pr(), requirementsCurrent: false });
    assert.equal(d.ready, false);
    if (!d.ready) assert.match(d.reason, /requirements/);
  });
  test("empty head or base SHA is not ready", () => {
    assert.equal(isReviewReady({ pullRequest: pr({ headSha: "" }), requirementsCurrent: true }).ready, false);
    assert.equal(isReviewReady({ pullRequest: pr({ baseSha: "  " }), requirementsCurrent: true }).ready, false);
  });
});
