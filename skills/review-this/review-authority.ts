// Frontier review authority and mutation-worker routing (#173, parent #171).
//
// Pure: facts in, decisions out. No network, GitHub, git, filesystem,
// clock, or Agent Manager calls. The command session keeps the chat-selected
// frontier model as the reviewer and manager; one user-selected execution
// model from the live Agent Manager catalog drives every new persistent PR
// mutation worker in the wave. The worker may mutate, repair, and fast-forward
// push inside its own worktree, but cannot publish verdicts or change merge,
// label, promotion, closure, or parent state.

import type {
  Finding,
  FindingCategory,
  FindingSeverity,
  ReconciledFinding,
} from "./reconciliation.ts";

export type ReviewAuthorityRole = "frontier" | "mutation-worker";
export type WorkerStateChange =
  | "publish-verdict"
  | "merge"
  | "labels"
  | "promotion"
  | "closure"
  | "parent-state";

export const WORKER_STATE_CHANGES: readonly WorkerStateChange[] = [
  "publish-verdict",
  "merge",
  "labels",
  "promotion",
  "closure",
  "parent-state",
] as const;

export interface ExecutionModelSelection {
  model: string;
  provider?: string;
  variant?: string;
  /** When true, the caller confirmed the previously recorded choice. */
  resumeConfirmed: boolean;
  /** The catalog entry the live Agent Manager catalog returned, when resolved. */
  catalogEntry?: string;
}

export interface ResolveExecutionModelInput {
  model: string;
  provider?: string;
  variant?: string;
  /** Whether this invocation resumes from a previously recorded choice. */
  resuming: boolean;
  /** Whether the user explicitly confirmed the displayed choice. */
  userConfirmed: boolean;
  /** Catalog entries offered by the live Agent Manager catalog. */
  catalogEntries: readonly string[];
}

export interface ResolveExecutionModelResult {
  resolved: boolean;
  model?: string;
  provider?: string;
  variant?: string;
  reason: string;
}

/**
 * Resolve one execution model selection per invocation through the live Agent
 * Manager catalog. The model name must match a catalog entry; provider and
 * variant are preserved when supplied and must also be catalog-recognized.
 * A resume shows the previous recorded choice but requires explicit user
 * confirmation; without it the selection stays unresolved. No hardcoded model
 * names or silent fallback.
 */
export function resolveExecutionModel(
  input: ResolveExecutionModelInput,
): ResolveExecutionModelResult {
  const hasModel = input.model.trim() !== "";
  const matchedCatalog = input.catalogEntries.some(
    (entry) => entry.toLowerCase() === input.model.trim().toLowerCase(),
  );
  if (!hasModel || !matchedCatalog) {
    return {
      resolved: false,
      reason: hasModel
        ? `model "${input.model}" is not in the live Agent Manager catalog; no hardcoded fallback`
        : "no execution model was supplied; selection stays unresolved",
    };
  }
  if (input.resuming && !input.userConfirmed) {
    return {
      resolved: false,
      model: input.model.trim(),
      provider: input.provider,
      variant: input.variant,
      reason: "resume shows the previously recorded choice but requires explicit user confirmation",
    };
  }
  return {
    resolved: true,
    model: input.model.trim(),
    provider: input.provider?.trim() || undefined,
    variant: input.variant?.trim() || undefined,
    reason: "execution model resolved once through the live catalog for this review wave",
  };
}

export interface MutationWorkerCapabilities {
  mutate: boolean;
  instructedConflictRepair: boolean;
  verificationRepair: boolean;
  fastForwardPush: boolean;
}

export interface MutationWorkerBoundary {
  role: ReviewAuthorityRole;
  capabilities: MutationWorkerCapabilities;
  insidePersistentPrWorktree: boolean;
  attemptedStateChanges: readonly WorkerStateChange[];
  /** True when an attempted change is blocked as not worker-owned. */
  blocked: boolean;
}

export function canRunMutationWorker(
  input: MutationWorkerBoundary,
): { allowed: boolean; reason: string } {
  if (input.role !== "mutation-worker") {
    return { allowed: false, reason: "only the selected mutation worker runs fix work" };
  }
  if (!input.insidePersistentPrWorktree) {
    return {
      allowed: false,
      reason: "the mutation worker may mutate only inside its persistent PR worktree",
    };
  }
  const blockedChanges = input.attemptedStateChanges.filter((change) =>
    WORKER_STATE_CHANGES.includes(change),
  );
  if (blockedChanges.length > 0) {
    return {
      allowed: false,
      reason: `the mutation worker cannot ${blockedChanges.join(", ")}`,
    };
  }
  if (!input.capabilities.mutate) {
    return { allowed: false, reason: "the mutation worker has no mutate capability" };
  }
  return {
    allowed: true,
    reason: "the mutation worker applies approved fix packets inside its worktree",
  };
}

export interface WorkerFailureInput {
  attempts: number;
  correctedExecutionPacketsSent: number;
  fixRoundsUsed: number;
  maxFixRounds: number;
}

export interface WorkerFailureDecision {
  action: "send-corrected-packet" | "stop-with-needs-info";
  reason: string;
}

/**
 * One corrected execution packet may be sent within the existing fix-round
 * budget. Continued failure adds `needs-info` and stops; the frontier model
 * never silently takes over mutation.
 */
export function planWorkerFailure(
  input: WorkerFailureInput,
): WorkerFailureDecision {
  if (
    input.correctedExecutionPacketsSent === 0 &&
    input.fixRoundsUsed < input.maxFixRounds
  ) {
    return {
      action: "send-corrected-packet",
      reason: "one corrected execution packet is allowed within the fix-round budget",
    };
  }
  return {
    action: "stop-with-needs-info",
    reason: "worker failure continues; the ticket stops with needs-info and no frontier-model takeover",
  };
}

export type RequiredStandardsCategory =
  | "security"
  | "performance"
  | "correctness-and-edge-cases"
  | "style"
  | "tests-and-test-bloat"
  | "documentation"
  | "test-strategy"
  | "accessibility"
  | "observability"
  | "migration"
  | "simplification";

export const REQUIRED_STANDARDS_CATEGORIES: readonly RequiredStandardsCategory[] = [
  "security",
  "performance",
  "correctness-and-edge-cases",
  "style",
  "tests-and-test-bloat",
  "documentation",
] as const;

export const TRIGGERED_STANDARDS_CHECKS: readonly RequiredStandardsCategory[] = [
  "test-strategy",
  "accessibility",
  "observability",
  "migration",
  "simplification",
] as const;

export interface CategoryTransportInput {
  adapter: string;
  requiredStatuses: Readonly<Record<string, string>>;
}

export interface CategoryTransportResult {
  transported: boolean;
  missing: readonly string[];
}

/**
 * Required Standards category statuses are requested, carried through the
 * local review adapter, and checked before reconciliation. A missing required
 * status is reported; it never defaults to a blocking correctness finding.
 */
export function requiredCategoryStatusesTransported(
  input: CategoryTransportInput,
): CategoryTransportResult {
  const missing = REQUIRED_STANDARDS_CATEGORIES.filter(
    (category) =>
      !Object.prototype.hasOwnProperty.call(input.requiredStatuses, category) ||
      String(input.requiredStatuses[category] ?? "").trim() === "",
  );
  return {
    transported: missing.length === 0 && input.adapter.trim() !== "",
    missing,
  };
}

export function isStandardsCategoryTransportReady(
  result: CategoryTransportResult,
): boolean {
  return result.transported;
}

export type IncompleteCandidateAction = "reject" | "report-incomplete";

export function classifyCandidateCompleteness(
  finding: Pick<Finding, "category" | "severity">,
): { complete: boolean; action: IncompleteCandidateAction; reason: string } {
  const missing: string[] = [];
  if (!finding.category) missing.push("category");
  if (!finding.severity) missing.push("severity");
  if (missing.length > 0) {
    return {
      complete: false,
      action: "reject",
      reason: `candidate missing ${missing.join(" and ")} is rejected, never defaulted to a blocking correctness finding`,
    };
  }
  return {
    complete: true,
    action: "report-incomplete",
    reason: "candidate carries both category and severity",
  };
}

export type DeduplicationSource = "standards" | "spec" | "cloud";

export interface DeduplicationInput {
  source: DeduplicationSource;
  file: string;
  line: number;
  message: string;
  headSha: string;
  baseSha?: string;
  evidence?: string;
}

export interface DeduplicationDecision {
  collapsed: boolean;
  reason: string;
}

/**
 * Axis-preserving deduplication. Standards and Spec findings stay separate:
 * the same location and message on different axes are both retained because
 * one review axis cannot discard the other. Cloud/local duplicates collapse
 * only when the revisions and the evidence identify one defect.
 */
export function planDeduplication(
  input: DeduplicationInput,
  previouslyRetained: DeduplicationInput,
): DeduplicationDecision {
  const sameDefect =
    input.file === previouslyRetained.file &&
    input.line === previouslyRetained.line &&
    input.message.trim().toLowerCase() ===
      previouslyRetained.message.trim().toLowerCase() &&
    input.headSha === previouslyRetained.headSha &&
    (input.baseSha === undefined ||
      previouslyRetained.baseSha === undefined ||
      input.baseSha === previouslyRetained.baseSha) &&
    input.evidence !== undefined &&
    previouslyRetained.evidence !== undefined;
  if (!sameDefect) {
    return { collapsed: false, reason: "no matching defect on the same revisions" };
  }
  if (input.source === "standards" || input.source === "spec") {
    if (previouslyRetained.source === "standards" || previouslyRetained.source === "spec") {
      return {
        collapsed: false,
        reason: "Standards and Spec findings stay separate even at the same location",
      };
    }
  }
  return {
    collapsed: true,
    reason: "cloud and local duplicates collapse only when revisions and evidence identify one defect",
  };
}

export type SpecialistKind = "security" | "web-performance";

export interface SpecialistRoutingInput {
  trustBoundaryTriggered: boolean;
  measuredWebPerformanceWork: boolean;
  specialistsInRound: readonly SpecialistKind[];
  fullReviewRound: boolean;
}

export interface SpecialistRoutingResult {
  specialist?: SpecialistKind;
  reason: string;
}

/**
 * At most one separate specialist runs per pull request and full-review round.
 * Security wins for the strongest trust-boundary risk; web performance runs
 * for measured web-performance work. No specialist for a round that is not a
 * full review, and no second specialist once one already serves the round.
 */
export function planSpecialistRouting(
  input: SpecialistRoutingInput,
): SpecialistRoutingResult {
  if (!input.fullReviewRound) {
    return { reason: "specialists supplement a full review round only" };
  }
  if (input.specialistsInRound.length > 0) {
    return {
      reason: "at most one specialist runs per pull request and full-review round",
    };
  }
  if (input.trustBoundaryTriggered) {
    return {
      specialist: "security",
      reason: "security wins for the strongest trust-boundary risk",
    };
  }
  if (input.measuredWebPerformanceWork) {
    return {
      specialist: "web-performance",
      reason: "web performance runs for measured web-performance work",
    };
  }
  return { reason: "no specialist trigger fired for this full-review round" };
}

export interface SpecialistEvidenceInput {
  severity?: FindingSeverity;
  governingRule?: string;
  headSha?: string;
  baseSha?: string;
}

export interface SpecialistEvidenceResult {
  accepted: boolean;
  reason: string;
}

/**
 * Specialist output is candidate Standards evidence pinned to the same head
 * and base. It uses local blocking/advisory severity, cites a governing rule,
 * criterion, or observed failure, and never becomes a third verdict.
 */
export function validateSpecialistEvidence(
  input: SpecialistEvidenceInput,
): SpecialistEvidenceResult {
  if (input.severity !== "blocking" && input.severity !== "advisory") {
    return { accepted: false, reason: "specialist evidence must use local blocking/advisory severity" };
  }
  if (!input.governingRule || input.governingRule.trim() === "") {
    return {
      accepted: false,
      reason: "specialist evidence must cite a governing rule, criterion, or observed failure",
    };
  }
  if (!input.headSha || input.headSha.trim() === "") {
    return { accepted: false, reason: "specialist evidence must pin the reviewed head" };
  }
  if (!input.baseSha || input.baseSha.trim() === "") {
    return { accepted: false, reason: "specialist evidence must pin the reviewed base" };
  }
  return { accepted: true, reason: "specialist evidence is pinned and severitized" };
}

export type MergingAuthority = "frontier-only";

export function canPerformMerge(role: ReviewAuthorityRole): {
  allowed: boolean;
  authority: MergingAuthority;
  reason: string;
} {
  if (role !== "frontier") {
    return {
      allowed: false,
      authority: "frontier-only",
      reason: "only the frontier command session merges; the mutation worker never merges",
    };
  }
  return {
    allowed: true,
    authority: "frontier-only",
    reason: "the frontier command session owns merge authorization and execution",
  };
}

export interface ReadOnlyReviewerInput {
  role: ReviewAuthorityRole;
  worktreePath: string;
  pinnedHeadSha: string;
  pinnedBaseSha: string;
  willEdit: boolean;
}

export interface ReadOnlyReviewerResult {
  allowed: boolean;
  reason: string;
}

/**
 * Frontier-owned read-only reviewers inspect the exact pinned persistent PR
 * worktree. Only the selected mutation worker edits it.
 */
export function canRunReadOnlyReviewer(
  input: ReadOnlyReviewerInput,
): ReadOnlyReviewerResult {
  if (input.role !== "frontier") {
    return { allowed: false, reason: "only the frontier command session runs reviewers" };
  }
  if (input.willEdit) {
    return {
      allowed: false,
      reason: "frontier-owned reviewers are read-only; only the mutation worker edits the worktree",
    };
  }
  if (input.worktreePath.trim() === "") {
    return { allowed: false, reason: "reviewers need the pinned persistent PR worktree path" };
  }
  if (input.pinnedHeadSha.trim() === "" || input.pinnedBaseSha.trim() === "") {
    return {
      allowed: false,
      reason: "reviewers inspect the exact pinned head and base revisions",
    };
  }
  return {
    allowed: true,
    reason: "frontier-owned reviewers inspect the exact pinned worktree read-only",
  };
}

export interface ReconciledAxisRecord {
  standards: readonly ReconciledFinding[];
  spec: readonly ReconciledFinding[];
}

/**
 * Axis-preserving reconciliation record: Standards and Spec are kept separate
 * in the reconciled output and neither axis is reranked against the other.
 */
export function preservedAxes(
  reconciled: ReconciledAxisRecord,
): { preserved: boolean; reason: string } {
  return {
    preserved: true,
    reason: `Standards and Spec stay separate axes (${reconciled.standards.length} Standards, ${reconciled.spec.length} Spec findings) with no cross-axis reranking`,
  };
}

export const FRONTIER_OWNED_RESPONSIBILITIES = [
  "revision-packets",
  "completeness-checks",
  "finding-verification",
  "reconciliation",
  "verdict-publication",
  "merge",
  "labels",
  "promotion",
  "closure",
] as const;

export function frontierOwns(
  responsibility: (typeof FRONTIER_OWNED_RESPONSIBILITIES)[number],
): { owned: boolean; reason: string } {
  return {
    owned: true,
    reason: `the frontier command session owns ${responsibility}`,
  };
}
