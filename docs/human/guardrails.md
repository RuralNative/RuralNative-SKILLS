<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-21 · Regenerated: #121 ponytail-audit cuts · Sources: docs/leaves/document-for-agents.md, docs/leaves/document-for-humans.md, docs/leaves/unslopify.md, docs/leaves/plan-this.md, docs/leaves/implement-this.md, docs/leaves/release-skills.md, docs/adr/0011-retire-supervise-this.md, docs/adr/0012-manager-worktree-pull-request-delivery.md -->
# Guardrails in plain words

These are the promises the skills make.

- A skill's frontmatter name matches its folder, so the registry installs the intended skill.
- The public registry is the official install path. Local install leftovers stay out of the repository.
- Documentation changes update their technical leaf in the same change.
- Prose cleanup keeps commands, code, links, quotations, and facts intact.
- Planning runs `/grill-with-docs`, `/to-spec`, and `/to-tickets` in order, with repository-owned `unslopify` cleaning prose under scope, protected-content, preservation, and completion-report rules, using only the focused agent cache `AGENTS.md → ARCHITECTURE.md → seam leaf → CONTEXT.md → relevant ADRs` (human pages are derived and not preloaded).
- Planning publishes ready tickets with native blockers and asks about unresolved decisions.
- Implementation handles one issue, loads repository-owned `unslopify` before progress with the same prose and focused-cache rules, and stops when a native blocker is open.
- Verification runs dependency install, tests, TypeScript, and the docs harness. Every check in the chain can fail.
- Standalone implementation pushes directly to `main` only after checks, review, and rebase.
- Implementation inside a Kilo Agent Manager worktree opens a pull request whose body closes its ticket on merge, posts acceptance evidence, and never closes the ticket early.
- The ready frontier contains only open, unblocked, unassigned tickets with `ready-for-agent`.
- After a ticket closes, only its newly unblocked dependents get label updates — nothing else moves.

Technical depth lives in the leaf documents named by each line.
