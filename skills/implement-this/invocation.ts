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

/**
 * Plan one bounded ticket set. A single reference that is the parent of
 * observed children is a specification input: it selects up to
 * `MAX_ACTIVE_WORKERS` frontier tickets in native child order. Anything else
 * is an explicit set validated against the same gates as the frontier.
 *
 * The specification number always comes from the request, never from fact
 * order: `numbers[0]` on the specification branch, the common observed
 * parent of the requested tickets otherwise.
 */
export function planBoundedSet(
  refs: readonly string[],
  tickets: readonly TicketFact[],
  workers: readonly WorkerFact[],
): { ok: true; dispatch: number[] } | { ok: false; violations: string[] } {
  const malformed = refs.filter((ref) => !/^#?\d+$/.test(ref));
  if (malformed.length > 0) {
    return {
      ok: false,
      violations: malformed.map((ref) => `\`${ref}\` is not a ticket reference`),
    };
  }

  const numbers = parseInvocation(refs);

  let requested: number[];
  let spec: number;
  if (numbers.length === 1 && tickets.some((t) => t.parent === numbers[0])) {
    // Parent-specification input: native child order comes from fact order.
    spec = numbers[0];
    const frontier = selectFrontier(tickets, spec);
    requested = frontier.slice(0, MAX_ACTIVE_WORKERS);
  } else {
    requested = numbers;
    const parents = new Set(
      tickets
        .filter((t) => requested.includes(t.number))
        .map((t) => t.parent),
    );
    if (parents.size === 1 && !parents.has(null)) {
      spec = [...parents][0] as number;
    } else {
      // No common observed parent: validation reports the out-of-parent set.
      spec = 0;
    }
  }

  const plan = validateDispatch(requested, tickets, workers, spec);
  if (plan.violations.length > 0) {
    return { ok: false, violations: plan.violations };
  }
  return { ok: true, dispatch: plan.dispatch };
}
