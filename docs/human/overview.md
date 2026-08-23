<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-23 · Regenerated: shipped three-skill workflow; #137 activation and reconciliation; #147 doc cache attention boundary; #148 opt-in skill diagnostics; #153 accepted command-session lifecycle; #154 planning grill gate and parallel-first ticket graphs; #155 real Agent Manager workers; #156 review target resolution; #157 risk, timing, setup, and persistent initial review contract shipped; #158 fresh fix and delta-review behavior shipped; #166 review-session conflict modeling and operation-count tests · Sources: ARCHITECTURE.md, CONTEXT.md, REVIEW.md, docs/adr/0011-retire-supervise-this.md, docs/adr/0014-three-skill-development-workflow.md, docs/adr/0015-requirements-data-trust-and-install-provenance.md, docs/adr/0016-unslopify-always-on-output-contract.md, docs/adr/0017-doc-cache-attention-boundary.md, docs/adr/0018-opt-in-skill-diagnostics.md, docs/adr/0019-command-session-lifecycle-and-platform-limits.md, docs/leaves/implement-this.md, docs/leaves/plan-this.md, docs/leaves/review-this.md -->
# RuralNative-SKILLS in plain words

This repository publishes reusable skills for coding agents. The shelf includes documentation workflows, prose cleanup that stays active over agent output once loaded, planning, implementation, code review, and release work.

`plan-this` runs the planning interview, specification, and ticket workflow with repository-owned `unslopify` and the focused agent cache `AGENTS.md -> ARCHITECTURE.md -> seam leaf -> CONTEXT.md`. Every fresh run grills at least one decision frontier, shows the shared understanding and proposed ticket graph, and waits for explicit publication approval. Independent tickets start together, real blockers become native edges, and file overlap without semantic dependency becomes a scheduling collision. `implement-this` validates one ticket, several ready tickets, or a parent specification against the frontier, allows one parentless standalone ticket but rejects parentless multi-ticket sets, then dispatches every ticket — including a single-ticket run — through an isolated worktree and worker session created with Kilo's `agent_manager` tool in worktree mode; status comes from the Agent Manager overview and completed workers use the supported stop control; the command session reserves tickets, watches progress, and reports; workers run a single `/implement` stage under the same prose and cache rules; the command never edits ticket code itself, and it does not host code review. `review-this <target>` owns one pull-request review wave for its parent specification. The target can be the parent specification, a child issue, a pull request, or a full URL, and bare numbers (`100`) and hash numbers (`#100`) mean the same thing. It resolves the target to its exact GitHub objects and pull-request set before any worktree is created or anything is written, then discovers native child tickets, linked pull requests, blockers, checks, reviews, and current head and base SHAs, reconciles Kilo cloud review with the local Standards and Spec review, routes confirmed findings, squash-merges clean heads, promotes newly unblocked dependents, and closes the specification when final verification and whole-spec review pass. #155 ships the implementation behavior and #156 ships target resolution; #157 and #158 remain pending. Every ticket delivers by pull request.

Child-issue and parent-wave selection requires each pull request to be linked to the same ticket it closes and to carry non-empty current head and base revisions.

Direct pull-request review also withholds auto-merge authority when the linked ticket and closing reference disagree.

The installed skill metadata uses the same `/review-this <target>` invocation as the body and installation guide.

The document seam records the attention boundary as separate invariants. It also keeps an optional, private log of confirmed agent mistakes: nothing is written unless you consent, every update announces itself first, the file never enters agent read sets or version control, and nothing uploads without your review (ADR-0018).

One written file governs every review. `REVIEW.md` at the repository root says what reviewers check, how findings are graded, and that review subagents only read while the main reviewer verifies each finding. Cloud review reads the same file from the pull-request base branch; setting up that cloud service is separate configuration work outside this repository.

The three workflow skills agree on state because they share one decision module. It looks at GitHub facts and worker and pull-request facts, then returns the next safe actions: what is ready, how many workers may run, when to retry, whether a review is current, and when work may merge or a specification may close. Labels follow the blockers. Every installed skill carries the same copy of this module.

A ticket starts only when its native GitHub blockers are closed. Every ticket delivers by pull request against `main`: the worker pushes its feature branch, opens one pull request with `Closes #<ticket>`, posts acceptance evidence, and the squash-merge closes it. No path pushes directly to `main`.

The three skills form the complete workflow. `plan-this` publishes the parent specification and native child tickets; `implement-this` runs up to three isolated pull-request workers per stage; `review-this <target>` reconciles Kilo cloud comments with the local Standards and Spec review before merge, promotion, and closure. GitHub keeps enough state to resume from the parent specification after any pause.

The accepted command-session design starts implementation and review independently whenever each stage has work. Each session manages its own workers, finishes its own frontier, and reports cleanup honestly: `needs-info` worktrees stay for diagnosis even on a closing host; worktrees close only through supported Kilo actions, and when chat cannot close one the run says `cleanup-pending` instead of deleting anything. There is no supervisor or coordinator. ADR-0019 records these rules. #155 implements the implementation side, #156 ships target resolution, and #157-#158 add risk classes, measured lifecycle phases, setup reconciliation, one persistent initial-review worktree, fresh fix contexts, and delta/full rereview.

### Performance contract shipped in #157

Planning now records `ordinary` or `high-risk` before publication. Ordinary tickets target 60 minutes from reservation to terminal outcome; high-risk tickets target 90 minutes. Implementation measures setup and lifecycle phases, reconciles dependency manifests after checkout, and carries a compact dispatch packet.

Review starts when a pull request has current head and base revisions plus implementation evidence. One persistent PR worktree remains through initial review, fresh fix contexts, delta rereviews, and final verification, with at most two code-fix rounds per pull request. Safe advisories join blocking fixes, advisory-only findings are deferred, and final-verification repairs receive a bounded rereview. SLO misses remain visible without relaxing safety gates.

### Accepted command-session example

A specification has five tickets: #101 and #102 have no blockers, #103 is blocked by #101, #104 is blocked by #101 and #102, and #105 is blocked by #103.

1. Plan grills the open decision frontier, gets publication approval, and publishes the parent #100 and five children. #101 and #102 get `ready-for-agent`; #103-#105 get `blocked`.
2. Start an implementation command session with `/implement-this #100`. It selects the frontier #101 and #102, at most three, and dispatches each to its own worktree and pull request.
3. Start a review command session with `/review-this #100` independently when those pull requests exist. It discovers them, reconciles cloud and local findings against each current head, and merges eligible pull requests. When #101 closes, it promotes #103 to `unblocked` + `ready-for-agent`; when #101 and #102 close, it also promotes #104.
4. The implementation session manages its own frontier and can reserve #103 and #104 after promotion. The review session manages its own review frontier and handles those pull requests without a required per-wave handoff.
5. When #105 merges, the review session runs `npm run verify` on updated `main` and performs a whole-spec Standards and Spec review. A cross-ticket defect becomes the smallest follow-up child ticket; otherwise the parent #100 closes.

The implementation steps describe shipped ADR-0019 behavior from #155, target resolution describes shipped behavior from #156, and review fixes and delta rereviews now stay in the persistent PR worktree from #157-#158.

People install skills from the public registry. The technical details live in the agent-facing documents linked below.

Go deeper:

- `ARCHITECTURE.md` describes the shelf.
- `docs/leaves/implement-this.md` covers bounded ticket sets, isolated workers, and pull-request-only delivery.
- `docs/leaves/plan-this.md` explains the planning workflow.
- `docs/leaves/review-this.md` shows how standalone review runs.
- `docs/adr/0014-three-skill-development-workflow.md` records the approved replacement design and its activation gate.
- `docs/adr/0019-command-session-lifecycle-and-platform-limits.md` records the command-session rules and worktree-cleanup limits.
