# Installing review-this

`review-this` owns one pull-request review wave for a parent specification. Invoke it explicitly as `/review-this <target>` where `<target>` is a parent specification, a child issue, a pull request, or their full URLs — bare numbers (`100`) and hash numbers (`#100`) normalize to the same repository number. The skill resolves the target to its exact GitHub object and pull-request set before any write, discovers native child tickets, linked pull requests, blockers, checks, reviews, and current head and base SHAs, starts each review as soon as its implementation evidence exists, and keeps one persistent PR worktree and worker through review, fixes, rereviews, final verification, merge, or terminal stop. It reconciles Kilo cloud review with the local Standards and Spec review against each current revision, routes fixes, squash-merges clean heads, promotes newly unblocked dependents, and closes the specification when final verification passes.

## Requirements

- A GitHub repository with native sub-issue and `blocked_by` relationships linking child tickets to their parent specification.
- Open pull requests for the current wave, each against `main` with a closing reference `Closes #<ticket>` and current head and base SHAs.
- `/code-review` installed through its own lane. It is not published by this shelf; install it from its own source before using `review-this`. It carries no `disable-model-invocation` lock and stays model-invocable.
- `/unslopify` installed through its registry lane: `npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`.
- Tracked project permissions in `.kilo/kilo.jsonc` allow `agent_manager` (`agent_manager: allow`) and require explicit user approval for `task` (`task: ask`), so the persistent Agent Manager PR worktree is created before any nested Standards, Spec, or fix `Task` subagents, and those nested `Task` contexts run only after approval; `.kilo/agent-manager.json` is never edited.

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

The skill discovers the current review wave, creates or reuses one persistent PR worktree, collects Kilo cloud summary and inline comments for the current head and base when available (recording `unavailable` when disabled, absent, failed, or timed out without blocking a complete local review), runs fresh Standards and Spec sub-agents in parallel for the initial full review, uses delta review for later revisions unless a named risk trigger escalates it, and keeps strict category statuses and stable finding evidence. Confirmed findings use one fresh fix context in the same worktree per round, with at most two code-fix rounds; safe advisories join a blocking batch, while advisory-only findings receive a reasoned deferral. A trusted summary is updated once per revision with machine-readable timings and verified inline comments; publication failure stops fixes and merge. A final-verification repair consumes an available fix round and receives delta or escalated rereview, never a third round. The skill rejects duplicate, stale, out-of-scope, and unverified findings, invalidates previous verdicts when either the head or base SHA changes, squash-merges only after exact-revision gates pass, promotes only dependents whose final blocker closed (`unblocked` plus `ready-for-agent`, `blocked` removed), and on the penultimate wave tells you to run `implement-this #<spec>` for the next wave. When every child ticket closes, it checks updated `main` with the one planned `npm run verify` and a whole-spec Standards and Spec review, creates the smallest independently verifiable native child ticket for a confirmed integration defect while keeping the parent open, and closes the parent only when all gates pass.

Repository checks run via:

```bash
npm run verify
```

## Three-ticket Kilo smoke

Run three ordinary tickets through independent `/implement-this` and
`/review-this` sessions on Kilo after the targeted tests and repository gate
are green. Record one machine-readable timing object per ticket from durable
reservation through merge or terminal stop:

```json
{"ticket":101,"riskClass":"ordinary","reservationToTerminalMs":0,"phases":{"fixes":0,"delta-review":0,"final-verification":0},"gatesGreen":true}
```

The smoke passes when the ordinary-ticket median is at most 60 minutes, no
ordinary ticket exceeds 90 minutes, and every correctness gate is green.

## Boundary

The skill accepts one invocation only: `/review-this <target>`, where the target is a parent specification number, a child issue number, a pull-request number or URL for the current repository; cross-repository targets stop before writes unless explicitly chosen. It resolves the target before any worktree creation or GitHub write, discovers the current review wave, and runs once from the control workspace; it does not implement tickets. It creates or reuses only the one persistent PR worktree for each selected pull request and never creates a separate review or fix worktree. It never merges without green required checks, resolved confirmed findings, a clean local review, unchanged reviewed head and base SHAs, and a published trusted summary, and it never auto-merges a pull request without an originating specification. It never closes a ticket before merge. State and adapter boundaries in `targets.ts`, `discovery.ts`, `reconciliation.ts`, `adapters.ts`, `review-session.ts`, and the packaged `workflow-state.ts` remain callable by a future persistent coordinator without changing command behavior.
