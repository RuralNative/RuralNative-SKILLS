// Shared plan -> implement -> review -> fix handoff (ADR-0034, ADR-0035).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  countEvidenceBlocks,
  decideRepairPath,
  effectivePolicyRevision,
  parseEvidenceHandoff,
  renderReviewHandoff,
  requirementsMatch,
  requirementsPinWellFormed,
  requirementsRevision,
  requirementsRevisionValue,
  validateAuthoritativeBody,
  validateEvidenceHandoff,
  validateRepairTicket,
  validateReviewHandoff,
  type TicketFact,
} from "../scripts/workflow-state.ts";
import {
  composePullRequestBody,
  parseCompactEvidenceBlock,
  renderCompactEvidence,
} from "../skills/implement-this/acceptance-evidence.ts";
import { checkoutMatchDecision as reviewCheckoutMatchDecision } from "../skills/review-this/review-session.ts";
import { isReviewReady } from "../skills/review-this/discovery.ts";

const sha256 = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const PIN = `requirements-v1:parent=${HASH_A};ticket=${HASH_B}`;

function parentBody(): string {
  return [
    "## Affected seams",
    "- implement-this",
    "## Acceptance criteria",
    "- `AC-1`: Parent behavior",
    "## Structural constraints",
    "- None",
    "## Blocked by",
    "- None",
    "## Solution",
    "- Approved direction",
    "## Risk",
    "- ordinary",
    "## Smallest test-first verification",
    "- node --test skills/implement-this/tests/acceptance-evidence.test.ts",
    "",
  ].join("\n");
}

function ticketBody(): string {
  return [
    "## Affected seams",
    "- implement-this",
    "## Acceptance criteria",
    "- `AC-1`: Ship one behavior",
    "- `AC-2`: Docs note",
    "## Structural constraints",
    "- None",
    "## Blocked by",
    "- None",
    "## Settled decisions",
    "- Focused proof only",
    "## Risk",
    "- ordinary",
    "## Smallest sufficient verification",
    "- node --test skills/implement-this/tests/acceptance-evidence.test.ts",
    "",
  ].join("\n");
}

function renderPrBody(headSha: string, pin: string = PIN): string {
  const block = renderCompactEvidence({
    criteria: [
      { id: "AC-1", text: "Ship one behavior", status: "active" },
      { id: "AC-2", text: "Docs note", status: "active" },
    ],
    evidence: [
      { criterionId: "AC-1", kind: "behavior", focusedCommand: "node --test a.test.ts", result: "3 passed", passed: true },
      { criterionId: "AC-2", kind: "non-behavior", rationale: "docs-only wording change verified by diff" },
    ],
    isBugFix: false,
    requirementsRevision: pin,
    headSha,
  });
  return composePullRequestBody("Context\n", 100, block);
}

describe("canonical planning output survives parsing", () => {
  test("valid parent and ticket bodies validate and fingerprint", () => {
    assert.deepEqual(validateAuthoritativeBody(parentBody(), "parent"), []);
    assert.deepEqual(validateAuthoritativeBody(ticketBody(), "ticket"), []);
    const rev = requirementsRevision(parentBody(), ticketBody(), sha256);
    assert.ok(requirementsPinWellFormed(requirementsRevisionValue(rev)));
  });
  test("missing sections, duplicates, and ambiguity stop before pinning", () => {
    assert.ok(validateAuthoritativeBody("no sections", "ticket").some((e) => e.includes("missing required section")));
    const dup = `${ticketBody()}\n## Risk\n- again\n`;
    assert.ok(validateAuthoritativeBody(dup, "ticket").some((e) => e.includes("duplicate section")));
    const numbered = ticketBody().replace("- `AC-1`: Ship one behavior", "1. AC-1: Ship one behavior");
    assert.ok(validateAuthoritativeBody(numbered, "ticket").some((e) => e.includes("unsupported criterion line")));
    const bothHomes = ticketBody().replace("## Settled decisions", "## Solution");
    const both = `${bothHomes}\n## Settled decisions\n- extra\n`;
    assert.ok(validateAuthoritativeBody(both, "ticket").some((e) => e.includes("ambiguous sections")));
  });
  test("standardized checkbox criteria pass canonical publication", () => {
    const checkbox = ticketBody()
      .replace("- `AC-1`: Ship one behavior", "- [ ] AC-1: Ship one behavior")
      .replace("- `AC-2`: Docs note", "- [ ] AC-2: Docs note");
    assert.deepEqual(validateAuthoritativeBody(checkbox, "ticket"), []);
    assert.deepEqual(validateAuthoritativeBody(parentBody(), "parent"), []);
    const legacy = requirementsRevision(parentBody(), ticketBody(), sha256);
    const published = requirementsRevision(parentBody(), checkbox, sha256);
    assert.equal(legacy.version, "requirements-v1");
    assert.equal(requirementsRevisionValue(published), requirementsRevisionValue(legacy));
  });
  test("a missing pin never matches, even against itself", () => {
    assert.equal(requirementsMatch("", ""), false);
    assert.equal(requirementsMatch(PIN, ""), false);
    assert.equal(requirementsMatch(PIN, PIN), true);
  });
});

describe("implementation evidence validates on both sides", () => {
  test("fresh envelope passes delivery and review alike", () => {
    const body = renderPrBody("abc123");
    assert.equal(countEvidenceBlocks(body), 1);
    assert.ok(parseCompactEvidenceBlock(body)?.includes("AC-1"));
    const parsed = parseEvidenceHandoff(body);
    assert.equal(parsed.found, true);
    assert.equal(parsed.envelopeVersion, "evidence-v2");
    const check = validateEvidenceHandoff({ body, currentRequirementsRevision: PIN, currentHeadSha: "abc123" });
    assert.equal(check.status, "current");
    assert.equal(
      isReviewReady({
        pullRequest: {
          ticket: 100,
          prNumber: 283,
          headSha: "abc123",
          baseSha: "base1",
          state: "open",
          mergeable: true,
          requiredChecksGreen: false,
          closesTicket: 100,
          hasEvidence: true,
          requirementsRevision: PIN,
        },
        requirementsCurrent: true,
        evidenceStatus: check.status,
      }).ready,
      true,
    );
  });
  test("reported #283 shape (no pin) fails identically on both sides", () => {
    const body = "Implementation summary with no fingerprint\n\nCloses #277\n";
    assert.equal(validateEvidenceHandoff({ body, currentRequirementsRevision: PIN, currentHeadSha: "h" }).status, "missing");
    assert.equal(
      isReviewReady({
        pullRequest: {
          ticket: 277,
          prNumber: 283,
          headSha: "h",
          baseSha: "b",
          state: "open",
          mergeable: true,
          requiredChecksGreen: false,
          closesTicket: 277,
          hasEvidence: false,
          requirementsRevision: undefined,
        },
        requirementsCurrent: true,
      }).ready,
      false,
    );
  });
  test("stale, malformed, versioned, and rebound heads stop", () => {
    const body = renderPrBody("abc123");
    assert.equal(validateEvidenceHandoff({ body, currentRequirementsRevision: PIN, currentHeadSha: "other" }).status, "stale");
    const otherPin = `requirements-v1:parent=${"c".repeat(64)};ticket=${HASH_B}`;
    assert.equal(validateEvidenceHandoff({ body, currentRequirementsRevision: otherPin, currentHeadSha: "abc123" }).status, "stale");
    const validBody = renderPrBody("abc123");
    const badPinBody = validBody.replace(/Requirements revision: \S+/, "Requirements revision: requirements-v1:bogus");
    assert.equal(validateEvidenceHandoff({ body: badPinBody, currentRequirementsRevision: PIN, currentHeadSha: "abc123" }).status, "malformed");
    const future = body.replace("evidence-v2", "evidence-v9");
    assert.equal(validateEvidenceHandoff({ body: future, currentRequirementsRevision: PIN, currentHeadSha: "abc123" }).status, "unsupported-version");
    const doubled = `${body}\n\n${body}`;
    assert.equal(validateEvidenceHandoff({ body: doubled, currentRequirementsRevision: PIN, currentHeadSha: "abc123" }).status, "malformed");
  });
  test("legacy evidence needs positive provenance", () => {
    const legacy = "x\n<!-- ruralnative:acceptance-evidence:start -->\nold\n<!-- ruralnative:acceptance-evidence:end -->\n";
    assert.equal(validateEvidenceHandoff({ body: legacy, currentRequirementsRevision: PIN }).status, "missing");
    assert.equal(
      validateEvidenceHandoff({ body: legacy, currentRequirementsRevision: PIN, legacyProvenance: true }).status,
      "current",
    );
  });
});

describe("repair path stays narrow", () => {
  const ticket = (overrides: Partial<TicketFact> & { number: number }): TicketFact => ({
    state: "open",
    labels: ["ready-for-human"],
    assignees: [],
    parent: 99,
    openBlockers: [],
    ...overrides,
  });
  test("ready-for-human with one verified match may proceed", () => {
    const parent = ticket({ number: 99, parent: null, labels: [] });
    assert.equal(validateRepairTicket(ticket({ number: 100 }), 100, parent).ok, true);
    assert.equal(
      decideRepairPath({ matchingOpenPrs: 1, baseIsMain: true, closesTicket: true, checkoutMatchesPrHead: true }).proceed,
      true,
    );
  });
  test("ambiguity and stale gates still stop", () => {
    const parent = ticket({ number: 99, parent: null, labels: [] });
    assert.equal(validateRepairTicket(ticket({ number: 100, labels: ["ready-for-agent"] }), 100, parent).ok, false);
    assert.equal(validateRepairTicket(ticket({ number: 100, assignees: ["x"] }), 100, parent).ok, false);
    assert.equal(
      decideRepairPath({ matchingOpenPrs: 2, baseIsMain: true, closesTicket: true, checkoutMatchesPrHead: true }).proceed,
      false,
    );
    assert.equal(
      decideRepairPath({ matchingOpenPrs: 1, baseIsMain: false, closesTicket: true, checkoutMatchesPrHead: true }).proceed,
      false,
    );
  });
});

describe("effective policy revision", () => {
  test("source changes invalidate reuse", () => {
    assert.notEqual(
      effectivePolicyRevision([{ path: "REVIEW.md", hash: "a" }]),
      effectivePolicyRevision([{ path: "REVIEW.md", hash: "b" }]),
    );
  });
});

describe("review checkout and handoff reach fix-this", () => {
  const policy = effectivePolicyRevision([{ path: "REVIEW.md", hash: "h1" }]);
  const observation = {
    reviewId: "987",
    reviewAuthor: "reviewer",
    reviewerPermission: "write" as const,
    reviewedCommit: "abc123",
    reviewedAt: "2026-09-08T00:00:00Z",
    sourceUrl: "https://github.com/o/r/pull/283#discussion-987",
    commentIds: [] as readonly string[],
  };
  test("branch alias at the reviewed commit passes the checkout gate", () => {
    assert.equal(
      reviewCheckoutMatchDecision({ worktreeClean: true, currentBranch: "278", expectedBranch: "278-baseline", localHeadSha: "abc123", pullRequestHeadSha: "abc123" }).match,
      true,
    );
  });
  test("published review handoff validates for the fix consumer", () => {
    const body = [
      "## Standards",
      "",
      "ok",
      "",
      renderReviewHandoff({
        repository: "o/r",
        prNumber: 283,
        reviewedHeadSha: "abc123",
        reviewedBaseSha: "base1",
        closesTicket: 100,
        requirementsRevision: PIN,
        reviewPolicyRevision: policy,
        verificationCommand: "node --test skills/review-this/tests/review-session.test.ts",
        verificationResult: "review checks observed",
        verificationPassed: true,
        findings: [],
        provenance: { ...observation, reviewerPermission: "write" },
      }),
    ].join("\n");
    const result = validateReviewHandoff({
      body,
      repository: "o/r",
      prNumber: 283,
      currentHeadSha: "abc123",
      currentBaseSha: "base1",
      currentRequirementsRevision: PIN,
      currentReviewPolicyRevision: policy,
      observedProvenance: observation,
      reviewCompleted: true,
      reviewDismissed: false,
    });
    assert.equal(result.status, "current");
  });
  test("stale evidence still stops the composed handoff", () => {
    const body = renderReviewHandoff({
      repository: "o/r",
      prNumber: 283,
      reviewedHeadSha: "abc123",
      reviewedBaseSha: "base1",
      closesTicket: 100,
      requirementsRevision: PIN,
      reviewPolicyRevision: policy,
      verificationCommand: "node --test skills/review-this/tests/review-session.test.ts",
      verificationResult: "review checks observed",
      verificationPassed: true,
      findings: [],
      provenance: { ...observation, reviewerPermission: "write" },
    });
    assert.equal(validateEvidenceHandoff({ body: "no evidence", currentRequirementsRevision: PIN, currentHeadSha: "abc123" }).status, "missing");
    assert.equal(
      validateReviewHandoff({
        body,
        repository: "o/r",
        prNumber: 283,
        currentHeadSha: "other",
        currentBaseSha: "base1",
        currentRequirementsRevision: PIN,
        currentReviewPolicyRevision: policy,
        observedProvenance: observation,
        reviewCompleted: true,
        reviewDismissed: false,
      }).status,
      "stale",
    );
  });
});

describe("hardened handoff gates", () => {
  test("envelope metadata without criterion proof is malformed", () => {
    const body = [
      "<!-- ruralnative:compact-evidence:start -->",
      "- Envelope version: evidence-v2",
      `- Requirements revision: ${PIN}`,
      "- Head SHA: h",
      "Criterion:",
      "Criteria revision:",
      "<!-- ruralnative:compact-evidence:end -->",
    ].join("\n");
    assert.equal(
      validateEvidenceHandoff({ body, currentRequirementsRevision: PIN, currentHeadSha: "h" }).status,
      "malformed",
    );
  });
  test("malformed or removed version never downgrades to bypass head binding", () => {
    const body = renderPrBody("old-head");
    assert.equal(
      validateEvidenceHandoff({
        body: body.replace("Envelope version: evidence-v2", "Envelope version: evidence-v2 extra"),
        currentRequirementsRevision: PIN,
        currentHeadSha: "new-head",
      }).status,
      "unsupported-version",
    );
    assert.equal(
      validateEvidenceHandoff({
        body: body.replace("- Envelope version: evidence-v2\n", ""),
        currentRequirementsRevision: PIN,
        currentHeadSha: "new-head",
      }).status,
      "malformed",
    );
  });
  test("multiline continuations stop before pinning", () => {
    const continued = ticketBody().replace(
      "- `AC-1`: Ship one behavior",
      "- `AC-1`: Ship one behavior\n  Never include secrets.",
    );
    assert.ok(
      validateAuthoritativeBody(continued, "ticket").some((e) => e.includes("unsupported criterion line")),
    );
  });
  test("pinned evidence without shared validation is not ready", () => {
    const decision = isReviewReady({
      pullRequest: {
        ticket: 100,
        prNumber: 283,
        headSha: "abc123",
        baseSha: "base1",
        state: "open",
        mergeable: true,
        requiredChecksGreen: false,
        closesTicket: 100,
        hasEvidence: true,
        requirementsRevision: PIN,
      },
      requirementsCurrent: true,
    });
    assert.equal(decision.ready, false);
    assert.match(decision.reason, /validateEvidenceHandoff/);
  });
});
