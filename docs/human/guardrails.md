<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-19 · Sources: docs/leaves/document-for-agents.md, docs/leaves/document-for-humans.md, docs/leaves/unslopify.md -->

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
