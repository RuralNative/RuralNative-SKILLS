<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-19 · Sources: docs/adr/0001-distribute-as-public-catalog-shelf.md, docs/adr/0002-adopt-ten-check-gate.md, docs/adr/0003-human-first-derived-artifacts.md, docs/adr/0004-verb-named-skills-flat-shelf.md, docs/adr/0005-unslopify-utility-identity-and-hard-dependency.md, docs/adr/0006-plan-this-fixed-template-adapter.md, docs/adr/0007-supervise-this-coordinator.md -->

# Decision journal — in plain words

What the repository decided, when, and what it costs you. One entry per
accepted decision, newest last. Each entry links the full decision record and
the issue where the decision was made — object there before a big change lands.

### 2026-08-11 — The skill goes public on the registry

What changed: the repository became a public shelf, and the skill moved into a
folder named for its identity so the registry can find and install it.

Why: a private repository is invisible to the skill registry, and the registry
lane — not a manual copy — is the official way to distribute the skill.

What it costs you: the repository stays public, and installs happen through
the registry lane.

Object or discuss: ADR 0001 — the [decision record](https://github.com/RuralNative/RuralNative-SKILLS/blob/main/docs/adr/0001-distribute-as-public-catalog-shelf.md) and its [issue](https://github.com/RuralNative/RuralNative-SKILLS/issues/1).

### 2026-08-18 — The docs gate grows a rule that guards the rules

What changed: the documentation checker now also guards the invariants — the
numbered promises each skill makes — so a duplicated or orphaned rule number
fails the check instead of slipping through.

Why: a project using this skill shipped a duplicated rule number through a
green gate; that is exactly the kind of silent drift the skill exists to stop.

What it costs you: every rule now carries a number and a reason, and a retired
rule number is never reused.

Object or discuss: ADR 0002 — the [decision record](https://github.com/RuralNative/RuralNative-SKILLS/blob/main/docs/adr/0002-adopt-ten-check-gate.md) and its [issue](https://github.com/RuralNative/RuralNative-SKILLS/issues/20).

### 2026-08-18 — The docs speak in two voices: one for agents, one for people

What changed: the repository now keeps plain-language summaries for people —
this journal, an overview, guardrails, and data-flow stories — and those
summaries are carved out of the agent-facing docs, never from the code.

Why: plain-language restatements go stale faster than any other document, and
the only workforce that can keep them fresh is the agents doing the work — so
agents regenerate them, and are told never to treat them as the source of
truth.

What it costs you: when a big change lands, this journal is where it shows up
first, and it is the place to object before the change is final.

Object or discuss: ADR 0003 — the [decision record](https://github.com/RuralNative/RuralNative-SKILLS/blob/main/docs/adr/0003-human-first-derived-artifacts.md) and its [issue](https://github.com/RuralNative/RuralNative-SKILLS/issues/28).

### 2026-08-18 — The skills get verb names, and there is no router

What changed: the two skills were renamed to start with a doing-word and say
who they serve — document-for-agents and document-for-humans — and the shelf
stays flat: no parent skill that picks between them.

Why: names that lead with the action are easier to choose correctly, and a
router skill would cost every session a detour to re-learn what the skill
descriptions already say for free.

What it costs you: if you installed a skill under its old name, the install
command changes — reinstall with the new name.

Object or discuss: ADR 0004 — the [decision record](https://github.com/RuralNative/RuralNative-SKILLS/blob/main/docs/adr/0004-verb-named-skills-flat-shelf.md) and its [issue](https://github.com/RuralNative/RuralNative-SKILLS/issues/35).

### 2026-08-19 — Unslopify arrives as an audience-neutral utility

What changed: a third skill, unslopify, joined the shelf to clean AI tells
from explicit prose. It carries the 31 upstream patterns with stable `AIT-*`
identifiers and the upstream MIT notice, and both documentation skills now
enforce it as a hard dependency that loads before user-visible prose and
audits again before publication.

Why: the same AI-tell patterns appear in agent docs and human docs. A single
utility avoids copying the same 31 rules into two places and inventing a false
audience split with two suffixed names.

What it costs you: `unslopify` installs alone with one command for prose
cleanup, and documentation workflows require it. If the skill is absent the
workflow stops with `npx skills add RuralNative/RuralNative-SKILLS --skill
unslopify`; missing Python does not block because scanning stays advisory.

Object or discuss: ADR 0005 — the [decision record](https://github.com/RuralNative/RuralNative-SKILLS/blob/main/docs/adr/0005-unslopify-utility-identity-and-hard-dependency.md) and its [issue](https://github.com/RuralNative/RuralNative-SKILLS/issues/40).

### 2026-08-19 — Fixed-template workflow adapters for planning and implementation

What changed: two workflow skills, `plan-this` and `implement-this`, joined the shelf as fixed-template adapters. Each preserves its supplied prefix verbatim and substitutes only the task under `## Task:` or the issue reference for `Issue #0`, delegates to its hard dependencies, and stays user-invoked via `/plan-this <task>` and `/implement-this #<n>` with no router or runtime scripts.

Why: pasting long prefixes wastes tokens, weakens prompt caching, and lets workflow rules drift. A thin adapter keeps the process fixed while accepting only the varying input.

What it costs you: the shelf now lists four skills; the naming convention carries a narrow task-scoped exception for these adapters, and `/unslop` stays the external prose dependency.

Object or discuss: ADR 0006 — the [decision record](https://github.com/RuralNative/RuralNative-SKILLS/blob/main/docs/adr/0006-plan-this-fixed-template-adapter.md) and its [issue](https://github.com/RuralNative/RuralNative-SKILLS/issues/51).

### 2026-08-19 — Supervise-this coordinates model-aware runs

What changed: a coordinator skill `supervise-this` joined the shelf. It takes explicit planning, implementation, and optional review model and variant choices, resolves each through `agent_manager_models` with no hard-coded allowlist, shows the exact resolved configuration for approval, starts planning as a local Agent Manager session that delegates to `plan-this`, and records the resolved configuration on the parent for later resume.

Why: planning and implementation need different cost and quality levels, and manual worktree and spec handling is slow. Validating choices against the live catalog, asking once for missing input, confirming the exact resolved names, and reusing existing adapter contracts keeps the supervisor thin and avoids stale lists.

What it costs you: you supply planning and implementation model and variant before the task, review defaults to planning when both are omitted, a partial review or missing field asks one ELI18 question before any session, and an unavailable model or variant pauses without a silent fallback. The coordinator never claims to change the current Kilo session model.

Object or discuss: ADR 0007 — the [decision record](https://github.com/RuralNative/RuralNative-SKILLS/blob/main/docs/adr/0007-supervise-this-coordinator.md) and its [issue](https://github.com/RuralNative/RuralNative-SKILLS/issues/62).

### 2026-08-19 — Supervise-this extends to happy-path execution

What changed: `supervise-this` now runs the full happy path after planning. It reads the structured model configuration recorded by #67 before starting implementation, records a fixed implementation review base before the first worktree, computes the ready frontier as open child tickets with no open blocker, the `ready-for-agent` label, and no assignee, creates one Agent Manager worktree per selected ticket with at most three active at once and sends each worker one delegated `implement-this` issue plus the exact confirmed implementation model and variant. Every follow-up uses the same implementation selection and the supervisor never replaces an unavailable model with an inherited or cheaper fallback. It uses Agent Manager `list` for live IDs and never edits `.kilo/agent-manager.json` or invents IDs, does not copy adapter prefixes, and does not schedule blocked or assigned tickets. A ticket is complete only when GitHub shows it closed with evidence and a commit reachable from `origin/main`; idle alone is not success, and freed slots refill newly unblocked tickets in parent order. After children land it runs full verification then integrated `code-review` locally with the exact confirmed review model and variant, the recorded base, and #62 as authority; the final review does not inherit the supervisor or implementation model unless that model is the recorded review selection. It posts parent evidence with all phase selections, review base, checks, commits, ticket links, and review outcome, and closes #62 only when all children are closed, checks pass, and the integrated review has no confirmed finding.

Why: planning alone leaves manual frontier management, worktree caps, durable proof, verification, and whole-spec review undone. Extending the coordinator to own bounded concurrency, live-state polling via `list`, durable completion gates, and parent closure keeps the adapters as single sources while ensuring the specification lands completely.

What it costs you: ready frontier is strictly unblocked, unlabeled, and unassigned; more than three worktrees never start at once; unavailable models pause without fallback; idle never counts as success; parent closure requires evidence, checks, and a clean final review.

Object or discuss: ADR 0007 — the [decision record](https://github.com/RuralNative/RuralNative-SKILLS/blob/main/docs/adr/0007-supervise-this-coordinator.md) and its [issue](https://github.com/RuralNative/RuralNative-SKILLS/issues/65).

### 2026-08-19 — Supervise-this completes resume, recovery, and review loop

What changed: `supervise-this` now resumes interrupted and imperfect runs. `/supervise-this #<parent-spec>` resumes without creating a duplicate specification or duplicate child ticket, reads the newest valid structured planning, implementation, and review configuration with a missing or malformed configuration producing one ELI18 decision before any new session, reconstructs durable progress from the parent specification, child and follow-up issues, native dependencies, labels, evidence comments, commits on `origin/main`, and the newest valid phase model configuration before consulting live Agent Manager sessions and reconciles with `list` where stale or missing sessions do not erase durable progress, revalidates each recorded model through `agent_manager_models` before creating any missing session and preserves every available selection exactly without substituting the current supervisor model, pauses only phases that require an unavailable recorded model or variant with `needs-info` and asks the user for one replacement decision with a recommendation while an approved replacement produces a new structured parent configuration comment preserving the earlier comment as history, does not duplicate a worker for an open assigned ticket or active session, restarts implementation or follow-up worktrees with the recorded implementation model and variant and restarts final-review with the recorded review model and variant, inspects evidence before prompting any idle, waiting, retrying, or offline worker and sends at most one focused recovery prompt in the existing selected-model session for a scoped mechanical failure with still-blocked tickets gaining `needs-info` and one ELI18 decision while unrelated ready tickets continue and descendants remain blocked until dependencies close, creates confirmed integrated-review findings as the smallest independently verifiable follow-up tickets linked to the parent with native blocking edges where order matters using the recorded implementation selection and reruns every final-review with the recorded review selection, runs no more than two automatic follow-up and final-review rounds with findings left after the second round gaining `needs-info`, and posts parent evidence with phase model configuration, review base, integrated commits, checks, planned and follow-up ticket links, recovery decisions, and final review outcome before closure.

Why: long runs fail or produce findings that need correction, and recreating specifications or substituting models silently would break durability. Reconstructing durable state first, revalidating recorded selections exactly, recovering with a single prompt while keeping other frontier work moving, and capping automatic fixes at two rounds keeps the workflow resilient without endless loops.

What it costs you: resume never duplicates specs or tickets; catalog revalidation happens before any missing session; unavailable selections pause only their phases with one decision; replacement preserves history; interrupted workers restart with their recorded selection; only one recovery prompt per failure; blocked tickets and their descendants wait while unrelated work continues; follow-ups use the recorded implementation selection and reviews use the recorded review selection for at most two rounds before escalation.

Object or discuss: ADR 0007 — the [decision record](https://github.com/RuralNative/RuralNative-SKILLS/blob/main/docs/adr/0007-supervise-this-coordinator.md) and its [issue](https://github.com/RuralNative/RuralNative-SKILLS/issues/66).
