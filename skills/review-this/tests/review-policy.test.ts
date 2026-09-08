// Review-policy resolution: optional REVIEW.md with skill-owned defaults (ADR-0034).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  effectivePolicyRevision,
  reviewPolicyDecision,
} from "../review-policy.ts";

describe("reviewPolicyDecision", () => {
  test("existing readable policy governs unchanged", () => {
    const d = reviewPolicyDecision({
      policyExists: true,
      policyReadable: true,
      isSymlink: false,
      conflictingSources: false,
      targetValid: true,
      checkoutMatches: true,
      worktreeClean: true,
    });
    assert.equal(d.action, "use-existing");
  });
  test("missing policy continues under skill-owned defaults", () => {
    const d = reviewPolicyDecision({
      policyExists: false,
      policyReadable: false,
      isSymlink: false,
      conflictingSources: false,
      targetValid: true,
      checkoutMatches: true,
      worktreeClean: true,
    });
    assert.equal(d.action, "use-defaults");
  });
  test("effective-policy revision invalidates on source changes", () => {
    const a = effectivePolicyRevision([{ path: "REVIEW.md", hash: "h1" }]);
    const b = effectivePolicyRevision([{ path: "REVIEW.md", hash: "h2" }]);
    const absent = effectivePolicyRevision([]);
    assert.notEqual(a, b);
    assert.notEqual(a, absent);
    assert.equal(effectivePolicyRevision([{ path: "b", hash: "1" }, { path: "a", hash: "1" }]), effectivePolicyRevision([{ path: "a", hash: "1" }, { path: "b", hash: "1" }]));
  });
  test("invalid target stops before policy", () => {
    const d = reviewPolicyDecision({
      policyExists: false,
      policyReadable: false,
      isSymlink: false,
      conflictingSources: false,
      targetValid: false,
      checkoutMatches: true,
      worktreeClean: true,
    });
    assert.equal(d.action, "stop");
  });
  test("dirty or mismatched checkout stops and creates nothing", () => {
    for (const fact of [
      { checkoutMatches: false, worktreeClean: true },
      { checkoutMatches: true, worktreeClean: false },
    ]) {
      const d = reviewPolicyDecision({
        policyExists: false,
        policyReadable: false,
        isSymlink: false,
        conflictingSources: false,
        targetValid: true,
        ...fact,
      });
      assert.equal(d.action, "stop");
    }
  });
  test("unreadable, symlinked, or conflicting policy stops", () => {
    for (const fact of [
      { policyReadable: false, isSymlink: false, conflictingSources: false },
      { policyReadable: true, isSymlink: true, conflictingSources: false },
      { policyReadable: true, isSymlink: false, conflictingSources: true },
    ]) {
      const d = reviewPolicyDecision({
        policyExists: true,
        targetValid: true,
        checkoutMatches: true,
        worktreeClean: true,
        ...fact,
      });
      assert.equal(d.action, "stop");
    }
  });
  test("missing policy with conflicting sources stops and creates nothing", () => {
    const d = reviewPolicyDecision({
      policyExists: false,
      policyReadable: false,
      isSymlink: false,
      conflictingSources: true,
      targetValid: true,
      checkoutMatches: true,
      worktreeClean: true,
    });
    assert.equal(d.action, "stop");
  });
  test("missing policy on a symlink path stops and creates nothing", () => {
    const d = reviewPolicyDecision({
      policyExists: false,
      policyReadable: false,
      isSymlink: true,
      conflictingSources: false,
      targetValid: true,
      checkoutMatches: true,
      worktreeClean: true,
    });
    assert.equal(d.action, "stop");
  });
});

// Retired by ADR-0034: no missing-policy draft is built; absence uses defaults.
