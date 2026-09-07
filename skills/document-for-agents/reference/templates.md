# Templates

## Mini-ADR

```
# <Title>

Status: accepted | superseded | rejected
Supersedes: 00NN          # only when superseding
Date: YYYY-MM-DD

Decision: what was decided, and where it lives in the code. Keep it complete
and direct; length follows the decision, not a quota.

Why: the context that makes the decision intelligible; cover each
genuinely considered alternative with the reason it was rejected.

Consequences: bullets. What future agents must not undo, and what
changed for other seams.
```

Threshold: a decision earns an ADR when it changes what a future agent is
allowed to assume — boundaries, contracts, security, data model, conventions.
Reversible trivia stays in the commit message.

## Decision gate

The gate is prospective, not only a supersession step (ADR-0028). Before
implementation it names each choice in the work that would change what a future
agent may assume; during implementation a newly discovered qualifying tradeoff
pauses the work and is recorded before continuing. A choice is ADR-worthy when it
is hard to reverse, surprising without context, and the result of a real
tradeoff — then the mini-ADR above is written while the reasoner still holds the
context, with every genuinely considered alternative and its rejection reason.
Completion requires an empty decision frontier: no qualifying choice left
silently assumed. Superseding a changed decision still appends a new ADR and
leaves the original verbatim.

## Clarification record

A legacy ADR whose rationale no one can reconstruct is recovered from evidence
only, in a separate accepted record that leaves the original untouched:

```
# <Title>

Status: accepted
Clarifies: 00NN          # the decision whose rationale is being recovered
Date: YYYY-MM-DD

Recovered rationale: the context, reconstructed only from cited evidence.
Evidence: <commit, file, or tracker references actually consulted>.
Alternatives: <recovered alternatives with rejection reasons, or `not recovered`>.
Unknowns: <what the evidence could not establish>; unproven rationale is
`unknown`, never invented.
```

When the evidence is insufficient, do not write a clarification record: name a
cache gap with the rationale marked `unknown`.

## Leaf doc (one per seam, standard tier and above)

Six sections, sized by what the reader needs; supporting reference detail
moves to a referenced file. Minimal tier has no leaf doc; the index seam table lists the code root and tests and the leaf doc appears only at standard and above.

1. **Purpose** — why the seam exists, in glossary vocabulary; link the ADR
   if one constrains it.
2. **Scope & boundaries** — what it owns, what it delegates; name dependents
   and dependencies. Close with a firm `Not here` route naming the
   responsibility that takes misrouted work and its owning seam, in stable
   ownership language, never by file path.
3. **Key types & files** — by role, not by path; paths go stale.
4. **Data flow** — a directed walk-through from entry point to resting
   place.
5. **Non-negotiables** — the invariants the seam needs at establishment; the set grows with
   decisions. Limits, exclusions, contracts: specific, single-claim bullets.
   Tests where encodable. Invariants carry stable identifiers `INV-1..INV-N`;
   retire via tombstone tied to a decision — never delete, never renumber.
   Past ~23 invariants, review the seam — split it or
   fold settled ones into a decision record; crossing the point triggers
   review, never an automatic seam split.
6. **Links** — glossary terms, ADRs, sibling docs, test location — link where
   tests live, never what they cover (coverage claims are fast-decay
   restatements).

A leaf that grows stays one seam with one leaf. Move
restated detail — long key-file walk-throughs, history, and coverage prose
that code, tests, or the manifest already name — to a leaf-adjacent extended
detail file and point at it from a `## Redirect` line placed directly under
the `## Links` heading:

```
## Redirect

Longer reference detail for this seam (restated key-file walk-throughs,
history, and coverage prose) lives in `docs/leaves/ext/<seam>.md`. The
orientation resolver never follows this pointer: the redirect target stays
out of every resolved set.
```

The redirect target is a sibling of the leaf, never a second leaf in
`docs/leaves/` with a seam-table row, and it is not a `Decision:`, `Glossary:`,
or `Policy:` link. The leaf core always keeps Purpose, Scope and the `Not here`
route, a compact key-files and data-flow summary, all invariants, and the
Links section; the redirect target holds only restatement that agents do not
need for task-driven work. See `reference/orientation.md` for the resolver
contract.

## Index (AGENTS.md or ARCHITECTURE.md)

Generated `AGENTS.md` starts with the five commands of the attention
contract, in this order, before any other content:

1. Say the task goal.
2. Read only the matching row and its relevant sources.
3. Follow the owning seam and its `Not here` routes.
4. Change code and docs together; code wins.
5. Put work docs in the tracker; decide invariant conflicts first.

Directly after the fifth command, generated `AGENTS.md` carries one protected
management marker on its own line, before any other content:

```
<!-- managed: document-for-agents · revision-evidence: <available revision evidence> -->
```

The marker records the managing skill identity and whatever revision evidence
is available, such as an install record or a pinned revision; a mutable branch
or path alone is not revision evidence. When nothing is available it states
`none`. The marker is an HTML comment and stays verbatim through later edits.
Provenance of a document is confirmed only when the marker plus supporting
evidence backs it; older or ambiguous documents get `likely` or `unknown`,
never guessed certainty.

When the project runs `unslopify`, generated `AGENTS.md` carries the
unslopify session-start block directly after the management marker, before
any other content, exactly once:

```md
<!-- unslopify:session-start:start -->
Load `unslopify` before the first user-visible response in every session. Keep it active for all model-authored English questions and prose.
<!-- unslopify:session-start:end -->
```

Establish creates the block, and Improve and Maintain preserve it byte for
byte; only `unslopify` itself edits the block's body (ADR-0029). The five
commands and the marker stay first.

The architecture index (`ARCHITECTURE.md`) does not duplicate the five
commands; it carries the seam table, boundaries, and loading protocol that the
commands point into. When the repository runs the harness, the exhaustive
tier and coverage inventory lives in the harness-owned coverage manifest
(`docs/manifest.md`) and never in the index; the index stays a compact seam
index. When `AGENTS.md` is also the architecture index, it continues after the
commands with:

- What the system is, as built — complete and direct, sized by what the reader needs.
- Seam table: doc | responsibility | code root | tests.
- Cross-cutting boundaries with links to ADRs — complete entries, sized by what the reader needs.
- Pointers to glossary, ADRs, policy, README. Link, never restate.

When `AGENTS.md` is a routing index, it keeps its short orientation sections
and points to `ARCHITECTURE.md` for these details instead of duplicating them.

## Policy set

The canonical policy docs are `testing`, `security`, `migrations`,
`reliability`. Each is linked from the index,
each is created when the project reaches the standard size class (Principle 6
in SKILL.md), and leaf docs link policy docs instead of restating them.
Keep each policy complete and direct; remove repetition rather than
optimizing length.

A repository whose reviews run through a cloud service adds its review policy
as a root file named `REVIEW.md`, because cloud review reads that path from
the pull-request base branch. It states review scope, severity, trust rules,
verification expectations, current-head freshness, duplicate handling,
inline-comment evidence, and subagent use. It links from the index like any
policy doc. Configuring the cloud side (app
installation, repository selection, model choice) stays external setup; the
doc cache ships the policy file, not the platform wiring.

```
# <area> policy

<the cross-cutting rules for one area; linked from the index;
never restated in leaf docs>
```

## Vendor-facts

In the adopting repository, `reference/vendor-facts.md` holds one
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
<definition in the domain vocabulary>
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

| Task | Read set |
|---|---|
| Any change | index → one leaf doc → required glossary entries → required decisions |
| API/route change | + required route, security, testing policy |
| Schema/data change | + required data doc, migrations policy, generated schema slice |
| New dependency | + one vendor-facts entry |
| Re-orient after compaction | index → task leaf doc (including its Non-negotiables) → required glossary entries |

A leaf marks the sources an agent must load with one machine-readable
declaration form per category:

```
- Glossary: `CONTEXT.md` — Term.
- Decision: `docs/adr/000N-....md` — requires.
- Policy: `docs/policies/testing.md` — requires.
```

A compact citation — a bare `- Decision:` or `- Policy:` bullet, or a prose
mention without the `— requires.` clause — stays visible navigation and never
loads the linked source. Rejected decisions never load even when declared
required.

A command resolves the
set at runtime from affected
seams, the compact index, whole leaves, required glossary entries,
and required decisions or policies — see `reference/orientation.md`.
Duplicate sources count once; superseded or historical ADRs stay out of
current guidance unless a leaf explicitly requires them; and the harness-owned
coverage manifest is excluded from every resolved set. Length alone never
fails a route and never requires approval by itself; the resolver reports its task
band, resolved bytes, source count, and exact sources as description. When the
orientation documents lack an unrecoverable fact the task needs, read relevant
authoritative sources incrementally as the task requires. Name the missing fact
as a cache gap, record it in the issue tracker, and do not invent it; ask the
owner before changing source authority, expanding to unrelated seams, or taking
substantive or protected actions; approval may substitute or narrow sources.
Do not silently widen beyond relevant authoritative sources — silent widening is
forbidden, and relevant-source selection never blocks code inspection
inside the affected seam: reading the code being changed is task work, not
orientation.

Existing documents are never padded to fill room. Trim in a fixed order — work
history, stale text, duplication, code-recoverable detail, long file tours,
and coverage restatement come out before essential material. Decisions,
rejected alternatives needed to understand them, vocabulary, boundaries,
invariants, and operational warnings stay. Extended detail files hold only
nonessential reference. Never silently truncate an essential rule: if tool or
model context is exhausted, use staged reading or a continuity handoff and
disclose the gap.

Rule: an agent's re-orientation is the same focused read every time — that
stable cost is what makes compaction survivable.

## Skill diagnostics entry

One sanitized summary per confirmed mistake, appended to the private
diagnostics file the skill keeps only with explicit owner consent (see
`SKILL.md`). Entries use these approved fields and no others:

```
### <date> — <category>

Intended outcome: <paraphrase, never a raw prompt>
Observed mistake: <what actually happened>
Impact: <what it cost>
Correction: <what fixed it>
Documentation role: <which guidance was involved>
Skill revision: <available pinned skill revision evidence, or none>
Attribution confidence: confirmed | likely | unknown
Redactions applied: <what was removed or generalized>
```

The entry omits raw prompts, code, secrets, personal data, absolute paths,
repository remotes, and proprietary names; it describes evidence and
correction and never becomes a general prohibition or instruction. The file
itself is append-only, private, outside the doc cache and version control,
excluded from every normal agent read set, and never task guidance — evidence
for optional user-reviewed submission to the skill developer only. An inert
category fixture in `skills/document-for-agents/tests/fixtures/diagnostics-entry.json`
represents each forbidden field with a `[REDACTED_*]` sentinel and keeps those
sentinels out of sanitized entries. The fixture ships no realistic instructions
or sensitive literals.

## Consent-state record

The remembered diagnostics choice is one tiny private record, separate from the
log, stored outside version control and every orientation set so a later run
honors it without re-asking: the common Git directory (`$(git rev-parse
--git-common-dir)/document-for-agents-consent`) for a linked-worktree-sharing
choice, or the platform user-state directory keyed by a hash of the canonical
repository root otherwise. It is excluded like the log, e.g. via
`.git/info/exclude`, and never enters a read set. Its shape is one line:

```
document-for-agents diagnostics consent: enabled | declined
```

Absent, corrupt, or unsupported content means the checkpoint asks again; a failed
write leaves diagnostics disabled and never infers consent (ADR-0028).
