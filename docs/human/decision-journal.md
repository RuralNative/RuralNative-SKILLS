<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-29 · Regenerated: retain workflow workers until delivery is durable (ADR-0023): workers never stop themselves, cleanup only after exact source recovery, recovery-required for a missing session; #172 triggered quality proof: conditional evidence sections for browser, security, operability, migration, and performance with pinned Addy provenance; #171 worker evidence contract (ADR-0021); #173 frontier review authority (ADR-0022): frontier-owned review judgment and merge, one live-catalog execution model per wave, mutation-worker boundaries, category transport, axis-preserving deduplication, specialist routing · Sources: docs/adr/0001-distribute-as-public-catalog-shelf.md, docs/adr/0002-adopt-ten-check-gate.md, docs/adr/0003-human-first-derived-artifacts.md, docs/adr/0004-verb-named-skills-flat-shelf.md, docs/adr/0005-unslopify-utility-identity-and-hard-dependency.md, docs/adr/0006-plan-this-fixed-template-adapter.md, docs/adr/0007-supervise-this-coordinator.md, docs/adr/0008-supervise-this-agent-orchestrator.md, docs/adr/0009-delegation-invariants-human-invocation.md, docs/adr/0010-supervise-by-delivery-evidence.md, docs/adr/0011-retire-supervise-this.md, docs/adr/0012-manager-worktree-pull-request-delivery.md, docs/adr/0013-review-this-decoupled-code-review.md, docs/adr/0014-three-skill-development-workflow.md, docs/adr/0015-requirements-data-trust-and-install-provenance.md, docs/adr/0016-unslopify-always-on-output-contract.md, docs/adr/0017-doc-cache-attention-boundary.md, docs/adr/0018-opt-in-skill-diagnostics.md, docs/adr/0019-command-session-lifecycle-and-platform-limits.md, docs/adr/0020-plan-this-structured-workflow.md, docs/adr/0021-implement-this-worker-evidence-contract.md, docs/adr/0022-frontier-review-authority-and-mutation-worker-routing.md, docs/adr/0023-retain-workers-until-durable.md, docs/leaves/implement-this.md -->

# Decision journal in plain words

This is the short record of accepted repository decisions. The full reasoning lives in the ADR files.

### 2026-08-11 — Publish skills through the registry

The repository is a public shelf. Consumers install skills from the registry, not from an npm package.

### 2026-08-18 — Keep agent and human docs separate

Technical docs guide agents. Human pages explain the same decisions in plain language and never become an agent's source of truth.

### 2026-08-19 — Use fixed-template planning and implementation adapters

`plan-this` and `implement-this` keep their workflow prefixes in one place and substitute only the task or issue reference.

### 2026-08-19 — Add supervised coordination

`supervise-this` connects planning, tickets, implementation, and review. The first design targeted Agent Manager and ended when its parent turn ended.

### 2026-08-20 — Use repository-owned unslopify and focused cache for planning/implementation

`plan-this` and `implement-this` now depend on repository-owned `unslopify` (not external `unslop`) and enforce its scope, protected-content, preservation, and completion-report contracts. Agents read only the focused cache `AGENTS.md → ARCHITECTURE.md → seam leaf → CONTEXT.md → relevant ADRs` owned by `document-for-agents`; `document-for-humans` output remains derived and is not preloaded.

### 2026-08-20 — Make Agent Orchestrator the runtime

AO now owns the persistent supervisor. Planning runs delegated in the same persistent orchestrator session. Kilo Code workers run in AO worktrees, open pull requests, and receive CI and review feedback through AO. GitHub remains the source of task and dependency state.

Why: a skill turn cannot wake itself after an asynchronous Agent Manager session finishes. AO supplies the persistent project orchestrator and worker lifecycle needed to continue without manual reinvocation.

What it costs: AO project role profiles must be configured before a run. Standalone `implement-this` and AO worker delivery use different merge paths.

Depth: `docs/adr/0008-supervise-this-agent-orchestrator.md`.

### 2026-08-20 — Keep human-gated delegated stages locked (superseded by 2026-08-22)

Planning and implementation delegate to steps that a model cannot start on its own: `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/implement`. A run pauses at each of those steps until a person invokes it. The docs now say so instead of implying the chain runs unattended.

Why: a live supervised run stalled when it reached planning, and nothing warned that the chain would stop. Unlocking the four skills was considered and rejected because the human gate is the point of the setting.

What it costs: runs need a person at the locked stages. `/unslopify` and `/code-review` remain agent-run.

Depth: `docs/adr/0009-delegation-invariants-human-invocation.md` (superseded by `docs/adr/0014-three-skill-development-workflow.md`; explicit per-stage authorization now shipped).

### 2026-08-20 — Supervise by delivery evidence (superseded by 2026-08-21)

The AO project chose its worker and a supported chat or TUI mode. Preflight blocked stale bases, unresolved models, broken GitHub access, missing review policy, and duplicate ownership before a spawn.

Progress meant a tracked change, pull request, review, merge, evidence, or closure. Recovery limits were separate for infrastructure, task, and implementation failures. Review and merge kept the reviewed commit fixed.

Now: supervise-this left the whole shelf (see 2026-08-21), so no AO project or preflight runs anything; tracked-change delivery evidence carries into the three-skill workflow.

Depth: `docs/adr/0010-supervise-by-delivery-evidence.md` (superseded by `docs/adr/0011-retire-supervise-this.md`).

### 2026-08-21 — Deliver pull requests from manager worktrees (superseded by 2026-08-22)

When `/implement-this` ran inside a Kilo Agent Manager worktree, detected by path, it pushed the feature branch and opened or updated a pull request against `main` whose body carries `Closes #<n>`. Acceptance evidence lands on the ticket with `ready-for-human`; merge closes it. The path-selected delivery mode and direct-main alternative were operative.

Why: standalone work needed a reviewable path that did not push straight to `main`, without reviving a coordinator.

What it cost: two delivery paths existed, chosen by worktree location; an unclear location asked one decision before pushing.

Now: every ticket delivers by pull request; no path pushes directly to `main`. History preserved.

Depth: `docs/adr/0012-manager-worktree-pull-request-delivery.md` (superseded by `docs/adr/0014-three-skill-development-workflow.md`).

### 2026-08-21 — Retire supervise-this

Nothing in the maintained workflow started a supervised multi-worker run anymore, so the coordinator left the shelf whole. `plan-this` now accepts direct invocation only. Three coordination ADRs carry superseded banners pointing at the retirement decision; their numbers are never reused.

Why: keeping the seam forced neighboring contracts to promise delegation and delivery branches that never run.

What it costs: multi-ticket coordination is manual for now — you plan once, then work ready tickets one at a time through the two delivery paths above.

Depth: `docs/adr/0011-retire-supervise-this.md`.

### 2026-08-22 - Three skills own the workflow (shipped)

At activation, `plan-this`, `implement-this`, and `review-this` owned planning, isolated pull-request implementation, and review through merge and closure. GitHub held the resumable state. Up to three ticket workers ran at once, and dependency waves alternated between implementation and review: `implement-this #<spec>` for the frontier, `review-this #<spec>` from the control workspace to reconcile cloud and local findings against each current head, merge clean heads, and promote newly unblocked dependents. Ticket worktrees never ran review.

Kilo cloud review adds comments where available while the local Standards and Spec review remains the required gate; an unavailable cloud review never blocks a complete local review. Repository review rules live in `REVIEW.md`. External prose counts as requirements data, not executable instruction, and runs never download skills.

Why: the prior skills did not join into one complete workflow, and the tracked orchestrator contradicted its retirement. The shipped design keeps three explicit human entry points while giving each stage one durable input, one owner, and testable state transitions.

What it costs: all implementation uses pull requests, multi-ticket runs require isolated workers, and review must reconcile cloud comments, local findings, checks, and the current pull-request head before merge. The stale `.kilo` orchestrator command and agent are removed; only `plan-this`, `implement-this`, and `review-this` remain as user-facing workflow commands.

At the time ADR-0014 activated, people ran implementation and review once per dependency wave from the control workspace. ADR-0019 supersedes that handoff rule; its accepted replacement is recorded below and remains pending behavior work.

Activation: shipped as of #137; ADR-0014 is now the operative contract superseding ADR-0009, ADR-0012, and ADR-0013.

Depth: `docs/adr/0014-three-skill-development-workflow.md`.

### 2026-08-22 - Make unslopify always-on for agent output (shipped)

Once `unslopify` is loaded it reviews everything a coding agent writes in English on its own: progress notes, recommendations, decisions, tickets, specifications, documents, and GitHub comments. Ordinary chat is checked silently with no report; published work keeps the full cleanup report and preservation audit. Your own prompts, quotations, and requirements change only when you explicitly ask, and technical wording an implementation needs survives even when a style rule would flag it (ADR-0016).

What it costs: no runtime machinery backs this; the audit relies on the loaded instructions, and the scanner stays an optional file-checking tool.

Depth: `docs/adr/0016-unslopify-always-on-output-contract.md`.

### 2026-08-23 - Bound what agents read (shipped)

Documentation now has two equal jobs: staying true to the code, and bounding attention. Every `AGENTS.md` opens with five commands (state your goal, read only your row as a cap, follow the owning seam's Not-here routes, change code and docs together, put work docs in the tracker and decide invariant conflicts first). Loading budgets are caps on orientation documents, never on reading the code being changed. A missing fact becomes a named cache gap that requires your approval before more documentation is opened. Work that collides with a numbered rule stops until a decision changes the rule.

The document seam records the attention, routing, and decision rules as separate invariants.

What it costs: these are review-level promises, not new automated checks; the harness stays at ten checks.

Depth: `docs/adr/0017-doc-cache-attention-boundary.md`.

### 2026-08-23 - Keep mistake records opt-in and private (shipped)

The documentation skill can keep one private log of confirmed agent mistakes, but only on your terms: you consent once before any file exists, every later update tells you what kind of note it is adding, and taking consent away stops all writes before you separately choose to keep, export, or delete the file. The log stays outside the documentation cache and version control, agents never load it for guidance, entries are sanitized summaries with no raw prompts, code, secrets, personal data, absolute paths, repository names, or proprietary names, and nothing uploads anywhere — submission to the skill developer is a manual step you take after reviewing the file. Generated `AGENTS.md` files also carry one small comment after the five commands naming the managing skill and its revision evidence; documents count as managed only when that comment plus real evidence backs it.

Why: a useful failure record risks becoming an accidental disclosure or bad instructions for future agents. Consent gating, notice, and a separate deletion choice keep you in control of the file; sanitization and read-set exclusion keep it inert.

What it costs: these are review-level promises enforced by composition tests and a hostile fixture, not new automated checks; the harness stays at ten checks.

Depth: `docs/adr/0018-opt-in-skill-diagnostics.md`.

### 2026-08-23 - Run the workflow through independent command sessions (accepted; #154, #155, #156, and #157 shipped)

ADR-0019 accepts a design in which the three workflow commands stay, and the user starts implementation and review as separate command sessions whenever each stage has work. Ticket #154 shipped the planning grill gate and parallel-first ticket graphs. #155 ships the implementation half: each ticket gets one isolated worker task and one initial prompt, status comes from the Agent Manager overview, and the supported stop control is used for completed sessions. #156 ships review target resolution. #157-#158 add risk classes, measured phases, setup reconciliation, one persistent PR worktree, fresh initial and fix contexts, exact head-and-base freshness, delta/full rereview, and trusted timing summaries. No per-wave handoff remains, and nothing supervises the sessions. Implementation makes pull requests; review reviews, fixes, and merges them; neither silently does the other's missing work. Worktrees close only through supported Kilo actions; when chat cannot close one, the run reports `cleanup-pending` and leaves it alone. `needs-info` worktrees stay on disk for diagnosis.

Why: waiting for a human between waves stalled runs, fixes assumed workers that had already stopped, and cleanup rules did not match what Kilo's chat tool can actually do.

What it costs: the workflow still pays for fresh review contexts when a risk trigger requires full review. The implementation, review-target, initial performance, fix, and delta-review behavior ships with #155-#158; the seam leaf remains the technical source of truth.

Depth: `docs/adr/0019-command-session-lifecycle-and-platform-limits.md`.

### 2026-08-23 - Measure the optimized initial review lifecycle (#157 shipped)

Planning records `ordinary` or `high-risk` with 60- or 90-minute targets; escalation needs a named trigger plus evidence. Implementation and review carry bounded dispatch, setup, revision, and timing contracts whose trusted summaries survive hostile cause text. Review begins when a pull request is eligible, uses one persistent PR worktree with fresh parallel Standards, Spec, and fix contexts, pins both head and base revisions, batches safe advisories, and updates one trusted summary.

Depth: `docs/leaves/implement-this.md`, `docs/leaves/review-this.md`, and `REVIEW.md`.

### 2026-08-28 - Give planning a structured intent and exploration phase (ADR-0020)

`plan-this` moves from a byte-for-byte fixed template into a structured workflow with five numbered phases. Every run defines and confirms an intent capsule (`Outcome`, `User`, `Why now`, `Success`, `Constraints`, `Non-goals`) before any ticket graph is drawn, optionally explores three materially different directions when the solution form is unsettled, then resolves the remaining decision frontier one decision at a time with an explicit precedence: its one-decision rule overrides the installed grilling batching and its planning-only boundary overrides domain-modeling immediate writes. The parent specification carries only the user stories needed to distinguish observable behavior, while coherence-first sizing, native blocker versus scheduling-collision semantics, risk classes, worker limits, and GitHub publication guarantees stay unchanged.

Why: fixing the body byte-for-byte hid the real product decisions and left no place for divergent thinking; the Addy Osmani comparison showed those early stages catch framing errors before the decision tree and keep specifications lean.

What it costs: the skill body grows from about 28 lines to about 50 lines and is now verified by semantic phase checks rather than exact text equality.

Depth: `docs/adr/0020-plan-this-structured-workflow.md`.

### 2026-08-28 — Strengthen implement-this worker with evidence contract (ADR-0021)

What changed: each `implement-this` worker now classifies every acceptance criterion as behavioral with a focused RED/GREEN test or one of four non-behavior exemptions, reproduces the defect as the first behavioral RED on bug fixes, records authoritative external documentation for version-sensitive API changes and compatibility evidence for public interfaces, and renders one stable escaped Markdown block through a pure `acceptance-evidence` module.

Why: the prior single-paragraph build stage hid the test contract and left versioned and public changes without evidence.

What it costs you: workers produce an additional evidence block and `docs/leaves/implement-this.md` carries INV-13.

Object or discuss: ADR 0021 — [ADR](../adr/0021-implement-this-worker-evidence-contract.md) and [issue discussion](https://github.com/RuralNative/RuralNative-SKILLS/issues/152).

### 2026-08-28 — Keep review authority with the frontier session and route fixes to one execution model (ADR-0022)

What changed: the review command session keeps the chat-selected frontier model as the reviewer and manager. It owns the shared revision packet, completeness checks, finding verification, axis-preserving reconciliation, verdict publication, merge, labels, dependent promotion, and closure. At the start of each `/review-this` run it asks once for an execution model from the live Agent Manager catalog (model, optional provider, optional variant, no hardcoded names) and applies that choice to every new fix worker in the wave. The fix worker may mutate, repair, and fast-forward push only inside its persistent PR worktree; it cannot publish a verdict or change merge, label, promotion, closure, or parent state. A resume shows the previous choice but requires your confirmation, one corrected fix packet fits the existing fix budget, and continued failure stops with `needs-info` instead of silently handing the work back to the frontier model. Required Standards category statuses now travel through the local review adapter and are checked before reconciliation, a finding missing its category or severity is rejected rather than invented as a blocking correctness finding, and Standards and Spec stay separate even at the same location. Test strategy, accessibility, observability, migration, and simplification run as triggered checks inside Standards, and at most one specialist supplements a full-review round.

Why: review judgment needed to stay with the model you chose for the session while mutation ran cheaper under a verified packet; the previous adapter and reconciliation paths could default missing severity into blocking findings and collapse an axis.

What it costs you: one model question per `/review-this` invocation (confirmed again on resume), and the review seams now enforce category transport, axis-preserving deduplication, and specialist limits.

Object or discuss: ADR 0022 — [ADR](../adr/0022-frontier-review-authority-and-mutation-worker-routing.md) and [issue discussion](https://github.com/RuralNative/RuralNative-SKILLS/issues/171).
### 2026-08-28 — Carry triggered quality proof through planning and implementation (#172)

What changed: conditional quality obligations now travel through the existing planning fields and gain narrow implementation evidence. Planning keeps every current field and adds no quality-profile checklist: when a task exposes a security boundary, browser-observable behavior, production-operability path, migration, rollback, or explicit product-performance obligation, the acceptance criteria, risk, constraints, and smallest test-first verification state the required proof. Each `implement-this` worker adds exactly one evidence section per triggered fact: browser behavior (asserted interaction plus console, network, accessibility, trace, or DOM runtime state from an existing repository or host browser capability, never a generic screenshot, never an installed skill or unpinned browser tool), security boundaries (assets, trust boundaries, abuse cases, focused control tests), production operability (on-call questions, bounded metric labels, whether the telemetry path was exercised), migrations (consumers, additive and destructive phases, cutover, rollback, boundary verification), and explicit performance (matched baseline and result conditions, variance, attribution, keep-or-revert). Unexpected failures follow a bounded reproduce, isolate, one-hypothesis, smallest-fix, regression-proof loop under the existing retry and `needs-info` stops.

Why: the Addy Osmani comparison showed stronger browser observation, threat modelling, operability, and migration methods, but the local workflow needed them as triggered, narrow evidence rather than a blanket checklist or transplanted skills.

What it costs you: `reference/vendor-facts.md` gains a pinned source matrix (Addy Osmani `agent-skills` revision `f63ec56a3cc936408d792956ae583c3c96a825bd`), and workers supply one extra evidence section per triggered quality obligation. No Addy source becomes a runtime dependency.

Object or discuss: issue #172 — https://github.com/RuralNative/RuralNative-SKILLS/issues/172.

### 2026-08-29 — Keep workflow workers live until delivery is durable (ADR-0023)

What changed: `/implement-this` and `/review-this` no longer stop a worker session or remove its worktree while code exists only in the worktree. A worker never stops itself, and only the command session may clean up. Unfinished, interrupted, failed, dirty, unpushed, SHA-mismatched, and `needs-info` workers keep their session and worktree (`preserved-for-resume` or `preserved-for-diagnosis`). Cleanup happens only after exact source recovery — terminal success, a clean worktree, and one matching local/remote/PR head SHA — plus durable pull-request evidence; a merged review PR uses the head SHAs recorded before the squash-merge, since GitHub may delete the feature branch at merge. When a worktree exists but its session is missing, the run reports `recovery-required` with the observed path and branch and never duplicates or deletes it. This narrows the ADR-0019 rule that `needs-info` stops the session and tightens when cleanup is eligible; the single verified implementation commit stays unchanged.

Why: the previous lifecycle stopped workers even when all source changes existed only in the worktree, so a stopped session and a surviving checkout could strand uncommitted or unpushed work behind Agent Manager state the workflow is forbidden to touch.

What it costs you: interrupted or failed runs keep live sessions and worktrees for longer, and cleanup waits until the pull-request head is proven recoverable on GitHub.

Object or discuss: ADR 0023 — [ADR](../adr/0023-retain-workers-until-durable.md).
