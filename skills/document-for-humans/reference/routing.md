# Routing — audience, question, artifact, source

Every routing decision answers two questions: **who reads this?** and **which
authored doc already holds the truth?** A human-first doc never invents
content; it presents a source. See `templates.md` for the shape each artifact
takes and `coherence.md` for how freshness and prevention are enforced.

| The reader asks… | They are a… | Artifact | Allowed sources |
|---|---|---|---|
| What is this project and why does it exist? | any human | Overview | seam table, glossary, ADRs |
| What changed, why, and what does it cost me? | oversight stakeholder | Decision journal entry | the ADR it digests |
| Which rules must my changes not break? | vibe coder, junior | Guardrails at a glance | leaf docs' Non-negotiables, glossary |
| Where does information flow and where does it rest? | junior, stakeholder | Data-flow narrative | leaf docs' data-flow sections |
| What can this system do for me? | consumer | Capabilities catalog (dormant) | seam table responsibilities |

## The derivation contract

- Authored docs are the only derivation sources: ADRs, glossary, seam table,
  leaf docs, debt registry. Code parsing is forbidden.
- Authored docs are the only derivation sources. Code, issues, commit messages,
  and human-first docs cannot supply claims. A claim traced to any of those is
  a defect.
- A claim with no source is a defect: either find the authored source or route
  the fact to its tier in the AI-first tree first.
- An issue may appear as a discussion link in a decision-journal entry but it
  is not evidence and does not appear as a derivation source.
- A repository without an accepted ADR does not derive journal claims from
  commit messages. It records the decision in the authored tree first or leaves
  the journal category dormant.
- Every claim in a human doc traces to a span in its declared `Sources:` header.
  The header is the traceability contract.

## One-way bridges

- A bridge link points from a human doc to an AI doc for depth, in the form:
  "depth: <AI doc path>".
- No AI-first doc links into the human tree; prose may mention it, links may
  not.
- Every term of art either links the glossary or bridges; unexplained jargon
  is a finding.
- Each Derived doc carries valid `Derived:` and `Sources:` headers, uses one-way
  Bridge links for depth, and explains or links glossary terms on first use.

## Tone standard

- Recent-graduate reading level: short sentences, concrete nouns, no word
  chosen to sound smart.
- Jargon budget: at most one term of art per paragraph, and it must be bridged
  or glossed on first use.
- Tone is verifiable in review, not by script — the audit branch checks it by
  sampling.
- Language scope is English-only v1. Non-English passages stay unchanged,
  including inside mixed-language documents. See `coherence.md` for the
  dormant-until-used rule.
