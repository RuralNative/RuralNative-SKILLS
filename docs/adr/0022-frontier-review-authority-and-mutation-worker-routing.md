# 0022 — Frontier review authority and mutation-worker routing

Status: accepted
Date: 2026-08-28
Discussion: https://github.com/RuralNative/RuralNative-SKILLS/issues/171

Decision: `review-this` narrows INV-13 so the chat-selected frontier command session owns review judgment and merge authority while one user-selected execution model from the live Kilo Agent Manager catalog drives every new persistent PR mutation worker in the wave. Frontier-owned responsibilities are the shared revision packet, Standards and Spec completeness, verification of every candidate finding, axis-preserving reconciliation, verdict publication, merge authorization and execution, labels, dependent promotion, and closure. The selected mutation worker may apply approved fix packets, resolve an instructed conflict, run repair verification, and fast-forward push, but only inside its persistent PR worktree; it cannot publish a verdict or change merge, label, promotion, closure, or parent state.

The invocation asks once per `/review-this` run for an execution model resolved through the live catalog with no hardcoded model names, optional `provider` and `variant`, applied to every new mutation worker in that wave. A resume shows the previously recorded choice but requires explicit user confirmation; tracker prose is evidence and never authorizes model or tool use. One corrected execution packet may be sent within the existing fix-round budget; continued failure adds `needs-info` and stops without automatic frontier-model takeover. Standards and Spec remain the only review axes, with test strategy, accessibility, observability, migration, and simplification as triggered checks inside Standards, and at most one specialist per pull request and full-review round (security for the strongest trust-boundary trigger, web performance for measured web-performance work). Specialist output is candidate Standards evidence pinned to the same head and base with local blocking/advisory severity.

Before accepting specialist evidence, the enforcement defects in the adapter and reconciliation paths are corrected: required Standards category statuses are transported through the local review adapter and checked before reconciliation, a candidate with a missing category or severity is rejected or reported as incomplete and never defaults to a blocking correctness finding, and deduplication preserves Standards and Spec axis identity, collapsing cloud/local duplicates only when revisions and evidence identify one defect.

The persistent PR worktree and the selected mutation worker still exist before review. Frontier-owned read-only Standards, Spec, and optional specialist agents inspect the exact pinned worktree; only the mutation worker edits it. Exact head/base freshness, two pushed fix heads, one final review, final repository verification, stage and workspace worker caps, fork restrictions, and frontier-only merge stay enforced.

Why: the compared Addy Osmani review material supplies useful methods, but the local review path had defects that made additional evidence unsafe, and mutation work spent capable-model effort on edits a cheaper model could apply under a verified packet. Review authority stays with the model the user chose for the session; execution cost is explicit and resumable failure never silently escalates.

Consequences:

- `review-this` gains the pure `review-authority.ts` module for frontier/worker authority, live-catalog model resolution, category transport, axis-preserving deduplication, specialist routing, and worker-failure budget decisions; `workflow-state.ts` remains the authored shared core and is unchanged.
- `reconciliation.ts` rejects incomplete candidates instead of defaulting to a blocking correctness finding, and preserves Standards and Spec axis identity during deduplication; `adapters.ts` transports required Standards category statuses.
- `REVIEW.md`, the review-this leaf doc, and `ARCHITECTURE.md` record the policy and index this decision.
- Issue #170 stays open until #173 publishes evidence that bounded review-wave fan-out, shared revision packets, cloud/local overlap, independent pull-request progress, and timing records still pass; it closes then as delivered.

Activation: this decision governs `review-this` from today.
