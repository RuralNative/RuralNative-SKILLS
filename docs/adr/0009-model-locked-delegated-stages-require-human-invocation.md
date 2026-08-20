# 0009 — Model-locked delegated stages require explicit human invocation

Status: accepted
Date: 2026-08-20

Decision: The delegation invariants of the workflow adapters name which delegated stages a model can invoke and which it cannot. `plan-this` `INV-4` declares `/unslop`, `/grill-with-docs`, `/to-spec`, and `/to-tickets` as hard dependencies delegated to in order, and `implement-this` `INV-3` declares the `/implement` → `/code-review` order. Those invariants now state that the stages that set `disable-model-invocation: true` — `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/implement` — require explicit human invocation, and that an agent cannot traverse the chain unattended: a supervised run pauses at each locked stage until a human invokes it. The stages without that setting — `/unslop` and `/code-review` — remain model-invocable, and the invariants say which stages are locked and which are not rather than treating every delegated stage alike. The matching prose in `docs/leaves/plan-this.md`, `docs/leaves/implement-this.md`, and `docs/leaves/supervise-this.md` records the same requirement, and `docs/leaves/supervise-this.md` no longer claims that planning delegation runs unattended.

Why: a `supervise-this` run that reached planning stalled because the delegated stages could not be invoked by the model, and nothing in the documentation warned that the chain would stop. The lock is deliberate: these stages are human-gated so a person drives the interview, specification, ticket, and implementation prompts. Lifting the locks was considered and rejected — unlocking the four skills would remove the human approval gate the model-invocation setting exists to enforce, turning a deliberate checkpoint into a silent hand-off that would not have been reviewed by a person. The documentation was the mismatch, so the documentation changes; the skill settings stay untouched.

Consequences:

- `plan-this` `INV-4` and `implement-this` `INV-3` now name the human-invocation requirement and distinguish locked from unlocked dependencies.
- The planning and implementation leaf docs and the `supervise-this` leaf doc carry the same prose, so the mismatch cannot recur silently.
- No skill's `disable-model-invocation` setting changes; the lock on `/grill-with-docs`, `/to-spec`, `/to-tickets`, and `/implement` remains.
- A later contributor who sees the delegation chain must not resolve the mismatch by unlocking the four skills; the decision records that the lock is deliberate.
- Composition tests for `plan-this` and `implement-this` cover the amended invariant text.