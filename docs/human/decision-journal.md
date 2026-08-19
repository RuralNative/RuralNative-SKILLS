<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-19 · Sources: docs/adr/0001-distribute-as-public-catalog-shelf.md, docs/adr/0002-adopt-ten-check-gate.md, docs/adr/0003-human-first-derived-artifacts.md, docs/adr/0004-verb-named-skills-flat-shelf.md, docs/adr/0005-unslopify-utility-identity-and-hard-dependency.md -->

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

### 2026-08-18 — The skills get verb names, and there is no router

What changed: the two skills were renamed to start with a doing-word and say
who they serve — document-for-agents and document-for-humans — and the shelf
stays flat: no parent skill that picks between them.

Why: names that lead with the action are easier to choose correctly, and a
router skill would cost every session a detour to re-learn what the skill
descriptions already say for free.

What it costs you: if you installed a skill under its old name, the install
command changes — reinstall with the new name.

Object or discuss: ADR 0004 — the [decision record](https://github.com/RuralNative/RuralNative-SKILLS/blob/main/docs/adr/0004-verb-named-skills-flat-shelf.md) and its [issue](https://github.com/RuralNative/RuralNative-SKILLS/issues/35).

### 2026-08-19 — Unslopify arrives as an audience-neutral utility

What changed: a third skill, unslopify, joined the shelf to clean AI tells
from explicit prose. It carries the 31 upstream patterns with stable `AIT-*`
identifiers and the upstream MIT notice, and both documentation skills now
list it as an approved hard dependency that later slices will wire in.

Why: the same AI-tell patterns appear in agent docs and human docs. A single
utility avoids copying the same 31 rules into two places and inventing a false
audience split with two suffixed names.

What it costs you: `unslopify` installs alone with one command for prose
cleanup; documentation workflows will require it once the wiring lands, and
until then they do not yet enforce it.

Object or discuss: ADR 0005 — the [decision record](https://github.com/RuralNative/RuralNative-SKILLS/blob/main/docs/adr/0005-unslopify-utility-identity-and-hard-dependency.md) and its [issue](https://github.com/RuralNative/RuralNative-SKILLS/issues/40).
