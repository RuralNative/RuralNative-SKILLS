# Installing implement-this

`implement-this` handles one GitHub issue. Use `/implement-this #<n>` directly for the direct-main workflow, or let an active `/supervise-this` run delegate one issue. A worker inside Agent Orchestrator uses the pull-request delivery branch; AO owns CI, review feedback, merge, recovery, and worktree lifecycle. The standalone path keeps its direct-main delivery rules. `supervise-this` owns scheduling and model decisions.

## Requirements

- A GitHub repository with an issue tracker and a dedicated worktree.
- `/implement`, `/code-review`, and `/unslop` installed through their own registry lanes.
- For AO delivery, a Kilo Code worker session created by Agent Orchestrator with `AO_SESSION_ID` and `AO_PROJECT_ID` available.

## Install

```bash
npx skills add RuralNative/RuralNative-SKILLS --skill implement-this
```

Manual fallback:

```bash
git clone https://github.com/RuralNative/RuralNative-SKILLS.git
cd RuralNative-SKILLS
cp -r skills/implement-this ~/.agents/skills/implement-this
```

## Verification

Run:

```bash
npm run verify
```

## Verify direct delivery

> /implement-this #100

The skill loads `/unslop`, runs `/implement` followed by `/code-review`, substitutes `Issue #100` for `Issue #0`, verifies the work, rebases, pushes `HEAD:main`, posts evidence, removes `ready-for-agent`, and closes only issue `#100`.

## Verify AO delivery

The AO project orchestrator starts one worker with:

```bash
ao spawn --project "$AO_PROJECT_ID" --kind worker --name "issue-100" --issue 100 --mode tui --prompt "Run /implement-this #100 in AO pull-request delivery mode."
```

The worker runs `/implement-this #100`, creates or updates a pull request after local verification and review, and reports evidence to AO. It does not push directly to `main` or close the issue. AO routes CI and review feedback to the worker, and the supervisor verifies the merged PR before issue closure.

## Boundary

The skill accepts one issue only. It does not create worktrees, choose AO models, schedule dependency waves, or copy the supervisor contract. `supervise-this` owns those decisions.
