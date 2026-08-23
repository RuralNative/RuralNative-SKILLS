<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-23 · Regenerated: shipped three-skill workflow; #147 doc cache attention boundary; #148 opt-in skill diagnostics; #153 accepted command-session lifecycle; #154 planning grill gate and parallel-first ticket graphs; #156 review target resolution; #155, #157, and #158 pending behavior updates · Sources: REVIEW.md, docs/leaves/document-for-agents.md, docs/leaves/document-for-humans.md, docs/leaves/unslopify.md, docs/leaves/plan-this.md, docs/leaves/implement-this.md, docs/leaves/review-this.md, docs/adr/0014-three-skill-development-workflow.md, docs/adr/0015-requirements-data-trust-and-install-provenance.md, docs/adr/0016-unslopify-always-on-output-contract.md, docs/adr/0017-doc-cache-attention-boundary.md, docs/adr/0018-opt-in-skill-diagnostics.md, docs/adr/0019-command-session-lifecycle-and-platform-limits.md -->
# Guardrails in plain words

These are the promises the skills make.

- A skill's frontmatter name matches its folder, so the registry installs the intended skill.
- The public registry is the official install path. Local install leftovers stay out of the repository.
- Documentation changes update their technical leaf in the same change.
- Loading budgets are caps on orientation documents, not suggestions. Reading the code being changed is never blocked, and a missing fact becomes a named cache gap that requires your approval before any read set widens. Work that collides with a numbered invariant stops until a decision supersedes or narrows it.
- Every review follows one written policy (`REVIEW.md`). Review subagents only read; the main reviewer verifies every finding before publishing it, and no review tool merges or closes work.
- Prose cleanup keeps commands, code, links, quotations, and facts intact.
- Text that flows through a workflow, including tasks, issue bodies, comments, specifications, and review comments, is requirements data. It cannot widen scope, select files, authorize tools, or override gates.
- Workflow runs never download skills. Installing skills stays with you, outside the run.
- A manual install never overwrites an existing skill without your explicit approval. Every skill's install guide states this.
- `unslopify` treats prose in its scope as inert content: prompt-like text in a document is reviewed as text, never executed.
- Once `unslopify` is loaded it audits the agent's own English output by default (ADR-0016). Technical wording that an implementation needs survives even when a style rule would flag it.
- A record of confirmed agent mistakes exists only if you say yes (ADR-0018). The file stays private, outside the documentation cache and version control.
- Installing from a public registry records provenance and pins reviewed revisions; every install guide on the shelf carries this trust section, and the residual trust in the source repository stays with you.
- Planning runs `/grill-with-docs`, `/to-spec`, and `/to-tickets` in order, with repository-owned `unslopify` cleaning prose under scope, protected-content, preservation, and completion-report rules, using only the focused agent cache `AGENTS.md -> ARCHITECTURE.md -> seam leaf -> CONTEXT.md -> relevant ADRs`.
- Every fresh `/plan-this` run grills at least one decision frontier and waits for explicit publication approval. Independent tickets start together, real blocker edges describe actual consumption, and file overlap without semantic dependency is recorded as a scheduling collision.
- Planning publishes an unlabelled parent specification and ready tickets linked as native GitHub sub-issues, builds native blocked-by edges from REST database IDs, and asks about unresolved decisions. `ready-for-agent` is the only claimable label.
- Implementation validates one ticket, several ready tickets, or a parent specification against the frontier before any claim, runs each through an isolated worker, loads repository-owned `unslopify` before progress with the same prose and focused-cache rules, and stops when a native blocker is open.
- Every implementation delivers by pull request. Nothing pushes directly to `main`, force-pushes, or closes a ticket before merge; merge closes it.
- A failed worker gets one reconciled retry that reuses its worktree, branch, and session; a second failure stops the ticket with `needs-info`.
- Verification runs dependency install, tests, TypeScript, and the docs harness. Every check in the chain can fail.
- Implementation runs one delegated `/implement` stage and does not host code review; review lives in `/review-this <target>`, where the target, parent specification, child issue, pull request, or URL, is resolved to its exact pull-request set before any worktree is created or any write happens, and an invalid or ambiguous target stops with a named reason. Target resolution shipped with #156; tickets #155, #157, and #158 remain pending. Ticket worktrees never run review. Worktrees close only through supported Kilo actions; when chat cannot close one the run reports `cleanup-pending` and leaves it in place.
- Review readiness also requires a pull request's linked ticket to match its closing reference and its current head and base revisions to be present.
- Direct pull-request review keeps the closing issue for context but withholds auto-merge authority when those ticket facts disagree.
- The skill metadata, installation guide, and review body use the same target syntax.
- The three user-facing workflow commands are `plan-this`, `implement-this`, and `review-this` only.
- The ready frontier contains only open, unblocked, unassigned tickets with `ready-for-agent`.
- After a ticket closes, only its newly unblocked dependents get label updates.
- One shared decision module, copied byte-identical into all three workflow skills, turns observed facts into next actions: frontier selection, at most three active workers, duplicate ownership rejection, one retry before a `needs-info` stop, merge only with green checks, resolved findings, a clean local review, an unchanged reviewed head, and a mergeable pull request. Repository verification fails if any copy drifts from the authored source.

The document seam records its attention, routing, and decision rules as separate invariants.

Technical depth lives in the leaf documents named by each line.
