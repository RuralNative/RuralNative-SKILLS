# Installing review-this

`review-this` reviews exactly one pull request in the current checkout. Invoke it explicitly as `/review-this <target>` where `<target>` is one pull-request number, one pull-request URL, one issue number, or one issue URL that resolves to exactly one open pull request — bare numbers (`100`) and hash numbers (`#100`) normalize to the same repository number. Parent specifications, ambiguous mappings, multiple targets, and cross-repository targets stop before any write.

The skill requires the current checkout to match the selected pull-request head. It runs one frontier Standards-plus-Spec pass in-session, reports both checklists separately, applies at most one automatic fix round through the optional configured `review-fixer` subagent, reads required CI once without polling, squash-merges clean heads, promotes only direct dependents identified by captured native edges, and closes the parent only from a complete child enumeration where all children are closed. It never calls Agent Manager, creates or removes a worktree, manages workers, runs cloud review, or reads Agent Manager state.

## Requirements

- A GitHub repository with native sub-issue and `blocked_by` relationships linking child tickets to their parent specification.
- One open pull request against `main` with a closing reference `Closes #<ticket>`, current head and base SHAs, and compact or legacy implementation evidence.
- `/unslopify` installed through its registry lane: `npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`.
- Tracked project permissions in `.kilo/kilo.jsonc` require no `agent_manager` entry. The optional fix round uses the `task` tool posture already tracked there; `.kilo/agent-manager.json` is never edited.

## Optional fix agent

Auto-fix capability is optional. A clean review never requires the subagent. If blocking findings exist and `review-fixer` is unavailable, the skill publishes the findings and stops without using the frontier model as an implicit fixer.

To enable fixes, create a Kilo subagent named `review-fixer` and set its model to a cheaper configured model:

1. Copy the repository definition at `.kilo/agent/review-fixer.md` into the consumer project (project scope `.kilo/agent/review-fixer.md` or user scope `~/.config/kilo/agent/review-fixer.md`).
2. Set its `model` frontmatter to the cheap model, or use the project agent override for `review-fixer`.
3. Keep its permissions narrow: every edit and focused test command requires approval. It must not commit, push, publish verdicts, merge, label, promote, or close.

The skill never selects a model through Agent Manager. The frontier reviewer sends only confirmed finding IDs, exact file and line evidence, permitted affected seams, and focused test commands, then rereads changed regions, rejects unrelated edits, and remains the only actor that commits or pushes.

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

From the checkout matching the pull-request head, after implementation has delivered:

```
/review-this #100
```

The skill resolves the single target, validates checkout match, evidence, and requirements revision, runs one frontier Standards-plus-Spec pass, optionally applies one configured fix round with one delta review, reads required checks once, and squash-merges only after exact-revision gates pass. Pending CI publishes the pinned verdict and stops; a later invocation reuses it when head, base, requirements revision, and review-policy revision are unchanged. It promotes only dependents whose final blocker closed and closes the parent only when every child is closed.

Repository checks run via:

```bash
npm run verify
```

## Boundary

The skill accepts one invocation only: `/review-this <target>` with one pull request or one issue resolving to one pull request. It does not implement tickets, run parent-specification waves, create worktrees, manage workers, run cloud review, poll CI, run post-merge verification, or run whole-spec review. It never merges without green required checks or the approved fallback, resolved confirmed findings, a clean review, unchanged reviewed head and base, and a published verdict, and it never closes a ticket before merge.
