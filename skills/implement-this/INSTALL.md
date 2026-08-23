# Installing implement-this

`implement-this` runs one GitHub ticket, several ready tickets, or one parent specification through isolated ticket workers, and every ticket delivers by pull request. Use:

- `/implement-this #<n>` for one ticket.
- `/implement-this #<n1> #<n2> [#<n3>]` for an explicit set of ready tickets.
- `/implement-this #<spec>` for a parent specification; it selects up to three current frontier tickets in native child order.

Bare (`155`) and hash (`#155`) forms are equivalent and normalize identically before any GitHub read or write.

The command session manages workers instead of writing ticket code: every run, including a single-ticket run, dispatches one isolated worktree and one worker session per ticket. In Kilo Code this is the `agent_manager` tool in worktree mode, one independent task and one initial prompt per ticket. Every worker pushes its feature branch and opens one pull request against `main`; no path pushes directly to `main`.

## Requirements

- A GitHub repository with an issue tracker and native sub-issue plus `blocked_by` relationships for parent and dependency state.
- `/implement` and `/unslopify` installed through their own registry lanes.
- For every run, a host that provides both an isolated git worktree and a targeted worker session per ticket. Execution stops before any claim or edit when isolation is unavailable.
- For Kilo dispatch, the `agent_manager` tool with worktree mode, so managed worktrees sit under the Agent Manager worktree location.

## Install

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill implement-this
```

Manual fallback:

Check whether the destination folder already exists first: `cp -r` replaces it silently, and overwriting an existing `implement-this` install requires the user's explicit approval. Then copy from a clone of the repository:

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

## Verify a one-ticket run

> /implement-this #100

The skill validates `#100` against the frontier before any claim, reserves it with an assignee, and dispatches one isolated worker through `agent_manager` worktree mode — the same path a parent run uses; there is no inline fallback. The worker loads `/unslopify`, runs `/implement`, verifies the work, pushes the feature branch, opens a pull request against `main` whose body carries `Closes #100`, posts acceptance-criterion evidence on the ticket, removes `ready-for-agent`, and adds `ready-for-human`.

## Verify an explicit multi-ticket run

```bash
/implement-this #101 #102 #103
```

Every listed ticket is validated first; the run stops before any claim or edit if a ticket is closed, blocked, assigned, outside the parent, missing `ready-for-agent`, or duplicated. Before spawning, the command session reads Agent Manager's overview and counts unfinished managed workers: at most three implementation workers run at once, at most four managed workers stay active across the workspace, and unrelated active workers consume that global capacity. Each ticket gets its own worktree and pull request.

## Verify a parent-specification run

```bash
/implement-this #99
```

Where `#99` is the parent specification, the skill takes up to three current frontier tickets from its open children in native child order and dispatches them like an explicit set. While it runs, it recomputes the frontier whenever a ticket, blocker, pull request, or follow-up child changes and fills free slots up to both caps.

A failed worker gets one reconciled retry that reuses existing branches, sessions, and pull requests; a second failure adds `needs-info` to that ticket and stops it, keeping the worktree for diagnosis. When all bounded tickets have open pull requests with evidence posted, the run ends by telling you to review from the control workspace with `/review-this #<spec>`; ticket worktrees do not run review.

Completed sessions stop. Current Kilo chat cannot close a managed worktree, so finished worktrees are reported as `cleanup-pending`; nothing is deleted behind Agent Manager and `.kilo/agent-manager.json` is never edited.

## Kilo VS Code smoke run

One documented smoke run proves visible isolation on Kilo Code's VS Code extension:

1. Pick a parent specification with at least two frontier-ready child tickets (open, unassigned, `ready-for-agent`, no open blockers).
2. From one command session in the repo root, run `/implement-this #<spec>`.
3. Open the Agent Manager panel during dispatch. Expect two independent managed worktrees under `.kilo/worktrees/` and two running sessions — one per ticket — created by one parent command session.
4. Confirm each session received exactly one initial prompt (its rendered template) and works in its own worktree; the command session itself edits no ticket code.
5. After delivery, confirm one open pull request per ticket with a valid closing reference and posted evidence, stopped worker sessions, and any unclosable worktree reported as `cleanup-pending` rather than deleted.

Record the observed overview counts and outcomes in the run notes for the specification.

## Boundary

The skill accepts one ticket, several ready tickets, or one parent specification per invocation. At most three implementation workers run per stage and at most four managed workers stay active across the workspace. It does not merge pull requests, close tickets before merge, choose models, or schedule waves across specifications.

## Source provenance and trust

Installing this skill is a trust decision in its source repository, `RuralNative/RuralNative-SKILLS`. Record provenance for what you install: note the resolved commit the registry CLI reports, or pin the revision you reviewed where the installer accepts a ref. `/implement` arrives through its own lane from its own repository; pin the reviewed revision of that dependency where its installer supports it too.

Provenance and pinning narrow what can change under you; they do not remove the residual trust in the source repository. Snyk's August 2026 audit reported Medium W011 for this skill's install path (plan-this carried Critical E005 alongside its W011). Pinning reviewed revisions addresses that exposure; the findings have not gone away and the underlying repository trust remains yours to make.

Workflow runs perform no skill downloads: once installed, `/implement-this` never fetches, clones, or installs skills mid-run. Installing dependencies with `npm ci` inside a run stays allowed. Manual installs must not overwrite an existing `implement-this` folder without the user's explicit approval.
