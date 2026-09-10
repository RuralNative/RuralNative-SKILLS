// Current-checkout and finalization decisions for /fix-this (ADR-0035).
//
// Pure: facts in, decisions out. No network, GitHub, git, filesystem, or
// Agent Manager calls. Fix-this owns post-review fixes, conflict resolution,
// merge, and bookkeeping. It never generates another review verdict and never
// conditions its own merge eligibility on CI status.

export interface FixCheckoutFact {
  /** The worktree has no uncommitted changes. */
  worktreeClean: boolean;
  /** Local HEAD SHA in the invoking checkout. */
  localHeadSha: string;
  /** Current PR head SHA. */
  pullRequestHeadSha: string;
  /** Reviewed head SHA carried by the validated handoff. */
  reviewedHeadSha: string;
  /**
   * Whether the checkout is on local `main` or detached `HEAD`.
   * Those states need a feature branch before fixes, not a stop.
   */
  needsFeatureBranch: boolean;
  /**
   * Entry action from `decideFixEntry` (ADR-0038). Fresh runs and resumed
   * fixes require head equality against the reviewed head or the
   * checkpoint's resulting head; bookkeeping after a confirmed merge needs
   * only a clean worktree because the merge already happened on GitHub.
   */
  entryAction?: "fresh" | "resume-fixes" | "resume-bookkeeping" | "stop";
  /** Checkpoint resulting head SHA for a resume-fixes entry. */
  expectedHeadSha?: string;
  /**
   * Reconciled checkpoint facts for a resume-fixes entry (ADR-0038): the
   * started and resulting revisions plus the completed steps recorded by the
   * checkpoint. The checkout gate uses them to derive the remote head the
   * pull request should still carry: the started head while the result is
   * prepared but unpushed, the resulting head once the push step completed.
   * Unexplained movement of the observed remote head stops the resume.
   */
  resumeCheckpoint?: {
    startedHeadSha: string;
    resultingHeadSha: string;
    completedSteps: readonly string[];
  };
}

export type FixCheckoutDecision =
  | { action: "proceed"; reason: string }
  | { action: "create-feature-branch"; reason: string }
  | { action: "stop"; reason: string };

/**
 * Checkout gate. A branch alias never blocks: clean HEAD equality is what
 * matters. Fresh runs keep clean HEAD = PR head = reviewed head. A resume
 * fixes path requires the checkpoint's resulting head locally and the remote
 * PR head at the state the checkpoint recorded (started head while
 * prepared-but-unpushed, resulting head after a completed push); external
 * remote movement stops. A confirmed merged PR resumes bookkeeping on any
 * clean checkout. `main` and detached HEAD need an explicit feature-branch
 * step before edits.
 */
export function fixCheckoutDecision(fact: FixCheckoutFact): FixCheckoutDecision {
  if (!fact.worktreeClean) {
    return { action: "stop", reason: "the current checkout is dirty; commit or stash outside this command" };
  }
  if (fact.localHeadSha.trim() === "") {
    return { action: "stop", reason: "no trustworthy local head revision" };
  }
  if (fact.entryAction === "resume-bookkeeping") {
    return { action: "proceed", reason: "confirmed merged PR; bookkeeping resumes on the clean checkout" };
  }
  if (fact.entryAction === "resume-fixes") {
    if ((fact.expectedHeadSha ?? "").trim() === "") {
      return { action: "stop", reason: "no trustworthy checkpoint resulting head to resume against" };
    }
    if (fact.localHeadSha !== fact.expectedHeadSha) {
      return { action: "stop", reason: "local HEAD does not match the checkpoint's resulting head; reconcile before resuming" };
    }
    if (fact.resumeCheckpoint === undefined) {
      return { action: "stop", reason: "no reconciled checkpoint facts; run fix-progress reconciliation before deciding the checkout" };
    }
    const pushed = fact.resumeCheckpoint.completedSteps.includes("push");
    const expectedRemoteHead = pushed
      ? fact.resumeCheckpoint.resultingHeadSha
      : fact.resumeCheckpoint.startedHeadSha;
    if (fact.pullRequestHeadSha.trim() === "") {
      return { action: "stop", reason: "no trustworthy observed pull-request head to reconcile the checkpoint against" };
    }
    if (fact.pullRequestHeadSha !== expectedRemoteHead) {
      // A successful remote push with an unsaved progress flag still shows
      // the verified result on GitHub: recognize it instead of rejecting the
      // proven remote state (ADR-0040). Unexplained movement still stops.
      if (!pushed && fact.pullRequestHeadSha === fact.resumeCheckpoint.resultingHeadSha) {
        if (fact.needsFeatureBranch) {
          return { action: "create-feature-branch", reason: "remote already carries the verified result despite the stale push flag; create the feature branch before further edits" };
        }
        return { action: "proceed", reason: "remote already carries the verified result despite the stale push flag" };
      }
      return {
        action: "stop",
        reason: `the pull-request head moved beyond the checkpoint's recorded state (expected ${expectedRemoteHead}, observed ${fact.pullRequestHeadSha}); reconcile the remote before resuming`,
      };
    }
    if (fact.needsFeatureBranch) {
      return { action: "create-feature-branch", reason: "create the feature branch in this checkout before further edits" };
    }
    return { action: "proceed", reason: "clean checkout at the checkpoint's resulting head with the recorded remote state" };
  }
  if (fact.entryAction === "stop") {
    return { action: "stop", reason: "the entry decision stopped; no finalization work proceeds" };
  }
  if (fact.pullRequestHeadSha.trim() === "" || fact.reviewedHeadSha.trim() === "") {
    return { action: "stop", reason: "no trustworthy head revision for the pull request or review" };
  }
  if (fact.localHeadSha !== fact.pullRequestHeadSha) {
    return { action: "stop", reason: "local HEAD does not match the pull-request head; fetch and align outside this command" };
  }
  if (fact.localHeadSha !== fact.reviewedHeadSha) {
    return { action: "stop", reason: "the checkout does not match the reviewed head; republish the review or align outside this command" };
  }
  if (fact.needsFeatureBranch) {
    return { action: "create-feature-branch", reason: "create the feature branch in this checkout before editing from main or detached HEAD" };
  }
  return { action: "proceed", reason: "clean checkout at the reviewed pull-request head" };
}

export interface FixPushFact {
  /** Repository of the invocation in `owner/name` form. */
  repository: string;
  /** Repository of the observed PR in `owner/name` form. */
  pullRequestRepository: string;
  /** Explicit remote ref the run intends to update. */
  pushRef: string;
  /** Verified PR head ref. */
  expectedHeadRef: string;
  /** Remote head SHA the run recorded when the push was planned. */
  recordedRemoteHeadSha: string;
  /** Remote head SHA observed immediately before the push. */
  observedRemoteHeadSha: string;
  /** Verified local result head the run intends to push. */
  localHeadSha: string;
}

export type FixPushDecision =
  | { action: "push"; reason: string }
  | { action: "stop"; reason: string };

/**
 * Push only to the verified PR head ref (ADR-0038). A meaningful push moves
 * the recorded pre-push remote head to a verified local result, so the gate
 * compares the current observation with the recorded pre-push head: any
 * external movement since the run recorded it stops. A no-op push (local
 * already equals the observed remote head) stops too because there is
 * nothing to push.
 */
export function fixPushDecision(fact: FixPushFact): FixPushDecision {
  if (fact.repository.toLowerCase() !== fact.pullRequestRepository.toLowerCase()) {
    return { action: "stop", reason: "the pull request lives in another repository" };
  }
  if (fact.pushRef.trim() === "" || fact.expectedHeadRef.trim() === "" || fact.pushRef !== fact.expectedHeadRef) {
    return { action: "stop", reason: "push ref does not match the verified pull-request head ref" };
  }
  if (fact.observedRemoteHeadSha.trim() === "" || fact.recordedRemoteHeadSha.trim() === "") {
    return { action: "stop", reason: "no trustworthy remote head pair to push against" };
  }
  if (fact.observedRemoteHeadSha !== fact.recordedRemoteHeadSha) {
    return {
      action: "stop",
      reason: `the remote head moved since the run recorded it (recorded ${fact.recordedRemoteHeadSha}, observed ${fact.observedRemoteHeadSha}); reread before pushing`,
    };
  }
  if (fact.localHeadSha.trim() === "") {
    return { action: "stop", reason: "no verified local result head to push" };
  }
  if (fact.localHeadSha === fact.observedRemoteHeadSha) {
    return { action: "stop", reason: "local HEAD already equals the remote head; nothing to push" };
  }
  return { action: "push", reason: "push the verified result to the recorded pull-request head ref" };
}

export type FixEntryAction = "fresh" | "resume-fixes" | "resume-bookkeeping" | "stop";

export interface FixEntryFact {
  /** Observed PR state. */
  pullRequestState: "open" | "merged" | "closed";
  /** A fix-progress checkpoint comment exists in the PR thread. */
  hasCheckpoint: boolean;
  /**
   * Independently observed parts of the checkpoint reconciliation
   * (ADR-0038, narrowed by ADR-0040). Trust is derived here from the parts,
   * never accepted as one caller-supplied flag: the checkpoint must parse
   * well-formed as fix-progress-v2, its digest must match the digest
   * recomputed from the validated source review, it must name this exact
   * target, and its dispositions must cover the source findings exactly.
   * The checkpoint author equals the validated source review author or is
   * independently authorized as a collaborator fixing another person's
   * review; missing parts are as untrustworthy as failing ones. Legacy v1
   * checkpoints are diagnostic input and never trusted.
   */
  checkpoint?: {
    /** Checkpoint parsed well-formed as fix-progress-v2 (not legacy). */
    wellFormed: boolean;
    /** Recomputed source-handoff digest equals the checkpoint digest. */
    digestMatches: boolean;
    /** Checkpoint comment author equals the validated source review author. */
    authorMatches: boolean;
    /** Checkpoint author carries independent fix authorization when different. */
    authorIndependentlyAuthorized?: boolean;
    /** Checkpoint names this repository and pull request. */
    targetMatches: boolean;
    /** Dispositions cover the source findings exactly. */
    dispositionsCoverSource: boolean;
  };
  /**
   * Confirmed native merge with exact PR and issue associations verified
   * from GitHub (ADR-0040). Allows bookkeeping-only recovery without a
   * current checkpoint; never invents receipts, repeats a merge, or claims
   * an externally merged PR passed this workflow.
   */
  mergeVerifiedWithoutCheckpoint?: boolean;
}

function checkpointTrustReason(fact: FixEntryFact): string {
  const checkpoint = fact.checkpoint ?? null;
  if (checkpoint === null) {
    return "the checkpoint comment was not reconciled against the validated source review; run the fix-progress reconciliation before deciding the entry";
  }
  const failures: string[] = [];
  if (!checkpoint.wellFormed) failures.push("the checkpoint is malformed or a legacy v1 diagnostic record");
  if (!checkpoint.digestMatches) failures.push("the checkpoint digest does not match the validated source review");
  if (!checkpoint.authorMatches && checkpoint.authorIndependentlyAuthorized !== true) {
    failures.push("the checkpoint author matches neither the validated source review author nor an independently authorized fixer");
  }
  if (!checkpoint.targetMatches) failures.push("the checkpoint names another repository or pull request");
  if (!checkpoint.dispositionsCoverSource) failures.push("the checkpoint dispositions do not cover the source findings exactly");
  return failures.length > 0 ? failures.join("; ") : "the checkpoint does not reconcile against observed facts";
}

/**
 * Decide fresh versus resumable entry (ADR-0038, narrowed by ADR-0040).
 * Fresh runs require an open PR and keep clean HEAD = PR head = reviewed
 * head. A checkpoint resumes only missing steps after every reconciliation
 * part derived from observed facts passes: on an open PR it resumes fixes;
 * on a merged PR it resumes bookkeeping only. A confirmed native merge with
 * verified associations resumes bookkeeping only even without a current
 * checkpoint. A closed-unmerged PR, or a checkpoint that fails any part,
 * stops.
 */
export function decideFixEntry(fact: FixEntryFact): { action: FixEntryAction; reason: string } {
  const authorOk =
    fact.checkpoint !== undefined &&
    (fact.checkpoint.authorMatches || fact.checkpoint.authorIndependentlyAuthorized === true);
  const trusted =
    fact.hasCheckpoint &&
    fact.checkpoint !== undefined &&
    fact.checkpoint.wellFormed &&
    fact.checkpoint.digestMatches &&
    authorOk &&
    fact.checkpoint.targetMatches &&
    fact.checkpoint.dispositionsCoverSource;
  if (fact.pullRequestState === "closed") {
    return { action: "stop", reason: "the pull request is closed without a merge; it never counts as delivered" };
  }
  if (fact.pullRequestState === "merged") {
    if (fact.hasCheckpoint && trusted) {
      return { action: "resume-bookkeeping", reason: "confirmed merged PR with a reconciled checkpoint resumes bookkeeping only" };
    }
    if (!fact.hasCheckpoint && fact.mergeVerifiedWithoutCheckpoint === true) {
      return { action: "resume-bookkeeping", reason: "confirmed native merge with verified associations resumes bookkeeping only without a checkpoint" };
    }
    return {
      action: "stop",
      reason: fact.hasCheckpoint
        ? `the merged PR checkpoint is not reconciled (${checkpointTrustReason(fact)}); reconcile it before any bookkeeping`
        : "the merged PR has no reconciled checkpoint; bookkeeping cannot resume without verified merge associations",
    };
  }
  if (fact.hasCheckpoint && !trusted) {
    return { action: "stop", reason: `a checkpoint exists but is not reconciled (${checkpointTrustReason(fact)}); reconcile it before resuming` };
  }
  if (fact.hasCheckpoint) {
    return { action: "resume-fixes", reason: "reconciled checkpoint resumes only the missing finalization steps" };
  }
  return { action: "fresh", reason: "no checkpoint; fresh finalization keeps clean HEAD = PR head = reviewed head" };
}

export interface FixBookkeepingFact {
  /** PR state observed after the merge attempt. */
  pullRequestState: "open" | "closed" | "merged";
  /** Merge commit SHA when merged, otherwise empty. */
  mergeCommitSha: string;
  /** Implementation ticket state observed after merge. */
  ticketState: "open" | "closed";
  /** True when every dependency/child enumeration page was read. */
  enumerationComplete: boolean;
}

export type FixBookkeepingDecision =
  | { action: "close-ticket"; reason: string }
  | { action: "promote-and-close-parent"; reason: string }
  | { action: "record-partial"; reason: string }
  | { action: "stop"; reason: string };

/** Bookkeeping only after a confirmed merge; closed-unmerged never counts. */
export function fixBookkeepingDecision(fact: FixBookkeepingFact): FixBookkeepingDecision {
  if (fact.pullRequestState !== "merged") {
    return { action: "stop", reason: "bookkeeping starts only after a confirmed merge" };
  }
  if (fact.mergeCommitSha.trim() === "") {
    return { action: "record-partial", reason: "merge reported without a merge commit; record partial progress" };
  }
  if (fact.ticketState === "open") {
    return { action: "close-ticket", reason: "close the implementation ticket through the confirmed merge" };
  }
  if (!fact.enumerationComplete) {
    return { action: "record-partial", reason: "dependency enumeration is incomplete; resume after a complete read" };
  }
  return { action: "promote-and-close-parent", reason: "ticket closed; promote dependents and close the parent when complete" };
}

export const FIX_THIS_FORBIDDEN_ACTIONS = [
  "run-review",
  "invoke-review-this",
  "self-review-verdict",
  "wait-for-ci",
  "use-ci-as-merge-gate",
  "bypass-branch-protection",
  "admin-override-merge",
  "force-push",
  "push-to-main",
  "reset-user-work",
  "rebase-published-history",
  "delete-branch",
  "close-unmerged-pull-request",
  "clear-needs-info",
  "download-skill",
  "create-worktree",
  "manage-agent-manager",
] as const;

export type FixThisForbiddenAction = (typeof FIX_THIS_FORBIDDEN_ACTIONS)[number];

/** True when the named action is forbidden in the final stage. */
export function isForbiddenFixAction(action: string): boolean {
  return (FIX_THIS_FORBIDDEN_ACTIONS as readonly string[]).includes(action);
}
