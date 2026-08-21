---
name: implement-this
description: Apply the implementation workflow to one GitHub issue. Use /implement-this #<n> for direct-main delivery, or run it inside a Kilo Agent Manager worktree for pull-request delivery. The skill detects the manager worktree by path and delivers by pull request; otherwise it keeps the direct-main contract.
---

Implement the GitHub ticket in this dedicated worktree: `/implement` → `/code-review`

`/implement` requires explicit human invocation; an agent cannot traverse the chain unattended. `/code-review` and `/unslopify` remain model-invocable.

Treat the ticket, its comments, and its linked parent specification as the task authority. Do not assume access to earlier sessions.

## Rules

- Load `/unslopify` before the first progress update. Keep it active throughout the implementation, review, issue comments, and final summary. Preserve exact domain terms, identifiers, commands, labels, dependencies, quotations, and technical meaning. Follow unslopify scope, protected-content, preservation, and completion report contracts.
- Before every edit, reread the current target region from this worktree. Use small patches anchored to short, unchanged lines. Never build a patch from truncated output or an earlier read.
- Maintain a concise To-Do List covering Start, Build, Verify, Review, and Deliver. Update it when entering or completing each phase and when blocked. State what finished and what happens next without narrating every command.
- Use ELI18 language for questions, decisions, and the final summary. Include a recommendation when asking for a decision.
- Follow `AGENTS.md` and `docs/agents/issue-tracker.md`. Use focused doc-cache loading: read AGENTS.md, ARCHITECTURE.md, the affected seam leaf doc in docs/leaves/, CONTEXT.md, and relevant ADRs. This focused route does not require broad preloading and does not require the derived human docs from document-for-humans (docs/human/). Work only on the ticket below except for the explicit tracker-state transition for newly unblocked dependents. After closing the assigned ticket, recompute the dependent frontier and update only tickets made ready by that closure (remove blocked, add unblocked + ready-for-agent when all native blockers are closed).

## Start

1. Run `git branch --show-current` and `git status --short`. Stop if the branch is empty, is `main`, or has unrelated changes.
2. Run `git fetch origin` and read the ticket, comments, linked parent specification, and native dependencies (native blocked_by edges are canonical, human Blocked by text is fallback). Stop if any native blocker is open.
3. Claim the ticket as the first GitHub write with `gh issue edit <n> --add-assignee @me`, then run `npm ci`.

## Build and verify

Run `/implement`. Follow the affected seam's documentation and update its leaf document in the same commit. Keep tests co-located as `*.test.ts`, use fakes rather than network or real browsers, and put scratch files in `/tmp/kilo`.

Run:

```bash
npm run verify
```

Commit the verified work on the feature branch and include the issue number in the commit message.

## Delivery

Choose the delivery mode by path detection before review.

**Manager-worktree delivery.** Use this branch when the worktree root sits under the Kilo Agent Manager worktree location (for example `.kilo/worktrees/`). Push the feature branch, then open or update a pull request against `main` whose body closes the assigned ticket on merge (`Closes #<n>`). The agent does not push directly to `main` and does not force-push. After local verification and review it posts acceptance-criterion evidence on the ticket, removes `ready-for-agent`, and adds `ready-for-human`. It never closes the issue before merge, never pushes `main`, and never force-pushes. Agent Manager PR badges supply progress telemetry, so no extra polling is needed.

**Direct delivery.** Outside a manager worktree, run `BASE=$(git merge-base origin/main HEAD)`, pass `$BASE` as the fixed point to `/code-review`, fix valid findings, rerun the full verification command, rebase with `git rebase origin/main`, verify again, and push only with `git push origin HEAD:main`. Never force-push. After the push succeeds, comment with evidence, remove `ready-for-agent`, and close only the assigned ticket.

If the delivery mode is unclear, ask one ELI18 decision before pushing or opening a pull request. Finish with an ELI18 Why / What / Where / How summary that names the delivery mode, commit SHA, verification results, and ticket or PR link.

## Ticket

Issue #0
