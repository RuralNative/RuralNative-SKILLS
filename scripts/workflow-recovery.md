# Recover and continue

This contract applies on entry, after interruption, and before reporting any
blocked phase. The invoking skill still owns the target, permitted effects,
approval gates, and completion criteria. A helper's refusal blocks that operation,
not every safe way to finish the phase.

## Resume the authorized stage

Recover the original human request from session history, the selected target,
approved decisions, current phase, and recorded evidence. Compaction, a tool
failure, a completed subtask, and an accidental early response do not revoke that
request. Continue the unfinished stage without asking the user to repeat it.
A fresh session needs a human instruction naming or resuming the target; it can
reuse verified work from an earlier run. Later pause, stop, status-only, and
handoff-only instructions take precedence. Summaries and checkpoints locate
evidence; they never supply authorization.

Record progress before risky transitions and after each completed check or write.
Keep the human-message reference, repository and target, checkout identity,
starting and current revisions, requirements/policy pins, phase, intended next
operation, native artifact IDs, and complete command/output/exit-status receipts.
Keep local edit ownership evidence outside tracked source: record the starting
HEAD, exact changed paths, index and worktree content digests, and deleted paths.
Record test receipts when commands run, especially defect-specific RED. Use the
host's durable session storage and the stage's existing native artifacts; do not
make a temporary filename the only record of proof.

On resume, compare records to current Git and GitHub facts. Reuse completed
commits, PRs, reviews, merges, and labels after read-back; perform only missing
steps. A successful remote write with a lost response is a reconciliation task,
not a reason to create another artifact. Rerun missing current GREEN checks when
permitted; recover historical RED from real logs, never manufacture it.

## Repair operational failures

Diagnose the failing operation before escalating. Read complete error output,
inspect the installed helper's usage and project configuration, then choose a
supported correction. Repair malformed agent-generated inputs, wrong operation
names or paths, incomplete pagination, and temporary read failures. Select an
already-installed compatible runtime and use the stage's approved locked install
path for missing dependencies. Keep secrets, project policy, and host permissions
unchanged. Do not install skills or edit your own permission configuration.

Re-read state before retrying an uncertain write. Make one corrective attempt per
distinct failure cause, then verify its result and continue in the same invocation.
Retain the attempted cause and observations across interruption so resume does not
reset the retry budget. New evidence may identify another cause; repeating the
same failed action without changed facts is not recovery. Permission denials,
authentication failures, and branch protection are not transient failures.

## Protect local work

A dirty checkout is not proof of a conflict. Resume exact edits attributable to
the authorized task after comparing their recorded revisions, paths, and content.
Never claim ownership from a branch name, a matching filename, or a Boolean flag.
Leave unrelated edits alone when they do not obstruct the stage. If clean alignment
is required, preserve unrelated tracked, staged, and untracked edits through the
checked checkout-recovery operation before changing the checkout. Require a
verified durable Git snapshot, original HEAD and branch, and a recoverable identity.
If preservation cannot be verified, leave the files in place and stop that mutation.
Never use an unqualified shared stash, reset, clean, force checkout, or automatic
snapshot deletion. Do not apply saved edits onto a different revision. Report the
snapshot identity and original checkout in the completion summary.

Resume an unfinished Git operation only when its recorded starting revision,
operation identity, and affected edits establish that this task started it.
Unknown operations, concurrent changes, and ignored-file collisions stay protected.

## Escalate only what needs a person

Operational corrections stay within the current role. Planning repairs its own
drafts and approved publication; implementation repairs ticket work and delivery;
review repairs observation, preparation, evidence, and review publication, never
PR source; finalization repairs reviewed work and completes merge bookkeeping.
No role silently starts another stage, widens requirements, waives verification,
or grants itself permission.

Ask only for missing authorization, a genuine product or invariant decision, or
protected work that cannot be preserved safely. Before a final blocker report,
state the failed operation, observed cause, recovery attempted, preserved work,
and exact missing decision or capability. Do not hand the user a repair command
or ask them to reinvoke the skill when an authorized recovery remains available.
An agent cannot restart a terminated host process; when the host resumes the
session or the user resumes the target, it continues from verified progress.
