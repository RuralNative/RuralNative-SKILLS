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
3. **Required glossary entries**: the glossary entries a leaf names in its
   `- Glossary:` link line. Entries are whole units; the rest of the glossary
   is not part of the set.
4. **Required decisions**: the decisions a leaf's `- Decision:` line
   explicitly marks with a `— requires.` clause. A decision a leaf cites
   without that clause stays compact navigation and does not load. A required
   decision with `Status: accepted` or `Status: superseded` joins the set; a
   `Status: rejected` decision never joins, even when declared required.
5. **Required policies** (route, security, testing, review): included for
   the api-route and schema-data bands, the bands whose loading-protocol rows
   add them. A `- Policy:` or `- Review policy:` line loads the policy only
   with the `— requires.` clause; a bare link stays compact navigation.

Each category has one machine-readable declaration form:

- `- Glossary: `CONTEXT.md` — Term.` loads the named glossary entry.
- `- Decision: `docs/adr/000N-....md` — requires.` loads the decision.
- `- Policy: `docs/policies/testing.md` — requires.` loads the policy.

A compact citation is any other mention — a bare `- Decision:` or
`- Policy:` bullet, or prose — and it is visible navigation only; it never
loads the linked source content. Trust the declaration, not the link's
existence.

A leaf doc may point at an extended detail file that holds the seam's
longer reference material. Point only through the `## Redirect` link line,
never through a `Decision:`, `Glossary:`, or `Policy:` line. The redirect
target is a whole leaf-adjacent file that the resolver never follows: it is
not a seam leaf, not a linked decision, and not a policy, so it stays out of
every resolved set. The leaf core keeps everything an agent needs to work —
Purpose, Scope and the `Not here` route, a compact key-files and data-flow
summary, all invariants, and the Links section — and the redirect target
holds restated detail that code, tests, or the manifest already name.

The **re-orientation** band resolves the index, the task leaf doc, and the
leaf-named glossary entries only — it does not pull linked ADRs or policies,
and it does not follow redirect targets.

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