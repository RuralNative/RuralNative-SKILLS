<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-20 · Regenerated: #89 evidence-based AO workflow · Sources: docs/leaves/document-for-agents.md, docs/leaves/document-for-humans.md, docs/leaves/unslopify.md, docs/leaves/plan-this.md, docs/leaves/implement-this.md, docs/leaves/supervise-this.md, docs/leaves/release-skills.md, docs/adr/0010-supervise-by-delivery-evidence.md -->

# Guardrails in plain words

These are the promises the skills make.

- A skill's frontmatter name matches its folder, so the registry installs the intended skill.
- The public registry is the official install path. Local install leftovers stay out of the repository.
- Documentation changes update their technical leaf in the same change.
- Prose cleanup keeps commands, code, links, quotations, and facts intact.
- Planning delegates to `/grill-with-docs`, `/to-spec`, and `/to-tickets` in order, and each needs a person to start it. `/unslop` stays agent-run.
- Planning publishes ready tickets with native blockers and asks about unresolved decisions.
- Implementation handles one issue and stops when a native blocker is open. The `/implement` step needs a person to start it; `/code-review` stays agent-run.
- Standalone implementation pushes directly to `main` only after checks, review, and rebase.
- AO implementation opens a pull request and leaves merge and issue closure to AO and the supervisor.
- AO supervision runs inside the persistent project orchestrator and does not end after planning or worker creation.
- The project worker profile chooses the worker and a supported chat or TUI mode.
- Preflight stops on missing models, unsupported mode, broken GitHub access, stale base, absent review policy, or existing issue ownership.
- No more than three AO workers run at once.
- Progress requires a tracked change or later delivery artifact. Idle and activity timestamps prove nothing.
- Resume reconciles pull requests, sessions, branches, assignees, and issue links before a spawn.
- Infrastructure, task, and implementation failures have separate recovery limits.
- Review and merge preserve the reviewed commit. Same-account review cannot satisfy an approval-only policy.
- The supervisor allows two automatic follow-up review rounds, then asks the user.

Technical depth lives in the leaf documents named by each line.
