// Adapted intake of alternate issue templates (ADR-0037).
//
// Pairs published outside the plan-this template resolve through one shared
// consumption resolver: explicit criterion IDs are preserved, unknown and
// inherited requirement text stays inside a conservative whole-body
// fingerprint, and duplicate, ambiguous, or missing requirements stop. The
// nine-criterion fixture below mirrors the reported benchmark shape: bare-ID
// records under a plain "Acceptance criteria" label, inline Risk/Affected
// seams/Smallest verification fields, and trailing metadata that must not
// merge into the final criterion. The synthetic parent body is not the real
// benchmark spec; it covers shared-contract, risk, non-goal, and rollback
// prose without its own criterion list.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  REQUIREMENTS_ADAPTED_VERSION,
  REQUIREMENTS_REVISION_VERSION,
  isSupportedRequirementsVersion,
  resolveRequirementsBody,
  requirementsGate,
  requirementsPinWellFormed,
  requirementsRevision,
  requirementsRevisionValue,
  validateAuthoritativeBody,
  validateEvidenceHandoff,
  validateReviewHandoff,
  isFixEligible,
  effectivePolicyRevision,
} from "../scripts/workflow-state.ts";
import {
  renderCompactEvidence,
  validateCompactEvidence,
  composePullRequestBody,
} from "../skills/implement-this/acceptance-evidence.ts";
import { renderReviewHandoff } from "../scripts/workflow-state.ts";

const sha256 = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");

function criterion(n: number): string {
  return `AC-${n}: Requirement ${n} text covering the benchmark obligation in one record.`;
}

// Bare-ID records, a plain acceptance label, and trailing orientation and
// completion metadata that must stay out of AC-9.
function ticketBody(): string {
  return [
    "Parent",
    "#287",
    "",
    "Blocked by",
    "None (can start immediately).",
    "",
    "Risk: high-risk. Changes repository documentation contracts.",
    "",
    "Affected seams: documentation, human-docs, types, persistence.",
    "",
    "What to build",
    "Establish a mechanically checked evidence model.",
    "",
    "Acceptance criteria",
    "",
    criterion(1),
    criterion(2),
    criterion(3),
    criterion(4),
    criterion(5),
    criterion(6),
    criterion(7),
    criterion(8),
    "AC-9: Final obligation with a mechanical backing source and a stable content contract.",
    "Smallest verification: existing docs and orientation tests plus targeted contract fixtures.",
    "",
    "Orientation evidence",
    "Task band: ordinary. Resolved source count: 17. Cache-gap state: none.",
    "",
    "Completion record",
    "Record the implemented revision, verification commands, and review findings.",
    "",
  ].join("\n");
}

// A synthetic parent: shared contracts, risks, non-goals, rollback controls,
// and no acceptance criteria section of its own.
function parentBody(): string {
  return [
    "Parent specification for the documentation benchmark.",
    "",
    "Shared contracts: page and tutorial requirements, review protocol, and risks apply in full.",
    "",
    "Non-goals: no production runtime and no live provider work.",
    "",
    "Risk: high-risk. Shared tooling and dependencies change for every later package.",
    "",
    "Rollback: revert the coordinated change; never convert adapted pins to v1.",
    "",
  ].join("\n");
}

function checkboxTicketBody(): string {
  return ticketBody()
    .split("\n")
    .map((line) => (/^AC-\d: /.test(line) ? `- [ ] ${line}` : line))
    .join("\n");
}

describe("adapted intake of alternate templates", () => {
  test("nine bare-ID records resolve with complete text and stable IDs", () => {
    const resolved = resolveRequirementsBody(ticketBody(), "ticket");
    assert.equal(resolved.ok, true);
    assert.equal(resolved.format, "adapted");
    assert.deepEqual(
      resolved.criteria.map((c) => c.id),
      ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5", "AC-6", "AC-7", "AC-8", "AC-9"],
    );
    assert.deepEqual(resolved.criteria.map((c) => c.status), Array(9).fill("active"));
    assert.ok(resolved.criteria[8].text.includes("Final obligation"));
    assert.ok(!resolved.criteria[8].text.includes("Smallest verification"));
  });
  test("checkbox records resolve through adaptation with the same criteria", () => {
    const bare = resolveRequirementsBody(ticketBody(), "ticket");
    const boxed = resolveRequirementsBody(checkboxTicketBody(), "ticket");
    assert.equal(boxed.ok, true);
    assert.equal(boxed.format, "adapted");
    assert.deepEqual(
      boxed.criteria.map((c) => c.id),
      bare.criteria.map((c) => c.id),
    );
    assert.deepEqual(
      boxed.criteria.map((c) => c.text),
      bare.criteria.map((c) => c.text),
    );
  });
  test("a parent without criteria resolves and stays in the fingerprint", () => {
    const resolved = resolveRequirementsBody(parentBody(), "parent");
    assert.equal(resolved.ok, true);
    assert.equal(resolved.format, "adapted");
    assert.deepEqual(resolved.criteria, []);
    const edited = parentBody().replace("no live provider work", "some live provider work");
    assert.notEqual(
      requirementsRevisionValue(requirementsRevision(edited, ticketBody(), sha256)),
      requirementsRevisionValue(requirementsRevision(parentBody(), ticketBody(), sha256)),
    );
  });
  test("adapted pairs carry the versioned whole-body revision", () => {
    const rev = requirementsRevision(parentBody(), ticketBody(), sha256);
    assert.equal(rev.version, REQUIREMENTS_ADAPTED_VERSION);
    assert.ok(isSupportedRequirementsVersion(rev.version));
    assert.ok(isSupportedRequirementsVersion(REQUIREMENTS_REVISION_VERSION));
    assert.ok(isSupportedRequirementsVersion("bogus") === false);
    const carrier = requirementsRevisionValue(rev);
    assert.ok(carrier.startsWith(`${REQUIREMENTS_ADAPTED_VERSION}:`));
    assert.ok(requirementsPinWellFormed(carrier));
    assert.ok(!requirementsPinWellFormed(""));
    assert.ok(!requirementsPinWellFormed("requirements-v9:parent=x;ticket=y"));
  });
  test("any adapted requirement edit invalidates the pin", () => {
    const current = requirementsRevisionValue(requirementsRevision(parentBody(), ticketBody(), sha256));
    const proseOnly = ticketBody().replace("can start immediately", "can start today");
    const edited = requirementsRevisionValue(requirementsRevision(parentBody(), proseOnly, sha256));
    assert.notEqual(edited, current);
    const stopped = requirementsGate(current, edited);
    assert.equal(stopped.action, "stop");
    assert.ok(stopped.addLabels.includes("needs-info"));
  });
  test("missing IDs, duplicates, and ambiguity stop instead of adapting", () => {
    const missing = resolveRequirementsBody("Acceptance criteria\n\nShip everything.\n", "ticket");
    assert.equal(missing.ok, false);
    const dup = resolveRequirementsBody(
      "Acceptance criteria\n\nAC-1: First.\nAC-1: Second.\n",
      "ticket",
    );
    assert.equal(dup.ok, false);
    assert.ok(dup.errors.some((e) => e.includes("AC-1")));
    const ambiguous = resolveRequirementsBody(
      "Acceptance criteria\n\nAC-1: First.\nStatus update: unclear whether this continues.\n",
      "ticket",
    );
    assert.equal(ambiguous.ok, false);
    const numbered = resolveRequirementsBody(
      "Acceptance criteria\n\n1. AC-1: First.\n",
      "ticket",
    );
    assert.equal(numbered.ok, false);
    const homes = resolveRequirementsBody(
      "## Solution\n- one\n## Settled decisions\n- another\n",
      "ticket",
    );
    assert.equal(homes.ok, false);
    assert.ok(homes.errors.some((e) => e.includes("ambiguous sections")));
  });
  test("fenced examples never create criteria and fenced markers are retained", () => {
    const body = [
      "Acceptance criteria",
      "",
      "AC-1: Real requirement.",
      "",
      "```",
      "AC-2: Fenced example, not a requirement.",
      "<!-- ruralnative:compact-evidence:start -->",
      "AC-3: Fenced marker, not a requirement.",
      "<!-- ruralnative:compact-evidence:end -->",
      "```",
      "",
    ].join("\n");
    const resolved = resolveRequirementsBody(body, "ticket");
    assert.equal(resolved.ok, true);
    assert.deepEqual(resolved.criteria.map((c) => c.id), ["AC-1"]);
    const carrier = requirementsRevisionValue(requirementsRevision(parentBody(), body, sha256));
    const withoutFence = body.replace("AC-2: Fenced example, not a requirement.", "AC-2: Changed example.");
    assert.notEqual(
      requirementsRevisionValue(requirementsRevision(parentBody(), withoutFence, sha256)),
      carrier,
    );
  });
  test("unbalanced workflow markers stop before pinning", () => {
    const body = [
      "Acceptance criteria",
      "",
      "AC-1: Real requirement.",
      "",
      "<!-- ruralnative:compact-evidence:start -->",
      "partial block, never closed",
      "",
    ].join("\n");
    assert.equal(resolveRequirementsBody(body, "ticket").ok, false);
  });
  test("validated evidence blocks are excluded without churn", () => {
    const block = [
      "<!-- ruralnative:compact-evidence:start -->",
      "## Implementation evidence",
      "<!-- ruralnative:compact-evidence:end -->",
    ].join("\n");
    // Exact line removal: surrounding blank-line structure stays fingerprinted
    // (conservative), so the block attaches without extra separation whitespace.
    // Only line endings and trailing horizontal whitespace normalize.
    const withBlock = `${ticketBody()}${block}\n`;
    assert.equal(
      requirementsRevisionValue(requirementsRevision(parentBody(), withBlock, sha256)),
      requirementsRevisionValue(requirementsRevision(parentBody(), ticketBody(), sha256)),
    );
    const changedBlock = block.replace("Implementation evidence", "Changed evidence");
    const withChangedBlock = `${ticketBody()}${changedBlock}\n`;
    assert.equal(
      requirementsRevisionValue(requirementsRevision(parentBody(), withChangedBlock, sha256)),
      requirementsRevisionValue(requirementsRevision(parentBody(), withBlock, sha256)),
    );
  });
  test("blank-line structure stays fingerprinted while CRLF and trailing whitespace normalize", () => {
    const base = requirementsRevisionValue(requirementsRevision(parentBody(), ticketBody(), sha256));
    const withExtraBlank = ticketBody().replace("What to build\n", "What to build\n\n");
    assert.notEqual(
      requirementsRevisionValue(requirementsRevision(parentBody(), withExtraBlank, sha256)),
      base,
    );
    const crlf = ticketBody().replace(/\n/g, "\r\n");
    assert.equal(
      requirementsRevisionValue(requirementsRevision(parentBody(), crlf, sha256)),
      base,
    );
    const trailing = ticketBody()
      .split("\n")
      .map((line) => (line.trim() === "" ? line : `${line}   `))
      .join("\n");
    assert.equal(
      requirementsRevisionValue(requirementsRevision(parentBody(), trailing, sha256)),
      base,
    );
  });
});

describe("adapted pairs flow through delivery, review, and fix", () => {
  const policy = effectivePolicyRevision([{ path: "REVIEW.md", hash: "h1" }]);
  const observation = {
    reviewId: "555",
    reviewAuthor: "reviewer",
    reviewerPermission: "write" as const,
    reviewedCommit: "abc123",
    reviewedAt: "2026-09-09T00:00:00Z",
    sourceUrl: "https://github.com/o/r/pull/300#discussion-555",
    commentIds: [] as readonly string[],
  };
  test("one adapted pair validates evidence, review handoff, and fix eligibility", () => {
    const pin = requirementsRevisionValue(requirementsRevision(parentBody(), ticketBody(), sha256));
    const resolved = resolveRequirementsBody(ticketBody(), "ticket");
    assert.equal(resolved.ok, true);
    const evidenceInput = {
      criteria: resolved.criteria,
      evidence: resolved.criteria.map((c) => ({
        criterionId: c.id,
        kind: "non-behavior" as const,
        rationale: `narrow check run for ${c.id}, recorded without executable behavior change`,
      })),
      isBugFix: false,
      requirementsRevision: pin,
      headSha: "abc123",
    };
    assert.equal(validateCompactEvidence(evidenceInput).ok, true);
    const prBody = composePullRequestBody("Context\n", 288, renderCompactEvidence(evidenceInput));
    assert.equal(
      validateEvidenceHandoff({ body: prBody, currentRequirementsRevision: pin, currentHeadSha: "abc123" }).status,
      "current",
    );
    const reviewBody = renderReviewHandoff({
      repository: "o/r",
      prNumber: 300,
      reviewedHeadSha: "abc123",
      reviewedBaseSha: "base1",
      closesTicket: 288,
      requirementsRevision: pin,
      reviewPolicyRevision: policy,
      verificationCommand: "node --test tests/alternate-template-intake.test.ts",
      verificationResult: "adapted intake checks observed",
      verificationPassed: true,
      findings: [],
      provenance: { ...observation, reviewerPermission: "write" },
    });
    const handoff = validateReviewHandoff({
      body: reviewBody,
      repository: "o/r",
      prNumber: 300,
      currentHeadSha: "abc123",
      currentBaseSha: "base1",
      currentRequirementsRevision: pin,
      currentReviewPolicyRevision: policy,
      observedProvenance: observation,
      reviewCompleted: true,
      reviewDismissed: false,
    });
    assert.equal(handoff.status, "current");
    assert.equal(
      isFixEligible({
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
      }).eligible,
      true,
    );
  });
  test("an edited adapted body stops downstream stages alike", () => {
    const original = ticketBody();
    const pin = requirementsRevisionValue(requirementsRevision(parentBody(), original, sha256));
    const changed = original.replace(
      "AC-9: Final obligation",
      "AC-9: Changed final obligation",
    );
    assert.notEqual(changed, original);
    const edited = changed;
    const current = requirementsRevisionValue(requirementsRevision(parentBody(), edited, sha256));
    assert.notEqual(current, pin);
    assert.equal(requirementsGate(pin, current).action, "stop");
    assert.equal(requirementsGate("", "").action, "stop");
    assert.equal(requirementsGate(pin, "").action, "stop");
    const stale = validateEvidenceHandoff({
      body: composePullRequestBody(
        "Context\n",
        288,
        renderCompactEvidence({
          criteria: resolveRequirementsBody(ticketBody(), "ticket").criteria,
          evidence: resolveRequirementsBody(ticketBody(), "ticket").criteria.map((c) => ({
            criterionId: c.id,
            kind: "non-behavior" as const,
            rationale: `narrow check run for ${c.id}`,
          })),
          isBugFix: false,
          requirementsRevision: pin,
          headSha: "abc123",
        }),
      ),
      currentRequirementsRevision: current,
      currentHeadSha: "abc123",
    });
    assert.equal(stale.status, "stale");
  });
});

describe("canonical publication accepts the standardized format", () => {
  test("checkbox publication validates and resolves canonical", () => {
    const parent = [
      "## Affected seams",
      "- implement-this",
      "## Acceptance criteria",
      "- [ ] AC-1: Parent behavior",
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
    const ticket = [
      "## Affected seams",
      "- implement-this",
      "## Acceptance criteria",
      "- [ ] AC-1: Ship one behavior",
      "- [ ] AC-2: Docs note",
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
    assert.deepEqual(validateAuthoritativeBody(parent, "parent"), []);
    assert.deepEqual(validateAuthoritativeBody(ticket, "ticket"), []);
    assert.equal(resolveRequirementsBody(parent, "parent").format, "canonical");
    assert.equal(resolveRequirementsBody(ticket, "ticket").format, "canonical");
    const rev = requirementsRevision(parent, ticket, sha256);
    assert.equal(rev.version, REQUIREMENTS_REVISION_VERSION);
    assert.ok(requirementsPinWellFormed(requirementsRevisionValue(rev)));
    const resolved = resolveRequirementsBody(ticket, "ticket");
    assert.deepEqual(
      resolved.criteria.map((c) => c.id),
      ["AC-1", "AC-2"],
    );
  });
  test("canonical rejections survive for unsupported lines and duplicates", () => {
    const numbered = [
      "## Affected seams",
      "- x",
      "## Acceptance criteria",
      "1. AC-1: First.",
      "## Structural constraints",
      "- None",
      "## Blocked by",
      "- None",
      "## Settled decisions",
      "- None",
      "## Risk",
      "- ordinary",
      "## Smallest sufficient verification",
      "- node --test a",
      "",
    ].join("\n");
    assert.ok(
      validateAuthoritativeBody(numbered, "ticket").some((e) => e.includes("unsupported criterion line")),
    );
    const dup = [
      "## Affected seams",
      "- x",
      "## Acceptance criteria",
      "- [ ] AC-1: First.",
      "- [ ] AC-1: Second.",
      "## Structural constraints",
      "- None",
      "## Blocked by",
      "- None",
      "## Settled decisions",
      "- None",
      "## Risk",
      "- ordinary",
      "## Smallest sufficient verification",
      "- node --test a",
      "",
    ].join("\n");
    assert.ok(
      validateAuthoritativeBody(dup, "ticket").some((e) => e.includes("duplicate or reused")),
    );
  });
});
