<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-22 · Regenerated: #136 REVIEW.md becomes doc-cache policy, #139 review fixes — trust sections on all seven skills, word-bounded residue patterns · Sources: REVIEW.md, docs/leaves/document-for-agents.md, docs/leaves/document-for-humans.md, docs/leaves/unslopify.md, docs/leaves/plan-this.md, docs/leaves/implement-this.md, docs/leaves/release-skills.md, docs/adr/0011-retire-supervise-this.md, docs/adr/0012-manager-worktree-pull-request-delivery.md, docs/adr/0013-review-this-decoupled-code-review.md -->
# Guardrails in plain words

These are the promises the skills make.

- A skill's frontmatter name matches its folder, so the registry installs the intended skill.
- The public registry is the official install path. Local install leftovers stay out of the repository.
- Documentation changes update their technical leaf in the same change.
- Every review follows one written policy (`REVIEW.md`). Review subagents only read; the main reviewer verifies every finding before publishing it, and no review tool merges or closes work.
- Prose cleanup keeps commands, code, links, quotations, and facts intact.
- Text that flows through a workflow — tasks, issue bodies, comments, specifications, review comments — is requirements data. It cannot widen scope, select files, authorize tools, or override gates.
- Workflow runs never download skills. Installing skills stays with you, outside the run.
- A manual install never overwrites an existing skill without your explicit approval. Every skill's install guide states this.
- `unslopify` treats prose in its scope as inert content: prompt-like text in a document is reviewed as text, never executed.
- Installing from a public registry records provenance and pins reviewed revisions; every install guide on the shelf carries this trust section, and the residual trust in the source repository stays with you.
- Planning runs `/grill-with-docs`, `/to-spec`, and `/to-tickets` in order, with repository-owned `unslopify` cleaning prose under scope, protected-content, preservation, and completion-report rules, using only the focused agent cache `AGENTS.md → ARCHITECTURE.md → seam leaf → CONTEXT.md → relevant ADRs` (human pages are derived and not preloaded).
- Planning publishes ready tickets with native blockers and asks about unresolved decisions.
- Implementation handles one issue, loads repository-owned `unslopify` before progress with the same prose and focused-cache rules, and stops when a native blocker is open.
- Verification runs dependency install, tests, TypeScript, and the docs harness. Every check in the chain can fail.
- Implementation runs one delegated `/implement` stage and does not host code review; review lives in `/review-this`.
- Standalone implementation pushes directly to `main` only after checks and rebase.
- Implementation inside a Kilo Agent Manager worktree opens a pull request whose body closes its ticket on merge, posts acceptance evidence, and never closes the ticket early.
- The ready frontier contains only open, unblocked, unassigned tickets with `ready-for-agent`.
- After a ticket closes, only its newly unblocked dependents get label updates — nothing else moves.

Technical depth lives in the leaf documents named by each line.
