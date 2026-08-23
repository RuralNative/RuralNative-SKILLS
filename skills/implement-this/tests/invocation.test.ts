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

  test("bare and hash forms normalize identically before any GitHub read or write", () => {
    const table: Array<[string, string]> = [
      ["one ticket", "#131"],
      ["one ticket bare", "131"],
      ["parent specification", "#130"],
      ["parent specification bare", "130"],
      ["explicit set mixed", "#135"],
      ["explicit set mixed bare", "135"],
    ];
    for (const [name, ref] of table) {
      const bare = parseInvocation([ref.replace(/^#/, "")]);
      assert.deepEqual(parseInvocation([ref]), bare, name);
      assert.equal(bare[0], Number(ref.replace(/^#/, "")), name);
    }
    const hashed = planBoundedSet(["#131"], FIXTURE, WORKERS);
    const barePlan = planBoundedSet(["131"], FIXTURE, WORKERS);
    assert.deepEqual(barePlan, hashed);
  });
});

describe("planBoundedSet through the pure state core", () => {
  test("one-ticket input selects exactly that ticket", () => {
    const plan = planBoundedSet(["#131"], FIXTURE, WORKERS);
    assert.deepEqual(plan, { ok: true, dispatch: [131] });
  });

  test("one parentless standalone ticket uses the same validation path", () => {
    const plan = planBoundedSet(
      ["#155"],
      [ticket({ number: 155, parent: null })],
      WORKERS,
    );
    assert.deepEqual(plan, { ok: true, dispatch: [155] });
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

  test("the specification comes from the request, not from fact order", () => {
    // Same children, but a foreign ticket sorts first in the observed facts.
    const reordered = [
      ticket({ number: 199, parent: 999 }),
      ...FIXTURE,
    ];
    const plan = planBoundedSet(["#130"], reordered, WORKERS);
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

  test("malformed references stop before any claim with a clear violation", () => {
    const plan = planBoundedSet(["#13a"], [ticket({ number: 131 })], WORKERS);
    assert.equal(plan.ok, false);
    if (plan.ok) return;
    assert.deepEqual(plan.violations, ["`#13a` is not a ticket reference"]);
  });

  test("an explicit set spanning two specifications stops before claims", () => {
    const mixed = [FIXTURE[0], ticket({ number: 199, parent: 999 })];
    const plan = planBoundedSet(["#131", "#199"], mixed, WORKERS);
    assert.equal(plan.ok, false);
    if (plan.ok) return;
    assert.ok(plan.violations.length > 0);
  });

  test("multiple parentless tickets stop before claims", () => {
    const parentless = [
      ticket({ number: 155, parent: null }),
      ticket({ number: 156, parent: null }),
    ];
    const plan = planBoundedSet(["#155", "#156"], parentless, WORKERS);
    assert.equal(plan.ok, false);
    if (plan.ok) return;
    assert.ok(plan.violations.length > 0);
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
