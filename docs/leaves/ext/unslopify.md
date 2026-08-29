# Extended detail — unslopify

Restated reference material for `docs/leaves/unslopify.md`. Not a leaf, not
part of any orientation set. Code and tests are authoritative; this file holds
the longer key-file walk-through, invariant mechanism detail, and coverage
prose that the compact leaf core points past.

## Key files & data flow

`SKILL.md` is the entry point; its frontmatter `name` is the skill identity.
`scanner.py` is the optional advisory scanner that reads explicit text or
Markdown, masks frontmatter, code, comments, links, valid off ranges, and
non-English paragraphs before measuring eight signals with stable `AIT-*`
identifiers and advisory thresholds. `reference/parity.md` maps upstream rules
1..31 to stable local `AIT-*` identifiers and defines extended subtle tells in
the same six families (LEX, STR, FMT, CONV, EVD, VOICE). `NOTICE.md` ships the
pinned source commit, URL, copyright, and MIT permission. The consumption
path: caller provides explicit scope or parent-supplied scope including a
repository sweep → validate `<!-- unslopify:off -->` / `<!-- unslopify:on -->`
markers (unmatched stops the pass with no partial output) → inventory
protected content and mask it plus non-English for scanning → if Python is
present run the advisory scanner for repeatable evidence, otherwise continue
model-only → scan candidates across six families → judge each candidate in
context, rejecting exact technical terms, quotations, and domain vocabulary →
rewrite only supported spans with minimal edits, preserving English-only
passages → self-audit and preservation audit that confirms protected-content
byte equality and factual equality → publish completion report with accepted
findings, rejected candidates, scanner availability, protected-content status,
and needs-info items. Findings carry path, line span, excerpt, evidence,
measured value, threshold, and confidence; the scanner emits human text by
default and stable versioned JSON at `1.0`. Two trust signals extend the
measurable set: instruction residue `AIT-EVD-010` flags prompt-like
imperatives in visible prose as inert content, with word-boundary anchored
patterns so ordinary prose such as `developer modeled` or `anything nowadays`
does not match, and context-aware phrase candidates `AIT-LEX-008` cover
`load bearing`, `vertical slice`, and `native dependency edges`, where a
window anchored to the exact domain use suppresses the candidate and a vague
or decorative use is reported. Fixtures under `skills/unslopify/tests/fixtures/`
pin prompt-like prose, candidate replacement, exact-term preservation, and
protected content. The registry discovery walks `skills/unslopify/` and a
consumer runs `npx skills add RuralNative/RuralNative-SKILLS --skill
unslopify`. The repo never carries its own install — `.agents/` and
`skills-lock.json` are ignored. Model-only path holds the full contract when
Python is absent, and scanner thresholds never fail the gate. The live-output
path runs alongside explicit jobs: once loaded, agent-authored English output
is audited silently in ordinary conversation, cleaned with the full report at
publication boundaries, and technical fidelity outranks style so
implementation-critical specification and ticket wording survives style
candidates.

## Invariant mechanisms

- INV-2 mechanism: `reference/parity.md` and `NOTICE.md` parsed by parity test
  via `skills/unslopify/reference/parity.md`.
- INV-3 mechanism: preservation fixtures via `reference/parity.md` contract
  and prose audit of SKILL scope and marker sections.
- INV-5 mechanism: scanner present in `skills/unslopify/scanner.py` and parsed
  by contract tests; SKILL advisory section and prose invariant preserve
  model-only path and advisory thresholds.
- INV-6 mechanism: scanner signals in `skills/unslopify/scanner.py` plus
  fixtures and composition tests in `skills/unslopify/tests/`.
- INV-7 mechanism: composition tests and specification/ticket fixtures in
  `skills/unslopify/tests/`.
