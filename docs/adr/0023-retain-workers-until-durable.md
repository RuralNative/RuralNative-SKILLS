# 0023 — Retain workflow workers until delivery is durable

Status: accepted
Date: 2026-08-29
Amends: 0019

Decision: `/implement-this` and `/review-this` stop a worker session or remove its worktree only after the worker's code is provably durable outside the worktree. A GitHub reservation (assignee) is ownership evidence, not source recovery evidence, and it never alone justifies stopping a worker. Unfinished, interrupted, failed, dirty, unpushed, SHA-mismatched, and `needs-info` workers remain live and retain their worktrees.

Stop and removal are separate decisions, and neither is inferred from idleness, a finished model response, a failure, or a ticket reservation. Only the command session may request worker cleanup; worker prompts never stop or close themselves.

Cleanup requires a terminal successful lifecycle state, a clean worktree, and exact SHA equality between the local `HEAD`, the remote feature branch, and the pull-request head. Implementation additionally requires the existing durable-delivery facts from ADR-0021: an open pull request, a valid closing reference, and posted acceptance evidence. Review cleanup occurs only after the merged pull request with no unpushed fix — the implemented terminal state, using the SHAs the command session recorded before the squash-merge (GitHub may delete the feature branch at merge) — while a blocked review or an exhausted fix budget preserves the session and worktree for diagnosis or resume.

When the host cannot close managed worktrees, a safely stopped, remotely recoverable worker reports `cleanup-pending`. Anything not remotely recoverable reports `preserved-for-resume` or `preserved-for-diagnosis` and is not stopped. If Agent Manager reports a missing session but the worktree still exists, the command session reports `recovery-required` with the worktree path and branch; it neither creates a replacement worktree nor deletes the existing one, and it reuses the existing session when the host exposes it.

This decision narrows ADR-0019's accepted behavior in two places. First, a `needs-info` stop no longer stops the worker session: the session and its worktree stay for diagnosis. Second, "only successful work whose pull request and acceptance evidence are durable becomes eligible for supported closure" is tightened to the exact-recovery gate above, including exact SHA equality. ADR-0021's single verified implementation commit per ticket stays unchanged; no remote checkpoint commits or temporary checkpoint branches are added.

Why: the previous lifecycle made the session stop and the worktree removal a single literal decision that stopped workers even when all source changes existed only in the worktree. Reservation, idleness, and partial failure are not evidence that code is recoverable from GitHub, so a stopped session and a surviving checkout could strand uncommitted or unpushed work behind Agent Manager state that the workflow is forbidden to touch.

Consequences:

- `skills/implement-this/command-session.ts` carries observed facts for lifecycle outcome, worktree dirtiness, local, remote, and pull-request head SHAs, existing delivery evidence, and managed-close support. `cleanupDecision` returns `stopSession: false` for every state that is not provably durable, and `resumeAction` returns `recovery-required` when a session is absent but its worktree exists.
- `skills/review-this/review-session.ts` gains the same safety boundary: cleanup facts plus `persistentWorktreePlan` returning `recovery-required` when an existing worktree's session is missing.
- Both `SKILL.md` files state that workers never call Agent Manager stop or close and that cleanup runs only after the exact recovery gate.
- `docs/leaves/implement-this.md` amends INV-6, INV-10, and its lifecycle data flow; `docs/leaves/review-this.md` amends INV-13 and its persistent-worktree data flow. `CONTEXT.md` and `README.md` reflect the new lifecycle states.
- ADR-0021's single verified implementation commit remains authoritative; this decision adds no commit strategy.

Activation: this decision governs new `implement-this` and `review-this` command sessions from today.
