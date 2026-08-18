# Coherence — prevention and freshness

## Prevention stack (strongest first)

1. `Read-set absence (mechanical): no human doc appears in any agent read set or loading-protocol row. Agents navigate by the index; absence is invisibility. Enforced by the adopting repo's gate: a human-doc path in a read-set row fails.`
2. `Link direction (mechanical): markdown links point one way — human → AI. A link from outside docs/human/ into it fails the gate; prose mentions without links pass.`
3. `Directory isolation (structural): everything human lives under docs/human/.`
4. `Naming (structural): files named for their artifact — overview.md, decision-journal.md, guardrails.md, data-flow.md.`
5. `Header comment (advisory, honestly labeled): the derived header warns any agent that wanders in. It is garnish — never rely on it.`

## Derived freshness

`Every human doc's Derived stamp must postdate every change to its sources: a source committed after the stamp, or changed in the working tree while the derived doc is untouched, fails the gate. Regeneration clears it. The rule is dormant until the first human doc exists — do not pre-create it for empty categories.`

## Adaptation

- `Repos without ADRs: journal decisions from commit messages until the first ADR lands.`
- `Single-seam repos: fold artifacts into one overview.`
- `The gate extension is additive: it never renumbers the adopting repo's existing checks.`
