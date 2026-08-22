// workflow-state core (#132): pure decisions over observed facts.
// Covers frontier selection, blocker labels, concurrency, retries,
// review freshness, merge gates, dependent promotion, follow-up tickets,
// parent closure, purity, and generated-copy drift.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  LABEL_READY_FOR_AGENT,
  LABEL_BLOCKED,
  LABEL_UNBLOCKED,
  LABEL_NEEDS_INFO,
  MAX_ACTIVE_WORKERS,
  selectFrontier,
  labelTransitions,
  validateDispatch,
  retryDecision,
  reviewIsFresh,
  isMergeEligible,
  promotionAfterClosure,
  followUpRequired,
  parentClosureReady,
  type TicketFact,
  type WorkerFact,
  type PullRequestFact,
  type ReviewFact,
  type FinalVerificationFact,
} from "../scripts/workflow-state.ts";
import {
  AUTHORED_PATH,
  COPY_PATHS,
  driftedCopies,
} from "../scripts/generate-workflow-state.ts";

const ROOT = path.resolve(import.meta.dirname ?? ".", "..");

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

function worker(id: string, n: number, status: WorkerFact["status"] = "running"): WorkerFact {
  return { id, ticket: n, status };
}

describe("frontier selection", () => {
  test("selects open unblocked unassigned ready children of the specification in order", () => {
    const tickets = [
      ticket({ number: 133 }),
      ticket({ number: 131 }),
      ticket({ number: 134 }),
    ];
    assert.deepEqual(selectFrontier(tickets, SPEC), [133, 131, 134]);
  });

  const rejections: Array<[string, TicketFact]> = [
    ["closed", ticket({ number: 140, state: "closed" })],
    ["no parent", ticket({ number: 141, parent: null })],
    ["wrong parent", ticket({ number: 142, parent: 999 })],
    ["open blockers", ticket({ number: 143, openBlockers: [131] })],
    ["assigned", ticket({ number: 144, assignees: ["someone"] })],
    [
      "missing ready-for-agent",
      ticket({ number: 145, labels: [LABEL_BLOCKED] }),
    ],
    [
      "needs-info stop",
      ticket({
        number: 146,
        labels: [LABEL_READY_FOR_AGENT, LABEL_NEEDS_INFO],
      }),
    ],
  ];
  for (const [reason, t] of rejections) {
    test(`rejects ${reason}`, () => {
      const keep = ticket({ number: 139 });
      assert.deepEqual(selectFrontier([keep, t], SPEC), [139]);
    });
  }
});

describe("blocker label state", () => {
  test("initially blocked: open blocker swaps ready-for-agent for blocked", () => {
    const tickets = [ticket({ number: 150, openBlockers: [151] })];
    assert.deepEqual(labelTransitions(tickets, SPEC), [
      { number: 150, add: [LABEL_BLOCKED], remove: [LABEL_READY_FOR_AGENT] },
    ]);
  });

  test("already blocked with no ready-for-agent produces no transition", () => {
    const tickets = [
      ticket({
        number: 150,
        openBlockers: [151],
        labels: [LABEL_BLOCKED],
      }),
    ];
    assert.deepEqual(labelTransitions(tickets, SPEC), []);
  });

  test("newly unblocked: closed last blocker removes blocked, adds unblocked plus ready-for-agent", () => {
    const tickets = [
      ticket({ number: 150, labels: [LABEL_BLOCKED] }),
    ];
    assert.deepEqual(labelTransitions(tickets, SPEC), [
      {
        number: 150,
        add: [LABEL_UNBLOCKED, LABEL_READY_FOR_AGENT],
        remove: [LABEL_BLOCKED],
      },
    ]);
  });

  test("initially ready: unlabeled unblocked ticket gains ready-for-agent", () => {
    const tickets = [ticket({ number: 160, labels: [] })];
    assert.deepEqual(labelTransitions(tickets, SPEC), [
      { number: 160, add: [LABEL_READY_FOR_AGENT], remove: [] },
    ]);
  });

  test("initially ready grant is scoped to unassigned children of the specification", () => {
    const tickets = [
      ticket({ number: 164, labels: [], parent: null }),
      ticket({ number: 165, labels: [], parent: 999 }),
      ticket({ number: 166, labels: [], assignees: ["someone"] }),
    ];
    assert.deepEqual(labelTransitions(tickets, SPEC), []);
  });

  test("ready ticket with no blocker history needs no transition", () => {
    const tickets = [ticket({ number: 161 })];
    assert.deepEqual(labelTransitions(tickets, SPEC), []);
  });

  test("needs-info is terminal: stopped tickets get no transitions", () => {
    const tickets = [
      ticket({ number: 163, labels: [LABEL_NEEDS_INFO] }),
      ticket({
        number: 167,
        labels: [LABEL_BLOCKED, LABEL_NEEDS_INFO],
        openBlockers: [168],
      }),
      ticket({
        number: 169,
        labels: [LABEL_BLOCKED, LABEL_NEEDS_INFO],
      }),
    ];
    assert.deepEqual(labelTransitions(tickets, SPEC), []);
  });

  test("re-blocking removes a stale unblocked label", () => {
    const tickets = [
      ticket({
        number: 175,
        labels: [LABEL_UNBLOCKED, LABEL_READY_FOR_AGENT],
        openBlockers: [176],
      }),
    ];
    assert.deepEqual(labelTransitions(tickets, SPEC), [
      {
        number: 175,
        add: [LABEL_BLOCKED],
        remove: [LABEL_READY_FOR_AGENT, LABEL_UNBLOCKED],
      },
    ]);
  });

  test("closed tickets get no transitions even with stale labels", () => {
    const tickets = [
      ticket({ number: 162, state: "closed", labels: [LABEL_BLOCKED] }),
      ticket({ number: 177, state: "closed", labels: [] }),
    ];
    assert.deepEqual(labelTransitions(tickets, SPEC), []);
  });

  test("transitions cover mixed states exactly", () => {
    const tickets = [
      ticket({ number: 170, openBlockers: [171] }),
      ticket({ number: 171 }),
      ticket({ number: 172, labels: [LABEL_BLOCKED] }),
      ticket({ number: 173, labels: [] }),
      ticket({ number: 174, state: "closed" }),
    ];
    assert.deepEqual(labelTransitions(tickets, SPEC), [
      { number: 170, add: [LABEL_BLOCKED], remove: [LABEL_READY_FOR_AGENT] },
      {
        number: 172,
        add: [LABEL_UNBLOCKED, LABEL_READY_FOR_AGENT],
        remove: [LABEL_BLOCKED],
      },
      { number: 173, add: [LABEL_READY_FOR_AGENT], remove: [] },
    ]);
  });
});

describe("worker concurrency", () => {
  test("dispatches frontier requests while under the cap", () => {
    const tickets = [
      ticket({ number: 180 }),
      ticket({ number: 181 }),
      ticket({ number: 182 }),
    ];
    const plan = validateDispatch(
      [180, 181, 182],
      tickets,
      [],
      SPEC,
    );
    assert.deepEqual(plan.dispatch, [180, 181, 182]);
    assert.deepEqual(plan.violations, []);
  });

  test("never exceeds three active implementation workers", () => {
    assert.equal(MAX_ACTIVE_WORKERS, 3);
    const tickets = [
      ticket({ number: 180 }),
      ticket({ number: 181 }),
      ticket({ number: 182 }),
      ticket({ number: 183 }),
    ];
    const workers = [
      worker("w-1", 190),
      worker("w-2", 191),
      worker("w-3", 192),
    ];
    const plan = validateDispatch([180, 181], tickets, workers, SPEC);
    assert.deepEqual(plan.dispatch, []);
    assert.equal(plan.violations.length, 2);
    for (const v of plan.violations) {
      assert.match(v, /at most 3 active implementation workers/);
    }
  });

  test("accepts up to the remaining capacity and violates the overflow in request order", () => {
    const tickets = [
      ticket({ number: 180 }),
      ticket({ number: 181 }),
      ticket({ number: 182 }),
    ];
    const workers = [worker("w-1", 190)];
    const plan = validateDispatch([180, 181, 182], tickets, workers, SPEC);
    assert.deepEqual(plan.dispatch, [180, 181]);
    assert.deepEqual(plan.violations, [
      "worker cap: at most 3 active implementation workers",
    ]);
  });

  test("stopped workers free capacity; running ones hold it", () => {
    const tickets = [ticket({ number: 183 })];
    const workers = [
      worker("w-1", 190, "stopped"),
      worker("w-2", 191, "stopped"),
      worker("w-3", 192),
    ];
    const plan = validateDispatch([183], tickets, workers, SPEC);
    assert.deepEqual(plan.dispatch, [183]);
    assert.deepEqual(plan.violations, []);
  });

  test("offline and failed workers hold capacity until stopped", () => {
    const tickets = [ticket({ number: 195 })];
    const workers = [
      worker("w-1", 190),
      worker("w-2", 191, "offline"),
      worker("w-3", 192, "failed"),
    ];
    const plan = validateDispatch([195], tickets, workers, SPEC);
    assert.deepEqual(plan.dispatch, []);
    assert.equal(plan.violations.length, 1);
    assert.match(plan.violations[0], /at most 3 active implementation workers/);
  });

  test("rejects duplicate ownership by an active worker", () => {
    const tickets = [ticket({ number: 184 })];
    const plan = validateDispatch([184], tickets, [worker("w-1", 184)], SPEC);
    assert.deepEqual(plan.dispatch, []);
    assert.deepEqual(plan.violations, [
      "duplicate ownership: #184 is already owned by worker w-1",
    ]);
  });

  test("does not double-dispatch a ticket owned by a failed worker awaiting retry", () => {
    const tickets = [ticket({ number: 185 })];
    const plan = validateDispatch(
      [185],
      tickets,
      [worker("w-1", 185, "failed")],
      SPEC,
    );
    assert.deepEqual(plan.dispatch, []);
    assert.match(plan.violations[0], /duplicate ownership/);
  });

  test("rejects the same ticket requested twice", () => {
    const tickets = [ticket({ number: 186 })];
    const plan = validateDispatch([186, 186], tickets, [], SPEC);
    assert.deepEqual(plan.dispatch, [186]);
    assert.deepEqual(plan.violations, [
      "duplicate ownership: #186 requested twice",
    ]);
  });

  test("rejects unknown, non-frontier, blocked, assigned, and unlabeled requests before any claim", () => {
    const tickets = [
      ticket({ number: 187, state: "closed" }),
      ticket({ number: 188, parent: 999 }),
      ticket({ number: 189, openBlockers: [190] }),
      ticket({ number: 191, assignees: ["someone"] }),
      ticket({ number: 192, labels: [] }),
    ];
    const plan = validateDispatch(
      [998, 187, 188, 189, 191, 192],
      tickets,
      [],
      SPEC,
    );
    assert.deepEqual(plan.dispatch, []);
    assert.equal(plan.violations.length, 6);
    assert.match(plan.violations[0], /not among the observed ticket facts/);
    assert.match(plan.violations[1], /#187 is closed/);
    assert.match(plan.violations[2], /does not belong to specification #130/);
    assert.match(plan.violations[3], /open native blockers/);
    assert.match(plan.violations[4], /already has an assignee/);
    assert.match(plan.violations[5], /does not carry ready-for-agent/);
  });

  test("rejects a needs-info stop before any claim", () => {
    const tickets = [
      ticket({
        number: 193,
        labels: [LABEL_READY_FOR_AGENT, LABEL_NEEDS_INFO],
      }),
      ticket({ number: 194, labels: [LABEL_NEEDS_INFO] }),
    ];
    const plan = validateDispatch([193, 194], tickets, [], SPEC);
    assert.deepEqual(plan.dispatch, []);
    assert.equal(plan.violations.length, 2);
    for (const v of plan.violations) {
      assert.match(v, /is stopped with needs-info/);
    }
  });
});

describe("worker retry", () => {
  test("one failure gets exactly one reconciled retry", () => {
    assert.deepEqual(retryDecision(1), { action: "retry", addLabels: [] });
  });

  test("a second failure stops the ticket with needs-info", () => {
    assert.deepEqual(retryDecision(2), {
      action: "stop-ticket",
      addLabels: [LABEL_NEEDS_INFO],
    });
  });

  test("further failures stay stopped, still bounded at one retry", () => {
    assert.deepEqual(retryDecision(3), {
      action: "stop-ticket",
      addLabels: [LABEL_NEEDS_INFO],
    });
  });
});

describe("current-head review freshness", () => {
  test("same head SHA is fresh", () => {
    assert.equal(reviewIsFresh("abc123", "abc123"), true);
  });

  test("a pushed fix invalidates the reviewed head", () => {
    assert.equal(reviewIsFresh("def456", "abc123"), false);
  });
});

describe("merge eligibility", () => {
  const pr: PullRequestFact = {
    headSha: "abc123",
    mergeable: true,
    requiredChecksGreen: true,
  };
  const cleanReview: ReviewFact = {
    reviewedHeadSha: "abc123",
    unresolvedConfirmedFindings: 0,
    localReviewClean: true,
    cloudReviewAvailable: true,
  };

  test("eligible when checks are green, findings resolved, local review clean, head unchanged", () => {
    assert.deepEqual(isMergeEligible(pr, cleanReview), {
      eligible: true,
      blockers: [],
      cloudReview: "available",
    });
  });

  const cases: Array<[string, PullRequestFact, ReviewFact, string]> = [
    [
      "red required checks",
      { ...pr, requiredChecksGreen: false },
      cleanReview,
      /required checks are not green/,
    ],
    [
      "unresolved confirmed findings",
      pr,
      { ...cleanReview, unresolvedConfirmedFindings: 2 },
      /confirmed findings are unresolved/,
    ],
    [
      "unclean local review",
      pr,
      { ...cleanReview, localReviewClean: false },
      /local review is not clean/,
    ],
    [
      "stale reviewed head after a pushed fix",
      { ...pr, headSha: "def456" },
      cleanReview,
      /reviewed head SHA does not match the current head SHA/,
    ],
    [
      "unmergeable pull request",
      { ...pr, mergeable: false },
      cleanReview,
      /pull request is not mergeable/,
    ],
  ];
  for (const [name, p, r, pattern] of cases) {
    test(`blocks on ${name}`, () => {
      const decision = isMergeEligible(p, r);
      assert.equal(decision.eligible, false);
      assert.match(decision.blockers[0], pattern);
    });
  }

  test("cloud review absence is recorded but never blocks a complete local review", () => {
    const decision = isMergeEligible(pr, {
      ...cleanReview,
      cloudReviewAvailable: false,
    });
    assert.equal(decision.eligible, true);
    assert.equal(decision.cloudReview, "unavailable");
  });

  test("accumulates every blocker rather than stopping at the first", () => {
    const decision = isMergeEligible(
      { ...pr, mergeable: false, requiredChecksGreen: false },
      { ...cleanReview, localReviewClean: false },
    );
    assert.equal(decision.blockers.length, 3);
  });
});

describe("dependent promotion after closure", () => {
  test("promotes only dependents whose final open blocker closed", () => {
    const tickets = [
      ticket({ number: 210, labels: [LABEL_BLOCKED] }),
      ticket({
        number: 211,
        labels: [LABEL_BLOCKED],
        openBlockers: [212],
      }),
      ticket({ number: 212 }),
    ];
    assert.deepEqual(promotionAfterClosure(tickets, SPEC), [
      {
        number: 210,
        add: [LABEL_UNBLOCKED, LABEL_READY_FOR_AGENT],
        remove: [LABEL_BLOCKED],
      },
    ]);
  });

  test("leaves already-ready and unrelated tickets alone", () => {
    const tickets = [ticket({ number: 213 }), ticket({ number: 214 })];
    assert.deepEqual(promotionAfterClosure(tickets, SPEC), []);
  });

  test("does not promote a stopped ticket", () => {
    const tickets = [
      ticket({
        number: 215,
        labels: [LABEL_BLOCKED, LABEL_NEEDS_INFO],
      }),
    ];
    assert.deepEqual(promotionAfterClosure(tickets, SPEC), []);
  });
});

describe("follow-up creation and parent completion", () => {
  const passing: FinalVerificationFact = {
    finalVerificationPassed: true,
    wholeSpecReviewPassed: true,
  };

  test("failed final verification requires a follow-up ticket and keeps the parent open", () => {
    assert.equal(
      followUpRequired({ ...passing, finalVerificationPassed: false }),
      true,
    );
    const children = [
      ticket({ number: 220, state: "closed" }),
      ticket({ number: 221, state: "closed" }),
    ];
    assert.equal(
      parentClosureReady(children, {
        ...passing,
        finalVerificationPassed: false,
      }),
      false,
    );
  });

  test("failed whole-spec review requires a follow-up ticket", () => {
    assert.equal(
      followUpRequired({ ...passing, wholeSpecReviewPassed: false }),
      true,
    );
  });

  test("an open child keeps the specification open even when verification passes", () => {
    const children = [
      ticket({ number: 220, state: "closed" }),
      ticket({ number: 222 }),
    ];
    assert.equal(parentClosureReady(children, passing), false);
    assert.equal(parentClosureReady([], passing), true);
  });

  test("the specification closes only when every child is closed and both gates pass", () => {
    const children = [
      ticket({ number: 220, state: "closed" }),
      ticket({ number: 221, state: "closed" }),
    ];
    assert.equal(parentClosureReady(children, passing), true);
  });
});

describe("purity contract", () => {
  const source = fs.readFileSync(path.join(ROOT, "scripts/workflow-state.ts"), "utf8");

  const forbidden: Array<[string, RegExp]> = [
    ["static import statement", /^import\b/m],
    ["module specifier clause", /\bfrom\s*["']/],
    ["dynamic import", /\bimport\s*\(/],
    ["require call", /\brequire\s*\(/],
    ["network fetch", /\bfetch\s*\(/],
    ["XMLHttpRequest", /\bXMLHttpRequest\b/],
    ["http client call", /\bhttps?\s*\.\s*(get|request)\s*\(/],
    ["node builtins", /\bnode:/],
    ["child process execution", /\b(spawn|spawnSync|exec|execSync|execFile)\s*\(/],
    ["filesystem calls", /\b(readFile|writeFile|appendFile|copyFile|unlink|mkdir|rmdir|rm|rename|truncate|chmod|link|symlink|open|read|write|stat|lstat|access|exists)(Sync)?\s*\(/],
    ["host environment access", /\bprocess\.(env|argv|cwd|exit|hrtime)\b/],
    ["global this escape hatch", /\bglobalThis\b/],
    ["dynamic code evaluation", /\beval\s*\(|\bnew\s+Function\b/],
    ["nondeterministic time", /\b(Math\.random|Date\.now|performance\.now)\b/],
  ];

  for (const [name, pattern] of forbidden) {
    test(`contains no ${name}`, () => {
      assert.doesNotMatch(source, pattern);
    });
  }
});

describe("generated runtime copies", () => {
  test("one authored source exists with three packaged destinations", () => {
    assert.equal(COPY_PATHS.length, 3);
    assert.ok(fs.existsSync(path.join(ROOT, AUTHORED_PATH)));
    assert.equal(
      new Set(COPY_PATHS).size,
      COPY_PATHS.length,
      "COPY_PATHS entries must be unique",
    );
    for (const rel of COPY_PATHS) {
      assert.match(rel, /^skills\/(plan-this|implement-this|review-this)\/workflow-state\.ts$/);
    }
  });

  test("each registry install carries a byte-identical copy", () => {
    const authored = fs.readFileSync(path.join(ROOT, AUTHORED_PATH), "utf8");
    for (const rel of COPY_PATHS) {
      const copy = fs.readFileSync(path.join(ROOT, rel), "utf8");
      assert.equal(
        copy,
        authored,
        `${rel} drifted from ${AUTHORED_PATH}; run node scripts/generate-workflow-state.ts`,
      );
    }
  });

  test("the generator reports sync copies and exits zero", () => {
    assert.deepEqual(driftedCopies(), []);
    const result = spawnSync(process.execPath, [
      path.join(ROOT, "scripts/generate-workflow-state.ts"),
      "--check",
    ], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  });
});
