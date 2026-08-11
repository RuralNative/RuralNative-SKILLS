# The gate — a portable change-aware docs check

The harness is the mechanism that makes the cache coherent. It must be the
cheapest script in the repo; if it isn't tiny, it will be skipped. It is
tooling, so it is exempt from demanding its own doc — record that exemption in
the conventions policy to avoid infinite regress.

## The eight checks

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
6. **Seam-table completeness.** The index's seam/navigation table must cover
   every doc in the coverage table: parse both, fail on any coverage-table doc
   missing from the seam table (unless the index explicitly lists it in a
   labeled non-seam section, e.g. reference standards), and fail on any
   seam-table row whose code root does not exist on disk.
7. **Generated freshness.** Every generated doc embeds a
   `Generated: YYYY-MM-DD` line; fail when a generated doc is older than the
   project's declared threshold (default 30 days) or when its regeneration
   script changed without the doc being regenerated.
8. **Policy coverage.** Every policy doc on disk is linked from the index;
   every policy doc linked from the index exists; leaf docs link policy docs
   instead of restating them.

## Scorecard

A re-runnable health statement produced by the harness: docs count, coverage
%, stale/overdue count, ADR status counts, last-generation timestamps for
generated docs. Per seam it also lists the seam's invariants (`INV-1..INV-N`)
and marks each as test-encoded or prose, flagging prose invariants whose claim
does not match a code marker. It exists to turn "is our documentation lying?"
into a query with an answer.

## Adaptation rules

- Directory names are conventional, not sacred: whatever the project calls its
  docs tree, the harness points at it. What must not change are the *checks*:
  coverage, same-diff, new-seam, seam-table, generated, policy, status,
  expiry.
- If the project has no ADRs yet, check 4 is dormant until the first decision
  is recorded — do not pre-create rules for empty categories. The same
  dormancy applies to check 7 (generated freshness) until a generated doc
  exists and to check 8 (policy coverage) until the first policy doc lands.
- Generated docs exist only where generation is possible and cheap (schemas,
  contracts, structure trees). A project with no generation pipeline gets
  checks 1–6 and 8, with check 7 dormant, and a scorecard.
- In a monorepo, give each independently navigable package its own index and
  leaf docs, sharing one conventions policy and one harness run across all
  packages.

## Provenance

The checks were derived from a production `docs:check` gate whose known
failure modes — ADR status drift and unmanaged work docs — are exactly checks
4 and 5.
