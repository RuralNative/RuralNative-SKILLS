// workflow-state core (ADR-0031): pure decisions over observed facts.
// Covers user-managed frontier publication, blocker labels, single-ticket
// validation, review freshness, one-round fix budget, merge gates, direct
// promotion, parent closure, verdict reuse, purity, and generated-copy drift.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  LABEL_READY_FOR_AGENT,
  LABEL_BLOCKED,
  LABEL_UNBLOCKED,
  LABEL_NEEDS_INFO,
  MAX_FIX_ROUNDS,
  REQUIREMENTS_ADAPTED_VERSION,
  RequirementsResolutionError,
  selectFrontier,
  labelTransitions,
  validateSingleTicket,
  fixRoundDecision,
  reviewIsFresh,
  isMergeEligible,
  promotionAfterClosure,
  parentClosureReady,
  verdictReusable,
  requirementsRevision,
  requirementsRevisionValue,
  resolveRequirementsBody,
  classifyRequirementsPin,
  decideRepairRevalidation,
  type TicketFact,
  type PullRequestFact,
  type ReviewFact,
} from "../scripts/workflow-state.ts";
import { driftedCopies } from "../scripts/generate-workflow-state.ts";
import {
  incidentParentBody,
  incidentTicketBody,
} from "./incident-fixtures.ts";

const sha256 = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");

const SPEC = 130;

function ticket(overrides: Partial<TicketFact> & { number: number }): TicketFact {
  return {
    state: "open",
    labels: [LABEL_READY_FOR_AGENT],
    assignees: [],
    parent: SPEC,
    openBlockers: [],
    ...overrides,
  };
}

const parent = ticket({ number: SPEC, parent: null });

describe("frontier selection for user-managed parallelism", () => {
  test("selects open unblocked unassigned ready children in order with no cap", () => {
    const tickets = [
      ticket({ number: 1 }),
      ticket({ number: 2, openBlockers: [9] }),
      ticket({ number: 3 }),
      ticket({ number: 4, state: "closed" }),
      ticket({ number: 5, assignees: ["x"] }),
    ];
    assert.deepEqual(selectFrontier(tickets, SPEC), [1, 3]);
  });
});

describe("blocker label state", () => {
  test("blocked tickets gain blocked and lose ready", () => {
    const transitions = labelTransitions([ticket({ number: 1, openBlockers: [9] })], SPEC);
    assert.deepEqual(transitions, [{ number: 1, add: [LABEL_BLOCKED], remove: [LABEL_READY_FOR_AGENT] }]);
  });
  test("unblocked tickets regain ready", () => {
    const transitions = labelTransitions([ticket({ number: 1, labels: [LABEL_BLOCKED] })], SPEC);
    assert.ok(transitions[0].add.includes(LABEL_UNBLOCKED));
    assert.ok(transitions[0].add.includes(LABEL_READY_FOR_AGENT));
  });
});

describe("single-ticket validation", () => {
  test("accepts one open ready unblocked unassigned ticket", () => {
    assert.equal(validateSingleTicket(ticket({ number: 1 }), 1, parent).ok, true);
  });
  test("rejects closed, stopped, blocked, assigned, and unready tickets", () => {
    assert.equal(validateSingleTicket(ticket({ number: 1, state: "closed" }), 1, parent).ok, false);
    assert.equal(validateSingleTicket(ticket({ number: 1, labels: [LABEL_NEEDS_INFO] }), 1, parent).ok, false);
    assert.equal(validateSingleTicket(ticket({ number: 1, openBlockers: [2] }), 1, parent).ok, false);
    assert.equal(validateSingleTicket(ticket({ number: 1, assignees: ["x"] }), 1, parent).ok, false);
    assert.equal(validateSingleTicket(ticket({ number: 1, labels: [] }), 1, parent).ok, false);
    assert.equal(validateSingleTicket(undefined, 99).ok, false);
  });
  test("rejects standalone tickets and unobserved linked parents", () => {
    assert.equal(validateSingleTicket(ticket({ number: 1, parent: null }), 1).ok, false);
    assert.equal(validateSingleTicket(ticket({ number: 1 }), 1).ok, false);
    assert.equal(validateSingleTicket(ticket({ number: 1 }), 1, ticket({ number: 999, parent: null })).ok, false);
  });
});

describe("current-head review freshness", () => {
  test("exact head and base match is fresh", () => {
    assert.equal(reviewIsFresh("h1", "h1", "b1", "b1"), true);
  });
  test("head or base movement is stale", () => {
    assert.equal(reviewIsFresh("h2", "h1", "b1", "b1"), false);
    assert.equal(reviewIsFresh("h1", "h1", "b2", "b1"), false);
  });
  test("absent base revisions or an empty head are stale", () => {
    assert.equal(reviewIsFresh("h1", "h1", undefined, undefined), false);
    assert.equal(reviewIsFresh("h1", "h1", "b1", undefined), false);
    assert.equal(reviewIsFresh("", "", "b1", "b1"), false);
    assert.equal(reviewIsFresh("h1", "h1", "", ""), false);
  });
});

describe("one automatic fix round", () => {
  test("at most one round is allowed", () => {
    assert.equal(MAX_FIX_ROUNDS, 1);
    assert.equal(fixRoundDecision(0).allowed, true);
    assert.equal(fixRoundDecision(1).allowed, false);
  });
});

describe("merge eligibility", () => {
  function eligible(): { pr: PullRequestFact; review: ReviewFact } {
    return {
      pr: { headSha: "h1", baseSha: "b1", mergeable: true, requiredChecksGreen: true },
      review: {
        reviewedHeadSha: "h1",
        reviewedBaseSha: "b1",
        unresolvedConfirmedFindings: 0,
        localReviewClean: true,
        trustedSummaryUpdated: true,
        inlineFindingsVerified: true,
        requirementsCurrent: true,
      },
    };
  }
  test("clean reviewed head with green checks and current requirements merges", () => {
    const { pr, review } = eligible();
    assert.equal(isMergeEligible(pr, { ...review, equivalentCiEstablished: true }).eligible, true);
  });
  test("red checks, unresolved findings, stale revision, and unmergeable PR block", () => {
    const { pr, review } = eligible();
    assert.equal(isMergeEligible({ ...pr, requiredChecksGreen: false }, review).eligible, false);
    assert.equal(isMergeEligible(pr, { ...review, unresolvedConfirmedFindings: 1 }).eligible, false);
    assert.equal(isMergeEligible(pr, { ...review, requirementsCurrent: false }).eligible, false);
    assert.equal(isMergeEligible({ ...pr, mergeable: false }, review).eligible, false);
    assert.equal(isMergeEligible(pr, { ...review, reviewedHeadSha: "old" }).eligible, false);
  });
  test("missing base revisions block", () => {
    const { pr, review } = eligible();
    assert.equal(isMergeEligible({ ...pr, baseSha: undefined }, review).eligible, false);
    assert.equal(isMergeEligible(pr, { ...review, reviewedBaseSha: undefined }).eligible, false);
  });
  test("approved fallback satisfies the gate only with green checks and no equivalent CI", () => {
    const { pr, review } = eligible();
    const red = { ...pr, requiredChecksGreen: false };
    assert.equal(
      isMergeEligible(pr, { ...review, equivalentCiEstablished: false, localFallbackPassed: true }).eligible,
      true,
    );
    assert.equal(
      isMergeEligible(red, { ...review, equivalentCiEstablished: false, localFallbackPassed: true }).eligible,
      false,
    );
    assert.equal(
      isMergeEligible(pr, { ...review, equivalentCiEstablished: true, localFallbackPassed: true }).eligible,
      true,
    );
    assert.equal(
      isMergeEligible(pr, { ...review, equivalentCiEstablished: false, localFallbackPassed: false }).eligible,
      false,
    );
    assert.equal(
      isMergeEligible(pr, { ...review, equivalentCiEstablished: false }).eligible,
      false,
    );
  });
  test("green but non-equivalent CI still requires the local fallback", () => {
    const { pr, review } = eligible();
    assert.equal(
      isMergeEligible(pr, { ...review, equivalentCiEstablished: false, localFallbackPassed: null }).eligible,
      false,
    );
  });
});

describe("direct promotion and parent closure", () => {
  test("promotion touches only dependents whose final blocker closed", () => {
    const tickets = [ticket({ number: 1, labels: [LABEL_BLOCKED] })];
    const promoted = promotionAfterClosure(tickets, SPEC, 9, [{ blocked: 1, blockedBy: 9 }]);
    assert.equal(promoted.length, 1);
    assert.ok(promoted[0].remove.includes(LABEL_BLOCKED));
  });
  test("promotion never touches tickets parented outside the specification", () => {
    const tickets = [
      ticket({ number: 1, labels: [LABEL_BLOCKED] }),
      ticket({ number: 2, labels: [LABEL_BLOCKED], parent: null }),
      ticket({ number: 3, labels: [LABEL_BLOCKED], parent: 999 }),
    ];
    const promoted = promotionAfterClosure(tickets, SPEC, 9, [
      { blocked: 1, blockedBy: 9 },
      { blocked: 2, blockedBy: 9 },
      { blocked: 3, blockedBy: 9 },
    ]);
    assert.deepEqual(promoted.map((t) => t.number), [1]);
  });
  test("promotion never touches siblings not directly blocked by the closed ticket", () => {
    const tickets = [
      ticket({ number: 1, labels: [LABEL_BLOCKED] }),
      ticket({ number: 2, labels: [LABEL_BLOCKED] }),
    ];
    const promoted = promotionAfterClosure(tickets, SPEC, 9, [
      { blocked: 1, blockedBy: 9 },
      { blocked: 2, blockedBy: 8 },
    ]);
    assert.deepEqual(promoted.map((t) => t.number), [1]);
  });
  test("parent closes only when every child is closed", () => {
    assert.equal(parentClosureReady({ children: [ticket({ number: 1, state: "closed" })], enumerationComplete: true }), true);
    assert.equal(parentClosureReady({ children: [ticket({ number: 1 })], enumerationComplete: true }), false);
  });
  test("empty or mixed child sets never close the parent", () => {
    assert.equal(parentClosureReady({ children: [], enumerationComplete: true }), false);
    assert.equal(
      parentClosureReady({ children: [ticket({ number: 1, state: "closed" }), ticket({ number: 2 })], enumerationComplete: true }),
      false,
    );
  });
  test("an incomplete child enumeration never closes the parent", () => {
    assert.equal(
      parentClosureReady({ children: [ticket({ number: 1, state: "closed" })], enumerationComplete: false }),
      false,
    );
  });
});

describe("verdict reuse", () => {
  test("reuse requires unchanged head, base, requirements, and policy", () => {
    const key = { prNumber: 1, headSha: "h", baseSha: "b", requirementsRevision: "r", reviewPolicyRevision: "p" };
    assert.equal(verdictReusable(key, { ...key }), true);
    assert.equal(verdictReusable(key, { ...key, headSha: "h2" }), false);
    assert.equal(verdictReusable(key, { ...key, reviewPolicyRevision: "p2" }), false);
    assert.equal(verdictReusable({ ...key, baseSha: "" }, { ...key, baseSha: "" }), false);
    assert.equal(verdictReusable({ ...key, requirementsRevision: "" }, { ...key, requirementsRevision: "" }), false);
  });
});

describe("requirements resolution failure stops pinning (ADR-0038)", () => {
  test("unresolved ticket bodies throw a typed error naming the role", () => {
    const broken = "## What to build\n\nShip everything without any criteria.\n";
    assert.throws(
      () => requirementsRevision(incidentParentBody(), broken, sha256),
      (error: unknown) => {
        assert.ok(error instanceof RequirementsResolutionError);
        const diagnostics = (error as RequirementsResolutionError).diagnostics;
        assert.ok(diagnostics.some((d) => d.role === "ticket"));
        assert.ok(
          diagnostics.some((d) =>
            d.errors.some((e) => e.includes("acceptance criteria section")),
          ),
        );
        return true;
      },
    );
  });
  test("unresolved parent bodies throw before any hash is produced", () => {
    const brokenParent = [
      "## Project-level acceptance criteria",
      "- `AC-1`: First",
      "- `AC-1`: duplicate id",
      "",
    ].join("\n");
    let returned: unknown = "no value";
    try {
      returned = requirementsRevision(brokenParent, incidentTicketBody(), sha256);
    } catch (error) {
      assert.ok(error instanceof RequirementsResolutionError);
      assert.ok(
        (error as RequirementsResolutionError).diagnostics.some(
          (d) => d.role === "parent" && d.errors.some((e) => e.includes("AC-1")),
        ),
      );
    }
    assert.equal(returned, "no value", "a failed resolution must never emit a pin");
  });
  test("the incident pair now resolves and pins adapted", () => {
    const rev = requirementsRevision(incidentParentBody(), incidentTicketBody(), sha256);
    assert.equal(rev.version, REQUIREMENTS_ADAPTED_VERSION);
    assert.ok(requirementsRevisionValue(rev).startsWith("requirements-adapted-v1:"));
    const parent = resolveRequirementsBody(incidentParentBody(), "parent");
    const ticket = resolveRequirementsBody(incidentTicketBody(), "ticket");
    assert.equal(parent.ok && ticket.ok, true);
    assert.equal(parent.criteria.length, 12);
    assert.equal(ticket.criteria.length, 9);
  });
});

describe("pinned revision classification and repair revalidation (ADR-0038)", () => {
  const V1_PIN = `requirements-v1:parent=${"a".repeat(64)};ticket=${"b".repeat(64)}`;
  const ADAPTED_PIN = `requirements-adapted-v1:parent=${"c".repeat(64)};ticket=${"d".repeat(64)}`;
  const V1_OTHER = `requirements-v1:parent=${"e".repeat(64)};ticket=${"b".repeat(64)}`;
  test("equal pins classify equal; malformed pins are never provenance", () => {
    assert.equal(classifyRequirementsPin(V1_PIN, V1_PIN).classification, "equal");
    assert.equal(classifyRequirementsPin("", V1_PIN).classification, "missing-or-malformed");
    assert.equal(classifyRequirementsPin("requirements-v9:parent=x", V1_PIN).classification, "missing-or-malformed");
  });
  test("a version difference is a legacy-contract mismatch, never a proven edit", () => {
    const result = classifyRequirementsPin(V1_PIN, ADAPTED_PIN);
    assert.equal(result.classification, "legacy-contract");
    assert.ok(result.reason.includes("cause unproven"));
  });
  test("a same-version difference is a revision mismatch with unproven cause, never a proven edit", () => {
    const result = classifyRequirementsPin(V1_PIN, V1_OTHER);
    assert.equal(result.classification, "revision-mismatch");
    assert.ok(result.reason.includes("never proves a body change"));
    const proven = classifyRequirementsPin(V1_PIN, V1_OTHER, { provenBodyChange: true });
    assert.equal(proven.classification, "body-change");
    assert.ok(proven.reason.includes("separate evidence proves"));
  });
  test("only a legacy-contract mismatch with revalidated scope and proof may repin", () => {
    const eligible = { classification: "legacy-contract" as const, currentScopeResolved: true, proofRevalidated: true };
    assert.equal(decideRepairRevalidation(eligible).proceed, true);
    assert.equal(decideRepairRevalidation({ ...eligible, currentScopeResolved: false }).proceed, false);
    assert.equal(decideRepairRevalidation({ ...eligible, proofRevalidated: false }).proceed, false);
    assert.equal(decideRepairRevalidation({ classification: "body-change" as const, currentScopeResolved: true, proofRevalidated: true }).proceed, false);
    assert.equal(decideRepairRevalidation({ classification: "revision-mismatch" as const, currentScopeResolved: true, proofRevalidated: true }).proceed, false);
    assert.equal(decideRepairRevalidation({ classification: "missing-or-malformed" as const, currentScopeResolved: true, proofRevalidated: true }).proceed, false);
  });
  test("an equal pin needs no repin", () => {
    assert.equal(decideRepairRevalidation({ classification: "equal" as const, currentScopeResolved: true, proofRevalidated: true }).proceed, true);
  });
});

describe("generated-copy drift", () => {
  test("skill copies match the authored source", () => {
    assert.deepEqual(driftedCopies(), []);
  });
});
