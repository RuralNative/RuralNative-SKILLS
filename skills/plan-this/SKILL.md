---
name: plan-this
description: Apply the planning prefix as a fixed template. Use when the user invokes /plan-this <task> — substitutes only the task under ## Task: and delegates to /grill-with-docs, /to-spec, /to-tickets, and /unslop in order. Requires explicit user invocation as /plan-this <task>.
---

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
