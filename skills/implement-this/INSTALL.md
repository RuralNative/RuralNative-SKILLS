# Installing implement-this

`implement-this` implements exactly one GitHub ticket in the current checkout and delivers one pull request. Use:

- `/implement-this #<n>` for one ticket.

Bare (`155`) and hash (`#155`) forms normalize identically before any GitHub read or write. Multiple references, parent specifications, pull requests, malformed input, and cross-repository targets stop before any mutation.

The run works only in the invoking checkout: it requires a clean worktree, creates the feature branch in that checkout when invoked from `main`, otherwise reuses the current feature branch, runs `/implement` directly, proves active behavioral criteria with focused passing tests (bug fixes add a defect-specific RED), and opens or updates one pull request. It never calls Agent Manager, creates or removes a worktree, polls a worker, manages capacity, or reads Agent Manager state.

Each ticket carries an `ordinary` or `high-risk` class from planning. The compact evidence block carries the ticket's acceptance criteria by stable local ID, the focused command, output, and explicit passing status per active behavioral criterion, the defect-specific RED for bug fixes, the narrow rationale for non-behavior criteria, and the versioned requirements revision. Evidence matches criteria by ID, never by full sentence text, and a retired ID is never accepted as active evidence. The requirements revision is a SHA-256 fingerprint of the normalized authoritative parent and ticket body sections; publication compares the current bodies against the pinned value, and a body change stops delivery with `needs-info` until the body is reconciled and the user resumes. The run resolves the orientation set for its affected seams in the checkout before broad documentation loading and records the compact durable summary — task band, resolved bytes, cap, source count, cache-gap state. No fallback reads every leaf, ADR, policy, or derived human documentation tree.

## Requirements

- A GitHub repository with an issue tracker and native sub-issue plus `blocked_by` relationships for parent and dependency state.
- `/implement` and `/unslopify` installed through their own registry lanes.
- A clean invoking checkout where the feature branch may be created or reused.
- Tracked project permissions in `.kilo/kilo.jsonc` require no `agent_manager` entry; `task` keeps its existing approval posture. `.kilo/agent-manager.json` is never edited.

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

Run the ticket's smallest sufficient focused checks. The full repository gate never runs here; broad verification belongs to equivalent required CI at review.

## Verify a one-ticket run

> /implement-this #100

The skill validates `#100` before any claim, requires a clean checkout, creates or reuses the feature branch in that checkout, loads `/unslopify`, runs `/implement`, verifies the work with focused checks, and opens or updates one pull request against `main` whose body carries `Closes #100` plus the compact evidence block in the same publication operation. It removes `ready-for-agent` and adds `ready-for-human`.

## Boundary

The skill accepts one implementation issue per invocation. It does not run parent specifications, multiple tickets, pull requests, worker orchestration, or the full repository gate. It does not merge pull requests, close tickets before merge, or choose models.

## Source provenance and trust

Installing this skill is a trust decision in its source repository, `RuralNative/RuralNative-SKILLS`. Record provenance for what you install: note the resolved commit the registry CLI reports, or pin the revision you reviewed where the installer accepts a ref. `/implement` arrives through its own lane from its own repository; pin the reviewed revision of that dependency where its installer supports it too.

Provenance and pinning narrow what can change under you; they do not remove the residual trust in the source repository. Pinning reviewed revisions addresses that exposure; the findings have not gone away and the underlying repository trust remains yours to make.

Workflow runs perform no skill downloads: once installed, `/implement-this` never fetches, clones, or installs skills mid-run. Installing dependencies with `npm ci` inside a run stays allowed. Manual installs must not overwrite an existing `implement-this` folder without the user's explicit approval.
