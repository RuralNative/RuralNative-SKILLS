// Shared review-handoff contract for review-this -> fix-this (ADR-0035).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  countReviewHandoffBlocks,
  isFixEligible,
  parseFixProgress,
  parseReviewHandoff,
  renderFixProgress,
  renderReviewHandoff,
  validateReviewHandoff,
  type ReviewHandoffInput,
} from "../scripts/workflow-state.ts";

const sha256 = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const PIN = `requirements-v1:parent=${HASH_A};ticket=${HASH_B}`;
const POLICY = "review-contract-v1:REVIEW.md\th1";

function input(overrides: Partial<ReviewHandoffInput> = {}): ReviewHandoffInput {
  return {
    repository: "o/r",
    prNumber: 285,
    reviewedHeadSha: "h1",
    reviewedBaseSha: "b1",
    closesTicket: 278,
    requirementsRevision: PIN,
    reviewPolicyRevision: POLICY,
    verificationCommand: "npm run verify",
    verificationResult: "review checks observed",
    verificationPassed: true,
    findings: [
      {
        id: "F-1",
        source: "spec",
        category: "correctness-and-edge-cases",
        severity: "blocking",
        file: "a.ts",
        line: 10,
        message: "Handle the empty case",
        evidenceKind: "inline",
        quote: "return items[0];",
        governingRule: "#278:AC-1",
        reviewedHeadSha: "h1",
        reviewedBaseSha: "b1",
      },
    ],
    provenance: {
      reviewId: "987",
      reviewAuthor: "reviewer",
      reviewedCommit: "h1",
      reviewedAt: "2026-09-08T00:00:00Z",
      sourceUrl: "https://github.com/o/r/pull/285#review-987",
      reviewerPermission: "write",
      commentIds: ["c1"],
    },
    ...overrides,
  };
}

function check(body: string, overrides: Record<string, unknown> = {}) {
  return {
    body,
    repository: "o/r",
    prNumber: 285,
    currentHeadSha: "h1",
    currentBaseSha: "b1",
    currentRequirementsRevision: PIN,
    currentReviewPolicyRevision: POLICY,
    observedProvenance: {
      reviewId: "987",
      reviewAuthor: "reviewer",
      reviewerPermission: "write" as const,
      reviewedCommit: "h1",
      reviewedAt: "2026-09-08T00:00:00Z",
      sourceUrl: "https://github.com/o/r/pull/285#review-987",
      commentIds: ["c1"] as readonly string[],
    },
    reviewCompleted: true,
    reviewDismissed: false,
    ...overrides,
  };
}

describe("review handoff round-trip", () => {
  test("complete review with findings validates current", () => {
    const body = `## Standards\n\nok\n\n${renderReviewHandoff(input())}\n`;
    assert.equal(countReviewHandoffBlocks(body), 1);
    assert.deepEqual(parseReviewHandoff(body), { found: true, version: "review-handoff-v1" });
    const result = validateReviewHandoff(check(body));
    assert.equal(result.status, "current");
  });
  test("complete empty review validates current", () => {
    const body = renderReviewHandoff(input({ findings: [] }));
    assert.equal(validateReviewHandoff(check(body)).status, "current");
  });
  test("missing, duplicate, and unknown versions never authorize fixes", () => {
    assert.equal(validateReviewHandoff(check("no handoff")).status, "missing");
    const body = renderReviewHandoff(input());
    assert.equal(validateReviewHandoff(check(`${body}\n\n${body}`)).status, "malformed");
    assert.equal(
      validateReviewHandoff(check(body.replace("review-handoff-v1", "review-handoff-v9"))).status,
      "unsupported-version",
    );
  });
  test("forged provenance, dismissed, stale, and partial reports stop", () => {
    const body = renderReviewHandoff(input());
    const forged = {
      reviewId: "other",
      reviewAuthor: "reviewer",
      reviewerPermission: "write" as const,
      reviewedCommit: "h1",
      reviewedAt: "2026-09-08T00:00:00Z",
      sourceUrl: "https://github.com/o/r/pull/285#review-987",
      commentIds: ["c1"] as readonly string[],
    };
    assert.equal(validateReviewHandoff(check(body, { observedProvenance: forged })).status, "stale");
    assert.equal(validateReviewHandoff(check(body, { reviewDismissed: true })).status, "stale");
    assert.equal(validateReviewHandoff(check(body, { currentHeadSha: "h2" })).status, "stale");
    assert.equal(
      validateReviewHandoff(check(body, { currentRequirementsRevision: `requirements-v1:parent=${sha256("x")};ticket=${HASH_B}` })).status,
      "stale",
    );
    assert.equal(validateReviewHandoff(check(body.replace(/- Findings count: 1/, "- Findings count: 2"))).status, "malformed");
  });
});

describe("fix eligibility without review or CI gates", () => {
  const eligible = {
    handoffStatus: "current",
    requirementsCurrent: true,
    policyCurrent: true,
    allFindingsResolved: true,
    hasUnresolvableFinding: false,
    conflictsResolved: true,
    conflictNeedsDecision: false,
    localVerificationPassed: true,
    verificationCapable: true,
    evidenceCurrent: true,
    worktreeClean: true,
    pullRequestOpen: true,
    mergeable: true,
    headMatchesVerifiedResult: true,
  };
  test("resolved findings with passing local verification merge", () => {
    assert.equal(isFixEligible(eligible).eligible, true);
  });
  test("unresolved work, missing verification, or unmergeable PR blocks", () => {
    for (const fact of [
      { ...eligible, allFindingsResolved: false },
      { ...eligible, hasUnresolvableFinding: true },
      { ...eligible, conflictsResolved: false },
      { ...eligible, localVerificationPassed: false },
      { ...eligible, verificationCapable: false },
      { ...eligible, mergeable: false },
      { ...eligible, handoffStatus: "stale" },
    ]) {
      assert.equal(isFixEligible(fact).eligible, false);
    }
  });
});

describe("fix progress checkpoint", () => {
  test("progress round-trips and names another target as malformed", () => {
    const body = renderFixProgress({
      repository: "o/r",
      prNumber: 285,
      sourceReviewId: "987",
      sourceHandoffDigest: sha256("handoff"),
      ticket: 278,
      parent: 99,
      startedHeadSha: "h1",
      startedBaseSha: "b1",
      resultingHeadSha: "h2",
      resultingBaseSha: "b1",
      dispositions: [],
      completedSteps: ["fixes"],
    });
    assert.equal(parseFixProgress({ body, repository: "o/r", prNumber: 285 }).found, true);
    assert.equal(parseFixProgress({ body, repository: "x/y", prNumber: 285 }).malformed, true);
  });
});
