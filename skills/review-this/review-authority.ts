// Review-only authority for the single pull-request review.
//
// Pure: facts in, decisions out. No network, GitHub, git, filesystem, or
// Agent Manager calls. The frontier reviewer publishes findings and stops.
// It never applies fixes, edits PR source, commits, pushes, merges, labels,
// promotes, closes, or rewrites the pull-request body. Aligning a clean
// checkout to the verified pull-request head commit (ADR-0036) is checkout
// preparation, not a source edit: it changes which commit the worktree
// shows, never what the review publishes.

export const REVIEWER_FORBIDDEN_ACTIONS = [
  "apply-fix",
  "edit-source",
  "commit",
  "push",
  "publish-verdict-as-merge-gate",
  "merge",
  "labels",
  "promotion",
  "closure",
  "update-pull-request-body",
] as const;

export type ReviewerForbiddenAction = (typeof REVIEWER_FORBIDDEN_ACTIONS)[number];

export const REVIEWER_ALLOWED_ACTIONS = [
  "publish-review",
  "publish-inline-findings",
  "run-focused-checks",
  "run-local-fallback-once",
  "align-clean-checkout",
] as const;

export type ReviewerAllowedAction = (typeof REVIEWER_ALLOWED_ACTIONS)[number];

export type ReviewerAction = ReviewerForbiddenAction | ReviewerAllowedAction;

/** True when the named action is forbidden in review-only mode. */
export function isForbiddenReviewerAction(action: string): boolean {
  return (REVIEWER_FORBIDDEN_ACTIONS as readonly string[]).includes(action);
}

/** No missing-policy draft is created in review-only mode. Retained for callers; always false. */
export function isMissingPolicyDraftAction(_action: string): boolean {
  return false;
}
