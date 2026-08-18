# 0004 — Verb-named skills, flat shelf; routing stays documentation

Status: accepted
Date: 2026-08-18

Decision: Skills on this shelf use verb-first, audience-suffixed names. The
two current skills rename: `doc-architecture` → `document-for-agents` and
`human-first-docs` → `document-for-humans`. The shelf stays flat: there is no
parent router skill. Routing lives in the skills' descriptions and the README
selection table, which the platform's semantic matching resolves before any
skill loads.

Why: The proposed `documentation-for-ai`/`documentation-for-humans` were noun
phrases, not verbs, and "ai" drifts from the repo's standard term "agent". A
router skill routes only after being loaded — it taxes the context window to
re-derive what descriptions already decide pre-load, and it is a shared
mutation point (every new skill must edit it), breaking seam independence.
The three lifecycle scenarios (new codebase, messy docs, outdated docs)
differ by branch within document-for-agents (Establish/Audit/Maintain), not
by skill; branch selection is that skill's own first move after loading.

Consequences: The registry lane commands change (`--skill
document-for-agents`, `--skill document-for-humans`) — a breaking rename for
existing consumers, accepted now while the shelf is days old rather than
later when dependencies accrete. ADR-0001's lane example is a historical
record and stays untouched. Cross-skill disambiguation is carried by
descriptions plus the README table at zero runtime cost; a future skill joins
the shelf by adding one folder and one README row, touching no shared router.
