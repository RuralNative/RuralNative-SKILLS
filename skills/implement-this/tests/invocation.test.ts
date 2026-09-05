// Single-target invocation for /implement-this (ADR-0031).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseSingleReference, planSingleTicket } from "../invocation.ts";
import type { TicketFact } from "../workflow-state.ts";

function ticket(overrides: Partial<TicketFact> & { number: number }): TicketFact {
  return {
    state: "open",
    labels: ["ready-for-agent"],
    assignees: [],
    parent: 99,
    openBlockers: [],
    ...overrides,
  };
}

describe("parseSingleReference", () => {
  test("accepts one hash reference", () => {
    assert.deepEqual(parseSingleReference(["#100"]), { ok: true, ticket: 100 });
  });
  test("accepts one bare number identically", () => {
    assert.deepEqual(parseSingleReference(["100"]), { ok: true, ticket: 100 });
  });
  test("accepts a same-shape GitHub issue URL", () => {
    assert.deepEqual(
      parseSingleReference(["https://github.com/RuralNative/RuralNative-SKILLS/issues/100"]),
      { ok: false, diagnostic: "cross-repository-target", detail: "`https://github.com/RuralNative/RuralNative-SKILLS/issues/100` does not name an issue in the current repository" },
    );
    assert.deepEqual(
      parseSingleReference(
        ["https://github.com/RuralNative/RuralNative-SKILLS/issues/100"],
        "ruralnative/ruralnative-skills",
      ),
      { ok: true, ticket: 100 },
    );
  });
  test("rejects a GitHub pull URL as a pull-request target", () => {
    const r = parseSingleReference(
      ["https://github.com/RuralNative/RuralNative-SKILLS/pull/100"],
      "RuralNative/RuralNative-SKILLS",
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.diagnostic, "pull-request-target");
  });
  test("rejects cross-repository issue URLs", () => {
    const r = parseSingleReference(
      ["https://github.com/other/repo/issues/100"],
      "RuralNative/RuralNative-SKILLS",
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.diagnostic, "cross-repository-target");
  });
  test("rejects multiple targets", () => {
    const r = parseSingleReference(["#100", "#101"]);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.diagnostic, "multiple-targets");
  });
  test("rejects malformed input", () => {
    const r = parseSingleReference(["not-a-ref"]);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.diagnostic, "malformed-reference");
  });
  test("rejects empty invocation", () => {
    const r = parseSingleReference([]);
    assert.equal(r.ok, false);
  });
});

describe("planSingleTicket", () => {
  const tickets = [ticket({ number: 100 }), ticket({ number: 101 }), ticket({ number: 99, parent: null })];
  test("accepts one open ready ticket", () => {
    const r = planSingleTicket(["#100"], tickets);
    assert.deepEqual(r, { ok: true, ticket: 100 });
  });
  test("rejects a parent specification", () => {
    const withChildren: TicketFact[] = [
      ticket({ number: 50, parent: null }),
      ticket({ number: 51, parent: 50 }),
    ];
    const r = planSingleTicket(["#50"], withChildren);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.diagnostic, "parent-specification");
  });
  test("rejects a pull-request number", () => {
    const r = planSingleTicket(["#100"], tickets, (n) => n === 100);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.diagnostic, "pull-request-target");
  });
  test("rejects multiple targets before mutation", () => {
    const r = planSingleTicket(["#100", "#101"], tickets);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.diagnostic, "multiple-targets");
  });
  test("rejects closed, blocked, assigned, and unready tickets", () => {
    for (const bad of [
      ticket({ number: 200, state: "closed" }),
      ticket({ number: 201, openBlockers: [1] }),
      ticket({ number: 202, assignees: ["x"] }),
      ticket({ number: 203, labels: [] }),
    ]) {
      const r = planSingleTicket([`#${bad.number}`], [bad]);
      assert.equal(r.ok, false, `#${bad.number} should stop`);
    }
  });
  test("rejects unknown tickets", () => {
    const r = planSingleTicket(["#999"], tickets);
    assert.equal(r.ok, false);
  });
});
