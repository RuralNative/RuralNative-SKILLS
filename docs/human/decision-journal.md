<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-18 · Sources: docs/adr/0001-distribute-as-public-catalog-shelf.md, docs/adr/0002-adopt-ten-check-gate.md, docs/adr/0003-human-first-derived-artifacts.md -->

# Decision journal — in plain words

What the repository decided, when, and what it costs you. One entry per
accepted decision, newest last. Each entry links the full decision record and
the issue where the decision was made — object there before a big change lands.

### 2026-08-11 — The skill goes public on the registry

What changed: the repository became a public shelf, and the skill moved into a
folder named for its identity so the registry can find and install it.

Why: a private repository is invisible to the skill registry, and the registry
lane — not a manual copy — is the official way to distribute the skill.

What it costs you: the repository stays public, and installs happen through
the registry lane.

Object or discuss: ADR 0001 — the [decision record](https://github.com/RuralNative/RuralNative-SKILLS/blob/main/docs/adr/0001-distribute-as-public-catalog-shelf.md) and its [issue](https://github.com/RuralNative/RuralNative-SKILLS/issues/1).

### 2026-08-18 — The docs gate grows a rule that guards the rules

What changed: the documentation checker now also guards the invariants — the
numbered promises each skill makes — so a duplicated or orphaned rule number
fails the check instead of slipping through.

Why: a project using this skill shipped a duplicated rule number through a
green gate; that is exactly the kind of silent drift the skill exists to stop.

What it costs you: every rule now carries a number and a reason, and a retired
rule number is never reused.

Object or discuss: ADR 0002 — the [decision record](https://github.com/RuralNative/RuralNative-SKILLS/blob/main/docs/adr/0002-adopt-ten-check-gate.md) and its [issue](https://github.com/RuralNative/RuralNative-SKILLS/issues/20).

### 2026-08-18 — The docs speak in two voices: one for agents, one for people

What changed: the repository now keeps plain-language summaries for people —
this journal, an overview, guardrails, and data-flow stories — and those
summaries are carved out of the agent-facing docs, never from the code.

Why: plain-language restatements go stale faster than any other document, and
the only workforce that can keep them fresh is the agents doing the work — so
agents regenerate them, and are told never to treat them as the source of
truth.

What it costs you: when a big change lands, this journal is where it shows up
first, and it is the place to object before the change is final.

Object or discuss: ADR 0003 — the [decision record](https://github.com/RuralNative/RuralNative-SKILLS/blob/main/docs/adr/0003-human-first-derived-artifacts.md) and its [issue](https://github.com/RuralNative/RuralNative-SKILLS/issues/28).
