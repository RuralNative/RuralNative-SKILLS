// Versioned requirements revision (ticket #190, parent #183).
//
// Cross-stage freshness tests: a fingerprint covers the normalized
// authoritative sections of the parent specification and ticket bodies, is
// carried identically through worker dispatch and review packets, and stops
// delivery, review publication, and merge when either issue body changed.
// Comments, acceptance evidence, timing summaries, paths, branches, commit
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
  type PullRequestFact,
  type ReviewFact,
  type TicketFact,
} from "../scripts/workflow-state.ts";
import { createDispatchPacket } from "../skills/implement-this/dispatch-packet.ts";
import { isDelivered, type DeliveryFact } from "../skills/implement-this/command-session.ts";
import { selectReviewWave, type PullRequestLink } from "../skills/review-this/discovery.ts";
import { reviewCanStart } from "../skills/review-this/review-session.ts";

const sha256 = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

const PARENT_BODY = [
  "## Behavior",
  "",
  "Make the production workflow clearer and safer.",
  "",
  "## Affected seams",
  "",
  "- `plan-this`",
  "- `implement-this`",
  "",
  "## Acceptance criteria",
  "",
  "- `AC-1`: Normal chat stays quiet.",
  "- `AC-2`: Planning asks only when a human choice is needed.",
  "",
  "## Structural constraints",
  "",
  "- Keep explicit approval before publication.",
  "- Keep tests with the behavior they prove.",
  "",
  "## Blocked by",
  "",
  "- #184",
  "",
  "## Solution",
  "",
  "- Use plain language as a workflow rule.",
  "- Give stable local criterion IDs.",
  "",
  "## Risk",
  "",
  "`high-risk`",
  "",
  "## Smallest test-first verification",
  "",
  "- Start with failing real-repository tests.",
].join("\n");

const TICKET_BODY = [
  "Part of #183",
  "",
  "## Behavior",
  "",
  "Carry a versioned requirements revision through dispatch and review.",
  "",
  "## Affected seams",
  "",
  "- `plan-this`",
  "- `implement-this`",
  "- `review-this`",
  "",
  "## Acceptance criteria",
  "",
  "- `AC-1`: The revision contains a contract version and separate fingerprints.",
  "- `AC-2`: Fingerprints use the canonical authoritative sections.",
  "",
  "## Smallest sufficient verification",
  "",
  "- Start with failing tests for body edits after dispatch.",
  "",
  "## Blocked by",
  "",
  "- #188",
  "",
  "## Sibling scheduling collisions",
  "",
  "- #185",
  "",
  "## Parallel safety",
  "",
  "Run only when no sibling owns workflow files.",
  "",
  "## Risk",
  "",
  "`high-risk`",
  "",
  "Evidence: shared contract across three workflow commands.",
].join("\n");

const revisionOf = (parent: string, ticket: string): string =>
  requirementsRevisionValue(requirementsRevision(parent, ticket, sha256));

const BASE = revisionOf(PARENT_BODY, TICKET_BODY);

function bodyWith(body: string, section: string, content: string[]): string {
  const lines = body.split("\n");
  const start = lines.findIndex((line) => line.trim() === section);
  assert.ok(start >= 0, `section ${section} must exist in the fixture`);
  const end = lines
    .slice(start + 1)
    .findIndex((line) => line.startsWith("## "));
  const stop = end < 0 ? lines.length : start + 1 + end;
  return [...lines.slice(0, start), section, ...content, ...lines.slice(stop)].join("\n");
}

describe("requirements revision shape (#190)", () => {
  test("AC-1: the revision carries a contract version plus separate parent and ticket fingerprints", () => {
    const rev = requirementsRevision(PARENT_BODY, TICKET_BODY, sha256);
    assert.equal(rev.version, REQUIREMENTS_REVISION_VERSION);
    assert.match(rev.parent, /^[0-9a-f]{64}$/);
    assert.match(rev.ticket, /^[0-9a-f]{64}$/);
    assert.notEqual(rev.parent, rev.ticket, "parent and ticket fingerprints stay separate");
    const value = requirementsRevisionValue(rev);
    assert.ok(value.startsWith(`${REQUIREMENTS_REVISION_VERSION}:parent=`));
    assert.ok(value.includes(`;ticket=${rev.ticket}`));
    assert.equal(revisionOf(PARENT_BODY, TICKET_BODY), value, "stable value for stable bodies");
  });

  test("AC-3: the fingerprint is SHA-256 from the standard library with no dependency", () => {
    const sections = parseAuthoritativeSections(TICKET_BODY);
    const text = canonicalRequirementsText(sections);
    const rev = requirementsRevision(PARENT_BODY, TICKET_BODY, sha256);
    assert.equal(rev.ticket, sha256(text));
    assert.equal(rev.ticket.length, 64, "SHA-256 hex digest");
  });

  test("AC-2: fingerprints use canonical affected seams, criteria, constraints, blockers, settled decisions, risk, and verification intent", () => {
    const sections = parseAuthoritativeSections(TICKET_BODY);
    assert.deepEqual(sections.affectedSeams, ["`plan-this`", "`implement-this`", "`review-this`"]);
    assert.deepEqual(sections.criteria.map((c) => c.id), ["AC-1", "AC-2"]);
    assert.deepEqual(sections.blockers, ["#188"]);
    assert.deepEqual(sections.risk, ["`high-risk`", "Evidence: shared contract across three workflow commands."]);
    assert.ok(
      sections.verificationIntent.join(" ").includes("failing tests for body edits"),
      "verification intent enters the fingerprint",
    );
    const parentSections = parseAuthoritativeSections(PARENT_BODY);
    assert.deepEqual(parentSections.settledDecisions[0], "Use plain language as a workflow rule.");
    assert.deepEqual(parentSections.constraints[0], "Keep explicit approval before publication.");
    assert.deepEqual(parentSections.affectedSeams, ["`plan-this`", "`implement-this`"]);
  });
});

describe("normalization and exclusions (#190)", () => {
  test("AC-4: line endings and insignificant trailing whitespace normalize without hiding text", () => {
    const crlf = TICKET_BODY.replace(/\n/g, "\r\n");
    const trailing = TICKET_BODY.replace(/^(.*)$/gm, "$1  ");
    assert.equal(revisionOf(PARENT_BODY, crlf), BASE, "CRLF normalizes");
    assert.equal(revisionOf(PARENT_BODY, trailing), BASE, "trailing spaces normalize");
  });

  test("AC-4: an ordering change inside a listed section is never hidden", () => {
    const swapped = bodyWith(
      TICKET_BODY,
      "## Blocked by",
      ["- #999", "- #188"],
    );
    assert.notEqual(revisionOf(PARENT_BODY, swapped), BASE);
  });

  test("AC-5: comments, evidence, timing, paths, branches, SHAs, and runtime output never enter the fingerprint", () => {
    const polluted = bodyWith(TICKET_BODY, "## Parallel safety", [
      "Run only when no sibling owns workflow files.",
      "Comment: add fingerprints everywhere. Path: skills/x. Branch: feature-190. SHA: abc123.",
      "`npm run verify` passed in 42ms.",
    ]);
    assert.ok(polluted.includes("## Parallel safety"));
    assert.equal(
      revisionOf(PARENT_BODY, polluted),
      BASE,
      "a non-authoritative section never changes the fingerprint",
    );
  });

  test("AC-10: a requirement discussed in a comment only counts after it is copied into the issue body", () => {
    const commentRequirement = "Merge must compare the revision before closing.";
    const bodyWithoutCopy = bodyWith(TICKET_BODY, "## Parallel safety", [
      `Comment discussed: ${commentRequirement}`,
    ]);
    assert.equal(
      revisionOf(PARENT_BODY, bodyWithoutCopy),
      BASE,
      "comment prose is not authority until copied into the body",
    );
    const bodyWithCopy = bodyWith(TICKET_BODY, "## Acceptance criteria", [
      "- `AC-1`: The revision contains a contract version and separate fingerprints.",
      "- `AC-2`: Fingerprints use the canonical authoritative sections.",
      `- \`AC-3\`: ${commentRequirement}`,
    ]);
    assert.notEqual(
      revisionOf(PARENT_BODY, bodyWithCopy),
      BASE,
      "the copied requirement changes the fingerprint",
    );
  });

  test("AC-2: a criterion clarification under the same ID changes the revision", () => {
    const clarified = bodyWith(TICKET_BODY, "## Acceptance criteria", [
      "- `AC-1`: The revision contains a contract version plus separate parent and ticket fingerprints.",
      "- `AC-2`: Fingerprints use the canonical authoritative sections.",
    ]);
    assert.notEqual(revisionOf(PARENT_BODY, clarified), BASE);
  });

  test("AC-2: a criterion replacement under a new ID changes the revision", () => {
    const replaced = bodyWith(TICKET_BODY, "## Acceptance criteria", [
      "- `AC-1`: The revision contains a contract version plus separate parent and ticket fingerprints.",
      "- `AC-2`: Fingerprints use the canonical authoritative sections.",
      "- `AC-3`: Retire the old criterion ID.",
    ]);
    assert.notEqual(revisionOf(PARENT_BODY, replaced), BASE);
  });

  test("risk, blocker, seam, constraint, and verification-intent changes each change the revision", () => {
    const riskChanged = bodyWith(TICKET_BODY, "## Risk", ["`ordinary`", "Evidence: downgraded by planning."]);
    const blockerChanged = bodyWith(TICKET_BODY, "## Blocked by", ["- #188", "- #200"]);
    const seamsChanged = bodyWith(TICKET_BODY, "## Affected seams", ["- `review-this`"]);
    const parentConstraintsChanged = bodyWith(PARENT_BODY, "## Structural constraints", [
      "- Keep explicit approval before publication.",
      "- Never reuse retired IDs.",
    ]);
    const verificationChanged = bodyWith(TICKET_BODY, "## Smallest sufficient verification", [
      "- Add an audit of the fingerprint input set.",
    ]);
    assert.notEqual(revisionOf(PARENT_BODY, riskChanged), BASE, "risk change");
    assert.notEqual(revisionOf(PARENT_BODY, blockerChanged), BASE, "blocker change");
    assert.notEqual(revisionOf(PARENT_BODY, seamsChanged), BASE, "affected-seam change");
    assert.notEqual(revisionOf(parentConstraintsChanged, TICKET_BODY), BASE, "parent constraint change");
    assert.notEqual(revisionOf(PARENT_BODY, verificationChanged), BASE, "verification-intent change");
  });

  test("a parent-only body change and a ticket-only body change each invalidate", () => {
    const parentChanged = bodyWith(PARENT_BODY, "## Blocked by", ["- #184", "- #200"]);
    assert.notEqual(revisionOf(parentChanged, TICKET_BODY), BASE);
    const ticketChanged = bodyWith(TICKET_BODY, "## Risk", ["`high-risk`", "Evidence: replaced evidence."]);
    assert.notEqual(revisionOf(PARENT_BODY, ticketChanged), BASE);
  });
});

describe("requirementsMatch and requirementsGate (#190)", () => {
  test("matching revisions continue normally; mismatches stop with needs-info", () => {
    assert.equal(requirementsMatch(BASE, BASE), true);
    assert.deepEqual(requirementsGate(BASE, BASE), {
      action: "continue",
      addLabels: [],
      reason: "the issue bodies still match the dispatched requirements revision",
    });
  });

  test("AC-8/AC-9: a mismatch records needs-info and no worker or reviewer can waive it", () => {
    const changed = revisionOf(PARENT_BODY, bodyWith(TICKET_BODY, "## Risk", ["`ordinary`"]));
    const decision = requirementsGate(BASE, changed);
    assert.equal(decision.action, "stop");
    assert.deepEqual(decision.addLabels, ["needs-info"]);
    assert.match(decision.reason, /reconcile the issue bodies and resume explicitly/);
    assert.equal(requirementsMatch(BASE, changed), false);
    const second = requirementsGate(BASE, changed);
    assert.equal(second.action, "stop", "the stop repeats; there is no waiver path");
  });

  test("explicit resume: after the body is reconciled the fresh dispatch revision continues", () => {
    const reconciled = bodyWith(TICKET_BODY, "## Risk", ["`ordinary`", "Evidence: reconciled by the owner."]);
    const freshDispatch = revisionOf(PARENT_BODY, reconciled);
    const resumed = requirementsGate(freshDispatch, freshDispatch);
    assert.equal(resumed.action, "continue");
  });
});

describe("cross-stage carriers and gates (#190)", () => {
  test("AC-6: the worker dispatch packet carries the same requirements revision", () => {
    const packet = createDispatchPacket({
      ticket: 190,
      riskClass: "high-risk",
      revisions: { base: "base-a", head: "head-a" },
      affectedSeams: ["plan-this", "implement-this", "review-this"],
      acceptanceCriteria: [
        { id: "AC-1", text: "fingerprint shape", status: "active" },
      ],
      settledDecisions: [],
      requirementsRevision: BASE,
    });
    assert.equal(packet.requirementsRevision, BASE);
  });

  test("AC-6: the review wave item carries the same requirements revision", () => {
    const tickets: TicketFact[] = [
      {
        number: 190,
        state: "open",
        labels: ["ready-for-agent", "ready-for-human"],
        assignees: [],
        parent: 183,
        openBlockers: [],
      },
    ];
    const pr: PullRequestLink = {
      ticket: 190,
      prNumber: 190,
      headSha: "head-a",
      baseSha: "base-a",
      state: "open",
      mergeable: true,
      requiredChecksGreen: true,
      closesTicket: 190,
      hasAcceptanceEvidence: true,
      requirementsRevision: BASE,
    };
    const wave = selectReviewWave(tickets, [pr], 183);
    assert.equal(wave.length, 1);
    assert.equal(wave[0].requirementsRevision, BASE);
  });

  test("AC-7 delivery stop: a body change invalidates delivery against the old revision", () => {
    const delivered: DeliveryFact = {
      pullRequestOpen: true,
      closingReferenceValid: true,
      acceptanceEvidencePosted: true,
      requirementsCurrent: true,
    };
    assert.equal(isDelivered(delivered), true);
    assert.equal(isDelivered({ ...delivered, requirementsCurrent: false }), false);
  });

  test("AC-7 review stop: review publication stops when the bodies changed", () => {
    const ready = {
      pullRequestOpen: true,
      closingReferenceValid: true,
      headSha: "head-a",
      baseSha: "base-a",
      implementationEvidencePosted: true,
      requirementsCurrent: true,
    };
    assert.equal(reviewCanStart(ready), true);
    assert.equal(reviewCanStart({ ...ready, requirementsCurrent: false }), false);
  });

  test("AC-7 merge stop: merge blocks when the requirements revision is stale", () => {
    const pr: PullRequestFact = {
      headSha: "head-a",
      baseSha: "base-a",
      mergeable: true,
      requiredChecksGreen: true,
    };
    const review: ReviewFact = {
      reviewedHeadSha: "head-a",
      reviewedBaseSha: "base-a",
      unresolvedConfirmedFindings: 0,
      localReviewClean: true,
      cloudReviewAvailable: true,
      trustedSummaryUpdated: true,
      inlineFindingsVerified: true,
      requirementsCurrent: true,
    };
    assert.equal(isMergeEligible(pr, review).eligible, true);
    const decision = isMergeEligible(pr, { ...review, requirementsCurrent: false });
    assert.equal(decision.eligible, false);
    assert.deepEqual(decision.blockers, [
      "the requirements revision no longer matches the current issue bodies",
    ]);
  });
});