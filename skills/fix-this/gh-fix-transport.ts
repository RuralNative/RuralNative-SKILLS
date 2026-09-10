// Allowlisted `gh api` transport for the bounded fix publication step
// (ADR-0040). Argument arrays only, never shell interpolation. Normal merge
// uses REST `PUT .../pulls/{n}/merge` with a verified `sha` and
// `merge_method: squash`. This avoids `gh pr merge` implicitly entering a
// merge queue or scheduling auto-merge. No admin, auto-merge, or
// queue-management behavior. Tests assert exact argument arrays without
// spawning `gh`. Shared runner types come from the bundled native-read
// helper so the three helpers do not drift.
import { spawnSync } from "node:child_process";
import type { GhRunner, GhRunResult } from "./github-facts.ts";
import type { FixPublishAdapter } from "./adapters.ts";

export type { GhRunner, GhRunResult };

const GH = "gh";

export function defaultGhRunner(args: readonly string[]): GhRunResult {
  const result = spawnSync(GH, [...args], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) {
    return { ok: false, stdout: "", reason: result.error.message };
  }
  const stdout = (result.stdout ?? "").trim();
  const stderr = (result.stderr ?? "").trim();
  if (result.status !== 0) {
    return { ok: false, stdout: "", reason: stderr !== "" ? stderr : `gh exited ${result.status}` };
  }
  return { ok: true, stdout };
}

function parseJson(stdout: string): unknown {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

export interface MergeResult {
  merged: boolean;
  mergeCommitSha: string;
  rejection: string;
}

/**
 * Bounded native FixPublishAdapter (ADR-0040). Every operation is one
 * allowlisted `gh api` call with argument arrays only, followed by a
 * read-back where the REST contract provides one. Progress checkpoints ride
 * issue comments; evidence updates patch the PR body in one operation;
 * squash merge uses REST PUT with the verified head SHA; closure patches the
 * ticket closed only after merge and bookkeeping proof; labels add and remove
 * through the issues labels endpoints one label at a time.
 */
export function createGhFixPublishAdapter(
  repository: string,
  runner: GhRunner = defaultGhRunner,
): FixPublishAdapter {
  const merge = createGhFixTransport(repository, runner);
  return {
    name: "gh-fix-publish",
    async publishFixProgress(prNumber: number, body: string): Promise<void> {
      if (body.trim() === "") throw new Error("fix-progress body is required");
      const result = runner(["api", "--method", "POST", `repos/${repository}/issues/${prNumber}/comments`, "-f", `body=${body}`]);
      if (!result.ok) throw new Error(`gh could not publish fix progress: ${result.reason ?? "unknown error"}`);
    },
    async updateImplementationEvidence(prNumber: number, body: string): Promise<void> {
      if (body.trim() === "") throw new Error("implementation evidence body is required");
      const result = runner(["api", "--method", "PATCH", `repos/${repository}/pulls/${prNumber}`, "-f", `body=${body}`]);
      if (!result.ok) throw new Error(`gh could not update implementation evidence: ${result.reason ?? "unknown error"}`);
    },
    async squashMerge(prNumber: number, expectedHeadSha: string) {
      return merge.squashMerge(prNumber, expectedHeadSha);
    },
    async closeTicket(ticket: number, _reason: string): Promise<void> {
      const result = runner(["api", "--method", "PATCH", `repos/${repository}/issues/${ticket}`, "-f", "state=closed"]);
      if (!result.ok) throw new Error(`gh could not close ticket: ${result.reason ?? "unknown error"}`);
    },
    async updateLabels(issue: number, add: string[], remove: string[]): Promise<void> {
      for (const label of add) {
        if (label.trim() === "") continue;
        const result = runner(["api", "--method", "POST", `repos/${repository}/issues/${issue}/labels`, "-F", `labels[]=${label}`]);
        if (!result.ok) throw new Error(`gh could not add label ${label}: ${result.reason ?? "unknown error"}`);
      }
      for (const label of remove) {
        if (label.trim() === "") continue;
        const result = runner(["api", "--method", "DELETE", `repos/${repository}/issues/${issue}/labels/${label}`]);
        if (!result.ok) throw new Error(`gh could not remove label ${label}: ${result.reason ?? "unknown error"}`);
      }
    },
  };
}

export function createGhFixTransport(repository: string, runner: GhRunner = defaultGhRunner) {
  const pullsUrl = (prNumber: number): string => `repos/${repository}/pulls/${prNumber}`;
  return {
    name: "gh-fix-transport",
    async squashMerge(prNumber: number, expectedHeadSha: string): Promise<MergeResult> {
      if (expectedHeadSha.trim() === "") {
        return { merged: false, mergeCommitSha: "", rejection: "no verified head SHA to merge" };
      }
      const result = runner([
        "api",
        "--method",
        "PUT",
        `${pullsUrl(prNumber)}/merge`,
        "-f",
        `sha=${expectedHeadSha}`,
        "-f",
        "merge_method=squash",
      ]);
      if (!result.ok) {
        return { merged: false, mergeCommitSha: "", rejection: result.reason ?? "merge request failed" };
      }
      const parsed = parseJson(result.stdout) as { merged?: unknown; sha?: unknown; message?: unknown } | null;
      if (parsed === null) {
        return { merged: false, mergeCommitSha: "", rejection: "merge response is not JSON" };
      }
      if (parsed.merged !== true) {
        return { merged: false, mergeCommitSha: "", rejection: String(parsed.message ?? "GitHub did not merge") };
      }
      const sha = String(parsed.sha ?? "");
      if (sha.trim() === "") {
        return { merged: false, mergeCommitSha: "", rejection: "merge reported without a merge commit" };
      }
      return { merged: true, mergeCommitSha: sha, rejection: "" };
    },
    async readMergeState(prNumber: number): Promise<{ state: string; mergeCommitSha: string } | null> {
      const result = runner(["api", `${pullsUrl(prNumber)}`]);
      if (!result.ok) return null;
      const parsed = parseJson(result.stdout) as Record<string, unknown> | null;
      if (parsed === null) return null;
      const mergedAt = parsed["merged_at"];
      const merged = mergedAt !== null && mergedAt !== undefined && String(mergedAt) !== "";
      return {
        state: merged ? "merged" : String(parsed["state"] ?? ""),
        mergeCommitSha: String(parsed["merge_commit_sha"] ?? ""),
      };
    },
  };
}
