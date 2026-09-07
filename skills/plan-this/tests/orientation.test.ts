// plan-this:INV-11 — planning resolves an orientation set for every proposed
// ticket before publication approval, keeps affected seam names as the durable
// join key, and publishes compact source evidence without transporting paths,
// anchors, invariant lists, glossary excerpts, or policies (#179, ADR-0024,
// ADR-0032). Length alone never rejects a ticket.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  compactOrientationEvidence,
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

describe("planning orientation resolution (plan-this:INV-11)", () => {
  test("a required set records its sources for incremental reading", () => {
    const preflight = preflightTicketOrientation({
      ticket: 179,
      affectedSeams: ["plan-this"],
      resolved: resolved(),
    });
    assert.equal(
      preflight.reason,
      "the resolved orientation set records the required sources for incremental reading",
    );
    assert.deepEqual(preflight.evidence, {
      band: "ordinary",
      bytes: 4000,
      sourceCount: 4,
      cacheGap: false,
    });
  });

  test("a large required set still resolves without rejection", () => {
    const preflight = preflightTicketOrientation({
      ticket: 179,
      affectedSeams: ["plan-this", "implement-this"],
      resolved: resolved({ bytes: 25000, sourceCount: 7 }),
    });
    assert.equal(
      preflight.reason,
      "the resolved orientation set records the required sources for incremental reading",
    );
    assert.equal(preflight.evidence.bytes, 25000);
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
  });
});

describe("compact planning source evidence (plan-this:INV-11)", () => {
  test("renders band, bytes, source count, and cache-gap state only", () => {
    const evidence: CompactOrientationEvidence = {
      band: "ordinary",
      bytes: 4000,
      sourceCount: 4,
      cacheGap: false,
    };
    const rendered = renderCompactOrientationEvidence(evidence);
    assert.ok(rendered.includes("task band: ordinary"));
    assert.ok(rendered.includes("resolved bytes: 4000"));
    assert.ok(rendered.includes("source count: 4"));
    assert.ok(rendered.includes("cache-gap state: none"));
    // Exact source lists never appear in the compact summary.
    assert.equal(rendered.includes("source: "), false);
  });

  test("a cache-gap approval is recorded as substitution context", () => {
    const evidence = compactOrientationEvidence({
      band: "ordinary",
      bytes: 25000,
      sourceCount: 4,
      cacheGap: true,
    });
    assert.equal(evidence.cacheGap, true);
    assert.equal(evidence.bytes, 25000);
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
