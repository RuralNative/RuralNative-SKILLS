// implement-this:INV-14 — the worker resolves current orientation sources in
// its checkout before broad documentation loading, records compact durable
// evidence, and follows one bounded resolution attempt for a direct ticket
// without valid seam metadata (#179, ADR-0024).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  compactOrientationEvidence,
  preflightWorkerOrientation,
  renderCompactOrientationEvidence,
  resolveDirectTicketSeam,
  type ResolvedOrientationFact,
} from "../orientation.ts";

function resolved(overrides: Partial<ResolvedOrientationFact> = {}): ResolvedOrientationFact {
  return {
    band: "ordinary",
    bytes: 5000,
    sourceCount: 4,
    cacheGap: false,
    ...overrides,
  };
}

describe("worker orientation preflight (implement-this:INV-14)", () => {
  test("a fit set proceeds to the focused doc-cache route", () => {
    const preflight = preflightWorkerOrientation({
      affectedSeams: ["implement-this"],
      resolved: resolved(),
    });
    assert.equal(preflight.withinBudget, true);
    assert.equal(preflight.evidence.cap, 6000);
    assert.match(preflight.reason, /fits the selected task-band cap/);
  });

  test("an over-budget set stops before broad loading", () => {
    const preflight = preflightWorkerOrientation({
      affectedSeams: ["implement-this", "review-this"],
      resolved: resolved({ bytes: 9000, sourceCount: 8 }),
    });
    assert.equal(preflight.withinBudget, false);
    assert.match(preflight.reason, /stop before broad loading/);
  });

  test("the cap is the band cap, never waived by cache-gap approval", () => {
    const preflight = preflightWorkerOrientation({
      affectedSeams: ["implement-this"],
      resolved: resolved({ bytes: 6500, cacheGap: true }),
    });
    assert.equal(preflight.withinBudget, false);
    assert.equal(preflight.evidence.cap, 6000);
  });
});

describe("compact worker evidence (implement-this:INV-14)", () => {
  test("records band, bytes, cap, source count, and cache-gap state without source lists", () => {
    const evidence = compactOrientationEvidence(resolved());
    const rendered = renderCompactOrientationEvidence(evidence);
    assert.ok(rendered.includes("task band: ordinary"));
    assert.ok(rendered.includes("resolved bytes: 5000"));
    assert.ok(rendered.includes("cap: 6000"));
    assert.ok(rendered.includes("source count: 4"));
    assert.ok(rendered.includes("cache-gap state: none"));
    assert.equal(rendered.includes("source: "), false);
  });
});

describe("direct-ticket seam resolution (implement-this:INV-14)", () => {
  test("a valid requested seam name follows the same bounded path as a planned ticket", () => {
    const result = resolveDirectTicketSeam({
      requestedSeam: "plan-this",
      candidates: [{ seam: "plan-this", codeRoot: "skills/plan-this" }],
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.seam, "plan-this");
  });

  test("a requested seam missing from the compact index adds needs-info and stops before edits", () => {
    const result = resolveDirectTicketSeam({
      requestedSeam: "nope",
      candidates: [{ seam: "plan-this", codeRoot: "skills/plan-this" }],
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /add needs-info and stop before edits/);
  });

  test("one unambiguous code-root mapping proceeds for missing seam metadata", () => {
    const result = resolveDirectTicketSeam({
      requestedSeam: null,
      candidates: [
        { seam: "plan-this", codeRoot: "skills/plan-this" },
        { seam: "plan-this", codeRoot: "skills/plan-this" },
      ],
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.seam, "plan-this");
  });

  test("ambiguous code-root mappings add needs-info and stop before edits", () => {
    const result = resolveDirectTicketSeam({
      requestedSeam: null,
      candidates: [
        { seam: "plan-this", codeRoot: "skills/plan-this" },
        { seam: "implement-this", codeRoot: "skills/implement-this" },
      ],
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /ambiguous seam resolution/);
  });

  test("no seam metadata and no code-root mapping adds needs-info and stops before edits", () => {
    const result = resolveDirectTicketSeam({
      requestedSeam: null,
      candidates: [],
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /add needs-info and stop before edits/);
  });
});
