// plan-this:INV-10 — every published ticket gets an upward-only risk class and SLO.
// A high-risk trigger without supporting evidence is an internal incomplete
// result that blocks publication; published tickets carry only `ordinary` or
// `high-risk` (#185, parent spec #183).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  HIGH_RISK_SLO_MINUTES,
  ORDINARY_SLO_MINUTES,
  classifyRisk,
  escalateRisk,
  isPublishableRisk,
  recordTicketRisk,
  sloMinutesForRisk,
} from "../risk.ts";

describe("ticket risk assignment", () => {
  test("no high-risk trigger still produces ordinary", () => {
    const result = classifyRisk({ evidence: [] });
    assert.equal(isPublishableRisk(result), true);
    if (!isPublishableRisk(result)) return;
    assert.equal(result.riskClass, "ordinary");
    assert.equal(result.sloMinutes, ORDINARY_SLO_MINUTES);
    assert.equal(sloMinutesForRisk("ordinary"), 60);
  });

  test("a supported high-risk trigger produces high-risk with its evidence", () => {
    const result = classifyRisk({
      dependencyChange: true,
      sharedContract: true,
      evidence: ["changes a shared public contract"],
    });
    assert.equal(isPublishableRisk(result), true);
    if (!isPublishableRisk(result)) return;
    assert.equal(result.riskClass, "high-risk");
    assert.equal(result.sloMinutes, HIGH_RISK_SLO_MINUTES);
    assert.match(result.evidence.join(" "), /shared contract/);
    assert.match(result.evidence.join(" "), /dependency change/);
  });

  test("no high-risk trigger produces ordinary only because its evidence is missing", () => {
    const result = classifyRisk({ securityBoundary: true });
    assert.equal(isPublishableRisk(result), false);
    if (isPublishableRisk(result)) return;
    assert.deepEqual(result.missingEvidence, ["security boundary"]);
  });

  test("mixed triggers without evidence return an incomplete result naming every missing trigger", () => {
    const result = classifyRisk({ securityBoundary: true, migration: true });
    assert.equal(isPublishableRisk(result), false);
    if (isPublishableRisk(result)) return;
    assert.deepEqual(result.missingEvidence.sort(), ["migration", "security boundary"]);
  });

  test("an incomplete result prevents publication and risk labeling", () => {
    const incomplete = recordTicketRisk(183, { sharedContract: true });
    assert.equal(isPublishableRisk(incomplete.assessment), false);
    if (isPublishableRisk(incomplete.assessment)) return;
    assert.deepEqual(incomplete.assessment.missingEvidence, ["shared contract"]);
    const publishable = recordTicketRisk(183, { evidence: [] });
    assert.equal(isPublishableRisk(publishable.assessment), true);
    if (!isPublishableRisk(publishable.assessment)) return;
    assert.equal(publishable.assessment.riskClass, "ordinary");
  });

  test("execution may raise risk with evidence but cannot lower it", () => {
    const ordinary = classifyRisk({ evidence: [] });
    assert.equal(isPublishableRisk(ordinary), true);
    if (!isPublishableRisk(ordinary)) return;
    const raised = escalateRisk(ordinary, {
      securityBoundary: true,
      evidence: ["a trust boundary is in the diff"],
    });
    const stillHigh = escalateRisk(raised, {});
    const neverDown = escalateRisk(raised, { evidence: ["no trigger, no raise"] });
    assert.equal(raised.riskClass, "high-risk");
    assert.equal(stillHigh.riskClass, "high-risk");
    assert.equal(neverDown.riskClass, "high-risk");
    assert.equal(stillHigh.sloMinutes, HIGH_RISK_SLO_MINUTES);
  });
});
