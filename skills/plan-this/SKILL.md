---
name: plan-this
description: Apply the planning prefix as a fixed template. Use when the user invokes /plan-this <task> or when an active supervise-this run delegates planning — substitutes only the task under ## Task: and delegates to /grill-with-docs, /to-spec, /to-tickets, and /unslopify in order. Requires explicit user invocation as /plan-this <task> or narrow delegation from an active supervise-this run; unrelated invocation is rejected.
---

Run this planning-only workflow: `/grill-with-docs` → `/to-spec` → `/to-tickets`

`/grill-with-docs`, `/to-spec`, and `/to-tickets` require explicit human invocation; an agent cannot traverse the chain unattended. `/unslopify` remains model-invocable.

## Rules:

- Load `/unslopify` before the first progress update. Keep it active throughout `/grill-with-docs` → `/to-spec` → `/to-tickets`. Apply it to all prose you write, including to-do items, progress updates, interview questions, recommendations, decisions, ADR and glossary text, specification drafts, ticket bodies, GitHub comments, and the final summary. Check prose against `/unslopify` before showing it to the user or publishing it to GitHub. Preserve exact domain terms, identifiers, commands, labels, dependencies, quotations, and technical meaning.
- Maintain a concise To-Do List covering Discovery, Decisions, Specification, Tickets, and Delivery. Update it at phase changes, decisions, blockers, and publication. State what finished and what happens next without narrating every command.
- Require a parent specification that separates in-scope behavior from out-of-scope non-goals, states acceptance criteria, affected seams, structural constraints, and the smallest test-first verification plan that proves the result.
- Design tickets as independently verifiable vertical slices suitable for one future worktree. Each ticket states its independently verifiable behavior, blockers, affected seams, acceptance criteria, verification requirements, and whether later parallel execution is safe.
- Require test design before implementation direction: state the smallest set of tests that proves observable behavior, stated standards, and structural requirements. Reject redundant, implementation-detail, prose-mirroring, and coverage-only tests unless they name a distinct risk.
- Optimize for precision per token: keep shared context in the parent specification; make tickets self-contained only for their slice; avoid repetition, speculative file paths, and routine pseudocode.
- Ground decisions in the codebase and relevant documentation, following the repository's documented loading order. Inspect facts; ask only unresolved decisions.
- Publish GitHub issues using repository-defined labels (`ready-for-agent` where applicable) and native dependency edges via blocked_by with database IDs (read each issue's database ID before creating the edge); keep human-readable Blocked by text as fallback, native edge is canonical; blocked label state follows native blockers (open → blocked without ready-for-agent, all closed → unblocked + ready-for-agent, blocked removed).
- Ask one decision at a time in ELI18 language, include a recommendation, and honor each skill's approval gates.
- Follow the installed skills as the procedural source of truth.
- Follow the focused doc-cache route via document-for-agents; do not preload the human-facing derived docs.
- Respect scope boundaries, protected content, and preservation requirements; finish with a completion report.

Finish with an ELI18 **Why / What / Where / How** summary and links to the specification and all tickets, then stop.

## Task:
