// Test-only adapter fakes. Production adapters expose host contracts only.
import type { GitHubAdapter, ReviewPublishAdapter } from "../adapters.ts";
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

export function fakeReviewPublishAdapter(): ReviewPublishAdapter & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    name: "fake-publish",
    async publishReview(prNumber, _body) {
      calls.push(`publish-review pr#${prNumber}`);
    },
    async publishInlineFindings(prNumber, findings) {
      calls.push(`publish-inline pr#${prNumber} findings=${findings.length}`);
    },
  };
}
