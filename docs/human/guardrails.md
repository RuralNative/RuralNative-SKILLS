<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-20 · Regenerated: #72 AO supervisor pivot · Sources: docs/leaves/document-for-agents.md, docs/leaves/document-for-humans.md, docs/leaves/unslopify.md, docs/leaves/plan-this.md, docs/leaves/implement-this.md, docs/leaves/supervise-this.md, docs/leaves/release-skills.md -->

# Guardrails in plain words

These are the promises the skills make.

- A skill's frontmatter name matches its folder, so the registry installs the intended skill.
- The public registry is the official install path. Local install leftovers stay out of the repository.
- Documentation changes update their technical leaf in the same change.
- Prose cleanup keeps commands, code, links, quotations, and facts intact.
- Planning runs `/grill-with-docs`, `/to-spec`, and `/to-tickets` in order.
- Planning publishes ready tickets with native blockers and asks about unresolved decisions.
- Implementation handles one issue and stops when a native blocker is open.
- Standalone implementation pushes directly to `main` only after checks, review, and rebase.
- AO implementation opens a pull request and leaves merge and issue closure to AO and the supervisor.
- AO supervision runs inside the persistent project orchestrator and does not end after planning or worker creation.
- The ready frontier contains only open, unblocked, unassigned tickets with `ready-for-agent`.
- No more than three AO workers run at once.
- Worker completion means merged PR, acceptance evidence, and issue closure. Idle is not enough.
- Resume checks GitHub before AO sessions and avoids duplicate workers or pull requests.
- A blocked worker gets one focused recovery attempt. Further blockage becomes `needs-info` and a human decision.
- The supervisor allows two automatic follow-up review rounds, then asks the user.

Technical depth lives in the leaf documents named by each line.
