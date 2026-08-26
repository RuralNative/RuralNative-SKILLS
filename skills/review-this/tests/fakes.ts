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

// Controlled deferred fakes for overlapped evidence collection (#170):
// each records when it starts and stays pending until the test resolves or
// rejects its gate, proving both operations start before either resolves.
export interface DeferredCloudController {
  adapter: CloudAdapter;
  startCount(): number;
  resolve(result: CloudReviewResult): void;
  reject(reason: unknown): void;
  settled: Promise<"resolved" | "rejected">;
}

export function fakeDeferredCloudAdapter(): DeferredCloudController {
  let starts = 0;
  let release: ((outcome: "resolved" | "rejected") => void) | undefined;
  const settled = new Promise<"resolved" | "rejected">((resolve) => {
    release = resolve;
  });
  let resolveResult: CloudReviewResult | undefined;
  let rejectReason: unknown;
  const controller: DeferredCloudController = {
    adapter: {
      name: "fake-cloud-deferred",
      async collect(_headSha) {
        starts += 1;
        await settled;
        if (resolveResult) return resolveResult;
        throw rejectReason;
      },
    },
    startCount: () => starts,
    resolve(result) {
      resolveResult = result;
      release?.("resolved");
    },
    reject(reason) {
      rejectReason = reason;
      release?.("rejected");
    },
    settled,
  };
  return controller;
}

export interface DeferredLocalController {
  adapter: LocalReviewAdapter;
  startCount(): number;
  resolve(result: LocalReviewResult): void;
  reject(reason: unknown): void;
}

export function fakeDeferredLocalAdapter(): DeferredLocalController {
  let starts = 0;
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let result: LocalReviewResult | undefined;
  let rejectReason: unknown;
  return {
    adapter: {
      name: "fake-local-deferred",
      async run(_headSha) {
        starts += 1;
        await gate;
        if (result) return result;
        throw rejectReason;
      },
    },
    startCount: () => starts,
    resolve(local) {
      result = local;
      release?.();
    },
    reject(reason) {
      rejectReason = reason;
      release?.();
    },
  };
}
