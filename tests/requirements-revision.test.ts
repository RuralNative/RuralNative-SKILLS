// Versioned requirements revision (ADR-0031).
//
// Cross-stage freshness: a fingerprint covers the normalized authoritative
// sections of the parent specification and ticket bodies, is carried in the
// compact PR-body evidence, and stops delivery, review publication, and merge
// when either issue body changed. Comments, evidence, paths, branches, commit
// SHAs, and runtime output never enter the fingerprint.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  REQUIREMENTS_REVISION_VERSION,
  canonicalRequirementsText,
  isMergeEligible,
  parseAuthoritativeSections,
  requirementsGate,
  requirementsMatch,
  requirementsRevision,
  requirementsRevisionValue,
} from "../scripts/workflow-state.ts";
import { isDelivered } from "../skills/implement-this/command-session.ts";
import { isReviewReady } from "../skills/review-this/discovery.ts";
import {
  renderCompactEvidence,
  readEvidenceForReview,
} from "../skills/implement-this/acceptance-evidence.ts";

const sha256 = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

const PARENT_BODY = [
  "## Affected seams",
  "",
  "- `implement-this`",
  "",
  "## Acceptance criteria",
  "",
  "- `AC-1`: Single ticket delivers one PR.",
  "",
  "## Structural constraints",
  "",
  "- Keep the current checkout.",
  "",
  "## Settled decisions",
  "",
  "- No workers.",
].join("\n");

const TICKET_BODY = [
  "## Affected seams",
  "",
  "- `implement-this`",
  "",
  "## Acceptance criteria",
  "",
  "- `AC-1`: Focused proof passes.",
  "",
  "## Smallest sufficient verification",
  "",
  "- `node --test skills/implement-this/tests/verification.test.ts`",
].join("\n");

function revision(): string {
  return requirementsRevisionValue(requirementsRevision(PARENT_BODY, TICKET_BODY, sha256));
}

describe("requirements revision", () => {
  test("carrier value carries the contract version", () => {
    assert.ok(revision().startsWith(`${REQUIREMENTS_REVISION_VERSION}:`));
  });
  test("comments and evidence never enter the fingerprint", () => {
    const withNoise = `${TICKET_BODY}\n\n## Comments\n\nnoise\n\n<!-- ruralnative:compact-evidence:start -->x<!-- ruralnative:compact-evidence:end -->\n`;
    assert.equal(
      requirementsRevisionValue(requirementsRevision(PARENT_BODY, withNoise, sha256)),
      revision(),
    );
  });
  test("authoritative edits change the revision", () => {
    const changed = TICKET_BODY.replace("Focused proof passes.", "Different behavior.");
    assert.notEqual(
      requirementsRevisionValue(requirementsRevision(PARENT_BODY, changed, sha256)),
      revision(),
    );
  });
  test("canonical text normalizes trailing whitespace", () => {
    const padded = TICKET_BODY.replace("- `implement-this`", "- `implement-this`   ");
    assert.equal(
      canonicalRequirementsText(parseAuthoritativeSections(padded)),
      canonicalRequirementsText(parseAuthoritativeSections(TICKET_BODY)),
    );
  });
});

describe("delivery, review, and merge freshness", () => {
  test("requirementsMatch compares the pinned value", () => {
    assert.equal(requirementsMatch(revision(), revision()), true);
    assert.equal(requirementsMatch(revision(), "requirements-v1:parent=x;ticket=y"), false);
  });
  test("requirementsGate stops with needs-info on mismatch", () => {
    assert.equal(requirementsGate(revision(), revision()).action, "continue");
    const stopped = requirementsGate(revision(), "requirements-v1:parent=x;ticket=y");
    assert.equal(stopped.action, "stop");
    assert.ok(stopped.addLabels.includes("needs-info"));
  });
  test("delivery requires current requirements", () => {
    assert.equal(
      isDelivered({ pullRequestOpen: true, closingReferenceValid: true, evidenceInPullRequestBody: true, requirementsCurrent: true }),
      true,
    );
    assert.equal(
      isDelivered({ pullRequestOpen: true, closingReferenceValid: true, evidenceInPullRequestBody: true, requirementsCurrent: false }),
      false,
    );
  });
  test("review readiness requires current requirements", () => {
    const ready = isReviewReady({
      pullRequest: {
        ticket: 10, prNumber: 11, headSha: "h", baseSha: "b", state: "open",
        mergeable: true, requiredChecksGreen: true, closesTicket: 10, hasEvidence: true,
      },
      requirementsCurrent: false,
    });
    assert.equal(ready.ready, false);
  });
  test("compact evidence carries the revision and stays readable", () => {
    const block = renderCompactEvidence({
      criteria: [{ id: "AC-1", text: "Focused proof passes.", status: "active" }],
      evidence: [{ criterionId: "AC-1", kind: "behavior", focusedCommand: "node --test x", result: "1 passed", passed: true }],
      isBugFix: false,
      requirementsRevision: revision(),
    });
    assert.ok(block.includes(revision()));
    assert.ok(readEvidenceForReview(`Body\n\nCloses #10\n\n${block}\n`)?.includes("AC-1"));
  });
  test("merge requires current requirements", () => {
    const pr = { headSha: "h", baseSha: "b", mergeable: true, requiredChecksGreen: true };
    const review = {
      reviewedHeadSha: "h", reviewedBaseSha: "b", unresolvedConfirmedFindings: 0,
      localReviewClean: true, trustedSummaryUpdated: true, inlineFindingsVerified: true,
      requirementsCurrent: false,
    };
    assert.equal(isMergeEligible(pr, review).eligible, false);
  });
});
