// Invocation parsing and bounded-set planning (#134, parent #130).
//
// Turns the requested references into one validated ticket set using only
// the pure workflow state core: a parent specification selects up to three
// current frontier tickets in native child order; explicit ticket inputs are
// validated before any claim or edit. Facts in, decisions out.

import {
  MAX_ACTIVE_WORKERS,
  selectFrontier,
  validateDispatch,
  type TicketFact,
  type WorkerFact,
} from "./workflow-state.ts";

/** The requested references, parsed from `#<n>` forms. */
export function parseInvocation(
  refs: readonly string[],
): number[] {
  return refs.map((ref) => Number(ref.replace(/^#/, "")));
}

function inferSpec(tickets: readonly TicketFact[]): number {
  for (const t of tickets) {
    if (t.parent !== null) return t.parent;
  }
  return 0;
}

/**
 * Plan one bounded ticket set. A single reference that is the parent of
 * observed children is a specification input: it selects up to
 * `MAX_ACTIVE_WORKERS` frontier tickets in native child order. Anything else
 * is an explicit set validated against the same gates as the frontier.
 */
export function planBoundedSet(
  refs: readonly string[],
  tickets: readonly TicketFact[],
  workers: readonly WorkerFact[],
): { ok: true; dispatch: number[] } | { ok: false; violations: string[] } {
  const numbers = parseInvocation(refs);
  const spec = inferSpec(tickets);

  let requested: number[];
  if (numbers.length === 1 && tickets.some((t) => t.parent === numbers[0])) {
    // Parent-specification input: native child order comes from fact order.
    const frontier = selectFrontier(tickets, numbers[0]);
    requested = frontier.slice(0, MAX_ACTIVE_WORKERS);
  } else {
    requested = numbers;
  }

  const plan = validateDispatch(requested, tickets, workers, spec);
  if (plan.violations.length > 0) {
    return { ok: false, violations: plan.violations };
  }
  return { ok: true, dispatch: plan.dispatch };
}
