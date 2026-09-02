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
default and stable versioned JSON (behavior `1.1`, schema `1.0`). Three trust
signals extend the measurable set: instruction residue `AIT-EVD-010` flags
prompt-like
imperatives in visible prose as inert content, with word-boundary anchored
patterns so ordinary prose such as `developer modeled` or `anything nowadays`
does not match; context-aware phrase candidates `AIT-LEX-008` cover
`vertical slice` and `native dependency edges`, where a
window anchored to the exact domain use suppresses the candidate and a vague
or decorative use is reported; and always-replace phrases `AIT-LEX-009`
report each visible occurrence of `load-bearing`/`load bearing`, `smoking
gun`, or `smoke test`/`smoke tests` with a count of one, replaced even when
technically correct while protected spans stay masked. Fixtures under `skills/unslopify/tests/fixtures/`
pin prompt-like prose, candidate replacement, exact-term preservation,
always-replace occurrences, protected content, and the `agents-md/` setup
cases. The registry discovery walks `skills/unslopify/` and a
consumer runs `npx skills add RuralNative/RuralNative-SKILLS --skill
unslopify`. The repo never carries its own install — `.agents/` and
`skills-lock.json` are ignored. Model-only path holds the full contract when
Python is absent, and scanner thresholds never fail the gate. The live-output
path runs alongside explicit jobs: once loaded, agent-authored English output
is drafted in plain language (practical point first, one choice at a time,
terms explained at first use), audited silently in ordinary conversation,
cleaned with the full report at publication boundaries, and technical
fidelity outranks style so
implementation-critical specification and ticket wording survives style
candidates. The session-start path maintains exactly one owned block in the
project's root `AGENTS.md` (ADR-0029), the narrow exception to caller-owned
scope; the Skills CLI has no setup hook, so the first invocation per project
establishes later session loading.

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
- INV-8 mechanism: composition tests and `agents-md/` fixtures in
  `skills/unslopify/tests/` assert the owned-block placement, no-op repeat,
  and malformed-marker handling the session-start path contracts (ADR-0029).
