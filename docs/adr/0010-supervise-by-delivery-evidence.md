# 0010 — Supervise by delivery evidence

Status: superseded
Date: 2026-08-20
Superseded by: ADR-0011 — supervise-this retired from the shelf
Amends: ADR-0008 worker selection, delivery evidence, recovery, review, and merge rules

Decision: `supervise-this` runs the worker profile configured by the AO project. Preflight resolves its model and chooses a supported chat or TUI mode. Kilo Code remains a valid worker but is no longer required. Preflight also proves explicit-repository GitHub access and a current default branch before any spawn.

The supervisor builds issue ownership from open pull requests, AO sessions, branches, assignees, and issue links. Existing ownership resumes or reviews work. Only an unowned ready issue can spawn. Progress is the ordered delivery state `READY`, `CLAIMED`, `BASE_CURRENT`, `EDITING`, `PR_OPEN`, `REVIEWED`, `MERGED`, `EVIDENCED`, or `CLOSED`; activity labels do not count.

Recovery separates infrastructure failure, task continuation, and implementation correction. Each class has its own cap. An idle session is red when its issue remains open with no matching pull request and no tracked change.

Review policy is explicit. The same GitHub account may record a verdict when policy allows it, but cannot meet an approval-only rule. Merge preserves the reviewed head SHA. AO merges PRs it can manage; a legacy unclaimed PR uses a GitHub fallback with an explicit repository only when AO cannot manage it.

Why: the live #73 run showed that activity timestamps and prose-only command checks could report progress while no change, commit, or pull request existed. It also showed that a hardcoded worker mode, stale base, absent reviewer policy, and unclaimed PR could each consume a recovery turn without moving the ticket.

Consequences:

- `skills/supervise-this/scripts/workflow.ts` is the deterministic source for preflight, ownership, state, recovery, review, merge, and wave decisions.
- The helper consumes observed facts and returns decisions. The orchestrator remains responsible for AO, GitHub, and git commands.
- Regression tests exercise workflow behavior with fakes and local values. Composition tests only verify packaging and instruction wiring.
- A merged blocker can open the next dependency wave, while acceptance evidence and closure continue toward `CLOSED`.
