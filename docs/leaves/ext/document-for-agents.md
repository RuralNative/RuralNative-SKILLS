# Extended detail — document-for-agents

Restated reference material for `docs/leaves/document-for-agents.md`. Not a
leaf, not part of any orientation set. Code and tests are authoritative; this
file holds the longer key-file walk-through, invariant mechanism detail, and
coverage prose that the compact leaf core points past.

## Key files & data flow

`SKILL.md` is the entry point; its frontmatter `name` is the skill identity.
`reference/` files resolve relative to it; `reference/classify.md` governs
sizing, tier routing, and the invariant lifecycle, `reference/harness.md`
defines the gate, `reference/templates.md` holds the artifact shapes,
including the five-command index contract with its protected management
marker and provenance states, the sanitized skill diagnostics entry, the
byte-cap loading protocol with cache gaps, the `Not here` leaf route, and the
adopting-repository vendor-facts home. `reference/orientation.md` documents
the runtime orientation resolver contract — caps, resolution inputs,
deduplication, superseded-ADR exclusion, the coverage manifest, and cache-gap
approval — and the reference implementation ships as `orientation.ts` beside
it. `governance.ts` beside it implements the deterministic tier governor
(monotonic, additive promotion), the canonical seam fingerprint, and consent
resolution. The optional private diagnostics record and its private consent-state
record are governed by the consent checkpoint, notice, revocation, privacy, and
sanitization contract in `SKILL.md` and live outside every doc-cache tier and
orientation set. In adopting repositories that run the harness,
the exhaustive tier and coverage inventory lives in a harness-owned coverage
manifest excluded from every orientation set, and that manifest carries a `Seam
verification` table holding each documented seam's code fingerprint. Repository
review guidance
routes to policy: a root `REVIEW.md` is indexed from `ARCHITECTURE.md`,
checked by harness check 8 wherever it lives, and updated in the same change
as the rules it states. Cloud review reads the policy from the pull-request
base branch, and configuring that service stays external setup.

The consumption path: edit `skills/document-for-agents/SKILL.md` then push to
main, registry discovery lists the repo, a consumer runs `npx skills add
RuralNative/RuralNative-SKILLS --skill document-for-agents`. The repo never
carries its own install, `.agents/` and `skills-lock.json` are ignored. The
gate's check set is defined in `reference/harness.md`; this repo's
`scripts/docs-check.sh` enforces it, and its eleven checks are immutable while
their superseding decisions stand. During Maintain, code wins a doc conflict:
the agent fixes the doc in the same change and flags the discrepancy; changing
the rule requires a new decision.

## Invariant mechanisms

- INV-6 mechanism detail: short adapter in `SKILL.md` (skill-identity load,
  parent-owned scope, precedence, missing-dependency stop, model-only path,
  final audit, catalog-ownership note); dependency visible in `INSTALL.md`;
  composition tests in `skills/document-for-agents/tests/` encode the
  invariant including a fixture that minimal creates only index, glossary, and
  conventions policy and that installed runtime uses skill identity; the tests
  import the shared file reader and normalizer from `scripts/test-helpers.ts`.
- INV-14 mechanism detail: composition tests in
  `skills/document-for-agents/tests/` pin the approved sanitized fields
  against `reference/templates.md`, plus the inert category-sentinel
  `diagnostics-entry.json` fixture.
- INV-15 mechanism detail: marker-shape test on `reference/templates.md` and a
  placement test on this repository's own `AGENTS.md`.
- INV-16 mechanism detail: composition tests plus the `improve-preview` and
  `audit-readonly` fixtures in `skills/document-for-agents/tests/`.
- INV-17 mechanism detail: `orientation.test.ts` fixtures cover boundaries,
  deduplication, supersession, required-declaration loading, compact-citation
  exclusion, and read-only behavior; real-repository tests in the same file
  assert the exact resolved sources for representative seams; the declaration
  forms live in `reference/templates.md` and the owning contract is ADR-0024
  as narrowed by ADR-0025.
- INV-18 mechanism detail: `governance.ts` resolves the required tier and the
  monotonic, additive promotion; `governance.test.ts` proves every trigger,
  entry/completion re-evaluation, and the no-auto-demote rule; the SKILL.md
  preflight names the evidence thresholds.
- INV-19 mechanism detail: `governance.test.ts` and the decision-gate fixtures
  prove prospective capture, required alternatives and rejection reasons,
  evidence-only `Clarifies:` recovery, and `unknown` for unsupported rationale;
  the shapes live in `reference/templates.md`.
- INV-20 mechanism detail: `governance.ts` computes the canonical seam digest
  and `scripts/docs-check.sh` check 2 recomputes and compares it against the
  manifest's `Seam verification` table; `governance.test.ts` and the
  seam-coherence harness fixtures prove a code change fails without a refresh,
  a clean checkout fails, a leaf-only touch fails, and a reviewed refresh passes.
  A root outside a git work tree cannot produce a trustworthy digest and fails
  closed — never skipped, never the empty preimage (ADR-0028).
- INV-21 mechanism detail: marker-shape test on `reference/templates.md`, a
  placement test on this repository's own `AGENTS.md`, and composition tests
  in `skills/document-for-agents/tests/` prove the generated `AGENTS.md` keeps
  the five-command prefix, the management marker, and exactly one unslopify
  session-start block after it; Establish, Maintain, and Improve preserve the
  block byte for byte (ADR-0029).
