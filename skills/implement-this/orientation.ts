// Implementation orientation preflight and direct-ticket resolution (ADR-0024,
// #179).
//
// Pure: captured ticket facts and a compact architecture-index summary in,
// decisions out. The worker resolves current sources in its checkout before
// broad documentation loading, records the compact durable summary with the
// existing timing and acceptance evidence, and follows the same bounded path
// for a direct ticket with valid affected seams. A ticket without valid seam
// metadata receives one resolution attempt against the compact index and code
// roots; one clear mapping proceeds, ambiguity adds `needs-info` and stops
// before edits. No fallback reads every leaf, ADR, policy, or derived human
// documentation tree. No network, GitHub, git, filesystem-mutation, clock, or
// Agent Manager calls.

export type OrientationBand =
  | "ordinary"
  | "api-route"
  | "schema-data"
  | "re-orientation";

export const ORIENTATION_CAPS: Record<OrientationBand, number> = {
  ordinary: 6000,
  "api-route": 9000,
  "schema-data": 12000,
  "re-orientation": 7000,
};

export const ORIENTATION_ABSOLUTE_CAP = 12000;

export function orientationCap(band: OrientationBand): number {
  return Math.min(ORIENTATION_CAPS[band], ORIENTATION_ABSOLUTE_CAP);
}

/** Compact durable orientation evidence (ADR-0024): band, bytes, cap, source count, cache-gap state. */
export interface CompactOrientationEvidence {
  band: OrientationBand;
  bytes: number;
  cap: number;
  sourceCount: number;
  cacheGap: boolean;
}

export interface ResolvedOrientationFact {
  band: OrientationBand;
  bytes: number;
  sourceCount: number;
  cacheGap: boolean;
}

export function compactOrientationEvidence(
  resolved: ResolvedOrientationFact,
): CompactOrientationEvidence {
  return {
    band: resolved.band,
    bytes: resolved.bytes,
    cap: orientationCap(resolved.band),
    sourceCount: resolved.sourceCount,
    cacheGap: resolved.cacheGap,
  };
}

export function renderCompactOrientationEvidence(
  evidence: CompactOrientationEvidence,
): string {
  return [
    `task band: ${evidence.band}`,
    `resolved bytes: ${evidence.bytes}`,
    `cap: ${evidence.cap}`,
    `source count: ${evidence.sourceCount}`,
    `cache-gap state: ${evidence.cacheGap ? "approved" : "none"}`,
  ].join("\n");
}

export interface WorkerOrientationFact {
  affectedSeams: readonly string[];
  resolved: ResolvedOrientationFact;
}

export interface WorkerOrientationPreflight {
  withinBudget: boolean;
  evidence: CompactOrientationEvidence;
  reason: string;
}

/**
 * Resolve and check the worker's orientation set before broad documentation
 * loading. An over-budget route stops before the broad read.
 */
export function preflightWorkerOrientation(
  fact: WorkerOrientationFact,
): WorkerOrientationPreflight {
  const evidence = compactOrientationEvidence(fact.resolved);
  const withinBudget = fact.resolved.bytes <= evidence.cap;
  return {
    withinBudget,
    evidence,
    reason: withinBudget
      ? "the resolved orientation set fits the selected task-band cap"
      : `the resolved orientation set exceeds the selected cap (${fact.resolved.bytes} > ${evidence.cap}); stop before broad loading`,
  };
}

export type SeamResolution =
  | {
      ok: true;
      seam: string;
      reason: string;
    }
  | {
      ok: false;
      reason: string;
    };

export interface SeamCandidate {
  seam: string;
  /** Code-root match, e.g. the index row's `skills/<seam>/` maps the ticket seam. */
  codeRoot: string;
}

export interface DirectSeamResolutionFact {
  /** The requested affected seam name from the ticket, when present. */
  requestedSeam: string | null;
  /** Candidate seam names that match the compact architecture index. */
  candidates: readonly SeamCandidate[];
}

/**
 * One bounded resolution attempt for a ticket without valid seam metadata.
 * A single unambiguous code-root mapping proceeds; ambiguity or an empty set
 * adds `needs-info` and stops before edits.
 */
export function resolveDirectTicketSeam(
  fact: DirectSeamResolutionFact,
): SeamResolution {
  const candidates = fact.candidates;
  if (fact.requestedSeam !== null) {
    const exact = candidates.find((c) => c.seam === fact.requestedSeam);
    if (exact) {
      return {
        ok: true,
        seam: exact.seam,
        reason: "the requested affected seam matches the compact architecture index",
      };
    }
    return {
      ok: false,
      reason: `requested seam '${fact.requestedSeam}' is not in the compact architecture index; add needs-info and stop before edits`,
    };
  }
  if (candidates.length === 0) {
    return {
      ok: false,
      reason: "no seam metadata and no code-root mapping; add needs-info and stop before edits",
    };
  }
  const unique = new Set(candidates.map((c) => c.seam));
  if (unique.size !== 1) {
    return {
      ok: false,
      reason: `ambiguous seam resolution (${[...unique].join(", ")}); add needs-info and stop before edits`,
    };
  }
  return {
    ok: true,
    seam: [...unique][0] as string,
    reason: "one unambiguous code-root mapping resolves the affected seam",
  };
}
