// Target resolution for /review-this (#156, parent #152).
//
// One pure resolver for parent specifications, child issues, pull requests,
// and URLs. Bare and hash references normalize identically before object
// resolution; the resolved GitHub object's own type decides whether the
// number names an issue or a pull request. The resolver returns facts and
// decisions only: no network, GitHub, git, filesystem mutation, or
// worker-management calls, and no worktree intent for invalid or ambiguous
// targets.

import { selectReviewWave } from "./discovery.ts";
import type {
  PullRequestLink,
  ReviewWaveItem,
  ReviewedRevision,
} from "./discovery.ts";
import type { TicketFact } from "./workflow-state.ts";

export interface RepositoryRef {
  owner: string;
  name: string;
}

export type ReferenceForm = "bare-number" | "hash-number" | "issue-url" | "pull-request-url";

export interface NormalizedReference {
  form: ReferenceForm;
  repository: RepositoryRef | null;
  number: number;
}

const ISSUE_URL = /^https:\/\/github\.com\/([A-Za-z0-9-_.]+)\/([A-Za-z0-9-_.]+)\/issues\/(\d+)\/?$/;
const PR_URL = /^https:\/\/github\.com\/([A-Za-z0-9-_.]+)\/([A-Za-z0-9-_.]+)\/pull\/(\d+)\/?$/;

/**
 * Normalize one invocation target.
 *
 * `/review-this 100` and `/review-this #100` normalize to the same number.
 * Full issue and pull-request URLs carry their repository. Returns null for
 * malformed references; the caller reports `malformed-reference`.
 */
export function normalizeReference(raw: string): NormalizedReference | null {
  const token = raw.trim().replace(/^\/review-this\s+/, "");
  if (token === "") return null;
  const bare = /^\d+$/.exec(token);
  if (bare) return { form: "bare-number", repository: null, number: Number(token) };
  const hash = /^#(\d+)$/.exec(token);
  if (hash) return { form: "hash-number", repository: null, number: Number(hash[1]) };
  const issueUrl = ISSUE_URL.exec(token);
  if (issueUrl) {
    return {
      form: "issue-url",
      repository: { owner: issueUrl[1], name: issueUrl[2] },
      number: Number(issueUrl[3]),
    };
  }
  const prUrl = PR_URL.exec(token);
  if (prUrl) {
    return {
      form: "pull-request-url",
      repository: { owner: prUrl[1], name: prUrl[2] },
      number: Number(prUrl[3]),
    };
  }
  return null;
}

export type TargetDiagnostic =
  | "malformed-reference"
  | "target-not-found"
  | "cross-repository-target"
  | "closed-pull-request"
  | "missing-pull-request"
  | "standalone-issue-without-pull-request"
  | "ambiguous-pull-requests";

export type TargetResolution =
  | {
      ok: true;
      reference: NormalizedReference;
      objectType: "parent-specification" | "child-issue" | "standalone-issue" | "pull-request";
      plan: ReviewTargetPlan;
    }
  | {
      ok: false;
      reference: NormalizedReference | null;
      diagnostic: TargetDiagnostic;
      detail: string;
    };

export interface SelectedPullRequest {
  ticket: number | null;
  prNumber: number;
  headSha: string;
  baseSha: string;
}

export interface ReviewTargetPlan {
  mode: "parent-wave" | "single-pull-request";
  spec: number | null;
  specReview: "available" | "unavailable";
  autoMergeAllowed: boolean;
  selections: readonly SelectedPullRequest[];
}

export interface TargetResolutionContext {
  repository: RepositoryRef;
  explicitRepository?: RepositoryRef | null;
  tickets: readonly TicketFact[];
  pullRequests: readonly PullRequestLink[];
  previouslyReviewed?: readonly ReviewedRevision[];
}

function sameRepository(a: RepositoryRef, b: RepositoryRef): boolean {
  return a.owner === b.owner && a.name === b.name;
}

function ticketParent(
  tickets: readonly TicketFact[],
  number: number,
): number | null {
  return tickets.find((t) => t.number === number)?.parent ?? null;
}

function openPrsClosing(
  pullRequests: readonly PullRequestLink[],
  ticket: number,
): PullRequestLink[] {
  return pullRequests.filter(
    (pr) => pr.state === "open" && pr.closesTicket === ticket,
  );
}

function ambiguousParentPullRequests(
  tickets: readonly TicketFact[],
  pullRequests: readonly PullRequestLink[],
  spec: number,
): PullRequestLink[] | null {
  for (const ticket of tickets) {
    if (ticket.parent !== spec) continue;
    const candidates = openPrsClosing(pullRequests, ticket.number).filter(
      (pr) => pr.ticket === ticket.number,
    );
    if (candidates.length > 1) return candidates;
  }
  return null;
}

function singleSelection(pr: PullRequestLink): SelectedPullRequest {
  return {
    ticket: pr.closesTicket,
    prNumber: pr.prNumber,
    headSha: pr.headSha,
    baseSha: pr.baseSha,
  };
}

/**
 * Review readiness for one pull request.
 *
 * Readiness comes from an open pull request, a valid closing reference, and
 * posted implementation acceptance evidence. `ready-for-human` keeps its
 * triage meaning and is never pull-request readiness.
 */
export function reviewReadiness(
  pr: PullRequestLink,
): { ready: boolean; blockers: string[] } {
  const blockers: string[] = [];
  if (pr.state !== "open") blockers.push("the pull request is not open");
  if (pr.closesTicket === null) blockers.push("the pull request has no valid closing reference");
  if (pr.headSha.trim() === "") blockers.push("the pull request has no current head revision");
  if (pr.baseSha.trim() === "") blockers.push("the pull request has no current base revision");
  if (!pr.hasAcceptanceEvidence) {
    blockers.push("the pull request has no posted implementation acceptance evidence");
  }
  return { ready: blockers.length === 0, blockers };
}

/**
 * Resolve one invocation target against observed GitHub facts.
 *
 * The resolver identifies the exact pull-request set before any review or fix
 * worktree is created and before any write. A cross-repository target stops
 * unless the caller recorded that the user explicitly chose that repository.
 */
export function resolveReviewTarget(
  raw: string,
  context: TargetResolutionContext,
): TargetResolution {
  const reference = normalizeReference(raw);
  if (!reference) {
    return {
      ok: false,
      reference: null,
      diagnostic: "malformed-reference",
      detail: `the target ${JSON.stringify(raw)} is not a bare number, hash number, or GitHub issue or pull-request URL`,
    };
  }
  if (
    reference.repository &&
    !sameRepository(reference.repository, context.repository) &&
    !(context.explicitRepository && sameRepository(reference.repository, context.explicitRepository))
  ) {
    return {
      ok: false,
      reference,
      diagnostic: "cross-repository-target",
      detail: `the target names ${reference.repository.owner}/${reference.repository.name}, not ${context.repository.owner}/${context.repository.name}`,
    };
  }
  const number = reference.number;

  const pr = context.pullRequests.find((p) => p.prNumber === number);
  if (pr) {
    if (pr.state !== "open") {
      return {
        ok: false,
        reference,
        diagnostic: "closed-pull-request",
        detail: `pull request #${number} is ${pr.state}`,
      };
    }
    const ticket = pr.closesTicket;
    const spec = ticket === null ? null : ticketParent(context.tickets, ticket);
    const readiness = reviewReadiness(pr);
    return {
      ok: true,
      reference,
      objectType: "pull-request",
      plan: {
        mode: "single-pull-request",
        spec,
        specReview: spec === null ? "unavailable" : "available",
        autoMergeAllowed: spec !== null && readiness.ready,
        selections: [singleSelection(pr)],
      },
    };
  }

  // A parent specification is identified by its native children, not by a
  // fact row of its own.
  if (context.tickets.some((t) => t.parent === number)) {
    const ambiguous = ambiguousParentPullRequests(
      context.tickets,
      context.pullRequests,
      number,
    );
    if (ambiguous) {
      return {
        ok: false,
        reference,
        diagnostic: "ambiguous-pull-requests",
        detail: `parent specification #${number} has several candidate pull requests for issue #${ambiguous[0].ticket}: ${ambiguous.map((candidate) => `#${candidate.prNumber}`).join(", ")}`,
      };
    }
    const wave = selectReviewWave(
      context.tickets,
      context.pullRequests,
      number,
      context.previouslyReviewed ?? [],
    );
    return {
      ok: true,
      reference,
      objectType: "parent-specification",
      plan: {
        mode: "parent-wave",
        spec: number,
        specReview: "available",
        autoMergeAllowed: true,
        selections: wave.map((item) => ({
          ticket: item.ticket,
          prNumber: item.prNumber,
          headSha: item.headSha,
          baseSha: item.baseSha,
        })),
      },
    };
  }

  const ticket = context.tickets.find((t) => t.number === number);
  if (!ticket) {
    return {
      ok: false,
      reference,
      diagnostic: "target-not-found",
      detail: `no issue or pull request #${number} was observed in ${context.repository.owner}/${context.repository.name}`,
    };
  }

  const candidates = openPrsClosing(context.pullRequests, number);
  const objectType = ticket.parent === null ? "standalone-issue" : "child-issue";
  if (candidates.length === 0) {
    return {
      ok: false,
      reference,
      diagnostic:
        objectType === "standalone-issue"
          ? "standalone-issue-without-pull-request"
          : "missing-pull-request",
      detail: `issue #${number} has no open pull request with a closing reference`,
    };
  }
  if (candidates.length > 1) {
    return {
      ok: false,
      reference,
      diagnostic: "ambiguous-pull-requests",
      detail: `issue #${number} has ${candidates.length} candidate pull requests: ${candidates.map((p) => `#${p.prNumber}`).join(", ")}`,
    };
  }
  const candidate = candidates[0];
  const readiness = reviewReadiness(candidate);
  return {
    ok: true,
    reference,
    objectType,
    plan: {
      mode: "single-pull-request",
      spec: ticket.parent,
      specReview: ticket.parent === null ? "unavailable" : "available",
      autoMergeAllowed: ticket.parent !== null && readiness.ready,
      selections: [singleSelection(candidate)],
    },
  };
}

export type { PullRequestLink, ReviewWaveItem, ReviewedRevision };
