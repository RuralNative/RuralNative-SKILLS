# 0006 — Fixed-template workflow adapters plan-this and implement-this

Status: accepted
Date: 2026-08-19

Decision: Two workflow skills ship as fixed-template adapters with exact user-facing identities `plan-this` and `implement-this`. Their `SKILL.md` frontmatter `name` equals their folder names `plan-this` and `implement-this`, and their `description` declares the explicit user invocation `/plan-this <task>` and `/implement-this #<n>`. Each skill preserves its supplied prefix verbatim and substitutes only the task under `## Task:` or the issue reference in place of `Issue #0`. No other substitution, renaming, or reinterpretation is permitted. Commands, identifiers, labels, dependency names, quotations, and technical meaning stay unchanged. The skills are user-invoked only and do not add router skills, `.kilo/command/` files, runtime scripts, or model-based evals.

Why: Users paste long planning and implementation prefixes into every request. Repeating that text costs tokens, weakens prompt caching, and allows required workflow rules to drift. The prefixes are stable contracts; only the task text or issue number changes. A thin adapter keeps the process fixed while accepting that one varying input. Verb-first audience-suffixed naming would obscure the explicit slash commands `/plan-this` and `/implement-this`, so a narrow task-scoped exception to ADR-0004 applies, similar to the utility exception in ADR-0005. Keeping each skill a seam of its own preserves one-folder-one-skill registration and avoids a shared router mutation point.

Consequences:
- The glossary's skill naming convention carries a narrow exception for task-scoped fixed-template workflow adapters, pointing to this decision.
- ADR-0004 remains the default; this decision does not permit additional naming deviations and does not allow router skills.
- The architecture index adds the `plan-this` seam, its leaf doc, and this ADR; the `implement-this` seam lands in the follow-up slice blocked by this one.
- `plan-this` declares hard dependencies on `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/unslop`, in the order required by the supplied planning prefix; `implement-this` declares `/implement`, `/code-review`, and `/unslop` following its prefix.
- `/unslop` is the external dependency identity `https://www.skills.sh/cursor/plugins/unslop`. This repository's existing `unslopify` utility stays unchanged; the adapters do not silently map `/unslop` to `unslopify`.
- Registry-lane discovery uses `npx skills add RuralNative/RuralNative-SKILLS --skill plan-this` and `--skill implement-this` with matching folder identities.
- Tests verify identity == folder, explicit invocation, exact prefix sections, workflow dependency order, placeholder substitution, and absence of extra runtime machinery.
