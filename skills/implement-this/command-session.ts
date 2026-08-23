// Command-session lifecycle decisions (#155, parent spec #152, ADR-0019).
//
// Pure: facts in, decisions out. No network, GitHub, git, filesystem-mutation,
// or Agent Manager calls. The command session applies these decisions itself
// through its host tools — in Kilo Code, the `agent_manager` tool — and tests
// feed them captured facts only; no test touches a live Agent Manager
// workspace.

import { MAX_ACTIVE_WORKERS } from "./workflow-state.ts";

/**
 * Workspace-wide cap on active managed workers across all stages, counted
 * from Agent Manager's current overview before any spawn (ADR-0019).
 */
export const MAX_MANAGED_WORKERS = 4;

/** Milliseconds without progress before a command session checkpoints. */
export const CHECKPOINT_AFTER_MS = 30 * 60 * 1000;

/** Increasing poll delays in milliseconds; the last value repeats. */
export const POLL_DELAYS_MS: readonly number[] = [
  30_000,
  60_000,
  120_000,
  300_000,
  600_000,
];

/** Poll delay for the Nth quiet poll, increasing until the schedule tops out. */
export function nextPollDelay(quietPollsSoFar: number): number {
  const index = Math.max(0, Math.min(quietPollsSoFar, POLL_DELAYS_MS.length - 1));
  return POLL_DELAYS_MS[index];
}

/** True once the workspace has been silent long enough to checkpoint. */
export function checkpointDue(silentForMs: number): boolean {
  return silentForMs >= CHECKPOINT_AFTER_MS;
}

export interface ManagedWorkerFact {
  id: string;
  finished: boolean;
}

/** Every unfinished active managed worker observed in the workspace. */
export function activeManagedWorkers(
  workers: readonly ManagedWorkerFact[],
): ManagedWorkerFact[] {
  return workers.filter((w) => !w.finished);
}

export interface AgentManagerTaskPlan {
  ticket: number;
  task: { prompt: string };
}

/** Builds one host-neutral Agent Manager task and prompt for each ticket. */
export function planAgentManagerTasks(
  tickets: readonly number[],
  renderedTemplate: string,
): AgentManagerTaskPlan[] {
  return tickets.map((ticket) => ({
    ticket,
    task: { prompt: renderedTemplate.replace("Issue #0", `Issue #${ticket}`) },
  }));
}

/**
 * Free worker slots under both caps: `MAX_ACTIVE_WORKERS` implementation
 * workers for this stage and `MAX_MANAGED_WORKERS` total managed workers in
 * the workspace. Unrelated active workers consume global capacity.
 */
export function spawnCapacity(
  implementationActive: number,
  workspaceActive: number,
): { ok: true; slots: number } | { ok: false; reason: string } {
  const stageFree = MAX_ACTIVE_WORKERS - implementationActive;
  const workspaceFree = MAX_MANAGED_WORKERS - workspaceActive;
  if (stageFree <= 0) {
    return {
      ok: false,
      reason: `worker cap: at most ${MAX_ACTIVE_WORKERS} implementation workers are active at once`,
    };
  }
  if (workspaceFree <= 0) {
    return {
      ok: false,
      reason: `workspace worker cap: at most ${MAX_MANAGED_WORKERS} managed workers are active across all stages`,
    };
  }
  return { ok: true, slots: Math.min(stageFree, workspaceFree) };
}

/**
 * Edit-overlap collision from planning's parallel-safety data: overlapping
 * affected paths mean the ticket waits for a free slot. Waiting never gains a
 * native dependency edge.
 */
export function schedulingCollision(
  ticketPaths: readonly string[],
  runningWorkerPaths: readonly string[],
): boolean {
  const running = new Set(runningWorkerPaths);
  return ticketPaths.some((p) => running.has(p));
}

export interface DeliveryFact {
  pullRequestOpen: boolean;
  closingReferenceValid: boolean;
  acceptanceEvidencePosted: boolean;
}

/**
 * Durable delivery lives entirely on GitHub: an open pull request with a
 * valid closing reference and posted acceptance evidence. An idle worker
 * alone never completes a ticket.
 */
export function isDelivered(fact: DeliveryFact): boolean {
  return (
    fact.pullRequestOpen &&
    fact.closingReferenceValid &&
    fact.acceptanceEvidencePosted
  );
}

export interface ReservationFact extends DeliveryFact {
  assignees: readonly string[];
  featureBranchExists: boolean;
  liveWorkerSession: boolean;
}

export type ResumeAction =
  | { action: "reserve"; claimTicket: true }
  | {
      action: "resume-worker";
      reuseFeatureBranch: boolean;
      reuseLiveSession: boolean;
    }
  | { action: "delivery-durable" };

/**
 * What one ticket needs after interruption or resume. Nothing here creates a
 * second assignee, branch, session, pull request, or comment: reserved work
 * reuses what exists, and durable delivery is left alone.
 */
export function resumeAction(fact: ReservationFact): ResumeAction {
  if (isDelivered(fact)) {
    return { action: "delivery-durable" };
  }
  if (fact.assignees.length === 0) {
    return { action: "reserve", claimTicket: true };
  }
  return {
    action: "resume-worker",
    reuseFeatureBranch: fact.featureBranchExists,
    reuseLiveSession: fact.liveWorkerSession,
  };
}

export type WorktreeOutcome = "removed" | "cleanup-pending" | "preserved-for-diagnosis";

export interface CleanupFact {
  /** The pull request and acceptance evidence are durable on GitHub. */
  deliveredEvidenceDurable: boolean;
  /** The ticket is stopped with `needs-info`. */
  stoppedWithNeedsInfo: boolean;
  /** The host supports safe managed worktree closure. */
  hostClosesWorktrees: boolean;
}

/**
 * Closure for one finished worker. Sessions always stop; only successful
 * durable work becomes eligible for removal, and only when the host can
 * close worktrees through a supported action. Failed worktrees stay on disk
 * for diagnosis, and unsupported hosts leave the worktree in place as
 * `cleanup-pending` — never deleted behind Agent Manager.
 */
export function cleanupDecision(fact: CleanupFact): {
  stopSession: true;
  removeWorktree: boolean;
  report: WorktreeOutcome;
} {
  if (fact.stoppedWithNeedsInfo || !fact.deliveredEvidenceDurable) {
    return {
      stopSession: true,
      removeWorktree: false,
      report: "preserved-for-diagnosis",
    };
  }
  if (fact.deliveredEvidenceDurable && fact.hostClosesWorktrees) {
    return { stopSession: true, removeWorktree: true, report: "removed" };
  }
  return {
    stopSession: true,
    removeWorktree: false,
    report: "cleanup-pending",
  };
}
