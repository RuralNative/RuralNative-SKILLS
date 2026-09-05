# Extended detail — implement-this

Restated reference material for `docs/leaves/implement-this.md`. Not a leaf,
not part of any orientation set. Code and tests are authoritative; this file
holds the longer key-file walk-through, workflow history, and coverage prose
that the compact leaf core points past.

## Key files & data flow

`SKILL.md` runs one open ticket in the current checkout: `invocation.ts`
parses exactly one `#<n>` reference and `validateSingleTicket` gates open
state, `ready-for-agent`, blockers, and assignment before any write.
`command-session.ts` holds current-checkout decisions over captured facts:
clean-state, feature-branch creation in that checkout, and `isDelivered` from
GitHub facts (open pull request, valid closing reference, PR-body evidence,
current requirements revision). `acceptance-evidence.ts` validates compact
per-criterion proof — focused passing command and result per active behavioral
criterion, defect-specific RED only for bug fixes, narrow rationale for
non-behavior criteria — and upserts one marked block into the pull-request
body while staying read-compatible with legacy evidence comments.
`verification.ts` selects the ticket's smallest sufficient focused checks and
never escalates to the full repository gate. No dispatch packet, worker
prompt, Agent Manager call, worktree, polling, checkpoint, retry, recovery,
or cleanup concept exists.

The skill packages a runtime copy of the pure workflow state core at
`workflow-state.ts`: stable criterion identity, requirements revision,
single-ticket validation, merge eligibility, direct promotion, and parent
closure. The authored source is `scripts/workflow-state.ts`; the generator
refreshes the three skill copies and verification fails when a copy drifts.

## Further history

ADR-0006 records the original fixed-template adapter. ADR-0009 (now superseded
by ADR-0014) recorded the decision to keep `disable-model-invocation` locks on
`/implement`. ADR-0012 (now superseded) introduced path-selected delivery
modes; the pull-request-only rule shipped in ADR-0014 supersedes the
direct-main branch for this seam.

ADR-0014 through ADR-0023 record the retired worker-wave contract:
multi-ticket dispatch, Agent Manager orchestration, worker caps, polling,
persistent worktrees, recovery and cleanup states, cloud-adjacent evidence,
and generic conditional quality profiles. ADR-0031 supersedes those clauses
and is the current contract; the older files stay verbatim as history.

## Ticket #179 — bounded orientation consumption (parent spec #176)

Ticket #179 (parent spec #176) consumes the bounded orientation contract
(INV-14, ADR-0024): the run resolves current orientation sources in the
current checkout before broad documentation loading and records the compact
durable summary — task band, resolved bytes, cap, source count, cache-gap
state — with the acceptance evidence. Ambiguity adds `needs-info` and stops
before edits. No fallback reads every leaf, ADR, policy, or the derived human
documentation tree; cache-gap approval may substitute or narrow the set but
cannot waive the selected cap.
