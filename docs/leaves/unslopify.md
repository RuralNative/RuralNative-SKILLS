# Seam: unslopify

## Purpose

The skill that removes AI tells from explicit prose while preserving meaning,
evidence, and tone. It is the audience-neutral utility for documentation and
general prose cleanup, derived from the upstream `unslop` baseline and extended
with a meaning-safe rewrite contract.

## Scope & boundaries

Owns: the content under `skills/unslopify/` — `SKILL.md`, `NOTICE.md`,
`INSTALL.md`, `reference/parity.md`. Delegates: documentation lifecycle
decisions to `document-for-agents`; human-voice derivation to
`document-for-humans`; scope selection to the caller. The seam does not own
scanner implementation, language detection beyond English scope, or authorship
classification. It never expands scope on its own.

## Key files & data flow

`SKILL.md` is the entry point; its frontmatter `name` is the skill identity.
`reference/parity.md` maps upstream rules 1..31 to stable local `AIT-*`
identifiers and defines extended subtle tells in the same six families
(LEX, STR, FMT, CONV, EVD, VOICE). `NOTICE.md` ships the pinned source commit,
URL, copyright, and MIT permission. The consumption path: caller provides
explicit scope or parent-supplied scope including a repository sweep → validate
`<!-- unslopify:off -->` / `<!-- unslopify:on -->` markers (unmatched stops
the pass with no partial output) → inventory protected content → scan
candidates across six families → judge each candidate in context, rejecting
exact technical terms, quotations, and domain vocabulary → rewrite only
supported spans with minimal edits, preserving English-only passages → self-audit
and preservation audit → publish completion report with accepted findings,
rejected candidates, scanner availability, protected-content status, and
needs-info items. The registry discovery walks `skills/unslopify/` and a
consumer runs `npx skills add RuralNative/RuralNative-SKILLS --skill
unslopify`. The repo never carries its own install — `.agents/` and
`skills-lock.json` are ignored. Model-only path holds the full contract when
Python is absent.

## Non-negotiables

1. **INV-1** — `SKILL.md` frontmatter `name` equals the folder name
   `unslopify`.
2. **INV-2** — The parity catalog maps upstream rules 1 through 31 to stable local
   `AIT-*` identifiers with no missing or duplicate upstream number, and
   `NOTICE.md` ships the source URL, pinned commit
   `99559f2f52047978602ef365589275831e76af07`, upstream copyright, and MIT
   permission notice. Six families LEX, STR, FMT, CONV, EVD, VOICE cover every
   upstream rule and the extended subtle tells. Mechanism: `reference/parity.md`
   and `NOTICE.md` parsed by parity test via `skills/unslopify/reference/parity.md`.
3. **INV-3** — Caller owns scope and protected content is preserved byte for
   byte unless explicitly included: code fences, inline code, commands,
   frontmatter, link destinations, anchors, HTML comments, Markdown structure,
   table syntax, quotations, citations, names, numbers, dates, units, glossary
   terms, identifiers, and marked verbatim ranges remain unchanged; visible
   prose inside tables may be reviewed but cell boundaries stay. Verbatim ranges
   use `<!-- unslopify:off -->` and `<!-- unslopify:on -->`, do not nest, and
   an unmatched marker stops the pass with no partial output. Scope is explicit
   for standalone runs and parent-supplied scope overrides, including a
   repository sweep; the skill never expands scope on its own. Mechanism:
   preservation fixtures via `reference/parity.md` contract and prose audit of
   SKILL scope and marker sections.
4. **INV-4** — English-only behavior: non-English passages remain unchanged and
   only English prose is revised; mixed-language documents may have their
   English passages reviewed. Safe minimal rewrite is the default: only spans
   supported by an accepted finding change, and opinion, first person, emotional
   reaction, and deliberate irregularity appear only when requested or already
   present. Candidates remain candidates until context, technical exactness,
   quotation, and domain vocabulary decide; every accepted finding reports
   stable identifier, family, span, evidence, confidence, and action. Mechanism:
   prose invariant — SKILL scope states non-English remains unchanged and no
   translation occurs, rewrite contract and candidate section enforce minimal
   context-aware edits and finding format.
5. **INV-5** — Optional advisory scanning remains advisory: a measurable
   scanner may report findings with evidence but never rewrites files or fails
   the gate because a style signal was found; the model-only path completes the
   full contract when Python is absent. The completion report also names
   rejected findings, scanner availability, protected-content status, and
   unresolved `needs-info` items, and a final preservation audit checks
   protected-content equality and factual equality. Mechanism: prose invariant
   — SKILL preserves model-only path and NOTICE declares no network or CI
   blocking, plus preservation audit section.

## Links

- Glossary: `CONTEXT.md` — AI tell, skill identity, skill naming convention.
- Decision: `docs/adr/0005-unslopify-utility-identity-and-hard-dependency.md`
  — utility exception and hard dependency.
- Decision: `docs/adr/0004-verb-named-skills-flat-shelf.md` — default naming.
- Harness: `scripts/docs-check.sh`.
- Template: `skills/document-for-agents/reference/templates.md` — the shape this
  leaf doc follows.
