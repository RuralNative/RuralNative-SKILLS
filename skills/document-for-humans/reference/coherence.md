# Coherence — prevention and freshness

## Prevention stack (strongest first)

1. `Read-set absence (mechanical): no human doc appears in any agent read set or loading-protocol row. Agents navigate by the index; absence is invisibility. Enforced by the adopting repo's gate: a human-doc path in a read-set row fails.`
2. `Link direction (mechanical): markdown links point one way — human → AI. A link from outside docs/human/ into it fails the gate; prose mentions without links pass.`
3. `Directory isolation (structural): everything human lives under docs/human/.`
4. `Naming (structural): files named for their artifact — overview.md, decision-journal.md, guardrails.md, data-flow.md.`
5. `Header comment (advisory, honestly labeled): the derived header warns any agent that wanders in. It is garnish — never rely on it.`

## Derived freshness

`Every human doc's Derived stamp must postdate every change to its sources: a source committed after the stamp, or changed in the working tree while the derived doc is untouched, fails the gate. Regeneration clears it. The rule is dormant until the first human doc exists — do not pre-create it for empty categories.`

## Audit checks

`Audit checks source resolution, claim traceability, freshness, bridge direction, artifact need, and plain-language limits separately. Each check has its own evidence and fix.`

## Adaptation

- `Repos without an accepted ADR: the decision journal category stays dormant. Do not derive journal claims from commit messages. Record the decision in the authored tree first or leave the category dormant until an ADR is accepted.`
- `Single-seam repos: fold artifacts into one overview.`
- `The gate extension is additive: it never renumbers the adopting repo's existing checks.`
- `Dormant categories stay unborn: no file, no header, no gate check until a real reader and question require the artifact.`

## Language

- `English-only v1: non-English passages stay unchanged, including inside mixed-language documents. Only English prose is reviewed.`

## Regeneration

- `Same-diff regeneration: a change to a source regenerates its derived docs in the same diff. The gate enforces it.`
