// Finding reconciliation for the review wave (#135, parent #130; stable
// criterion identity #188).
//
// Pure: facts in, decisions out. No network, GitHub, git, or worker calls.
// Reconciles Kilo cloud findings with the local Standards and Spec findings
// against one current head per pull request, keeping the two local axes
// separate as required by verification. Spec findings and whole-spec
// verification name the same stable criterion key `(authority issue number,
// local ID)` that planning, dispatch, and implementation evidence uses.

import { criterionKey } from "./workflow-state.ts";

export type FindingSource = "cloud" | "standards" | "spec";
export type FindingCategory =
  | "security"
  | "performance"
  | "correctness-and-edge-cases"
  | "style"
  | "tests-and-test-bloat"
  | "documentation";
export type FindingSeverity = "advisory" | "blocking";

/**
 * The stable key one review finding or whole-spec verification uses to name an
 * acceptance criterion: the authority issue number plus the local criterion
 * ID. Review references `#188:AC-1` exactly where dispatch and evidence did.
 */
export function criterionReference(issue: number, id: string): string {
  return criterionKey(issue, id);
}

export interface Finding {
  /** Stable across cloud and local reports when supplied by the reviewer. */
  id?: string;
  source: FindingSource;
  category?: FindingCategory;
  severity?: FindingSeverity;
  file: string;
  line: number;
  message: string;
  evidence?: string;
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
  evidence?: string;
  headSha: string;
  baseSha: string;
  governingRule: string;
  ticket?: number;
}

export interface ReconciliationResult {
  retained: ReconciledFinding[];
  retainedByAxis: Record<FindingSource, ReconciledFinding[]>;
  rejected: {
    duplicate: Finding[];
    stale: Finding[];
    outOfScope: Finding[];
    unverified: Finding[];
    incomplete: Finding[];
  };
}

/**
 * Reconcile findings for one pull-request head.
 *
 * - Stale: headSha or baseSha does not match the current revision pair
 *   -> rejected with evidence
 * - Out-of-scope: !inDiff -> rejected
 * - Unverified: !verified or no evidence/ invariant citation -> rejected
 * - Incomplete: missing category or severity -> rejected, never defaulted to
 *   a blocking correctness finding
 * - Duplicate: same source+file+line+normalized message already retained -> rejected,
 *   first wins. Standards and Spec keep axis identity during deduplication; a
 *   cloud/local duplicate collapses only when revisions and evidence identify
 *   one defect.
 *
 * The first retained finding keeps the clearest evidence; restatements are
 * counted once. Standards and Spec are kept separate in the retainedByAxis
 * map, and the retained list becomes the single fix batch for this PR.
 */
export function reconcileFindings(
  findings: readonly Finding[],
  currentHeadSha: string,
  currentBaseSha?: string,
): ReconciliationResult {
  const retained: ReconciledFinding[] = [];
  const retainedByAxis: Record<FindingSource, ReconciledFinding[]> = {
    cloud: [],
    standards: [],
    spec: [],
  };
  const rejected = {
    duplicate: [] as Finding[],
    stale: [] as Finding[],
    outOfScope: [] as Finding[],
    unverified: [] as Finding[],
    incomplete: [] as Finding[],
  };
  const seen = new Set<string>();

  // Process local axes before cloud so a cloud finding can collapse against an
  // already-retained Standards or Spec candidate when evidence identifies one
  // defect, independent of the caller's input order.
  const ordered = [...findings].sort((a, b) => {
    const rank = (source: FindingSource) => (source === "cloud" ? 1 : 0);
    return rank(a.source) - rank(b.source);
  });

  for (const f of ordered) {
    if (
      f.headSha !== currentHeadSha ||
      (currentBaseSha !== undefined && f.baseSha !== currentBaseSha)
    ) {
      rejected.stale.push(f);
      continue;
    }
    if (!f.inDiff) {
      rejected.outOfScope.push(f);
      continue;
    }
    if (!f.verified || !f.evidence) {
      rejected.unverified.push(f);
      continue;
    }
    // A candidate with missing category or severity is rejected or reported as
    // incomplete; it never defaults to a blocking correctness finding (#173).
    if (!f.category || !f.severity) {
      rejected.incomplete.push(f);
      continue;
    }
    const id = f.id ?? stableFindingId(f);
    // Deduplication preserves axis identity. Standards and Spec findings stay
    // separate: the same location and message on different axes are both
    // retained because one review axis cannot discard the other. A cloud
    // finding collapses against a local axis only when the locator, the
    // revisions, and the evidence identify one defect; otherwise it is
    // retained as its own candidate.
    const locator = `${f.file}:${f.line}:${normalizeMessage(f.message)}`;
    const axisKey = `${f.source}:${locator}`;
    let duplicate = false;
    if (f.source === "cloud") {
      duplicate = retained.some(
        (r) =>
          r.source !== "cloud" &&
          `${r.file}:${r.line}:${normalizeMessage(r.message)}` === locator &&
          r.baseSha === (f.baseSha ?? currentBaseSha ?? "") &&
          r.evidence === f.evidence,
      );
    } else {
      duplicate = seen.has(axisKey);
    }
    if (duplicate) {
      rejected.duplicate.push(f);
      continue;
    }
    seen.add(axisKey);
    const r: ReconciledFinding = {
      id,
      source: f.source,
      category: f.category,
      severity: f.severity,
      file: f.file,
      line: f.line,
      message: f.message,
      evidence: f.evidence,
      headSha: f.headSha,
      baseSha: f.baseSha ?? currentBaseSha ?? "",
      governingRule: f.governingRule ?? "evidence-backed review rule",
      ticket: f.ticket,
    };
    retained.push(r);
    retainedByAxis[f.source].push(r);
  }

  return { retained, retainedByAxis, rejected };
}

function normalizeMessage(message: string): string {
  return message.trim().toLowerCase().replace(/\s+/g, " ");
}

function stableFindingId(finding: Finding): string {
  return `finding-${finding.source}-${finding.file}-${finding.line}-${normalizeMessage(finding.message).replace(/[^a-z0-9]+/g, "-")}`;
}

export function hasUnresolvedConfirmedFindings(result: ReconciliationResult): boolean {
  return result.retained.length > 0;
}
