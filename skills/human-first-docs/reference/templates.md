# Templates — the four artifacts

## The derived header

Every human-first doc opens with this block; the gate reads it for freshness, agents read it for regeneration, humans never need to see it rendered:

```
<!-- human-first: derived artifact — agents regenerate, never cite as ground truth
     Derived: YYYY-MM-DD
     Sources: <path>, <path> -->
```

## Overview

One page: what this is, why it exists, who it serves. Carries the standing note: "Big changes land in the decision journal first — object there."

```
# <Project> — in plain words

What this is: <one paragraph, no code terms>.
Why it exists: <the value, from the seam table's responsibilities>.
Who it serves: <audiences, from the routing table>.
Where to object: the decision journal — big changes land there first.
```

## Decision journal

Append-only: one entry per accepted decision, newest last. The stakeholder's intervention surface — each entry links the ADR and its issue.

```
### <YYYY-MM-DD> — <decision title in plain words>

What changed: <one sentence>.
Why: <one sentence, from the ADR's Why>.
What it costs you: <one sentence — the stakeholder-relevant consequence>.
Object or discuss: ADR <NNNN> — <link to the ADR and its issue>.
```

## Guardrails at a glance

The live invariants in plain words, one line each, derived from leaf docs' Non-negotiables. Written for vibe coders whose agents never see this page.

```
## Guardrails

- <INV-N in plain words> — because <the reason>. (depth: <leaf doc path>)
```

## Data flow

Narrative-first: one directed story from entry to rest, derived from leaf docs' data-flow sections. At most one Mermaid diagram; if code and diagram disagree, the narrative wins and the diagram regenerates.

```
## How information moves

<One paragraph walking one unit of work from entry point to resting place.
Names seams by their table responsibilities, never by file paths.>

depth: <leaf docs whose data-flow sections this derives from>
```

## Capabilities catalog (dormant)

Do not create this artifact until a real consumer asks what the system can do; then derive it from the seam table's responsibility column. Dormant categories stay unborn.
