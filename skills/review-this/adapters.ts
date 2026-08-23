// Adapter contracts for the review wave (#135, parent #130).
//
// Host-neutral interfaces that expose GitHub, Kilo cloud review, local
// code-review, and merge capabilities. The control workspace orchestrates
// one wave through these adapters; a future persistent coordinator can reuse
// the same contracts. Tests supply fakes for every adapter and never call
// live cloud review, GitHub, or worker sessions.

import type { TicketFact } from "./workflow-state.ts";
import type { Finding } from "./reconciliation.ts";
import type { PullRequestLink } from "./discovery.ts";

export interface GitHubAdapter {
  readonly name: string;
  fetchSpec(spec: number): Promise<{ number: number; title: string; state: string }>;
  fetchChildTickets(spec: number): Promise<TicketFact[]>;
  fetchPullRequests(spec: number): Promise<PullRequestLink[]>;
  fetchRequiredChecks(prNumber: number): Promise<{ green: boolean; headSha: string; baseSha?: string }>;
}

export type CloudReviewStatus = "available" | "unavailable";

export interface CloudReviewResult {
  status: CloudReviewStatus;
  headSha: string;
  baseSha?: string;
  summary?: string;
  inlineComments: Finding[];
  reason?: string;
}

export interface CloudAdapter {
  readonly name: string;
  collect(headSha: string, baseSha?: string): Promise<CloudReviewResult>;
}

export interface LocalReviewResult {
  headSha: string;
  baseSha?: string;
  standards: Finding[];
  spec: Finding[];
  clean: boolean;
}

export interface LocalReviewAdapter {
  readonly name: string;
  run(headSha: string, baseSha?: string): Promise<LocalReviewResult>;
}

export interface MergeAdapter {
  readonly name: string;
  squashMerge(prNumber: number, headSha: string): Promise<{ merged: boolean; headSha: string }>;
  updatePullRequestSummary(prNumber: number, body: string): Promise<void>;
  comment(ticket: number, body: string): Promise<void>;
  updateLabels(ticket: number, add: string[], remove: string[]): Promise<void>;
  closeTicket(ticket: number): Promise<void>;
}

export interface VerificationAdapter {
  readonly name: string;
  verifyOnMain(): Promise<boolean>;
  wholeSpecReview(): Promise<boolean>;
}

// Helper to collect current-head cloud comments through the adapter.
// Delegates to the adapter but records absence/failure/timeout as unavailable without blocking.
export async function collectCloudReview(
  adapter: CloudAdapter,
  currentHeadSha: string,
  currentBaseSha?: string,
): Promise<CloudReviewResult> {
  let result: CloudReviewResult;
  try {
    result = await adapter.collect(currentHeadSha, currentBaseSha);
  } catch (error) {
    return {
      status: "unavailable",
      headSha: currentHeadSha,
      baseSha: currentBaseSha,
      inlineComments: [],
      reason: `cloud collect failed: ${String(error)}`,
    };
  }
  // Only comments whose headSha matches the current head are retained; callers
  // should filter with reconcileFindings which will mark stale heads as rejected.
  if (
    result.status === "available" &&
    (result.headSha !== currentHeadSha ||
      (currentBaseSha !== undefined && result.baseSha !== currentBaseSha))
  ) {
    const baseMismatch =
      currentBaseSha !== undefined && result.baseSha !== currentBaseSha
        ? `; cloud base ${result.baseSha ?? "unspecified"} does not match current base ${currentBaseSha}`
        : "";
    return {
      status: "unavailable",
      headSha: currentHeadSha,
      baseSha: currentBaseSha,
      inlineComments: [],
      reason:
        result.headSha !== currentHeadSha
          ? `cloud head ${result.headSha} does not match current head ${currentHeadSha}${baseMismatch}`
          : `cloud base ${result.baseSha ?? "unspecified"} does not match current base ${currentBaseSha}`,
    };
  }
  return result;
}
