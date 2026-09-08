# Installing review-this

`review-this` reviews exactly one pull request in the current checkout and publishes the findings. Invoke it explicitly as `/review-this <target>` where `<target>` is one pull-request number, one pull-request URL, one issue number, or one issue URL that resolves to exactly one open pull request — bare numbers (`100`) and hash numbers (`#100`) normalize to the same repository number. Parent specifications, ambiguous mappings, multiple targets, and cross-repository targets stop before any write.

The skill requires a clean current checkout at the selected pull-request head commit. Local branch names are informational: a branch alias, `main`, or detached `HEAD` at the same commit matches. A clean checkout at a different commit automatically aligns: the run fetches the verified pull-request head ref, confirms the fetched commit equals the pinned head SHA, and switches this checkout to that exact commit in detached `HEAD` without moving local branches, running checkout hooks, or creating a worktree (ADR-0036). The checkout stays at the reviewed commit for `/fix-this`. A dirty worktree, an unfinished merge, rebase, cherry-pick, or revert, an ignored-file collision, a fetch or checkout failure, or a denied permission stops the run with no checkout change. It runs one frontier Standards-plus-Spec pass in-session, reports both checklists separately, publishes the review and verified inline findings to the pull request, and stops. It never applies fixes, commits, pushes, merges, updates the pull-request body, updates labels, promotes dependents, or closes tickets. It never calls Agent Manager, creates or removes a worktree, manages workers, runs cloud review, or reads Agent Manager state.

## Requirements

- A GitHub repository with native sub-issue and `blocked_by` relationships linking child tickets to their parent specification.
- One open pull request against `main` with a closing reference `Closes #<ticket>`, current head and base SHAs, and compact or legacy implementation evidence.
- `/unslopify` installed through its registry lane: `npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`.
- Tracked project permissions in `.kilo/kilo.jsonc` require no `agent_manager` entry. No fix subagent is used.

## Review policy (optional)

`REVIEW.md` is optional project guidance. An existing readable root `REVIEW.md` supplies additional project rules without relaxing skill safety boundaries and is never rewritten by this run. When it is absent, skill-owned workflow defaults govern and review continues. An unreadable file, a symlink path, or conflicting sources stops with a diagnostic and creates nothing.

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

Installing this skill is a trust decision in its source repository, `RuralNative/RuralNative-SKILLS`. Record provenance for what you install: note the resolved commit the registry CLI reports, or pin the revision you reviewed where the installer accepts a ref.

Provenance and pinning narrow what can change under you; they do not remove the residual trust in the source repository. Pinning reviewed revisions addresses that exposure, the findings have not gone away, and the underlying repository trust remains yours to make.

Workflow runs perform no skill downloads: once installed, `/review-this` never fetches, clones, or installs skills mid-run. Installation stays a user step outside the run. Manual installs must not overwrite an existing `review-this` folder without the user's explicit approval.

## Verification

From any clean checkout of the repository, after implementation has delivered:

```
/review-this #100
```

The skill resolves the single target, validates evidence and requirements revision, aligns a clean checkout to the pinned head commit when needed, then validates the strict checkout match, decides the review-policy path, runs one frontier Standards-plus-Spec pass, reads required checks once, publishes the pinned review and verified inline findings, and stops. A missing policy continues under skill-owned defaults; pending CI publishes the pinned review and stops; a later invocation reuses it when head, base, requirements revision, and review-policy revision are unchanged.

Repository checks run via:

```bash
npm run verify
```

## Boundary

The skill accepts one invocation only: `/review-this <target>` with one pull request or one issue resolving to one pull request. It does not implement tickets, apply fixes, run parent-specification waves, create worktrees, manage workers, run cloud review, poll CI, run post-merge verification, or run whole-spec review. It never edits pull-request source, commits, pushes, merges, updates the pull-request body, updates labels, promotes dependents, or closes tickets, and it creates no repository files.
