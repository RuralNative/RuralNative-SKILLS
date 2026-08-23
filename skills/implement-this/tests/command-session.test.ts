// implement-this:INV-6 — command-session lifecycle decisions (#155, ADR-0019).
// Table-driven tests over captured GitHub and Agent Manager facts only; no
// test creates a worktree or session or touches a live Agent Manager state.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  CHECKPOINT_AFTER_MS,
  MAX_MANAGED_WORKERS,
  POLL_DELAYS_MS,
  activeManagedWorkers,
  checkpointDue,
  cleanupDecision,
  isDelivered,
  nextPollDelay,
  resumeAction,
  schedulingCollision,
  spawnCapacity,
  type CleanupFact,
  type DeliveryFact,
  type ManagedWorkerFact,
  type ReservationFact,
} from "../command-session.ts";
import { MAX_ACTIVE_WORKERS } from "../workflow-state.ts";

describe("worker caps", () => {
  test("the stage cap stays three and the workspace cap is four", () => {
    assert.equal(MAX_ACTIVE_WORKERS, 3);
    assert.equal(MAX_MANAGED_WORKERS, 4);
  });

  test("spawn capacity under both caps", () => {
    const table: Array<[string, number, number, boolean, number]> = [
      // [name, implementationActive, workspaceActive, ok, slots]
      ["empty workspace", 0, 0, true, 3],
      ["stage-limited by own workers", 1, 0, true, 2],
      ["workspace-limited by unrelated stages", 0, 2, true, 2],
      ["one slot left from either cap", 2, 3, true, 1],
      ["stage full", 3, 0, false, 0],
      ["workspace full including unrelated workers", 0, 4, false, 0],
      ["workspace overfull refuses too", 1, 5, false, 0],
    ];
    for (const [name, implActive, wsActive, ok, slots] of table) {
      const result = spawnCapacity(implActive, wsActive);
      assert.equal(result.ok, ok, name);
      if (result.ok) {
        assert.equal(result.slots, slots, name);
      } else {
        assert.ok(result.reason.length > 0, `${name}: refusal carries a reason`);
      }
    }
  });

  test("unfinished managed workers are counted from captured overview facts", () => {
    const workers: ManagedWorkerFact[] = [
      { id: "ses_a", finished: false },
      { id: "ses_b", finished: true },
      { id: "ses_c", finished: false },
    ];
    assert.equal(activeManagedWorkers(workers).length, 2);
    assert.deepEqual(
      activeManagedWorkers(workers).map((w) => w.id),
      ["ses_a", "ses_c"],
    );
  });
});

describe("monitoring cadence", () => {
  test("poll delays increase and top out", () => {
    for (let i = 0; i < POLL_DELAYS_MS.length - 1; i++) {
      assert.ok(POLL_DELAYS_MS[i] < POLL_DELAYS_MS[i + 1], `delay ${i} increases`);
    }
    const table: Array<[number, number]> = [
      [0, POLL_DELAYS_MS[0]],
      [1, POLL_DELAYS_MS[1]],
      [4, POLL_DELAYS_MS[4]],
      [9, POLL_DELAYS_MS[POLL_DELAYS_MS.length - 1]],
    ];
    for (const [quietPolls, expected] of table) {
      assert.equal(nextPollDelay(quietPolls), expected);
    }
  });

  test("checkpoint fires at thirty minutes without progress", () => {
    const table: Array<[string, number, boolean]> = [
      ["under the threshold", CHECKPOINT_AFTER_MS - 1, false],
      ["exactly at the threshold", CHECKPOINT_AFTER_MS, true],
      ["well past it", 2 * CHECKPOINT_AFTER_MS, true],
    ];
    for (const [name, silentForMs, expected] of table) {
      assert.equal(checkpointDue(silentForMs), expected, name);
    }
  });
});

describe("durable delivery", () => {
  test("only a full GitHub evidence set counts; idleness never appears", () => {
    const base: DeliveryFact = {
      pullRequestOpen: false,
      closingReferenceValid: false,
      acceptanceEvidencePosted: false,
    };
    const keys = ["pullRequestOpen", "closingReferenceValid", "acceptanceEvidencePosted"] as const;
    for (let mask = 0; mask < 8; mask++) {
      const fact: DeliveryFact = { ...base };
      keys.forEach((k, bit) => {
        if (mask & (1 << bit)) fact[k] = true;
      });
      const expected = mask === 7;
      assert.equal(isDelivered(fact), expected, `mask ${mask}`);
    }
  });

  test("reservation and resume decisions never duplicate artifacts", () => {
    const reserved: ReservationFact = {
      assignees: ["worker"],
      featureBranchExists: true,
      liveWorkerSession: true,
      pullRequestOpen: false,
      closingReferenceValid: false,
      acceptanceEvidencePosted: false,
    };
    const table: Array<[string, ReservationFact, string, object]> = [
      [
        "unreserved ticket claims first",
        { ...reserved, assignees: [] },
        "reserve",
        { claimTicket: true },
      ],
      [
        "reserved ticket without delivery reuses branch and live session",
        reserved,
        "resume-worker",
        { reuseFeatureBranch: true, reuseLiveSession: true },
      ],
      [
        "reserved ticket with a dead session reuses only the branch",
        { ...reserved, liveWorkerSession: false },
        "resume-worker",
        { reuseFeatureBranch: true, reuseLiveSession: false },
      ],
      [
        "interrupted run with durable delivery stops instead of re-prompting",
        {
          ...reserved,
          pullRequestOpen: true,
          closingReferenceValid: true,
          acceptanceEvidencePosted: true,
        },
        "delivery-durable",
        {},
      ],
    ];
    for (const [name, fact, action, rest] of table) {
      const decision = resumeAction(fact);
      assert.equal(decision.action, action, name);
      assert.deepEqual({ ...decision }, { action, ...rest }, name);
    }
  });
});

describe("scheduling collisions", () => {
  test("overlapping paths wait for a slot; disjoint paths do not", () => {
    const table: Array<[string, string[], string[], boolean]> = [
      ["shared file", ["a.ts", "b.ts"], ["b.ts"], true],
      ["disjoint files", ["a.ts"], ["c.ts", "d.ts"], false],
      ["no running workers", ["a.ts"], [], false],
    ];
    for (const [name, ticketPaths, runningPaths, expected] of table) {
      assert.equal(schedulingCollision(ticketPaths, runningPaths), expected, name);
    }
  });
});

describe("cleanup negotiation", () => {
  test("stop always happens; removal needs durable success plus host support", () => {
    const table: Array<[string, CleanupFact, string, boolean]> = [
      [
        "delivered work on a closing host is removed",
        { deliveredEvidenceDurable: true, stoppedWithNeedsInfo: false, hostClosesWorktrees: true },
        "removed",
        true,
      ],
      [
        "delivered work on current Kilo reports cleanup-pending",
        { deliveredEvidenceDurable: true, stoppedWithNeedsInfo: false, hostClosesWorktrees: false },
        "cleanup-pending",
        false,
      ],
      [
        "failed work is preserved for diagnosis even on a closing host",
        { deliveredEvidenceDurable: false, stoppedWithNeedsInfo: true, hostClosesWorktrees: true },
        "preserved-for-diagnosis",
        false,
      ],
      [
        "failed work on a non-closing host is preserved too",
        { deliveredEvidenceDurable: false, stoppedWithNeedsInfo: true, hostClosesWorktrees: false },
        "preserved-for-diagnosis",
        false,
      ],
    ];
    for (const [name, fact, report, removeWorktree] of table) {
      const decision = cleanupDecision(fact);
      assert.equal(decision.stopSession, true, `${name}: session stops`);
      assert.equal(decision.report, report, name);
      assert.equal(decision.removeWorktree, removeWorktree, name);
    }
  });
});
