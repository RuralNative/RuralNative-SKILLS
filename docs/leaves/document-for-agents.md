# Seam: document-for-agents

## Purpose

Doc-cache lifecycle: establish, audit, improve, maintain. Outputs: cache accuracy, attention control. Preflight re-evaluates the tier; seams stay coherent.
**Not here**: code architecture to its seam; review to `review-this`; prose to `unslopify`.
## Non-negotiables

1. **INV-1** — `name` equals folder `document-for-agents`.
2. **INV-2** — INSTALL registry-lane; provenance, residual trust, overwrite approval.
3. **INV-3** — Reference files resolve relative to `SKILL.md`; no absolute paths.
4. **INV-4** — Registry lane only.
5. **INV-5** — `.agents/`, `skills-lock.json` never committed.
6. **INV-6** — `unslopify` by skill identity before prose; missing stops; model-only without Python.
7. **INV-7** — Generated `AGENTS.md` starts with the five commands in order.
8. **INV-8** — Loading rows are hard caps; missing fact is a cache gap; widening needs owner approval.
9. **INV-9** — Leaf closes with a `Not here` route by stable responsibility, never a path.
10. **INV-10** — Work against a numbered invariant stops until an approved decision narrows it.
11. **INV-11** — Adopting repos use the singular `reference/vendor-facts.md`.
12. **INV-12** — `unslopify` dependency block below Principles and Boundaries.
13. **INV-13** — Harness: eleven checks; check 2 is seam coherence.
14. **INV-14** — Opt-in private diagnostics (ADR-0018/0028): first-run consent in private state; notice, revocation; sanitized; outside cache/read sets; confirmed/likely/unknown.
15. **INV-15** — Generated `AGENTS.md` carries one protected marker after the five commands; evidence backs provenance, else likely/unknown.
16. **INV-16** — Audit read-only; additive tier promotion automatic; destructive Improve gated by one preview and approval.
17. **INV-17** — Deterministic; dedupes; exact `— requires.` and `- Glossary:` load; exact-token status; citations navigate; 18,000 absolute cap (ADR-0030); manifest out.
18. **INV-18** — Preflight re-evaluates tier each branch; promotion monotonic and additive; never auto-demote.
19. **INV-19** — Decision gate captures rationale prospectively; legacy rationale from evidence only, else `unknown`.
20. **INV-20** — Seam coherence fingerprint per seam; stale fails dirty and clean; refresh only after claim review.
21. **INV-21** — Generated `AGENTS.md` keeps the five commands, the management marker, and exactly one unslopify session-start block after the marker; Establish, Maintain, and Improve preserve it byte for byte (ADR-0029).
## Links

Decisions: ADR-0001..0030. Review policy: `REVIEW.md` (check 8). Harness: `scripts/docs-check.sh`. Redirect: `docs/leaves/ext/document-for-agents.md`.
- Glossary: `CONTEXT.md` — Decision journal.
