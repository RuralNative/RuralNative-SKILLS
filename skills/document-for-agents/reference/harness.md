# The gate — a portable change-aware docs check

The harness is the mechanism that makes the cache coherent. It must be the
cheapest script in the repo; if it isn't tiny, it will be skipped. It is
tooling, so it is exempt from demanding its own doc — record that exemption in
the conventions policy to avoid infinite regress.

## The eleven checks

1. **Coverage ↔ disk.** The index lists every doc in the docs tree; every
   listed doc exists; every doc on disk is listed. Parse the index's coverage
   table and diff against the directory. In a repository with a coverage
   manifest, the harness parses the manifest instead: the exhaustive tier and
   coverage inventory is the manifest's job, and `ARCHITECTURE.md` stays a
   compact seam index.
2. **Seam coherence.** A documented seam's code must match the fingerprint the
   manifest recorded when its claims were last reviewed. Mechanism: read the
   manifest's `Seam verification` table; for each seam, recompute a canonical
   SHA-256 over its VCS-visible code root (tracked plus non-ignored untracked
   files, each contributing path, type, byte length, and content hash, sorted by
   path); fail when the recomputed digest differs from the stored one, when a
   documented seam has no row, or when a row has no `Verified` date. Because the
   comparison is content against a stored digest — not `git status` or a base
   range — a stale fingerprint fails in a dirty worktree and in a clean CI
   checkout alike. A leaf edit that does not review the affected claims and
   refresh the fingerprint stays red; a reviewed no-text-change may refresh it.
   Dormant until the manifest carries a `Seam verification` table (see
   `governance.ts` for the reference digest).
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
   instead of restating them. Coverage is not tied to one subdirectory: a
   root `REVIEW.md` review policy is discovered and checked like any other
   policy doc, alongside `docs/policies/`. Discovery is conventional, not
   exhaustive — an adopter who indexes a policy at another path extends
   discovery; every policy row the index declares gets the existence check
   and the governing-source freshness half wherever it lives. A policy doc
   may declare its governing sources in a `<!-- Governs-from: path/a,
   path/b -->` line; while any declared source is modified in the working
   tree, the policy doc must change too, or the check fails (dormant when no
   source is declared). The linkage half is mechanical; the restatement half
   is a review convention — a script cannot judge duplication.
9. **Debt register.** Every debt item is a numbered `DEBT-N` entry with a
   `Status:` line and a `Revisit-when:` trigger; every `DEBT-N` referenced in
   code or docs exists in the register; the scorecard reports open and
   resolved debt. Trigger maturity is a review act, not a parse — the
   register turns "what is owed?" into a query with an answer.
10. **Invariant identifier integrity.** Per leaf doc, every `INV-N` number is
    unique — duplicates are fatal. Every `INV-N` referenced
    from another doc resolves to a live entry in its seam's leaf doc —
    unresolved references are fatal; a tombstoned entry does not satisfy a
    reference. Numbering gaps are not checked: a gate that fails an adopter's
    pre-existing numbering on day one gets deleted. Retired entries are
    tombstoned (`(Retired — <decision id>)`), never deleted; renumbering is
    forbidden except recorded duplicate repair.
11. **Orientation budget** — Every orientation route the repository declares
    (band + affected seams) must fit its task-band byte cap: ordinary 6,000,
    API/route 9,000, schema/data 12,000, re-orientation 7,000, and 12,000
    absolute. Routes resolve deterministically from the compact architecture
    index, whole affected seam leaf docs, required glossary entries, and
    required decisions or policies; a leaf's `- Decision:`, `- Policy:`, and
    `- Glossary:` lines load only when the declaration marks them required
    (`— requires.` on the decision or policy line), and a compact citation
    without that clause stays navigation and never loads. Duplicate sources
    count once; superseded ADRs stay out of current guidance unless a leaf
    explicitly requires them, and rejected decisions never enter even when
    declared required. An over-budget route fails **before** broad content
    loading and reports its task band, resolved bytes, cap, source count, and
    exact sources. The harness-owned coverage manifest is excluded from every
    resolved set; a manifest leaking into a set is fatal. Check 11 is
    introduced by the superseding decision that narrows the exact-ten-check
    clause — it lives in the approved decision, never hidden in the
    scorecard.

## Scorecard

A re-runnable health statement produced by the harness: docs count, coverage
%, stale/overdue count, the declared documentation tier and each documented
seam's coherence (verified / stale / missing), ADR status counts,
last-generation timestamps for generated docs, declared orientation routes with
their resolved bytes and caps, and the manifest's tier inventory. Per seam it also lists the seam's
invariants (`INV-1..INV-N`)
and marks each: **test-encoded** when the identifier appears literally in a
file under the test location the seam table declares; otherwise **prose**, and
a prose invariant must carry a justification naming the mechanism that keeps
it true. The mark is a claim audit — a leaf doc asserting test enforcement
without the marker is silent drift made visible. A seam whose Tests column
names no scannable location has no test location; all its invariants are
prose. It also reports open and resolved debt from the register. It exists to
turn "is our documentation lying?" into a query with an answer.

## Adaptation rules

- Directory names are conventional, not sacred: whatever the project calls its
  docs tree, the harness points at it. What must not change are the *checks*:
  coverage, seam coherence, new-seam, seam-table, generated, policy, debt,
  status, expiry, invariant, orientation budget.
- If the project has no ADRs yet, check 4 is dormant until the first decision
  is recorded — do not pre-create rules for empty categories. The same dormancy
  applies to check 2 (seam coherence) until the manifest carries a `Seam
  verification` table, to check 7 (generated freshness) until a generated doc
  exists, to check 8 (policy coverage) until the first policy doc lands, to
  check 9 (debt register) until the first debt entry is recorded, to
  check 10 (invariant integrity) until the first leaf doc with invariants
  exists, and to check 11 (orientation budget) until the repository declares
  its first orientation route in the coverage manifest. Declaring a route
  arms the cap immediately; an undeclared over-budget leaf fails the moment
  its route is declared, never silently.
- Generated docs exist only where generation is possible and cheap (schemas,
  contracts, structure trees). A project with no generation pipeline gets
  checks 1–6 and 8–10, with check 7 dormant, and a scorecard.
- In a monorepo, give each independently navigable package its own index and
  leaf docs, sharing one conventions policy and one harness run across all
  packages.

## Provenance

The checks were derived from a production `docs:check` gate whose known
failure modes — ADR status drift and unmanaged work docs — are exactly checks
4 and 5.
