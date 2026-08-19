# Seam: unslopify

## Purpose

The skill that removes AI tells from explicit prose while preserving meaning,
evidence, and tone. It is the audience-neutral utility for documentation and
general prose cleanup, derived from the upstream `unslop` baseline.

## Scope & boundaries

Owns: the content under `skills/unslopify/` — `SKILL.md`, `NOTICE.md`,
`INSTALL.md`, `reference/parity.md`. Delegates: documentation lifecycle
decisions to `document-for-agents`; human-voice derivation to
`document-for-humans`; scope selection to the caller. The seam does not own
scanner implementation, language detection beyond English scope, or authorship
classification.

## Key files & data flow

`SKILL.md` is the entry point; its frontmatter `name` is the skill identity.
`reference/parity.md` maps upstream rules 1..31 to stable local `AIT-*`
identifiers. `NOTICE.md` ships the pinned source commit, URL, copyright, and
MIT permission. The consumption path: caller provides explicit scope → the
skill scans for the 31 pattern families → it rewrites only supported spans →
it self-audits the result. The registry discovery walks `skills/unslopify/`
and a consumer runs `npx skills add RuralNative/RuralNative-SKILLS --skill
unslopify`. The repo never carries its own install — `.agents/` and
`skills-lock.json` are ignored.

## Non-negotiables

1. **INV-1** — `SKILL.md` frontmatter `name` equals the folder name
   `unslopify`.
2. **INV-2** — The parity catalog maps upstream rules 1 through 31 to stable local
   `AIT-*` identifiers with no missing or duplicate upstream number, and
   `NOTICE.md` ships the source URL, pinned commit
   `99559f2f52047978602ef365589275831e76af07`, upstream copyright, and MIT
   permission notice. Mechanism: `reference/parity.md` and `NOTICE.md` parsed
   by parity test via `skills/unslopify/reference/parity.md`.
3. **INV-3** — Caller owns scope and protected content is preserved byte for
   byte unless explicitly included: code fences, inline code, frontmatter, link
   destinations, anchors, HTML comments, table structure, quotations, citations,
   names, numbers, dates, units, glossary terms, and identifiers remain
   unchanged. Mechanism: preservation fixtures via `reference/parity.md`
   contract and prose audit of SKILL scope section.
4. **INV-4** — English-only behavior: non-English passages remain unchanged and
   only English prose is revised; mixed-language documents may have their
   English passages reviewed. Mechanism: prose invariant — SKILL scope states
   non-English remains unchanged and no translation occurs.
5. **INV-5** — Optional advisory scanning remains advisory: a measurable
   scanner may report findings with evidence but never rewrites files or fails
   the gate because a style signal was found. Mechanism: prose invariant —
   SKILL preserves model-only path and NOTICE declares no network or CI
   blocking.

## Links

- Glossary: `CONTEXT.md` — AI tell, skill identity, skill naming convention.
- Decision: `docs/adr/0005-unslopify-utility-identity-and-hard-dependency.md`
  — utility exception and hard dependency.
- Decision: `docs/adr/0004-verb-named-skills-flat-shelf.md` — default naming.
- Harness: `scripts/docs-check.sh`.
- Template: `skills/document-for-agents/reference/templates.md` — the shape this
  leaf doc follows.
