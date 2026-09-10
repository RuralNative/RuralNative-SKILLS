// Shared native-read helpers for single-target production workflows
// (ADR-0040). Authored source; scripts/generate-workflow-state.ts copies this
// file into the four self-contained bundles. Edit here, regenerate, commit
// both; verification fails on drift.
//
// Purity: facts in, decisions out, plus an injectable `gh` runner for the
// effectful readers. No writes, no polling, no general publisher. Supported
// host is github.com; other hosts reject rather than accidentally using
// GH_HOST for another server. REST lists use `gh api --paginate --slurp`
// without `--jq` (installed gh rejects `--slurp` with `--jq`); pages parse
// and flatten in code. Complete-empty differs from unavailable, forbidden,
// malformed, truncated, or partial: unknown values never become zero, empty,
// or allowed.

export interface GhRunResult {
  ok: boolean;
  stdout: string;
  reason?: string;
}

export type GhRunner = (args: readonly string[]) => GhRunResult;

export type FactStatus =
  | { kind: "complete"; reason: string }
  | { kind: "unavailable"; reason: string }
  | { kind: "forbidden"; reason: string }
  | { kind: "malformed"; reason: string }
  | { kind: "partial"; reason: string };

export function complete(reason: string): FactStatus {
  return { kind: "complete", reason };
}

const GITHUB_HOST = "github.com";

export function assertSupportedHost(host: string): void {
  if (host.trim().toLowerCase() !== GITHUB_HOST) {
    throw new Error(`unsupported host ${host}; only github.com is supported`);
  }
}

export function parseJsonValue(stdout: string): unknown {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

/** Flatten `gh api --paginate --slurp` stdout (no `--jq`) into items. */
export function flattenPages(stdout: string): unknown[] | null {
  const trimmed = stdout.trim();
  if (trimmed === "") return [];
  try {
    const direct = JSON.parse(trimmed);
    if (Array.isArray(direct)) {
      if (direct.length > 0 && direct.every((entry) => Array.isArray(entry))) {
        return (direct as unknown[][]).flat();
      }
      return direct;
    }
    if (direct !== null && typeof direct === "object") return [direct];
    return null;
  } catch {
    // Concatenated pages without --slurp or truncated JSON are malformed,
    // never empty. Callers stop instead of certifying incompleteness.
    return null;
  }
}

export interface RepositoryFacts {
  repository: string;
  host: string;
  defaultBranch: string;
  status: FactStatus;
}

export interface IssueFacts {
  number: number;
  state: "open" | "closed";
  stateReason?: string;
  title: string;
  body: string;
  labels: string[];
  assignees: string[];
  parentNumber: number | null;
  status: FactStatus;
}

export interface PullRequestFacts {
  number: number;
  repository: string;
  /** Raw pull-request body; drives evidence observation and repair. */
  body: string;
  state: "open" | "closed" | "merged";
  draft: boolean;
  baseBranch: string;
  baseSha: string;
  headBranch: string;
  headRef: string;
  headSha: string;
  /**
   * Native `head.repo.full_name`, or "" when the source repository is absent
   * (for example a deleted fork). Empty is unknown identity, never proof of
   * same-repository code.
   */
  headRepository: string;
  mergeable: boolean | null;
  mergeCommitSha: string;
  closingIssues: { owner: string; repo: string; number: number }[];
  /** Completeness of the native closing-link enumeration alone. */
  closingStatus: FactStatus;
  status: FactStatus;
}

export interface ReviewFacts {
  reviewId: string;
  author: string;
  state: string;
  commitSha: string;
  submittedAt?: string;
  sourceUrl?: string;
  commentIds: readonly string[];
  commentsComplete: boolean;
  status: FactStatus;
}

/** Read the repository default branch from GitHub (operation-scoped). */
export function readRepositoryFacts(
  runner: GhRunner,
  repository: string,
  host = GITHUB_HOST,
): RepositoryFacts {
  assertSupportedHost(host);
  const result = runner(["api", `repos/${repository}`]);
  if (!result.ok) {
    const reason = result.reason ?? "unknown error";
    if (/not found|404/i.test(reason)) {
      return { repository, host, defaultBranch: "", status: { kind: "unavailable", reason } };
    }
    if (/forbidden|403|permission/i.test(reason)) {
      return { repository, host, defaultBranch: "", status: { kind: "forbidden", reason } };
    }
    return { repository, host, defaultBranch: "", status: { kind: "unavailable", reason } };
  }
  const parsed = parseJsonValue(result.stdout) as { default_branch?: unknown } | null;
  const branch = typeof parsed?.default_branch === "string" ? parsed.default_branch : "";
  if (branch.trim() === "") {
    return { repository, host, defaultBranch: "", status: { kind: "malformed", reason: "repository default branch is missing" } };
  }
  return { repository, host, defaultBranch: branch, status: complete("repository default branch observed") };
}

/** Read one pull request with refs, revisions, and native closing links. */
export function readPullRequestFacts(
  runner: GhRunner,
  repository: string,
  prNumber: number,
): PullRequestFacts {
  const empty: PullRequestFacts = {
    number: prNumber,
    repository,
    body: "",
    state: "closed",
    draft: false,
    baseBranch: "",
    baseSha: "",
    headBranch: "",
    headRef: "",
    headSha: "",
    headRepository: "",
    mergeable: null,
    mergeCommitSha: "",
    closingIssues: [],
    closingStatus: { kind: "unavailable", reason: "not read" },
    status: { kind: "unavailable", reason: "not read" },
  };
  const result = runner(["api", `repos/${repository}/pulls/${prNumber}`]);
  if (!result.ok) {
    const reason = result.reason ?? "unknown error";
    const status: FactStatus = /forbidden|403|permission/i.test(reason)
      ? { kind: "forbidden", reason }
      : { kind: "unavailable", reason };
    return { ...empty, closingStatus: status, status };
  }
  const raw = parseJsonValue(result.stdout) as Record<string, unknown> | null;
  if (raw === null || typeof raw !== "object") {
    const malformed: FactStatus = { kind: "malformed", reason: "pull-request response is not JSON" };
    return { ...empty, closingStatus: malformed, status: malformed };
  }
  const mergedAt = raw["merged_at"];
  const stateRaw = String(raw["state"] ?? "");
  const state: PullRequestFacts["state"] =
    mergedAt !== null && mergedAt !== undefined && String(mergedAt) !== ""
      ? "merged"
      : stateRaw === "open"
        ? "open"
        : "closed";
  const base = (raw["base"] ?? {}) as Record<string, unknown>;
  const head = (raw["head"] ?? {}) as Record<string, unknown>;
  const headRepo = (head["repo"] ?? {}) as Record<string, unknown>;
  const baseBranch = typeof base["ref"] === "string" ? base["ref"] : "";
  const baseSha = typeof base["sha"] === "string" ? base["sha"] : "";
  const headBranch = typeof head["ref"] === "string" ? head["ref"] : "";
  const headSha = typeof head["sha"] === "string" ? head["sha"] : "";
  if (baseBranch.trim() === "" || baseSha.trim() === "" || headBranch.trim() === "" || headSha.trim() === "") {
    const malformed: FactStatus = { kind: "malformed", reason: "pull-request refs or revisions are missing" };
    const closing = readClosingIssues(runner, repository, prNumber);
    return {
      number: prNumber,
      repository,
      body: typeof raw["body"] === "string" ? raw["body"] : "",
      state,
      draft: raw["draft"] === true,
      baseBranch,
      baseSha,
      headBranch,
      headRef: headBranch,
      headSha,
      headRepository: typeof headRepo["full_name"] === "string" ? String(headRepo["full_name"]) : "",
      mergeable: typeof raw["mergeable"] === "boolean" ? (raw["mergeable"] as boolean) : null,
      mergeCommitSha: typeof raw["merge_commit_sha"] === "string" ? raw["merge_commit_sha"] : "",
      closingIssues: closing.issues,
      closingStatus: closing.status,
      status: malformed,
    };
  }
  const closing = readClosingIssues(runner, repository, prNumber);
  if (closing.status.kind !== "complete") {
    return {
      number: prNumber,
      repository,
      body: typeof raw["body"] === "string" ? raw["body"] : "",
      state,
      draft: raw["draft"] === true,
      baseBranch,
      baseSha,
      headBranch,
      headRef: headBranch,
      headSha,
      headRepository: typeof headRepo["full_name"] === "string" ? String(headRepo["full_name"]) : "",
      mergeable: typeof raw["mergeable"] === "boolean" ? (raw["mergeable"] as boolean) : null,
      mergeCommitSha: typeof raw["merge_commit_sha"] === "string" ? raw["merge_commit_sha"] : "",
      closingIssues: [],
      closingStatus: closing.status,
      status: closing.status,
    };
  }
  const forked =
    headRepo["full_name"] !== undefined &&
    String(headRepo["full_name"]).toLowerCase() !== repository.toLowerCase();
  return {
    number: prNumber,
    repository,
    body: typeof raw["body"] === "string" ? raw["body"] : "",
    state,
    draft: raw["draft"] === true,
    baseBranch,
    baseSha,
    headBranch,
    headRef: headBranch,
    headSha,
    headRepository: typeof headRepo["full_name"] === "string" ? String(headRepo["full_name"]) : "",
    mergeable: typeof raw["mergeable"] === "boolean" ? (raw["mergeable"] as boolean) : null,
    mergeCommitSha: typeof raw["merge_commit_sha"] === "string" ? raw["merge_commit_sha"] : "",
    closingIssues: closing.issues,
    closingStatus: complete("native closing links observed"),
    status: forked
      ? { kind: "complete", reason: "pull request observed in another repository" }
      : complete("pull request observed"),
  };
}

function readClosingIssues(
  runner: GhRunner,
  repository: string,
  prNumber: number,
): { issues: { owner: string; repo: string; number: number }[]; status: FactStatus } {
  // Native timeline closing links with full repository identity. Only
  // `connected` events count as closing links; `cross-referenced` is a mere
  // mention and never proves association. Unknown, failed, or malformed reads
  // keep their own status so callers never treat empty as proof of no
  // association.
  const result = runner([
    "api",
    "--paginate",
    "--slurp",
    `repos/${repository}/issues/${prNumber}/timeline`,
  ]);
  if (!result.ok) {
    const reason = result.reason ?? "unknown error";
    if (/forbidden|403|permission/i.test(reason)) return { issues: [], status: { kind: "forbidden", reason } };
    return { issues: [], status: { kind: "unavailable", reason } };
  }
  const items = flattenPages(result.stdout);
  if (items === null) return { issues: [], status: { kind: "malformed", reason: "timeline pages are not complete JSON" } };
  const out: { owner: string; repo: string; number: number }[] = [];
  for (const item of items) {
    if (item === null || typeof item !== "object") {
      return { issues: [], status: { kind: "malformed", reason: "timeline entry is not an object" } };
    }
    const raw = item as Record<string, unknown>;
    if (raw["event"] !== "connected") continue;
    const source = (raw["source"] ?? {}) as Record<string, unknown>;
    const issue = (source["issue"] ?? raw) as Record<string, unknown>;
    const url = String((issue["html_url"] as string) ?? (issue["url"] as string) ?? "");
    const m = url.match(/github\.com\/([A-Za-z0-9-_.]+)\/([A-Za-z0-9-_.]+)\/issues\/(\d+)/i);
    if (!m) continue;
    out.push({ owner: m[1], repo: m[2], number: Number(m[3]) });
  }
  return { issues: out, status: complete("native closing links observed") };
}

/** Read one issue with body, state, labels, and parent link. */
export function readIssueFacts(
  runner: GhRunner,
  repository: string,
  issueNumber: number,
): IssueFacts {
  const empty: IssueFacts = {
    number: issueNumber,
    state: "open",
    title: "",
    body: "",
    labels: [],
    assignees: [],
    parentNumber: null,
    status: { kind: "unavailable", reason: "not read" },
  };
  if (!Number.isInteger(issueNumber) || issueNumber < 1) {
    return { ...empty, status: { kind: "malformed", reason: "issue number is invalid" } };
  }
  const result = runner(["api", `repos/${repository}/issues/${issueNumber}`]);
  if (!result.ok) {
    const reason = result.reason ?? "unknown error";
    if (/forbidden|403|permission/i.test(reason)) return { ...empty, status: { kind: "forbidden", reason } };
    return { ...empty, status: { kind: "unavailable", reason } };
  }
  const raw = parseJsonValue(result.stdout) as Record<string, unknown> | null;
  if (raw === null || typeof raw !== "object") {
    return { ...empty, status: { kind: "malformed", reason: "issue response is not JSON" } };
  }
  const stateRaw = String(raw["state"] ?? "");
  const labelsRaw = Array.isArray(raw["labels"]) ? raw["labels"] : [];
  const labels = labelsRaw
    .map((entry) => (typeof entry === "string" ? entry : (entry as Record<string, unknown>)["name"]))
    .filter((name): name is string => typeof name === "string");
  const assigneesRaw = Array.isArray(raw["assignees"]) ? raw["assignees"] : [];
  const assignees = assigneesRaw
    .map((entry) => (entry as Record<string, unknown>)["login"])
    .filter((login): login is string => typeof login === "string");
  // Parent link is best-effort: the sub-issue parent endpoint 404s when the
  // issue has no parent (complete-empty), while other failures stay unknown.
  let parentNumber: number | null = null;
  let parentStatus: FactStatus = complete("no parent link observed");
  const parentRes = runner(["api", `repos/${repository}/issues/${issueNumber}/parent`]);
  if (parentRes.ok) {
    const parentRaw = parseJsonValue(parentRes.stdout) as Record<string, unknown> | null;
    if (parentRaw !== null && typeof parentRaw === "object" && Number.isInteger(parentRaw["number"])) {
      parentNumber = parentRaw["number"] as number;
    }
  } else {
    const reason = parentRes.reason ?? "unknown error";
    if (/not found|404|no parent/i.test(reason)) {
      parentNumber = null;
    } else if (/forbidden|403|permission/i.test(reason)) {
      parentStatus = { kind: "forbidden", reason };
    } else {
      parentStatus = { kind: "unavailable", reason };
    }
  }
  if (parentStatus.kind !== "complete") {
    return {
      ...empty,
      number: issueNumber,
      state: stateRaw === "closed" ? "closed" : "open",
      title: typeof raw["title"] === "string" ? raw["title"] : "",
      body: typeof raw["body"] === "string" ? raw["body"] : "",
      labels,
      assignees,
      parentNumber,
      status: parentStatus,
    };
  }
  return {
    number: issueNumber,
    state: stateRaw === "closed" ? "closed" : "open",
    stateReason: typeof raw["state_reason"] === "string" ? raw["state_reason"] : undefined,
    title: typeof raw["title"] === "string" ? raw["title"] : "",
    body: typeof raw["body"] === "string" ? raw["body"] : "",
    labels,
    assignees,
    parentNumber,
    status: complete("issue observed"),
  };
}

function readNumberList(
  runner: GhRunner,
  path: string,
  field: string,
): { numbers: number[]; status: FactStatus } {
  const result = runner(["api", "--paginate", "--slurp", path]);
  if (!result.ok) {
    const reason = result.reason ?? "unknown error";
    if (/forbidden|403|permission/i.test(reason)) return { numbers: [], status: { kind: "forbidden", reason } };
    if (/not found|404/i.test(reason) && /dependenc|sub-issue/i.test(reason)) {
      return { numbers: [], status: { kind: "unavailable", reason: `unsupported capability: ${reason}` } };
    }
    return { numbers: [], status: { kind: "unavailable", reason } };
  }
  const items = flattenPages(result.stdout);
  if (items === null) return { numbers: [], status: { kind: "malformed", reason: `${field} pages are not complete JSON` } };
  const numbers: number[] = [];
  for (const item of items) {
    if (item === null || typeof item !== "object") return { numbers: [], status: { kind: "malformed", reason: `${field} entry is not an object` } };
    const raw = item as Record<string, unknown>;
    const n = raw["number"] ?? raw["issue_number"] ?? (raw["issue"] as Record<string, unknown> | undefined)?.["number"];
    if (!Number.isInteger(n)) continue;
    numbers.push(n as number);
  }
  return { numbers, status: complete(`${field} observed`) };
}

/** Read native sub-issues for one issue (complete enumeration). */
export function readSubIssues(
  runner: GhRunner,
  repository: string,
  issueNumber: number,
): { subIssues: number[]; status: FactStatus } {
  const { numbers, status } = readNumberList(runner, `repos/${repository}/issues/${issueNumber}/sub_issues`, "sub-issues");
  return { subIssues: numbers, status };
}

/** Read native `blocked_by` dependencies for one issue. */
export function readBlockedBy(
  runner: GhRunner,
  repository: string,
  issueNumber: number,
): { blockedBy: number[]; status: FactStatus } {
  const { numbers, status } = readNumberList(
    runner,
    `repos/${repository}/issues/${issueNumber}/dependencies/blocked_by`,
    "blocked_by",
  );
  return { blockedBy: numbers, status };
}

/** Read native `blocking` dependents for one issue. */
export function readBlocking(
  runner: GhRunner,
  repository: string,
  issueNumber: number,
): { blocking: number[]; status: FactStatus } {
  const { numbers, status } = readNumberList(
    runner,
    `repos/${repository}/issues/${issueNumber}/dependencies/blocking`,
    "blocking",
  );
  return { blocking: numbers, status };
}

/** Read collaborator permission for one user (independent authorization). */
export function readCollaboratorPermission(
  runner: GhRunner,
  repository: string,
  username: string,
): "admin" | "maintain" | "write" | "triage" | "read" | "unknown" {
  if (username.trim() === "") return "unknown";
  const result = runner(["api", `repos/${repository}/collaborators/${username}/permission`]);
  if (!result.ok) return "unknown";
  const parsed = parseJsonValue(result.stdout) as { permission?: unknown } | null;
  const permission = String(parsed?.permission ?? "");
  if (permission === "admin" || permission === "maintain" || permission === "write") return permission;
  if (permission === "triage" || permission === "read") return permission;
  return "unknown";
}
