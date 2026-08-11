# Templates

## Mini-ADR

```
# <Title>

Status: accepted | superseded | rejected
Supersedes: 00NN          # only when superseding
Date: YYYY-MM-DD

Decision: 2–4 sentences. What was decided, and where it lives in the code.

Why: the context that makes the decision intelligible; one line per
genuinely considered alternative, with the reason it was rejected.

Consequences: bullets. What future agents must not undo, and what
changed for other seams.
```

Threshold: a decision earns an ADR when it changes what a future agent is
allowed to assume — boundaries, contracts, security, data model, conventions.
Reversible trivia stays in the commit message.

## Leaf doc (one per seam)

Six sections, 1–2 minute read; longer content moves to a referenced file:

1. **Purpose** — why the seam exists, in glossary vocabulary; link the ADR
   if one constrains it.
2. **Scope & boundaries** — what it owns, what it delegates; name dependents
   and dependencies.
3. **Key types & files** — by role, not by path; paths go stale.
4. **Data flow** — one directed walk-through from entry point to resting
   place.
5. **Non-negotiables** — 3–5 numbered invariants: limits, exclusions,
   contracts. Specific, single-claim bullets. Tests where encodable.
6. **Links** — glossary terms, ADRs, sibling docs, test location.

## Index (AGENTS.md or ARCHITECTURE.md)

- One paragraph: what the system is, as built.
- Seam table: doc | responsibility | code root | tests.
- Cross-cutting boundaries: one line each, linking ADRs.
- Coverage table: every doc, machine-checked against disk.
- Pointers to glossary, ADRs, policy, README. Link, never restate.

## Loading protocol

| Task | Read set | Budget |
|---|---|---|
| Any change | index → one leaf doc → glossary terms in use | ~3–6k tokens |
| API/route change | + route map, security + testing policy | ~6–9k |
| Schema/data change | + data doc, migrations policy, generated schema slice | ~8–12k |
| New dependency | + one vendor-facts entry | ~0.3k |
| Re-orient after compaction | index → task leaf doc → glossary | ~4–7k |

Rule: an agent's re-orientation is the same small read every time — that
fixed cost is what makes compaction survivable.
