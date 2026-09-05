// Fix-agent authority limits (ADR-0031).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  FIX_AGENT_FORBIDDEN_ACTIONS,
  FIX_AGENT_NAME,
  buildFixPacket,
  isConfiguredFixAgent,
} from "../review-authority.ts";

describe("fix agent authority", () => {
  test("agent name is review-fixer", () => {
    assert.equal(FIX_AGENT_NAME, "review-fixer");
    assert.equal(isConfiguredFixAgent("review-fixer"), true);
    assert.equal(isConfiguredFixAgent("frontier"), false);
  });
  test("forbidden actions cover commit, push, verdicts, merge, and tracker state", () => {
    for (const action of ["commit", "push", "publish-verdict", "merge", "labels", "promotion", "closure"] as const) {
      assert.ok((FIX_AGENT_FORBIDDEN_ACTIONS as readonly string[]).includes(action));
    }
  });
  test("builds a narrow packet with findings, seams, and focused tests", () => {
    const r = buildFixPacket(
      11,
      [{ id: "F-1", file: "a.ts", line: 1, evidence: "rule + output" }],
      ["review-this"],
      ["node --test skills/review-this/tests/reconciliation.test.ts"],
    );
    assert.equal(r.decision.ok, true);
    assert.equal(r.packet?.agent, "review-fixer");
  });
  test("empty findings, seams, or tests stop the packet", () => {
    assert.equal(buildFixPacket(11, [], ["s"], ["t"]).decision.ok, false);
    assert.equal(
      buildFixPacket(11, [{ id: "F-1", file: "a.ts", line: 1, evidence: "e" }], [], ["t"]).decision.ok,
      false,
    );
    assert.equal(
      buildFixPacket(11, [{ id: "F-1", file: "a.ts", line: 1, evidence: "e" }], ["s"], []).decision.ok,
      false,
    );
  });
});
