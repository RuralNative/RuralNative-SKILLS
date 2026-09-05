// Single-target invocation parsing for /implement-this (ADR-0031).
//
// Pure: facts in, decisions out. No network, GitHub, git, filesystem,
// or Agent Manager calls. Exactly one `#<n>` issue reference is accepted;
// everything else stops before mutation with a named diagnostic.

import {
  validateSingleTicket,
  type TicketFact,
} from "./workflow-state.ts";

export type InvocationDiagnostic =
  | "malformed-reference"
  | "multiple-targets"
  | "parent-specification"
  | "pull-request-target"
  | "cross-repository-target"
  | "ticket-not-found";

export type InvocationResolution =
  | { ok: true; ticket: number }
  | { ok: false; diagnostic: InvocationDiagnostic; detail: string };

const SINGLE_REF = /^#?(\d+)$/;
const GITHUB_URL_REF =
  /^https?:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(issues|pull)\/(\d+)(?:[/?#].*)?$/i;

/** Parse exactly one `#<n>`, bare number, or same-shape GitHub issue URL. */
export function parseSingleReference(
  refs: readonly string[],
  currentRepository?: string,
): InvocationResolution {
  if (refs.length !== 1) {
    return {
      ok: false,
      diagnostic: "multiple-targets",
      detail: `expected exactly one ticket reference, got ${refs.length}`,
    };
  }
  const raw = refs[0].trim();
  const urlMatch = GITHUB_URL_REF.exec(raw);
  if (urlMatch) {
    const parsedUrl = new URL(raw);
    const [, owner, repository, kindPart, numberPart] = parsedUrl.pathname.split("/");
    const repositoryIdentity = `${owner}/${repository}`;
    if (
      currentRepository === undefined ||
      repositoryIdentity.toLowerCase() !== currentRepository.toLowerCase()
    ) {
      return {
        ok: false,
        diagnostic: "cross-repository-target",
        detail: `\`${refs[0]}\` does not name an issue in ${currentRepository ?? "the current repository"}`,
      };
    }
    const kind = kindPart.toLowerCase();
    const n = Number(numberPart);
    if (kind === "pull") {
      return {
        ok: false,
        diagnostic: "pull-request-target",
        detail: `\`${refs[0]}\` names a pull request; /implement-this accepts only an implementation issue`,
      };
    }
    return { ok: true, ticket: n };
  }
  const match = SINGLE_REF.exec(raw);
  if (!match) {
    return {
      ok: false,
      diagnostic: "malformed-reference",
      detail: `\`${refs[0]}\` is not a ticket reference`,
    };
  }
  return { ok: true, ticket: Number(match[1]) };
}

export interface SingleTicketPlan {
  ticket: number;
  isParentSpecification: boolean;
}

/**
 * Resolve the single reference against observed facts. A reference whose
 * number is the parent of observed children is a parent specification and is
 * rejected; pull-request numbers are rejected by the caller handing over the
 * object's type. Validation of open state, blockers, assignment, and labels
 * stays in `validateSingleTicket`.
 */
export function planSingleTicket(
  refs: readonly string[],
  tickets: readonly TicketFact[],
  isPullRequestNumber: (n: number) => boolean = () => false,
  currentRepository?: string,
): InvocationResolution {
  const parsed = parseSingleReference(refs, currentRepository);
  if (!parsed.ok) return parsed;
  const n = parsed.ticket;
  if (isPullRequestNumber(n)) {
    return {
      ok: false,
      diagnostic: "pull-request-target",
      detail: `#${n} names a pull request; /implement-this accepts only an implementation issue`,
    };
  }
  if (tickets.some((t) => t.parent === n)) {
    return {
      ok: false,
      diagnostic: "parent-specification",
      detail: `#${n} is a parent specification; /implement-this accepts only one implementation ticket`,
    };
  }
  const ticket = tickets.find((t) => t.number === n);
  if (!ticket) {
    return {
      ok: false,
      diagnostic: "ticket-not-found",
      detail: `#${n} was not found among the observed ticket facts`,
    };
  }
  const parent = ticket.parent === null
    ? undefined
    : tickets.find((candidate) => candidate.number === ticket.parent);
  const validation = validateSingleTicket(ticket, n, parent);
  if (!validation.ok) {
    return {
      ok: false,
      diagnostic: "ticket-not-found",
      detail: validation.violations.join("; "),
    };
  }
  return { ok: true, ticket: n };
}
