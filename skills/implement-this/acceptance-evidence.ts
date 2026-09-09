// Compact acceptance evidence for /implement-this (ADR-0031, ADR-0038).
//
// The pure evidence render/upsert/read helpers now live in the authored
// shared core (`workflow-state.ts`), which every workflow package carries
// byte-identical, so `/fix-this` renders and validates `evidence-v2` from its
// own installed bundle. This module keeps the local compatibility exports:
// it re-exports the shared implementation and adds no second implementation.

export type { CriterionEvidence, CompactEvidenceInput } from "./workflow-state.ts";
export type { EvidenceValidationResult as ValidationResult } from "./workflow-state.ts";
export {
  COMPACT_EVIDENCE_MARKER_END,
  COMPACT_EVIDENCE_MARKER_START,
  EVIDENCE_ENVELOPE_VERSION,
  LEGACY_EVIDENCE_MARKER_END,
  LEGACY_EVIDENCE_MARKER_START,
  composePullRequestBody,
  ensureClosingReference,
  parseCompactEvidenceBlock,
  readEvidenceForReview,
  renderCompactEvidence,
  upsertCompactEvidenceBlock,
  validateCompactEvidence,
} from "./workflow-state.ts";
