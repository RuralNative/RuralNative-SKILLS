// review-this:INV-5 — discovery selects only the current review wave.
// Pure facts only; no network, GitHub, or worker calls.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { selectReviewWave, LABEL_READY_FOR_HUMAN } from "../discovery.ts";
import type { TicketFact } from "../workflow-state.ts";
import type { PullRequestLink } from "../discovery.ts";

const SPEC = 130;

function ticket(overrides: Partial<TicketFact> & { number: number }): TicketFact {
  return {
    state: "open",
    labels: [LABEL_READY_FOR_HUMAN],
    assignees: [],
    parent: SPEC,
    openBlockers: [],
    ...overrides,
  };
}

function pr(overrides: Partial<PullRequestLink> & { ticket: number; prNumber: number }): PullRequestLink {
  return {
    headSha: `head-${overrides.prNumber}`,
    state: "open",
    mergeable: true,
    requiredChecksGreen: true,
    ...overrides,
  };
}

describe("selectReviewWave", () => {
  test("selects open PRs for open children with ready-for-human in native child order", () => {
    const tickets = [ticket({ number: 131 }), ticket({ number: 132 }), ticket({ number: 133 })];
    const prs = [pr({ ticket: 132, prNumber: 2 }), pr({ ticket: 131, prNumber: 1 }), pr({ ticket: 133, prNumber: 3 })];
    const wave = selectReviewWave(tickets, prs, SPEC);
    assert.deepEqual(wave.map((w) => w.ticket), [131, 132, 133]);
    assert.deepEqual(wave.map((w) => w.headSha), ["head-1", "head-2", "head-3"]);
  });

  test("rejects closed PR, wrong parent, closed ticket, needs-info, missing ready-for-human, and ticketless PR", () => {
    const tickets = [
      ticket({ number: 140 }),
      ticket({ number: 141, parent: 999 }),
      ticket({ number: 142, state: "closed" }),
      ticket({ number: 143, labels: ["needs-info", LABEL_READY_FOR_HUMAN] }),
      ticket({ number: 144, labels: ["ready-for-agent"] }),
    ];
    const prs = [
      pr({ ticket: 140, prNumber: 10, state: "closed" }),
      pr({ ticket: 141, prNumber: 11 }),
      pr({ ticket: 142, prNumber: 12 }),
      pr({ ticket: 143, prNumber: 13 }),
      pr({ ticket: 144, prNumber: 14 }),
      pr({ ticket: 999, prNumber: 15 }),
    ];
    const wave = selectReviewWave(tickets, prs, SPEC);
    assert.deepEqual(wave, []);
  });

  test("preserves native child order even when PRs arrive out of order", () => {
    const tickets = [ticket({ number: 10 }), ticket({ number: 20 }), ticket({ number: 30 })];
    const prs = [pr({ ticket: 30, prNumber: 3 }), pr({ ticket: 10, prNumber: 1 }), pr({ ticket: 20, prNumber: 2 })];
    const wave = selectReviewWave(tickets, prs, SPEC);
    assert.deepEqual(wave.map((w) => w.ticket), [10, 20, 30]);
  });

  test("does not include PRs for tickets that are not children of the spec", () => {
    const tickets = [ticket({ number: 150, parent: 130 }), ticket({ number: 151, parent: 999 })];
    const prs = [pr({ ticket: 150, prNumber: 1 }), pr({ ticket: 151, prNumber: 2 })];
    const wave = selectReviewWave(tickets, prs, SPEC);
    assert.deepEqual(wave.map((w) => w.ticket), [150]);
  });

  test("performs no network calls and is pure", () => {
    const src = fs.readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), "../discovery.ts"), "utf8");
    assert.doesNotMatch(src, /\bfetch\s*\(/);
    assert.doesNotMatch(src, /\bXMLHttpRequest\b/);
    assert.doesNotMatch(src, /\bprocess\.env\b/);
    assert.doesNotMatch(src, /\brequire\s*\(/);
  });
});
