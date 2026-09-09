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
  SUPPORTED_REQUIREMENTS_VERSIONS,
  activeCriteria,
  criteriaRevision,
  requirementsPinWellFormed,
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
  /**
   * Final committed head SHA the evidence was verified against. New
   * envelopes bind proof to this SHA outside the commit to avoid a circular
   * hash. Required: unversioned output is never emitted for new work;
   * pre-envelope evidence is read-only legacy.
   */
  headSha: string;
}

export const EVIDENCE_ENVELOPE_VERSION = "evidence-v2";

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

  if (!requirementsPinWellFormed(input.requirementsRevision)) {
    errors.push(
      `requirements revision must match a supported version (${SUPPORTED_REQUIREMENTS_VERSIONS.join(", ")}):parent=<sha256>;ticket=<sha256>`,
    );
  }

  if (!isNonEmptyString(input.headSha)) {
    errors.push("evidence head SHA must be a non-empty value");
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
  lines.push(`- Envelope version: ${EVIDENCE_ENVELOPE_VERSION}`);
  lines.push(`- Head SHA: ${escapeForMarkdown(input.headSha)}`);
  lines.push(COMPACT_EVIDENCE_MARKER_END);
  return lines.join("\n");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeBodyNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

/**
 * Upsert the compact evidence block into the pull-request body in the same
 * publication operation as the closing reference. Deterministic: exactly one
 * compact block exists afterwards; legacy comment blocks are never written.
 * LF and CRLF bodies are equivalent; marker identity is never relaxed.
 */
export function upsertCompactEvidenceBlock(
  existingBody: string,
  block: string,
): string {
  const markerPattern = new RegExp(
    `${escapeRegExp(COMPACT_EVIDENCE_MARKER_START)}[ \\t]*\\r?\\n[\\s\\S]*?\\r?\\n[ \\t]*${escapeRegExp(COMPACT_EVIDENCE_MARKER_END)}`,
    "g",
  );
  const withoutOldBlocks = existingBody.replace(markerPattern, "").trimEnd();
  return withoutOldBlocks.length > 0
    ? `${withoutOldBlocks}\n\n${block}\n`
    : `${block}\n`;
}

/** Read the compact block from a pull-request body, if present. */
export function parseCompactEvidenceBlock(body: string): string | null {
  const normalized = normalizeBodyNewlines(body);
  const match = normalized.match(
    new RegExp(
      `${escapeRegExp(COMPACT_EVIDENCE_MARKER_START)}[ \\t]*\\n([\\s\\S]*?)\\n[ \\t]*${escapeRegExp(COMPACT_EVIDENCE_MARKER_END)}`,
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
  const normalized = normalizeBodyNewlines(body);
  const legacy = normalized.match(
    new RegExp(
      `${escapeRegExp(LEGACY_EVIDENCE_MARKER_START)}[ \\t]*\\n([\\s\\S]*?)\\n[ \\t]*${escapeRegExp(LEGACY_EVIDENCE_MARKER_END)}`,
    ),
  );
  if (legacy) return legacy[1];
  for (const comment of comments) {
    const normalizedComment = normalizeBodyNewlines(comment);
    const legacyComment = normalizedComment.match(
      new RegExp(
        `${escapeRegExp(LEGACY_EVIDENCE_MARKER_START)}[ \\t]*\\n([\\s\\S]*?)\\n[ \\t]*${escapeRegExp(LEGACY_EVIDENCE_MARKER_END)}`,
      ),
    );
    if (legacyComment) return legacyComment[1];
  }
  return null;
}

function splitFencedSegments(body: string): { text: string; fenced: boolean }[] {
  const segments: { text: string; fenced: boolean }[] = [];
  const fencePattern = /```[\s\S]*?(?:```|$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = fencePattern.exec(body)) !== null) {
    if (m.index > last) segments.push({ text: body.slice(last, m.index), fenced: false });
    segments.push({ text: m[0], fenced: true });
    last = m.index + m[0].length;
  }
  if (last < body.length) segments.push({ text: body.slice(last), fenced: false });
  if (segments.length === 0) segments.push({ text: body, fenced: false });
  return segments;
}

function targetClosingAssociation(ticket: number): RegExp {
  return new RegExp(
    `(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)[ \\t]+(?:https?:\\/\\/[^\\s]+\\/issues\\/${ticket}(?!\\d)|#${ticket}(?!\\d))`,
    "i",
  );
}

function proseHasTargetClosing(body: string, ticket: number): boolean {
  const pattern = targetClosingAssociation(ticket);
  return splitFencedSegments(body).some((s) => !s.fenced && pattern.test(s.text));
}

function removeStandaloneTargetClosesInProse(body: string, ticket: number): string {
  return splitFencedSegments(body)
    .map((s) => {
      if (s.fenced) return s.text;
      return s.text.replace(/^[ \t]*[Cc]loses[ \t]+#\d+[ \t]*\r?$/gm, (line) => {
        const n = Number(line.match(/#(\d+)/)?.[1] ?? NaN);
        return n === ticket ? "" : line;
      });
    })
    .join("");
}

function collapseProseBlankLines(body: string): string {
  return splitFencedSegments(body)
    .map((s) => (s.fenced ? s.text : s.text.replace(/\n{3,}/g, "\n\n")))
    .join("");
}

/**
 * Ensure exactly one `Closes #<ticket>` line for the target ticket.
 * Preserves unrelated prose and fenced examples. Existing target lines are
 * deduplicated; closes lines for other tickets are left untouched for the
 * caller to reconcile as a conflicting association stop.
 */
export function ensureClosingReference(body: string, ticket: number): string {
  const prose = splitFencedSegments(body)
    .filter((s) => !s.fenced)
    .map((s) => s.text)
    .join("");
  const targetPattern = new RegExp(`^[ \\t]*[Cc]loses[ \\t]+#${ticket}[ \\t]*\\r?$`, "gm");
  if ((prose.match(targetPattern) ?? []).length === 1 && !proseHasTargetClosingOtherForm(body, ticket)) {
    return body.endsWith("\n") ? body : `${body}\n`;
  }
  const withoutTargets = removeStandaloneTargetClosesInProse(body, ticket);
  if (proseHasTargetClosing(withoutTargets, ticket)) {
    const cleaned = collapseProseBlankLines(withoutTargets).trimEnd();
    return cleaned.endsWith("\n") ? cleaned : `${cleaned}\n`;
  }
  const cleaned = collapseProseBlankLines(withoutTargets).trimEnd();
  const line = `Closes #${ticket}`;
  return cleaned.length > 0 ? `${cleaned}\n\n${line}\n` : `${line}\n`;
}

function proseHasTargetClosingOtherForm(body: string, ticket: number): boolean {
  // True when prose carries the target association in a form other than the
  // canonical standalone `Closes #N` line (e.g. `Fixes #N` or an issue URL).
  const segments = splitFencedSegments(body);
  const prose = segments
    .filter((s) => !s.fenced)
    .map((s) => s.text)
    .join("");
  const withoutCanonical = prose.replace(/^[ \t]*[Cc]loses[ \t]+#\d+[ \t]*\r?$/gm, "");
  return targetClosingAssociation(ticket).test(withoutCanonical);
}

/**
 * Compose the pull-request body in one publication operation: exactly one
 * compact evidence block plus exactly one target closing reference,
 * preserving unrelated prose and fenced examples. An existing valid target
 * association (`Fixes #N`, `Closes #N`, issue URL) is preserved instead of
 * duplicated. The caller must have stopped on conflicting ticket associations
 * before calling. Fixed order is context, block, then closing reference, so
 * repeated composition is idempotent.
 */
export function composePullRequestBody(
  existingBody: string,
  ticket: number,
  block: string,
): string {
  const blockPattern = new RegExp(
    `${escapeRegExp(COMPACT_EVIDENCE_MARKER_START)}[ \\t]*\\r?\\n[\\s\\S]*?\\r?\\n[ \\t]*${escapeRegExp(COMPACT_EVIDENCE_MARKER_END)}`,
    "g",
  );
  const withoutBlocks = existingBody.replace(blockPattern, "");
  const withoutTargets = removeStandaloneTargetClosesInProse(withoutBlocks, ticket);
  const trimmedBlock = block.trim();
  if (proseHasTargetClosing(withoutTargets, ticket)) {
    const cleaned = collapseProseBlankLines(withoutTargets).trimEnd();
    if (cleaned.length === 0) return `${trimmedBlock}\n`;
    return `${cleaned}\n\n${trimmedBlock}\n`;
  }
  const cleaned = collapseProseBlankLines(withoutTargets).trimEnd();
  const line = `Closes #${ticket}`;
  if (cleaned.length === 0) return `${trimmedBlock}\n\n${line}\n`;
  return `${cleaned}\n\n${trimmedBlock}\n\n${line}\n`;
}
