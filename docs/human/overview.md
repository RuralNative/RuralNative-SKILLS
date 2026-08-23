<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-23 · Regenerated: shipped three-skill workflow; #137 activation and reconciliation; stale orchestrator removed; ADR-0014 now shipped, ADR-0009/0012/0013 superseded; pull-request-only delivery; accepted command-session example; #146 unslopify always-on output contract; #147 doc cache attention boundary; #147 review pass; #148 opt-in skill diagnostics; #153 accepted command-session lifecycle; #154-#158 pending behavior updates; second current-head review · Sources: ARCHITECTURE.md, CONTEXT.md, REVIEW.md, docs/adr/0011-retire-supervise-this.md, docs/adr/0014-three-skill-development-workflow.md, docs/adr/0015-requirements-data-trust-and-install-provenance.md, docs/adr/0016-unslopify-always-on-output-contract.md, docs/adr/0017-doc-cache-attention-boundary.md, docs/adr/0018-opt-in-skill-diagnostics.md, docs/adr/0019-command-session-lifecycle-and-platform-limits.md, docs/leaves/implement-this.md, docs/leaves/plan-this.md, docs/leaves/review-this.md -->
# RuralNative-SKILLS in plain words

This repository publishes reusable skills for coding agents. The shelf includes documentation workflows, prose cleanup that stays active over agent output once loaded, planning, implementation, code review, and release work.

`plan-this` runs the planning interview, specification, and ticket workflow with repository-owned `unslopify` and the focused agent cache `AGENTS.md → ARCHITECTURE.md → seam leaf → CONTEXT.md → relevant ADRs`, whose loading budgets are caps on orientation documents; `AGENTS.md` opens with a five-command working contract, and a named cache gap requires owner approval before the read set widens. Human pages are derived from agent docs and not preloaded. `implement-this` validates one ticket, several ready tickets, or a parent specification against the frontier, then runs each ticket through an isolated worker and a single `/implement` stage under the same prose and cache rules; it does not host code review. `review-this #<spec>` owns one pull-request review wave for its parent specification: it discovers native child tickets, linked pull requests, blockers, checks, reviews, and current head SHAs, reconciles Kilo cloud review with the local Standards and Spec review against each current head, routes confirmed findings to the owning worker, squash-merges clean heads, promotes newly unblocked dependents, and closes the specification when final verification and whole-spec review pass. ADR-0019's accepted design starts implementation and review as independent command sessions, with each session managing its own frontier. Tickets #154-#158 implement that design; until they merge, the current commands retain the behavior described in their seam leaves. Every ticket delivers by pull request.

The document seam records the attention boundary as separate invariants. It also keeps an optional, private log of confirmed agent mistakes: nothing is written unless you consent, every update announces itself first, the file never enters agent read sets or version control, and nothing uploads without your review (ADR-0018).

One written file governs every review. `REVIEW.md` at the repository root says what reviewers check, how findings are graded, and that review subagents only read while the main reviewer verifies each finding. Cloud review reads the same file from the pull-request base branch; setting up that cloud service is separate configuration work outside this repository.

The three workflow skills agree on state because they share one decision module. It looks at the GitHub facts (blockers, labels, assignments, closures) and worker and pull-request facts, then returns the next safe actions: what is ready, how many workers may run, when to retry, whether a review is current, and when work may merge or a specification may close. Labels follow the blockers: a reopened blocker sends an `unblocked` ticket back to `blocked`, and a ticket stopped for missing information stays stopped. The parent specification carries no claimable label, `ready-for-agent` is the only claimable label on tickets, and `ready-for-dev` is retired. Every installed skill carries the same copy of this module.

A ticket starts only when its native GitHub blockers are closed. Every ticket delivers by pull request against `main`: the worker pushes its feature branch, opens one pull request with `Closes #<ticket>`, posts acceptance evidence, and the squash-merge closes the ticket. No path pushes directly to `main`.

The three skills form the complete workflow. `plan-this` publishes the parent specification and native child tickets; `implement-this` runs up to three isolated pull-request workers per stage; `review-this #<spec>` reconciles Kilo cloud comments with the local Standards and Spec review before merge, promotion, and closure. GitHub keeps enough state to resume from the parent specification after any pause.

The accepted command-session design starts implementation and review independently whenever each stage has work. Each session manages its own workers, finishes its own frontier, and reports cleanup honestly: worktrees close only through supported Kilo actions, and when chat cannot close one the run says `cleanup-pending` instead of deleting anything. There is no supervisor or coordinator. ADR-0019 records these rules. Tickets #154-#158 implement them, so this is a target design rather than shipped command behavior.

### Accepted command-session example

A specification has five tickets: #101 and #102 have no blockers, #103 is blocked by #101, #104 is blocked by #101 and #102, and #105 is blocked by #103.

1. Plan publishes the parent #100 and five children. #101 and #102 get `ready-for-agent`; #103-#105 get `blocked`.
2. Start an implementation command session with `/implement-this #100`. It selects the frontier #101 and #102, at most three, and dispatches each to its own worktree and pull request.
3. Start a review command session with `/review-this #100` independently when those pull requests exist. It discovers them, reconciles cloud and local findings against each current head, and merges eligible pull requests. When #101 closes, it promotes #103 to `unblocked` + `ready-for-agent`; when #101 and #102 close, it also promotes #104.
4. The implementation session manages its own frontier and can reserve #103 and #104 after promotion. The review session manages its own review frontier and handles those pull requests without a required per-wave handoff.
5. When #105 merges, the review session runs `npm run verify` on updated `main` and performs a whole-spec Standards and Spec review. A cross-ticket defect becomes the smallest follow-up child ticket; otherwise the parent #100 closes.

This example describes the accepted ADR-0019 design. Tickets #154-#158 have not shipped; until they merge, the current commands retain the behavior described in the seam leaves.

People install skills from the public registry. The technical details live in the agent-facing documents linked below.

Go deeper:

- `ARCHITECTURE.md` describes the shelf.
- `docs/leaves/implement-this.md` covers bounded ticket sets, isolated workers, and pull-request-only delivery.
- `docs/leaves/plan-this.md` explains the planning workflow.
- `docs/leaves/review-this.md` shows how standalone review runs.
- `docs/adr/0014-three-skill-development-workflow.md` records the approved replacement design and its activation gate.
- `docs/adr/0019-command-session-lifecycle-and-platform-limits.md` records the command-session rules and worktree-cleanup limits.
