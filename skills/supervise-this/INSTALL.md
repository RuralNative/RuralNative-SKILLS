# Installing supervise-this

`supervise-this` is an AO-first coordinator. Run it inside the Agent Orchestrator project orchestrator. It delegates planning to `/plan-this`, whose locked delegated stages require explicit human invocation, and starts the project's configured worker in a supported chat or TUI mode. The bundled workflow helper blocks unsafe spawns and turns AO and GitHub facts into delivery decisions.

## Requirements

- A GitHub repository with a parent specification, child tickets, and native dependency edges.
- Agent Orchestrator with a configured project and persistent project orchestrator.
- Node.js 24 or newer for `scripts/workflow.ts`.
- `plan-this`, `implement-this`, `implement`, `code-review`, and `/unslop` available to the relevant agents.
- AO worker and orchestrator role profiles with resolved models. The worker agent must support chat or TUI sessions.
- An explicit review policy. Same-account verdicts are valid only when the policy permits verdict review instead of GitHub approval.

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

The project must have `orchestrator` and `worker` roles. Configure each role's `agent` and `agentConfig.model` values in AO Project Settings or with the documented `ao project set-config` command. The worker profile selects the agent; Kilo Code remains supported but is not required. Record whether the review policy requires GitHub approval or permits a documented verdict. Do not rewrite profiles during a run.

The supervisor passes observed state to the bundled helper before spawning or merging:

```bash
node skills/supervise-this/scripts/workflow.ts preflight --input preflight.json
node skills/supervise-this/scripts/workflow.ts reconcile --input ownership.json
```

The helper also exposes `delivery-state`, `idle-signal`, `recovery-decision`, `review-decision`, and `merge-decision`. Pass input through `--input <path>` or `--json <json>`; a command without explicit input fails immediately. Its exported TypeScript input types define each JSON shape.

## Verify

Run inside the AO project orchestrator:

> /supervise-this Build a supervised coordinator for the repository

The supervisor verifies AO, GitHub access, role models, worker mode, reviewer policy, and the synchronized default branch before planning. It then runs `/plan-this` in the same persistent orchestrator and starts no more than three workers:

```bash
ao spawn --project "$AO_PROJECT_ID" --kind worker --name "issue-123" --issue 123 --mode "$WORKER_MODE" --prompt "Run /implement-this #123 in AO pull-request delivery mode. Prove origin/<default-branch> is an ancestor before editing."
```

It does not finish after planning or worker creation. It consumes AO completion messages, derives progress from tracked changes and pull requests, and starts later waves after blocker merges. Workers create pull requests, AO routes CI and review feedback, and the supervisor preserves each reviewed head SHA through merge.

Resume an interrupted run in the same AO project orchestrator:

> /supervise-this #123

Resume reconciles open PRs, AO sessions, branches, assignees, and issue links before any spawn. Existing ownership resumes or reviews the work instead of duplicating it.

## Unsupported paths

- Agent Manager worktree scheduling is not the AO path.
- KiloClaw is not the AO path.
- Legacy AO configuration formats, batch spawning, and unverified per-spawn model flags are outside this contract.
- A worker never pushes directly to `main` in AO delivery mode.
