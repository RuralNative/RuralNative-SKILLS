// review-this:INV-15 — review resolves orientation sources once for each
// pinned head-and-base pair and shares the compact evidence across Standards
// and Spec, recording the summary without publishing full path lists on
// routine work (#179, ADR-0024, ADR-0032). Length alone never stops the run.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveReviewOrientation,
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

const SOURCES = ["ARCHITECTURE.md", "docs/leaves/review-this.md", "docs/adr/0024-bounded-orientation.md"];

describe("review orientation resolution (review-this:INV-15)", () => {
  test("one pinned pair resolves one orientation set shared across both axes", () => {
    const resolution = resolveReviewOrientation({
      pair: { headSha: "head-a", baseSha: "base-a" },
      resolved: resolved(),
      sources: SOURCES,
    });
    assert.equal(resolution.evidence.sourceCount, 4);
    assert.equal(resolution.omitSourceList, true);
    assert.equal(resolution.stop, false);
    assert.deepEqual(resolution.sources, []);
  });

  test("the same pair always resolves the same compact evidence (deterministic)", () => {
    const first = resolveReviewOrientation({
      pair: { headSha: "head-a", baseSha: "base-a" },
      resolved: resolved({ band: "api-route", bytes: 8000, sourceCount: 5 }),
      sources: SOURCES,
    });
    const second = resolveReviewOrientation({
      pair: { headSha: "head-a", baseSha: "base-a" },
      resolved: resolved({ band: "api-route", bytes: 8000, sourceCount: 5 }),
      sources: SOURCES,
    });
    assert.deepEqual(second, first);
  });

  test("a large required set still proceeds with its sources recorded", () => {
    const resolution = resolveReviewOrientation({
      pair: { headSha: "head-a", baseSha: "base-a" },
      resolved: resolved({ bytes: 25000, sourceCount: 5 }),
      sources: SOURCES,
    });
    assert.equal(resolution.stop, false);
    assert.equal(resolution.omitSourceList, true);
    assert.match(resolution.reason, /required sources/);
  });

  test("a cache-gap substitution publishes the source list", () => {
    const resolution = resolveReviewOrientation({
      pair: { headSha: "head-a", baseSha: "base-a" },
      resolved: resolved({ bytes: 25000, sourceCount: 4, cacheGap: true }),
      sources: SOURCES,
    });
    assert.equal(resolution.omitSourceList, false);
    assert.equal(resolution.stop, false);
    assert.deepEqual(resolution.sources, SOURCES);
  });

  test("head and base pin the pair; a different base is a distinct resolution", () => {
    const a = resolveReviewOrientation({
      pair: { headSha: "head-a", baseSha: "base-a" },
      resolved: resolved(),
      sources: SOURCES,
    });
    const b = resolveReviewOrientation({
      pair: { headSha: "head-a", baseSha: "base-b" },
      resolved: resolved(),
      sources: SOURCES,
    });
    assert.deepEqual(a.pair, { headSha: "head-a", baseSha: "base-a" });
    assert.deepEqual(b.pair, { headSha: "head-a", baseSha: "base-b" });
    assert.notDeepEqual(b, a);
  });
});
