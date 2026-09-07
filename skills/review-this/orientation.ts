// Review orientation resolution per pinned revision pair (ADR-0024, ADR-0032,
// #179).
//
// Pure: captured revision facts in, compact evidence decisions out. Review
// resolves sources once for each pinned head-and-base pair and shares them in
// the existing revision packet across Standards and Spec. The compact summary
// is recorded without publishing full path lists on successful routine work;
// length alone never stops the run. The pinned pair is consumed by the
// resolution and surfaces in the result, so a different base yields a
// distinct resolution. No network, GitHub, git, filesystem-mutation, clock,
// or Agent Manager calls.

export type OrientationBand =
  | "ordinary"
  | "api-route"
  | "schema-data"
  | "re-orientation";

/** Compact durable orientation evidence (ADR-0024, ADR-0032): band, bytes, source count, cache-gap state. */
export interface CompactOrientationEvidence {
  band: OrientationBand;
  bytes: number;
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
  /** Exact sources when substituted; empty on routine work. */
  sources: readonly string[];
  /** Whether the full source list may be omitted on successful routine work. */
  omitSourceList: boolean;
  /** Whether the run must stop before broad loading (invalid set). */
  stop: boolean;
  /** Why the resolution stops or proceeds, in one stable line. */
  reason: string;
}

/**
 * Resolve one orientation set for one pinned head-and-base pair. Sources
 * resolve once per pair and are shared across Standards and Spec; the compact
 * summary is recorded without publishing full path lists on success. Length
 * alone never stops the run.
 */
export function resolveReviewOrientation(
  fact: ReviewOrientationFact,
): ReviewOrientationResolution {
  return {
    pair: fact.pair,
    evidence: {
      band: fact.resolved.band,
      bytes: fact.resolved.bytes,
      sourceCount: fact.resolved.sourceCount,
      cacheGap: fact.resolved.cacheGap,
    },
    // Exact source lists appear only on approved substitution.
    sources: fact.resolved.cacheGap ? fact.sources : [],
    omitSourceList: !fact.resolved.cacheGap,
    stop: false,
    reason: `the resolved orientation set records the required sources for head ${fact.pair.headSha} and base ${fact.pair.baseSha}`,
  };
}
