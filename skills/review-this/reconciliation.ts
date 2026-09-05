// Local finding validation for the single pull-request review (ADR-0031).
//
// Pure: facts in, decisions out. No network, GitHub, git, or worker calls.
// Validates local Standards and Spec findings against one current head and
// base pair for scope, evidence, severity, category, and exact revisions.
// The frontier reviewer reconciles both axes in-session; identical defects
// reported twice count once with the clearest evidence kept.

import { criterionKey } from "./workflow-state.ts";

export type FindingSource = "standards" | "spec";
export type FindingCategory =
  | "security"
  | "performance"
  | "correctness-and-edge-cases"
  | "style"
  | "tests-and-test-bloat"
  | "documentation";
export type FindingSeverity = "advisory" | "blocking";
export type FindingEvidence =
  | { kind: "inline"; quote: string }
  | { kind: "failure"; command: string; output: string };

/**
 * The stable key one review finding uses to name an acceptance criterion:
 * the authority issue number plus the local criterion ID.
 */
export function criterionReference(issue: number, id: string): string {
  return criterionKey(issue, id);
}

export interface Finding {
  /** Stable identifier supplied by the reviewer. */
  id?: string;
  source: FindingSource;
  category?: FindingCategory;
  severity?: FindingSeverity;
  file: string;
  line: number;
  message: string;
  evidence?: FindingEvidence;
  headSha: string;
  baseSha?: string;
  governingRule?: string;
  inDiff: boolean;
  verified: boolean;
  ticket?: number;
}

export interface ReconciledFinding {
  id: string;
  source: FindingSource;
  category: FindingCategory;
  severity: FindingSeverity;
  file: string;
  line: number;
  message: string;
  evidence: FindingEvidence;
  headSha: string;
  baseSha: string;
  governingRule: string;
  ticket?: number;
}

export interface ReconciliationResult {
  retained: ReconciledFinding[];
  rejected: {
    duplicate: Finding[];
    stale: Finding[];
    outOfScope: Finding[];
    unverified: Finding[];
    incomplete: Finding[];
  };
}

function validEvidence(evidence: FindingEvidence | undefined): evidence is FindingEvidence {
  if (evidence === undefined) return false;
  if (evidence.kind === "inline") return evidence.quote.trim() !== "";
  return evidence.command.trim() !== "" && evidence.output.trim() !== "";
}

/**
 * Validate findings for one pull-request head and base pair.
 *
 * - Stale: headSha or baseSha does not match the current revision pair, or
 *   the candidate omits its baseSha so exactness cannot be checked.
 * - Out-of-scope: outside the pull-request diff.
 * - Unverified: claims broken behavior without a governing rule, criterion,
 *   observed output with the failing command, or quoted evidence of the
 *   offending span.
 * - Incomplete: missing category or severity; never defaults to blocking.
 * - Duplicate: the same file, line, and message already retained; keep the
 *   clearest evidence and drop restatements across both axes.
 */
export function reconcileFindings(
  candidates: readonly Finding[],
  currentHeadSha: string,
  currentBaseSha: string,
): ReconciliationResult {
  const retained: ReconciledFinding[] = [];
  const rejected: ReconciliationResult["rejected"] = {
    duplicate: [],
    stale: [],
    outOfScope: [],
    unverified: [],
    incomplete: [],
  };
  const seen = new Set<string>();
  let counter = 0;

  for (const candidate of candidates) {
    if (
      candidate.headSha.trim() === "" ||
      currentHeadSha.trim() === "" ||
      candidate.headSha !== currentHeadSha ||
      candidate.baseSha === undefined ||
      candidate.baseSha !== currentBaseSha
    ) {
      rejected.stale.push(candidate);
      continue;
    }
    if (!candidate.inDiff) {
      rejected.outOfScope.push(candidate);
      continue;
    }
    if (candidate.category === undefined || candidate.severity === undefined) {
      rejected.incomplete.push(candidate);
      continue;
    }
    if (
      !candidate.verified ||
      candidate.governingRule === undefined ||
      candidate.governingRule.trim() === "" ||
      !validEvidence(candidate.evidence)
    ) {
      rejected.unverified.push(candidate);
      continue;
    }
    const key = `${candidate.file}:${candidate.line}:${candidate.message.trim()}`;
    if (seen.has(key)) {
      rejected.duplicate.push(candidate);
      continue;
    }
    seen.add(key);
    counter += 1;
    retained.push({
      id: candidate.id ?? `F-${counter}`,
      source: candidate.source,
      category: candidate.category,
      severity: candidate.severity,
      file: candidate.file,
      line: candidate.line,
      message: candidate.message,
      evidence: candidate.evidence,
      headSha: currentHeadSha,
      baseSha: currentBaseSha,
      governingRule: candidate.governingRule,
      ticket: candidate.ticket,
    });
  }
  return { retained, rejected };
}

/** Blocking findings still unresolved. */
export function unresolvedBlocking(findings: readonly ReconciledFinding[]): ReconciledFinding[] {
  return findings.filter((f) => f.severity === "blocking");
}
