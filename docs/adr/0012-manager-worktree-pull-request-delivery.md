# 0012 — Manager-worktree pull-request delivery trigger

Status: accepted
Date: 2026-08-21
Replaces: the Agent Orchestrator delivery mode added by ADR-0008, retired by the supervise-this retirement (issues #116/#117)
Numbering: takes the slot after the retirement ADR reserved by issues #116/#117

Decision: `implement-this` selects its delivery mode from the session worktree
location. When the current worktree root sits under the Kilo Agent Manager
worktree location, detected by path rather than by an orchestrator session, the
worker uses pull-request delivery: it pushes the feature branch with upstream
tracking, creates or updates a pull request against `main` whose body carries
the closing reference for the assigned ticket, comments acceptance-criterion
evidence on the ticket, removes `ready-for-agent`, and adds `ready-for-human`.
It never closes the ticket before merge, never pushes directly to `main`, and
never force-pushes. Outside a manager worktree the worker keeps the unchanged
direct-main path. When detection is unclear it asks one ELI18 decision before
pushing or opening a pull request.

Why: push-to-main delivery caps safe concurrency at roughly one to two workers
because every worker serializes on `origin/main`. Feature-branch plus
pull-request delivery lifts that cap so supervised waves can scale with
worktree count instead of with a shared main branch.

Rejected alternatives:

- Ask every time. A standing question on every run slows unattended waves and
  adds a human round-trip that path detection removes; the location is
  knowable before any push.
- Always pull-request. Forcing every standalone run through review overhead
  loses the fast direct-main path that solo developers rely on, and it pushes
  PR ceremony onto single-developer flows that need it least.

Consequences:

- Delivered work always has a pull request, so Agent Manager PR badges act as
  free progress telemetry aligned with the `PR_OPEN`, `REVIEWED`, and `MERGED`
  evidence states, with no additional polling.
- The direct-main contract is unchanged; standalone use keeps the one-step
  push, evidence, and closure.
- Delivery mode is determined by worktree path, so a folder path flipping
  delivery semantics is recorded here rather than looking accidental.
- The prior Agent Orchestrator delivery mode (ADR-0008) is retired by the
  supervise-this retirement; this trigger is the delivery mode that replaces
  it.
