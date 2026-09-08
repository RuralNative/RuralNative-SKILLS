// Review-policy bootstrap: use existing policy or draft the missing root file once (ADR-0033).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  buildReviewPolicyDraft,
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
  test("missing policy creates one draft and stops", () => {
    const d = reviewPolicyDecision({
      policyExists: false,
      policyReadable: false,
      isSymlink: false,
      conflictingSources: false,
      targetValid: true,
      checkoutMatches: true,
      worktreeClean: true,
    });
    assert.equal(d.action, "create-and-stop");
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

describe("buildReviewPolicyDraft", () => {
  test("draft carries observed rules, verification, and governing sources", () => {
    const r = buildReviewPolicyDraft({
      repository: "o/r",
      verificationCommand: "npm run verify",
      documentedRules: ["Blocking findings cite a rule or reproduced failure."],
      governingSources: ["AGENTS.md"],
    });
    assert.ok(r.draft?.includes("npm run verify"));
    assert.ok(r.draft?.includes("Blocking findings cite a rule"));
    assert.ok(r.draft?.includes("<!-- Governs-from: AGENTS.md -->"));
    assert.ok(r.draft?.includes("Qualifying as blocking does not block publication"));
  });
  test("missing verification command or rules stops the draft", () => {
    assert.equal(
      buildReviewPolicyDraft({ repository: "o/r", verificationCommand: "  ", documentedRules: ["rule"], governingSources: [] }).draft,
      null,
    );
    assert.equal(
      buildReviewPolicyDraft({ repository: "o/r", verificationCommand: "npm test", documentedRules: [], governingSources: [] }).draft,
      null,
    );
  });
});
