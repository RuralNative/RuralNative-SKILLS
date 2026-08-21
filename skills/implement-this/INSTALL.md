# Installing implement-this

`implement-this` handles one GitHub issue. Use `/implement-this #<n>` directly for the direct-main workflow, or inside a Kilo Agent Manager worktree for manager-worktree pull-request delivery. A session whose worktree root sits under the Agent Manager worktree location uses the pull-request delivery mode; it pushes the feature branch, opens or updates a pull request, and swaps `ready-for-agent` for `ready-for-human`. The standalone path keeps its direct-main delivery rules.

## Requirements

- A GitHub repository with an issue tracker and a dedicated worktree.
- `/implement` and `/unslopify` installed through their own registry lanes.
- For manager-worktree delivery, a session whose worktree root sits under the Kilo Agent Manager worktree location.

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

The skill loads `/unslopify`, runs `/implement`, substitutes `Issue #100` for `Issue #0`, verifies the work, rebases, pushes `HEAD:main`, posts evidence, removes `ready-for-agent`, and closes only issue `#100`.

## Verify manager-worktree delivery

Run `/implement-this #100` inside a Kilo Agent Manager worktree:

```bash
# worktree root sits under the Kilo Agent Manager worktree location
/implement-this #100
```

The skill detects the manager worktree by path, pushes the feature branch, then creates or updates a pull request against `main` whose body carries `Closes #100`. It posts acceptance-criterion evidence on the ticket, removes `ready-for-agent`, and adds `ready-for-human`. It does not close the issue before merge, does not push directly to `main`, and never force-pushes.

## Boundary

The skill accepts one issue only. It does not create worktrees, choose models, or schedule dependency waves.
