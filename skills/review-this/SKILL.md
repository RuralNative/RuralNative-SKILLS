---
name: review-this
description: Apply the /code-review workflow as a fixed template. Use when the user invokes /review-this <fixed-point> where <fixed-point> is a commit SHA, branch, tag, or merge-base expression — substitutes only the fixed point under ## Fixed point:. Requires /code-review and /unslopify installed through their own registry lanes. A missing fixed point asks for one and stops.
---

Review the changes since a fixed point: `/code-review`

`/code-review` carries no `disable-model-invocation` lock and remains model-invocable.

## Rules

- Load `/unslopify` before the first progress update. Keep it active throughout the review, both sub-agent reports, issue comments, and the final summary. Preserve exact domain terms, identifiers, commands, labels, dependencies, quotations, and technical meaning. Follow unslopify scope, protected-content, preservation, and completion report contracts.
- Follow `/code-review` as the procedural source of truth.
- Pin the fixed point before spawning anything: capture `git diff <fixed-point>...HEAD` (three-dot, against the merge-base) and `git log <fixed-point>..HEAD --oneline`; confirm `git rev-parse <fixed-point>` resolves and the diff is non-empty. A bad ref or empty diff fails here, not inside the sub-agents.
- Identify the spec source in this order: issue references in the commit messages, a path the caller supplied, then a spec file under `docs/`, `specs/`, or `.scratch/` matching the branch; if nothing is found ask, and skip the Spec axis with "no spec available" when the caller says there isn't one.
- Standards sources are whatever documents how code should be written plus the smell baseline; a documented repo standard overrides the baseline, and every baseline smell stays a labelled judgement call.
- Spawn the Standards and Spec sub-agents in parallel so their contexts stay separate, then aggregate both reports side by side under `## Standards` and `## Spec`, verbatim or lightly cleaned. Never merge or rerank findings across axes.
- Use focused doc-cache loading: read AGENTS.md, ARCHITECTURE.md, the affected seam leaf doc in docs/leaves/, CONTEXT.md, and relevant ADRs. This focused route does not require broad preloading and does not require the derived human docs from document-for-humans (docs/human/).
- If no fixed point was supplied, ask for one and stop until it arrives.

## Fixed point:
