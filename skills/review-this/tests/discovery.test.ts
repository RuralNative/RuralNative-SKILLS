// review-this:INV-5 — discovery selects only the current review wave.
// Pure facts only; no network, GitHub, or worker calls.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { selectReviewWave } from "../discovery.ts";
import type { TicketFact } from "../workflow-state.ts";
import type { PullRequestLink, ReviewedRevision } from "../discovery.ts";

const SPEC = 130;

function ticket(overrides: Partial<TicketFact> & { number: number }): TicketFact {
  return {
    state: "open",
    labels: [],
    assignees: [],
    parent: SPEC,
    openBlockers: [],
    ...overrides,
  };
}

function pr(overrides: Partial<PullRequestLink> & { ticket: number; prNumber: number }): PullRequestLink {
  return {
    headSha: `head-${overrides.prNumber}`,
    baseSha: `base-${overrides.prNumber}`,
    state: "open",
    mergeable: true,
    requiredChecksGreen: true,
    closesTicket: overrides.ticket,
    hasAcceptanceEvidence: true,
    ...overrides,
  };
}

describe("selectReviewWave", () => {
  test("selects open PRs with valid closing references and acceptance evidence in native child order", () => {
    const tickets = [ticket({ number: 131 }), ticket({ number: 132 }), ticket({ number: 133 })];
    const prs = [pr({ ticket: 132, prNumber: 2 }), pr({ ticket: 131, prNumber: 1 }), pr({ ticket: 133, prNumber: 3 })];
    const wave = selectReviewWave(tickets, prs, SPEC);
    assert.deepEqual(wave.map((w) => w.ticket), [131, 132, 133]);
    assert.deepEqual(wave.map((w) => w.headSha), ["head-1", "head-2", "head-3"]);
    assert.deepEqual(wave.map((w) => w.baseSha), ["base-1", "base-2", "base-3"]);
  });

  test("rejects closed PR, wrong parent, closed ticket, needs-info, missing closing reference, missing evidence, and ticketless PR", () => {
    const tickets = [
      ticket({ number: 140 }),
      ticket({ number: 141, parent: 999 }),
      ticket({ number: 142, state: "closed" }),
      ticket({ number: 143, labels: ["needs-info"] }),
    ];
    const prs = [
      pr({ ticket: 140, prNumber: 10, state: "closed" }),
      pr({ ticket: 141, prNumber: 11 }),
      pr({ ticket: 142, prNumber: 12 }),
      pr({ ticket: 143, prNumber: 13 }),
      pr({ ticket: 145, prNumber: 15 }),
      pr({ ticket: 146, prNumber: 16, closesTicket: null }),
      pr({ ticket: 147, prNumber: 17, hasAcceptanceEvidence: false }),
      pr({ ticket: 999, prNumber: 18 }),
    ];
    const wave = selectReviewWave(tickets, prs, SPEC);
    assert.deepEqual(wave, []);
  });

  test("never uses ready-for-human as pull-request readiness", () => {
    const tickets = [ticket({ number: 150, labels: ["ready-for-human"] })];
    const prs = [pr({ ticket: 150, prNumber: 1 })];
    const withLabel = selectReviewWave(tickets, prs, SPEC);
    assert.deepEqual(withLabel.map((w) => w.ticket), [150], "readiness comes from PR facts, not the label");
    const withoutLabel = selectReviewWave(
      [ticket({ number: 150 })],
      prs,
      SPEC,
    );
    assert.deepEqual(withoutLabel.map((w) => w.ticket), [150]);
  });

  test("does not select several valid pull requests for one child", () => {
    const tickets = [ticket({ number: 150 })];
    const prs = [
      pr({ ticket: 150, prNumber: 1 }),
      pr({ ticket: 150, prNumber: 2 }),
    ];
    assert.deepEqual(selectReviewWave(tickets, prs, SPEC), []);
  });

  test("preserves native child order even when PRs arrive out of order", () => {
    const tickets = [ticket({ number: 10 }), ticket({ number: 20 }), ticket({ number: 30 })];
    const prs = [pr({ ticket: 30, prNumber: 3 }), pr({ ticket: 10, prNumber: 1 }), pr({ ticket: 20, prNumber: 2 })];
    const wave = selectReviewWave(tickets, prs, SPEC);
    assert.deepEqual(wave.map((w) => w.ticket), [10, 20, 30]);
  });

  test("does not include PRs for tickets that are not children of the spec", () => {
    const tickets = [ticket({ number: 160, parent: 130 }), ticket({ number: 161, parent: 999 })];
    const prs = [pr({ ticket: 160, prNumber: 1 }), pr({ ticket: 161, prNumber: 2 })];
    const wave = selectReviewWave(tickets, prs, SPEC);
    assert.deepEqual(wave.map((w) => w.ticket), [160]);
  });

  test("rediscovery includes later PRs and changed revisions but skips an unchanged reviewed pair", () => {
    const tickets = [ticket({ number: 170 }), ticket({ number: 171 })];
    const prs = [pr({ ticket: 170, prNumber: 1 }), pr({ ticket: 171, prNumber: 2 })];
    const reviewed: ReviewedRevision[] = [
      { prNumber: 1, headSha: "head-1", baseSha: "base-1" },
    ];
    const wave = selectReviewWave(tickets, prs, SPEC, reviewed);
    assert.deepEqual(wave.map((w) => w.prNumber), [2], "unchanged reviewed head-and-base pair is not selected twice");
    const movedHead = [pr({ ticket: 170, prNumber: 1, headSha: "head-1b" }), pr({ ticket: 171, prNumber: 2 })];
    assert.deepEqual(
      selectReviewWave(tickets, movedHead, SPEC, reviewed).map((w) => w.prNumber),
      [1, 2],
      "a moved revision re-enters the wave",
    );
    const later = [...prs, pr({ ticket: 171, prNumber: 9, headSha: "head-9" })];
    assert.ok(
      selectReviewWave(tickets, later, SPEC, reviewed).some((w) => w.prNumber === 9),
      "a PR created after invocation enters the wave",
    );
  });

  test("performs no network calls and is pure", () => {
    const src = fs.readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), "../discovery.ts"), "utf8");
    assert.doesNotMatch(src, /\bfetch\s*\(/);
    assert.doesNotMatch(src, /\bXMLHttpRequest\b/);
    assert.doesNotMatch(src, /\bprocess\.env\b/);
    assert.doesNotMatch(src, /\brequire\s*\(/);
  });
});
