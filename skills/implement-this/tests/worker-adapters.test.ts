// implement-this:INV-6 — worker capability adapters (#134).
// Fakes expose create, prompt, status, retry, and stop behavior; no test
// creates a real worktree or session.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  PREFERRED_ADAPTER_NAME,
  branchFor,
  dispatchTickets,
  recoverWorker,
  selectAdapter,
  type WorkerAdapter,
} from "../worker-adapters.ts";
import { MAX_ACTIVE_WORKERS } from "../workflow-state.ts";

interface CallLog {
  calls: string[];
}

function fakeAdapter(log: CallLog, name = "generic-host"): WorkerAdapter {
  let next = 0;
  return {
    name,
    async createWorktree(ticket, branch) {
      log.calls.push(`create ${ticket} ${branch}`);
      return `/wt/${ticket}`;
    },
    async startSession(worktree) {
      const id = `ses_${++next}`;
      log.calls.push(`start ${id} ${worktree}`);
      return { id };
    },
    async prompt(session, message) {
      log.calls.push(`prompt ${session.id}: ${message}`);
    },
    async status(session) {
      log.calls.push(`status ${session.id} running`);
      return "running";
    },
    async stop(session) {
      log.calls.push(`stop ${session.id}`);
    },
  };
}

describe("adapter selection (implement-this:INV-6)", () => {
  test("prefers Kilo Agent Manager over generic hosts", () => {
    const generic = fakeAdapter({ calls: [] }, "generic-host");
    const kilo = fakeAdapter({ calls: [] }, PREFERRED_ADAPTER_NAME);
    assert.equal(selectAdapter([generic, kilo]), kilo);
    assert.equal(selectAdapter([generic]), generic);
  });

  test("returns null when no adapter is available", () => {
    assert.equal(selectAdapter([]), null);
  });

  test("branch names derive from the ticket number", () => {
    assert.equal(branchFor(134), "134");
  });
});

describe("dispatch through fakes (implement-this:INV-6)", () => {
  test("gives each ticket its own worktree, branch, session, and one template prompt", async () => {
    const log: CallLog = { calls: [] };
    const slots = await dispatchTickets(
      [134, 135],
      fakeAdapter(log),
      (n) => `template for #${n}`,
    );
    assert.equal(slots.ok, true);
    if (!slots.ok) return;
    assert.deepEqual(
      slots.slots.map((s) => [s.ticket, s.branch, s.worktree]),
      [
        [134, "134", "/wt/134"],
        [135, "135", "/wt/135"],
      ],
    );
    const ids = new Set(slots.slots.map((s) => s.session.id));
    assert.equal(ids.size, 2, "each ticket gets a targeted session");
    assert.deepEqual(log.calls.slice(0, 3), [
      "create 134 134",
      "start ses_1 /wt/134",
      "prompt ses_1: template for #134",
    ]);
    assert.ok(
      log.calls.some((c) => c === "prompt ses_2: template for #135"),
      "the rendered template is the only prompt path",
    );
  });

  test("stops before any write when isolated workers are unavailable", async () => {
    const result = await dispatchTickets([134, 135], null, () => "template");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.reason, /no worker adapter/);
    assert.match(result.reason, /stops before any write/);
  });

  test("enforces the three-worker cap before any write", async () => {
    const log: CallLog = { calls: [] };
    const result = await dispatchTickets(
      [141, 142, 143, 144],
      fakeAdapter(log),
      () => "t",
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.reason, /worker cap/);
    assert.match(result.reason, new RegExp(`at most ${MAX_ACTIVE_WORKERS}`));
    assert.deepEqual(log.calls, [], "a capped batch must not write anything");
    const atCap = await dispatchTickets([141, 142, 143], fakeAdapter({ calls: [] }), () => "t");
    assert.equal(atCap.ok, true);
  });
});

describe("status and stop control through fakes (implement-this:INV-6)", () => {
  test("status lookup reads each live session", async () => {
    const log: CallLog = { calls: [] };
    const adapter = fakeAdapter(log);
    const slots = await dispatchTickets([134], adapter, () => "t");
    assert.ok(slots.ok);
    if (!slots.ok) return;
    const status = await adapter.status(slots.slots[0].session);
    assert.equal(status, "running");
    assert.ok(log.calls.some((c) => c.startsWith("status ses_1 running")));
  });

  test("stop control halts a worker session", async () => {
    const log: CallLog = { calls: [] };
    const adapter = fakeAdapter(log);
    const slots = await dispatchTickets([136], adapter, () => "t");
    assert.ok(slots.ok);
    if (!slots.ok) return;
    await adapter.stop(slots.slots[0].session);
    assert.ok(log.calls.includes("stop ses_1"));
  });
});

describe("recovery through the state core (implement-this:INV-10)", () => {
  test("first failure retries with the reconciled slot, no duplicate artifacts", async () => {
    const log: CallLog = { calls: [] };
    const adapter = fakeAdapter(log);
    const slots = await dispatchTickets([137], adapter, () => "t");
    assert.ok(slots.ok);
    if (!slots.ok) return;
    const outcome = await recoverWorker(slots.slots[0], 1, adapter);
    assert.equal(outcome.action, "retry");
    if (outcome.action !== "retry") return;
    assert.deepEqual(outcome.slot, slots.slots[0], "retry reuses the same slot");
    assert.ok(log.calls.some((c) => c.startsWith("status ses_1")));
    const started = log.calls.filter((c) => c.startsWith("start ")).length;
    assert.equal(started, 1, "recovery must not start a duplicate session");
  });

  test("second failure stops the worker and applies needs-info", async () => {
    const log: CallLog = { calls: [] };
    const adapter = fakeAdapter(log);
    const slots = await dispatchTickets([138], adapter, () => "t");
    assert.ok(slots.ok);
    if (!slots.ok) return;
    const outcome = await recoverWorker(slots.slots[0], 2, adapter);
    assert.deepEqual(outcome, {
      action: "stop-ticket",
      addLabels: ["needs-info"],
      observed: "running",
    });
    assert.ok(log.calls.includes("stop ses_1"));
  });
});
