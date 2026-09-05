// Focused verification for /implement-this (ADR-0031): no full-gate escalation.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { selectFocusedChecks } from "../verification.ts";

describe("selectFocusedChecks", () => {
  test("runs exactly the ticket's focused checks", () => {
    const plan = selectFocusedChecks({ focusedCommands: ["node --test skills/x/tests/a.test.ts"], mappingComplete: true, behavioralCriteria: 1 });
    assert.equal(plan.runFocusedChecks, true);
    assert.equal(plan.runFullRepositoryGate, false);
  });
  test("non-behavior-only tickets record rationales instead of stopping", () => {
    const plan = selectFocusedChecks({ focusedCommands: [], mappingComplete: true, behavioralCriteria: 0 });
    assert.equal(plan.runFocusedChecks, false);
    assert.equal(plan.runFullRepositoryGate, false);
    assert.doesNotMatch(plan.reason, /needs-info/);
  });
  test("incomplete mapping stops instead of widening verification", () => {
    const plan = selectFocusedChecks({ focusedCommands: [], mappingComplete: false, behavioralCriteria: 1 });
    assert.equal(plan.runFocusedChecks, false);
    assert.equal(plan.runFullRepositoryGate, false);
    assert.match(plan.reason, /needs-info/);
  });
  test("missing behavioral proof stops instead of widening verification", () => {
    const plan = selectFocusedChecks({ focusedCommands: [], mappingComplete: true, behavioralCriteria: 2 });
    assert.equal(plan.runFocusedChecks, false);
    assert.equal(plan.runFullRepositoryGate, false);
    assert.match(plan.reason, /needs-info/);
  });
});
