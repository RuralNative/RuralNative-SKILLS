# 0041 - Role-scoped recovery and resume

Status: accepted
Date: 2026-09-12
Narrows: 0031 (checkout entry), 0035 (finalization entry), 0036 (checkout alignment), 0039 (automatic recovery)

## Context

Review of PR #310 in a consuming repository stopped because a tracked agent file
was deleted locally. The reviewer instructed the user to restore it and invoke
the command again. The clean-checkout rule protected local work but supplied no
preserving recovery path. Implementation had a related contradiction: prose
allowed same-session continuation, while the checkout helper rejected all dirty
trees, including the run's own edits.

## Decision

The owner approved automatic preservation and recovery across the four production
skills. Narrow review-this INV-5 and INV-14, implement-this INV-6 and INV-10, and
fix-this INV-5: dirty entry triggers inspection and verified preservation, not an
automatic request for manual cleanup. Verified task edits resume in place.
Unrelated edits needed out of the way must first have a verified durable Git
snapshot with original branch, HEAD, index, worktree, and untracked contents.
Snapshots remain recoverable and are not applied to another revision or deleted
automatically. Unknown Git operations and concurrent conflicting edits remain
protected.

All four stages recover their original authorization and verified progress after
interruption, reconcile uncertain writes against native state, and repair
operational prerequisites within their role before escalating. Their installed
agent capabilities must permit the checked recovery path. Retrying an unchanged
failure is bounded; interruptions do not reset that budget. A new session still
needs a human instruction, and later human restrictions take precedence.

Review continues to publish findings without changing PR source or delivering.
Planning still requires explicit publication approval. Implementation still
delivers one PR, and fix-this alone owns post-review finalization. Recovery never
waives required proof, invents historical RED, changes requirements, bypasses
permissions, or starts the next stage.

## Alternatives

Keeping manual cleanup would preserve the reported failure. Discarding dirty
files could destroy work, and a shared unnamed stash could mix worktree state.
Reviewing in a separate pinned copy would leave the invoking checkout untouched,
but would change the current-checkout contract and not solve implementation
resume. Verified preservation keeps that contract while making recovery explicit.

## Consequences

The shared recovery instructions ship in every standalone workflow bundle through
the existing generator. Checkout decisions and effectful recovery tests must
agree with them. Session records identify local work; GitHub artifacts reconcile
remote completion. Neither is permission by itself. No skill can restart a dead
host process, but a resumed authorized session need not restart completed work.
