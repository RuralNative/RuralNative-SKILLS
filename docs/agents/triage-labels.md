# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## Workflow-state labels

`ready-for-dev` is retired from workflow use; `ready-for-agent` is the only claimable label. The parent specification carries no claimable label.

| Label | Meaning | Transition |
| --- | --- | --- |
| `ready-for-agent` | Fully specified, no open blockers, claimable now | Applied at creation when no blocker is open; re-applied when the last blocker closes |
| `blocked` | Has at least one open blocker; do not claim | Applied at creation |
| `unblocked` | Was blocked; last blocker closed; claimable now | Applied by the closer of the final blocker, who also removes `blocked` |
| `cleanup-pending` | Completed managed worktree the host could not close through a supported action (ADR-0019, cleanup under ADR-0023) | Recorded by the stopping command session only after exact source recovery; deletion behind Agent Manager is forbidden |

Per ADR-0019, `ready-for-human` retains its triage meaning, requires human implementation, and is no longer pull-request readiness; review readiness derives from pull-request state once #155 and #157 ship.
