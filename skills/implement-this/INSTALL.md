# Installing implement-this

`implement-this` handles one GitHub issue. Use `/implement-this #<n>` for the direct-main workflow, or run it inside a Kilo Agent Manager worktree for pull-request delivery. The skill detects the manager worktree by path: when the worktree root sits under the manager worktree location, it pushes the feature branch and opens or updates a pull request whose body closes the ticket on merge. The standalone path keeps its direct-main delivery rules. `implement-this` owns verification, evidence, and the label swap; the pull request owns review, merge, and issue closure.

## Requirements

- A GitHub repository with an issue tracker and a dedicated worktree.
- `/implement`, `/code-review`, and `/unslopify` installed through their own registry lanes.
- For manager-worktree delivery, a Kilo Agent Manager worktree whose root sits under the manager worktree location (for example `.kilo/worktrees/`).

## Install

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill implement-this
```

Manual fallback:

```bash
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
cp -r skills/implement-this ~/.agents/skills/implement-this
```

## Verification

Run:

```bash
npm run verify
```

## Verify direct delivery

> /implement-this #100

The skill loads `/unslopify`, runs `/implement` followed by `/code-review`, substitutes `Issue #100` for `Issue #0`, verifies the work, rebases, pushes `HEAD:main`, posts evidence, removes `ready-for-agent`, and closes only issue `#100`.

## Verify manager-worktree delivery

Run `/implement-this #100` inside a Kilo Agent Manager worktree (root under the manager worktree location). The skill pushes the feature branch and opens or updates a pull request against `main` whose body carries `Closes #100`. It posts acceptance-criterion evidence on the ticket, removes `ready-for-agent`, and adds `ready-for-human`. It does not push directly to `main`, does not close the issue before merge, and never force-pushes.

## Boundary

The skill accepts one issue only. It does not create worktrees, choose models, or schedule dependency waves. The manager worktree owns the worktree lifecycle; the pull request owns review, merge, and issue closure.
