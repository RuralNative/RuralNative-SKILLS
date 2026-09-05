// Host contracts for the single pull-request review (ADR-0031).
//
// Host-neutral interfaces for GitHub facts, required checks, and merge. No
// cloud review, no local-review adapter, no wave orchestration. Tests supply
// fakes and never call live GitHub.

import type { PullRequestLink } from "./discovery.ts";

export interface GitHubAdapter {
  readonly name: string;
  fetchPullRequest(prNumber: number): Promise<PullRequestLink | null>;
  fetchRequiredChecks(prNumber: number): Promise<{ green: boolean; pending: boolean; headSha: string; baseSha: string }>;
}

export interface MergeAdapter {
  readonly name: string;
  squashMerge(prNumber: number, headSha: string): Promise<{ merged: boolean; headSha: string }>;
  updatePullRequestBody(prNumber: number, body: string): Promise<void>;
  updateLabels(ticket: number, add: string[], remove: string[]): Promise<void>;
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
