// Review-only authority limits (ADR-0033).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  REVIEWER_ALLOWED_ACTIONS,
  REVIEWER_FORBIDDEN_ACTIONS,
  isForbiddenReviewerAction,
  isMissingPolicyDraftAction,
} from "../review-authority.ts";

describe("review-only authority", () => {
  test("forbidden actions cover fixes, source edits, delivery, and tracker state", () => {
    for (const action of ["apply-fix", "edit-source", "commit", "push", "merge", "labels", "promotion", "closure", "update-pull-request-body"] as const) {
      assert.ok((REVIEWER_FORBIDDEN_ACTIONS as readonly string[]).includes(action));
      assert.equal(isForbiddenReviewerAction(action), true);
    }
  });
  test("allowed actions cover publication, checks, and clean-checkout alignment only", () => {
    for (const action of ["publish-review", "publish-inline-findings", "run-focused-checks", "run-local-fallback-once", "align-clean-checkout"] as const) {
      assert.ok((REVIEWER_ALLOWED_ACTIONS as readonly string[]).includes(action));
      assert.equal(isForbiddenReviewerAction(action), false);
    }
    assert.equal((REVIEWER_ALLOWED_ACTIONS as readonly string[]).includes("create-missing-review-policy-draft"), false);
    assert.equal(isForbiddenReviewerAction("edit-source"), true);
    assert.equal(isForbiddenReviewerAction("commit"), true);
  });
  test("no missing-policy draft action is ever allowed", () => {
    assert.equal(isMissingPolicyDraftAction("create-missing-review-policy-draft"), false);
    assert.equal(isMissingPolicyDraftAction("publish-review"), false);
  });
});
