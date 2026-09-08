// Host contracts for the single pull-request review (review-only).
//
// Host-neutral interfaces for GitHub facts, required checks, and review
// publication. No fixes, merge, label, promotion, or closure adapters. No
// cloud review, no local-review adapter, no wave orchestration. Tests supply
// fakes and never call live GitHub.

import type { PullRequestLink } from "./discovery.ts";

export interface GitHubAdapter {
  readonly name: string;
  fetchPullRequest(prNumber: number): Promise<PullRequestLink | null>;
  fetchRequiredChecks(prNumber: number): Promise<{ green: boolean; pending: boolean; headSha: string; baseSha: string }>;
}

export interface ReviewPublishAdapter {
  readonly name: string;
  publishReview(prNumber: number, body: string): Promise<void>;
  publishInlineFindings(prNumber: number, findings: readonly string[]): Promise<void>;
}

/**
 * A required CI check counts as broad verification only when repository
 * policy or checked-in workflow configuration maps that check to the full
 * repository gate. A matching check name alone is insufficient.
 */
export function isEquivalentCi(
  policyMapsCheckToFullGate: boolean,
  workflowMapsCheckToFullGate: boolean,
): boolean {
  return policyMapsCheckToFullGate || workflowMapsCheckToFullGate;
}
