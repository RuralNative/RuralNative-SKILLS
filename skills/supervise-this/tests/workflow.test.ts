// supervise-this:INV-3 — executable preflight
// supervise-this:INV-5 — ownership-aware scheduling
// supervise-this:INV-6 — evidence states and dependency waves
// supervise-this:INV-8 — fixed-head merge decisions
// supervise-this:INV-9 — classified recovery and idempotent resume
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  buildOwnership,
  deliveryState,
  idleSignal,
  mergeDecision,
  nextRecovery,
  nextWave,
  reconcile,
  reviewDecision,
  runCli,
  runPreflight,
  type OwnershipInput,
  type RecoveryState,
} from "../scripts/workflow.ts";

const emptyOwnership = (): OwnershipInput => ({
  openPullRequests: [],
  sessions: [],
  branches: [],
  assignees: [],
  issueLinks: [],
});

const healthyPreflight = () => ({
  daemonHealthy: true,
  githubHealthy: true,
  repository: "RuralNative/RuralNative-SKILLS",
  defaultBranch: "main",
  originHeadSha: "a".repeat(40),
  baseContainsOrigin: true,
  ownershipClear: true,
  orchestrator: { agent: "codex", model: "gpt-5", modelResolved: true, supportedModes: ["chat" as const] },
  worker: { agent: "codex", model: "gpt-5", modelResolved: true, supportedModes: ["chat" as const, "tui" as const] },
  reviewerPolicy: "verdict" as const,
});

describe("bounded command-line input", () => {
  test("every operation completes with explicit JSON input", () => {
    const facts = {
      claimed: false,
      baseCurrent: false,
      trackedChange: false,
      pullRequestOpen: false,
      reviewed: false,
      merged: false,
      evidenced: false,
      closed: false,
    };
    const cases: Array<[string, unknown]> = [
      ["preflight", healthyPreflight()],
      ["delivery-state", facts],
      ["idle-signal", { issueOpen: true, sessionStatus: "idle", matchingPullRequest: false, trackedChange: false }],
      ["reconcile", { tickets: [], ownership: emptyOwnership() }],
      ["recovery-decision", { state: { infrastructure: 0, task: 0, implementation: 0 }, failureClass: "task" }],
      ["review-decision", { policy: "verdict", author: "a", reviewer: "a", approved: false, verdict: "pass" }],
      [
        "merge-decision",
        {
          repository: "RuralNative/RuralNative-SKILLS",
          pullRequest: 89,
          headSha: "a".repeat(40),
          reviewedHeadSha: "a".repeat(40),
          aoOwned: true,
          aoManageable: true,
        },
      ],
    ];

    for (const [operation, input] of cases) {
      const result = runCli([operation, "--json", JSON.stringify(input)]);
      assert.equal(result.exitCode, 0, `${operation}: ${result.stderr}`);
      assert.doesNotThrow(() => JSON.parse(result.stdout), `${operation} must return JSON`);
    }
  });

  test("missing input fails immediately instead of waiting on stdin", () => {
    const result = runCli(["idle-signal"]);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /input required/);
  });

  test("input files must be regular files, not stdin or a pipe", () => {
    const result = runCli(["idle-signal", "--input", "/dev/stdin"]);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /regular file/);
  });
});

describe("executable AO preflight", () => {
  test("selects a mode from the configured worker instead of requiring Kilo", () => {
    const result = runPreflight(healthyPreflight());
    assert.deepEqual(result, {
      ok: true,
      mode: "chat",
      repository: "RuralNative/RuralNative-SKILLS",
      originHeadSha: "a".repeat(40),
    });
  });

  test("rejects a stale base and broken GitHub access before spawn", () => {
    const result = runPreflight({ ...healthyPreflight(), baseContainsOrigin: false, githubHealthy: false });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.includes("BASE_STALE"));
      assert.ok(result.errors.includes("GITHUB_UNAVAILABLE"));
    }
  });

  test("rejects chat for a TUI-only worker", () => {
    const result = runPreflight({
      ...healthyPreflight(),
      requestedMode: "chat",
      worker: { agent: "kilocode", model: "worker-model", modelResolved: true, supportedModes: ["tui"] },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.errors.includes("WORKER_MODE_UNSUPPORTED"));
  });

  test("rejects catalog modes outside chat and TUI", () => {
    const input = {
      ...healthyPreflight(),
      worker: { agent: "worker", model: "model", modelResolved: true, supportedModes: ["batch"] },
    };
    const result = runCli(["preflight", "--json", JSON.stringify(input)]);
    assert.equal(result.exitCode, 0);
    assert.ok(JSON.parse(result.stdout).errors.includes("WORKER_MODE_UNSUPPORTED"));
  });

  test("rejects an unresolved worker model", () => {
    const result = runPreflight({
      ...healthyPreflight(),
      worker: { agent: "codex", model: "missing-model", modelResolved: false, supportedModes: ["chat"] },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.errors.includes("WORKER_MODEL_UNRESOLVED"));
  });

  test("rejects missing role profiles and reviewer policy", () => {
    const result = runPreflight({
      ...healthyPreflight(),
      orchestrator: undefined,
      worker: undefined,
      reviewerPolicy: undefined,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.includes("ORCHESTRATOR_PROFILE_MISSING"));
      assert.ok(result.errors.includes("WORKER_PROFILE_MISSING"));
      assert.ok(result.errors.includes("REVIEWER_POLICY_MISSING"));
    }
  });
});

describe("ownership and delivery evidence", () => {
  test("an existing pull request prevents a duplicate spawn", () => {
    const actions = reconcile({
      tickets: [{ issue: 89, open: true, readyForAgent: true, blockerStates: [] }],
      ownership: {
        ...emptyOwnership(),
        openPullRequests: [{ issue: 89, number: 90, headSha: "b".repeat(40), aoOwned: true }],
      },
    });
    assert.deepEqual(actions, [{ issue: 89, action: "review" }]);
    const gate = runPreflight({ ...healthyPreflight(), ownershipClear: actions[0]?.action === "spawn" });
    assert.equal(gate.ok, false);
    if (!gate.ok) assert.ok(gate.errors.includes("DUPLICATE_OWNERSHIP"));
  });

  test("idle plus an open issue without a PR or tracked change is red", () => {
    const input = { issueOpen: true, sessionStatus: "idle", matchingPullRequest: false, trackedChange: false };
    assert.equal(idleSignal(input), "red");
  });

  test("delivery state ignores activity labels and advances on artifacts", () => {
    assert.equal(
      deliveryState({
        claimed: false,
        baseCurrent: false,
        trackedChange: false,
        pullRequestOpen: true,
        reviewed: false,
        merged: false,
        evidenced: false,
        closed: false,
      }),
      "PR_OPEN",
      "a durable PR must survive missing earlier session facts on resume",
    );
    assert.equal(
      deliveryState({
        claimed: true,
        baseCurrent: true,
        trackedChange: true,
        pullRequestOpen: false,
        reviewed: false,
        merged: false,
        evidenced: false,
        closed: false,
      }),
      "EDITING",
    );
    assert.equal(
      deliveryState({
        claimed: true,
        baseCurrent: true,
        trackedChange: true,
        pullRequestOpen: true,
        reviewed: true,
        merged: true,
        evidenced: false,
        closed: true,
      }),
      "MERGED",
      "closure cannot skip acceptance evidence",
    );
  });

  test("resume deduplicates repeated issue, session, branch, assignee, and PR evidence", () => {
    const ownership = {
      openPullRequests: [
        { issue: 89, number: 90, headSha: "b".repeat(40), aoOwned: true },
        { issue: 89, number: 90, headSha: "b".repeat(40), aoOwned: true },
      ],
      sessions: [
        { issue: 89, id: "session-1" },
        { issue: 89, id: "session-1" },
      ],
      branches: [
        { issue: 89, name: "issue-89", trackedChange: true },
        { issue: 89, name: "issue-89", trackedChange: true },
      ],
      assignees: [
        { issue: 89, login: "worker" },
        { issue: 89, login: "worker" },
      ],
      issueLinks: [
        { issue: 89, kind: "pull-request" as const, ref: 90 },
        { issue: 89, kind: "pull-request" as const, ref: 90 },
      ],
    };
    const record = buildOwnership(ownership).get(89);
    assert.deepEqual(record?.pullRequests, [90]);
    assert.deepEqual(record?.sessions, ["session-1"]);
    assert.deepEqual(record?.branches, ["issue-89"]);
    assert.deepEqual(record?.assignees, ["worker"]);
    assert.deepEqual(record?.issueLinks, ["pull-request:90"]);
    assert.deepEqual(
      reconcile({ tickets: [{ issue: 89, open: true, readyForAgent: true, blockerStates: [] }], ownership }),
      [{ issue: 89, action: "review" }],
    );
  });
});

describe("recovery, review, merge, and waves", () => {
  test("infrastructure recovery can be followed by task continuation", () => {
    const initial: RecoveryState = { infrastructure: 0, task: 0, implementation: 0 };
    const infrastructure = nextRecovery(initial, "infrastructure", 1);
    const task = nextRecovery(infrastructure.state, "task", 1);
    assert.equal(infrastructure.action, "recover-infrastructure");
    assert.equal(task.action, "continue-task");
    assert.deepEqual(task.state, { infrastructure: 1, task: 1, implementation: 0 });
  });

  test("legacy unclaimed PRs use an explicit-repository fallback with a fixed head", () => {
    const reviewedHeadSha = "c".repeat(40);
    const decision = mergeDecision({
      repository: "RuralNative/RuralNative-SKILLS",
      pullRequest: 90,
      headSha: reviewedHeadSha,
      reviewedHeadSha,
      aoOwned: false,
      aoManageable: false,
    });
    assert.equal(decision.action, "github-fallback");
    assert.deepEqual(decision.command, [
      "gh",
      "pr",
      "merge",
      "90",
      "--repo",
      "RuralNative/RuralNative-SKILLS",
      "--match-head-commit",
      reviewedHeadSha,
    ]);
    assert.equal(
      mergeDecision({
        repository: "RuralNative/RuralNative-SKILLS",
        pullRequest: 90,
        headSha: "d".repeat(40),
        reviewedHeadSha,
        aoOwned: false,
        aoManageable: false,
      }).action,
      "stop",
    );
    assert.equal(
      mergeDecision({
        repository: "RuralNative/RuralNative-SKILLS",
        pullRequest: 91,
        headSha: reviewedHeadSha,
        reviewedHeadSha,
        aoOwned: true,
        aoManageable: true,
      }).action,
      "ao",
    );
  });

  test("same-account review cannot satisfy an approval-only policy", () => {
    assert.deepEqual(
      reviewDecision({ policy: "approval-required", author: "ruralnative", reviewer: "ruralnative", approved: true }),
      { satisfied: false, reason: "SELF_APPROVAL_FORBIDDEN" },
    );
    assert.deepEqual(
      reviewDecision({ policy: "verdict", author: "ruralnative", reviewer: "ruralnative", approved: false, verdict: "pass" }),
      { satisfied: true, reason: "VERDICT_PASS" },
    );
  });

  test("a merged blocker opens the next dependency wave", () => {
    assert.deepEqual(
      nextWave([{ issue: 90, open: true, readyForAgent: true, blockerStates: ["MERGED"] }], new Map()),
      [{ issue: 90, action: "spawn" }],
    );
  });
});
