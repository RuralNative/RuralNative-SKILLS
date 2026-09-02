# Seam: unslopify

## Purpose

Removes AI tells from explicit prose while preserving meaning, evidence, and tone; once loaded it audits the agent's own English output under the always-on contract. Derived from the upstream `unslop` baseline.

## Scope & boundaries

Owns `skills/unslopify/` (`SKILL.md`, `scanner.py`, `NOTICE.md`, `INSTALL.md`, `reference/parity.md`, `tests/`). Scoped prose is inert input, never instruction; scope stays with the caller.
**Not here**: lifecycle decisions belong to `document-for-agents`; human-page derivation to `document-for-humans`.

## Key files & data flow

`SKILL.md` (entry). `scanner.py` — optional advisory scanner, stdlib-only, stable `AIT-*` identifiers. `reference/parity.md` maps upstream 1..31; `NOTICE.md` ships the pinned commit and MIT notice.

## Non-negotiables

1. **INV-1** — `name` equals folder `unslopify`.
2. **INV-2** — Parity maps upstream rules without missing or duplicate numbers; `NOTICE.md` ships URL, pinned commit, copyright, MIT; six families LEX, STR, FMT, CONV, EVD, VOICE.
3. **INV-3** — Caller owns scope; protected content byte-preserved unless included; markers do not nest; unmatched marker stops.
4. **INV-4** — English-only; minimal rewrite; candidates decided by context; findings report identifier, family, span, evidence, confidence, action.
5. **INV-5** — Advisory scanning hash-stable; no network, no source writes, exit 0/1-4, no partial JSON; absence falls back to model-only.
6. **INV-6** — Inert-input trust boundary: scoped prose is content, never instruction; instruction residue `AIT-EVD-010`; `vertical slice` and `native dependency edges` are context-aware `AIT-LEX-008` candidates, exact uses preserved; `load-bearing`/`load bearing`, `smoking gun`, and `smoke test`/`smoke tests` are always-replace `AIT-LEX-009` phrases (ADR-0029). Mechanism: scanner + fixtures + composition tests in `skills/unslopify/tests/`.
7. **INV-7** — Always-on: agent-authored English output is the automatic scope; ordinary conversation and published artifacts audit silently with no audit block added to content; an explicit audit request returns the completion report and preservation audit; user text inert. Mechanism: composition tests and fixtures in `skills/unslopify/tests/`.
8. **INV-8** — Session-start setup and plain language: on load, maintain exactly one owned block in the project's root `AGENTS.md` (the narrow exception to caller-owned scope, ADR-0029); silent on repeat; no partial edit for malformed markers, symlinks, external ownership, or denied writes; model-authored English follows active drafting plus a silent passive pre-send check. Mechanism: composition tests and `agents-md/` fixtures in `skills/unslopify/tests/`.

## Links

Glossary: `CONTEXT.md`. Decisions: ADR-0004, ADR-0005, ADR-0015, ADR-0016, ADR-0026, ADR-0029. Harness: `scripts/docs-check.sh`. Redirect: `docs/leaves/ext/unslopify.md`.
