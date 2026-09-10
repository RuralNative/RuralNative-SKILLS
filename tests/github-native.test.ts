// GitHub-native production workflows (ADR-0040): shared core regressions.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  decideRepairPath,
  extractClosingReferences,
  hasNativeClosingReference,
  renderReviewHandoff,
  reviewerPermissionMatches,
  validateReviewHandoff,
} from "../scripts/workflow-state.ts";

const PIN = "requirements-adapted-v1:parent=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa;ticket=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const POLICY = "review-contract-v1:REVIEW.md\th1";

function handoffBody(overrides = {}) {
  return renderReviewHandoff({
    repository: "o/r",
    prNumber: 300,
    reviewedHeadSha: "abc123",
    reviewedBaseSha: "base1",
    closesTicket: 288,
    requirementsRevision: PIN,
    reviewPolicyRevision: POLICY,
    verificationCommand: "node --test x",
    verificationResult: "ok",
    verificationPassed: true,
    findings: [],
    provenance: {
      reviewId: "42",
      reviewAuthor: "reviewer",
      reviewedCommit: "abc123",
      reviewedAt: "",
      sourceUrl: "",
      reviewerPermission: "write",
      commentIds: [],
    },
    ...overrides,
  });
}

function check(body: string, observed: Record<string, unknown> = {}) {
  return {
    body,
    repository: "o/r",
    prNumber: 300,
    currentHeadSha: "abc123",
    currentBaseSha: "base1",
    currentRequirementsRevision: PIN,
    currentReviewPolicyRevision: POLICY,
    observedProvenance: {
      reviewId: "42",
      reviewAuthor: "reviewer",
      reviewerPermission: "write" as const,
      reviewedCommit: "abc123",
      reviewedAt: "",
      sourceUrl: "https://github.com/o/r/pull/300#review-42",
      commentIds: [] as readonly string[],
      ...observed,
    },
    reviewCompleted: true,
    reviewDismissed: false,
  };
}

describe("reviewer permission movement (ADR-0040)", () => {
  test("write to admin keeps content valid", () => {
    assert.equal(reviewerPermissionMatches("admin", "write"), true);
    assert.equal(reviewerPermissionMatches("write", "admin"), true);
    const result = validateReviewHandoff(check(handoffBody(), { reviewerPermission: "admin" }));
    assert.equal(result.status, "current");
  });
  test("policy and collaborator roles do not interchange", () => {
    assert.equal(reviewerPermissionMatches("policy", "write"), false);
    assert.equal(reviewerPermissionMatches("write", "policy"), false);
    assert.equal(reviewerPermissionMatches("unknown", "write"), false);
  });
});

describe("complete comment enumeration (ADR-0040)", () => {
  test("empty claimed set passes only against complete empty observation", () => {
    const ok = validateReviewHandoff(check(handoffBody(), { commentIds: [], commentIdsComplete: true }));
    assert.equal(ok.status, "current");
  });
  test("omitted observed comments stop when enumeration is complete", () => {
    const result = validateReviewHandoff(
      check(handoffBody(), { commentIds: ["99"], commentIdsComplete: true }),
    );
    assert.equal(result.status, "stale");
  });
  test("legacy subset records without the complete flag still pass", () => {
    const result = validateReviewHandoff(check(handoffBody(), { commentIds: ["99"] }));
    assert.equal(result.status, "current");
  });
});

describe("native closing references (ADR-0040)", () => {
  test("repository-qualified links decide association", () => {
    const refs = extractClosingReferences("Fixes o/r#288 and Fixes o/other#288\n```\nCloses #999\n```\n");
    assert.ok(refs.some((r) => r.repository === "o/r" && r.ticket === 288));
    assert.ok(refs.some((r) => r.repository === "o/other" && r.ticket === 288));
    assert.equal(refs.some((r) => r.ticket === 999), false);
  });
  test("plain mentions without a closing keyword never count", () => {
    assert.deepEqual(extractClosingReferences("see o/r#288 for context"), []);
    assert.equal(hasNativeClosingReference("see o/r#288 for context", 288, "o/r"), false);
    assert.equal(hasNativeClosingReference("o/r#288", 288, "o/r"), false);
  });
  test("bare references pass only without a conflicting qualified link", () => {
    assert.equal(hasNativeClosingReference("Closes #288", 288, "o/r"), true);
    assert.equal(hasNativeClosingReference("Closes o/other#288", 288, "o/r"), false);
    assert.equal(hasNativeClosingReference("Fixes o/r#288", 288, "o/r"), true);
    assert.equal(hasNativeClosingReference("Closes #288", 288, ""), false);
  });
});

describe("pinned default branch repair (ADR-0040)", () => {
  test("repair follows the pinned default branch", () => {
    assert.equal(
      decideRepairPath({ matchingOpenPrs: 1, baseIsMain: false, baseMatchesDefault: true, closesTicket: true, checkoutMatchesPrHead: true }).proceed,
      true,
    );
    assert.equal(
      decideRepairPath({ matchingOpenPrs: 1, baseIsMain: true, baseMatchesDefault: false, closesTicket: true, checkoutMatchesPrHead: true }).proceed,
      false,
    );
  });
});
