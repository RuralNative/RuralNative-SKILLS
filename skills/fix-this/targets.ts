// Single-target resolution for /fix-this (ADR-0035).
//
// Pure: facts in, decisions out. No network, GitHub, git, filesystem, or
// Agent Manager calls. Exactly one open pull request is accepted. Issue-only
// references, multiple targets, ambiguous mappings, and cross-repository or
// fork-mutation targets stop with named diagnostics. Unlike /review-this,
// issue numbers never resolve through a closing PR here: the invocation names
// the PR to finalize.

export interface RepositoryRef {
  owner: string;
  name: string;
}

export type FixReferenceForm = "bare-number" | "hash-number" | "pull-request-url";

export interface NormalizedFixReference {
  form: FixReferenceForm;
  repository: RepositoryRef | null;
  number: number;
}

const PR_URL = /^https:\/\/github\.com\/([A-Za-z0-9-_.]+)\/([A-Za-z0-9-_.]+)\/pull\/(\d+)\/?$/;

export function normalizeFixReference(raw: string): NormalizedFixReference | null {
  const token = raw.trim().replace(/^\/fix-this\s+/, "");
  if (token === "") return null;
  const bare = /^\d+$/.exec(token);
  if (bare) return { form: "bare-number", repository: null, number: Number(token) };
  const hash = /^#(\d+)$/.exec(token);
  if (hash) return { form: "hash-number", repository: null, number: Number(hash[1]) };
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

export type FixTargetDiagnostic =
  | "malformed-reference"
  | "multiple-targets"
  | "target-not-found"
  | "cross-repository-target"
  | "closed-pull-request"
  | "unsupported-issue-target"
  | "fork-mutation-unsupported";

export interface ObservedFixPullRequest {
  prNumber: number;
  state: "open" | "closed" | "merged";
  repository: RepositoryRef;
  fork: boolean;
  headSha: string;
  baseSha: string;
  baseBranch: string;
  headBranch: string;
  draft: boolean;
  mergeable: boolean;
  closesTicket: number | null;
}

export interface FixTargetObservation {
  currentRepository: RepositoryRef | null;
  pullRequests: readonly ObservedFixPullRequest[];
}

export type FixTargetResolution =
  | { ok: true; reference: NormalizedFixReference; selected: ObservedFixPullRequest }
  | { ok: false; reference: NormalizedFixReference | null; diagnostic: FixTargetDiagnostic; detail: string };

function sameRepository(a: RepositoryRef | null, b: RepositoryRef): boolean {
  if (!a) return false;
  return a.owner.toLowerCase() === b.owner.toLowerCase() && a.name.toLowerCase() === b.name.toLowerCase();
}

/**
 * Resolve exactly one fix target. Open PRs resolve for fresh finalization;
 * merged PRs resolve so a trusted checkpoint may resume bookkeeping
 * (ADR-0038). Closed-unmerged PRs never count as delivered and stop; fork
 * writes, issue references, and cross-repository targets stop too.
 */
export function resolveFixTarget(
  rawRefs: readonly string[],
  observation: FixTargetObservation,
): FixTargetResolution {
  if (rawRefs.length !== 1) {
    return { ok: false, reference: null, diagnostic: "multiple-targets", detail: "pass exactly one pull request target" };
  }
  const reference = normalizeFixReference(rawRefs[0]);
  if (!reference || reference.number < 1) {
    return { ok: false, reference, diagnostic: "malformed-reference", detail: "use /fix-this <PR-number> or a same-repository PR URL" };
  }
  if (reference.form === "pull-request-url" && reference.repository) {
    if (!observation.currentRepository || !sameRepository(reference.repository, observation.currentRepository)) {
      return { ok: false, reference, diagnostic: "cross-repository-target", detail: "URL names another repository" };
    }
  }
  const selected = observation.pullRequests.find((pr) => pr.prNumber === reference.number) ?? null;
  if (!selected) {
    return { ok: false, reference, diagnostic: "target-not-found", detail: `PR #${reference.number} was not observed` };
  }
  if (observation.currentRepository && !sameRepository(selected.repository, observation.currentRepository)) {
    return { ok: false, reference, diagnostic: "cross-repository-target", detail: "PR lives in another repository" };
  }
  if (selected.state === "closed") {
    return { ok: false, reference, diagnostic: "closed-pull-request", detail: `PR #${selected.prNumber} is closed without a merge; it never counts as delivered` };
  }
  if (selected.fork) {
    return { ok: false, reference, diagnostic: "fork-mutation-unsupported", detail: "fork writes are out of scope for this stage" };
  }
  return { ok: true, reference, selected };
}


