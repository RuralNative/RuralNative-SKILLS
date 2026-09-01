// Discovery of the current pull-request review wave (#135, parent #130;
// amended for target resolution and readiness by #156, parent #152).
//
// Pure decisions over observed GitHub facts: native child tickets, linked
// pull requests, blockers, checks, reviews, and current head SHAs. No network,
// GitHub, git, filesystem mutation, or worker-management calls.

import type { TicketFact } from "./workflow-state.ts";

export const LABEL_NEEDS_INFO = "needs-info";

export interface PullRequestLink {
  ticket: number;
  prNumber: number;
  headSha: string;
  baseSha: string;
  state: "open" | "closed" | "merged";
  mergeable: boolean;
  requiredChecksGreen: boolean;
  /** The ticket number of the PR's valid closing reference, or null. */
  closesTicket: number | null;
  /** Posted implementation acceptance evidence on the current head. */
  hasAcceptanceEvidence: boolean;
  /**
   * Requirements revision the implementation evidence pinned (ticket #190).
   * Absent on evidence posted before the revision contract existed; the
   * session compares only when a pin is present.
   */
  requirementsRevision?: string;
}

export interface ReviewedRevision {
  prNumber: number;
  headSha: string;
  baseSha: string;
}

export interface ReviewWaveItem {
  ticket: number;
  prNumber: number;
  headSha: string;
  baseSha: string;
  mergeable: boolean;
  requiredChecksGreen: boolean;
  /** Same requirements revision the dispatch packet carried (ticket #190). */
  requirementsRevision?: string;
}

/**
 * Select only the current review wave from the observed facts.
 *
 * The wave is every open pull request whose ticket is an open child of the
 * parent specification, is not stopped with `needs-info`, carries a valid
 * closing reference back to its own ticket, and has posted implementation
 * acceptance evidence. Readiness never comes from `ready-for-human`, which
 * keeps its triage meaning. Pull requests whose head and base revisions both
 * match an already-reviewed revision pair are not selected twice; a pull
 * request created after invocation enters the wave on rediscovery. Order
 * follows the native child order (fact order), matching `selectFrontier` in
 * the shared state core.
 */
export function selectReviewWave(
  tickets: readonly TicketFact[],
  prLinks: readonly PullRequestLink[],
  spec: number,
  previouslyReviewed: readonly ReviewedRevision[] = [],
): ReviewWaveItem[] {
  const ticketByNumber = new Map(tickets.map((t) => [t.number, t]));
  const reviewed = new Set(
    previouslyReviewed.map((r) => `${r.prNumber}:${r.headSha}:${r.baseSha}`),
  );
  const openClosingPullRequests = new Map<number, number>();
  for (const pr of prLinks) {
    if (pr.state === "open" && pr.closesTicket === pr.ticket) {
      openClosingPullRequests.set(
        pr.ticket,
        (openClosingPullRequests.get(pr.ticket) ?? 0) + 1,
      );
    }
  }
  const wave: ReviewWaveItem[] = [];
  for (const pr of prLinks) {
    if (pr.state !== "open") continue;
    const ticket = ticketByNumber.get(pr.ticket);
    if (!ticket) continue;
    if (ticket.parent !== spec) continue;
    if (ticket.state !== "open") continue;
    if (ticket.labels.includes(LABEL_NEEDS_INFO)) continue;
    if (pr.closesTicket !== pr.ticket) continue;
    if (openClosingPullRequests.get(pr.ticket) !== 1) continue;
    if (pr.headSha.trim() === "" || pr.baseSha.trim() === "") continue;
    if (!pr.hasAcceptanceEvidence) continue;
    if (reviewed.has(`${pr.prNumber}:${pr.headSha}:${pr.baseSha}`)) continue;
    wave.push({
      ticket: pr.ticket,
      prNumber: pr.prNumber,
      headSha: pr.headSha,
      baseSha: pr.baseSha,
      mergeable: pr.mergeable,
      requiredChecksGreen: pr.requiredChecksGreen,
      requirementsRevision: pr.requirementsRevision,
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
