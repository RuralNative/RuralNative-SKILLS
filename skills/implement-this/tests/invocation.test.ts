// implement-this:INV-7 — the three invocation forms run through the pure
// state core (#134). Fixture facts only; no network or live issues.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseInvocation, planBoundedSet } from "../invocation.ts";
import {
  LABEL_READY_FOR_AGENT,
  LABEL_BLOCKED,
  type TicketFact,
  type WorkerFact,
} from "../workflow-state.ts";

const SPEC = 130;

function ticket(overrides: Partial<TicketFact> & { number: number }): TicketFact {
  return {
    state: "open",
    labels: [LABEL_READY_FOR_AGENT],
    assignees: [],
    parent: SPEC,
    openBlockers: [],
    ...overrides,
  };
}

const WORKERS: WorkerFact[] = [];

// Native child order: 131, 133, 134, 135. 133 is blocked, 134 is assigned.
const FIXTURE: TicketFact[] = [
  ticket({ number: 131 }),
  ticket({ number: 133, labels: [LABEL_BLOCKED], openBlockers: [132] }),
  ticket({ number: 134, assignees: ["someone"] }),
  ticket({ number: 135 }),
  ticket({ number: 140, parent: 999, labels: [LABEL_READY_FOR_AGENT] }),
];

describe("parseInvocation", () => {
  test("parses one, several, and specification references", () => {
    assert.deepEqual(parseInvocation(["#134"]), [134]);
    assert.deepEqual(parseInvocation(["#134", "#135", "#131"]), [134, 135, 131]);
    assert.deepEqual(parseInvocation(["130"]), [130]);
  });
});

describe("planBoundedSet through the pure state core", () => {
  test("one-ticket input selects exactly that ticket", () => {
    const plan = planBoundedSet(["#131"], FIXTURE, WORKERS);
    assert.deepEqual(plan, { ok: true, dispatch: [131] });
  });

  test("explicit multi-ticket input keeps the requested set", () => {
    const plan = planBoundedSet(["#135", "#131"], FIXTURE, WORKERS);
    assert.deepEqual(plan, { ok: true, dispatch: [135, 131] });
  });

  test("parent-specification input selects up to three ready frontier tickets in native child order", () => {
    const plan = planBoundedSet(["#130"], FIXTURE, WORKERS);
    // 133 is blocked, 134 is assigned; frontier is [131, 135] in child order.
    assert.deepEqual(plan, { ok: true, dispatch: [131, 135] });
  });

  test("frontier selection caps at three tickets", () => {
    const wide = [
      ticket({ number: 141 }),
      ticket({ number: 142 }),
      ticket({ number: 143 }),
      ticket({ number: 144 }),
    ];
    const plan = planBoundedSet(["#130"], wide, WORKERS);
    assert.ok(plan.ok);
    if (!plan.ok) return;
    assert.equal(plan.dispatch.length, 3);
    assert.deepEqual(plan.dispatch, [141, 142, 143]);
  });

  const rejections: Array<[string, string[], TicketFact[]]> = [
    ["closed ticket", ["#150"], [ticket({ number: 150, state: "closed" })]],
    [
      "blocked ticket",
      ["#151"],
      [ticket({ number: 151, labels: [LABEL_BLOCKED], openBlockers: [152] })],
    ],
    [
      "assigned ticket",
      ["#153"],
      [ticket({ number: 153, assignees: ["someone"] })],
    ],
    [
      "ticket outside the parent",
      ["#140"],
      FIXTURE,
    ],
    [
      "ticket missing ready-for-agent",
      ["#154"],
      [ticket({ number: 154, labels: [] })],
    ],
    [
      "duplicate claim",
      ["#131", "#131"],
      FIXTURE.filter((t) => t.number === 131),
    ],
  ];
  for (const [reason, refs, facts] of rejections) {
    test(`stops before claims on ${reason}`, () => {
      const plan = planBoundedSet(refs, facts, WORKERS);
      assert.equal(plan.ok, false, reason);
      if (plan.ok) return;
      assert.ok(plan.violations.length > 0);
    });
  }
});
