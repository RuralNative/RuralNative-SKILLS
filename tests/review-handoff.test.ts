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
  test("source URL, comment ownership, and timestamps validate independently (ADR-0038)", () => {
    const body = renderReviewHandoff(input());
    const base = check(body);
    assert.equal(
      validateReviewHandoff({ ...base, observedProvenance: { ...base.observedProvenance, sourceUrl: "https://github.com/o/r/pull/285#review-999" } }).status,
      "stale",
      "a forged observed source URL never matches a payload-supplied URL",
    );
    assert.equal(
      validateReviewHandoff({ ...base, observedProvenance: { ...base.observedProvenance, commentIds: [] as readonly string[] } }).status,
      "stale",
      "payload comment ownership must be observed",
    );
    assert.equal(
      validateReviewHandoff({ ...base, observedProvenance: { ...base.observedProvenance, reviewedAt: "2026-09-08T01:00:00Z" } }).status,
      "stale",
      "a payload-supplied timestamp must match observation",
    );
    assert.equal(
      validateReviewHandoff({ ...base, observedProvenance: { ...base.observedProvenance, sourceUrl: "" } }).status,
      "malformed",
      "the observed native source URL is required provenance",
    );
  });
  test("an empty payload timestamp stays valid while the review is pending", () => {
    const body = renderReviewHandoff(input({ provenance: { ...input().provenance, reviewedAt: "", sourceUrl: "" } }));
    const result = validateReviewHandoff({
      ...check(body),
      observedProvenance: { ...check(body).observedProvenance, reviewedAt: "2026-09-09T00:00:00Z" },
    });
    assert.equal(result.status, "current");
  });
});

describe("fix eligibility without review or CI gates", () => {
  const eligible = {
    reviewHandoffCurrent: true,
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
      { ...eligible, reviewHandoffCurrent: false },
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
      verificationReceipts: [],
      intendedRemoteOperation: "none",
      completedSteps: ["fixes"],
      mergeReceipt: null,
    });
    assert.equal(parseFixProgress({ body, repository: "o/r", prNumber: 285 }).found, true);
    assert.equal(parseFixProgress({ body, repository: "x/y", prNumber: 285 }).malformed, true);
  });
  test("fix-progress-v2 round-trips dispositions, receipts, operation, and merge receipt", () => {
    const body = renderFixProgress({
      repository: "o/r",
      prNumber: 285,
      sourceReviewId: "987",
      sourceHandoffDigest: "a".repeat(64),
      ticket: 278,
      parent: 99,
      startedHeadSha: "h1",
      startedBaseSha: "b1",
      resultingHeadSha: "h2",
      resultingBaseSha: "b1",
      dispositions: [
        {
          findingId: "F-1",
          disposition: "fixed",
          files: ["a.ts"],
          commitSha: "c1",
          verificationCommand: "node --test a.ts",
          verificationResult: "1 passed",
        },
      ],
      verificationReceipts: [
        { command: "npm run verify", result: "all checks passed", passed: true },
      ],
      intendedRemoteOperation: "merge",
      completedSteps: ["fixes", "evidence", "push", "merge"],
      mergeReceipt: "1".repeat(40),
    });
    const parsed = parseFixProgress({ body, repository: "o/r", prNumber: 285 });
    assert.equal(parsed.found, true);
    assert.equal(parsed.malformed, false);
    assert.equal(parsed.version, "fix-progress-v2");
    assert.equal(parsed.legacy, false);
    assert.equal(parsed.sourceReviewId, "987");
    assert.equal(parsed.resultingHeadSha, "h2");
    assert.equal(parsed.intendedRemoteOperation, "merge");
    assert.equal(parsed.mergeReceipt, "1".repeat(40));
    assert.deepEqual(parsed.dispositions?.map((d) => d.findingId), ["F-1"]);
    assert.deepEqual(parsed.verificationReceipts, [
      { command: "npm run verify", result: "all checks passed", passed: true },
    ]);
    assert.deepEqual(parsed.completedSteps, ["fixes", "evidence", "push", "merge"]);
  });
  test("legacy fix-progress-v1 checkpoints parse as diagnostic input only", () => {
    const legacy = [
      "<!-- ruralnative:fix-progress:start -->",
      "## Fix progress",
      "",
      "- Progress version: fix-progress-v1",
      "- Repository: o/r",
      "- PR: 285",
      "- Source review: 987",
      "- Handoff digest: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "- Ticket: #278",
      "- Parent: #99",
      "- Started head: h1",
      "- Started base: b1",
      "- Resulting head: h2",
      "- Resulting base: b1",
      "- Findings count: 0",
      "- Completed steps: fixes",
      "<!-- ruralnative:fix-progress:end -->",
      "",
    ].join("\n");
    const parsed = parseFixProgress({ body: legacy, repository: "o/r", prNumber: 285 });
    assert.equal(parsed.found, true);
    assert.equal(parsed.malformed, false);
    assert.equal(parsed.legacy, true);
    assert.equal(parsed.version, "fix-progress-v1");
    assert.ok(parsed.reason.includes("diagnostic"));
    assert.equal(parsed.intendedRemoteOperation, undefined);
  });
  test("unknown versions, duplicate markers, and forged digests are malformed", () => {
    const body = renderFixProgress({
      repository: "o/r",
      prNumber: 285,
      sourceReviewId: "987",
      sourceHandoffDigest: "a".repeat(64),
      ticket: 278,
      parent: 99,
      startedHeadSha: "h1",
      startedBaseSha: "b1",
      resultingHeadSha: "h2",
      resultingBaseSha: "b1",
      dispositions: [],
      verificationReceipts: [],
      intendedRemoteOperation: "none",
      completedSteps: ["fixes"],
      mergeReceipt: null,
    });
    assert.equal(
      parseFixProgress({ body: body.replace("fix-progress-v2", "fix-progress-v9"), repository: "o/r", prNumber: 285 }).malformed,
      true,
    );
    assert.equal(
      parseFixProgress({ body: body.replace("a".repeat(64), "xyz"), repository: "o/r", prNumber: 285 }).malformed,
      true,
    );
    assert.equal(
      parseFixProgress({ body: `${body}\n\n${body}`, repository: "o/r", prNumber: 285 }).malformed,
      true,
    );
  });
  test("duplicate disposition IDs with an adjusted count are malformed", () => {
    const body = renderFixProgress({
      repository: "o/r",
      prNumber: 285,
      sourceReviewId: "987",
      sourceHandoffDigest: "a".repeat(64),
      ticket: 278,
      parent: 99,
      startedHeadSha: "h1",
      startedBaseSha: "b1",
      resultingHeadSha: "h2",
      resultingBaseSha: "b1",
      dispositions: [
        {
          findingId: "F-1",
          disposition: "fixed",
          files: ["a.ts"],
          commitSha: "c1",
          verificationCommand: "node --test a.ts",
          verificationResult: "1 passed",
        },
      ],
      verificationReceipts: [],
      intendedRemoteOperation: "none",
      completedSteps: ["fixes"],
      mergeReceipt: null,
    });
    const duplicated = body.replace(
      "- Findings count: 1",
      "- Finding: F-1\n  - Disposition: fixed\n  - Files: a.ts\n  - Commit: c1\n  - Verification command: `node --test a.ts`\n  - Verification result: 1 passed\n- Findings count: 2",
    );
    const parsed = parseFixProgress({ body: duplicated, repository: "o/r", prNumber: 285 });
    assert.equal(parsed.malformed, true);
    assert.ok(String(parsed.reason).includes("duplicate disposition"));
  });
  test("a v2 checkpoint missing its ticket or parent lines is malformed", () => {
    const body = renderFixProgress({
      repository: "o/r",
      prNumber: 285,
      sourceReviewId: "987",
      sourceHandoffDigest: "a".repeat(64),
      ticket: 278,
      parent: 99,
      startedHeadSha: "h1",
      startedBaseSha: "b1",
      resultingHeadSha: "h2",
      resultingBaseSha: "b1",
      dispositions: [],
      verificationReceipts: [],
      intendedRemoteOperation: "none",
      completedSteps: ["fixes"],
      mergeReceipt: null,
    });
    for (const label of ["- Ticket: #278", "- Parent: #99"]) {
      const stripped = body.replace(`${label}\n`, "");
      const parsed = parseFixProgress({ body: stripped, repository: "o/r", prNumber: 285 });
      assert.equal(parsed.malformed, true, label);
      assert.ok(String(parsed.reason).includes("ticket or parent"));
    }
  });
  test("a completed merge step without a confirmed merge receipt is malformed", () => {
    const body = renderFixProgress({
      repository: "o/r",
      prNumber: 285,
      sourceReviewId: "987",
      sourceHandoffDigest: "a".repeat(64),
      ticket: 278,
      parent: 99,
      startedHeadSha: "h1",
      startedBaseSha: "b1",
      resultingHeadSha: "h2",
      resultingBaseSha: "b1",
      dispositions: [],
      verificationReceipts: [],
      intendedRemoteOperation: "merge",
      completedSteps: ["fixes", "evidence", "push"],
      mergeReceipt: null,
    });
    const withMergeStep = body.replace(
      "- Completed steps: fixes, evidence, push",
      "- Completed steps: fixes, evidence, push, merge",
    );
    const parsed = parseFixProgress({ body: withMergeStep, repository: "o/r", prNumber: 285 });
    assert.equal(parsed.malformed, true);
    assert.ok(String(parsed.reason).includes("merge receipt"));
  });
  test("the renderer rejects a completed merge step without a receipt", () => {
    assert.throws(() =>
      renderFixProgress({
        repository: "o/r",
        prNumber: 285,
        sourceReviewId: "987",
        sourceHandoffDigest: "a".repeat(64),
        ticket: 278,
        parent: 99,
        startedHeadSha: "h1",
        startedBaseSha: "b1",
        resultingHeadSha: "h2",
        resultingBaseSha: "b1",
        dispositions: [],
        verificationReceipts: [],
        intendedRemoteOperation: "merge",
        completedSteps: ["fixes", "evidence", "push", "merge"],
        mergeReceipt: null,
      }),
      /merge receipt/,
    );
  });
});
