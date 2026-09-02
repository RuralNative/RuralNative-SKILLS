# 0029 — Unslopify session-start setup, plain language, and always-replace phrases

Status: accepted
Narrows: 0015 (exact-use preservation clause for `load bearing` only)
Date: 2026-09-02

Decision: `unslopify` owns one block in the active project's root
`AGENTS.md` (Session-start setup): created or updated automatically on first
load, placed directly after a `document-for-agents` management marker when
present, otherwise after valid frontmatter or at byte zero; silent on repeat;
never partially applied when markers are duplicate, unmatched, reversed, or
nested, when the file is a symlink or says another generator owns it, or when
writes are forbidden. This is a narrow exception to caller-owned scope and
protected comments: it covers only root `AGENTS.md` and only the owned block;
every byte outside the block stays protected. All model-authored English
additionally follows two layers of plain language — active drafting
(practical point first, common words, direct sentences, one choice at a time,
necessary specialist terms explained where they first appear) and a silent
passive pre-send check that removes needless jargon, inflated wording, and
clever-sounding phrases — with no audit report unless the user explicitly
asks for one; plain language changes how the explanation is written, not what
the system does. `load-bearing`/`load bearing`, `smoking gun`, and `smoke
test`/`smoke tests` become always-replace `AIT-LEX-009` phrases, replaced
even when technically correct in ordinary prose; `vertical slice` and `native
dependency edges` stay context-aware `AIT-LEX-008` candidates. The scanner
behavior version moves to `1.1`; the JSON schema version stays `1.0`.

Why: the Skills CLI has no skill-defined setup hook — `npx skills add` only
clones, discovers, and copies or links files — so persistent session loading
is only possible through a file the skill maintains itself, and root
`AGENTS.md` is the entry point every agent reads. The clever-name phrases hid
their concrete point from readers outside the project; ADR-0015's exact-use
exception kept the euphemism alive in ordinary prose, so the three phrases
now move to replacement while quotations, commands, identifiers, and names
stay protected. Plain drafting plus a silent check makes every question and
response easy to understand without adding report noise.

Consequences:
- Narrows ADR-0015: exact-domain preservation of `load bearing` is dropped;
  it is always replaced under `AIT-LEX-009`.
- Narrows `unslopify:INV-3`: caller-owned scope gains the single named
  root-`AGENTS.md` owned-block exception; repeated no-op checks stay silent.
- `unslopify:INV-8` records the setup and plain-language contract; the
  revised `unslopify:INV-6` records the phrase change.
- `INSTALL.md` states the missing setup hook and the one initial invocation
  per project; the first automatic write may leave an intentional tracked
  change, reported once and never committed automatically.
- Generated `AGENTS.md` files under the `document-for-agents` lifecycle carry
  the same block directly after the management marker; Establish, Improve,
  and Maintain preserve it.
- `document-for-humans` derived pages restate the always-on behavior with
  the session-loading note; the README shelf text matches.
