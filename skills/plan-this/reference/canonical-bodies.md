# Canonical parent and ticket bodies

`/plan-this` publishes the parent specification and every implementation
ticket from these literal templates (ADR-0037, ADR-0038). Copy the body for
the issue being published, keep every section heading exactly as written,
replace example values with the settled content, and add no extra top-level
`##` section outside the lists below. Decisions belong in one settlement
home only: the parent's `## Solution` and the ticket's
`## Settled decisions` — never both. New acceptance criteria publish as
single-line checkbox records; start them unchecked.

Use `None` only for a genuinely empty field. All requirement-bearing content
lives inside the fingerprinted sections; keep affected seams, criteria,
constraints, blockers, settlement decisions, risk, and verification intent
there and nowhere else. Before approval, validate the filled body with
`validateAuthoritativeBody` (or the bundled `workflow-cli.mjs planning`
command); a body that fails validation never publishes.

## Parent specification template

```markdown
## Affected seams

- <affected seam identity>

## Acceptance criteria

- [ ] AC-1: <observable behavior the parent specification must produce>

## Structural constraints

- <constraint, or None>

## Blocked by

- <parent-level blocker issue reference, or None>

## Solution

- <settled parent decisions, one decision per bullet>

## Risk

- <ordinary, or high-risk plus the evidence that raises it>

## Smallest sufficient verification

- <command(s) that prove the parent specification's own scope>
```

## Implementation ticket template

```markdown
## Affected seams

- <affected seam identity>

## Acceptance criteria

- [ ] AC-1: <observable behavior this ticket must produce>

## Structural constraints

- <constraint, or None>

## Blocked by

- <native blocker issue reference, or None>

## Settled decisions

- <settled ticket decisions, one decision per bullet>

## Risk

- <ordinary, or high-risk plus the evidence that raises it>

## Smallest sufficient verification

- <command(s) that prove this ticket's behavior>
```

Rules:

- The stable criterion key is the issue number plus the local ID, so parent
  `AC-1` and ticket `AC-1` are different obligations; the same local ID is
  never repeated inside one issue. Clearer wording keeps the same ID; changed
  observable behavior retires the old ID with an explicit `(retired)` marker
  and publishes a new one.
- A checked box is never completion evidence and never retires a criterion;
  new output always starts unchecked.
- Add a native blocker edge only for a real dependency. File overlap without
  a semantic dependency is a sibling scheduling note, not a blocker.
- Do not rewrite an already published issue for formatting alone.
