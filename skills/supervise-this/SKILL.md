---
name: supervise-this
description: Run a durable supervised planning and implementation workflow inside an Agent Orchestrator project orchestrator. Use /supervise-this <task> for a new run or /supervise-this #<spec> to resume. Delegates planning to plan-this, uses project-configured AO workers, follows GitHub native blockers, and continues through evidence-based pull-request delivery, review, recovery, and closure.
---

Run this workflow inside the Agent Orchestrator project orchestrator. AO is the
persistent owner of the run. A planning result or a worker spawn is an
intermediate checkpoint, not a reason to return a final summary.

## Start

- Load `/unslop` before the first progress update and keep it active for every
  question, issue comment, ticket body, decision, and summary.
- Accept `/supervise-this <task>` for a new run or `/supervise-this #<spec>` to
  resume. Reject invocation outside an AO project orchestrator session.
- Read `AGENTS.md`, `ARCHITECTURE.md`, the supervise-this leaf, `CONTEXT.md`,
  the parent issue when resuming, and the AO project configuration.
- Set `REPO` from the AO project's configured repository. Pass
  `--repo "$REPO"` to every `gh` command so reconciliation survives a broken
  worktree gitdir.
- Verify `ao status --json`, the current `AO_PROJECT_ID`, the orchestrator
  session, project role profiles, `ao agent ls --refresh --json`, GitHub access,
  and an explicit reviewer policy.
- Require an orchestrator profile for planning and final review and a worker
  profile for implementation. Resolve each profile's agent, model, and supported
  session modes from AO. Choose `chat` or `tui` from the worker's capabilities.
- Fetch `origin/<default-branch>`. Synchronize the project base or prove it is
  an ancestor before planning or spawning. A worker repeats that proof before
  its first edit and reports `BASE_CURRENT`.
- Feed these observed facts to `scripts/workflow.ts preflight --input <path>`.
  Stop before a spawn on any returned error. Read the exported input types when
  preparing JSON. Every helper command requires `--input` or `--json`, so a
  missing input fails instead of waiting on stdin.
- Ask one ELI18 decision with a recommendation when preflight cannot pass.

## Plan

- For a new task, delegate the complete planning workflow to `/plan-this`.
  Planning runs in this same persistent orchestrator session, not a child Agent
  Manager session. Honor every planning approval gate.
- After `/plan-this` publishes the parent specification and tickets, record one
  structured parent comment containing the AO project, orchestrator and worker
  role models, review round, and fixed review base.
- Treat planning as complete only when the parent issue and every planned child
  ticket are published and their native dependency edges are readable.
- Continue the same orchestrator run after recording that checkpoint. Do not
  give the user a conclusive summary yet.

## Schedule

- Reconstruct the durable state from GitHub before reading live AO sessions:
  parent issue, child and follow-up issues, native blockers, labels, assignees,
  comments, pull requests, checks, and merged commits.
- Add AO sessions and local or remote branches to that snapshot. Feed open PRs,
  sessions, branches, assignees, and issue links to `scripts/workflow.ts
  reconcile`. Its `review`, `resume`, or `spawn` result is the scheduling gate.
- Before each spawn, rerun preflight with `ownershipClear` true only for the
  helper's `spawn` result. `DUPLICATE_OWNERSHIP` is a stop signal.
- Preserve parent order and keep at most three implementation workers active.
  A merged blocker makes its descendants eligible for the next wave. Start each
  worker with the mode returned by preflight:

  ```bash
  ao spawn --project "$AO_PROJECT_ID" --kind worker --name "issue-<n>" --issue <n> --mode "$WORKER_MODE" --prompt "Run /implement-this #<n> in AO pull-request delivery mode. Prove origin/<default-branch> is an ancestor before editing."
  ```

- Use names of twenty characters or fewer. The project worker profile chooses
  the model. Do not pass an unverified `--model` flag.
- A worker spawn is an intermediate checkpoint. Keep the orchestrator active,
  consume AO completion or handoff events, and reconcile GitHub before the
  next spawn. If AO presents a worker completion message, process it instead
  of summarizing the whole run.

## Worker contract

- Each worker receives exactly one issue and runs `/implement-this #<n>`.
- AO workers use pull-request delivery. The worker commits and opens or updates
  its PR, but does not push directly to `main` or close the issue before merge.
- AO owns the worker session, worktree, CI feedback, review feedback, merge
  conflict routing, and session recovery. The supervisor owns the dependency
  graph, acceptance evidence, issue labels, and parent state.
- Track only these delivery states: `READY`, `CLAIMED`, `BASE_CURRENT`,
  `EDITING`, `PR_OPEN`, `REVIEWED`, `MERGED`, `EVIDENCED`, and `CLOSED`.
  Derive them with `scripts/workflow.ts`; AO activity labels never advance work.
- Use `ao session get <id> --json` and `ao send --session <id> --message "..."`
  for targeted recovery. A blocked or permission-waiting worker receives no
  automatic prompt that would bypass its approval.
- A worker is complete at `CLOSED`, after merge and acceptance evidence.
- After a merge, re-read native blockers and refill free worker slots in parent
  order. Descendants remain unscheduled until every blocker reaches `MERGED` or
  a later delivery state.

## Resume and recovery

- `/supervise-this #<spec>` rebuilds the ownership snapshot and runs
  `scripts/workflow.ts reconcile` before any write. Repeated evidence collapses
  to one action, so resume cannot duplicate issues, sessions, branches, or PRs.
- Evaluate an idle worker with `scripts/workflow.ts idle-signal`. An open issue
  with no matching PR and no tracked change is red, regardless of
  `lastActivityAt`.
- Classify each failure as `infrastructure`, `task`, or `implementation`. Track
  retry counts per class with the helper. Finish infrastructure recovery before
  sending task continuation; send implementation correction only for the last
  class.
- Add `needs-info`, record the concrete blocker, and ask one ELI18 decision when
  a class exceeds its cap. Preserve the AO session and issue history.
- Record replacement decisions in a new parent comment. Never silently change
  the AO project role model or use a cheaper replacement.

## Review and closure

- After every planned child PR merges, record a fixed base and run full
  repository verification. Then run `/code-review` in the AO orchestrator
  against that base and the parent specification.
- Apply the configured reviewer policy through `scripts/workflow.ts
  review-decision`. Same-account review may record a `verdict` but cannot
  satisfy an approval-only policy.
- Record the reviewed head SHA. Feed current head, reviewed head, repository,
  and AO manageability to `scripts/workflow.ts merge-decision`. Stop if the head
  changed. Use its AO command for managed PRs. Use its explicit-repository
  GitHub fallback only when AO cannot manage a legacy unclaimed PR.
- Turn each confirmed in-scope finding into the smallest independently
  verifiable follow-up ticket with native blockers where needed. Spawn follow-up
  workers through the same AO worker profile and PR contract.
- Allow at most two automatic follow-up and review rounds. After the second,
  mark unresolved findings `needs-info` and ask the user for one decision.
- Close the parent only after every planned and follow-up PR is merged, every
  issue has acceptance evidence, all required checks pass, and final review has
  no confirmed finding. Post one final evidence comment with role models, AO
  sessions, PRs, commits, checks, review base, recovery decisions, and outcome.
- Finish with an ELI18 Why / What / Where / How summary only at that terminal
  condition or when a human decision blocks all safe progress.
