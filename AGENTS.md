## Documentation (doc-cache)

This repo runs the doc-architecture lifecycle on its own docs.

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
