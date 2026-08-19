---
name: supervise-this
description: Run a durable supervised planning and implementation workflow inside an Agent Orchestrator project orchestrator. Use /supervise-this <task> for a new run or /supervise-this #<spec> to resume. Delegates planning to plan-this, creates Kilo Code workers through AO, follows GitHub native blockers, keeps the run open after planning and worker creation, and continues through pull-request merge, final code review, follow-up fixes, and human decisions.
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
- Verify `ao status --json`, the current `AO_PROJECT_ID`, the orchestrator
  session, the project role profiles, and `ao agent ls --refresh --json`.
- Require an orchestrator profile for planning and final review and a worker
  profile for implementation. AO project role profiles are the model source;
  do not invent per-spawn model flags or rewrite project configuration.
- If the AO project has a configured reviewer profile, validate it and let AO
  use it for pull-request review. The orchestrator still owns whole-spec review.
- Ask one ELI18 decision with a recommendation if AO, the project, a role
  profile, the Kilo Code agent, or a required model is unavailable.

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
- Compute the ready frontier as open child tickets with no open native blocker,
  the `ready-for-agent` label, and no assignee. Preserve parent order.
- Inspect `ao session ls --project "$AO_PROJECT_ID" --all --json` before
  spawning. Never duplicate a worker for an assigned ticket or known AO
  session.
- Keep at most three implementation workers active. Start each worker with
  the documented AO form:

  ```bash
  ao spawn --project "$AO_PROJECT_ID" --kind worker --name "issue-<n>" --issue <n> --mode tui --prompt "Run /implement-this #<n> in AO pull-request delivery mode."
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
- Use `ao session get <id> --json` and `ao send --session <id> --message "..."`
  for targeted recovery. A blocked or permission-waiting worker receives no
  automatic prompt that would bypass its approval.
- A worker is complete only after its PR is merged, its acceptance evidence is
  present, and its issue is closed with that evidence. Use `ao pr merge` only
  when checks and review policy permit it; pause for branch protection or
  human approval.
- After a merge, re-read native blockers and refill free worker slots in parent
  order. Descendants remain unscheduled until every blocker closes.

## Resume and recovery

- `/supervise-this #<spec>` must not create a duplicate specification, ticket,
  worker, or PR. Reconcile GitHub first, then AO sessions.
- If a worker exits, loses signal, waits for input, or fails, inspect its AO
  session, PR, checks, and issue evidence before sending one focused recovery
  message. Continue unrelated ready work.
- Add `needs-info`, record the concrete blocker, and ask one ELI18 decision when
  the worker cannot continue. Preserve the AO session and issue history.
- Record replacement decisions in a new parent comment. Never silently change
  the AO project role model or use a cheaper replacement.

## Review and closure

- After every planned child PR merges, record a fixed base and run full
  repository verification. Then run `/code-review` in the AO orchestrator
  against that base and the parent specification.
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
