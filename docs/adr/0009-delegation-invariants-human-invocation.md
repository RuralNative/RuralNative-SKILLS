# 0009 — Delegation invariants require explicit human invocation for locked skills

Status: accepted
Date: 2026-08-20

Decision: `plan-this` INV-4 and `implement-this` INV-3 state that the
delegated stages requiring explicit human invocation and that an agent cannot
traverse the chain unattended. `/grill-with-docs`, `/to-spec`, `/to-tickets`,
and `/implement` each set `disable-model-invocation: true` in their
frontmatter. `/unslop` and `/code-review` carry no such lock and remain
model-invocable. The documentation names which is which rather than blanketing
all dependencies with the same claim.

The `disable-model-invocation` locks on those four skills stay. A
`supervise-this` run that reaches planning stalls at the first locked
dependency until a human types the command, and the docs now warn of it.

Why: a `supervise-this` run delegated planning to `plan-this`, which in turn
delegates to `/grill-with-docs` → `/to-spec` → `/to-tickets`. The chain
appeared fully model-traversable from the documentation, but each of those
three skills — plus `/implement` in the `implement-this` chain — sets
`disable-model-invocation: true`, which prevents a model from invoking them.
The mismatch was hit in a live supervised run before the spec was written.

removing the locks was considered and rejected. The `disable-model-invocation`
flag is deliberate: `/grill-with-docs`, `/to-spec`, and `/to-tickets` perform
interactive interviews and judgment-heavy synthesis that benefit from human
presence at each stage, and `/implement` gates the start of a focused
implementation effort behind a human decision. Removing the locks would allow
unattended model traversal, which contradicts the intent of each locked
skill. A later contributor must not resolve the documentation mismatch by
unlocking the four skills; the locks stay and the documentation records the
constraint.

Consequences:

- `plan-this` INV-4 now states that `/grill-with-docs`, `/to-spec`, and
  `/to-tickets` require explicit human invocation and that `/unslop` remains
  model-invocable.
- `implement-this` INV-3 now states that `/implement` requires explicit human
  invocation and that `/code-review` and `/unslop` remain model-invocable.
- `docs/leaves/supervise-this.md` warns that planning delegation does not run
  unattended because the downstream planning skills are locked.
- A `supervise-this` orchestrator run must account for human-in-the-loop
  pauses at each locked stage rather than assuming a continuous model-driven
  pipeline.
- The composition tests for `plan-this` and `implement-this` cover the
  amended invariant text.
