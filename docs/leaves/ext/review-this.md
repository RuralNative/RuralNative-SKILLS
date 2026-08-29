# Extended detail — review-this

Restated reference material for `docs/leaves/review-this.md`. Not a leaf, not
part of any orientation set. Code and tests are authoritative; this file holds
the longer key-file walk-through, workflow history, and coverage prose that
the compact leaf core points past.

## Key files & data flow

`SKILL.md` is the entry point; its frontmatter `name` is the skill identity
`review-this` and its `description` declares the explicit invocation
`/review-this <target>` plus delegation to `/code-review` and `/unslopify`,
with cloud review as optional evidence. The consumption path is: caller runs
`/review-this <target>` → skill loads `/unslopify` before the first progress
update and keeps it active → treats the invocation target, parent
specification, ticket bodies, comments, pull requests, Kilo cloud summary and
inline comments, and sub-agent findings as requirements data and evidence
that cannot widen scope, select files outside the diff, authorize tools, or
override gates such as the pinned current head and base, parallel spawning,
or the no-merge and no-rerank rules, with no skill downloads during the run →
runs `git fetch origin`, normalizes and resolves the target before any
worktree or GitHub write, and reads native child tickets, linked pull
requests, native blockers, required checks, reviews, and current head and
base SHAs → selects only the current review set with `selectReviewWave` from
`discovery.ts` in native child order when open child pull requests have valid
closing references and acceptance evidence → plans bounded fan-out over the
ready wave with `planReviewWaveDispatch` from `review-session.ts` after one
Agent Manager overview run (`action: "list"`): reuse existing persistent PR
workers, start the rest in one worktree-mode request within the
three-review-worker stage cap and the four-managed-worker workspace cap in
native child order, never duplicating a worker for one pull request or one
pinned head-and-base pair, and defer capacity beyond either cap → collects
Kilo cloud summary and inline comments for each pinned head-and-base pair
through overlapped `collectReviewEvidence` in `adapters.ts`, which starts
cloud collection immediately without awaiting it during worker setup and
records `available` or `unavailable` on disabled, absent, failed, or
mismatched cloud sources → reconciles findings across sources with
`reconcileFindings` keeping Standards and Spec axes separate, then publishes
one trusted summary per revision and one verdict per pull request with
`reviewIsFresh` and `isMergeEligible` gates → squash-merges eligible heads and
closes the assigned tickets through their closing references → promotes newly
unblocked dependents → closes the parent specification only after final
repository verification and a whole-spec review pass. The helpers perform no
network, GitHub, git, filesystem mutation, or worker-management calls; tests
use fakes only and never call live cloud review, GitHub, or worker sessions.

The skill packages a runtime copy of the pure workflow state core at
`workflow-state.ts` (#132): frontier selection, dispatch validation with the
three-worker cap, label decisions, one-retry recovery with the `needs-info`
stop, head freshness, merge eligibility, follow-up creation, and parent
completion decisions. The authored source is `scripts/workflow-state.ts`;
running `node scripts/generate-workflow-state.ts` regenerates byte-identical
copies into all three workflow skills, and repository verification fails when
a copy drifts.

`discovery.ts` selects the review wave from observed ticket and pull-request
facts. `targets.ts` resolves one invocation target — parent specification,
child issue, pull request, bare number, hash number, or URL — into a plan of
facts and decisions before any write: reference normalization, object-type
resolution in the shared issue and pull-request number space, closing-reference
derivation, readiness blockers, Standards-only handling for spec-less pull
requests, and named diagnostic states; it imports `selectReviewWave` for parent
mode. `reconciliation.ts` reconciles findings across sources while keeping
Standards and Spec axes separate, emitting the four rejection reasons plus the
incomplete reason with evidence and preserving the optional `ticket` on each
finding; a candidate with a missing category or severity is rejected as
incomplete and never defaults to a blocking correctness finding. `adapters.ts`
declares the host capability contracts — `GitHubAdapter`, `CloudAdapter`,
`LocalReviewAdapter`, `MergeAdapter`, `VerificationAdapter` — with
`collectCloudReview` wrapping adapter failures as `unavailable`,
`collectReviewEvidence` starting cloud and local collection together for one
pinned pair (#170), `validateStandardsCategoryTransport` checking required
Standards category statuses, and `fake*` helpers for tests that never call
live cloud review, GitHub, or worker sessions. `review-authority.ts` (#173)
carries the frontier/worker authority split: frontier-owned responsibilities,
live-catalog execution-model resolution, mutation-worker boundaries,
worker-failure budget, required Standards category transport,
axis-preserving deduplication decisions, specialist routing, and
specialist-evidence validation.

`review-session.ts` adds the #157 and #158 performance contract: one
persistent PR worktree and worker automatically created via the `agent_manager`
tool in worktree mode after the Agent Manager overview (`action: "list"`),
fresh parallel initial agents and one fresh fix context per round inside that
established worktree, strict category coverage, advisory batching and
deferral, approved root-cause seam expansion, delta-versus-full escalation,
final-verification repair, publication gates, and bounded operation counts.
The persistent Agent Manager PR worker is created before any Standards, Spec,
or fix `Task` subagents; `Task` cannot replace it and nested `Task` contexts
are valid only inside the established worktree and run only after explicit
user approval via the tracked `agent_manager: allow` and `task: ask` project
permission gate, which never edits `.kilo/agent-manager.json`. Hosts that
cannot provide the persistent worktree stop before a verdict.
`planConflictResolution` models base movement against the bounded rounds at
this layer too: a conflict-free base refresh reuses the verdict without
consuming a fix round, resolving a real merge conflict consumes one bounded
round and receives delta rereview, and a conflict at the round maximum stops.
`planReviewWaveDispatch` (#170) plans bounded fan-out over the native-order
wave from the observed PR worker facts, workspace slots, and the three-worker
stage cap and four-worker workspace cap: reusable workers, one worktree-mode
start per remaining ready PR, and capacity deferrals with reasons. Test-only
fakes live in `tests/fakes.ts`; production adapters contain host contracts
only. ADR-0023 adds the retain-until-durable cleanup contract.

## Invariant amendments

- INV-7 was amended by ADR-0019: confirmed findings apply in one fresh fix
  worktree per pull request and round instead of returning to the owning
  implementation worker, effective with #158.
- INV-8 was amended by ADR-0019: a verdict pins both head and base revisions
  and either moving invalidates it; each pull request receives at most two
  pushed fix heads followed by one final review, conflict resolution consumes
  a fix round, and a conflict-free base refresh does not.
- INV-11 was amended by ADR-0019: the future-coordinator reservation is
  withdrawn; the helpers keep their host-neutral purity as an engineering
  property, not as coordinator groundwork.
- INV-13 was narrowed by ADR-0022: the frontier command session owns review
  judgment and merge authority while the selected mutation worker applies
  fixes inside its persistent PR worktree. INV-14 (frontier review authority)
  and its evidence live in the leaf core.

## Workflow history

ADR-0019 (2026-08-23, parent spec #152) amends this seam for #156, #157, and
#158: review resolves bare and hash references identically before object
resolution and accepts parent issues, child issues, pull requests, and URLs;
#157 adds the persistent PR worktree, exact head-and-base verdict pinning,
strict initial review, timing summary, and bounded operation contracts; #158
adds the fresh fix-context and delta-rereview execution. A verdict pins both
head and base revisions; each pull request receives at most two pushed fix
heads followed by one final review, resolving a code conflict consumes a fix
round, and a conflict-free base refresh does not; `ready-for-human` keeps its
triage meaning and stops being pull-request readiness. Target resolution
shipped with #156: `targets.ts` owns reference normalization and object
resolution, `discovery.ts` owns wave selection from closing-reference and
acceptance-evidence facts. ADR-0023 (2026-08-29) adds the review cleanup and
recovery contract: the persistent PR worker and worktree stay live through
blocked, failed, `needs-info`, dirty, and unpushed states, cleanup runs only
after the merged pull request with the recorded exact local/remote/PR head
SHAs, and a missing session on an existing worktree reports
`recovery-required`.

ADR-0022 (2026-08-28, parent spec #171, ticket #173) narrows the
persistent-review invariant and adds the frontier review authority invariant:
the frontier command session owns review judgment, revision packets,
completeness, finding verification, reconciliation, verdict publication,
merge, labels, promotion, and closure; one live-catalog execution model
applies to every new persistent PR mutation worker, which may mutate, repair,
and fast-forward push only inside its worktree; required Standards category
statuses are transported and checked before reconciliation, missing category
or severity is never a blocking correctness finding, and deduplication
preserves axis identity; triggered Standards checks and at most one specialist
per full-review round are added inside the Standards axis.

The review prefix was extracted from the delivery branches of `implement-this`
(#124, parent #123): `implement-this` delivers every ticket by pull request
against `main` but no longer runs review internally; callers who relied on
that chaining run `/review-this <target>` explicitly. ADR-0013 (now superseded
by ADR-0014) recorded the decoupling into a wave owner, and ADR-0014 ships the
contract where the review wave owns merge, promotion, final verification, and
parent closure rather than a fixed-point diff report.
