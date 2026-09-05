// Test-only adapter fakes. Production adapters expose host contracts only.
import type { GitHubAdapter, MergeAdapter } from "../adapters.ts";
import type { PullRequestLink } from "../discovery.ts";

export function fakeGitHubAdapter(
  pr: PullRequestLink | null,
  checks: { green: boolean; pending: boolean; headSha: string; baseSha: string } = {
    green: true,
    pending: false,
    headSha: "h1",
    baseSha: "b1",
  },
  overrides: Partial<GitHubAdapter> = {},
): GitHubAdapter {
  return {
    name: "fake-github",
    async fetchPullRequest(_prNumber) {
      return pr;
    },
    async fetchRequiredChecks(_prNumber) {
      return checks;
    },
    ...overrides,
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
    async updatePullRequestBody(prNumber, _body) {
      calls.push(`update-body pr#${prNumber}`);
    },
    async updateLabels(ticket, add, remove) {
      calls.push(`labels ticket#${ticket} +${add.join(",")}-${remove.join(",")}`);
    },
  };
}
