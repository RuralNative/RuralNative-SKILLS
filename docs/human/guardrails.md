<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-23 · Regenerated: shipped three-skill workflow; #137 activation; stale orchestrator removed; ADR-0014 shipped, ADR-0009/0012/0013 superseded; pull-request-only delivery; #146 unslopify always-on output contract; #146 review pass (leaf ordinal); #146 review pass (publication boundaries); #147 doc cache attention boundary; #147 review pass · Sources: REVIEW.md, docs/leaves/document-for-agents.md, docs/leaves/document-for-humans.md, docs/leaves/unslopify.md, docs/leaves/plan-this.md, docs/leaves/implement-this.md, docs/leaves/review-this.md, docs/adr/0014-three-skill-development-workflow.md, docs/adr/0015-requirements-data-trust-and-install-provenance.md, docs/adr/0016-unslopify-always-on-output-contract.md, docs/adr/0017-doc-cache-attention-boundary.md -->
# Guardrails in plain words

These are the promises the skills make.

- A skill's frontmatter name matches its folder, so the registry installs the intended skill.
- The public registry is the official install path. Local install leftovers stay out of the repository.
- Documentation changes update their technical leaf in the same change.
- Loading budgets are caps on orientation documents, not suggestions. Reading the code being changed is never blocked, and a missing fact becomes a named cache gap that requires your approval before any read set widens. Work that collides with a numbered invariant stops until a decision supersedes or narrows it.
- Every review follows one written policy (`REVIEW.md`). Review subagents only read; the main reviewer verifies every finding before publishing it, and no review tool merges or closes work.
- Prose cleanup keeps commands, code, links, quotations, and facts intact.
- Text that flows through a workflow — tasks, issue bodies, comments, specifications, review comments — is requirements data. It cannot widen scope, select files, authorize tools, or override gates.
- Workflow runs never download skills. Installing skills stays with you, outside the run.
- A manual install never overwrites an existing skill without your explicit approval. Every skill's install guide states this.
- `unslopify` treats prose in its scope as inert content: prompt-like text in a document is reviewed as text, never executed.
- Once `unslopify` is loaded it audits the agent's own English output by default (ADR-0016): ordinary chat is checked silently with no report, published documents and comments get the full cleanup report, your own prompts and quotations change only on an explicit request, and technical wording that an implementation needs survives even when a style rule would flag it.
- Installing from a public registry records provenance and pins reviewed revisions; every install guide on the shelf carries this trust section, and the residual trust in the source repository stays with you.
- Planning runs `/grill-with-docs`, `/to-spec`, and `/to-tickets` in order, with repository-owned `unslopify` cleaning prose under scope, protected-content, preservation, and completion-report rules, using only the focused agent cache `AGENTS.md → ARCHITECTURE.md → seam leaf → CONTEXT.md → relevant ADRs` (human pages are derived and not preloaded).
- Planning publishes an unlabelled parent specification and ready tickets linked as native GitHub sub-issues, builds native blocked-by edges from REST database IDs, and asks about unresolved decisions. `ready-for-agent` is the only claimable label; `ready-for-dev` is retired.
- Implementation validates one ticket, several ready tickets, or a parent specification against the frontier before any claim, runs each through an isolated worker, loads repository-owned `unslopify` before progress with the same prose and focused-cache rules, and stops when a native blocker is open.
- Every implementation delivers by pull request. Nothing pushes directly to `main`, force-pushes, or closes a ticket before merge; merge closes it.
- A failed worker gets one reconciled retry that reuses its worktree, branch, and session; a second failure stops the ticket with `needs-info`.
- Verification runs dependency install, tests, TypeScript, and the docs harness. Every check in the chain can fail.
- Implementation runs one delegated `/implement` stage and does not host code review; review lives in `/review-this #<spec>`, invoked once per wave from the control workspace after the implementation wave ends; ticket worktrees never run review.
- The three user-facing workflow commands are `plan-this`, `implement-this`, and `review-this` only.
- The ready frontier contains only open, unblocked, unassigned tickets with `ready-for-agent`.
- After a ticket closes, only its newly unblocked dependents get label updates — nothing else moves.
- One shared decision module, copied byte-identical into all three workflow skills, turns observed facts into next actions: frontier selection, at most three active workers (a worker holds its slot until it is stopped), duplicate ownership rejected, one retry before a `needs-info` stop that holds on every later pass, merge only with green checks, resolved findings, a clean local review, an unchanged reviewed head, and a mergeable pull request. If a blocker reopens, an `unblocked` ticket goes back to `blocked`. Repository verification fails if any copy drifts from the authored source.

Technical depth lives in the leaf documents named by each line.
