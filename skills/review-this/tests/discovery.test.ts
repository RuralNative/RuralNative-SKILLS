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
    requirementsRevision: "requirements-v1:parent=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa;ticket=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    ...overrides,
  };
}

describe("isReviewReady", () => {
  test("ready with open PR, closing ref, validated evidence, and current requirements", () => {
    assert.equal(isReviewReady({ pullRequest: pr(), requirementsCurrent: true, evidenceStatus: "current" }).ready, true);
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
    const d = isReviewReady({ pullRequest: pr(), requirementsCurrent: false, evidenceStatus: "current" });
    assert.equal(d.ready, false);
    if (!d.ready) assert.match(d.reason, /requirements/);
  });
  test("non-current evidence status is not ready", () => {
    for (const status of ["missing", "malformed", "stale", "unsupported-version"]) {
      const d = isReviewReady({ pullRequest: pr(), requirementsCurrent: true, evidenceStatus: status });
      assert.equal(d.ready, false, status);
      if (!d.ready) assert.match(d.reason, new RegExp(status));
    }
  });
  test("unpinned new evidence without provenance is not ready", () => {
    const d = isReviewReady({
      pullRequest: pr({ requirementsRevision: undefined }),
      requirementsCurrent: true,
    });
    assert.equal(d.ready, false);
    if (!d.ready) assert.match(d.reason, /no requirements pin/);
  });
  test("established pre-contract provenance preserves the legacy exception", () => {
    const d = isReviewReady({
      pullRequest: pr({ requirementsRevision: undefined }),
      requirementsCurrent: true,
      evidenceProvenance: "pre-contract",
    });
    assert.equal(d.ready, true);
  });
  test("pinned evidence without shared validation is not ready", () => {
    const d = isReviewReady({ pullRequest: pr(), requirementsCurrent: true });
    assert.equal(d.ready, false);
    assert.match(d.reason, /validateEvidenceHandoff/);
  });
  test("empty head or base SHA is not ready", () => {
    assert.equal(isReviewReady({ pullRequest: pr({ headSha: "" }), requirementsCurrent: true }).ready, false);
    assert.equal(isReviewReady({ pullRequest: pr({ baseSha: "  " }), requirementsCurrent: true }).ready, false);
  });
});
