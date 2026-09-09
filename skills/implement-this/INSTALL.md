# Installing implement-this

`implement-this` implements exactly one GitHub ticket in the current checkout and delivers one pull request. Use:

- `/implement-this #<n>` for one ticket.

Bare (`155`) and hash (`#155`) forms normalize identically before any GitHub read or write. Multiple references, parent specifications, pull requests, malformed input, and cross-repository targets stop before any mutation.

The run works only in the invoking checkout: it requires a clean worktree, creates the feature branch in that checkout when invoked from `main` (stopping with a switch instruction when the branch already exists), otherwise reuses the current feature branch, implements directly with focused tests, and opens or updates one pull request through an ordered, read-back-verified delivery. It never calls Agent Manager, creates or removes a worktree, polls a worker, manages capacity, or reads Agent Manager state. A `ready-for-human` ticket with exactly one verified matching open PR may repair delivery; anything ambiguous stops.

Each ticket carries an `ordinary` or `high-risk` class from planning. The compact evidence block carries the ticket's acceptance criteria by stable local ID, the focused command, output, and explicit passing status per active behavioral criterion, the defect-specific RED for bug fixes, the narrow rationale for non-behavior criteria, and the versioned requirements revision. Evidence matches criteria by ID, never by full sentence text, a retired ID is never accepted as active evidence, and a checked checkbox is never proof. The requirements revision is `requirements-v1` for canonical bodies and `requirements-adapted-v1` for alternate-template bodies resolved via `resolveRequirementsBody` (whole-body fingerprint with blank structure preserved, only validated evidence blocks excluded); publication compares the current bodies against the pinned value, and a body change stops delivery with `needs-info` until the body is reconciled and the user resumes. The run resolves the orientation set for its affected seams in the checkout before broad documentation loading and records the compact durable summary — task band, resolved bytes, source count, cache-gap state. No fallback reads every leaf, ADR, policy, or derived human documentation tree.

## Requirements

- A GitHub repository with an issue tracker and native sub-issue plus `blocked_by` relationships for parent and dependency state.
- Node 24 or newer: the bundled validators `workflow-cli.mjs` (requirements and evidence checks) ship in this package next to the shared `workflow-state.ts` and fail closed on older runtimes.
- `/unslopify` installed through its own registry lane for prose quality.
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

The skill validates `#100` before any claim, requires a clean checkout, creates or reuses the feature branch in that checkout, loads `/unslopify`, implements directly with focused checks, and opens or updates one pull request against `main` whose body carries `Closes #100` plus the compact evidence block in the same publication operation, verified by read-back. It removes `ready-for-agent` and adds `ready-for-human` only after that verification.

## Boundary

The skill accepts one implementation issue per invocation. It does not run parent specifications, multiple tickets, pull requests, worker orchestration, or the full repository gate. It does not merge pull requests, close tickets before merge, or choose models.

## Source provenance and trust

Installing this skill is a trust decision in its source repository, `RuralNative/RuralNative-SKILLS`. Record provenance for what you install: note the resolved commit the registry CLI reports, or pin the revision you reviewed where the installer accepts a ref.

Provenance and pinning narrow what can change under you; they do not remove the residual trust in the source repository. Pinning reviewed revisions addresses that exposure; the findings have not gone away and the underlying repository trust remains yours to make.

Workflow runs perform no skill downloads: once installed, `/implement-this` never fetches, clones, or installs skills mid-run. Installing dependencies with `npm ci` inside a run stays allowed. Manual installs must not overwrite an existing `implement-this` folder without the user's explicit approval.
