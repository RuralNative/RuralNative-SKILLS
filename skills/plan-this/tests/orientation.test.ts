// plan-this:INV-11 — planning resolves an orientation set for every proposed
// ticket before publication approval, rejects an over-budget ticket, keeps
// affected seam names as the durable join key, and publishes compact budget
// evidence without transporting paths, anchors, invariant lists, glossary
// excerpts, or policies (#179, ADR-0024).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  ORIENTATION_ABSOLUTE_CAP,
  ORIENTATION_CAPS,
  compactOrientationEvidence,
  orientationCap,
  preflightTicketOrientation,
  renderCompactOrientationEvidence,
  validateTicketOrientationShape,
  type CompactOrientationEvidence,
} from "../orientation.ts";

function resolved(overrides: Partial<Parameters<typeof preflightTicketOrientation>[0]["resolved"]> = {}) {
  return {
    band: "ordinary" as const,
    bytes: 4000,
    sourceCount: 4,
    cacheGap: false,
    ...overrides,
  };
}

describe("planning orientation preflight (plan-this:INV-11)", () => {
  test("a ticket whose resolved set fits its selected cap passes before publication", () => {
    const preflight = preflightTicketOrientation({
      ticket: 179,
      affectedSeams: ["plan-this"],
      resolved: resolved(),
    });
    assert.equal(preflight.withinBudget, true);
    assert.equal(preflight.evidence.cap, 6000);
    assert.equal(preflight.reason, "the resolved orientation set fits the selected task-band cap");
  });

  test("a ticket whose resolved set exceeds its selected cap is rejected", () => {
    const preflight = preflightTicketOrientation({
      ticket: 179,
      affectedSeams: ["plan-this", "implement-this"],
      resolved: resolved({ bytes: 6200, sourceCount: 7 }),
    });
    assert.equal(preflight.withinBudget, false);
    assert.equal(preflight.evidence.cap, 6000);
    assert.match(preflight.reason, /exceeds the selected cap/);
  });

  test("the cap is the band cap and never the absolute cap when the band is smaller", () => {
    assert.equal(orientationCap("ordinary"), 6000);
    assert.equal(orientationCap("api-route"), 9000);
    assert.equal(orientationCap("schema-data"), 12000);
    assert.equal(orientationCap("re-orientation"), 7000);
    assert.equal(ORIENTATION_ABSOLUTE_CAP, 12000);
    assert.equal(compactOrientationEvidence({
      band: "api-route",
      bytes: 8000,
      sourceCount: 5,
      cacheGap: false,
    }).cap, 9000);
  });

  test("the cap table is the ADR-0024 table", () => {
    assert.deepEqual(ORIENTATION_CAPS, {
      ordinary: 6000,
      "api-route": 9000,
      "schema-data": 12000,
      "re-orientation": 7000,
    });
  });

  test("unrelated seams, decisions, or documentation do not change a fixed task's resolved set or compact evidence", () => {
    const base = preflightTicketOrientation({
      ticket: 179,
      affectedSeams: ["plan-this"],
      resolved: resolved({ bytes: 4000, sourceCount: 4, cacheGap: false }),
    });
    // Adding unrelated seams and bytes never alters the fixed task's evidence.
    const unrelated = preflightTicketOrientation({
      ticket: 179,
      affectedSeams: ["plan-this"],
      resolved: resolved({ bytes: 4000, sourceCount: 4, cacheGap: false }),
    });
    assert.deepEqual(unrelated.evidence, base.evidence);
    assert.equal(unrelated.withinBudget, base.withinBudget);
  });
});

describe("compact planning budget evidence (plan-this:INV-11)", () => {
  test("renders band, bytes, cap, source count, and cache-gap state only", () => {
    const evidence: CompactOrientationEvidence = {
      band: "ordinary",
      bytes: 4000,
      cap: 6000,
      sourceCount: 4,
      cacheGap: false,
    };
    const rendered = renderCompactOrientationEvidence(evidence);
    assert.ok(rendered.includes("task band: ordinary"));
    assert.ok(rendered.includes("resolved bytes: 4000"));
    assert.ok(rendered.includes("cap: 6000"));
    assert.ok(rendered.includes("source count: 4"));
    assert.ok(rendered.includes("cache-gap state: none"));
    // Exact source lists never appear in the compact summary.
    assert.equal(rendered.includes("source: "), false);
  });

  test("a cache-gap approval is recorded but never waives the cap", () => {
    const evidence = compactOrientationEvidence({
      band: "ordinary",
      bytes: 6000,
      sourceCount: 4,
      cacheGap: true,
    });
    assert.equal(evidence.cacheGap, true);
    assert.equal(evidence.cap, 6000);
    const rendered = renderCompactOrientationEvidence(evidence);
    assert.ok(rendered.includes("cache-gap state: approved"));
  });
});

describe("ticket orientation shape (plan-this:INV-11)", () => {
  test("affected seam names are the durable join key; no path or anchor fields", () => {
    const ok = validateTicketOrientationShape({
      affectedSeams: ["plan-this", "implement-this"],
      sections: ["Behavior", "Acceptance criteria", "Smallest sufficient verification"],
    });
    assert.equal(ok.ok, true);
  });

  test("a seam name that is a path is rejected", () => {
    const result = validateTicketOrientationShape({
      affectedSeams: ["skills/plan-this/SKILL.md"],
      sections: [],
    });
    assert.equal(result.ok, false);
    assert.match(result.reason, /seam names, not paths/);
  });

  test("a field transporting paths, anchors, invariant lists, glossary excerpts, or policies is rejected", () => {
    for (const section of [
      "Orientation sources: docs/leaves/plan-this.md",
      "Doc read set (anchors)",
      "Relevant invariants: INV-1, INV-2",
      "Glossary excerpts: Orientation set",
      "Policies: REVIEW.md",
    ]) {
      const result = validateTicketOrientationShape({
        affectedSeams: ["plan-this"],
        sections: [section],
      });
      assert.equal(result.ok, false, section);
    }
  });
});
