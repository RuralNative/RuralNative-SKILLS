// Single pull-request session decisions for /review-this (review-only).
//
// Pure: facts in, decisions out. No network, GitHub, git, filesystem, or
// Agent Manager calls. Covers current-checkout match, clean-checkout
// alignment preparation, delta-versus-full review, one-check CI gating with
// local fallback, and verdict reuse.
// Review-only: publication is terminal; no fix round, commit, push, merge,
// label, promotion, or closure decisions live here.

import {
  reviewIsFresh,
  verdictReusable,
  type TrustedVerdictKey,
} from "./workflow-state.ts";

export { reviewIsFresh, verdictReusable };

export interface CheckoutMatchFact {
  /** The worktree has no uncommitted changes. */
  worktreeClean: boolean;
  /**
   * Current branch name in the invoking checkout.
   * Informational only: branch aliases, `main`, and detached `HEAD`
   * never decide the match. Empty or `HEAD` means detached.
   */
  currentBranch: string;
  /**
   * Expected pull-request head branch name.
   * Informational only: kept for caller compatibility and diagnostics.
   */
  expectedBranch: string;
  /** Local `HEAD` SHA in the invoking checkout. */
  localHeadSha: string;
  /** Pull-request head SHA. */
  pullRequestHeadSha: string;
}

export type CheckoutMatchDecision =
  | { match: true; reason: string }
  | { match: false; reason: string };

/**
 * The current checkout must be clean and at the selected pull-request head
 * commit. Local branch names are informational: the same commit checked out
 * under an alias, `main`, or detached `HEAD` still matches. This is the
 * strict final gate: it runs after checkout preparation, so a failure here
 * means alignment did not complete and review must stop.
 */
export function checkoutMatchDecision(
  fact: CheckoutMatchFact,
): CheckoutMatchDecision {
  if (!fact.worktreeClean) {
    return { match: false, reason: "the current checkout is dirty; commit or stash outside this command" };
  }
  if (fact.localHeadSha.trim() === "" || fact.pullRequestHeadSha.trim() === "") {
    return { match: false, reason: "no trustworthy pull-request head revision to match" };
  }
  if (fact.localHeadSha !== fact.pullRequestHeadSha) {
    return {
      match: false,
      reason: "local HEAD does not match the pull-request head after checkout preparation; stop without review",
    };
  }
  return { match: true, reason: "the clean checkout is at the pull-request head commit" };
}

export interface CheckoutPreparationFact {
  /** The worktree has no uncommitted, staged, or untracked changes. */
  worktreeClean: boolean;
  /** A merge, rebase, cherry-pick, revert, or similar operation is in progress. */
  gitOperationInProgress: boolean;
  /** Local `HEAD` SHA in the invoking checkout. */
  localHeadSha: string;
  /** Pull-request head SHA. */
  pullRequestHeadSha: string;
}

export type CheckoutPreparationAction = "proceed" | "align" | "snapshot-align" | "stop";

export interface CheckoutPreparationDecision {
  action: CheckoutPreparationAction;
  reason: string;
}

/**
 * Decide how to prepare the checkout before review (ADR-0036, narrowed for
 * automatic recovery). A clean checkout already at the pull-request head
 * proceeds untouched, whatever branch name it is on. A clean checkout at a
 * different commit aligns: the caller fetches the verified pull-request head
 * and switches this checkout to that exact commit in detached `HEAD`,
 * without moving local branches or creating a worktree. A dirty checkout
 * first preserves unrelated edits in a verified,
 * recoverable snapshot and then aligns; unknown edits are never discarded,
 * so the caller must snapshot the worktree before the switch and report the
 * snapshot identity instead of dropping it. This also applies at the pinned
 * head because review must not observe uncommitted edits. An unfinished git
 * operation or a missing revision stops with no checkout effect.
 */
export function checkoutPreparationDecision(
  fact: CheckoutPreparationFact,
): CheckoutPreparationDecision {
  if (fact.gitOperationInProgress) {
    return { action: "stop", reason: "a git operation is in progress; finish or abort it outside this command" };
  }
  if (fact.localHeadSha.trim() === "" || fact.pullRequestHeadSha.trim() === "") {
    return { action: "stop", reason: "no trustworthy pull-request head revision to align to" };
  }
  if (!fact.worktreeClean) {
    return { action: "snapshot-align", reason: "the checkout is dirty; preserve unrelated edits in a verified recoverable snapshot before reviewing the pinned head, never discarding unknown edits" };
  }
  if (fact.localHeadSha === fact.pullRequestHeadSha) {
    return { action: "proceed", reason: "the clean checkout is already at the pull-request head commit" };
  }
  return { action: "align", reason: "the clean checkout is at a different commit; align it to the pull-request head in detached HEAD" };
}

// --- Dirty-checkout snapshot reconciliation (automatic recovery) ------------
//
// Preserving a dirty checkout before alignment is effectful and must survive
// interruption. These decisions let the caller reconcile a snapshot record
// and any marked snapshot entry instead of snapshotting twice or guessing.

export interface DirtySnapshotFact {
  recordPresent: boolean;
  /** The recorded snapshot commit still resolves in this repository. */
  snapshotObjectExists: boolean;
  recordedBranchMatches: boolean;
  recordedHeadMatches: boolean;
  /** Clean checkout matches the pinned head bound to the verified record. */
  alignedHeadMatches?: boolean;
  worktreeClean: boolean;
  /** Stash entries carrying this run's snapshot marker. */
  ownSnapshotEntries: number;
}

export type DirtySnapshotAction = "snapshot" | "reconcile-existing" | "adopt-marker-stash" | "stop" | "clean-proceed";

/**
 * Reconcile dirty-checkout preservation before alignment. An existing record
 * is reused only when its snapshot is verified and the clean checkout matches
 * either the original checkout or the record's pinned alignment head. Other
 * revisions stop, leaving the snapshot recoverable. Exactly one interrupted
 * marker stash without a record
 * is adopted (the push completed, the record write did not); several are
 * ambiguous. Fresh dirty work snapshots once; fresh clean work proceeds.
 */
export function dirtySnapshotDecision(fact: DirtySnapshotFact): { action: DirtySnapshotAction; reason: string } {
  if (fact.recordPresent) {
    if (!fact.snapshotObjectExists) {
      return { action: "stop", reason: "a snapshot record exists but the snapshot commit no longer resolves; reconcile it manually before any checkout effect" };
    }
    if (!fact.worktreeClean) {
      return { action: "stop", reason: "a snapshot record exists while the worktree is dirty again; reconcile the recorded snapshot manually" };
    }
    if ((!fact.recordedBranchMatches || !fact.recordedHeadMatches) && !fact.alignedHeadMatches) {
      return { action: "stop", reason: "the checkout moved from the recorded original revision; reconcile the recorded snapshot manually without another checkout effect" };
    }
    return { action: "reconcile-existing", reason: "an interrupted preparation left a verified snapshot record; reuse it instead of snapshotting again" };
  }
  if (fact.ownSnapshotEntries > 1) {
    return { action: "stop", reason: "several marked snapshot entries exist; reconcile them manually instead of guessing" };
  }
  if (fact.ownSnapshotEntries === 1) {
    if (!fact.worktreeClean) {
      return { action: "stop", reason: "an interrupted snapshot entry exists while the worktree is dirty again; reconcile manually" };
    }
    return { action: "adopt-marker-stash", reason: "an interrupted snapshot left exactly one marked snapshot entry; adopt it instead of creating a second snapshot" };
  }
  return fact.worktreeClean
    ? { action: "clean-proceed", reason: "nothing to preserve; no snapshot record or marked entry exists" }
    : { action: "snapshot", reason: "the dirty checkout is preserved once in a verified snapshot before alignment" };
}

export interface SnapshotRestoreFact {
  /** The recorded snapshot commit still resolves in this repository. */
  snapshotObjectExists: boolean;
  branchMatches: boolean;
  headMatches: boolean;
  worktreeClean: boolean;
}

/**
 * Decide whether a recorded snapshot may be restored. Restoration is
 * authorized only on a clean checkout at the exact recorded original branch
 * and head: `stash apply` refuses to overwrite or recreate paths, so any
 * current edit — staged, unstaged, or untracked — stops the restore instead
 * of mixing two states. At a different revision automation stops and the
 * user applies the snapshot manually instead.
 */
export function snapshotRestoreDecision(fact: SnapshotRestoreFact): { action: "apply" | "stop"; reason: string } {
  if (!fact.snapshotObjectExists) {
    return { action: "stop", reason: "the recorded snapshot commit no longer resolves; nothing to restore" };
  }
  if (!fact.branchMatches || !fact.headMatches) {
    return { action: "stop", reason: "the checkout is at a different revision than the recorded original; apply the snapshot manually instead of letting automation re-anchor it to different content" };
  }
  if (!fact.worktreeClean) {
    return { action: "stop", reason: "the worktree is not clean at the recorded revision; resolve or clear the current edits before restoring the snapshot" };
  }
  return { action: "apply", reason: "the checkout matches the recorded original revision; restore the preserved edits" };
}

export interface RevisionChangeFact {
  addsSeam: boolean;
  touchesTrustBoundary: boolean;
  touchesSchema: boolean;
  touchesDependencyState: boolean;
  touchesGeneratedContract: boolean;
  touchesPublicInterface: boolean;
  materiallyWidensDiff: boolean;
}

export type ReviewScope = "delta" | "full";

/** Later revisions receive delta review unless a named risk trigger requires full review again. */
export function deltaReviewScope(fact: RevisionChangeFact): { scope: ReviewScope; reason: string } {
  const triggered =
    fact.addsSeam ||
    fact.touchesTrustBoundary ||
    fact.touchesSchema ||
    fact.touchesDependencyState ||
    fact.touchesGeneratedContract ||
    fact.touchesPublicInterface ||
    fact.materiallyWidensDiff;
  return triggered
    ? { scope: "full", reason: "a risk trigger requires another full review" }
    : { scope: "delta", reason: "changed hunks and impacted callers only" };
}

export interface CiGateFact {
  requiredChecksGreen: boolean;
  requiredChecksPending: boolean;
  /** Repository policy or checked-in workflow maps a required check to the full gate. */
  equivalentCiEstablished: boolean;
  /** Full local gate result when run once as fallback. */
  localFallbackPassed: boolean | null;
}

export type CiGateDecision =
  | { action: "publish"; reason: string }
  | { action: "publish-and-stop"; reason: string }
  | { action: "run-fallback-once"; reason: string };

/**
 * One-check CI gating for review-only publication. Pending CI publishes the
 * pinned review and stops without polling. Failed required checks or a failed
 * local fallback publish that failure as review evidence and stop without
 * delivery. Green equivalent CI publishes. Green checks with no equivalent
 * mapping run the full local gate once as fallback, then publish. No decision
 * here authorizes merge or delivery.
 */
export function ciGateDecision(fact: CiGateFact): CiGateDecision {
  if (fact.requiredChecksPending) {
    return { action: "publish-and-stop", reason: "required CI is pending; publish the pinned review and stop" };
  }
  if (!fact.requiredChecksGreen) {
    return { action: "publish-and-stop", reason: "required CI failed; publish the failure without delivery" };
  }
  if (fact.equivalentCiEstablished) {
    return { action: "publish", reason: "equivalent required CI is green on the reviewed head and base" };
  }
  if (fact.localFallbackPassed === true) {
    return { action: "publish", reason: "required checks are green and the approved local fallback passed once" };
  }
  if (fact.localFallbackPassed === false) {
    return { action: "publish-and-stop", reason: "verification failed; publish the failure without delivery" };
  }
  return { action: "run-fallback-once", reason: "no equivalent CI mapping; run the full local gate once" };
}

export interface VerdictReuseFact {
  pinned: TrustedVerdictKey;
  current: TrustedVerdictKey;
}

/** Reuse a pinned verdict only when head, base, requirements, and policy are unchanged. */
export function shouldReuseVerdict(fact: VerdictReuseFact): { reuse: boolean; reason: string } {
  if (verdictReusable(fact.pinned, fact.current)) {
    return { reuse: true, reason: "head, base, requirements revision, and review policy are unchanged" };
  }
  return { reuse: false, reason: "a verdict key moved; review the current revision" };
}

export type { TrustedVerdictKey };
