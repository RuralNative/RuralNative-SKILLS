---
name: implement-this
description: Apply the implementation prefix as a fixed template. Use when the user invokes /implement-this #<n> — substitutes only the issue reference in place of Issue #0 and delegates to /implement and /code-review with /unslop active. Requires explicit user invocation as /implement-this #<n>.
---

# implement-this — fixed-template implementation adapter

This skill is a thin fixed-template adapter. It does not reimplement `/implement`, `/code-review`, or `/unslop`. It loads and delegates to those hard dependencies in the order stated by the supplied prefix. The exact prefix text is the contract. Commands, identifiers, labels, dependency names, quotations, and technical meaning stay unchanged except for the issue reference in place of `Issue #0`.

## Invocation

User-invoked only. The user runs:

```text
/implement-this #<n>
```

The skill preserves the requested issue reference verbatim in place of `Issue #0`. For example, `/implement-this #100` supplies `Issue #100`; `/implement-this #53` supplies `Issue #53`. It does not reinterpret or normalize the reference. The ticket, its comments, and its linked parent specification remain the task authority.

## Hard dependencies

Load `/unslop` before the first progress update. Apply it throughout the session to all prose you write, including to-do items, progress updates, questions, decisions, documentation, code comments, commit messages, GitHub comments, and the final summary. Before publishing prose, check it against `/unslop`. Do not rewrite commands, identifiers, logs, test output, generated output, or quoted ticket text. Treat `/unslop` as the external dependency identity supplied by the user. Do not silently map it to this repository's `unslopify` identity.

Delegated workflow order remains:

1. `/implement`
2. `/code-review`

The implementation workflow remains `/implement` followed by `/code-review`. Hard dependencies, in order, are `/implement`, `/code-review`, and `/unslop`, following the supplied implementation prefix.

## Fixed template — implementation prefix

The following is the exact implementation prefix. Substitute only the issue reference in place of `Issue #0`.

--- start of supplied implementation prefix ---

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

--- end of supplied implementation prefix ---

Place the requested issue reference in place of `Issue #0` (for example, `Issue #100` for `/implement-this #100`). No other substitution, renaming, or reinterpretation. The skill does not add `.kilo/command/` files, a router skill, runtime scripts, model-based evals, or a prompt-generation service.

## Rules preserved

The prefix preserves the supplied rules for worktree checks (`git branch --show-current` and `git status --short`), ticket and specification authority, dependency checks, claiming (`gh issue edit <n> --add-assignee @me`), verification (`npm run format && npm test && npm run lint && npx tsc --noEmit && npm run docs:check && npm run build`), documentation (update leaf doc same commit, keep tests co-located as `*.test.ts`, use fakes, put scratch files in `/tmp/kilo`), review (`BASE=$(git merge-base origin/main HEAD)` and pass `$BASE` to `/code-review`), rebase (`git rebase origin/main`), push (`git push origin HEAD:main` with never force-push), issue comment, label removal, and closure, with the final ELI18 Why / What / Where / How summary including commit SHA, verification results, and closed ticket link.

## Installation and discovery

Registry lane:

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill implement-this
```

Manual copy:

```bash
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
cp -r skills/implement-this ~/.agents/skills/implement-this
```

Discovery text for explicit user invocation: invoke as `/implement-this #<n>` — for example, `/implement-this #100` preserves `Issue #100` in place of `Issue #0` and runs `/implement` → `/code-review` with `/unslop` active.

## Boundary

This skill is a fixed-template adapter. It does not reimplement delegated skills, does not copy the `AIT-*` catalog, does not add npm packaging, and does not modify `/implement`, `/code-review`, `/unslop`, or the existing `unslopify` skill.
