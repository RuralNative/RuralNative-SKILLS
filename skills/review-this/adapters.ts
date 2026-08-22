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
  fetchRequiredChecks(prNumber: number): Promise<{ green: boolean; headSha: string }>;
}

export type CloudReviewStatus = "available" | "unavailable";

export interface CloudReviewResult {
  status: CloudReviewStatus;
  headSha: string;
  summary?: string;
  inlineComments: Finding[];
  reason?: string;
}

export interface CloudAdapter {
  readonly name: string;
  collect(headSha: string): Promise<CloudReviewResult>;
}

export interface LocalReviewResult {
  headSha: string;
  standards: Finding[];
  spec: Finding[];
  clean: boolean;
}

export interface LocalReviewAdapter {
  readonly name: string;
  run(headSha: string): Promise<LocalReviewResult>;
}

export interface MergeAdapter {
  readonly name: string;
  squashMerge(prNumber: number, headSha: string): Promise<{ merged: boolean; headSha: string }>;
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
): Promise<CloudReviewResult> {
  const result = await adapter.collect(currentHeadSha);
  // Only comments whose headSha matches the current head are retained; callers
  // should filter with reconcileFindings which will mark stale heads as rejected.
  if (result.status === "available" && result.headSha !== currentHeadSha) {
    return {
      status: "unavailable",
      headSha: currentHeadSha,
      inlineComments: [],
      reason: `cloud head ${result.headSha} does not match current head ${currentHeadSha}`,
    };
  }
  return result;
}

// Fakes for tests — no network, no GitHub, no worker sessions.

export function fakeGitHubAdapter(overrides: Partial<GitHubAdapter> = {}): GitHubAdapter {
  return {
    name: "fake-github",
    async fetchSpec(spec) {
      return { number: spec, title: `Spec #${spec}`, state: "open" };
    },
    async fetchChildTickets(_spec) {
      return [];
    },
    async fetchPullRequests(_spec) {
      return [];
    },
    async fetchRequiredChecks(prNumber) {
      return { green: true, headSha: `head-${prNumber}` };
    },
    ...overrides,
  };
}

export function fakeCloudAdapter(
  result: CloudReviewResult | ((headSha: string) => Promise<CloudReviewResult>),
): CloudAdapter {
  return {
    name: "fake-cloud",
    async collect(headSha) {
      if (typeof result === "function") return (result as (s: string) => Promise<CloudReviewResult>)(headSha);
      return result;
    },
  };
}

export function fakeLocalReviewAdapter(result: LocalReviewResult): LocalReviewAdapter {
  return {
    name: "fake-local",
    async run(_headSha) {
      return result;
    },
  };
}

export function fakeMergeAdapter(): MergeAdapter & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    name: "fake-merge",
    async squashMerge(prNumber, headSha) {
      calls.push(`squash-merge pr#${prNumber} @${headSha}`);
      return { merged: true, headSha };
    },
    async comment(ticket, body) {
      calls.push(`comment #${ticket}: ${body}`);
    },
    async updateLabels(ticket, add, remove) {
      calls.push(`labels #${ticket} +${add.join(",")} -${remove.join(",")}`);
    },
    async closeTicket(ticket) {
      calls.push(`close #${ticket}`);
    },
  };
}

export function fakeVerificationAdapter(passing: boolean): VerificationAdapter {
  return {
    name: "fake-verify",
    async verifyOnMain() {
      return passing;
    },
    async wholeSpecReview() {
      return passing;
    },
  };
}
