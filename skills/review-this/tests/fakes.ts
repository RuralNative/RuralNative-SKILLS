// Test-only adapter fakes. Production adapters expose host contracts only.
import type {
  CloudAdapter,
  CloudReviewResult,
  GitHubAdapter,
  LocalReviewAdapter,
  LocalReviewResult,
  MergeAdapter,
  VerificationAdapter,
} from "../adapters.ts";

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
      if (typeof result === "function") return result(headSha);
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
    async updatePullRequestSummary(prNumber, body) {
      calls.push(`summary pr#${prNumber}: ${body}`);
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
