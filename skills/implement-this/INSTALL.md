# Installing implement-this

`implement-this` implements exactly one GitHub ticket in the current checkout and delivers one pull request. Use:

- `/implement-this #<n>` for one ticket.

Bare (`155`) and hash (`#155`) forms normalize identically before any GitHub read or write. Multiple references, parent specifications, pull requests, malformed input, and cross-repository targets stop before any mutation.

The run works only in the invoking checkout. It pins the repository default
branch with `node github-facts.mjs`, creates or safely switches to the verified
ticket branch, implements with focused tests, and opens or updates one PR through
read-back-verified delivery. Interrupted work resumes after comparing recorded
target, revisions, exact paths, and content digests. A dirty tree alone does not
require restarting; unrelated edits must be preserved before a necessary switch.
The bundled `recovery.md` defines operational recovery and proof retention.
It never calls Agent Manager, creates or removes a worktree, polls a worker,
manages capacity, or reads Agent Manager state. A `ready-for-human` ticket with
exactly one verified matching open PR may repair delivery; ambiguity still stops.

Each ticket carries an `ordinary` or `high-risk` class from planning. The compact evidence block carries the ticket's acceptance criteria by stable local ID, the focused command, output, and explicit passing status per active behavioral criterion, the defect-specific RED for bug fixes, the narrow rationale for non-behavior criteria, and the versioned requirements revision. Evidence matches criteria by ID, never by full sentence text, a retired ID is never accepted as active evidence, and a checked checkbox is never proof. The requirements revision is `requirements-v1` for canonical bodies and `requirements-adapted-v1` for alternate-template bodies resolved via `resolveRequirementsBody` (whole-body fingerprint with blank structure preserved, only validated evidence blocks excluded); publication compares the current bodies against the pinned value, and a body change stops delivery with `needs-info` until the body is reconciled and the user resumes. The run resolves the orientation set for its affected seams in the checkout before broad documentation loading and records the compact durable summary — task band, resolved bytes, source count, cache-gap state. No fallback reads every leaf, ADR, policy, or derived human documentation tree.

## Requirements

- A GitHub repository with an issue tracker and native sub-issue plus `blocked_by` relationships for parent and dependency state.
- Node 24 or newer: the bundled validators `workflow-cli.mjs` (requirements and evidence checks) and read-only `github-facts.mjs` native reads ship in this package next to the shared `workflow-state.ts` and `github-facts.ts` and fail closed on older runtimes.
- `/unslopify` installed through its own registry lane for prose quality.
- An invoking checkout where local work can be verified or safely preserved before branch preparation.
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

Native hosts: `/implement-this #<n>` where slash commands exist; `$implement-this` or native skill selection in Codex with `agents/openai.yaml` denying implicit invocation; `.claude/skills/implement-this/SKILL.md` for Claude Code (a supported symlink may share the bundle). Live host checks are NOT VERIFIED. On OpenCode, prefer skill selection with the ticket reference supplied outside slash-command arguments when the release preprocesses slash arguments; the separate-message route is a candidate, not certified literal. No `/implement` delegation exists.

## Verification

Run the ticket's smallest sufficient focused checks. The full repository gate never runs here; broad verification belongs to equivalent required CI at review.

## Verify a one-ticket run

> /implement-this #100

The skill validates `#100`, reconciles local work, pins the default branch with
`node github-facts.mjs`, and creates or reuses the verified feature branch. It
implements with focused checks and opens or updates one PR against that default
branch. The body carries `Closes #100` and compact evidence in the same operation,
verified by read-back. It removes `ready-for-agent` and adds `ready-for-human`
only after verification. Resume performs missing steps without duplicate commits
or PRs and retains the original authorization unless the human changes it.

## Boundary

The skill accepts one implementation issue per invocation. It does not run parent specifications, multiple tickets, pull requests, worker orchestration, or the full repository gate. It does not merge pull requests, close tickets before merge, or choose models.

## Source provenance and trust

Installing this skill is a trust decision in its source repository, `RuralNative/RuralNative-SKILLS`. Record provenance for what you install: note the resolved commit the registry CLI reports, or pin the revision you reviewed where the installer accepts a ref.

Provenance and pinning narrow what can change under you; they do not remove the residual trust in the source repository. Pinning reviewed revisions addresses that exposure; the findings have not gone away and the underlying repository trust remains yours to make.

Workflow runs perform no skill downloads: once installed, `/implement-this` never fetches, clones, or installs skills mid-run. Installing dependencies with `npm ci` inside a run stays allowed. Manual installs must not overwrite an existing `implement-this` folder without the user's explicit approval.
