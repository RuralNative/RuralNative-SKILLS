# 0012 — Manager-worktree pull-request delivery

Status: accepted
Date: 2026-08-21
Supersedes: ADR-0008 Agent Orchestrator delivery branch (delivery portion)

Decision: `implement-this` delivers by pull request when the worktree root sits under the Kilo Agent Manager worktree location; otherwise it uses the unchanged direct-main contract. Path detection is the only trigger. There is no Agent Orchestrator context. The manager-worktree branch pushes the feature branch, opens or updates a pull request against `main` whose body carries the closing reference for the assigned ticket, posts acceptance-criterion evidence on the ticket, removes `ready-for-agent`, and adds `ready-for-human`. It never closes the issue before merge, never pushes `main`, and never force-pushes.

The manager-worktree branch keeps the same local workflow as direct-main: `/implement` then `/code-review` with a fixed base, valid findings fixed, rerun verification, rebase, verify again. It differs only at the boundary. Instead of `git push origin HEAD:main` it pushes the feature branch and opens or updates the PR, then swaps labels and posts evidence without waiting for merge.

Why: the supervise-this coordinator was retired (ADR-0011), so the Agent Orchestrator delivery branch had no runtime left. The manager worktree already gives a durable outer loop. Its PR badges act as free progress telemetry aligned with the `PR_OPEN`, `REVIEWED`, and `MERGED` evidence states, with no additional polling. Push-to-main delivery also caps safe concurrency at roughly one to two workers because every worker serializes on `origin/main`. Feature-branch plus pull-request delivery lifts that cap so supervised waves scale with worktree count.

Consequences:

- `implement-this` has two delivery modes. Its direct path pushes `HEAD:main`; its manager-worktree path creates or updates a PR and leaves review, merge, and issue closure to the pull request lifecycle.
- The worktree root location is the single delivery trigger. No session variable or supervisor prompt selects a mode.
- Delivered work always has a PR, so Agent Manager PR badges supply progress telemetry without extra polling.
- Feature-branch plus PR delivery raises the safe concurrency ceiling above the one to two workers limited by serializing on `origin/main`.

Rejected alternatives:

- Ask every time. Prompting for the delivery mode on every run adds a decision with no new information, because the worktree location already decides it.
- Always pull-request. Forcing PR delivery for standalone runs loses the direct-main contract's single-step path and its simpler closure for solo work.
