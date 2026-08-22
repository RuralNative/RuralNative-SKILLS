# Installing implement-this

`implement-this` runs one GitHub ticket, several ready tickets, or one parent specification through isolated ticket workers, and every ticket delivers by pull request. Use:

- `/implement-this #<n>` for one ticket.
- `/implement-this #<n1> #<n2> [#<n3>]` for an explicit set of ready tickets.
- `/implement-this #<spec>` for a parent specification; it selects up to three current frontier tickets in native child order.

Each ticket gets an isolated worktree, its own feature branch, and its own worker session through the Kilo Agent Manager adapter or another host that provides the same create, prompt, status, and stop capabilities. Every worker pushes its feature branch and opens one pull request against `main`; no path pushes directly to `main`.

## Requirements

- A GitHub repository with an issue tracker and native sub-issue plus `blocked_by` relationships for parent and dependency state.
- `/implement` and `/unslopify` installed through their own registry lanes.
- For multi-ticket runs, a host adapter that provides isolated workers. Multi-ticket execution stops before any write when isolation is unavailable.
- For Kilo Agent Manager dispatch, sessions whose worktree roots sit under the Agent Manager worktree location.

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

The skill validates `#100` against the frontier before any claim, then dispatches an isolated worker. The worker claims only `#100`, loads `/unslopify`, runs `/implement`, verifies the work, pushes the feature branch, opens a pull request against `main` whose body carries `Closes #100`, posts acceptance-criterion evidence on the ticket, removes `ready-for-agent`, and adds `ready-for-human`.

## Verify an explicit multi-ticket run

```bash
/implement-this #101 #102 #103
```

Every listed ticket is validated first; the run stops before any claim or edit if a ticket is closed, blocked, assigned, outside the parent, missing `ready-for-agent`, duplicated, or beyond three active workers. At most three workers run at once, each in its own worktree and pull request.

## Verify a parent-specification run

```bash
/implement-this #99
```

Where `#99` is the parent specification, the skill takes up to three current frontier tickets from its open children in native child order and dispatches them like an explicit set.

A failed worker gets one reconciled retry that reuses existing branches, sessions, and pull requests; a second failure adds `needs-info` to that ticket and stops it. When all bounded tickets have open pull requests, the run ends by telling you to review from the control workspace with `/review-this #<spec>`; ticket worktrees do not run review.

## Boundary

The skill accepts one ticket, several ready tickets, or one parent specification per invocation, capped at three active workers. It does not merge pull requests, close tickets before merge, choose models, or schedule waves across specifications.

## Source provenance and trust

Installing this skill is a trust decision in its source repository, `RuralNative/RuralNative-SKILLS`. Record provenance for what you install: note the resolved commit the registry CLI reports, or pin the revision you reviewed where the installer accepts a ref. `/implement` arrives through its own lane from its own repository; pin the reviewed revision of that dependency where its installer supports it too.

Provenance and pinning narrow what can change under you; they do not remove the residual trust in the source repository. Snyk's August 2026 audit reported Medium W011 for this skill's install path (plan-this carried Critical E005 alongside its W011). Pinning reviewed revisions addresses that exposure; the findings have not gone away and the underlying repository trust remains yours to make.

Workflow runs perform no skill downloads: once installed, `/implement-this` never fetches, clones, or installs skills mid-run. Installing dependencies with `npm ci` inside a run stays allowed. Manual installs must not overwrite an existing `implement-this` folder without the user's explicit approval.
