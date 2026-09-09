// Host contracts for the single-PR final stage (ADR-0035).
//
// Host-neutral interfaces for GitHub facts, merge, label/closure, review
// observation, and publication. Tests supply fakes and never call live
// GitHub. No review invocation, CI polling, or privileged merge adapters.

export interface FixPullRequestFacts {
  prNumber: number;
  repository: string;
  state: "open" | "closed" | "merged";
  draft: boolean;
  baseBranch: string;
  headBranch: string;
  headRef: string;
  headSha: string;
  baseSha: string;
  mergeable: boolean;
  mergeCommitSha: string;
  closesTicket: number | null;
  fork: boolean;
}

export interface FixSelectedReview {
  reviewId: string;
  reviewAuthor: string;
  reviewerPermission: "policy" | "write" | "maintain" | "admin" | "unknown";
  reviewedCommit: string;
  reviewedAt: string;
  sourceUrl: string;
  completed: boolean;
  dismissed: boolean;
  reviewBody: string;
  commentIds: readonly string[];
}

/** Observed fix-progress checkpoint comment in the PR thread. */
export interface FixProgressComment {
  /** Full comment body carrying the checkpoint block. */
  body: string;
  /** Native author login of the comment; `null` when not observable. */
  author: string | null;
}

export interface FixGitHubAdapter {
  readonly name: string;
  fetchPullRequest(prNumber: number): Promise<FixPullRequestFacts | null>;
  fetchSelectedReview(prNumber: number): Promise<FixSelectedReview | null>;
  fetchRequirementBodies(ticket: number, parent: number | null): Promise<{ parentBody: string; ticketBody: string } | null>;
  /**
   * Read the fix-progress checkpoint comment from the PR thread, if any.
   * Returns the body together with the observed native comment author so the
   * entry gate can reject forged checkpoint authorship; never a bare body.
   */
  fetchFixProgress(prNumber: number): Promise<FixProgressComment | null>;
}

export interface FixPublishAdapter {
  readonly name: string;
  publishFixProgress(prNumber: number, body: string): Promise<void>;
  updateImplementationEvidence(prNumber: number, body: string): Promise<void>;
  squashMerge(prNumber: number, expectedHeadSha: string): Promise<{ merged: boolean; mergeCommitSha: string; rejection: string }>;
  closeTicket(ticket: number, reason: string): Promise<void>;
  updateLabels(issue: number, add: readonly string[], remove: readonly string[]): Promise<void>;
}

export interface FixVerificationAdapter {
  readonly name: string;
  runFocusedChecks(commands: readonly string[]): Promise<{ passed: boolean; output: string }>;
}

/**
 * A squash merge counts only when the host reports merged with a merge
 * commit. A rejected merge is a restriction report, never completion, and
 * never authorizes an override.
 */
export function isConfirmedMerge(result: { merged: boolean; mergeCommitSha: string }): boolean {
  return result.merged === true && result.mergeCommitSha.trim() !== "";
}
