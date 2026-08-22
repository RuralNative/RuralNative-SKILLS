# Installing review-this

`review-this` owns one pull-request review wave for a parent specification. Invoke it explicitly as `/review-this #<spec>` where `#<spec>` is the parent specification that groups every implementation ticket as a native sub-issue. The skill discovers native child tickets, linked pull requests, blockers, checks, reviews, and current head SHAs, reconciles Kilo cloud review with the local Standards and Spec review against each current head, routes fixes, squash-merges clean heads, promotes newly unblocked dependents, and closes the specification when final verification passes.

## Requirements

- A GitHub repository with native sub-issue and `blocked_by` relationships linking child tickets to their parent specification.
- Open pull requests for the current wave, each against `main` with a closing reference `Closes #<ticket>` and a current head SHA.
- `/code-review` installed through its own lane. It is not published by this shelf; install it from its own source before using `review-this`. It carries no `disable-model-invocation` lock and stays model-invocable.
- `/unslopify` installed through its registry lane: `npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`.

## Install

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill review-this
```

Manual fallback:

Check whether the destination folder already exists first: `cp -r` replaces it silently, and overwriting an existing `review-this` install requires the user's explicit approval. Then copy from a clone of the repository:

```bash
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
cp -r skills/review-this ~/.agents/skills/review-this
```

## Source provenance and trust

Installing this skill is a trust decision in its source repository, `RuralNative/RuralNative-SKILLS`. Record provenance for what you install: note the resolved commit the registry CLI reports, or pin the revision you reviewed where the installer accepts a ref. `/code-review` is not published by this shelf; pin the reviewed revision of that dependency where its installer supports it and record the commit you reviewed otherwise.

Provenance and pinning narrow what can change under you; they do not remove the residual trust in either source repository. Snyk's August 2026 audit of this shelf reported Critical E005 and Medium W011 for `plan-this` and Medium W011 for `implement-this` and `unslopify`; treat this skill's install path with the same posture. Pinning reviewed revisions addresses that exposure, the findings have not gone away, and the underlying repository trust remains yours to make.

Workflow runs perform no skill downloads: once installed, `/review-this` never fetches, clones, or installs skills mid-run. Installation stays a user step outside the run. Manual installs must not overwrite an existing `review-this` folder without the user's explicit approval.

## Verification

From the control workspace, after an implementation wave has delivered pull requests:

```
/review-this #130
```

The skill discovers the current review wave, collects Kilo cloud summary and inline comments for the current head when available (recording `unavailable` when disabled, absent, failed, or timed out without blocking a complete local review), spawns the Standards and Spec sub-agents in parallel, reconciles cloud and local findings while keeping Standards and Spec axes separate, rejects duplicate, stale, out-of-scope, and unverified findings with evidence, routes confirmed findings to the owning worker (never fixing them in the review workspace), invalidates previous verdicts when a pushed fix changes the head SHA, squash-merges eligible pull requests whose checks are green, findings resolved, local review clean, and reviewed head unchanged, promotes only dependents whose final blocker closed (`unblocked` plus `ready-for-agent`, `blocked` removed), and on the penultimate wave tells you to run `implement-this #<spec>` for the next wave. When every child ticket closes, it checks updated `main` with `npm run verify` and a whole-spec Standards and Spec review, creates the smallest independently verifiable native child ticket for a confirmed integration defect while keeping the parent open, and closes the parent only when all gates pass.

Repository checks run via:

```bash
npm run verify
```

## Boundary

The skill accepts one invocation only: `/review-this #<spec>`. It discovers the current review wave and runs once from the control workspace; it does not implement tickets or create worktrees. It never merges without green required checks, resolved confirmed findings, a clean local review, and an unchanged reviewed head SHA. It never closes a ticket before merge. State and adapter boundaries in `discovery.ts`, `reconciliation.ts`, `adapters.ts`, and the packaged `workflow-state.ts` remain callable by a future persistent coordinator without changing command behavior.
