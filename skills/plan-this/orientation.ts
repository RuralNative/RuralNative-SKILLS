// Planning-time orientation preflight (ADR-0024, #179).
//
// Pure: captured ticket and repository facts in, compact budget decisions out.
// Planning resolves an orientation set for every proposed ticket from its
// affected seams before publication approval, rejects a ticket whose set
// exceeds its selected cap, and keeps affected seam names as the durable join
// key. No network, GitHub, git, filesystem-mutation, clock, or Agent Manager
// calls.

export type OrientationBand =
  | "ordinary"
  | "api-route"
  | "schema-data"
  | "re-orientation";

export const ORIENTATION_CAPS: Record<OrientationBand, number> = {
  ordinary: 9000,
  "api-route": 13500,
  "schema-data": 18000,
  "re-orientation": 10500,
};

export const ORIENTATION_ABSOLUTE_CAP = 18000;

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

/**
 * Render the compact evidence. The exact source list appears only on failure
 * or approved substitution; successful routine output omits it.
 */
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

export interface TicketOrientationFact {
  ticket: number;
  affectedSeams: readonly string[];
  resolved: ResolvedOrientationFact;
}

export interface OrientationPreflight {
  ticket: number;
  withinBudget: boolean;
  evidence: CompactOrientationEvidence;
  reason: string;
}

/**
 * Preflight one proposed ticket before publication approval. A ticket whose
 * resolved orientation set exceeds its selected cap is rejected; the run stops
 * before broad documentation loading.
 */
export function preflightTicketOrientation(
  fact: TicketOrientationFact,
): OrientationPreflight {
  const evidence = compactOrientationEvidence(fact.resolved);
  const withinBudget = fact.resolved.bytes <= evidence.cap;
  return {
    ticket: fact.ticket,
    withinBudget,
    evidence,
    reason: withinBudget
      ? "the resolved orientation set fits the selected task-band cap"
      : `the resolved orientation set exceeds the selected cap (${fact.resolved.bytes} > ${evidence.cap}); reject the ticket before publication`,
  };
}

const SEAM_NAME = /^[a-z0-9-]+$/;

// A ticket field transports orientation content when it carries a file path,
// a section anchor, an invariant identifier, a glossary term block, a policy
// reference, or a label that names an orientation-content transport such as a
// read set or source list. Affected seam names stay the durable join key.
const TRANSPORT_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ["file path", /(?:\/|^)[A-Za-z0-9_./-]+\.(?:md|ts|tsx|js|json)(?:\b|$)/],
  ["section anchor", /(?:#[A-Za-z0-9_-]+|\banchors?\b)/],
  ["invariant list", /\bINV-\d+\b/],
  ["glossary excerpt", /\*\*[^*]+[^*]*\*\*\s*:/],
  ["policy reference", /\b(?:REVIEW\.md|policy|policies)\b\s*:\s*[^\s]+|\bREVIEW\.md\b/],
  ["read-set or source-list field", /\b(?:read set|doc set|orientation sources?|source lists?|doc read set|glossary excerpt|glossary excerpts|invariant list|invariant lists|relevant invariants|policies)\s*:/i],
  ["glossary or invariant label", /\b(?:glossary|invariant)s?\s*:/i],
];

export interface TicketOrientationShape {
  affectedSeams: readonly string[];
  sections: readonly string[];
}

/**
 * The published ticket keeps affected seam names as the durable join key and
 * adds no field that transports paths, section anchors, invariant lists,
 * glossary excerpts, or policies.
 */
export function validateTicketOrientationShape(
  shape: TicketOrientationShape,
): { ok: boolean; reason: string } {
  for (const seam of shape.affectedSeams) {
    if (!SEAM_NAME.test(seam)) {
      return {
        ok: false,
        reason: `affected seams must be seam names, not paths or anchors: ${seam}`,
      };
    }
  }
  for (const section of shape.sections) {
    for (const [label, pattern] of TRANSPORT_PATTERNS) {
      if (pattern.test(section)) {
        return {
          ok: false,
          reason: `the published ticket adds a field that transports orientation content (${label}): ${section}`,
        };
      }
    }
  }
  return {
    ok: true,
    reason: "the ticket keeps affected seam names as the durable join key",
  };
}
