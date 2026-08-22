// Capability contract for isolated ticket workers (#134, parent #130).
//
// The control workspace dispatches one bounded ticket set through a host
// adapter. Kilo Agent Manager is the preferred adapter; any other host may
// implement the same create, prompt, status, and stop capabilities. Tests
// supply fakes for this interface; no automated test creates real worktrees
// or sessions.

import {
  MAX_ACTIVE_WORKERS,
  retryDecision,
} from "./workflow-state.ts";

export type WorkerStatus = "running" | "failed" | "offline" | "stopped";

export interface WorkerSession {
  id: string;
}

/** One isolated worker: its ticket, worktree, branch, and live session. */
export interface WorkerSlot {
  ticket: number;
  worktree: string;
  branch: string;
  session: WorkerSession;
}

export interface WorkerAdapter {
  readonly name: string;
  createWorktree(ticket: number, branch: string): Promise<string>;
  startSession(worktree: string): Promise<WorkerSession>;
  prompt(session: WorkerSession, message: string): Promise<void>;
  status(session: WorkerSession): Promise<WorkerStatus>;
  stop(session: WorkerSession): Promise<void>;
}

export const PREFERRED_ADAPTER_NAME = "kilo-agent-manager";

/** Pick the preferred adapter when present, else the first available, else null. */
export function selectAdapter(
  available: readonly WorkerAdapter[],
): WorkerAdapter | null {
  return (
    available.find((a) => a.name === PREFERRED_ADAPTER_NAME) ??
    available[0] ??
    null
  );
}

/** Feature branch name for one ticket's isolated worktree. */
export function branchFor(ticket: number): string {
  return `${ticket}`;
}

/**
 * Dispatch one validated ticket set. Returns the live worker slots.
 * Rejects the whole batch before any write when no adapter is available or
 * when the set exceeds the three-worker cap, so execution never half-starts.
 * Live-worker accounting against already-running sessions stays in
 * `validateDispatch`; this boundary enforces the batch cap itself.
 */
export async function dispatchTickets(
  tickets: readonly number[],
  adapter: WorkerAdapter | null,
  renderTemplate: (ticket: number) => string,
): Promise<
  | { ok: true; slots: WorkerSlot[] }
  | { ok: false; reason: string }
> {
  if (adapter === null) {
    return {
      ok: false,
      reason:
        "no worker adapter is available; multi-ticket execution stops before any write",
    };
  }
  if (tickets.length > MAX_ACTIVE_WORKERS) {
    return {
      ok: false,
      reason: `worker cap: at most ${MAX_ACTIVE_WORKERS} ticket workers are active at once`,
    };
  }
  const slots: WorkerSlot[] = [];
  try {
    for (const ticket of tickets) {
      const branch = branchFor(ticket);
      const worktree = await adapter.createWorktree(ticket, branch);
      const session = await adapter.startSession(worktree);
      // Exactly one prompt path: the rendered worker template.
      await adapter.prompt(session, renderTemplate(ticket));
      slots.push({ ticket, worktree, branch, session });
    }
  } catch (error) {
    // Never half-start: stop the workers already running and report a typed
    // refusal instead of letting a mid-batch rejection escape.
    for (const slot of slots) {
      await adapter.stop(slot.session).catch(() => undefined);
    }
    return {
      ok: false,
      reason: `dispatch failed after ${slots.length} started worker(s): ${String(error)}`,
    };
  }
  return { ok: true, slots };
}

/**
 * Reconciled recovery for one failed worker. Checks worker state first so a
 * retry never duplicates artifacts: live or failed sessions are reused on
 * their existing worktree, a stopped or offline handle is replaced with a
 * fresh session on the same isolated worktree, and `retryDecision` retries
 * once before stopping the ticket with `needs-info` on a second failure.
 */
export async function recoverWorker(
  slot: WorkerSlot,
  failuresSoFar: number,
  adapter: WorkerAdapter,
): Promise<
  | { action: "retry"; slot: WorkerSlot; observed: WorkerStatus }
  | { action: "stop-ticket"; addLabels: string[]; observed: WorkerStatus }
> {
  const observed = await adapter.status(slot.session);
  const decision = retryDecision(failuresSoFar);
  if (decision.action === "stop-ticket") {
    await adapter.stop(slot.session);
    return { action: "stop-ticket", addLabels: decision.addLabels, observed };
  }
  if (observed === "stopped" || observed === "offline") {
    // Dead handle: reconcile to a fresh session on the same worktree and
    // branch instead of retrying into a dead session or duplicating artifacts.
    await adapter.stop(slot.session).catch(() => undefined);
    const session = await adapter.startSession(slot.worktree);
    return { action: "retry", slot: { ...slot, session }, observed };
  }
  // Retry reuses the reconciled slot: same ticket, worktree, branch, session.
  return { action: "retry", slot, observed };
}
