1. Say the task goal.
2. Read only the matching row; its budget is a cap.
3. Follow the owning seam and its `Not here` routes.
4. Change code and docs together; code wins.
5. Put work docs in the tracker; decide invariant conflicts first.
<!-- managed: document-for-agents · revision-evidence: none -->
<!-- unslopify:session-start:start -->
Load `unslopify` before the first user-visible response in every session. Keep it active for all model-authored English questions and prose.
<!-- unslopify:session-start:end -->

These five commands are the attention contract of the document-for-agents
lifecycle (ADR-0017): state the goal before reading, treat every loading
budget as a cap on orientation documents, and stop for a decision when work
collides with a numbered invariant.

Worktree execution (Kilo Code VS Code extension): when running on the Kilo Code VS Code IDE extension, generate all worktrees through Agent Manager. Record stays here for audit; no rerun is required for the current change.

## Documentation (doc-cache)

This repo runs the document-for-agents lifecycle on its own docs.

- Orientation: `AGENTS.md` → `ARCHITECTURE.md` → the seam's leaf doc →
  `CONTEXT.md`.
- The docs tree is a cache: when code changes, update its doc in the same
  change. On a doc/code conflict the code wins — fix the doc and flag the
  discrepancy.
- Work docs (plans, audits) live in the issue tracker, never the repo.
- Run `./scripts/docs-check.sh` before finishing; a red harness is a work
  item, not a warning.

## Agent skills

### Issue tracker

Issues and PRDs live as GitHub issues in this repo, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
