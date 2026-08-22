// Capability contract for isolated ticket workers (#134, parent #130).
//
// The control workspace dispatches one bounded ticket set through a host
// adapter. Kilo Agent Manager is the preferred adapter; any other host may
// implement the same create, prompt, status, and stop capabilities. Tests
// supply fakes for this interface; no automated test creates real worktrees
// or sessions.

export type WorkerStatus = "running" | "failed" | "offline" | "stopped";

export interface WorkerSession {
  id: string;
}

export interface WorkerAdapter {
  readonly name: string;
  createWorktree(ticket: number, branch: string): Promise<string>;
  startSession(worktree: string, prompt: string): Promise<WorkerSession>;
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
 * Rejects the whole batch before any write when no adapter is available,
 * so multi-ticket execution never half-starts without isolation.
 */
export async function dispatchTickets(
  tickets: readonly number[],
  adapter: WorkerAdapter | null,
  renderPrompt: (ticket: number) => string,
): Promise<
  | { ok: true; slots: Array<{ ticket: number; worktree: string; branch: string; session: WorkerSession }> }
  | { ok: false; reason: string }
> {
  if (adapter === null) {
    return {
      ok: false,
      reason:
        "no worker adapter is available; multi-ticket execution stops before any write",
    };
  }
  const slots: Array<{
    ticket: number;
    worktree: string;
    branch: string;
    session: WorkerSession;
  }> = [];
  for (const ticket of tickets) {
    const branch = branchFor(ticket);
    const worktree = await adapter.createWorktree(ticket, branch);
    const session = await adapter.startSession(worktree, renderPrompt(ticket));
    await adapter.prompt(session, `implement ticket #${ticket}`);
    slots.push({ ticket, worktree, branch, session });
  }
  return { ok: true, slots };
}
