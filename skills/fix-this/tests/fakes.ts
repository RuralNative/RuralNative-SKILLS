// Test-only adapter fakes. Production adapters expose host contracts only.
import type {
  FixGitHubAdapter,
  FixProgressComment,
  FixPublishAdapter,
  FixVerificationAdapter,
} from "../adapters.ts";

export function fakeFixGitHubAdapter(
  pr: Awaited<ReturnType<FixGitHubAdapter["fetchPullRequest"]>>,
  review: Awaited<ReturnType<FixGitHubAdapter["fetchSelectedReview"]>> = null,
  progress: FixProgressComment | null = null,
): FixGitHubAdapter {
  return {
    name: "fake-fix-github",
    async fetchPullRequest(_prNumber) {
      return pr;
    },
    async fetchSelectedReview(_prNumber) {
      return review;
    },
    async fetchRequirementBodies(_ticket, _parent) {
      return null;
    },
    async fetchFixProgress(_prNumber) {
      return progress;
    },
  };
}

export function fakeFixPublishAdapter(): FixPublishAdapter & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    name: "fake-fix-publish",
    async publishFixProgress(prNumber, _body) {
      calls.push(`progress pr#${prNumber}`);
    },
    async updateImplementationEvidence(prNumber, _body) {
      calls.push(`evidence pr#${prNumber}`);
    },
    async squashMerge(prNumber, expectedHeadSha) {
      calls.push(`merge pr#${prNumber} head=${expectedHeadSha}`);
      return { merged: true, mergeCommitSha: "merge-sha", rejection: "" };
    },
    async closeTicket(ticket, _reason) {
      calls.push(`close #${ticket}`);
    },
    async updateLabels(issue, add, remove) {
      calls.push(`labels #${issue} add=${add.join("+")} remove=${remove.join("+")}`);
    },
  };
}

export function fakeFixVerificationAdapter(passed = true): FixVerificationAdapter {
  return {
    name: "fake-fix-verify",
    async runFocusedChecks(_commands) {
      return { passed, output: passed ? "3 passed" : "1 failed" };
    },
  };
}
