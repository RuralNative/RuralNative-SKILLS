<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-19 · Sources: ARCHITECTURE.md, CONTEXT.md -->

# RuralNative-SKILLS — in plain words

What this is: a public shelf of skills for AI coding agents. A skill is a
ready-made pack of instructions that teaches an agent how to do a job the
proven way, and anyone can install one and load it into their agent. Most
skill names start with the doing-word and say who they serve; the shelf
currently holds three: document-for-agents, document-for-humans, and
unslopify, the audience-neutral utility that cleans AI tells from explicit prose
while keeping meaning, evidence, and tone.

Why it exists: an agent starts every session from scratch. Loading a skill
hands it instructions that already work, so the agent spends its effort on
the task instead of rediscovering how the task should be done. For prose
cleanup, the caller names the scope, the skill checks only that scope,
protected content such as code, links, and verbatim ranges stays untouched,
and an optional Python scanner can add repeatable evidence without writing
source or blocking the gate.

Who it serves: agent users who install skills from the public registry to get
reliable, pre-built workflows without building them from scratch each time.

Where to object: the decision journal — big changes land there first.

Go deeper:

- depth: ARCHITECTURE.md — how the shelf is organised and what lives where
