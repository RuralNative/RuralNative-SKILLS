<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-09-05 · Regenerated: ADR-0031 single-target production workflows (no Agent Manager, workers, waves, or cloud review; one ticket or pull request in the current checkout) + ADR-0029 unslopify session-start setup and plain language + ADR-0030 larger orientation ceilings: unslopify now maintains one owned block in the project's root AGENTS.md so later sessions load it before the first reply (the install CLI has no setup hook, so one invocation per project establishes this), drafts all model-authored English in plain language with a silent pre-send check, and always replaces load-bearing, smoking gun, and smoke test phrasing under AIT-LEX-009 while vertical slice and native dependency edges stay context-aware; every document and orientation ceiling rose 50 percent (ordinary 9,000, API or route 13,500, schema or data 18,000, re-orientation 10,500, absolute 18,000 bytes; index 225 lines, three-minute leaf read, 105-line policy budget, 3-8 initial invariants, review past about 23) while ceilings stay caps, not targets, the trimming order is unchanged, and no existing document was padded to fill the room; ADR-0028 adaptive doc-cache governance: the doc-cache tier now grows itself (minimal to standard to full) as evidence appears — a durable decision, more seams, or coordination need — and never shrinks automatically; every lifecycle run first resolves the tier, the private diagnostics consent, and the decision frontier; decisions record their context, alternatives, and rejection reasons before code work, and lost rationale is recovered only from cited evidence or marked unknown; each documented seam now carries a code fingerprint that fails the check when the docs drift from the code, in a working tree and in clean CI alike, and refreshing it requires reviewing the affected claims; #190 versioned requirements revision: the dispatch packet, acceptance evidence, and review wave carry one SHA-256 fingerprint of the canonical affected seams, criteria, constraints, blockers, settled decisions, risk, and verification intent from the parent and ticket bodies; a body edit stops delivery, review publication, and merge with `needs-info` until the body is reconciled and the user resumes, with no waiver; #189 fewer, simpler planning questions (ADR-0027): planning asks only when repository facts and the confirmed task cannot decide a choice that changes product behavior, scope, cost, risk, or an action that is hard to undo; a complete settled task reaches the preview without a forced question; questions use one plain sentence, at most three short options, and one short recommendation with technical terms explained; previews stay plain; explicit approval alone publishes; #187 dependency reconciliation now controls worker setup (spec #183 AC-11): a worker runs dependency setup only when `reconcileDependencyState` reports missing or changed state, unchanged state reuses the worktree setup, every worktree keeps its own dependency directory, and no instruction tells every worker to always run `npm ci`; #186 keeps unslopify reports out of normal chat (ADR-0026): publication stays silent, published artifacts carry no audit block, and an explicit audit request returns the full report; #185 planning stops when risk evidence is missing: a high-risk trigger without evidence is an internal incomplete result that blocks publication and risk labeling; published tickets keep only `ordinary`/`high-risk` with upward-only escalation; #188 stable acceptance criterion IDs across planning, implementation, and review: plan-this publishes criteria with local `AC-N` IDs, implementation dispatches and proves evidence by ID with retired IDs never accepted, and review Spec findings and whole-spec verification cite the stable `#<issue>:AC-N` key; #179 workflow commands consume bounded orientation (ADR-0024): planning preflights each proposed ticket, implementation resolves current sources before broad loading with one direct-ticket resolution attempt, and review resolves one set per pinned revision pair, stopping before broad loading when the set is over budget and reporting its exact sources; retain workflow workers until delivery is durable (ADR-0023): workers never stop themselves, cleanup only after exact source recovery, recovery-required for a missing session; 2026-08-29 #178 migration: compact seam index, redirect-tier leaves, declared routes, check 11 active; #177 bounded orientation (ADR-0024): runtime orientation sets with strict byte caps, the harness-owned coverage manifest, and the Improve path; #172 triggered quality proof: conditional evidence sections for browser, security, operability, migration, and performance with pinned Addy provenance; #171 worker evidence contract (ADR-0021); #173 frontier review authority (ADR-0022): frontier-owned review judgment and merge, one live-catalog execution model per wave, mutation-worker boundaries, category transport, axis-preserving deduplication, specialist routing · Sources: docs/adr/0001-distribute-as-public-catalog-shelf.md, docs/adr/0002-adopt-ten-check-gate.md, docs/adr/0003-human-first-derived-artifacts.md, docs/adr/0004-verb-named-skills-flat-shelf.md, docs/adr/0005-unslopify-utility-identity-and-hard-dependency.md, docs/adr/0006-plan-this-fixed-template-adapter.md, docs/adr/0007-supervise-this-coordinator.md, docs/adr/0008-supervise-this-agent-orchestrator.md, docs/adr/0009-delegation-invariants-human-invocation.md, docs/adr/0010-supervise-by-delivery-evidence.md, docs/adr/0011-retire-supervise-this.md, docs/adr/0012-manager-worktree-pull-request-delivery.md, docs/adr/0013-review-this-decoupled-code-review.md, docs/adr/0014-three-skill-development-workflow.md, docs/adr/0015-requirements-data-trust-and-install-provenance.md, docs/adr/0016-unslopify-always-on-output-contract.md, docs/adr/0017-doc-cache-attention-boundary.md, docs/adr/0018-opt-in-skill-diagnostics.md, docs/adr/0019-command-session-lifecycle-and-platform-limits.md, docs/adr/0020-plan-this-structured-workflow.md, docs/adr/0021-implement-this-worker-evidence-contract.md, docs/adr/0022-frontier-review-authority-and-mutation-worker-routing.md, docs/adr/0023-retain-workers-until-durable.md, docs/adr/0024-bounded-orientation.md, docs/adr/0025-required-orientation-sources.md, docs/adr/0028-adaptive-doc-cache-governance.md, docs/leaves/implement-this.md, docs/adr/0029-unslopify-session-start-and-plain-language-live-output.md, docs/adr/0030-larger-orientation-ceilings.md, docs/adr/0031-single-target-production-workflows.md -->
# Decision journal in plain words

This is the short record of accepted repository decisions. The full reasoning lives in the ADR files.

### 2026-09-02 — Let unslopify keep its sessions and say things plainly (ADR-0029)

What changed: `unslopify` now maintains exactly one owned block in your project's root `AGENTS.md` so every later session loads the skill before the first reply. The block goes directly after the `document-for-agents` management marker when one exists, otherwise after frontmatter or at the very top. Repeated checks are silent, a stale block's body is refreshed in place, and duplicate, unmatched, reversed, or nested markers, symlinked or externally generated files, and denied writes all leave the file untouched with a plain explanation. All model-authored English follows two plain-language layers — lead with the practical point, common words, one choice at a time, terms explained at first use, plus a silent pre-send cleanup of jargon and inflated wording. `load-bearing`, `smoking gun`, and `smoke test` become always-replace phrases (`AIT-LEX-009`, scanner behavior 1.1), narrowing ADR-0015's exact-use exception for `load bearing`; `vertical slice` and `native dependency edges` stay context-aware.

Why: the install CLI has no setup hook, so only a file the skill maintains itself can make later sessions load it — and clever-name phrases hid their concrete point from readers outside the project.

What it costs you: the first load may leave one intentional tracked change in `AGENTS.md`, reported once and never committed automatically; the three clever-name phrases now get rewritten even when technically correct in ordinary prose.

Object or discuss: ADR 0029 — [ADR](../adr/0029-unslopify-session-start-and-plain-language-live-output.md).

### 2026-09-02 — Give essential documentation 50 percent more room (ADR-0030)

What changed: every `document-for-agents` size ceiling rose by 50 percent: the compact index stays under 225 lines, a leaf doc at most a three-minute read, a policy doc within 105 lines, a dependency entry about 15 lines, a leaf establishes 3–8 invariants, and the complexity review triggers past about 23 — review, never an automatic split. Task-band orientation caps became 9,000 ordinary, 13,500 API or route, 18,000 schema or data, 10,500 re-orientation, and 18,000 absolute bytes, in all four self-contained workflow copies and the harness, kept in agreement by a repository-level parity test.

Why: an ordinary route combining the index and one leaf already approached the old 6,000-byte cap before required glossary or decision text, so essential information was being trimmed to fit rather than because it was nonessential.

What it costs you: a little more context per task. The ceilings stay strict caps, not targets — nothing is padded to fill them, the trimming order is unchanged, an essential rule is never silently truncated, and small units (ADR sentences, glossary definitions, routing lines) keep their limits.

Object or discuss: ADR 0030 — [ADR](../adr/0030-larger-orientation-ceilings.md).

### 2026-09-01 — Stop stale work when requirements change (ticket #190)

What changed: a versioned requirements revision fingerprints the canonical authoritative sections of the parent specification and ticket body — affected seams, criterion IDs/text/status, structural constraints, blockers, settled decisions, risk, and verification intent. The fingerprint uses SHA-256 from the standard library, normalizes line endings and trailing whitespace, and never reads comments, acceptance evidence, timing summaries, paths, branches, commit SHAs, or runtime output. The same value rides the dispatch packet, the acceptance evidence block, and the review wave; delivery, review publication, and merge compare the current issue bodies against it. A changed body stops with `needs-info` until the body is reconciled and the user resumes. No worker or reviewer can waive a mismatch, and a requirement discussed in a comment counts only after it is copied into the issue body.

Why: edited issue requirements were not pinned, so delivery and review could follow stale text while only code revisions were frozen.

What it costs you: one fingerprint value per ticket travels with the packet and evidence, and the three workflow commands gain the stop-and-reconcile path.

Object or discuss: issue #190 — https://github.com/RuralNative/RuralNative-SKILLS/issues/190.

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

### 2026-09-01 - Ask only when a human must decide (ADR-0027)

Planning asks a question only when repository facts and the confirmed task cannot decide a choice, and the choice changes product behavior, scope, cost, risk, or an action that is hard to undo. A complete task with a settled solution reaches the publication preview without a forced question; the fresh-run decision round and forced capsule confirmation are gone. Every question still states the choice in one plain sentence, uses at most three short options, gives one short recommendation, and explains any needed technical term in plain words. Repository facts, standard safe defaults, reversible implementation choices, and internal process choices never become user questions. Explicit approval remains the only action that publishes.

Why: settled tasks paid for a question they could not use, and a word like `ELI18` hid the real choice from a general reader.

What it costs: the five phases, intent capsule, three-direction exploration gate, and publication guarantees of ADR-0020 stay; only the forced decision-round clause is narrowed.

Depth: `docs/adr/0027-plan-this-ask-when-a-human-must-decide.md`.

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

### 2026-08-29 — Bound orientation in bytes and repair existing caches through Improve (ADR-0024)

What changed: attention control became machine-enforced. Each task now resolves its own orientation set at runtime — the compact architecture index, the whole affected seam leaf, the glossary entries that leaf names, and the accepted decisions or policies it links — and that set must fit a strict byte cap (6,000 ordinary, 9,000 API or route, 12,000 schema or data, 7,000 re-orientation, 12,000 absolute). Duplicate sources count once, superseded decisions stay out of current guidance unless a leaf requires them, and an over-budget route fails before the content is broadly read, reporting the task band, resolved bytes, cap, source count, and sources. The exhaustive doc inventory moved out of the index into a harness-owned coverage manifest that no task reads; the harness now runs an eleventh check, `Orientation budget`. Audit stays read-only. A new Improve path repairs an older bloated cache: it diagnoses, shows one complete migration preview, waits for one explicit approval, applies the approved trims, additions, moves, deletions, manifest changes, and generated-doc actions, and finishes only after the prose audit and harness pass.

Why: budgets had been prose-only, so a growing repository's own index and leaves exceeded their published caps; the ten-check gate had no machine-enforced budget; and the Audit branch could diagnose an older cache but no branch could apply the approved repair, so the skill appeared reluctant to finish.

What it costs you: one approval before any Improve run changes the repository, and migration ticket-by-ticket as this repository's own leaves come within their caps; the exact-ten-check clause of ADR-0017 yields to this decision.

Object or discuss: ADR 0024 — [ADR](../adr/0024-bounded-orientation.md) and issue #177 — https://github.com/RuralNative/RuralNative-SKILLS/issues/177.

### 2026-08-30 — Workflow commands consume bounded orientation (plan 179, parent spec #176)

What changed: the three workflow commands now consume the orientation contract instead of relying on a fixed read route. `plan-this` resolves an orientation set for every proposed ticket from its affected seams before publication approval and rejects a ticket whose required set exceeds its selected cap; affected seam names stay the durable join key and no ticket field transports paths, anchors, invariant lists, glossary excerpts, or policies. `implement-this` resolves current orientation sources in the worker checkout before broad documentation loading, records the compact durable summary (task band, resolved bytes, cap, source count, cache-gap state) with the existing timing and acceptance evidence, and gives a direct ticket with valid affected seams the same bounded path; a ticket without valid seam metadata gets one resolution attempt against the compact architecture index and code roots, and ambiguity adds `needs-info` and stops before edits. `review-this` resolves orientation sources once per pinned head-and-base pair and shares the compact evidence in the existing revision packet across Standards and Spec without publishing full path lists on successful routine work.

Why: tickets stayed behavior- and verification-focused while orientation sources stayed runtime-resolved, so unrelated documentation growth could not change one task's cost and no implementation fallback read every leaf, ADR, policy, or derived human documentation tree.

What it costs you: nothing observable changes for planned tickets with valid affected seams; a ticket without valid seam metadata may stop with `needs-info` instead of guessing.

Object or discuss: issue #179 — https://github.com/RuralNative/RuralNative-SKILLS/issues/179.

### 2026-08-30 — Review orientation stops on an over-budget set (review round 1 on #179)

What changed: `review-this` now follows the same preflight stop semantics as `plan-this` and `implement-this`. The pure orientation resolution for a pinned head-and-base pair returns a `stop` decision when its resolved set exceeds the selected cap, and the exact source list travels with the resolution instead of being silently dropped; a cache-gap substitution still publishes the source list without ever waiving the cap. The resolution also consumes the pinned pair and surfaces it in the result, so a different head or base produces a distinct resolution rather than identical evidence.

Why: the first review round found the resolver computed `withinBudget` but never acted on an over-budget result, so it could not report the task band, resolved bytes, cap, source count, and exact sources that ADR-0024 requires on an over-budget route, and the pair-pinning test asserted identical evidence for different bases, contradicting its own title.

What it costs you: an over-budget review route now stops before broad loading and names its exact sources instead of continuing; nothing changes for sets that fit their caps.

Object or discuss: issue #179 — https://github.com/RuralNative/RuralNative-SKILLS/issues/179.

### 2026-08-31 — Separate required sources from compact citations (ADR-0025)

What changed: a leaf link no longer carries unstated loading intent. The orientation set loads only the sources a leaf explicitly declares required — `- Glossary: CONTEXT.md — Term.` loads the named glossary entry, and `- Decision: … — requires.` or `- Policy: … — requires.` loads that source. A compact citation, a bare `- Decision:` or `- Policy:` bullet or a prose mention without the `— requires.` clause, stays visible navigation and never loads. A rejected decision never enters the set even when declared required; superseded ADRs load only when declared required.

Why: every leaf link used to imply loading intent, so an agent could not tell navigation from required reading without opening the source, and the prior rule loaded all linked accepted ADRs, making compact citations as expensive as required ones.

What it costs you: nothing observable changes for routes that already fit their caps; a leaf that used a bare link to mean "read this" must now write the explicit declaration.

Object or discuss: issue #184 — https://github.com/RuralNative/RuralNative-SKILLS/issues/184.

### 2026-08-31 — Keep acceptance criteria stable across planning, implementation, and review (#188)

What changed: an acceptance criterion now carries a local ID unique within its own issue, published as `- \`AC-1\`: text`, and the stable criterion key is the authority issue number plus that local ID, so two issues may both use `AC-1`. Clearer wording keeps the same ID; changed observable behavior gets a new ID and retires the old one, and retired IDs are never reused or accepted as active evidence. Implementation dispatches criteria as records (ID, text, and active or retired status), workers cite and prove evidence by ID rather than by full sentence text, and review Spec findings and whole-spec verification reference the same stable key (`#<issue>:AC-N`) instead of prose.

Why: criteria previously traveled as full-text strings, so one requirement had no stable handle across planning, worker evidence, and review, and a wording tweak could orphan or duplicate evidence.

What it costs you: ticket bodies carry one ID per criterion, workers must match evidence to an ID, and review findings name the stable key; a safe clarification no longer renumbers criteria.

Object or discuss: issue #188 — https://github.com/RuralNative/RuralNative-SKILLS/issues/188.

### 2026-09-02 — Let the documentation cache govern itself (ADR-0028)

What changed: the documentation tier is no longer a one-time guess. Every lifecycle run opens by settling three gates: the tier this cache needs now, whether you want the private mistake log, and whether any decision still lacks its written rationale. The tier only grows — minimal to standard to full — and the promotion applies in the same run that notices the need: a durable decision or more than one independently editable seam raises the tier, and so does a proven code/doc contradiction, multi-agent coordination, or a code-derived document. The tier never shrinks on its own; shrinking still needs the one-preview Improve approval. Audit stays read-only and only reports the promotion it would apply.

Decisions are now written while their reasoning is still fresh. Before the work starts, the agent records the choice, its context, the alternatives it genuinely considered and why they lost, and the consequences. A newly discovered tradeoff pauses the work until it is recorded. Old decisions with missing reasoning are recovered only from cited evidence into a separate clarification record, and where the evidence is not there the gap is honestly marked unknown. A stale fingerprint in the issue is what blocks delivery when requirements change, and a stale seam fingerprint is now what blocks the doc check when documentation drifts from code — in a working tree and in a clean CI checkout alike. The doc check stays at eleven checks; the old touch-only freshness check is replaced by this one.

The mistake log now has a checkpoint you cannot skip: the skill asks once on first run and remembers your answer in a private file outside version control. Absent, corrupt, or unsaved state asks again, and a failed save never enables logging. All the earlier privacy promises stand.

Why: the cache was sized once at setup, so projects outgrew their tier and nobody rebuilt; decisions were written only when superseding an old one, so the first and most forgettable rationale was the one most often skipped; consent lived in prose with no checkpoint, so the log was rarely offered; and the old check only compared the working tree, so a clean CI checkout could not see documentation drift at all.

What it costs you: one consent question on the first run of the revised skill, a rationale block before ADR-worthy work starts, and a reviewed fingerprint refresh whenever a seam's documentation is touched. The reward is a doc cache that stays the right size, keeps its reasoning, and fails loudly when it lies.

Object or discuss: ADR 0028 — [ADR](../adr/0028-adaptive-doc-cache-governance.md).

### 2026-09-05 — Single-target production workflows (ADR-0031)

What changed: `/implement-this` implements exactly one open ticket in the current checkout and delivers one pull request with compact evidence in its body; `/review-this` reviews exactly one pull request in the same checkout with one frontier Standards-plus-Spec pass, at most one fix round through the optional configured `review-fixer` subagent, and one-check CI gating with verdict reuse. No Agent Manager calls, worktrees, workers, waves, polling, cloud review, or post-merge verification remain.

Why: Agent Manager setup, polling, recovery, and repeated review and verification passes dominated elapsed time.

What it costs you: concurrent checkouts are user-managed outside these commands; a cheaper fix model needs an explicit `review-fixer` configuration or review stops with published findings.
