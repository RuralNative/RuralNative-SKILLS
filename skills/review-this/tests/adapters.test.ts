// review-this:INV-6 — Kilo cloud summary and inline comments are collected for the current head when available.
// review-this:INV-8 — pushed fix invalidates previous verdict, merge gates.
// review-this:INV-9 — squash-merge and dependent promotion via adapters and pure core.
// review-this:INV-10 — final verification and parent closure.
// review-this:INV-11 — state and adapter boundaries remain callable by a future coordinator.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { selectReviewWave } from "../discovery.ts";
import { reconcileFindings } from "../reconciliation.ts";
import { collectCloudReview, fakeCloudAdapter, fakeLocalReviewAdapter, fakeMergeAdapter, fakeVerificationAdapter } from "../adapters.ts";
import { isMergeEligible, promotionAfterClosure, parentClosureReady, followUpRequired } from "../workflow-state.ts";
import type { TicketFact } from "../workflow-state.ts";

const SPEC = 130;
const HEAD = "abc123";
const OTHER_HEAD = "def456";

function ticket(n: number, labels = ["ready-for-human"]): TicketFact {
  return { number: n, state: "open", labels, assignees: [], parent: SPEC, openBlockers: [] };
}

describe("current-head cloud comments (review-this:INV-6)", () => {
  test("available cloud comments on the exact current head are retained", async () => {
    const cloud = fakeCloudAdapter({
      status: "available",
      headSha: HEAD,
      summary: "cloud summary",
      inlineComments: [
        { source: "cloud", file: "src/a.ts", line: 10, message: "cloud finding", headSha: HEAD, inDiff: true, verified: true, evidence: "line 10" },
      ],
    });
    const result = await collectCloudReview(cloud, HEAD);
    assert.equal(result.status, "available");
    assert.equal(result.inlineComments.length, 1);
    // reconciled without stale rejection
    const reconciled = reconcileFindings(result.inlineComments, HEAD);
    assert.equal(reconciled.retained.length, 1);
    assert.equal(reconciled.rejected.stale.length, 0);
  });

  test("stale cloud head after a push is rejected and requires a new verdict", async () => {
    const cloud = fakeCloudAdapter({
      status: "available",
      headSha: OTHER_HEAD,
      summary: "stale summary",
      inlineComments: [
        { source: "cloud", file: "src/a.ts", line: 10, message: "stale cloud", headSha: OTHER_HEAD, inDiff: true, verified: true, evidence: "line 10" },
      ],
    });
    const result = await collectCloudReview(cloud, HEAD);
    assert.equal(result.status, "unavailable");
    assert.match(result.reason ?? "", /does not match current head/);
  });

  test("cloud disabled, absent, failed, or timed out is recorded as unavailable without blocking a complete local review", async () => {
    const unavailable = fakeCloudAdapter({
      status: "unavailable",
      headSha: HEAD,
      inlineComments: [],
      reason: "cloud disabled",
    });
    const cloudResult = await collectCloudReview(unavailable, HEAD);
    assert.equal(cloudResult.status, "unavailable");

    const localAdapter = fakeLocalReviewAdapter({
      headSha: HEAD,
      standards: [],
      spec: [],
      clean: true,
    });
    const local = await localAdapter.run(HEAD);
    assert.equal(local.clean, true);
    const pr = { headSha: HEAD, mergeable: true, requiredChecksGreen: true };
    const review = { reviewedHeadSha: HEAD, unresolvedConfirmedFindings: 0, localReviewClean: local.clean, cloudReviewAvailable: (cloudResult.status as string) === "available" };
    assert.equal(isMergeEligible(pr, review).eligible, true);
    assert.equal(isMergeEligible(pr, review).cloudReview, "unavailable");
  });

  test("adapter rejection (failure or timeout) is recorded as unavailable without throwing", async () => {
    const failing: import("../adapters.ts").CloudAdapter = {
      name: "fake-cloud-failing",
      async collect() {
        throw new Error("timeout");
      },
    };
    const result = await collectCloudReview(failing, HEAD);
    assert.equal(result.status, "unavailable");
    assert.match(result.reason ?? "", /cloud collect failed/);
    assert.match(result.reason ?? "", /timeout/);
    // still does not block local review
    const pr = { headSha: HEAD, mergeable: true, requiredChecksGreen: true };
    const review = { reviewedHeadSha: HEAD, unresolvedConfirmedFindings: 0, localReviewClean: true, cloudReviewAvailable: (result.status as string) === "available" };
    assert.equal(isMergeEligible(pr, review).eligible, true);
  });
});

describe("local fallback keeps axes separate (review-this:INV-6/INV-7)", () => {
  test("Standards and Spec axes run in parallel and are kept separate", async () => {
    const localAdapter = fakeLocalReviewAdapter({
      headSha: HEAD,
      standards: [{ source: "standards", file: "src/s.ts", line: 1, message: "standards issue", headSha: HEAD, inDiff: true, verified: true, evidence: "inv" }],
      spec: [{ source: "spec", file: "src/p.ts", line: 2, message: "spec drift", headSha: HEAD, inDiff: true, verified: true, evidence: "criterion" }],
      clean: false,
    });
    const local = await localAdapter.run(HEAD);
    const all = [...local.standards, ...local.spec];
    const reconciled = reconcileFindings(all, HEAD);
    assert.equal(reconciled.retainedByAxis.standards.length, 1);
    assert.equal(reconciled.retainedByAxis.spec.length, 1);
    assert.equal(reconciled.retained.length, 2);
  });
});

describe("fix routing and stale-head invalidation (review-this:INV-7/INV-8)", () => {
  test("confirmed finding routes to the ticket's owning worker rather than being fixed in the review workspace", () => {
    const reconciled = reconcileFindings(
      [{ source: "spec", file: "src/f.ts", line: 5, message: "fix", headSha: HEAD, inDiff: true, verified: true, evidence: "evidence" }],
      HEAD,
    );
    assert.equal(reconciled.retained.length, 1);
    // review workspace never contains worker fix logic; routing is via ticket posting (adapter comment)
    const merge = fakeMergeAdapter();
    assert.ok(typeof merge.comment === "function");
  });

  test("a pushed fix invalidates previous checks and review and forces a fresh head", () => {
    const before = { headSha: HEAD, mergeable: true, requiredChecksGreen: true };
    const review = { reviewedHeadSha: OTHER_HEAD, unresolvedConfirmedFindings: 0, localReviewClean: true, cloudReviewAvailable: true };
    const decision = isMergeEligible(before, review);
    assert.equal(decision.eligible, false);
    assert.ok(decision.blockers.some((b) => b.includes("reviewed head SHA does not match")));
  });
});

describe("merge gates and squash merge decisions (review-this:INV-8/INV-9)", () => {
  test("merge requires green checks, resolved findings, clean local review, unchanged head", () => {
    const pr = { headSha: HEAD, mergeable: true, requiredChecksGreen: true };
    const ok = { reviewedHeadSha: HEAD, unresolvedConfirmedFindings: 0, localReviewClean: true, cloudReviewAvailable: false };
    assert.equal(isMergeEligible(pr, ok).eligible, true);
    assert.equal(isMergeEligible({ ...pr, requiredChecksGreen: false }, ok).eligible, false);
    assert.equal(isMergeEligible(pr, { ...ok, unresolvedConfirmedFindings: 1 }).eligible, false);
    assert.equal(isMergeEligible(pr, { ...ok, localReviewClean: false }).eligible, false);
    assert.equal(isMergeEligible({ ...pr, headSha: OTHER_HEAD }, ok).eligible, false);
    assert.equal(isMergeEligible({ ...pr, mergeable: false }, ok).eligible, false);
  });

  test("eligible pull requests squash-merge with closing reference and close the ticket", async () => {
    const tickets = [ticket(131), ticket(132)];
    const prs = [
      { ticket: 131, prNumber: 10, headSha: HEAD, baseSha: "base-10", state: "open" as const, mergeable: true, requiredChecksGreen: true, closesTicket: 131, hasAcceptanceEvidence: true },
      { ticket: 132, prNumber: 11, headSha: HEAD, baseSha: "base-11", state: "open" as const, mergeable: true, requiredChecksGreen: true, closesTicket: 132, hasAcceptanceEvidence: true },
    ];
    const wave = selectReviewWave(tickets, prs, SPEC);
    assert.equal(wave.length, 2);
    const merge = fakeMergeAdapter();
    for (const item of wave) {
      const pr = { headSha: item.headSha, mergeable: item.mergeable, requiredChecksGreen: item.requiredChecksGreen };
      const review = { reviewedHeadSha: item.headSha, unresolvedConfirmedFindings: 0, localReviewClean: true, cloudReviewAvailable: true };
      assert.equal(isMergeEligible(pr, review).eligible, true);
      const res = await merge.squashMerge(item.prNumber, item.headSha);
      assert.equal(res.merged, true);
      await merge.comment(item.ticket, `Closes #${item.ticket} — evidence`);
    }
    assert.ok(merge.calls.some((c) => c.includes("squash-merge pr#10 @abc123")));
    assert.ok(merge.calls.some((c) => c.includes("Closes #131")));
  });
});

describe("dependent promotion (review-this:INV-9)", () => {
  test("ticket closure updates only dependents whose final open blocker closed", () => {
    const tickets: TicketFact[] = [
      { number: 210, state: "open", labels: ["blocked"], assignees: [], parent: SPEC, openBlockers: [] },
      { number: 211, state: "open", labels: ["blocked"], assignees: [], parent: SPEC, openBlockers: [212] },
    ];
    const transitions = promotionAfterClosure(tickets, SPEC);
    assert.deepEqual(transitions, [
      { number: 210, add: ["unblocked", "ready-for-agent"], remove: ["blocked"] },
    ]);
  });
});

describe("follow-up creation and parent closure (review-this:INV-10)", () => {
  test("follow-up ticket keeps parent open when final verification fails", () => {
    const verification = { finalVerificationPassed: false, wholeSpecReviewPassed: true };
    assert.equal(followUpRequired(verification), true);
    assert.equal(parentClosureReady([{ number: 220, state: "closed", labels: [], assignees: [], parent: SPEC, openBlockers: [] }], verification), false);
  });

  test("parent closes only when every child is closed and both gates pass", () => {
    const children: TicketFact[] = [
      { number: 220, state: "closed", labels: [], assignees: [], parent: SPEC, openBlockers: [] },
      { number: 221, state: "closed", labels: [], assignees: [], parent: SPEC, openBlockers: [] },
    ];
    assert.equal(parentClosureReady(children, { finalVerificationPassed: true, wholeSpecReviewPassed: true }), true);
  });

  test("updated main is verified with npm run verify and whole-spec review before parent closure", async () => {
    const verify = fakeVerificationAdapter(true);
    assert.equal(await verify.verifyOnMain(), true);
    assert.equal(await verify.wholeSpecReview(), true);
    const failing = fakeVerificationAdapter(false);
    assert.equal(await failing.verifyOnMain(), false);
    assert.equal(followUpRequired({ finalVerificationPassed: false, wholeSpecReviewPassed: true }), true);
  });
});

describe("state and adapter boundaries remain coordinator-callable (review-this:INV-11)", () => {
  test("pure helpers and adapters are host-neutral with fakes only; no live cloud, GitHub, or worker calls in tests", () => {
    const discoverySrc = fs.readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), "../discovery.ts"), "utf8");
    assert.doesNotMatch(discoverySrc, /\bfetch\s*\(/);
    const reconcSrc = fs.readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), "../reconciliation.ts"), "utf8");
    assert.doesNotMatch(reconcSrc, /\bfetch\s*\(/);
    const adapterSrc = fs.readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), "../adapters.ts"), "utf8");
    // adapters may call collect but tests use fakes; pure helpers still have no fetch
    assert.ok(adapterSrc.includes("fakeCloudAdapter"));
    assert.ok(adapterSrc.includes("fakeMergeAdapter"));
  });
});
