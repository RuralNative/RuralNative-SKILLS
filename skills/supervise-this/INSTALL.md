# Installing supervise-this

`supervise-this` is an AO-first coordinator. Run it inside the Agent Orchestrator project orchestrator. It delegates planning to `/plan-this`, whose locked delegated stages require explicit human invocation, creates Kilo Code TUI workers in AO worktrees, and stays active across worker completion, pull-request review, merge, dependency waves, recovery, and final review. Planning and implementation models come from AO project role profiles, not per-spawn flags.

## Requirements

- A GitHub repository with a parent specification, child tickets, and native dependency edges.
- Agent Orchestrator with a configured project and persistent project orchestrator.
- The Kilo Code harness installed and authenticated for AO workers.
- `plan-this`, `implement-this`, `implement`, `code-review`, and `/unslop` available to the relevant agents.
- AO worker and orchestrator role profiles configured before the run. The orchestrator profile supplies planning and final review; the worker profile supplies implementation.

## Install

### Via the skills registry

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill supervise-this
npx skills add RuralNative/RuralNative-SKILLS --skill plan-this
npx skills add RuralNative/RuralNative-SKILLS --skill implement-this
```

Install `/implement`, `/code-review`, and `/unslop` through their own registry lanes. The supervisor does not copy their instructions.

### Manual install

```bash
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
cp -r skills/supervise-this ~/.agents/skills/supervise-this
```

The same folder can be copied to `.kilo/skills/supervise-this` for project scope.

## Configure AO

Start or open the AO project, then verify the daemon, project, and agent catalog:

```bash
ao status --json
ao project ls --json
ao project get <project-id> --json
ao agent ls --refresh --json
```

The project must have an `orchestrator` role and a `worker` role. Configure their `agent` and `agentConfig.model` values in AO Project Settings or with the documented `ao project set-config` command. Use the `kilocode` agent for workers and an AO-supported strong agent for the orchestrator. If a reviewer profile is configured, AO uses it for pull-request review. Do not rewrite these profiles during a run.

## Verify

Run inside the AO project orchestrator:

> /supervise-this Build a supervised coordinator for the repository

The supervisor verifies AO before planning, runs `/plan-this` in the same persistent orchestrator, records the role configuration on the parent, and starts no more than three workers with the documented form:

```bash
ao spawn --project "$AO_PROJECT_ID" --kind worker --name "issue-123" --issue 123 --mode tui --prompt "Run /implement-this #123 in AO pull-request delivery mode."
```

It does not finish after planning or worker creation. It consumes AO completion messages, re-reads GitHub native blockers, and starts later waves. Workers create pull requests, AO routes CI and review feedback, and the supervisor verifies merged PRs before closing issues.

Resume an interrupted run in the same AO project orchestrator:

> /supervise-this #123

Resume reads GitHub and AO durable state first and does not duplicate existing workers or pull requests.

## Unsupported paths

- Agent Manager worktree scheduling is not the AO path.
- KiloClaw is not the AO path.
- Legacy AO configuration formats, batch spawning, and unverified per-spawn model flags are outside this contract.
- A worker never pushes directly to `main` in AO delivery mode.
