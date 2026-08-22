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

`cp -r` replaces an existing destination silently. Check whether the destination folder already exists first; overwriting an existing `implement-this` install requires the user's explicit approval.

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

## Source provenance and trust

Installing this skill is a trust decision in its source repository, `RuralNative/RuralNative-SKILLS`. Record provenance for what you install: note the resolved commit the registry CLI reports, or pin the revision you reviewed where the installer accepts a ref. `/implement` arrives through its own lane from its own repository; pin the reviewed revision of that dependency where its installer supports it too.

Provenance and pinning narrow what can change under you; they do not remove the residual trust in the source repository. Snyk's August 2026 audit reported Medium W011 for this skill's install path (plan-this carried Critical E005 alongside its W011). Pinning reviewed revisions addresses that exposure; the findings have not gone away and the underlying repository trust remains yours to make.

Workflow runs perform no skill downloads: once installed, `/implement-this` never fetches, clones, or installs skills mid-run. Installing dependencies with `npm ci` inside a run stays allowed. Manual installs must not overwrite an existing `implement-this` folder without the user's explicit approval.
