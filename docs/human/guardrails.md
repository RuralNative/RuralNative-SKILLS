<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-19 · Regenerated: #66 supervised resume and recovery · Sources: docs/leaves/document-for-agents.md, docs/leaves/document-for-humans.md, docs/leaves/unslopify.md, docs/leaves/plan-this.md, docs/leaves/implement-this.md, docs/leaves/supervise-this.md, docs/leaves/release-skills.md -->

# Guardrails — in plain words

The numbered promises each skill makes, said plainly. If your change breaks
one, the checker goes red. One line per promise.

- The name inside each skill must match its folder name — because the
  installer keys on that name. (depth: docs/leaves/document-for-agents.md)
- The one-line install command must keep installing that exact skill —
  because that command is the front door for every consumer. (depth:
  docs/leaves/document-for-agents.md)
- Files inside a skill are referenced by relative path only — because the
  folder must work wherever it is copied. (depth:
  docs/leaves/document-for-agents.md)
- The skill ships through the public registry only — because that is the one
  official channel. (depth: docs/leaves/document-for-agents.md)
- Leftovers from a local install are never committed — because they would
  fake a second distribution channel. (depth:
  docs/leaves/document-for-agents.md)
- The name inside the skill must match its folder name — the same front-door
  rule, kept separately for this skill. (depth:
  docs/leaves/document-for-humans.md)
- Plain-language pages are built from written docs only, never by reading
  code, issues, commit messages, or human-first docs — because summaries made
  from those rot fastest, an issue is only a discussion link and not evidence,
  and a repo without an accepted ADR leaves the journal dormant instead of
  mining commits. (depth: docs/leaves/document-for-humans.md)
- Every plain-language page says where it came from and when it was made —
  because an honest age stamp beats a confident guess. (depth:
  docs/leaves/document-for-humans.md)
- Depth links point one way, from plain pages into technical pages — because
  back-links would invite agents to trust summaries. (depth:
  docs/leaves/document-for-humans.md)
- Agents rewrite these pages but never treat them as the truth — because
  writing and trusting are different permissions. (depth:
  docs/leaves/document-for-humans.md)
- The name inside unslopify must match its folder — the same front-door rule
  for the utility. (depth: docs/leaves/unslopify.md)
- The 31 upstream patterns map to stable `AIT-*` identifiers in six families
  and the MIT notice ships — because parity must be traceable and legal.
  (depth: docs/leaves/unslopify.md)
- Scope stays with the caller and protected content stays byte for byte,
  verbatim ranges use `<!-- unslopify:off -->`/`<!-- unslopify:on -->` with no
  nesting, and an unmatched marker stops the pass — because a prose pass must
  not break code, links, or facts or expand scope on its own. (depth:
  docs/leaves/unslopify.md)
- Only English prose is revised, other languages stay unchanged, edits are
  minimal and gated, and every finding reports its identifier, family, span,
  evidence, confidence, and action — because heuristics must not damage other
  languages or invent voice. (depth: docs/leaves/unslopify.md)
- Scanning is advisory, hash-stable, and never blocks the gate, the scanner
  masks protected regions and non-English before measuring eight repeatable
  signals with versioned JSON and advisory thresholds (uniform rhythm uses one
  `AIT-STR-011` for both levels), absent Python falls back model-only without
  weakening scope, and a final preservation audit checks protected content and
  factual equality — because style signals are clues, not proof, and meaning
  must survive cleanup. (depth: docs/leaves/unslopify.md)
- The documentation skill loads `unslopify` by skill identity before any
  user-visible prose and audits again before publication, parent scope and
  parent decisions outrank style fixes, missing `unslopify` stops the workflow
  with `npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`
  while missing Python does not and the workflow continues model-only without
  weakening scope or preservation, and the skill does not copy the `AIT-*`
  catalog and installed runtime resolves by skill identity, not by a
  repository-relative path.
  (depth: docs/leaves/document-for-agents.md)
- When code and its docs disagree, code wins: the agent fixes the doc in the
  same change and flags the discrepancy. A changed rule needs a new decision.
  (depth: docs/leaves/document-for-agents.md)
- The human-docs skill loads `unslopify` by skill identity before any
  user-visible prose and audits again before publication — parent scope
  (routine passes changed sources, an audit may sweep) and parent decisions
  (factual correctness, tier routing, derivation rules, glossary, invariants,
  approval gates) outrank style fixes, missing `unslopify` stops the workflow
  with `npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`
  while missing Python does not and the workflow continues model-only without
  weakening scope or preservation, and the skill does not copy the `AIT-*`
  catalog and installed runtime resolves by skill identity, not by a
  repository-relative path, and behavior-based composition checks assert README
  routing and install order without locking whole prose passages. (depth:
  docs/leaves/document-for-humans.md)
- The name inside plan-this must match its folder — the same front-door rule
  for the workflow adapter. (depth: docs/leaves/plan-this.md)
- The one-line install for plan-this must keep installing that exact skill
  with the explicit invocation `/plan-this <task>` preserved as example
  `/plan-this Create a Next.js App`. (depth: docs/leaves/plan-this.md)
- The planning template keeps the verbatim expected prefix — workflow line,
  eight Rules bullets, final summary line, single `## Task:` substitution
  point — preserving `ready-for-agent`, dependency names, quotations, and
  technical meaning, with no wrapper markers (`Rules preserved`, `## Installation`,
  `## Boundary`, `--- start of supplied`) and no router, command files, runtime
  scripts, or model evals, file totals 18–35 lines. (depth: docs/leaves/plan-this.md)
- Hard dependencies are `/unslop`, `/grill-with-docs`, `/to-spec`,
  `/to-tickets` with workflow order `/grill-with-docs` → `/to-spec` →
  `/to-tickets` and `/unslop` active before the first progress update, declared
  via the workflow line and first Rules bullet plus frontmatter, not a separate
  Hard dependencies section; the local `unslopify` stays unchanged. (depth: docs/leaves/plan-this.md)
- The skill accepts direct user invocation `/plan-this <task>` and narrow delegation from an active `supervise-this` run and rejects unrelated invocation, and preserves those eight bullets as they appear — To-Do List, vertical slices, precision, ground decisions, labels, ELI18 question, follow skills — plus the final ELI18 Why / What / Where / How summary, without a separate `## Rules preserved` section in `SKILL.md`; standalone stops after that summary while delegated completion returns the published parent specification and ticket references to the supervisor, and the fixed-template body stays byte-for-byte unchanged across both paths with no second planning contract. (depth: docs/leaves/plan-this.md)
- The name inside implement-this must match its folder — the same front-door
  rule for the implementation adapter. (depth: docs/leaves/implement-this.md)
- The one-line install for implement-this must keep installing that exact
  skill with the explicit invocation `/implement-this #<n>` preserved as
  example `Issue #100` in place of `Issue #0`. (depth:
  docs/leaves/implement-this.md)
- The implementation template keeps the exact supplied prefix verbatim after frontmatter and substitutes only the issue reference in place of `Issue #0`, preserving exact Git commands, `ready-for-agent`, `AGENTS.md`, `docs/agents/issue-tracker.md`, `Issue #0`, `/tmp/kilo`, dependency names, quotations, and technical meaning, with no wrapper phrases `Rules preserved`, `## Installation`, `## Boundary`, `--- start of supplied`, and no router, command files, runtime scripts, or model evals. (depth: docs/leaves/implement-this.md)
- Hard dependencies are `/unslop`, `/implement`, and `/code-review` with workflow order `/implement` → `/code-review` and `/unslop` active before the first progress update, declared via the prefix plus frontmatter description, not a separate Hard dependencies section; the local `unslopify` stays unchanged. (depth: docs/leaves/implement-this.md)
- The skill is user-invoked only via `/implement-this #<n>` and via one issue delegated by an active `supervise-this` run in a dedicated Agent Manager worktree and preserves worktree checks, ticket authority, claiming, verification, documentation, review, rebase, push, issue comment, label removal, and closure with the final ELI18 Why / What / Where / How summary, without requiring a separate `## Rules preserved` section. (depth: docs/leaves/implement-this.md)
- Direct `/implement-this #<n>` use and one issue delegated by an active `supervise-this` run are the only allowed paths, and delegated use still works on only the assigned issue, stops if its blocker is open, keeps worktree safety, verification, review, rebase, push, evidence, label removal, and closure, with the template byte for byte unchanged — rejected are unrelated invokers or multi-ticket assignment. (depth: docs/leaves/implement-this.md)
- The name inside supervise-this must match its folder — the same front-door rule for the coordinator. (depth: docs/leaves/supervise-this.md)
- The one-line install for supervise-this must keep installing that exact skill with explicit invocations `/supervise-this <task>` and `/supervise-this #<spec>` and the planning and implementation fields preserved. (depth: docs/leaves/supervise-this.md)
- Invocation accepts task text plus planning model, planning variant, implementation model, and implementation variant, with review model and review variant together defaulting to the confirmed planning selection when both are omitted; a partial review or any missing required field produces one ELI18 decision before any session starts. (depth: docs/leaves/supervise-this.md)
- Every model name and variant is resolved through `agent_manager_models` with no hard-coded model allowlist; catalog model names and qualified provider and model identifiers are accepted and each variant is verified against the resolved model. (depth: docs/leaves/supervise-this.md)
- The user sees and approves the exact resolved planning, implementation, and review selections before execution; an unavailable or ambiguous model or variant pauses planning and never triggers an unapproved fallback. (depth: docs/leaves/supervise-this.md)
- The planning phase starts as an Agent Manager local session with the confirmed planning model and variant and a delegated `plan-this` task, the skill does not claim to change the model of the current Kilo session, and the delegated session honors all `plan-this` approval gates and returns the published specification and ticket references to the supervisor. (depth: docs/leaves/supervise-this.md)
- Before implementation starts, one structured parent comment records the resolved planning, implementation, and review model and variant selections. (depth: docs/leaves/supervise-this.md)
- The supervisor reads the structured model configuration recorded by #67 before starting implementation and treats the newest valid structured parent comment as authority, records a fixed implementation review base before the first worktree, and the ready frontier contains only open child tickets with no open native blocker, the `ready-for-agent` label, and no assignee, with no blocked or assigned scheduling. (depth: docs/leaves/supervise-this.md)
- One Agent Manager worktree per selected ticket and no more than three active, every worker gets one delegated `implement-this` issue plus the exact confirmed implementation model and variant, follow-ups use the same selection, never replaces an unavailable model with an inherited or cheaper fallback, uses `list` for live IDs without editing `.kilo/agent-manager.json` or inventing IDs, and does not copy the planning or implementation prefixes. (depth: docs/leaves/supervise-this.md)
- A ticket is complete only when GitHub shows it closed with evidence and a commit reachable from `origin/main`, idle alone is not success, and completed work frees a slot to start newly unblocked tickets in parent order. (depth: docs/leaves/supervise-this.md)
- After children land the supervisor runs full verification, integrated `code-review` starts locally with the exact confirmed review model and variant, the recorded base, and #62 as authority, final review does not inherit the supervisor or implementation model unless that model is the recorded review selection. (depth: docs/leaves/supervise-this.md)
- Parent evidence includes all phase model selections, review base, checks, commits, ticket links, and review outcome, and the supervisor closes #62 only when all children are closed, checks pass, and the integrated review has no confirmed finding, never closing early and never with more than three worktrees. (depth: docs/leaves/supervise-this.md)
- `/supervise-this #<parent-spec>` resumes an existing supervised run without creating a duplicate specification or duplicate child ticket, reads the newest valid structured planning, implementation, and review configuration from the parent, and a missing or malformed configuration produces one ELI18 decision before any new session starts. (depth: docs/leaves/supervise-this.md)
- Resume mode reconstructs durable issue and commit state before consulting live Agent Manager sessions from the parent specification, child and follow-up issues, native dependencies, labels, evidence comments, commits on `origin/main`, and the newest valid phase model configuration, then reconciles that record with live Agent Manager sessions and resumes only missing ready work, with Agent Manager `list` remaining the source of live session and worktree IDs and stale or missing sessions not erasing durable progress. (depth: docs/leaves/supervise-this.md)
- Before creating a missing session the supervisor resolves the recorded model through `agent_manager_models` and verifies the recorded variant, reuses every available recorded selection exactly without substituting the current supervisor model, pauses only phases that require an unavailable recorded model or variant with `needs-info` and asks the user for one replacement decision with a recommendation, and an approved replacement produces a new structured parent configuration comment while preserving the earlier comment as history, never falling back silently. (depth: docs/leaves/supervise-this.md)
- The supervisor does not duplicate a worker for an open assigned ticket or for a ticket whose active session is already known, a restarted implementation or follow-up worktree receives the recorded implementation model and variant, and a restarted final-review session receives the recorded review model and variant. (depth: docs/leaves/supervise-this.md)
- An idle, waiting, retrying, or offline worker with an open issue triggers evidence inspection before any prompt, a scoped mechanical failure receives at most one focused recovery prompt in the existing session, a worker that cannot finish is inspected and receives one focused recovery prompt in the existing selected-model session with `needs-info` escalation, a still-blocked ticket gains `needs-info` with the concrete blocker and asks one ELI18 decision with a recommendation, unrelated ready tickets continue while the blocked ticket and its descendants wait, and native dependency state prevents descendants from starting until every blocker closes. (depth: docs/leaves/supervise-this.md)
- Confirmed integrated-review findings become the smallest independently verifiable follow-up tickets linked to the parent with native blocking edges where order matters, follow-up tickets use the recorded implementation model and variant, and every final-review rerun uses the recorded review model and variant. (depth: docs/leaves/supervise-this.md)
- The supervisor runs no more than two automatic follow-up and final-review rounds, and findings left after the second round gain `needs-info` and return to the user instead of creating an unlimited loop. (depth: docs/leaves/supervise-this.md)
- Parent evidence includes the phase model configuration, review base, integrated commits, checks, planned and follow-up ticket links, recovery decisions, and final review outcome. (depth: docs/leaves/supervise-this.md)
- The name inside release-skills must match its folder — the same front-door
  rule for the release workflow. (depth: docs/leaves/release-skills.md)
- The release workflow is invoked via release trigger phrases and auto-detects
  version files and changelogs without manual configuration. (depth:
  docs/leaves/release-skills.md)

<!-- regenerated: 2026-08-19 for #66 supervised resume and recovery -->
