// review-this:INV-15 — review resolves orientation sources once for each
// pinned head-and-base pair and shares the compact evidence across Standards
// and Spec, recording the summary without publishing full path lists on
// successful routine work and stopping before broad loading on an over-budget
// set with its exact sources (#179, ADR-0024).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  orientationCap,
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
    assert.equal(resolution.evidence.cap, 6000);
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

  test("an over-budget pair stops before broad loading with its exact sources", () => {
    const resolution = resolveReviewOrientation({
      pair: { headSha: "head-a", baseSha: "base-a" },
      resolved: resolved({ bytes: 6100, sourceCount: 5 }),
      sources: SOURCES,
    });
    assert.equal(resolution.stop, true);
    assert.equal(resolution.omitSourceList, false);
    assert.deepEqual(resolution.sources, SOURCES);
    assert.match(resolution.reason, /stop before broad loading/);
    assert.match(resolution.reason, /6100 > 6000/);
  });

  test("a cache-gap substitution publishes the source list, never the cap waiver", () => {
    const resolution = resolveReviewOrientation({
      pair: { headSha: "head-a", baseSha: "base-a" },
      resolved: resolved({ bytes: 6000, sourceCount: 4, cacheGap: true }),
      sources: SOURCES,
    });
    assert.equal(resolution.omitSourceList, false);
    assert.equal(resolution.stop, false);
    assert.deepEqual(resolution.sources, SOURCES);
    assert.equal(resolution.evidence.cap, 6000);
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
    assert.equal(orientationCap("re-orientation"), 7000);
  });
});
