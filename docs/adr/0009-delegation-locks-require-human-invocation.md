# 0009 — Delegation locks require explicit human invocation

Status: accepted
Date: 2026-08-20

Decision: The `disable-model-invocation: true` lock stays on `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/implement`. The documentation is what changes. `plan-this` `INV-4` and `implement-this` `INV-3`, plus their leaf docs and `docs/leaves/supervise-this.md` where it claims unattended traversal, are amended to state that those four delegated stages require explicit human invocation and that an agent cannot traverse the chain unattended. `/unslop` and `/code-review` carry no such lock and remain model-invocable; the amended invariants say which is which rather than blanketing all delegated skills as freely traversable.

Why: `plan-this` `INV-4` described `/grill-with-docs` → `/to-spec` → `/to-tickets` with `/unslop`, and `implement-this` `INV-3` described `/implement` → `/code-review`, as chains a model could delegate through in order. Each of `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/implement` sets `disable-model-invocation: true` in its frontmatter, so a model invocation is rejected and a `supervise-this` run that reaches planning stalls until a human types the command. This was hit in a live supervised run before this decision was written. Lifting the locks was considered and rejected: the four skills are intentionally human-gated, their interviews and synthesis require explicit user invocation, and unlocking them would widen model authority beyond the narrow delegation contract and reintroduce the broad automatic triggering that `plan-this` `INV-5` rejects. The mismatch is therefore a documentation defect, not a skill defect, and the invariants record the human-invocation requirement so a later contributor does not resolve the same mismatch by removing the locks.

Consequences:
- `plan-this` `INV-4` states the workflow order, flags `/grill-with-docs`, `/to-spec`, `/to-tickets` as `disable-model-invocation: true` requiring explicit human invocation, and flags `/unslop` as model-invocable with no such lock.
- `implement-this` `INV-3` states the `/implement` → `/code-review` order, flags `/implement` as `disable-model-invocation: true` requiring explicit human invocation, and flags `/code-review` as model-invocable with no such lock.
- `docs/leaves/plan-this.md`, `docs/leaves/implement-this.md`, and `docs/leaves/supervise-this.md` carry the same distinction; any surviving claim that planning or implementation delegation runs unattended is removed.
- No skill's `disable-model-invocation` setting is changed by this decision; the four locks remain.
- The architecture index lists this ADR in the non-seam docs list and coverage table, and composition tests for `plan-this` and `implement-this` cover the amended invariant text.
- A future proposal to lift a lock must revisit this ADR and justify widening model authority rather than correcting prose.
