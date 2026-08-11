# The gate — a portable change-aware docs check

The harness is the mechanism that makes the cache coherent. It must be the
cheapest script in the repo; if it isn't tiny, it will be skipped. It is
tooling, so it is exempt from demanding its own doc — record that exemption in
the conventions policy to avoid infinite regress.

## The five checks

1. **Coverage ↔ disk.** The index lists every doc in the docs tree; every
   listed doc exists; every doc on disk is listed. Parse the index's coverage
   table and diff against the directory.
2. **Same-diff freshness.** A seam's code changed → its leaf doc changed in
   the same working-tree diff. Mechanism: read VCS status; map changed code
   roots to their docs via the seam table; fail on a documented seam whose doc
   is untouched. (Git: `git status --porcelain`; adapt the call for other VCS.)
3. **New seam requires a doc.** A new module directory with no row in the
   index fails. This keeps the table complete without a gardener.
4. **Decision status parse.** Every ADR has a parseable `Status:` line on an
   agreed line; nothing with `Status: superseded` is referenced as current by
   the index or leaf docs. This turns "superseded" from prose into data.
5. **Work-doc expiry.** If work docs are permitted in the repo at all, they
   carry an `Expires:` line and fail when overdue. Default policy: work docs
   don't live in the repo.

## Scorecard

A re-runnable health statement produced by the harness: docs count, coverage
%, stale/overdue count, ADR status counts, last-generation timestamps for
generated docs. It exists to turn "is our documentation lying?" into a query
with an answer.

## Adaptation rules

- Directory names are conventional, not sacred: whatever the project calls its
  docs tree, the harness points at it. What must not change are the *checks*:
  coverage, same-diff, new-seam, status, expiry.
- If the project has no ADRs yet, check 4 is dormant until the first decision
  is recorded — do not pre-create rules for empty categories.
- Generated docs exist only where generation is possible and cheap (schemas,
  contracts, structure trees). A project with no generation pipeline gets
  checks 1–4 and a scorecard.
- In a monorepo, give each independently navigable package its own index and
  leaf docs, sharing one conventions policy and one harness run across all
  packages.

## Provenance

The checks were derived from a production `docs:check` gate whose known
failure modes — ADR status drift and unmanaged work docs — are exactly checks
4 and 5.
