// Authored source of the pure workflow state core (#132, parent #130).
// scripts/generate-workflow-state.ts copies this file byte-identical into
// skills/plan-this/, skills/implement-this/, and skills/review-this/ so each
// registry install is self-contained. Edit this file, run the generator, and
// commit both; repository verification fails when a copy drifts.
//
// Purity contract: facts in, decisions out. No imports and no network,
// GitHub, git, filesystem-mutation, or worker-management calls, so a later
// persistent coordinator can reuse the same decisions on any host.

export const MAX_ACTIVE_WORKERS = 3;

export const LABEL_READY_FOR_AGENT = "ready-for-agent";
export const LABEL_BLOCKED = "blocked";
export const LABEL_UNBLOCKED = "unblocked";
export const LABEL_NEEDS_INFO = "needs-info";

export interface TicketFact {
  number: number;
  state: "open" | "closed";
  labels: string[];
  assignees: string[];
  parent: number | null;
  openBlockers: number[];
}

export interface WorkerFact {
  id: string;
  ticket: number;
  status: "running" | "failed" | "offline" | "stopped";
}

export interface PullRequestFact {
  ticket: number;
  headSha: string;
  mergeable: boolean;
  requiredChecksGreen: boolean;
}

export interface ReviewFact {
  reviewedHeadSha: string;
  unresolvedConfirmedFindings: number;
  localReviewClean: boolean;
  cloudReviewAvailable: boolean;
}

export interface FinalVerificationFact {
  finalVerificationPassed: boolean;
  wholeSpecReviewPassed: boolean;
}

export interface LabelTransition {
  number: number;
  add: string[];
  remove: string[];
}

export interface DispatchPlan {
  dispatch: number[];
  violations: string[];
}

export interface RetryDecision {
  action: "retry" | "stop-ticket";
  addLabels: string[];
}

export interface MergeDecision {
  eligible: boolean;
  blockers: string[];
  cloudReview: "available" | "unavailable";
}

function isOpen(ticket: TicketFact): boolean {
  return ticket.state === "open";
}

function hasLabel(ticket: TicketFact, label: string): boolean {
  return ticket.labels.includes(label);
}

export function selectFrontier(
  tickets: readonly TicketFact[],
  spec: number,
): number[] {
  return tickets
    .filter(
      (t) =>
        isOpen(t) &&
        t.parent === spec &&
        t.openBlockers.length === 0 &&
        t.assignees.length === 0 &&
        hasLabel(t, LABEL_READY_FOR_AGENT),
    )
    .map((t) => t.number);
}

export function labelTransitions(
  tickets: readonly TicketFact[],
): LabelTransition[] {
  const transitions: LabelTransition[] = [];
  for (const ticket of tickets) {
    if (!isOpen(ticket)) continue;
    if (ticket.openBlockers.length > 0) {
      const add = hasLabel(ticket, LABEL_BLOCKED) ? [] : [LABEL_BLOCKED];
      const remove = [LABEL_READY_FOR_AGENT, LABEL_UNBLOCKED].filter((label) =>
        hasLabel(ticket, label),
      );
      if (add.length > 0 || remove.length > 0) {
        transitions.push({ number: ticket.number, add, remove });
      }
    } else if (hasLabel(ticket, LABEL_BLOCKED)) {
      const add = [LABEL_UNBLOCKED, LABEL_READY_FOR_AGENT].filter(
        (label) => !hasLabel(ticket, label),
      );
      transitions.push({
        number: ticket.number,
        add,
        remove: [LABEL_BLOCKED],
      });
    } else if (!hasLabel(ticket, LABEL_READY_FOR_AGENT)) {
      transitions.push({
        number: ticket.number,
        add: [LABEL_READY_FOR_AGENT],
        remove: [],
      });
    }
  }
  return transitions;
}

export function validateDispatch(
  requested: readonly number[],
  tickets: readonly TicketFact[],
  workers: readonly WorkerFact[],
  spec: number,
): DispatchPlan {
  const byNumber = new Map(tickets.map((t) => [t.number, t]));
  const activeWorkers = workers.filter((w) => w.status !== "stopped");
  const ownedTickets = new Map(
    activeWorkers.map((w) => [w.ticket, w.id]),
  );
  const capacity = MAX_ACTIVE_WORKERS - activeWorkers.length;
  const seen = new Set<number>();
  const dispatch: number[] = [];
  const violations: string[] = [];

  for (const n of requested) {
    const ticket = byNumber.get(n);
    if (!ticket) {
      violations.push(`#${n} is not among the observed ticket facts`);
      continue;
    }
    if (seen.has(n)) {
      violations.push(`duplicate ownership: #${n} requested twice`);
      continue;
    }
    seen.add(n);
    if (!isOpen(ticket)) {
      violations.push(`#${n} is closed`);
      continue;
    }
    if (ticket.parent !== spec) {
      violations.push(`#${n} does not belong to specification #${spec}`);
      continue;
    }
    if (ticket.openBlockers.length > 0) {
      violations.push(`#${n} has open native blockers`);
      continue;
    }
    if (ticket.assignees.length > 0) {
      violations.push(`#${n} already has an assignee`);
      continue;
    }
    if (!hasLabel(ticket, LABEL_READY_FOR_AGENT)) {
      violations.push(`#${n} does not carry ${LABEL_READY_FOR_AGENT}`);
      continue;
    }
    const ownerId = ownedTickets.get(n);
    if (ownerId !== undefined) {
      violations.push(
        `duplicate ownership: #${n} is already owned by worker ${ownerId}`,
      );
      continue;
    }
    if (dispatch.length >= capacity) {
      violations.push(
        `worker cap: at most ${MAX_ACTIVE_WORKERS} active implementation workers`,
      );
      continue;
    }
    dispatch.push(n);
  }

  return { dispatch, violations };
}

export function retryDecision(failuresSoFar: number): RetryDecision {
  if (failuresSoFar <= 1) {
    return { action: "retry", addLabels: [] };
  }
  return { action: "stop-ticket", addLabels: [LABEL_NEEDS_INFO] };
}

export function reviewIsFresh(
  currentHeadSha: string,
  reviewedHeadSha: string,
): boolean {
  return currentHeadSha === reviewedHeadSha;
}

export function isMergeEligible(
  pullRequest: PullRequestFact,
  review: ReviewFact,
): MergeDecision {
  const blockers: string[] = [];
  if (!pullRequest.requiredChecksGreen) {
    blockers.push("required checks are not green");
  }
  if (review.unresolvedConfirmedFindings > 0) {
    blockers.push("confirmed findings are unresolved");
  }
  if (!review.localReviewClean) {
    blockers.push("local review is not clean");
  }
  if (!reviewIsFresh(pullRequest.headSha, review.reviewedHeadSha)) {
    blockers.push("reviewed head SHA does not match the current head SHA");
  }
  if (!pullRequest.mergeable) {
    blockers.push("pull request is not mergeable");
  }
  return {
    eligible: blockers.length === 0,
    blockers,
    cloudReview: review.cloudReviewAvailable ? "available" : "unavailable",
  };
}

export function promotionAfterClosure(
  tickets: readonly TicketFact[],
): LabelTransition[] {
  return labelTransitions(tickets).filter((t) =>
    t.remove.includes(LABEL_BLOCKED),
  );
}

export function followUpRequired(verification: FinalVerificationFact): boolean {
  return !verification.finalVerificationPassed || !verification.wholeSpecReviewPassed;
}

export function parentClosureReady(
  children: readonly TicketFact[],
  verification: FinalVerificationFact,
): boolean {
  return (
    children.every((child) => child.state === "closed") &&
    !followUpRequired(verification)
  );
}
