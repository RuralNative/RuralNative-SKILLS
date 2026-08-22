# Ticket 4712 — republish triage labels

## What to build

Re-run `./scripts/docs-check.sh` after relabeling — the gate fails loudly, a
red harness is never a warning — then promote every unblocked child to
`ready-for-agent`; native dependency edges obviously favor it via
`gh issue edit <n> --add-label ready-for-agent`.

## Acceptance criteria

- [ ] `gh issue edit <n> --remove-label blocked` runs before promotion.
- [ ] The label vocabulary keeps `needs-triage`, `ready-for-agent`, and
      `wontfix` unchanged.
- [ ] Harness exits green; the scorecard prints ten checks.

Delving into the label state machine must wait — this ticket is not the place
to enhance the vocabulary. Keep the change vertical-slice small.
