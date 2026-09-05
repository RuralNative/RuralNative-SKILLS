// Single-target resolution for /review-this (ADR-0031).
//
// Pure: facts in, decisions out. No network, GitHub, git, filesystem, or
// Agent Manager calls. Exactly one pull request, or one issue resolving to
// exactly one open pull request, is accepted. Parent specifications,
// ambiguous mappings, and multiple targets stop with named diagnostics.

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
  | "multiple-targets"
  | "target-not-found"
  | "cross-repository-target"
  | "closed-pull-request"
  | "missing-pull-request"
  | "standalone-issue-without-pull-request"
  | "ambiguous-pull-requests"
  | "parent-specification";

export interface ObservedPullRequest {
  prNumber: number;
  state: "open" | "closed" | "merged";
  headSha: string;
  baseSha: string;
  closesTicket: number | null;
  hasEvidence: boolean;
  requirementsRevision?: string;
}

export interface ObservedIssue {
  number: number;
  state: "open" | "closed";
  /** True when this issue is a parent specification of observed children. */
  isParentSpecification: boolean;
}

export interface SelectedPullRequest {
  ticket: number | null;
  prNumber: number;
  headSha: string;
  baseSha: string;
  requirementsRevision?: string;
}

export type TargetResolution =
  | { ok: true; reference: NormalizedReference; selected: SelectedPullRequest }
  | { ok: false; reference: NormalizedReference | null; diagnostic: TargetDiagnostic; detail: string };

export interface TargetObservation {
  currentRepository: RepositoryRef | null;
  issues: readonly ObservedIssue[];
  pullRequests: readonly ObservedPullRequest[];
}

/**
 * Resolve exactly one target to exactly one open pull request.
 *
 * Explicit URL forms take precedence: a pull-request URL selects that pull
 * request directly, an issue URL resolves through its closing pull request.
 * A bare or hash number selects the observed pull request when present,
 * otherwise resolves as an issue. Parent specifications, closed pull
 * requests, missing links, and ambiguous mappings stop with named
 * diagnostics and no worktree intent.
 */
export function resolveSingleTarget(
  rawRefs: readonly string[],
  observation: TargetObservation,
): TargetResolution {
  if (rawRefs.length !== 1) {
    return {
      ok: false,
      reference: null,
      diagnostic: "multiple-targets",
      detail: `expected exactly one target, got ${rawRefs.length}`,
    };
  }
  const reference = normalizeReference(rawRefs[0]);
  if (reference === null) {
    return {
      ok: false,
      reference: null,
      diagnostic: "malformed-reference",
      detail: `\`${rawRefs[0]}\` is not a review target reference`,
    };
  }
  if (reference.repository !== null) {
    if (observation.currentRepository === null) {
      return {
        ok: false,
        reference,
        diagnostic: "cross-repository-target",
        detail: `target lives in ${reference.repository.owner}/${reference.repository.name}, but the current repository identity is unknown`,
      };
    }
    if (
      reference.repository.owner.toLowerCase() !== observation.currentRepository.owner.toLowerCase() ||
      reference.repository.name.toLowerCase() !== observation.currentRepository.name.toLowerCase()
    ) {
      return {
        ok: false,
        reference,
        diagnostic: "cross-repository-target",
        detail: `target lives in ${reference.repository.owner}/${reference.repository.name}, not the current repository`,
      };
    }
  }
  const observedPull = observation.pullRequests.some((pr) => pr.prNumber === reference.number);
  const observedIssue = observation.issues.some((issue) => issue.number === reference.number);

  if (reference.form === "pull-request-url" || (reference.form !== "issue-url" && observedPull)) {
    const pr = observation.pullRequests.find((p) => p.prNumber === reference.number);
    if (!pr) {
      return { ok: false, reference, diagnostic: "target-not-found", detail: `pull request #${reference.number} was not found` };
    }
    if (pr.state !== "open") {
      return { ok: false, reference, diagnostic: "closed-pull-request", detail: `pull request #${pr.prNumber} is ${pr.state}` };
    }
    return {
      ok: true,
      reference,
      selected: { ticket: pr.closesTicket, prNumber: pr.prNumber, headSha: pr.headSha, baseSha: pr.baseSha, requirementsRevision: pr.requirementsRevision },
    };
  }

  if (!observedIssue && reference.form !== "issue-url") {
    // Unknown number: it may still name a pull request the observer did not
    // list. Report not-found rather than guessing its type.
    return { ok: false, reference, diagnostic: "target-not-found", detail: `#${reference.number} matches no observed issue or pull request` };
  }

  const issue = observation.issues.find((i) => i.number === reference.number);
  if (!issue) {
    return { ok: false, reference, diagnostic: "target-not-found", detail: `issue #${reference.number} was not found` };
  }
  if (issue.isParentSpecification) {
    return {
      ok: false,
      reference,
      diagnostic: "parent-specification",
      detail: `#${issue.number} is a parent specification; /review-this accepts one pull request or one issue with one pull request`,
    };
  }
  const candidates = observation.pullRequests.filter(
    (pr) => pr.state === "open" && pr.closesTicket === issue.number,
  );
  if (candidates.length === 0) {
    if (observation.pullRequests.some((pr) => pr.closesTicket === issue.number)) {
      return { ok: false, reference, diagnostic: "closed-pull-request", detail: `issue #${issue.number} has no open closing pull request` };
    }
    return { ok: false, reference, diagnostic: "standalone-issue-without-pull-request", detail: `issue #${issue.number} has no closing pull request` };
  }
  if (candidates.length > 1) {
    return {
      ok: false,
      reference,
      diagnostic: "ambiguous-pull-requests",
      detail: `issue #${issue.number} closes through ${candidates.length} open pull requests`,
    };
  }
  const pr = candidates[0];
  return {
    ok: true,
    reference,
    selected: { ticket: issue.number, prNumber: pr.prNumber, headSha: pr.headSha, baseSha: pr.baseSha, requirementsRevision: pr.requirementsRevision },
  };
}
