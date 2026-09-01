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
  planAgentManagerTasks,
  resumeAction,
  schedulingCollision,
  spawnCapacity,
  type CleanupFact,
  type DeliveryFact,
  type ManagedWorkerFact,
  type ReservationFact,
  type ResumeAction,
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

describe("Agent Manager task planning", () => {
  test("plans exactly one task and one initial prompt per ticket", () => {
    const table: Array<[string, readonly number[], string, readonly string[]]> = [
      ["one ticket", [131], "Issue #0", ["Issue #131"]],
      [
        "several tickets",
        [131, 135],
        "Implement Issue #0 in its worktree",
        [
          "Implement Issue #131 in its worktree",
          "Implement Issue #135 in its worktree",
        ],
      ],
    ];
    for (const [name, tickets, template, prompts] of table) {
      const plans = planAgentManagerTasks(tickets, template);
      assert.equal(plans.length, tickets.length, `${name}: one task per ticket`);
      assert.deepEqual(plans.map((plan) => plan.ticket), tickets, name);
      assert.deepEqual(plans.map((plan) => plan.task.prompt), prompts, `${name}: one prompt per task`);
      for (const plan of plans) {
        assert.deepEqual(Object.keys(plan.task), ["prompt"], `${name}: task has one prompt`);
      }
    }
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
      requirementsCurrent: false,
    };
    const keys = ["pullRequestOpen", "closingReferenceValid", "acceptanceEvidencePosted", "requirementsCurrent"] as const;
    for (let mask = 0; mask < 16; mask++) {
      const fact: DeliveryFact = { ...base };
      keys.forEach((k, bit) => {
        if (mask & (1 << bit)) fact[k] = true;
      });
      const expected = mask === 15;
      assert.equal(isDelivered(fact), expected, `mask ${mask}`);
    }
  });

  test("a requirements mismatch invalidates otherwise durable delivery (ticket #190)", () => {
    const delivered: DeliveryFact = {
      pullRequestOpen: true,
      closingReferenceValid: true,
      acceptanceEvidencePosted: true,
      requirementsCurrent: false,
    };
    assert.equal(isDelivered(delivered), false);
  });

  test("reservation and resume decisions never duplicate artifacts", () => {
    const reserved: ReservationFact = {
      assignees: ["worker"],
      featureBranchExists: true,
      worktreeExists: true,
      liveWorkerSession: true,
      pullRequestOpen: false,
      closingReferenceValid: false,
      acceptanceEvidencePosted: false,
      requirementsCurrent: true,
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
        "reserved ticket with a dead session but no worktree reuses only the branch",
        { ...reserved, worktreeExists: false, liveWorkerSession: false },
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
      [
        "unassigned ticket with durable delivery stays delivered",
        {
          ...reserved,
          assignees: [],
          pullRequestOpen: true,
          closingReferenceValid: true,
          acceptanceEvidencePosted: true,
        },
        "delivery-durable",
        {},
      ],
      [
        "a body edit invalidates delivery and resumes the worker instead",
        {
          ...reserved,
          pullRequestOpen: true,
          closingReferenceValid: true,
          acceptanceEvidencePosted: true,
          requirementsCurrent: false,
        },
        "resume-worker",
        { reuseFeatureBranch: true, reuseLiveSession: true },
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
  const durable: CleanupFact = {
    lifecycleOutcome: "succeeded",
    worktreeClean: true,
    localHeadSha: "sha-a",
    remoteBranchSha: "sha-a",
    pullRequestHeadSha: "sha-a",
    pullRequestOpen: true,
    closingReferenceValid: true,
    acceptanceEvidencePosted: true,
    requirementsCurrent: true,
    hostClosesWorktrees: true,
  };

  test("exact durable delivery is the only stop; everything else preserves session and worktree", () => {
    const table: Array<[string, Partial<CleanupFact>, string]> = [
      ["running worker is never stopped", { lifecycleOutcome: "running" }, "preserved-for-resume"],
      ["interrupted worker is never stopped", { lifecycleOutcome: "interrupted" }, "preserved-for-resume"],
      ["offline worker is preserved for diagnosis", { lifecycleOutcome: "offline" }, "preserved-for-diagnosis"],
      ["failed worker is preserved for diagnosis", { lifecycleOutcome: "failed" }, "preserved-for-diagnosis"],
      ["blocked worker is preserved for diagnosis", { lifecycleOutcome: "blocked" }, "preserved-for-diagnosis"],
      ["needs-info worker is preserved for diagnosis", { lifecycleOutcome: "needs-info" }, "preserved-for-diagnosis"],
      ["dirty worktree is never stopped", { worktreeClean: false }, "preserved-for-resume"],
      ["absent remote SHA fails closed", { remoteBranchSha: "" }, "preserved-for-resume"],
      ["local/remote SHA mismatch preserves", { remoteBranchSha: "sha-b" }, "preserved-for-resume"],
      ["remote/PR head mismatch preserves", { pullRequestHeadSha: "sha-b" }, "preserved-for-resume"],
      ["missing PR preserves", { pullRequestOpen: false }, "preserved-for-resume"],
      ["invalid closing reference preserves", { closingReferenceValid: false }, "preserved-for-resume"],
      ["missing acceptance evidence preserves", { acceptanceEvidencePosted: false }, "preserved-for-resume"],
      ["absent delivery evidence fails closed", { pullRequestOpen: false, closingReferenceValid: false, acceptanceEvidencePosted: false }, "preserved-for-resume"],
    ];
    for (const [name, patch, report] of table) {
      const decision = cleanupDecision({ ...durable, ...patch });
      assert.equal(decision.stopSession, false, `${name}: session is preserved`);
      assert.equal(decision.removeWorktree, false, `${name}: worktree is preserved`);
      assert.equal(decision.report, report, name);
    }
  });

  test("exact durable delivery allows stop; removal depends separately on host support", () => {
    const closing = cleanupDecision(durable);
    assert.equal(closing.stopSession, true);
    assert.equal(closing.removeWorktree, true);
    assert.equal(closing.report, "removed");

    const nonClosing = cleanupDecision({ ...durable, hostClosesWorktrees: false });
    assert.equal(nonClosing.stopSession, true);
    assert.equal(nonClosing.removeWorktree, false);
    assert.equal(nonClosing.report, "cleanup-pending");
  });
});

describe("resume recovery", () => {
  const base: ReservationFact = {
    assignees: ["worker"],
    featureBranchExists: true,
    worktreeExists: true,
    liveWorkerSession: true,
    pullRequestOpen: false,
    closingReferenceValid: false,
    acceptanceEvidencePosted: false,
    requirementsCurrent: true,
  };

  test("reuses a live worker, returns recovery-required without a session, and creates clean work", () => {
    const table: Array<[string, ReservationFact, string, object]> = [
      [
        "live worker session reuses branch and session",
        base,
        "resume-worker",
        { reuseFeatureBranch: true, reuseLiveSession: true },
      ],
      [
        "missing session with an existing worktree is recovery-required",
        {
          ...base,
          liveWorkerSession: false,
          worktreePath: ".kilo/worktrees/177-bounded-orientation",
          branchName: "177-bounded-orientation",
        },
        "recovery-required",
        { worktreePath: ".kilo/worktrees/177-bounded-orientation", branchName: "177-bounded-orientation" },
      ],
      [
        "missing session without a reported path fails closed into recovery-required",
        { ...base, liveWorkerSession: false },
        "recovery-required",
        { worktreePath: undefined, branchName: undefined },
      ],
      [
        "pre-ADR-0023 fact without a worktree state never reuses a missing session",
        { ...base, worktreeExists: undefined as unknown as boolean, liveWorkerSession: false },
        "recovery-required",
        { worktreePath: undefined, branchName: undefined },
      ],
      [
        "no prior worktree creates a fresh worker",
        { ...base, featureBranchExists: false, worktreeExists: false, liveWorkerSession: false },
        "resume-worker",
        { reuseFeatureBranch: false, reuseLiveSession: false },
      ],
    ];
    for (const [name, fact, action, rest] of table) {
      const decision = resumeAction(fact);
      assert.equal(decision.action, action, name);
      assert.deepEqual({ ...decision }, { action, ...rest }, name);
    }
  });

  test("delivery stays durable regardless of worker state", () => {
    const delivered: ReservationFact = {
      ...base,
      pullRequestOpen: true,
      closingReferenceValid: true,
      acceptanceEvidencePosted: true,
    };
    assert.deepEqual(resumeAction({ ...delivered, liveWorkerSession: false }), { action: "delivery-durable" });
  });
});
