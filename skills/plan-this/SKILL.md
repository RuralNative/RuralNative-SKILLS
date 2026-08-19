---
name: plan-this
description: Apply the planning prefix as a fixed template. Use when the user invokes /plan-this <task> — substitutes only the task under ## Task: and delegates to /grill-with-docs, /to-spec, /to-tickets, and /unslop in order. Requires explicit user invocation as /plan-this <task>.
---

# plan-this — fixed-template planning adapter

This skill is a thin fixed-template adapter. It does not reimplement `/grill-with-docs`, `/to-spec`, `/to-tickets`, or `/unslop`. It loads and delegates to those hard dependencies in the order stated by the supplied prefix. The exact prefix text is the contract. Commands, identifiers, labels, dependency names, quotations, and technical meaning stay unchanged except for the task slot under `## Task:`.

## Invocation

User-invoked only. The user runs:

```text
/plan-this <task>
```

The skill preserves the complete invocation text after `/plan-this` verbatim as the planning task under `## Task:`. It does not truncate, reinterpret, or normalize the task. Multi-word tasks are preserved in full.

## Hard dependencies

Load `/unslop` before the first progress update and keep it active throughout `/grill-with-docs` → `/to-spec` → `/to-tickets`. Apply it to all prose you write, including to-do items, progress updates, interview questions, recommendations, decisions, ADR and glossary text, specification drafts, ticket bodies, GitHub comments, and the final summary. Check prose against `/unslop` before showing it to the user or publishing it to GitHub. Preserve exact domain terms, identifiers, commands, labels, dependencies, quotations, and technical meaning. Treat `/unslop` as the external dependency identity supplied by the user. Do not silently map it to this repository's `unslopify` identity.

Delegated workflow order remains:

1. `/grill-with-docs`
2. `/to-spec`
3. `/to-tickets`

The planning workflow remains `/grill-with-docs` followed by `/to-spec` followed by `/to-tickets`. Hard dependencies, in order, are `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/unslop`.

## Fixed template — planning prefix

The following is the exact planning prefix. Substitute only the task under `## Task:`.

--- start of supplied planning prefix ---

Run this planning-only workflow: `/grill-with-docs` → `/to-spec` → `/to-tickets`

## Rules:

- Load `/unslop` before the first progress update. Keep it active throughout `/grill-with-docs` → `/to-spec` → `/to-tickets`. Apply it to all prose you write, including to-do items, progress updates, interview questions, recommendations, decisions, ADR and glossary text, specification drafts, ticket bodies, GitHub comments, and the final summary. Check prose against `/unslop` before showing it to the user or publishing it to GitHub. Preserve exact domain terms, identifiers, commands, labels, dependencies, quotations, and technical meaning.
- Maintain a concise To-Do List covering Discovery, Decisions, Specification, Tickets, and Delivery. Update it at phase changes, decisions, blockers, and publication. State what finished and what happens next without narrating every command.
- Design tickets as independently verifiable vertical slices suitable for one future worktree. Record blockers, affected seams, acceptance criteria, verification requirements, and whether later parallel execution is safe.
- Optimize for precision per token: keep shared context in the parent specification; make tickets self-contained only for their slice; avoid repetition, speculative file paths, and routine pseudocode.
- Ground decisions in the codebase and relevant documentation, following the repository's documented loading order. Inspect facts; ask only unresolved decisions.
- Publish GitHub issues using repository-defined labels (`ready-for-agent` where applicable) and native dependency edges.
- Ask one decision at a time in ELI18 language, include a recommendation, and honor each skill's approval gates.
- Follow the installed skills as the procedural source of truth.

Finish with an ELI18 **Why / What / Where / How** summary and links to the specification and all tickets, then stop.

## Task:

--- end of supplied planning prefix ---

Place the invocation text under `## Task:` in place of the placeholder. No other substitution, renaming, or reinterpretation. The skill does not add `.kilo/command/` files, a router skill, runtime scripts, model-based evals, or a prompt-generation service.

## Rules preserved

The prefix preserves the supplied rules about the to-do list, approval gates, ticket design, labels, native dependencies, and the final Why / What / Where / How summary. To-do list covers Discovery, Decisions, Specification, Tickets, and Delivery. Ticket design requires independently verifiable vertical slices with blockers, affected seams, acceptance criteria, verification requirements, and parallel-safety notes. Labels include `ready-for-agent` where applicable with native blocking edges. The final summary is an ELI18 Why / What / Where / How with links to the specification and all tickets.

## Installation and discovery

Registry lane:

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill plan-this
```

Manual copy:

```bash
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
cp -r skills/plan-this ~/.agents/skills/plan-this
```

Discovery text for explicit user invocation: invoke as `/plan-this <task>` — for example, `/plan-this Create a Next.js App` preserves the full task text under `## Task:` and runs `/grill-with-docs` → `/to-spec` → `/to-tickets` with `/unslop` active.

## Boundary

This skill is a fixed-template adapter. It does not reimplement delegated skills, does not copy the `AIT-*` catalog, does not add npm packaging, and does not modify `/grill-with-docs`, `/to-spec`, `/to-tickets`, `/unslop`, or the existing `unslopify` skill.
