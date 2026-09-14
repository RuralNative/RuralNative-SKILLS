# Installing review-this

`review-this` reviews exactly one pull request in the current checkout and publishes the findings. Invoke it explicitly as `/review-this <target>` where `<target>` is one pull-request number, one pull-request URL, one issue number, or one issue URL that resolves to exactly one open pull request — bare numbers (`100`) and hash numbers (`#100`) normalize to the same repository number. Parent specifications, ambiguous mappings, multiple targets, and cross-repository targets stop before any write.

Review runs on a clean current checkout at the selected pull-request head commit.
The installed preparation helper automatically preserves dirty local work in a
verified recoverable Git snapshot, then automatically aligns a different commit
to the pinned head in detached `HEAD`. It moves no local branch, runs no checkout
hook, and creates no worktree (ADR-0036, narrowed by ADR-0041). A branch alias,
the pinned default branch, or detached `HEAD` at the same commit matches. The
checkout stays at the reviewed commit for `/fix-this`; saved edits stay recoverable
under their recorded identity and original checkout, never applied onto the PR.
Unknown Git operations, ignored-file collisions, unsafe preservation, and denied
permissions remain restrictions. Ordinary dirty entry needs no manual cleanup.

The skill runs one frontier Standards-plus-Spec pass, publishes the review and
verified inline findings, and stops. It never applies source fixes, commits,
pushes, merges, updates labels, promotes dependents, or closes tickets. The only
PR-body write is the scoped evidence-repair helper replacing one validated region
with provenance (ADR-0039). It never calls Agent Manager, creates or removes a
worktree, manages workers, runs cloud review, or reads Agent Manager state.

Every bundle includes `recovery.md`. Recoverable helper errors and interrupted
publication resume within the same authorized stage; the agent preserves actual
receipts and reconciles native state before retrying an uncertain write. A reproduced
helper defect may receive one isolated run-local correction per observed cause and
operation with helper-observed regression receipts and unchanged guards; shared
installs stay unchanged. A new session still needs a human instruction naming or resuming the target.

## Requirements

- A GitHub repository with native sub-issue and `blocked_by` relationships linking child tickets to their parent specification.
- One open pull request against the pinned default branch with a native closing reference to exactly one ticket (observed through `closingIssuesReferences` with full repository identity), current head and base SHAs, and compact or legacy implementation evidence.
- Node 24 or newer: the bounded `prepare-review.mjs` entry point, the review-only `publish-review.mjs` entry point, the read-only `github-facts.mjs` native reads, and the read-only `workflow-cli.mjs` checks ship in this package next to the shared `workflow-state.ts` and `github-facts.ts` and fail closed on older runtimes.
- `/unslopify` installed through its registry lane: `npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`.
- Tracked project permissions in `.kilo/kilo.jsonc` carry the least-privilege `agent.review-this` definition and require no `agent_manager` entry. No fix subagent is used. Command permissions are not an OS sandbox; the helpers enforce their own argument allowlists.

## Review policy (optional)

`REVIEW.md` is optional project guidance. An existing readable root `REVIEW.md` supplies additional project rules without relaxing skill safety boundaries and is never rewritten by this run. When it is absent, skill-owned workflow defaults govern and review continues. Policy authority resolves from the pinned base; head-only additions, removals, and relaxations are reviewable violations with blocking findings, and verified owner decisions supply only their named repository-local exceptions. Inaccessible, ambiguous, and contradictory authority, unreadable files, and symlink paths stop with a diagnostic and create nothing. Policy revisions publish as the single-line `review-policy-v1` carrier.

## Install

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill review-this
```

Manual fallback:

Copying to `~/.agents/skills/review-this/` alone is insufficient for this
session's registry: discover the active skill root on installation rather than
asserting universal precedence, and install every changed workflow bundle the
shared contract needs (including `review-this` and `fix-this`) into its
existing discovered roots. Do not copy unrelated skills and do not create new
commands or agents in legacy directories.

Check whether the destination folder already exists first: `cp -r` replaces it silently, and overwriting an existing `review-this` install requires the user's explicit approval. Then copy from a clone of the repository:

```bash
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
# Discover the active root first (for example ~/.agents/skills vs ~/.kilocode/skills),
# then copy each changed bundle into its existing root:
cp -r skills/review-this <active-root>/review-this
cp -r skills/fix-this <active-root>/fix-this
```

Verify with the read-only check (explicit roots, safe in CI fixture homes):

```bash
node skills/review-this/install-check.mjs --source skills/review-this --install <active-root>/review-this
```

Synchronize the active installation with the repo-owned path instead of
hand-editing prompts: it copies only Review This bundles, renders the agent
definition from the canonical tracked configuration, and keeps a rollback
backup before replacing anything (ADR-0042).

```bash
node scripts/sync-review-this.mjs --skill-dest <active-root>/review-this --agent-dest <config-dir>/agent/review-this.md --command-dest <config-dir>/command/review-this.md
node scripts/sync-review-this.mjs --skill-dest <active-root>/review-this --agent-dest <config-dir>/agent/review-this.md --command-dest <config-dir>/command/review-this.md --apply
```

## Source provenance and trust

Installing this skill is a trust decision in its source repository, `RuralNative/RuralNative-SKILLS`. Record provenance for what you install: note the resolved commit the registry CLI reports, or pin the revision you reviewed where the installer accepts a ref.

Provenance and pinning narrow what can change under you; they do not remove the residual trust in the source repository. Pinning reviewed revisions addresses that exposure, the findings have not gone away, and the underlying repository trust remains yours to make.

Workflow runs perform no skill downloads: once installed, `/review-this` never fetches, clones, or installs skills mid-run. Installation stays a user step outside the run. Manual installs must not overwrite an existing `review-this` folder without the user's explicit approval.

## Verification

From the invoking checkout of the repository, after implementation has delivered:

```
/review-this #100
```

The skill resolves the single target, aligns a clean checkout to the pinned head commit when needed, resolves governing policy from pinned base objects with verified owner exceptions, inspects verification commands before running project code, recovers scoped evidence through the observation-based `recover-evidence` write (`repair-record` only inspects an existing attempt) or local prerequisites with one attempt per failure class (same-version and supported legacy pins only after full revalidation; checks established from the pinned configuration with a complete receipt for the observed verification intent and every active criterion; frozen installs only; compatible runtimes only), rechecks readiness, runs one frontier Standards-plus-Spec pass, reads required checks once, publishes the pinned review and verified inline findings, and stops. A missing policy continues under skill-owned defaults; pending CI publishes the pinned review and stops; an interrupted submit resumes the same verified review once; a later invocation reuses it when head, base, requirements revision, and review-policy revision are unchanged.

Repository checks run via:

```bash
npm run verify
```

## Boundary

The skill accepts one invocation only: `/review-this <target>` with one pull request or one issue resolving to one pull request. It does not implement tickets, apply source fixes, approve exceptions, run parent-specification waves, create worktrees, manage workers, run cloud review, poll CI, run post-merge verification, or run whole-spec review. It never edits pull-request source, commits, pushes, merges, updates labels, promotes dependents, or closes tickets, and it creates no repository files. The only pull-request body write is the scoped evidence-repair helper; source fixes and approval decisions stay outside this run.
