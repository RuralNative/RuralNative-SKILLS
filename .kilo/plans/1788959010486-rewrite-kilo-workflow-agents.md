# Rewrite the four custom Kilo workflow agents as thin skill presets

## Goal

Make the custom Kilo Code agents **Plan This** (`plan-this`), **Implement This** (`implement-this`), **Review This** (`review-this`), and **Fix This** (`fix-this`) thin presets for the current production skills of the same names. The only purpose of these agents is to carry a default model and variant so the user never re-picks a model; their prompts must stop redefining the workflow (that duplication has drifted stale and caused refusals — e.g. the Review This prompt baked in requirements the skill does not state, like a "frontier model" gate).

## Findings (verified)

- The four agents live in the global settings file **`~/.config/kilo/kilo.jsonc`** under the `"agent"` map (keys `plan-this`, `implement-this`, `review-this`, `fix-this`). This file is Kilo Code's settings store: `fix-this` exists only there, and it is the newest file. User confirmed: rewrite **kilo.jsonc only**; leave the legacy copies in `~/.config/kilo/agent/*.md` untouched.
- Current state per entry: `name`, `description`, `mode`, `model`, `variant`, `prompt` (large workflow restatement), `permission` (detailed block).
- Production skills are the freshly synced copies at `~/.agents/skills/<skill>/SKILL.md` (= repo `skills/<skill>/`, byte-identical). Facts that govern the rewrite:
  - All four skills require loading `/unslopify` by identity first and keeping it active.
  - `plan-this` delegates to `/grill-with-docs` → `/to-spec` → `/to-tickets` and **publishes** an approved GitHub specification and tickets in its phase 5. The current agent prompt ("Stop before section 5… Never creates specifications, tickets, labels…") forbids exactly what the production skill does.
  - `implement-this`, `review-this`, `fix-this` publish/deliver and stop per their own gates; none of the four skills states any model requirement, and none mentions a "frontier model".
  - `ponytail` is not required by the current production skill copies; the allowlist entry is harmless and stays (older installed copies may still load it).
- Existing per-agent `permission` blocks are compatible with the current skills (reads, edits, bash ask-gating, git read-only allows for review, skill allowlists, `task` deny). **Keep them byte-identical.** Everything the skills need beyond the allowlists degrades to `ask`, never `deny`.
- Global slash-command wrappers in `~/.config/kilo/command/{plan-this,implement-this,review-this}.md` route `/name` → `agent: name` and remain valid. Only the `plan-this` wrapper's description is stale ("Stops with a settled plan before publication") — one-line fix, optional.

## Scope

Edit (only):
- `~/.config/kilo/kilo.jsonc` — the four `"agent"` entries below.

Files left untouched: `~/.config/kilo/agent/*.md`, `~/.config/kilo/agents/*.md`, `~/.config/kilo/command/*.md` bodies, all other entries in `kilo.jsonc` (built-ins, `orchestrator`, `code-reviewer`, `plan`), and everything in this repository. No git commit is required for the kilo.jsonc change; the optional command-description fix is also outside the repo.

## Tasks

### 1. Backup

Copy `~/.config/kilo/kilo.jsonc` to `/tmp/kilo/kilo.jsonc.bak-<timestamp>`.

### 2. Rewrite the four agent entries

For each of the four entries keep unchanged: `name` (key and value), `mode`, `model`, `variant`, and the whole `permission` object.

Replace `description` and `prompt` with exactly:

**plan-this** (model `openai/gpt-6-astra`, variant `max`, mode `primary`)
- description: `Plan a task with the plan-this workflow: publish an approved GitHub specification and coherent child tickets through the delegated skills. Use /plan-this <task>.`
- prompt:
  ```
  You are the Plan This agent: the model preset for the plan-this workflow, nothing more.

  The human message that selected this agent, or a /plan-this <task> command routed here, is the invocation; it must name one planning task. If no task text is present, stop and ask.

  Load `unslopify` with the skill tool before the first progress update and keep it active for all prose. Then load `plan-this` by identity and follow it exactly, including the skills it delegates to.

  If `unslopify` or `plan-this` cannot be loaded, stop with the missing name and where it was looked for. Never substitute another workflow and never download or copy skills. Do not restate, extend, or override the loaded skill's workflow or gates in your own words. Stop when the skill stops.
  ```

**implement-this** (model `commandcode/deepseek/deepseek-v4-flash`, variant `high`, mode `primary`)
- description: `Implement exactly one GitHub ticket in the current checkout and deliver one pull request. Use /implement-this #<n>.`
- prompt:
  ```
  You are the Implement This agent: the model preset for the implement-this workflow, nothing more.

  The human message that selected this agent, or a /implement-this #<n> command routed here, is the invocation; it must name exactly one ticket (bare number, #number, or URL). Anything else stops and asks before any mutation.

  Load `unslopify` with the skill tool before the first progress update and keep it active for all prose. Then load `implement-this` by identity and follow it exactly.

  If `unslopify` or `implement-this` cannot be loaded, stop with the missing name and where it was looked for. Never substitute another workflow and never download or copy skills. Do not restate, extend, or override the loaded skill's workflow or gates in your own words. Stop when the skill stops.
  ```

**review-this** (model `openai/gpt-6-astra`, variant `max`, mode `primary`)
- description: `Review exactly one pull request in the current checkout and publish the findings. Use /review-this <target>.`
- prompt:
  ```
  You are the Review This agent: the model preset for the review-this workflow, nothing more.

  The human message that selected this agent, or a /review-this <target> command routed here, is the invocation; it must name exactly one pull-request or issue target. Anything else stops and asks before any write.

  Load `unslopify` with the skill tool before the first progress update and keep it active for all prose. Then load `review-this` by identity and follow it exactly.

  If `unslopify` or `review-this` cannot be loaded, stop with the missing name and where it was looked for. Never substitute another workflow and never download or copy skills. Do not restate, extend, or override the loaded skill's workflow or gates in your own words. Stop when the skill stops; never apply fixes or merge.
  ```

**fix-this** (model `commandcode/deepseek/deepseek-v4-flash`, variant `max`, mode `all`)
- description: `Finalize exactly one reviewed pull request: apply the published findings, resolve conflicts, verify locally, squash-merge, and complete bookkeeping. Use /fix-this <PR-number>.`
- prompt:
  ```
  You are the Fix This agent: the model preset for the fix-this workflow, nothing more.

  The human message that selected this agent, or a /fix-this <PR-number> command routed here, is the invocation; it must name exactly one pull-request target. Anything else stops and asks before any mutation.

  Load `unslopify` with the skill tool before the first progress update and keep it active for all prose. Then load `fix-this` by identity and follow it exactly.

  If `unslopify` or `fix-this` cannot be loaded, stop with the missing name and where it was looked for. Never substitute another workflow and never download or copy skills. Do not restate, extend, or override the loaded skill's workflow or gates in your own words. Stop when the skill stops; never produce a review verdict or plan.
  ```

The rewritten prompts contain no workflow facts, no "frontier" wording, no stage lists, and no claims about what the skill may or may not publish — the loaded skill is the single source of that behavior.

### 3. Optional consistency fix

In `~/.config/kilo/command/plan-this.md`, change only the frontmatter description from `Plan a task with the plan-this agent. Stops with a settled plan before publication.` to `Plan a task with the plan-this agent. Publishes the approved GitHub specification and child tickets after explicit approval.` Keep the `agent: plan-this` route and the body unchanged. (Skip if out of scope; do not touch `implement-this.md`, `review-this.md`, or `orchestrate.md`.)

### 4. Validate

1. Confirm the edited file parses as JSONC: a small Node script that strips `//` line comments and trailing commas **outside string literals** (respecting quotes and escapes — the file contains URLs with `//`), then `JSON.parse`. Put the script in `/tmp/kilo/`; do not add files to the repo.
2. Assert in the parsed object: keys `agent.plan-this`, `agent.implement-this`, `agent.review-this`, `agent.fix-this` exist; each has the expected `model`, `variant`, `mode`, `description`; each `prompt` is under 700 characters (see Revision 2); each `permission` object equals the backup's corresponding object (stringified compare).
3. `diff` the permission blocks against the backup to prove zero permission drift.
4. Reopen the file in Kilo Code settings (or reload the window) and confirm the four agents still appear with their model/variant defaults and new descriptions, with no duplicates and no config parse error.

### 5. Behavior spot-check

- From any checkout, start the Review This agent with a bare PR number and confirm it loads `unslopify` + `review-this` and proceeds (no model-gate refusal). Repeat once for one of the other agents if desired. Full workflow runs are not required to validate this change.

## Out of scope

- Reinstalling/updating skill copies (`~/.agents/skills`, `~/.kilocode/skills`) — the repo is already synced to `~/.agents/skills`; stale `~/.kilocode/skills` copies are a separate matter.
- Legacy markdown agent files in `~/.config/kilo/agent/` and `~/.config/kilo/agents/` (kept untouched per user decision; if duplicate agent entries ever appear after a reload, revisit by syncing or deleting those files).
- The `orchestrator` and `code-reviewer` agents, model/variant values, permission blocks, and anything in this repository.

## Risks

- A JSONC syntax slip would break the whole global config — mitigated by the parse validation before any further action.
- If Kilo Code ever loads the legacy markdown agent files, stale copies could resurface — accepted; watch for duplicates after reload.
- The thin prompts delegate all behavior to skills installed by identity; if a skill is missing the agent stops with a diagnostic instead of improvising, which is the intended fail mode.

## Revision 2 (2026-09-09): agent selection is the explicit invocation

- The four skills gate on one explicit human invocation of their command (`/plan-this <task>`, `/implement-this #<n>`, `/review-this <target>`, `/fix-this <PR-number>`). The user selects the agent directly and expects that choice to count as intent, so the wrapper prompts now state that selecting the agent is the explicit human invocation the skill requires and the workflow runs without a slash command.
- Only the four `prompt` strings changed in this revision. Descriptions, permissions, models, variants, modes, names, and all other settings were re-verified byte-identical against both the revision-1 backup (`/tmp/kilo/kilo.jsonc.bak2-20260909-212123`) and the original backup (`/tmp/kilo/kilo.jsonc.bak-20260909-211552`).
- The prompts still require the message that selected the agent to name the target (one planning task, one ticket, one pull request or issue) before the run starts; without one, the agent stops and asks.
- The validation bound in step 4.2 moved from 600 to 700 characters because the invocation sentence is longer; measured prompt lengths are 576-627 characters.
- Revision 1 (same day) shortened the plan's prescribed prompt text to fit the then-600-character bound; this revision supersedes that text.

## Revision 3 (2026-09-09): terse descriptions

- The descriptions prescribed above restated skill phases and read as long in the agent picker. The user wants the label to carry only the run line. Each description is now exactly the command usage: `Run /plan-this <task>.`, `Run /implement-this #<n>.`, `Run /review-this <target>.`, `Run /fix-this <PR-number>.` (23-27 characters).
- Only the four `description` strings changed in this revision; prompts (Revision 2 text), permissions, models, variants, modes, names, and all other settings were re-verified against the Revision-2 backup (`/tmp/kilo/kilo.jsonc.bak3-20260909-212536`).
