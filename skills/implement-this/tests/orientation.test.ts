// implement-this:INV-14 — the worker resolves current orientation sources in
// its checkout before broad documentation loading, records compact durable
// evidence, and follows one bounded resolution attempt for a direct ticket
// without valid seam metadata (#179, ADR-0024, ADR-0032). Length alone never
// stops the run.
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

describe("worker orientation resolution (implement-this:INV-14)", () => {
  test("a required set proceeds to the focused doc-cache route", () => {
    const preflight = preflightWorkerOrientation({
      affectedSeams: ["implement-this"],
      resolved: resolved(),
    });
    assert.equal(
      preflight.reason,
      "the resolved orientation set records the required sources for incremental reading",
    );
    assert.deepEqual(preflight.evidence, {
      band: "ordinary",
      bytes: 5000,
      sourceCount: 4,
      cacheGap: false,
    });
  });

  test("a large required set still proceeds without a size veto", () => {
    const preflight = preflightWorkerOrientation({
      affectedSeams: ["implement-this", "review-this"],
      resolved: resolved({ bytes: 25000, sourceCount: 8 }),
    });
    assert.equal(preflight.evidence.bytes, 25000);
    assert.match(preflight.reason, /incremental reading/);
  });

  test("cache-gap approval records substitution context without a cap", () => {
    const preflight = preflightWorkerOrientation({
      affectedSeams: ["implement-this"],
      resolved: resolved({ bytes: 25000, cacheGap: true }),
    });
    assert.equal(preflight.evidence.cacheGap, true);
    assert.equal(preflight.evidence.bytes, 25000);
  });
});

describe("compact worker evidence (implement-this:INV-14)", () => {
  test("records band, bytes, source count, and cache-gap state without source lists", () => {
    const evidence = compactOrientationEvidence(resolved());
    const rendered = renderCompactOrientationEvidence(evidence);
    assert.ok(rendered.includes("task band: ordinary"));
    assert.ok(rendered.includes("resolved bytes: 5000"));
    assert.ok(rendered.includes("source count: 4"));
    assert.ok(rendered.includes("cache-gap state: none"));
    assert.equal(rendered.includes("source: "), false);
  });
});

describe("direct-ticket seam resolution (implement-this:INV-14)", () => {
  test("a valid requested seam name follows the same relevant-source path as a planned ticket", () => {
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
