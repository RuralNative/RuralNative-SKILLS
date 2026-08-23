// plan-this:INV-10 — every published ticket gets an upward-only risk class and SLO.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  HIGH_RISK_SLO_MINUTES,
  ORDINARY_SLO_MINUTES,
  classifyRisk,
  escalateRisk,
  recordTicketRisk,
  sloMinutesForRisk,
} from "../risk.ts";

describe("ticket risk assignment", () => {
  test("ordinary tickets target sixty minutes", () => {
    const result = classifyRisk({ evidence: [] });
    assert.equal(result.riskClass, "ordinary");
    assert.equal(result.sloMinutes, ORDINARY_SLO_MINUTES);
    assert.equal(sloMinutesForRisk("ordinary"), 60);
  });

  test("evidenced high-risk triggers target ninety minutes", () => {
    const result = classifyRisk({
      dependencyChange: true,
      sharedContract: true,
      evidence: ["changes a shared public contract"],
    });
    assert.equal(result.riskClass, "high-risk");
    assert.equal(result.sloMinutes, HIGH_RISK_SLO_MINUTES);
    assert.match(result.evidence.join(" "), /shared contract/);
  });

  test("a trigger without evidence does not inflate the class", () => {
    assert.equal(classifyRisk({ securityBoundary: true }).riskClass, "ordinary");
  });

  test("execution may raise risk but cannot lower it", () => {
    const ordinary = classifyRisk({ evidence: [] });
    const raised = escalateRisk(ordinary, ["new trust boundary is in the diff"]);
    const stillHigh = escalateRisk(raised, []);
    assert.equal(raised.riskClass, "high-risk");
    assert.equal(stillHigh.riskClass, "high-risk");
    assert.equal(stillHigh.sloMinutes, HIGH_RISK_SLO_MINUTES);
  });

  test("risk records carry the ticket number before publication", () => {
    const record = recordTicketRisk(157, { migration: true, evidence: ["schema move"] });
    assert.equal(record.ticket, 157);
    assert.equal(record.assessment.riskClass, "high-risk");
  });
});
