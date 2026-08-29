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
  /** Whether an Agent Manager worktree for this ticket still exists. */
  worktreeExists: boolean;
  liveWorkerSession: boolean;
  /** Worktree path reported for a missing-session recovery (ADR-0023). */
  worktreePath?: string;
  /** Branch name reported for a missing-session recovery (ADR-0023). */
  branchName?: string;
}

export type ResumeAction =
  | { action: "reserve"; claimTicket: true }
  | {
      action: "resume-worker";
      reuseFeatureBranch: boolean;
      reuseLiveSession: boolean;
    }
  | {
      action: "recovery-required";
      /** Observed worktree path; undefined when the host did not report it. */
      worktreePath?: string;
      /** Observed branch name; undefined when the host did not report it. */
      branchName?: string;
    }
  | { action: "delivery-durable" };

/**
 * What one ticket needs after interruption or resume. Nothing here creates a
 * second assignee, branch, session, pull request, or comment: reserved work
 * reuses what exists, durable delivery is left alone, and an existing worktree
 * whose session disappeared is a named recovery state instead of a duplicate
 * worktree (ADR-0023).
 */
export function resumeAction(fact: ReservationFact): ResumeAction {
  if (isDelivered(fact)) {
    return { action: "delivery-durable" };
  }
  if (fact.assignees.length === 0) {
    return { action: "reserve", claimTicket: true };
  }
  if (fact.worktreeExists && !fact.liveWorkerSession) {
    return {
      action: "recovery-required",
      worktreePath: fact.worktreePath,
      branchName: fact.branchName,
    };
  }
  // `worktreeExists` absent (a pre-ADR-0023 fact) cannot prove there is no
  // worktree, so a sessionless worker never reuses a missing session: report
  // recovery-required without an invented location instead of resuming blind.
  if (fact.worktreeExists === undefined && !fact.liveWorkerSession) {
    return {
      action: "recovery-required",
      worktreePath: undefined,
      branchName: undefined,
    };
  }
  return {
    action: "resume-worker",
    reuseFeatureBranch: fact.featureBranchExists,
    reuseLiveSession: fact.liveWorkerSession,
  };
}

export type LifecycleOutcome =
  | "running"
  | "interrupted"
  | "offline"
  | "failed"
  | "blocked"
  | "needs-info"
  | "succeeded";

export type WorktreeOutcome =
  | "removed"
  | "cleanup-pending"
  | "preserved-for-resume"
  | "preserved-for-diagnosis";

export interface CleanupFact {
  /** Terminal lifecycle outcome of the worker (ADR-0023). */
  lifecycleOutcome: LifecycleOutcome;
  /** The managed worktree has no uncommitted changes. */
  worktreeClean: boolean;
  /** Local worktree `HEAD`. */
  localHeadSha: string;
  /** Remote feature-branch `HEAD`. */
  remoteBranchSha: string;
  /** The pull-request head SHA. */
  pullRequestHeadSha: string;
  pullRequestOpen: boolean;
  closingReferenceValid: boolean;
  acceptanceEvidencePosted: boolean;
  /** The host supports safe managed worktree closure. */
  hostClosesWorktrees: boolean;
}

function nonEmptySha(sha: string): boolean {
  return sha.trim() !== "";
}

/**
 * Exact source recovery evidence: the successful worker is terminal, the
 * worktree is clean, and the local `HEAD`, the remote feature branch, and the
 * pull-request head are one non-empty SHA. Missing SHAs fail closed (ADR-0023).
 */
export function exactRecovery(fact: CleanupFact): boolean {
  if (fact.lifecycleOutcome !== "succeeded") return false;
  if (!fact.worktreeClean) return false;
  if (
    !nonEmptySha(fact.localHeadSha) ||
    !nonEmptySha(fact.remoteBranchSha) ||
    !nonEmptySha(fact.pullRequestHeadSha)
  ) {
    return false;
  }
  return (
    fact.localHeadSha === fact.remoteBranchSha &&
    fact.remoteBranchSha === fact.pullRequestHeadSha
  );
}

/**
 * Closure for one finished worker (ADR-0023). `stopSession` is a real decision
 * and defaults to false: a running, interrupted, failed, dirty, unpushed,
 * SHA-mismatched, missing-PR, missing-evidence, or `needs-info` worker keeps
 * its session and worktree. The command session may stop a session and ask the
 * host to remove the worktree only after `exactRecovery` and the durable
 * delivery facts both pass. On hosts that cannot close managed worktrees the
 * stopped, remotely recoverable worker reports `cleanup-pending`; everything
 * else reports `preserved-for-resume` or `preserved-for-diagnosis` and is
 * never stopped.
 */
export function cleanupDecision(fact: CleanupFact): {
  stopSession: boolean;
  removeWorktree: boolean;
  report: WorktreeOutcome;
} {
  if (
    fact.lifecycleOutcome === "needs-info" ||
    fact.lifecycleOutcome === "failed" ||
    fact.lifecycleOutcome === "blocked" ||
    fact.lifecycleOutcome === "offline"
  ) {
    return {
      stopSession: false,
      removeWorktree: false,
      report: "preserved-for-diagnosis",
    };
  }
  if (fact.lifecycleOutcome !== "succeeded") {
    return {
      stopSession: false,
      removeWorktree: false,
      report: "preserved-for-resume",
    };
  }
  const delivered = isDelivered(fact);
  const recoverable = exactRecovery(fact);
  if (!delivered || !recoverable) {
    return {
      stopSession: false,
      removeWorktree: false,
      report: "preserved-for-resume",
    };
  }
  if (fact.hostClosesWorktrees) {
    return { stopSession: true, removeWorktree: true, report: "removed" };
  }
  return {
    stopSession: true,
    removeWorktree: false,
    report: "cleanup-pending",
  };
}
