# Orientation — the runtime orientation resolver contract

The **orientation set** is the unique, deduplicated set of authored
documentation a workflow resolves before task-driven code inspection. A
command derives it at runtime from durable data — affected seam names,
repository-owned routing data — never from a transported path list in a
ticket. The resolver counts UTF-8 bytes of every whole source and rejects a
route that exceeds its task-band cap **before** the agent broadly loads the
content. The resolver is metadata-only: it reads file sizes and field lines to
resolve and count; it never spills content into context.

Reference implementation: `orientation.ts` next to this file, exported as
`resolveOrientation` and runnable as a CLI:

```
node orientation.ts --root <repo> --band <band> --seams <seam1,seam2> [--include <path>] [--drop <path>] [--verbose]
```

## Caps

| Task band | Cap (UTF-8 bytes) |
|---|---|
| Ordinary change | 6,000 |
| API or route change | 9,000 |
| Schema or data change | 12,000 |
| Re-orientation after compaction | 7,000 |
| New-dependency material | fits the selected task band's cap |
| Absolute maximum | 12,000 |

No orientation set may exceed 12,000 bytes. New-dependency material fits the
selected task cap rather than raising it.

## Resolution inputs

The resolved set is, in order with duplicates counted once:

1. The compact architecture index (`ARCHITECTURE.md`; `AGENTS.md` when the
   index is combined into it).
2. The whole leaf doc of every **affected seam**, each leaf resolving from
   the index's seam table by seam *name*.
3. **Leaf-named glossary entries**: the glossary entries a leaf names in its
   `Links` glossary line. Entries are whole units; the rest of the glossary is
   not part of the set.
4. **Linked accepted ADRs**: the `Decision:` links a leaf lists. A linked ADR
   with `Status: accepted` joins the set; a `Status: superseded` or
   `Status: rejected` ADR stays out of current guidance unless the leaf's link
   explicitly requires it (the link line names a requirement).
5. **Linked policies** (route, security, testing, review): included for the
   api-route and schema-data bands, which are the bands whose loading
   protocol rows add them.

The **re-orientation** band resolves the index, the task leaf doc, and the
leaf-named glossary entries only — it does not pull linked ADRs or policies.

The harness-owned **coverage manifest** (`docs/manifest.md`) is excluded from
every resolved set. No loading-protocol row routes agents into it.

## Determinism and deduplication

Resolution is a pure function of the repository: the same seams and band
always resolve the same set. Sources deduplicate by resolved path — an ADR,
leaf, or glossary entry shared by multiple seams contributes exactly once. The
final source list is sorted, so byte counts and reports are stable.

## Failure reporting

A route over its cap fails before broad loading and reports:

- the task band
- the resolved bytes
- the cap
- the source count
- the exact sources needed for diagnosis

Under budget, only the task band, resolved bytes, cap, and source count are
published; the exact source list appears on failure, on cache-gap approval,
or with `--verbose` — evidence stays compact.

## Cache-gap approval

When the orientation documents lack an unrecoverable fact, the owner may
approve a **substitution or narrowing** of sources (`--include` to add an
approved source, `--drop` to approve dropping a source). These change the set
and mark the resolution as cache-gap approved, but they can never waive the
cap: the approved set must still fit.

## Improve and legacy caches

A legacy repository without the coverage manifest remains diagnosable: the
resolver falls back to the index's coverage table, and Improve creates the
manifest inside the previewed delta. The published skill never claims a legacy
cache is compliant — it routes it into the Improve path (see `SKILL.md`,
Branch D).