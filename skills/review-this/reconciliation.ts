// Finding reconciliation for the review wave (#135, parent #130).
//
// Pure: facts in, decisions out. No network, GitHub, git, or worker calls.
// Reconciles Kilo cloud findings with the local Standards and Spec findings
// against one current head per pull request, keeping the two local axes
// separate as required by verification.

export type FindingSource = "cloud" | "standards" | "spec";

export interface Finding {
  source: FindingSource;
  file: string;
  line: number;
  message: string;
  evidence?: string;
  headSha: string;
  inDiff: boolean;
  verified: boolean;
}

export interface ReconciledFinding {
  source: FindingSource;
  file: string;
  line: number;
  message: string;
  evidence?: string;
  headSha: string;
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
 * - Stale: headSha does not match currentHeadSha -> rejected with evidence
 * - Out-of-scope: !inDiff -> rejected
 * - Unverified: !verified or no evidence/ invariant citation -> rejected
 * - Duplicate: same file+line+normalized message already retained -> rejected, first wins
 *
 * The first retained finding keeps the clearest evidence; restatements are
 * counted once and routed as one fix to the owning worker. Standards and Spec
 * are kept separate in the retainedByAxis map.
 */
export function reconcileFindings(
  findings: readonly Finding[],
  currentHeadSha: string,
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
    if (f.headSha !== currentHeadSha) {
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
    const key = `${f.file}:${f.line}:${normalizeMessage(f.message)}`;
    if (seen.has(key)) {
      rejected.duplicate.push(f);
      continue;
    }
    seen.add(key);
    const r: ReconciledFinding = {
      source: f.source,
      file: f.file,
      line: f.line,
      message: f.message,
      evidence: f.evidence,
      headSha: f.headSha,
    };
    retained.push(r);
    retainedByAxis[f.source].push(r);
  }

  return { retained, retainedByAxis, rejected };
}

function normalizeMessage(message: string): string {
  return message.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Route confirmed findings back to the owning worker.
 * The review workspace never fixes a finding itself; it posts the retained
 * finding to the ticket so the worker that owns that ticket addresses it.
 */
export function routeFixesToWorker(
  reconciled: ReconciliationResult,
  ticket: number,
): { ticket: number; findings: ReconciledFinding[] } | null {
  if (reconciled.retained.length === 0) return null;
  return { ticket, findings: reconciled.retained };
}

export function hasUnresolvedConfirmedFindings(result: ReconciliationResult): boolean {
  return result.retained.length > 0;
}
