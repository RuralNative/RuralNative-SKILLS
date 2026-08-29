# Seam: document-for-agents

## Purpose

Runs the doc-cache lifecycle: establish, audit, improve, maintain agent-facing docs. Two outputs: cache accuracy and attention control.
**Not here**: code architecture to its seam; review to `review-this`; prose to `unslopify`.
## Non-negotiables

1. **INV-1** — `name` equals folder `document-for-agents`.2. **INV-2** — INSTALL registry-lane; provenance, residual trust, overwrite approval.
3. **INV-3** — Reference files resolve relative to `SKILL.md`; no absolute paths.
4. **INV-4** — Registry lane only.
5. **INV-5** — `.agents/`, `skills-lock.json` never committed.
6. **INV-6** — `unslopify` by skill identity before user-visible prose; missing stops; model-only without Python.
7. **INV-7** — Generated `AGENTS.md` starts with the five commands in order.
8. **INV-8** — Loading rows and budgets are hard caps on orientation documents; a missing fact is a cache gap; do not widen the read set until owner approval.
9. **INV-9** — Leaf shape closes with a `Not here` route by stable responsibility, never a file path.
10. **INV-10** — A task conflicting with a numbered invariant stops until an approved decision supersedes or narrows it.
11. **INV-11** — Adopting repos use the singular `reference/vendor-facts.md`.
12. **INV-12** — `unslopify` dependency block below Principles and Boundaries.
13. **INV-13** — Harness size: eleven checks, per ADR-0024 superseding the exact-ten-check clause of ADR-0017.14. **INV-14** — Opt-in private diagnostics: consent, notice, revocation, append-only outside doc cache/read sets, sanitized, confirmed only; states confirmed/likely/unknown.
15. **INV-15** — Generated `AGENTS.md` carries one protected management marker after the five commands; provenance confirmed with evidence, else likely/unknown.16. **INV-16** — Audit read-only; Improve shows one preview, no changes before one approval.17. **INV-17** — Orientation resolver deterministic; deduplicates; excludes superseded ADRs unless required; 12,000-byte cap; manifest outside resolved sets.## Links

Glossary: `CONTEXT.md`. Decisions: ADR-0001, ADR-0002, ADR-0017, ADR-0018, ADR-0024. Review policy: `REVIEW.md` (check 8). Harness: `scripts/docs-check.sh`. Redirect: `docs/leaves/ext/document-for-agents.md`.
