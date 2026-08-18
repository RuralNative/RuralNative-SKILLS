# Routing — audience, question, artifact, source

Every routing decision answers two questions: **who reads this?** and **which
authored doc already holds the truth?** A human-first doc never invents
content; it presents a source.

| The reader asks… | They are a… | Artifact | Allowed sources |
|---|---|---|---|
| What is this project and why does it exist? | any human | Overview | seam table, glossary, ADRs |
| What changed, why, and what does it cost me? | oversight stakeholder | Decision journal entry | the ADR it digests, the linked issue |
| Which rules must my changes not break? | vibe coder, junior | Guardrails at a glance | leaf docs' Non-negotiables, glossary |
| Where does information flow and where does it rest? | junior, stakeholder | Data-flow narrative | leaf docs' data-flow sections |
| What can this system do for me? | consumer | Capabilities catalog (dormant) | seam table responsibilities |

## The derivation contract

- Sources are authored docs only: ADRs, glossary, seam table, leaf docs, debt
  registry. Code parsing is forbidden.
- A claim with no source is a defect: either find the authored source or route
  the fact to its tier in the AI-first tree first.
- Code is not a source.

## One-way bridges

- A bridge link points from a human doc to an AI doc for depth, in the form:
  "depth: <AI doc path>".
- No AI-first doc links into the human tree; prose may mention it, links may
  not.
- Every term of art either links the glossary or bridges; unexplained jargon
  is a finding.

## Tone standard

- Recent-graduate reading level: short sentences, concrete nouns, no word
  chosen to sound smart.
- Jargon budget: at most one term of art per paragraph, and it must be bridged
  or glossed on first use.
- Tone is verifiable in review, not by script — the audit branch checks it by
  sampling.
