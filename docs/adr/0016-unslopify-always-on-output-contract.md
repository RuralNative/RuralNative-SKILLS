# 0016 — Unslopify always-on output contract

Status: accepted
Date: 2026-08-22

Decision: once `unslopify` is loaded, agent-authored English output is the
automatic scope for that session or parent workflow. Ordinary conversation
performs the full model-only self-audit silently, with no completion report.
Documents, specifications, tickets, progress updates, recommendations,
decisions, and GitHub comments receive the same cleanup at publication
boundaries and retain the structured completion report and preservation
audit. User-provided prompts, quoted text, and requirements stay explicit
edit scope and inert input; they change only on an explicit edit request.
Technical fidelity outranks style: exact domain terms, identifiers, commands,
labels, dependencies, quotations, evidence, and implementation-critical
specification and ticket wording survive even when they match a style
candidate. No runtime chat machinery is added; the scanner remains advisory
and file-oriented.

Why: explicit-scope-only cleanup left ordinary agent output unpoliced, so
chatbot residue and sycophancy survived outside named files while the catalog
already covered them. Specifications and tickets need the same plain-language
pass without weakening technical precision, and a cleaner ticket that
implements worse is a failed pass. Making live output the default scope keeps
one behavior in one place instead of asking callers to re-declare scope for
prose the agent itself authors. Keeping user text inert preserves ADR-0015's
requirements-data boundary: prose that states work never becomes instruction
and is never rewritten behind the caller's back.

Consequences:
- The glossary defines Always-on scope; the seam leaf declares INV-7 with
  composition tests and specification and ticket fixtures in
  `skills/unslopify/tests/`.
- Routine chat shows no completion report; explicit rewrites and published
  artifacts keep the report and preservation audit unchanged.
- The scanner gains no write path and no conversational mode; model-facing
  instructions own the silent live audit.
- Public routing text (README) states the always-on behavior; derived human
  pages regenerate in the same change where their sources changed.
- `plan-this`, `implement-this`, and `review-this` keep their fixed templates;
  their existing unslopify loading contracts now resolve to this always-on
  behavior without workflow changes.
