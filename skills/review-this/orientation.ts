// Review orientation resolution per pinned revision pair (ADR-0024, #179).
//
// Pure: captured revision facts in, compact evidence decisions out. Review
// resolves sources once for each pinned head-and-base pair and shares them in
// the existing revision packet across Standards and Spec. The compact summary
// is recorded without publishing full path lists on successful routine work;
// an over-budget set stops before broad loading and reports its task band,
// resolved bytes, cap, source count, and exact sources. The pinned pair is
// consumed by the resolution and surfaces in the result, so a different base
// yields a distinct resolution. No network, GitHub, git, filesystem-mutation,
// clock, or Agent Manager calls.

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

export interface PinnedRevisionPair {
  headSha: string;
  baseSha: string;
}

export interface ReviewOrientationFact {
  pair: PinnedRevisionPair;
  resolved: ResolvedOrientationFact;
  /** Exact orientation sources in the resolved set, deduplicated. */
  sources: readonly string[];
}

export interface ReviewOrientationResolution {
  /** The pinned head-and-base pair this resolution belongs to. */
  pair: PinnedRevisionPair;
  /** Compact evidence shared across Standards and Spec. */
  evidence: CompactOrientationEvidence;
  /** Exact sources when the set is over budget or substituted; empty on success. */
  sources: readonly string[];
  /** Whether the full source list may be omitted on successful routine work. */
  omitSourceList: boolean;
  /** Whether the run must stop before broad loading (over-budget set). */
  stop: boolean;
  /** Why the resolution stops or proceeds, in one stable line. */
  reason: string;
}

/**
 * Resolve one orientation set for one pinned head-and-base pair. Sources
 * resolve once per pair and are shared across Standards and Spec; the compact
 * summary is recorded without publishing full path lists on success. An
 * over-budget set stops before broad loading with its exact sources, matching
 * the plan-this and implement-this preflight stop semantics.
 */
export function resolveReviewOrientation(
  fact: ReviewOrientationFact,
): ReviewOrientationResolution {
  const cap = orientationCap(fact.resolved.band);
  const withinBudget = fact.resolved.bytes <= cap;
  const overBudget = !withinBudget;
  return {
    pair: fact.pair,
    evidence: {
      band: fact.resolved.band,
      bytes: fact.resolved.bytes,
      cap,
      sourceCount: fact.resolved.sourceCount,
      cacheGap: fact.resolved.cacheGap,
    },
    // Exact source lists appear only on failure or approved substitution.
    sources: overBudget || fact.resolved.cacheGap ? fact.sources : [],
    omitSourceList: withinBudget && !fact.resolved.cacheGap,
    stop: overBudget,
    reason: withinBudget
      ? `the resolved orientation set fits the selected task-band cap for head ${fact.pair.headSha} and base ${fact.pair.baseSha}`
      : `the resolved orientation set exceeds the selected cap (${fact.resolved.bytes} > ${cap}) for head ${fact.pair.headSha} and base ${fact.pair.baseSha}; stop before broad loading`,
  };
}
