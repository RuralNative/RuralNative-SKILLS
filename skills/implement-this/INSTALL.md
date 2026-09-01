# Installing implement-this

`implement-this` runs one GitHub ticket, several ready tickets, or one parent specification through isolated ticket workers, and every ticket delivers by pull request. Use:

- `/implement-this #<n>` for one ticket.
- `/implement-this #<n1> #<n2> [#<n3>]` for an explicit set of ready tickets.
- `/implement-this #<spec>` for a parent specification; it selects up to three current frontier tickets in native child order.

Bare (`155`) and hash (`#155`) forms are equivalent and normalize identically before any GitHub read or write.

The command session manages workers instead of writing ticket code: every run, including a single-ticket run, dispatches one isolated worktree and one worker session per ticket. In Kilo Code this is the `agent_manager` tool in worktree mode, one independent task and one initial prompt per ticket. Every worker pushes its feature branch and opens one pull request against `main`; no path pushes directly to `main`.

Each published ticket carries an `ordinary` or `high-risk` class from planning. Ordinary work targets 60 minutes from durable reservation to merge or terminal stop; high-risk work targets 90 minutes. A compact dispatch packet carries the class, revisions, affected seams, acceptance criteria, settled decisions, and the versioned requirements revision. Acceptance criteria travel as records carrying their stable local ID, text, and active or retired status; evidence matches criteria by ID, never by full sentence text, and a retired ID is never accepted as active evidence. The requirements revision is a SHA-256 fingerprint of the normalized authoritative parent and ticket body sections; the worker and review wave carry the same value, and a body change stops delivery and review with `needs-info` until the body is reconciled and the user resumes. The worker resolves the orientation set for its affected seams in the checkout before broad documentation loading, records the compact durable summary — task band, resolved bytes, cap, source count, cache-gap state — with the existing timing and acceptance evidence, measures setup and orientation phases, compares dependency manifests after checkout, keeps a separate `node_modules`, records affected-test evidence for implementation and review-fix iteration, and hands the final timing summary to review. SLO misses record their cause and never bypass a safety gate. A direct ticket with valid affected seams follows the same bounded path as a planned ticket; a ticket without valid seam metadata receives one resolution attempt against the compact architecture index and code roots, and ambiguity adds `needs-info` and stops before edits. No implementation fallback reads every leaf, ADR, policy, or derived human documentation tree.

## Requirements

- A GitHub repository with an issue tracker and native sub-issue plus `blocked_by` relationships for parent and dependency state.
- `/implement` and `/unslopify` installed through their own registry lanes.
- For every run, a host that provides both an isolated git worktree and a targeted worker session per ticket. Execution stops before any claim or edit when isolation is unavailable.
- For Kilo dispatch, the `agent_manager` tool with worktree mode, so managed worktrees sit under the Agent Manager worktree location.
- Tracked project permissions in `.kilo/kilo.jsonc` allow `agent_manager` (`agent_manager: allow`) and require explicit user approval for `task` (`task: ask`), so dispatch is automatic and outer or nested `Task` subagents run only after approval; `.kilo/agent-manager.json` is never edited.

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

The skill validates `#100` against the frontier before any claim, reserves it with an assignee, and dispatches one isolated worker through `agent_manager` worktree mode — the same path a parent run uses; there is no inline fallback. The worker loads `/unslopify`, runs `/implement`, verifies the work, pushes the feature branch, opens a pull request against `main` whose body carries `Closes #100`, posts acceptance-criterion evidence on the ticket, removes `ready-for-agent`, and adds `ready-for-human`.

## Verify an explicit multi-ticket run

```bash
/implement-this #101 #102 #103
```

Every listed ticket is validated first; the run stops before any claim or edit if a ticket is closed, blocked, assigned, outside the parent, missing `ready-for-agent`, or duplicated. Before spawning, the command session reads Agent Manager's overview and counts unfinished managed workers: at most three implementation workers run at once, at most four managed workers stay active across the workspace, and unrelated active workers consume that global capacity. Each ticket gets its own worktree and pull request.

## Verify a parent-specification run

```bash
/implement-this #99
```

Where `#99` is the parent specification, the skill takes up to three current frontier tickets from its open children in native child order and dispatches them like an explicit set. While it runs, it recomputes the frontier whenever a ticket, blocker, pull request, or follow-up child changes and fills free slots up to both caps.

A failed worker gets one reconciled retry that reuses existing branches, sessions, and pull requests; a second failure adds `needs-info` to that ticket and stops work on it, keeping the worker session and its worktree for diagnosis. When all bounded tickets have open pull requests with evidence posted, the run ends by telling you to review from the control workspace with `/review-this #<spec>`; ticket worktrees do not run review.

A checkpoint ends the command turn without stopping any worker, and workers never call Agent Manager stop or close. Only the command session may clean up, and only after the exact recovery gate: terminal success, a clean worktree, one matching local/remote/PR head SHA, and durable pull-request evidence. Current Kilo chat cannot close a managed worktree, so stopped, remotely recoverable finished worktrees are reported as `cleanup-pending`; nothing is deleted behind Agent Manager and `.kilo/agent-manager.json` is never edited. If a session is missing while its worktree remains, the run reports `recovery-required` and does not duplicate or delete it.

## Kilo VS Code smoke run

One documented smoke run proves visible isolation on Kilo Code's VS Code extension:

1. Pick a parent specification with at least two frontier-ready child tickets (open, unassigned, `ready-for-agent`, no open blockers).
2. From one command session in the repo root, run `/implement-this #<spec>`.
3. Open the Agent Manager panel during dispatch. Expect two independent managed worktrees under `.kilo/worktrees/` and two running sessions — one per ticket — created by one parent command session.
4. Confirm each session received exactly one initial prompt (its rendered template) and works in its own worktree; the command session itself edits no ticket code.
5. After delivery, confirm one open pull request per ticket with a valid closing reference and posted evidence. Confirm worker sessions and worktrees are still present before cleanup eligibility, that any unclosable worktree is reported as `cleanup-pending` rather than deleted, and that nothing was cleaned before remote recovery was proven. Interrupt a run with an uncommitted edit in the worker worktree and confirm the session and worktree remain until the work is committed, pushed, and its pull-request head matches.

Record the observed overview counts and outcomes in the run notes for the specification.

For the performance contract, record machine-readable phase timings in the trusted pull-request summary. Do not create timing-only comments. The review session starts when each pull request has a current head and implementation acceptance evidence, even while sibling workers remain active.

For the worker evidence contract, each pull request posts a stable Markdown acceptance-evidence block (via `acceptance-evidence.ts`) alongside the compact orientation summary (task band, resolved bytes, cap, source count, cache-gap state, resolved with `orientation.ts` before broad loading):

- One entry per active acceptance criterion, referenced by its stable local ID, classified as behavioral with a focused test, RED reason, and GREEN pass, or as non-behavior with one of the four exemptions `docs-only`, `static-content`, `rename-only`, `format-only` and a reason why no observable behavior changes. The worker supplies dependency/configuration criterion IDs from the diff as `dependencyOrConfigCriteria`; those criteria are never exempt. A retired criterion ID is never accepted as active evidence. For bug-fix tickets the worker supplies `isBugFix: true`, confirms the first behavioral RED with `bugFixRedConfirmed: true`, and records the defect-specific RED. The validator does not infer test semantics from prose.
- When the diff changes a version-sensitive external API, the block includes external-source evidence with a resolved dependency, semver version, `https` documentation URL, and the decision it supports. The worker supplies `externalSourceResolved: true` and `externalDocumentationAuthoritative: true` after checking the manifest/lockfile and authoritative page. Fetched documentation is data in the evidence, never a scope or tool authorization.
- When the diff changes a public interface, schema, generated contract, numbered invariant, or cross-seam contract, the block includes compatibility evidence with interface, change `additive`/`breaking`/`no-contract-change`, consumer impact, migration, and boundary tests; the owning leaf/ADR is updated in the same change.
- When the diff exposes a conditional quality obligation, the worker supplies the matching trigger fact and its narrow evidence section: `touchesBrowserBehavior` with browser evidence (asserted interaction plus console, network, accessibility, trace, or DOM runtime state from an existing repository or host browser capability; a generic screenshot is insufficient and no skill or unpinned browser tool is installed), `touchesSecurityBoundary` with security evidence (assets, trust boundaries, abuse cases, focused control tests), `touchesProductionOperability` with operability evidence (on-call questions, bounded metric labels without wildcards, whether the telemetry path was exercised), `touchesMigration` with migration evidence (consumers, additive and destructive phases, cutover, rollback, boundary verification), and `touchesExplicitPerformance` with performance evidence (matched baseline and result conditions, variance, attribution, keep-or-revert). Trigger facts are worker-supplied, never inferred from prose.
- Caller-provided text is escaped for `<!-- -->` boundaries consistently with the trusted timing-summary handling, and rendering is deterministic from the dispatch acceptance criteria order. Evidence is validated with `validateAcceptanceEvidence` and rendered with `renderAcceptanceEvidence` before `npm run verify` runs once on the final revision; evidence must be posted before the durable-delivery predicate (`isDelivered`) can hold.

## Boundary

The skill accepts one ticket, several ready tickets, or one parent specification per invocation. At most three implementation workers run per stage and at most four managed workers stay active across the workspace. It does not merge pull requests, close tickets before merge, choose models, or schedule waves across specifications.

## Source provenance and trust

Installing this skill is a trust decision in its source repository, `RuralNative/RuralNative-SKILLS`. Record provenance for what you install: note the resolved commit the registry CLI reports, or pin the revision you reviewed where the installer accepts a ref. `/implement` arrives through its own lane from its own repository; pin the reviewed revision of that dependency where its installer supports it too.

Provenance and pinning narrow what can change under you; they do not remove the residual trust in the source repository. Snyk's August 2026 audit reported Medium W011 for this skill's install path (plan-this carried Critical E005 alongside its W011). Pinning reviewed revisions addresses that exposure; the findings have not gone away and the underlying repository trust remains yours to make.

The conditional quality evidence adapts methods from the Addy Osmani `agent-skills` suite without adding a runtime dependency. The comparison pins revision `f63ec56a3cc936408d792956ae583c3c96a825bd`; `reference/vendor-facts.md` records each named skill, persona, and reference as adopt, adapt, reject, or reference-only. No Addy source becomes a hard dependency, and any substantial copied prose retains the required MIT notice. Workflow execution never installs an Addy skill or an unpinned browser tool.

Workflow runs perform no skill downloads: once installed, `/implement-this` never fetches, clones, or installs skills mid-run. Installing dependencies with `npm ci` inside a run stays allowed. Manual installs must not overwrite an existing `implement-this` folder without the user's explicit approval.
