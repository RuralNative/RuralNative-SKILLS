<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-19 · Sources: docs/leaves/document-for-agents.md, docs/leaves/document-for-humans.md, docs/leaves/unslopify.md, docs/leaves/plan-this.md, docs/leaves/implement-this.md, docs/leaves/release-skills.md -->

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
- The planning template keeps the exact supplied prefix and substitutes only
  the task under `## Task:`, preserving `ready-for-agent`, dependency names,
  quotations, and technical meaning, with no router, command files, runtime
  scripts, or model evals. (depth: docs/leaves/plan-this.md)
- Hard dependencies are `/unslop`, `/grill-with-docs`, `/to-spec`,
  `/to-tickets` with workflow order `/grill-with-docs` → `/to-spec` →
  `/to-tickets` and `/unslop` active before the first progress update; the
  local `unslopify` stays unchanged. (depth: docs/leaves/plan-this.md)
- The skill is user-invoked only via `/plan-this <task>` and preserves the
  concise to-do list, approval gates, vertical-slice ticket design, labels,
  native dependency edges, and the final ELI18 Why / What / Where / How
  summary. (depth: docs/leaves/plan-this.md)
- The name inside implement-this must match its folder — the same front-door
  rule for the implementation adapter. (depth: docs/leaves/implement-this.md)
- The one-line install for implement-this must keep installing that exact
  skill with the explicit invocation `/implement-this #<n>` preserved as
  example `Issue #100` in place of `Issue #0`. (depth:
  docs/leaves/implement-this.md)
- The implementation template keeps the exact supplied prefix verbatim after frontmatter and substitutes only the issue reference in place of `Issue #0`, preserving exact Git commands, `ready-for-agent`, `AGENTS.md`, `docs/agents/issue-tracker.md`, `Issue #0`, `/tmp/kilo`, dependency names, quotations, and technical meaning, with no wrapper phrases `Rules preserved`, `## Installation`, `## Boundary`, `--- start of supplied`, and no router, command files, runtime scripts, or model evals. (depth: docs/leaves/implement-this.md)
- Hard dependencies are `/unslop`, `/implement`, and `/code-review` with workflow order `/implement` → `/code-review` and `/unslop` active before the first progress update, declared via the prefix plus frontmatter description, not a separate Hard dependencies section; the local `unslopify` stays unchanged. (depth: docs/leaves/implement-this.md)
- The skill is user-invoked only via `/implement-this #<n>` and preserves worktree checks, ticket authority, claiming, verification, documentation, review, rebase, push, issue comment, label removal, and closure with the final ELI18 Why / What / Where / How summary, without requiring a separate `## Rules preserved` section. (depth: docs/leaves/implement-this.md)
- The name inside release-skills must match its folder — the same front-door
  rule for the release workflow. (depth: docs/leaves/release-skills.md)
- The release workflow is invoked via release trigger phrases and auto-detects
  version files and changelogs without manual configuration. (depth:
  docs/leaves/release-skills.md)

