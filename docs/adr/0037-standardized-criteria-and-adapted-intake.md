# 0037 — Standardized checkbox criteria and adapted intake

Status: accepted
Date: 2026-09-09
Narrows: 0034 (planning-body validation before pinning), 0031 (stable-ID and
requirements-revision trust, unchanged in substance)

Decision:

- `/plan-this` standardizes new active acceptance criteria in both parent
  specifications and implementation tickets as single-line GitHub checkbox
  records under `## Acceptance criteria`: `- [ ] AC-1: text`. New output
  starts unchecked. A checked box is never completion evidence and never
  retires a criterion; retired records keep the explicit `(retired)` marker.
  Existing published issues are never rewritten for formatting alone.
- The shared core's criterion parser accepts the standardized checkbox form,
  the legacy bullet form `- \`AC-1\`: text`, and the bare-ID form
  `AC-1: text`, with optional backticks. `validateAuthoritativeBody` remains
  the strict canonical publisher gate and now accepts all three forms;
  numbered lists, multiline continuations, missing sections, duplicate
  headings, and duplicate IDs still stop publication.
- Consumers (`implement-this`, `review-this`, `fix-this`) resolve a body
  through one shared consumption resolver instead of rejecting it outright.
  A body that passes canonical validation is canonical. A body that fails
  canonical formatting may adapt when its requirements are unambiguous:
  recognized acceptance sections (Markdown headings, bold labels, or
  standalone labels), explicit stable criterion IDs, bounded continuation
  folding, and fence-aware extraction. Duplicate IDs, ambiguous boundaries,
  contradictory sections, unbalanced workflow-evidence markers, and missing
  or unclear requirements still stop. Checkbox state never enters criterion
  status and never satisfies acceptance evidence.
- Requirements revisions gain a second explicit version. When both bodies
  resolve canonical, the existing `requirements-v1` fingerprint is computed
  byte-for-byte as before; equivalent bullets and checkbox records produce
  identical v1 values because checkbox state is not requirement status. When
  either body requires adaptation, the pair carries
  `requirements-adapted-v1` and fingerprints the complete normalized parent
  and ticket bodies, excluding only structurally validated workflow evidence
  blocks outside fences. This is deliberately conservative: any edit to an
  adapted body, including checkbox toggling and prose-only changes,
  invalidates the pin. Pin rendering, well-formedness, the requirements
  gate, evidence handoffs, review handoffs, and fix eligibility accept both
  versions explicitly and reject unknown versions; a missing or malformed
  pin never continues, and `requirementsGate("", "")` stops.
- Adaptation is read-only intake. It never rewrites issue bodies, never
  invents criterion IDs, never fabricates canonical sections, and never
  repins existing evidence. All four workflow skills ship from the same
  repository revision; older consumers reject the adapted version instead of
  misreading it.

Why: a benchmark repository published a complete, unambiguous specification
and ticket set in its own template with GitHub checkbox criteria; the strict
canonical gate read nine explicit criteria as zero and blocked the entire
frontier. Blocking clear, current requirements on formatting alone made
implementation brittle, while silently bypassing validation would fingerprint
only recognized sections and hide requirement changes. Standardizing the
publisher on checkbox criteria plus a bounded, conservative adapted intake
preserves stable IDs, readiness checks, and freshness for every stage.

Consequences:

- plan-this INV-12/INV-13, implement-this INV-13/INV-15, review-this and
  fix-this requirements-revision invariants cover the standardized checkbox
  format and the adapted intake; their wording narrows, not retires.
- The shared core gains the consumption resolver, the adapted revision
  version, and whole-body hashing with evidence-block exclusion; the
  implement-this evidence validator reuses shared pin validation instead of
  a private regex.
- Canonical publication validation stays strict; canonical v1 fingerprints
  for existing records are unchanged. Adapted fingerprints are strictly
  more sensitive than v1, never less.

Activation: this decision governs new invocations of all four commands from
today. Roll out plan-this, implement-this, review-this, and fix-this from
the same repository revision.
