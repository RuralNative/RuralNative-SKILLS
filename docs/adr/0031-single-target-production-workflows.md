# 0031 — Single-target production workflows in the current checkout

Status: accepted
Date: 2026-09-05
Supersedes: 0014, 0019, 0021, 0022, 0023

Decision: `/implement-this` and `/review-this` run one target in the user's
current checkout with no Agent Manager interaction.

- `/implement-this` accepts exactly one open implementation issue and stops
  before mutation on multiple references, parent specifications, or pull
  requests. It requires a clean checkout, creates a feature branch in that
  checkout when invoked from `main`, otherwise reuses the current feature
  branch, runs `/implement` directly, proves active behavioral criteria with
  focused passing tests (bug fixes add a defect-specific RED), and opens or
  updates one pull request. It never runs the full repository gate.
- `/review-this` accepts exactly one pull request, or one issue resolving to
  exactly one open pull request, and requires the current checkout to match
  that pull-request head. The frontier model performs one Standards-plus-Spec
  pass in-session; there is no `/code-review` dependency, no cloud review, no
  review subagent, no wave, and no persistent worker.
- One optional configured Kilo subagent named `review-fixer` may apply
  confirmed fixes in the current checkout for at most one fix round. It edits
  and runs focused tests only; the frontier reviewer inspects the diff, commits
  and pushes, then runs one delta review. Absence of the subagent is a
  publish-and-stop path, never an implicit frontier fix.
- Equivalent required CI on the unchanged reviewed head and base is the broad
  verification gate; the full local gate runs once only as fallback. Pending CI
  publishes the pinned verdict and stops; a later invocation reuses it when
  head, base, requirements revision, and review-policy revision are unchanged.
  No post-merge verification and no whole-spec review run.
- Merge keeps squash merge, exact head/base freshness, requirements-revision
  matching, clean worktree, green required checks or the approved fallback, no
  unresolved blocking findings, mergeability, and no force-push. Post-merge
  bookkeeping promotes only dependents identified by captured native edges
  from the closed ticket and closes the parent only from a complete native
  child enumeration where all children are closed.
- Compact implementation evidence (requirements revision plus per-criterion
  focused command, output, explicit passing status, and bug RED) is upserted into the pull-request body
  alongside `Closes #<ticket>`. Legacy evidence comments stay readable but are
  never written.

Why: Agent Manager setup, polling, recovery, repeated review passes, and
repeated full verification dominated elapsed time. The retired machinery is
deleted, not wrapped: dispatch packets, worker caps, polling, checkpoints,
retry orchestration, recovery states, cleanup states, cloud adapters, finding
deduplication across hosts, execution-model catalogs, mutation-worker routing,
persistent worktrees, waves, and generic conditional evidence profiles are
gone. Bounded orientation caps, stable criterion IDs, requirements-revision
trust, focused doc-cache loading, bug reproduction, and safe merge gates stay.

Consequences:

- The generated workflow-state core drops worker caps, dispatch validation
  with workers, retry orchestration, cloud-aware merge, whole-spec closure,
  and multi-round budgets; `MAX_FIX_ROUNDS` is 1.
- `implement-this` keeps single-reference parsing, current-checkout branch
  decisions, compact evidence, focused verification, and idempotent PR
  delivery. `dispatch-packet.ts`, `setup.ts`, and `timing.ts` are removed.
- `review-this` keeps single-target resolution, local finding validation,
  fix-agent authority limits, one fix round, verdict reuse, CI equivalence,
  and direct promotion plus parent closure. Cloud, wave, worktree, and
  execution-model modules are removed or narrowed.
- `.kilo/kilo.jsonc` drops the `agent_manager` permission; `task: ask` stays
  for the optional fix round. Historical ADRs stay verbatim as evidence.

Activation: this decision governs new `implement-this` and `review-this`
invocations from today. Existing Agent Manager worktrees are user-managed
outside these commands.
