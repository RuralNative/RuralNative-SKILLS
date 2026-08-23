// Finding reconciliation for the review wave (#135, parent #130).
//
// Pure: facts in, decisions out. No network, GitHub, git, or worker calls.
// Reconciles Kilo cloud findings with the local Standards and Spec findings
// against one current head per pull request, keeping the two local axes
// separate as required by verification.

export type FindingSource = "cloud" | "standards" | "spec";
export type FindingCategory =
  | "security"
  | "performance"
  | "correctness-and-edge-cases"
  | "style"
  | "tests-and-test-bloat"
  | "documentation";
export type FindingSeverity = "advisory" | "blocking";

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
  };
}

/**
 * Reconcile findings for one pull-request head.
 *
 * - Stale: headSha or baseSha does not match the current revision pair
 *   -> rejected with evidence
 * - Out-of-scope: !inDiff -> rejected
 * - Unverified: !verified or no evidence/ invariant citation -> rejected
 * - Duplicate: same file+line+normalized message already retained -> rejected, first wins
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
  };
  const seen = new Set<string>();

  for (const f of findings) {
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
    const id = f.id ?? stableFindingId(f);
    const key = `${f.file}:${f.line}:${normalizeMessage(f.message)}`;
    if (seen.has(key)) {
      rejected.duplicate.push(f);
      continue;
    }
    seen.add(key);
    const r: ReconciledFinding = {
      id,
      source: f.source,
      category: f.category ?? "correctness-and-edge-cases",
      severity: f.severity ?? "blocking",
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
