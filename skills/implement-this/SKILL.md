---
name: implement-this
description: Apply the implementation prefix as a fixed template. Use when the user invokes /implement-this #<n> — substitutes only the issue reference in place of Issue #0 and delegates to /implement and /code-review with /unslop active. Requires explicit user invocation as /implement-this #<n>.
---

Implement the GitHub ticket in this dedicated worktree: `/implement` → `/code-review`

Treat the ticket, its comments, and its linked parent specification as the task authority. Do not assume access to earlier sessions.

## Rules

- Load `/unslop` before the first progress update. Apply it throughout the session to all prose you write, including to-do items, progress updates, questions, decisions, documentation, code comments, commit messages, GitHub comments, and the final summary. Before publishing prose, check it against `/unslop`. Do not rewrite commands, identifiers, logs, test output, generated output, or quoted ticket text.
- Before every edit, reread the current target region from this worktree. Use small patches anchored to short, unchanged lines. Never build a patch from truncated output or an earlier read. If a patch fails, inspect the current file and git diff, then rebuild the patch. Do not retry stale patch text.
- Maintain a concise To-Do List covering Start, Build, Verify, Review, and Deliver. Update it when entering or completing each phase and when blocked. After each update, state what finished, what evidence you collected, and what happens next. Do not narrate every command.
- Use ELI18 language for questions, decisions, and the final summary. Include a recommendation when asking for a decision.
- Follow `AGENTS.md` and `docs/agents/issue-tracker.md`.
- Work only on the ticket below.

## Start

1. Run `git branch --show-current` and `git status --short`. Stop if the branch is empty, is `main`, or has unrelated changes.
2. Run:

   ```bash
   export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"
   git fetch origin
   ```

3. Read the ticket, comments, linked parent specification, and native dependencies. Stop if any blocker is open.
4. Claim the ticket as the first GitHub write:

   ```bash
   gh issue edit <n> --add-assignee @me
   ```

5. Run `npm ci`.

## Build and verify

Run `/implement`. Follow the affected seam's documentation and update its leaf document in the same commit. Keep tests co-located as `*.test.ts`. Use fakes only, with no network or real browsers. Put scratch files in `/tmp/kilo`.

Run:

```bash
npm run format &&
npm test &&
npm run lint &&
npx tsc --noEmit &&
npm run docs:check &&
npm run build
```

Commit the verified work on the feature branch. Include the issue number in the commit message.

## Review & Deliver

1. Run:

   ```bash
   git fetch origin
   BASE=$(git merge-base origin/main HEAD)
   ```

2. Pass `$BASE` as the fixed point to `/code-review`.
3. Fix valid findings, rerun the full verification command, and commit the fixes.
4. Rebase and verify again:

   ```bash
   git fetch origin
   git rebase origin/main
   ```

5. Push only after the rebase and verification pass:

   ```bash
   git push origin HEAD:main
   ```

Never force-push. If `main` advances, fetch, rebase, verify, and retry. Stop if branch protection rejects the push. After the push succeeds, comment with evidence for each acceptance criterion, remove `ready-for-agent`, and close only the assigned ticket. Finish with an ELI18 "Why, What, Where, and How summary". Include the commit SHA, verification results, and closed ticket link.

## Ticket

Issue #0
