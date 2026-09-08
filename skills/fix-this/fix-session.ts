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
}

export type FixCheckoutDecision =
  | { action: "proceed"; reason: string }
  | { action: "create-feature-branch"; reason: string }
  | { action: "stop"; reason: string };

/**
 * Fresh-run checkout gate. A branch alias never blocks: clean HEAD equality
 * to both the PR head and the reviewed head is sufficient. `main` and
 * detached HEAD need an explicit feature-branch step before edits.
 */
export function fixCheckoutDecision(fact: FixCheckoutFact): FixCheckoutDecision {
  if (!fact.worktreeClean) {
    return { action: "stop", reason: "the current checkout is dirty; commit or stash outside this command" };
  }
  if (fact.localHeadSha.trim() === "" || fact.pullRequestHeadSha.trim() === "" || fact.reviewedHeadSha.trim() === "") {
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
  /** Remote head SHA observed immediately before push. */
  remoteHeadSha: string;
  /** Local head SHA the run verified. */
  localHeadSha: string;
  /** True when the remote moved since the run started. */
  remoteMoved: boolean;
}

export type FixPushDecision =
  | { action: "push"; reason: string }
  | { action: "stop"; reason: string };

/** Push only to the verified PR head ref; concurrent movement stops. */
export function fixPushDecision(fact: FixPushFact): FixPushDecision {
  if (fact.repository.toLowerCase() !== fact.pullRequestRepository.toLowerCase()) {
    return { action: "stop", reason: "the pull request lives in another repository" };
  }
  if (fact.pushRef.trim() === "" || fact.expectedHeadRef.trim() === "" || fact.pushRef !== fact.expectedHeadRef) {
    return { action: "stop", reason: "push ref does not match the verified pull-request head ref" };
  }
  if (fact.remoteMoved || fact.remoteHeadSha !== fact.localHeadSha) {
    return { action: "stop", reason: "the remote head moved; reread it before pushing" };
  }
  return { action: "push", reason: "push explicitly to the verified pull-request head ref" };
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
