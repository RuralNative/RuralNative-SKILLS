<!-- human-first: derived artifact — agents regenerate, never cite as ground truth · Derived: 2026-08-19 · Regenerated: #65 supervised execution · Sources: ARCHITECTURE.md, CONTEXT.md, docs/leaves/supervise-this.md, docs/leaves/plan-this.md, docs/leaves/implement-this.md -->

# RuralNative-SKILLS — in plain words

What this is: a public shelf of skills for AI coding agents. A skill is a
ready-made pack of instructions that teaches an agent how to do a job the
proven way, and anyone can install one and load it into their agent. Most
skill names start with the doing-word and say who they serve; the shelf
currently holds seven: document-for-agents, document-for-humans, unslopify, the
audience-neutral utility that cleans AI tells from explicit prose while keeping
meaning, evidence, and tone, plan-this, the fixed-template planning adapter
invoked either directly as `/plan-this <task>` or via narrow delegation from an
active `supervise-this` run that preserves the planning prefix verbatim under
`## Task:` and delegates to `/grill-with-docs` → `/to-spec` → `/to-tickets`
with `/unslop` active and rejects unrelated invocation, implement-this, the
fixed-template implementation adapter invoked as `/implement-this #<n>` directly or as one issue delegated by an active `supervise-this` run in a dedicated Agent Manager worktree that preserves the
implementation prefix verbatim in place of `Issue #0` and delegates to
`/implement` → `/code-review` with `/unslop` active, supervise-this, the coordinator that takes explicit planning, implementation, and optional review model and variant choices, resolves each through `agent_manager_models` with no hard-coded allowlist, shows the exact resolved configuration for approval, starts planning as a local Agent Manager session that delegates to `plan-this`, records the resolved configuration on the parent for later resume, reads that structured configuration recorded by #67 before starting implementation and treats the newest valid structured parent comment as authority, records a fixed review base, runs the ready frontier through at most three worktrees each delegating to `implement-this` with the exact confirmed implementation model and variant, treats a ticket as done only when GitHub shows it closed with evidence and a commit on `origin/main`, refills freed slots in parent order, runs full verification after all children land, then runs integrated `code-review` locally with the exact confirmed review model and variant and the recorded base, posts parent evidence, and closes the parent only when checks pass and the review has no confirmed finding. Implementation and final-review model routing are explicit: workers and follow-ups use the implementation selection, reviews use the review selection, and the final review does not inherit the supervisor or implementation model unless that model is the recorded review selection, and release-skills, the
universal release workflow that auto-detects version files and changelogs. Both
documentation skills declare `unslopify` as a hard dependency and will not
publish prose without it.

Why it exists: an agent starts every session from scratch. Loading a skill
hands it instructions that already work, so the agent spends its effort on
the task instead of rediscovering how the task should be done. For prose
cleanup, the caller names the scope, the skill checks only that scope,
protected content such as code, links, and verbatim ranges stays untouched,
and an optional Python scanner can add repeatable evidence without writing
source or blocking the gate. For documentation work, `document-for-agents` and
`document-for-humans` load `unslopify` by skill identity before the first
user-visible prose, keep its contract active while drafting, and run a final
audit before publishing; parent scope and parent decisions outrank style fixes,
missing `unslopify` stops the workflow with `npx skills add
RuralNative/RuralNative-SKILLS --skill unslopify` and missing Python does not
stop it and the workflow continues model-only without weakening scope or
preservation, the catalog is never copied into the parent skills, and installed
runtime resolves by skill identity, not by a repository-relative path.
Standalone cleanup uses explicit human-provided scope; under a parent the
parent's chosen scope governs — routine work passes changed prose, an audit may
sweep the repository.

Who it serves: agent users who install skills from the public registry to get
reliable, pre-built workflows without building them from scratch each time.

Where to object: the decision journal — big changes land there first.

Go deeper:

- depth: ARCHITECTURE.md — how the shelf is organised and what lives where
