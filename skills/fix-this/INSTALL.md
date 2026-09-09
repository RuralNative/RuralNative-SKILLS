# Installing fix-this

`fix-this` finalizes exactly one reviewed pull request in the current checkout. Invoke it explicitly as `/fix-this <target>` where `<target>` is one pull-request number (`285` or `#285`) or one same-repository pull-request URL. Unlike `/review-this`, an issue number never resolves through a closing PR here: the invocation names the PR to finalize.

The run consumes only a validated `review-handoff-v1` block from the latest completed non-dismissed native review. It applies every published blocking and advisory finding, resolves merge conflicts, runs mandatory local verification, squash-merges into `main`, and completes ticket/spec bookkeeping. It never generates another review verdict, never waits for or gates on CI status, never bypasses branch protection, and never force-pushes. GitHub server restrictions stay authoritative: a rejected merge is reported, not overridden.

## Requirements

- A GitHub repository with native sub-issue and `blocked_by` relationships linking child tickets to their parent specification.
- Node 24 or newer: the bundled `workflow-cli.mjs` (evidence and fix-progress checks) ships in this package next to the shared `workflow-state.ts` and fails closed on older runtimes.
- One open non-draft pull request against `main` with a valid `Closes #<ticket>` reference, or a merged PR resuming bookkeeping through a reconciled `fix-progress-v2` checkpoint.
- One completed native review published by the updated `review-this` carrying exactly one valid `review-handoff-v1` block. Legacy prose-only reviews need one publication by the updated reviewer before first use.
- `/unslopify` installed through its registry lane: `npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`.
- A clean invoking checkout at the reviewed PR head (or at the checkpoint's resulting head on resume). Branch aliases, `main`, and detached `HEAD` at the same commit are accepted; `main` and detached `HEAD` create a feature branch before edits.
- Tracked project permissions in `.kilo/kilo.jsonc` require no `agent_manager` entry. No fix subagent is used.

## Install

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill fix-this
```

Manual fallback:

Check whether the destination folder already exists first: `cp -r` replaces it silently, and overwriting an existing `fix-this` install requires the user's explicit approval. Then copy from a clone of the repository:

```bash
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
cp -r skills/fix-this ~/.agents/skills/fix-this
```

Install or upgrade `review-this` from the same verified revision at the same time: the producer and consumer share the `review-handoff-v1` contract. Editing this repository does not update installed copies automatically; verify the path the target project actually loads.

## Verification

From the clean checkout at the reviewed PR head, after the review published its handoff:

```
/fix-this #285
```

The skill resolves PR #285, validates the handoff and provenance against the current requirements revision (canonical and adapted alike) and policy, applies all findings, merges the current base when needed, runs local verification, updates implementation evidence, squash-merges with the expected head constraint, confirms the merge commit, closes the implementation ticket, promotes eligible dependents, closes the parent only when complete, and stops. A newer malformed workflow review never falls back to an older report. Reruns resume from the `fix-progress-v2` checkpoint without repeating verified commits; a confirmed merged PR resumes bookkeeping only, and a legacy `fix-progress-v1` checkpoint stays diagnostic input.

Repository checks run via:

```bash
npm run verify
```

## Boundary

The skill finalizes one pull request per invocation. It does not plan, implement fresh tickets, review code, poll CI, manage workers or worktrees, mutate forks, rebase published history, delete branches, close unmerged PRs, clear `needs-info`, download skills, or start the next ticket. It does not schedule releases.

## Source provenance and trust

Installing this skill is a trust decision in its source repository, `RuralNative/RuralNative-SKILLS`. Record provenance for what you install: note the resolved commit the registry CLI reports, or pin the revision you reviewed where the installer accepts a ref.

Provenance and pinning narrow what can change under you; they do not remove the residual trust in the source repository. Pinning reviewed revisions addresses that exposure, the findings have not gone away, and the underlying repository trust remains yours to make.

Workflow runs perform no skill downloads: once installed, `/fix-this` never fetches, clones, or installs skills mid-run. Manual installs must not overwrite an existing `fix-this` folder without the user's explicit approval.
