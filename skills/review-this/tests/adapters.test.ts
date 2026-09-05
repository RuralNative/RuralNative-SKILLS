// Host contracts for the single-PR review (ADR-0031): CI equivalence only.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isEquivalentCi } from "../adapters.ts";

describe("isEquivalentCi", () => {
  test("policy or workflow mapping establishes equivalence", () => {
    assert.equal(isEquivalentCi(true, false), true);
    assert.equal(isEquivalentCi(false, true), true);
    assert.equal(isEquivalentCi(true, true), true);
  });
  test("a matching check name alone is insufficient", () => {
    assert.equal(isEquivalentCi(false, false), false);
  });
});
