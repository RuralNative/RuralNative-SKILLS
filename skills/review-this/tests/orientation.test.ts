// review-this:INV-15 — review resolves orientation sources once for each
// pinned head-and-base pair and shares the compact evidence across Standards
// and Spec, recording the summary without publishing full path lists on
// successful routine work (#179, ADR-0024).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  orientationCap,
  resolveReviewOrientation,
} from "../orientation.ts";

describe("review orientation resolution (review-this:INV-15)", () => {
  test("one pinned pair resolves one orientation set shared across both axes", () => {
    const resolution = resolveReviewOrientation({
      pair: { headSha: "head-a", baseSha: "base-a" },
      resolved: {
        band: "ordinary",
        bytes: 5000,
        sourceCount: 4,
        cacheGap: false,
      },
    });
    assert.equal(resolution.evidence.cap, 6000);
    assert.equal(resolution.evidence.sourceCount, 4);
    assert.equal(resolution.omitSourceList, true);
  });

  test("the same pair always resolves the same compact evidence (deterministic)", () => {
    const first = resolveReviewOrientation({
      pair: { headSha: "head-a", baseSha: "base-a" },
      resolved: {
        band: "api-route",
        bytes: 8000,
        sourceCount: 5,
        cacheGap: false,
      },
    });
    const second = resolveReviewOrientation({
      pair: { headSha: "head-a", baseSha: "base-a" },
      resolved: {
        band: "api-route",
        bytes: 8000,
        sourceCount: 5,
        cacheGap: false,
      },
    });
    assert.deepEqual(second, first);
  });

  test("an over-budget pair keeps the full source list for diagnosis", () => {
    const resolution = resolveReviewOrientation({
      pair: { headSha: "head-a", baseSha: "base-a" },
      resolved: {
        band: "ordinary",
        bytes: 6100,
        sourceCount: 5,
        cacheGap: false,
      },
    });
    assert.equal(resolution.omitSourceList, false);
  });

  test("a cache-gap substitution publishes the source list, never the cap waiver", () => {
    const resolution = resolveReviewOrientation({
      pair: { headSha: "head-a", baseSha: "base-a" },
      resolved: {
        band: "ordinary",
        bytes: 6000,
        sourceCount: 4,
        cacheGap: true,
      },
    });
    assert.equal(resolution.omitSourceList, false);
    assert.equal(resolution.evidence.cap, 6000);
  });

  test("head and base pin the pair; a different base is a different pair", () => {
    const a = resolveReviewOrientation({
      pair: { headSha: "head-a", baseSha: "base-a" },
      resolved: { band: "ordinary", bytes: 5000, sourceCount: 4, cacheGap: false },
    });
    const b = resolveReviewOrientation({
      pair: { headSha: "head-a", baseSha: "base-b" },
      resolved: { band: "ordinary", bytes: 5000, sourceCount: 4, cacheGap: false },
    });
    assert.deepEqual(a.evidence, b.evidence);
    assert.equal(orientationCap("re-orientation"), 7000);
  });
});
