// Discovery of the current pull-request review wave (#135, parent #130).
//
// Pure decisions over observed GitHub facts: native child tickets, linked
// pull requests, blockers, checks, reviews, and current head SHAs. No network,
// GitHub, git, filesystem mutation, or worker-management calls, so a later
// persistent coordinator can reuse the same decision on any host.

import type { TicketFact } from "./workflow-state.ts";

export const LABEL_READY_FOR_HUMAN = "ready-for-human";

export interface PullRequestLink {
  ticket: number;
  prNumber: number;
  headSha: string;
  state: "open" | "closed" | "merged";
  mergeable: boolean;
  requiredChecksGreen: boolean;
}

export interface ReviewWaveItem {
  ticket: number;
  prNumber: number;
  headSha: string;
  mergeable: boolean;
  requiredChecksGreen: boolean;
}

/**
 * Select only the current review wave from the observed facts.
 *
 * The wave is every open pull request whose ticket is an open child of the
 * parent specification, carries `ready-for-human` (delivery evidence from
 * `implement-this`), and is not stopped with `needs-info`. Order follows the
 * native child order (fact order), matching `selectFrontier` in the shared
 * state core.
 */
export function selectReviewWave(
  tickets: readonly TicketFact[],
  prLinks: readonly PullRequestLink[],
  spec: number,
): ReviewWaveItem[] {
  const ticketByNumber = new Map(tickets.map((t) => [t.number, t]));
  const wave: ReviewWaveItem[] = [];
  for (const pr of prLinks) {
    if (pr.state !== "open") continue;
    const ticket = ticketByNumber.get(pr.ticket);
    if (!ticket) continue;
    if (ticket.parent !== spec) continue;
    if (ticket.state !== "open") continue;
    if (ticket.labels.includes("needs-info")) continue;
    if (!ticket.labels.includes(LABEL_READY_FOR_HUMAN)) continue;
    wave.push({
      ticket: pr.ticket,
      prNumber: pr.prNumber,
      headSha: pr.headSha,
      mergeable: pr.mergeable,
      requiredChecksGreen: pr.requiredChecksGreen,
    });
  }
  // Preserve native child order: sort by ticket appearance in the tickets array.
  const order = new Map(tickets.map((t, i) => [t.number, i]));
  wave.sort((a, b) => (order.get(a.ticket) ?? 0) - (order.get(b.ticket) ?? 0));
  return wave;
}

export function isReviewWaveEmpty(wave: readonly ReviewWaveItem[]): boolean {
  return wave.length === 0;
}
