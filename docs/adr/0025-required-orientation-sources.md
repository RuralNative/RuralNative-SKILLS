# 0025 — Required orientation sources

Status: accepted
Narrows: 0024 (resolution-input clause only)
Date: 2026-08-31

Decision: helpful document links are separated from documents an agent must
load. The orientation set loads whole affected seam leaf docs, the
leaf-named glossary entries a `- Glossary:` line names, and only the
decisions and policies a leaf marks with an explicit `— requires.` clause on
its machine-readable link line. One declaration form per category:

- `- Glossary: CONTEXT.md — Term.` loads the named glossary entry.
- `- Decision: docs/adr/000N-....md — requires.` loads the decision.
- `- Policy: docs/policies/testing.md — requires.` loads the policy.

A compact citation — a bare `- Decision:` or `- Policy:` bullet or a prose
mention without `— requires.` — stays visible navigation and never loads
source content. A rejected decision never enters the set, even when a leaf
declares it required. Superseded ADRs load only when the declaration says
they are required.

Why: every leaf link used to carry unstated loading intent, so an agent could
not tell navigation from required reading without opening the source; the
prior rule loaded all linked accepted ADRs, which made compact citations as
expensive as required ones and forced leaves near their byte caps to keep
navigation links instead of required ones.

Consequences:
- Narrows ADR-0024's resolution-input clause: linked accepted ADRs or
  policies load only when the leaf's link declares them required.
- Narrows `document-for-agents:INV-17`: the resolver loads machine-required
  declarations, never compact citations.
- Freezes the glossary terms Compact citation and Required source in the
  adopting glossary.
- `reference/templates.md` shows the declaration forms; the resolver contract
  in `reference/orientation.md` states the citation/declaration split; the
  harness mirror in `scripts/docs-check.sh` and `reference/harness.md` check 11
  apply the same rule.