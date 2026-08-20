#!/usr/bin/env node

import fs from "node:fs";
import { pathToFileURL } from "node:url";

export const DELIVERY_STATES = [
  "READY",
  "CLAIMED",
  "BASE_CURRENT",
  "EDITING",
  "PR_OPEN",
  "REVIEWED",
  "MERGED",
  "EVIDENCED",
  "CLOSED",
] as const;

export type DeliveryState = (typeof DELIVERY_STATES)[number];
export type SessionMode = "chat" | "tui";
export type RecoveryClass = "infrastructure" | "task" | "implementation";

export type RoleProfile = {
  agent: string;
  model?: string;
  modelResolved: boolean;
  supportedModes: SessionMode[];
  preferredMode?: SessionMode;
};

export type PreflightInput = {
  daemonHealthy: boolean;
  githubHealthy: boolean;
  repository?: string;
  defaultBranch?: string;
  originHeadSha?: string;
  baseContainsOrigin: boolean;
  ownershipClear: boolean;
  requestedMode?: SessionMode;
  orchestrator?: RoleProfile;
  worker?: RoleProfile;
  reviewerPolicy?: "approval-required" | "verdict";
};

export type PreflightResult =
  | { ok: true; mode: SessionMode; repository: string; originHeadSha: string }
  | { ok: false; errors: string[] };

function validRepository(repository: string | undefined): repository is string {
  return repository !== undefined && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository);
}

function resolved(profile: RoleProfile | undefined): profile is RoleProfile {
  return profile !== undefined && profile.agent.length > 0 && Boolean(profile.model?.trim()) && profile.modelResolved;
}

function isSessionMode(mode: unknown): mode is SessionMode {
  return mode === "chat" || mode === "tui";
}

export function runPreflight(input: PreflightInput): PreflightResult {
  const errors: string[] = [];
  if (!input.daemonHealthy) errors.push("AO_UNHEALTHY");
  if (!input.githubHealthy || !validRepository(input.repository)) errors.push("GITHUB_UNAVAILABLE");
  if (!input.defaultBranch || !input.originHeadSha || !input.baseContainsOrigin) errors.push("BASE_STALE");
  if (!input.ownershipClear) errors.push("DUPLICATE_OWNERSHIP");
  if (!input.orchestrator) errors.push("ORCHESTRATOR_PROFILE_MISSING");
  else if (!resolved(input.orchestrator)) errors.push("ORCHESTRATOR_MODEL_UNRESOLVED");
  if (!input.worker) errors.push("WORKER_PROFILE_MISSING");
  else if (!resolved(input.worker)) errors.push("WORKER_MODEL_UNRESOLVED");
  if (!input.reviewerPolicy) errors.push("REVIEWER_POLICY_MISSING");

  const supportedModes = input.worker?.supportedModes.filter(isSessionMode) ?? [];
  const requested = input.requestedMode ?? input.worker?.preferredMode;
  const mode = requested ?? (supportedModes.includes("chat") ? "chat" : supportedModes[0]);
  if (!isSessionMode(mode) || !supportedModes.includes(mode)) errors.push("WORKER_MODE_UNSUPPORTED");

  return errors.length > 0
    ? { ok: false, errors: [...new Set(errors)] }
    : { ok: true, mode: mode as SessionMode, repository: input.repository as string, originHeadSha: input.originHeadSha as string };
}

export type OwnershipInput = {
  openPullRequests: Array<{ issue: number; number: number; headSha: string; aoOwned: boolean }>;
  sessions: Array<{ issue: number; id: string }>;
  branches: Array<{ issue: number; name: string; trackedChange: boolean }>;
  assignees: Array<{ issue: number; login: string }>;
  issueLinks: Array<{ issue: number; kind: "issue" | "pull-request"; ref: number }>;
};

export type IssueOwnership = {
  issue: number;
  pullRequests: number[];
  sessions: string[];
  branches: string[];
  assignees: string[];
  issueLinks: string[];
  trackedChange: boolean;
  action: "spawn" | "resume" | "review";
};

export function buildOwnership(input: OwnershipInput): Map<number, IssueOwnership> {
  const records = new Map<number, IssueOwnership>();
  const get = (issue: number): IssueOwnership => {
    const existing = records.get(issue);
    if (existing) return existing;
    const created: IssueOwnership = {
      issue,
      pullRequests: [],
      sessions: [],
      branches: [],
      assignees: [],
      issueLinks: [],
      trackedChange: false,
      action: "spawn",
    };
    records.set(issue, created);
    return created;
  };

  for (const pr of input.openPullRequests) get(pr.issue).pullRequests.push(pr.number);
  for (const session of input.sessions) get(session.issue).sessions.push(session.id);
  for (const branch of input.branches) {
    const record = get(branch.issue);
    record.branches.push(branch.name);
    record.trackedChange ||= branch.trackedChange;
  }
  for (const assignee of input.assignees) get(assignee.issue).assignees.push(assignee.login);
  for (const link of input.issueLinks) get(link.issue).issueLinks.push(`${link.kind}:${link.ref}`);

  for (const record of records.values()) {
    record.pullRequests = [...new Set(record.pullRequests)];
    record.sessions = [...new Set(record.sessions)];
    record.branches = [...new Set(record.branches)];
    record.assignees = [...new Set(record.assignees)];
    record.issueLinks = [...new Set(record.issueLinks)];
    record.action = record.pullRequests.length > 0 ? "review" : "resume";
  }
  return records;
}

export type DeliveryFacts = {
  claimed: boolean;
  baseCurrent: boolean;
  trackedChange: boolean;
  pullRequestOpen: boolean;
  reviewed: boolean;
  merged: boolean;
  evidenced: boolean;
  closed: boolean;
};

export function deliveryState(facts: DeliveryFacts): DeliveryState {
  if (facts.closed && facts.evidenced && facts.merged) return "CLOSED";
  if (facts.evidenced && facts.merged) return "EVIDENCED";
  if (facts.merged) return "MERGED";
  if (facts.reviewed) return "REVIEWED";
  if (facts.pullRequestOpen) return "PR_OPEN";
  if (facts.trackedChange) return "EDITING";
  if (facts.baseCurrent) return "BASE_CURRENT";
  if (facts.claimed) return "CLAIMED";
  return "READY";
}

export function idleSignal(input: {
  issueOpen: boolean;
  sessionStatus: string;
  matchingPullRequest: boolean;
  trackedChange: boolean;
}): "red" | "clear" {
  return input.issueOpen && input.sessionStatus === "idle" && !input.matchingPullRequest && !input.trackedChange ? "red" : "clear";
}

export type RecoveryState = Record<RecoveryClass, number>;

export function nextRecovery(
  state: RecoveryState,
  failureClass: RecoveryClass,
  cap = 2,
): { state: RecoveryState; action: "recover-infrastructure" | "continue-task" | "correct-implementation" | "needs-info" } {
  const next = { ...state, [failureClass]: state[failureClass] + 1 };
  if (next[failureClass] > cap) return { state: next, action: "needs-info" };
  const actions = {
    infrastructure: "recover-infrastructure",
    task: "continue-task",
    implementation: "correct-implementation",
  } as const;
  return { state: next, action: actions[failureClass] };
}

export function reviewDecision(input: {
  policy: "approval-required" | "verdict";
  author: string;
  reviewer: string;
  approved: boolean;
  verdict?: "pass" | "fail";
}): { satisfied: boolean; reason: string } {
  const sameAccount = input.author === input.reviewer;
  if (input.policy === "approval-required" && sameAccount) return { satisfied: false, reason: "SELF_APPROVAL_FORBIDDEN" };
  if (input.policy === "approval-required") return { satisfied: input.approved, reason: input.approved ? "APPROVED" : "APPROVAL_MISSING" };
  return { satisfied: input.verdict === "pass", reason: input.verdict === "pass" ? "VERDICT_PASS" : "VERDICT_MISSING_OR_FAILED" };
}

export function mergeDecision(input: {
  repository: string;
  pullRequest: number;
  headSha: string;
  reviewedHeadSha: string;
  aoOwned: boolean;
  aoManageable: boolean;
}): { action: "ao" | "github-fallback" | "stop"; expectedHeadSha: string; command?: string[]; reason?: string } {
  if (!validRepository(input.repository)) return { action: "stop", expectedHeadSha: input.reviewedHeadSha, reason: "REPOSITORY_INVALID" };
  if (input.headSha !== input.reviewedHeadSha) return { action: "stop", expectedHeadSha: input.reviewedHeadSha, reason: "REVIEWED_HEAD_CHANGED" };
  if (input.aoManageable && !input.aoOwned) {
    return { action: "stop", expectedHeadSha: input.reviewedHeadSha, reason: "AO_OWNERSHIP_REQUIRED" };
  }
  if (input.aoManageable) {
    return { action: "ao", expectedHeadSha: input.reviewedHeadSha, command: ["ao", "pr", "merge", String(input.pullRequest)] };
  }
  return {
    action: "github-fallback",
    expectedHeadSha: input.reviewedHeadSha,
    command: [
      "gh",
      "pr",
      "merge",
      String(input.pullRequest),
      "--repo",
      input.repository,
      "--match-head-commit",
      input.reviewedHeadSha,
    ],
  };
}

export type WaveTicket = {
  issue: number;
  open: boolean;
  readyForAgent: boolean;
  blockerStates: DeliveryState[];
};

function blockerResolved(state: DeliveryState): boolean {
  return ["MERGED", "EVIDENCED", "CLOSED"].includes(state);
}

export function nextWave(tickets: WaveTicket[], ownership: Map<number, IssueOwnership>): Array<{ issue: number; action: "spawn" | "resume" | "review" }> {
  return tickets
    .filter((ticket) => ticket.open && ticket.readyForAgent && ticket.blockerStates.every(blockerResolved))
    .map((ticket) => ({ issue: ticket.issue, action: ownership.get(ticket.issue)?.action ?? "spawn" }));
}

export function reconcile(input: { tickets: WaveTicket[]; ownership: OwnershipInput }): Array<{ issue: number; action: "spawn" | "resume" | "review" }> {
  const ownership = buildOwnership(input.ownership);
  return nextWave(input.tickets, ownership).filter(
    (item, index, all) => all.findIndex((candidate) => candidate.issue === item.issue) === index,
  );
}

const operations = {
  preflight: runPreflight,
  "delivery-state": deliveryState,
  "idle-signal": idleSignal,
  reconcile,
  "recovery-decision": (input: { state: RecoveryState; failureClass: RecoveryClass; cap?: number }) =>
    nextRecovery(input.state, input.failureClass, input.cap),
  "review-decision": reviewDecision,
  "merge-decision": mergeDecision,
} as const;

function readInput(args: string[]): unknown {
  const [flag, value, ...extra] = args;
  if (extra.length > 0 || !value || (flag !== "--json" && flag !== "--input")) {
    throw new Error("input required: use --json <json> or --input <path>");
  }
  if (flag === "--json") return JSON.parse(value);
  let descriptor: number;
  try {
    descriptor = fs.openSync(value, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
  } catch {
    throw new Error("--input must name a readable regular file");
  }
  try {
    if (!fs.fstatSync(descriptor).isFile()) throw new Error("--input must name a readable regular file");
    return JSON.parse(fs.readFileSync(descriptor, "utf8"));
  } finally {
    fs.closeSync(descriptor);
  }
}

export function runCli(args: string[]): { exitCode: number; stdout: string; stderr: string } {
  const operation = args[0] as keyof typeof operations | undefined;
  if (!operation || !(operation in operations)) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `usage: workflow.ts <${Object.keys(operations).join("|")}> (--json <json> | --input <path>)\n`,
    };
  }
  try {
    const result = operations[operation](readInput(args.slice(1)) as never);
    return { exitCode: 0, stdout: `${JSON.stringify(result)}\n`, stderr: "" };
  } catch (error) {
    return { exitCode: 1, stdout: "", stderr: `${error instanceof Error ? error.message : String(error)}\n` };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = runCli(process.argv.slice(2));
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
