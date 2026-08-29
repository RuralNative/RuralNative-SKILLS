# Extended detail — implement-this

Restated reference material for `docs/leaves/implement-this.md`. Not a leaf,
not part of any orientation set. Code and tests are authoritative; this file
holds the longer key-file walk-through, workflow history, and coverage prose
that the compact leaf core points past.

## Key files & data flow

`SKILL.md` substitutes the requested ticket set for the single `Issue #0` slot
and doubles as the worker template: the control workspace parses the
invocation, validates and reserves the set, and sends each worker this
document with its ticket substituted. `invocation.ts` turns the references
into one bounded set through the pure state core: `parseInvocation` normalizes
bare and hash forms identically before any GitHub read or write (malformed
references stop before any claim), and `planBoundedSet` takes one standalone
ticket, an explicit list, or a parent specification whose open children yield
up to three current frontier tickets via `selectFrontier`, in native child
order, then gates every form through `validateDispatch`. A standalone
one-ticket run dispatches exactly like a parent run: one isolated worktree and
one worker session per ticket, with no inline path. `dispatch-packet.ts`
carries the ticket, risk class, revisions, affected seams, acceptance
criteria, and settled decisions so workers do not repeat full repository
discovery. `timing.ts`, `setup.ts`, and `verification.ts` record phase
timings, reconcile dependency manifests after checkout, keep `node_modules`
separate, and provide affected-test evidence. `acceptance-evidence.ts`
validates and renders the per-criterion RED/GREEN evidence, including the
four-way non-behavior exemption whitelist and conditional external-source,
compatibility, browser, security, operability, migration, and performance
sections with deterministic Markdown and `<!-- -->` escaping.

On Kilo Code the command session automatically dispatches through the
`agent_manager` tool in worktree mode without waiting to be forced — one
independent task per ticket with one initial prompt carrying the rendered
template — and never edits ticket code itself. The first worker-management
call is the Agent Manager overview (`action: "list"`), read before spawning
anything, and the project permission gate in `.kilo/kilo.jsonc` allows
`agent_manager` while requiring explicit user approval for `task`
(`agent_manager: allow`, `task: ask`). Before spawning it reads Agent Manager's
overview and counts every unfinished active managed worker in the workspace;
`command-session.ts` holds the lifecycle decisions as pure functions over
captured facts: `spawnCapacity` enforces the three-worker stage cap and the
four-worker workspace cap (`MAX_MANAGED_WORKERS`), `schedulingCollision` makes
an overlapping ticket wait for a free slot without gaining a blocker edge,
`nextPollDelay` raises poll delays, `checkpointDue` fires the 30-minute
checkpoint, `isDelivered` defines delivery entirely from GitHub facts — an
open pull request with a valid closing reference and posted acceptance
evidence; session idleness counts for nothing — `resumeAction` reconciles
reservation, branch, session, pull request, and prior evidence after
interruption so nothing is duplicated and reports `recovery-required` when a
session is absent but its worktree exists, and `cleanupDecision` (ADR-0023)
keeps `stopSession` a real decision that defaults to false: running,
interrupted, failed, dirty, unpushed, SHA-mismatched, missing-PR,
missing-evidence, and `needs-info` workers keep their session and worktree,
only exact durable delivery with one local/remote/PR head SHA allows a stop,
eligible worktrees are removed only when the host supports safe managed
closure, and the other preserved states report `preserved-for-resume` or
`preserved-for-diagnosis`. Workers never call Agent Manager stop or close;
only the command session may request cleanup. Tests feed captured GitHub and
Agent Manager facts through tables and never create real worktrees, sessions,
or live calls.

The skill packages a runtime copy of the pure workflow state core at
`workflow-state.ts` (#132): frontier selection, dispatch validation with the
three-worker cap, label decisions, one-retry recovery with the `needs-info`
stop, head freshness, merge eligibility, follow-up creation, and parent
completion decisions. The authored source is `scripts/workflow-state.ts`;
running `node scripts/generate-workflow-state.ts` regenerates byte-identical
copies into all three workflow skills, and repository verification fails when
a copy drifts.

## Further history

ADR-0006 records the original fixed-template adapter. ADR-0009 (now superseded
by ADR-0014) recorded the decision to keep `disable-model-invocation` locks on
`/implement`. ADR-0012 (now superseded) introduced path-selected delivery
modes; the pull-request-only rule shipped in ADR-0014 supersedes the
direct-main branch for this seam. ADR-0013 (now superseded) recorded the
decoupling of review into `review-this`.

The single-issue contract (#72, trimmed per DEBT-7) grew into the bounded-set
contract here (#134, parent #130): multi-input parsing, frontier selection,
isolated workers, and pull-request-only delivery replace one-ticket inline
delivery. The retired direct-main and manager-worktree mode-selection wording
survives only in historical decisions.

ADR-0019 (2026-08-23, parent spec #152) records the command-session lifecycle
this seam shipped with #155: the user creates implementation and review
command sessions independently; a parent session polls with increasing delays,
reports only lifecycle changes, checkpoints after 30 minutes without progress,
and resumes idempotently from GitHub without duplicate artifacts; worker
limits are three per stage and four active managed workers across the
workspace; bare and hash ticket references normalize identically before object
resolution; delivery is GitHub pull-request state plus acceptance evidence,
never session idleness. ADR-0023 (2026-08-29) narrows the cleanup rule: a
worker stops only after the exact recovery gate — terminal success, a clean
worktree, one matching local/remote/PR head SHA, and durable pull-request
evidence — while running, interrupted, failed, dirty, unpushed, and
`needs-info` workers keep their session and worktree (`preserved-for-resume`
or `preserved-for-diagnosis`). The fake-only `worker-adapters.ts` adapter
layer was deleted when direct command behavior replaced it (#155).

ADR-0021 (2026-08-28) records the worker evidence contract: ordered behavioral
slices with RED/GREEN, four-way non-behavior exemptions that never cover
dependency/configuration changes, bug-fix defect reproduction,
version-sensitive external-source gating, public-interface compatibility with
boundary tests and same-change doc updates, pure validation and stable escaped
rendering of acceptance evidence, single commit per verified ticket, no nested
reviewer, and `document-for-agents` taxonomy stops for invariant collisions,
cache gaps, ticket ambiguity, missing test capability, and unavailable
authoritative documentation.

Ticket #172 (parent spec #171) extends the evidence contract with conditional
quality sections: browser, security-boundary, production-operability,
migration, and explicit-performance evidence, each gated by a worker-supplied
trigger fact, plus the bounded unexpected-failure diagnostic loop and the
pinned Addy Osmani source matrix in `reference/vendor-facts.md` (revision
`f63ec56a3cc936408d792956ae583c3c96a825bd`). The evidence model stays pure,
untriggered tickets keep the current shape and cost, and no Addy source
becomes a hard dependency.

## Ticket #179 — bounded orientation consumption (parent spec #176)

Ticket #179 (parent spec #176) consumes the bounded orientation contract
(INV-14, ADR-0024): the worker resolves current orientation sources in its
checkout before broad documentation loading with `preflightWorkerOrientation`
from `orientation.ts`, and records the compact durable summary — task band,
resolved bytes, cap, source count, cache-gap state — with the existing timing
and acceptance evidence. A direct ticket with valid affected seams follows the
same bounded path as a planned ticket. A ticket without valid seam metadata
receives one resolution attempt with `resolveDirectTicketSeam` against the
compact architecture index and code roots; one clear set proceeds, while
ambiguity adds `needs-info` and stops before edits. No implementation fallback
reads every leaf, ADR, policy, or the derived human documentation tree;
cache-gap approval may substitute or narrow the set but cannot waive the
selected cap.
