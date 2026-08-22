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

## Leaf doc (one per seam, standard tier and above)

Six sections, 1–2 minute read; longer content moves to a referenced file. Minimal tier has no leaf doc; the index seam table lists the code root and tests and the leaf doc appears only at standard and above.

1. **Purpose** — why the seam exists, in glossary vocabulary; link the ADR
   if one constrains it.
2. **Scope & boundaries** — what it owns, what it delegates; name dependents
   and dependencies. Close with a firm `Not here` route: one line naming the
   responsibility that takes misrouted work and its owning seam, in stable
   ownership language, never by file path.
3. **Key types & files** — by role, not by path; paths go stale.
4. **Data flow** — one directed walk-through from entry point to resting
   place.
5. **Non-negotiables** — 3–5 invariants at establishment; the set grows with
   decisions. Limits, exclusions, contracts: specific, single-claim bullets.
   Tests where encodable. Invariants carry stable identifiers `INV-1..INV-N`;
   retire via tombstone tied to a decision — never delete, never renumber.
   Audit the read budget: past ~15 invariants, split the seam or fold settled
   ones into a decision record.
6. **Links** — glossary terms, ADRs, sibling docs, test location — link where
   tests live, never what they cover (coverage claims are fast-decay
   restatements).

## Index (AGENTS.md or ARCHITECTURE.md)

Generated `AGENTS.md` starts with the five commands of the attention
contract, in this order, before any other content:

1. Say the task goal.
2. Read only the matching row; its budget is a cap.
3. Follow the owning seam and its `Not here` routes.
4. Change code and docs together; code wins.
5. Put work docs in the tracker; decide invariant conflicts first.

The architecture index (`ARCHITECTURE.md`) does not duplicate the five
commands; it carries the seam table, boundaries, coverage, and loading
protocol that the commands point into. After the commands, `AGENTS.md`
continues with:

- One paragraph: what the system is, as built.
- Seam table: doc | responsibility | code root | tests.
- Cross-cutting boundaries: one line each, linking ADRs.
- Coverage table: every doc, machine-checked against disk.
- Pointers to glossary, ADRs, policy, README. Link, never restate.

## Policy set

The canonical policy docs are `testing`, `security`, `migrations`,
`reliability`. Each is ≤ 1 page, each is linked from the index, each is
created when the project reaches the standard size class (Principle 6 in
SKILL.md), and leaf docs link policy docs instead of restating them.

A repository whose reviews run through a cloud service adds its review policy
as a root file named `REVIEW.md`, because cloud review reads that path from
the pull-request base branch. It states review scope, severity, trust rules,
verification expectations, current-head freshness, duplicate handling,
inline-comment evidence, and subagent use. It links from the index like any
policy doc and follows the one-page budget. Configuring the cloud side (app
installation, repository selection, model choice) stays external setup; the
doc cache ships the policy file, not the platform wiring.

```
# <area> policy

<the cross-cutting rules for one area, ≤ 1 page; linked from the index;
never restated in leaf docs>
```

## Vendor-facts

In the adopting repository, `reference/vendor-facts.md` holds one ~10-line
entry per dependency: pinned version, known gotchas, and a note to fetch the
full docs on demand. Create an entry when a new dependency is introduced.

```
### <dependency>

- Pinned: <version>
- Gotchas: <the ones that cost a session to rediscover>
- Full docs: fetch on demand — this entry is a pointer, not a restatement.
```

## Glossary template

```
**<Term>**:
<definition in the domain vocabulary, 1–2 sentences>
_Avoid_: <forbidden synonyms>
```

The glossary is frozen; changes require a decision — the rule lives in the
routing table in `reference/classify.md`.

## Debt registry

Known shortcuts and unfinished pieces get an official home: one register
(`docs/debt.md`) for small projects, or a debt section in each leaf doc where
debt is dense. The register is linked from the index and never restated.

```
### DEBT-N — <short title>

Status: open | resolved
Revisit-when: <condition that makes it due>
What: <the shortcut or unfinished piece, and why it is acceptable now>
```

Resolved entries are kept, with a pointer to the change that paid them off —
debt history survives like ADR supersession. Trigger maturity is a review act,
not a parse; the harness checks form and completeness, not conditions.

## Loading protocol

| Task | Read set | Budget (cap) |
|---|---|---|
| Any change | index → one leaf doc → glossary terms in use | ~3–6k tokens |
| API/route change | + route map, security + testing policy | ~6–9k |
| Schema/data change | + data doc, migrations policy, generated schema slice | ~8–12k |
| New dependency | + one vendor-facts entry | ~0.3k |
| Re-orient after compaction | index → task leaf doc (including its Non-negotiables) → glossary | ~4–7k |

The budget column states hard caps on orientation documents, not guidance to
trim later. When a task would push the read past the cap, narrow the read set
instead of continuing wide. The caps never block code inspection inside the
affected seam: reading the code being changed is task work, not orientation.
When the orientation documents lack an unrecoverable fact the task needs, name
a cache gap, record it in the issue tracker, and ask the owner before opening
more documentation; widening the read set silently is forbidden.

Rule: an agent's re-orientation is the same small read every time — that
fixed cost is what makes compaction survivable.
