// Compact acceptance evidence for /implement-this (ADR-0031).
//
// Pure: facts in, decisions out. No network, GitHub, filesystem, clocks, or
// Agent Manager calls. Every active behavioral criterion maps to at least one
// focused passing test; bug fixes additionally require a recorded
// defect-specific failing run; non-behavior criteria record the narrow check
// or why no executable behavior changed. Generic conditional profiles are
// absent: extra proof is required only when the ticket names it as ordinary
// criterion evidence.

import type { AcceptanceCriterion } from "./workflow-state.ts";
import {
  REQUIREMENTS_REVISION_VERSION,
  activeCriteria,
  criteriaRevision,
} from "./workflow-state.ts";

export type CriterionEvidence =
  | {
      criterionId: string;
      kind: "behavior";
      /** Focused command run, e.g. `node --test skills/...`. */
      focusedCommand: string;
      /** Observed result, e.g. `12 passed`. */
      result: string;
      /** Explicit result from the focused command. Failed runs are not proof. */
      passed: boolean;
    }
  | {
      criterionId: string;
      kind: "non-behavior";
      /** Narrow check run, or why no executable behavior changed. */
      rationale: string;
    };

export interface CompactEvidenceInput {
  /** Criterion records carrying stable local IDs, text, and status. */
  criteria: readonly AcceptanceCriterion[];
  evidence: readonly CriterionEvidence[];
  isBugFix: boolean;
  /** Defect-specific failing command recorded before the fix. */
  bugRedCommand?: string;
  /** Defect-specific failing output recorded before the fix. */
  bugRedOutput?: string;
  /**
   * The versioned requirements revision value pinned for this ticket.
   * Review reads the same value from the pull-request body.
   */
  requirementsRevision: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: readonly string[];
}

export const COMPACT_EVIDENCE_MARKER_START =
  "<!-- ruralnative:compact-evidence:start -->";
export const COMPACT_EVIDENCE_MARKER_END =
  "<!-- ruralnative:compact-evidence:end -->";

export const LEGACY_EVIDENCE_MARKER_START =
  "<!-- ruralnative:acceptance-evidence:start -->";
export const LEGACY_EVIDENCE_MARKER_END =
  "<!-- ruralnative:acceptance-evidence:end -->";

function isNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function escapeEvidenceText(value: string): string {
  return value.replace(/-->/g, "--\\u003E");
}

function escapeForMarkdown(value: string): string {
  return escapeEvidenceText(value);
}

function activeCriterionIds(criteria: readonly AcceptanceCriterion[]): Set<string> {
  return new Set(activeCriteria(criteria).map((c) => c.id));
}

function retiredCriterionIds(criteria: readonly AcceptanceCriterion[]): Set<string> {
  return new Set(
    criteria.filter((c) => c.status === "retired").map((c) => c.id),
  );
}

export function validateCompactEvidence(
  input: CompactEvidenceInput,
): ValidationResult {
  const errors: string[] = [];

  const activeIds = activeCriterionIds(input.criteria);
  const retiredIds = retiredCriterionIds(input.criteria);
  const allCriterionIds = new Set(input.criteria.map((c) => c.id));

  for (const criterion of input.criteria) {
    if (!/^[A-Za-z]{2,3}-\d+$/.test(criterion.id)) {
      errors.push(`malformed criterion id: ${criterion.id}`);
    }
    if (criterion.status !== "active" && criterion.status !== "retired") {
      errors.push(`criterion ${criterion.id} must be active or retired`);
    }
  }
  const seenCriteria = new Set<string>();
  for (const criterion of input.criteria) {
    if (seenCriteria.has(criterion.id)) {
      errors.push(`duplicate or reused criterion id within the issue: ${criterion.id}`);
    }
    seenCriteria.add(criterion.id);
  }

  const expectedActive = activeCriteria(input.criteria).length;
  if (input.evidence.length !== expectedActive) {
    errors.push(
      `criterion coverage: expected ${expectedActive} evidence entries, got ${input.evidence.length}`,
    );
  }

  const seen = new Set<string>();
  for (const ev of input.evidence) {
    if (!allCriterionIds.has(ev.criterionId)) {
      errors.push(`unknown criterion: ${ev.criterionId}`);
    } else if (retiredIds.has(ev.criterionId)) {
      errors.push(`retired criterion is never accepted as active evidence: ${ev.criterionId}`);
    }
    if (seen.has(ev.criterionId)) {
      errors.push(`duplicate criterion: ${ev.criterionId}`);
    }
    seen.add(ev.criterionId);
  }
  for (const id of activeIds) {
    if (!seen.has(id)) {
      errors.push(`missing evidence for criterion: ${id}`);
    }
  }

  for (const ev of input.evidence) {
    if (ev.kind === "behavior") {
      if (!isNonEmptyString(ev.focusedCommand)) {
        errors.push(`behavior criterion "${ev.criterionId}" requires a focused command`);
      }
      if (!isNonEmptyString(ev.result)) {
        errors.push(`behavior criterion "${ev.criterionId}" requires a result`);
      }
      if (ev.passed !== true) {
        errors.push(`behavior criterion "${ev.criterionId}" requires an explicitly passing result`);
      }
    } else if (ev.kind === "non-behavior") {
      if (!isNonEmptyString(ev.rationale)) {
        errors.push(`non-behavior criterion "${ev.criterionId}" requires a rationale`);
      }
    } else {
      errors.push(`criterion "${(ev as { criterionId: string }).criterionId}" has unknown kind`);
    }
  }

  if (input.isBugFix === true) {
    if (!isNonEmptyString(input.bugRedCommand)) {
      errors.push("bug-fix ticket requires the defect-specific failing command");
    }
    if (!isNonEmptyString(input.bugRedOutput)) {
      errors.push("bug-fix ticket requires the defect-specific failing output");
    }
  }

  if (!isNonEmptyString(input.requirementsRevision)) {
    errors.push("requirements revision must be a non-empty value");
  } else if (
    !new RegExp(
      `^${REQUIREMENTS_REVISION_VERSION}:parent=[a-f0-9]{64};ticket=[a-f0-9]{64}$`,
    ).test(input.requirementsRevision)
  ) {
    errors.push(
      `requirements revision must match ${REQUIREMENTS_REVISION_VERSION}:parent=<sha256>;ticket=<sha256>`,
    );
  }

  return { ok: errors.length === 0, errors };
}

export function renderCompactEvidence(input: CompactEvidenceInput): string {
  const validation = validateCompactEvidence(input);
  if (!validation.ok) {
    throw new Error(`invalid compact evidence: ${validation.errors.join("; ")}`);
  }
  const evidenceByCriterion = new Map(input.evidence.map((e) => [e.criterionId, e] as const));
  const lines: string[] = [];
  lines.push(COMPACT_EVIDENCE_MARKER_START);
  lines.push("## Implementation evidence");
  lines.push("");
  for (const criterion of activeCriteria(input.criteria)) {
    const ev = evidenceByCriterion.get(criterion.id)!;
    lines.push(`- **Criterion:** \`${escapeForMarkdown(criterion.id)}\` — ${escapeForMarkdown(criterion.text)}`);
    if (ev.kind === "behavior") {
      lines.push(`  - Focused command: \`${escapeForMarkdown(ev.focusedCommand)}\``);
      lines.push("  - Passed: true");
      lines.push(`  - Result: ${escapeForMarkdown(ev.result)}`);
    } else {
      lines.push(`  - Check: ${escapeForMarkdown(ev.rationale)}`);
    }
  }
  if (input.isBugFix === true) {
    lines.push("");
    lines.push("### Bug reproduction");
    lines.push(`- RED command: \`${escapeForMarkdown(input.bugRedCommand!)}\``);
    lines.push(`- RED output: ${escapeForMarkdown(input.bugRedOutput!)}`);
  }
  lines.push("");
  lines.push(`- Criteria revision: ${escapeForMarkdown(criteriaRevision(input.criteria))}`);
  lines.push(`- Requirements revision: ${escapeForMarkdown(input.requirementsRevision)}`);
  lines.push(COMPACT_EVIDENCE_MARKER_END);
  return lines.join("\n");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Upsert the compact evidence block into the pull-request body in the same
 * publication operation as the closing reference. Deterministic: exactly one
 * compact block exists afterwards; legacy comment blocks are never written.
 */
export function upsertCompactEvidenceBlock(
  existingBody: string,
  block: string,
): string {
  const markerPattern = new RegExp(
    `${escapeRegExp(COMPACT_EVIDENCE_MARKER_START)}[\\s\\S]*?${escapeRegExp(COMPACT_EVIDENCE_MARKER_END)}`,
    "g",
  );
  const withoutOldBlocks = existingBody.replace(markerPattern, "").trimEnd();
  return withoutOldBlocks.length > 0
    ? `${withoutOldBlocks}\n\n${block}\n`
    : `${block}\n`;
}

/** Read the compact block from a pull-request body, if present. */
export function parseCompactEvidenceBlock(body: string): string | null {
  const match = body.match(
    new RegExp(
      `${escapeRegExp(COMPACT_EVIDENCE_MARKER_START)}\\n([\\s\\S]*?)\\n${escapeRegExp(COMPACT_EVIDENCE_MARKER_END)}`,
    ),
  );
  return match ? match[1] : null;
}

/**
 * Migration read: the compact block lives only in the pull-request body,
 * otherwise the legacy acceptance-evidence block in the body or comments.
 * Comment bodies carry legacy evidence only. New runs write only the
 * compact body form.
 */
export function readEvidenceForReview(
  body: string,
  comments: readonly string[] = [],
): string | null {
  const compact = parseCompactEvidenceBlock(body);
  if (compact !== null) return compact;
  const legacy = body.match(
    new RegExp(
      `${escapeRegExp(LEGACY_EVIDENCE_MARKER_START)}\\n([\\s\\S]*?)\\n${escapeRegExp(LEGACY_EVIDENCE_MARKER_END)}`,
    ),
  );
  if (legacy) return legacy[1];
  for (const comment of comments) {
    const legacyComment = comment.match(
      new RegExp(
        `${escapeRegExp(LEGACY_EVIDENCE_MARKER_START)}\\n([\\s\\S]*?)\\n${escapeRegExp(LEGACY_EVIDENCE_MARKER_END)}`,
      ),
    );
    if (legacyComment) return legacyComment[1];
  }
  return null;
}
