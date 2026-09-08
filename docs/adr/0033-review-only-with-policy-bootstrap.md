# 0033 — Review-only review-this with missing-policy bootstrap

Status: accepted
Date: 2026-09-08
Supersedes: 0031 (review-this fix, merge, promotion, and closure paths only)

Decision: `/review-this` publishes findings and stops.

- `/review-this` accepts exactly one pull request, or one issue resolving to
  exactly one open pull request, and requires the current checkout to match
  that pull-request head. The frontier model performs one Standards-plus-Spec
  pass in-session, publishes the review and verified inline findings to the
  pull request, and stops. There is no `/code-review` dependency, no cloud
  review, no fix subagent, no wave, and no persistent worker.
- The reviewer never applies fixes, edits pull-request source, commits,
  pushes, merges, updates the pull-request body, updates labels, promotes
  dependents, or closes tickets. Publication is terminal. Verdict reuse
  against unchanged head, base, requirements revision, and review-policy
  revision republishes status; it never authorizes delivery.
- When the target repository has no root `REVIEW.md`, the reviewer drafts one
  repository-specific policy from observed standards and verified check
  commands, leaves it uncommitted, and stops before review publication.
  Resume only after the owner inspects and commits it. An existing policy is
  used unchanged. Missing evidence, unreadable files, symlinks, conflicting
  sources, and creation failures stop with a diagnostic and create nothing.
- Equivalent required CI on the unchanged reviewed head and base remains the
  broad verification evidence; the full local gate runs once only as
  fallback. Pending CI publishes the pinned review and stops. No post-merge
  verification and no whole-spec review run.

Why: fixing, merging, and tracker bookkeeping inside the review collapsed two
distinct responsibilities into one invocation. Owners needed a report they
could trust without granting the reviewer delivery authority, and
repositories without a written policy needed that policy created before any
review could cite it.

Consequences:

- `review-this` keeps single-target resolution, local finding validation,
  verdict reuse, CI equivalence, and orientation resolution. Fix-agent
  authority, the one-fix budget, merge eligibility, squash-merge, dependent
  promotion, and parent closure are removed from this command.
- The shared workflow-state core stays untouched for planning and
  implementation consumers; `review-this` no longer consumes its fix,
  merge, promotion, or closure helpers.
- `.kilo/agent/review-fixer.md` is removed. Historical ADRs stay verbatim as
  evidence.

Activation: this decision governs new `/review-this` invocations from today.
