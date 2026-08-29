# Retain workflow workers until delivery is durable

## Goal

Prevent `/implement-this` and `/review-this` from stopping a worker session or removing its worktree while code exists only in that worktree. Preserve the current single verified commit per implementation ticket; do not add remote checkpoint commits.

## Decisions

- A GitHub reservation is ownership evidence, not source recovery evidence.
- Unfinished, interrupted, failed, dirty, unpushed, SHA-mismatched, and `needs-info` workers remain live and retain their worktrees.
- Only the command session may request worker cleanup. Worker prompts must never stop or close themselves.
- Cleanup requires a terminal successful lifecycle state, a clean worktree, and exact SHA equality between local `HEAD`, the remote feature branch, and the pull-request head.
- Implementation additionally requires the existing durable-delivery facts: open PR, valid closing reference, and posted acceptance evidence.
- Review cleanup occurs only after merge or another explicitly successful terminal state, with no unpushed fix. A blocked review or exhausted fix budget preserves the session and worktree for diagnosis or resume.
- When the host cannot close managed worktrees, a safely stopped, remotely recoverable worker reports `cleanup-pending`. Anything not remotely recoverable reports `preserved-for-resume` or `preserved-for-diagnosis` and is not stopped.
- If Agent Manager reports a missing session but the worktree still exists, do not create a replacement worktree or delete the existing one. Report a recovery-required state with the worktree path and branch; reuse the existing session when the host exposes it.

## Implementation plan

1. Record the lifecycle amendment.
   - Add `docs/adr/0023-retain-workers-until-durable.md`, amending ADR-0019's rule that `needs-info` stops the session and tightening its cleanup definition.
   - State that stop and removal are separate decisions, and neither is inferred from idleness, a finished model response, failure, or ticket reservation.
   - Keep ADR-0021's single verified implementation commit unchanged.
   - Index ADR-0023 in `ARCHITECTURE.md` and update the cross-cutting lifecycle summary.

2. Make the implementation cleanup gate fail closed in `skills/implement-this/command-session.ts`.
   - Replace `CleanupFact`'s broad booleans with observed facts for lifecycle outcome, worktree dirtiness, local SHA, remote branch SHA, PR head SHA, existing delivery evidence, and managed-close support.
   - Add a pure exact-recovery predicate. It passes only when the successful worker is terminal, the worktree is clean, all three non-empty SHAs match, and `isDelivered` passes.
   - Change `cleanupDecision` so `stopSession` is a real decision rather than literal `true`.
   - Return `stopSession: false` and `removeWorktree: false` for running, interrupted, failed, dirty, unpushed, SHA-mismatched, missing-PR, missing-evidence, and `needs-info` states.
   - Distinguish `preserved-for-resume`, `preserved-for-diagnosis`, `cleanup-pending`, and `removed` reports.
   - Keep supported managed closure available only after the exact-recovery predicate passes.

3. Make implementation resume behavior protect existing worktrees.
   - Extend `ReservationFact` and `resumeAction` only as needed to distinguish an existing worktree/branch from a live session.
   - Reuse a live worker when present.
   - If the session is absent but its worktree exists, return `recovery-required` instead of planning a duplicate Agent Manager worktree.
   - Create a replacement worker only when no prior worktree exists and GitHub facts prove no work has already been delivered.

4. Add the same safety boundary to `review-this`.
   - Add review cleanup and recovery facts to `skills/review-this/review-session.ts`: lifecycle outcome, worktree existence and dirtiness, local/remote/PR SHAs, merge state, session state, and host close support.
   - Preserve the persistent PR session through initial review, every fix and rereview, final verification, merge, or a visible blocked state.
   - Do not stop on publication failure, missing nested-agent capability, fix-budget exhaustion, conflict stop, `needs-info`, dirty work, or an unpushed fix.
   - Update `persistentWorktreePlan` so an existing worktree with a missing session produces `recovery-required`, not a generic `reuse` or a new worktree creation.
   - Permit stop and managed closure only after successful terminal review state and exact local/remote/PR head equality. For a merged PR, retain enough observed SHA evidence to prove the merged head is recoverable before cleanup.

5. Tighten both skill prompts and install guidance.
   - In `skills/implement-this/SKILL.md`, state that workers never call Agent Manager stop/close, checkpoints end the command turn without stopping workers, and cleanup runs only after the exact recovery gate.
   - Replace the current `needs-info` stop wording with session-and-worktree retention for diagnosis.
   - In `skills/review-this/SKILL.md`, add an explicit Recovery and cleanup section with the same ownership and exact-SHA rules.
   - Update both `INSTALL.md` files so smoke-test instructions check session retention before delivery and cleanup only after remote recovery is proven.

6. Update the doc cache and derived human docs in the same change.
   - Amend `docs/leaves/implement-this.md` INV-6, INV-10, and lifecycle data flow to encode no-stop-before-durable behavior.
   - Amend `docs/leaves/review-this.md` INV-13 and its persistent-worktree data flow.
   - Update `CONTEXT.md` definitions for worker session and `cleanup-pending`; add `preserved-for-resume` and `recovery-required` if these become public workflow states.
   - Update `README.md` lifecycle and cleanup sections.
   - Regenerate `docs/human/guardrails.md`, `docs/human/data-flow.md`, `docs/human/overview.md`, and `docs/human/decision-journal.md` from the authored sources, including ADR-0023 in their source headers.

7. Add regression tests before changing behavior.
   - Rewrite the implementation cleanup test that currently asserts "stop always happens" so it first fails against current behavior.
   - Table-test every blocking fact independently: nonterminal lifecycle, dirty worktree, absent remote SHA, local/remote mismatch, remote/PR mismatch, missing PR, invalid closing reference, missing evidence, failure, interruption, and `needs-info`.
   - Assert all blocked cases preserve both session and worktree.
   - Assert exact durable delivery allows session stop; managed removal depends separately on host support.
   - Test implementation resume for live session reuse, missing-session/existing-worktree recovery, and clean no-prior-work creation.
   - Add equivalent review-session tables for dirty or unpushed fixes, publication failure, exhausted rounds, conflicts, `needs-info`, exact recoverable terminal state, and merged cleanup.
   - Extend composition tests to require the no-worker-self-cleanup wording and forbid automatic stop before exact remote durability.

8. Validate behavior and documentation.
   - Run affected implementation and review tests while iterating.
   - Run `npm run verify` and `./scripts/docs-check.sh` on the final revision.
   - Perform one manual Agent Manager smoke scenario: create a worker, make an uncommitted edit, interrupt the command session, and verify the worker session and worktree remain; then complete, commit, push, open/update the PR, post evidence, verify exact SHAs, and confirm cleanup becomes eligible.
   - Perform one review-fix smoke scenario: leave a fix dirty or unpushed and verify retention, then push the exact fix head and complete review/merge before cleanup eligibility.
   - Record manual smoke evidence in the implementation ticket or PR, not as a repository work document.

## Failure handling

- If the host removes a worktree without any workflow stop/close request, record the Agent Manager state and host logs as a platform defect; the skills cannot recover uncommitted files after external deletion.
- If exact SHA facts cannot be read, fail closed and retain the worker.
- If a session disappears while its worktree remains, report recovery-required and do not duplicate or delete it.
- If a numbered invariant conflicts with these rules during implementation, ADR-0023 is the approved narrowing for lifecycle cleanup; ADR-0021's single-commit rule remains authoritative.

## Out of scope

- Checkpoint commits or temporary remote checkpoint branches.
- Automatic cleanup of pre-existing Agent Manager worktrees.
- Editing `.kilo/agent-manager.json` or deleting worktree directories behind Agent Manager.
- Building a daemon, coordinator, or fourth workflow command.
