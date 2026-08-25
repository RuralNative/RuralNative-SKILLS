# Enforce Agent Manager worktree dispatch

## Evidence and decisions

- Kilo Code 7.4.23 resolves both target skills from `~/.kilocode/skills/`, as shown by the Skill tool's runtime base directory. It does not load the repository copy or `~/.agents/skills/` for this session.
- `~/.kilocode/skills/` and `~/.agents/skills/` are byte-identical for both target `SKILL.md` files. They contain stronger dispatch wording than the repository copies, so prose alone is not an enforceable fix.
- There are no project or global `/implement-this` or `/review-this` command wrappers. Keep that boundary. Do not add commands, agents, plugins, or a new ADR.
- Use tracked project permissions as the hard guardrail: allow `agent_manager` without a prompt and set `task` to `ask`. Task can then run only after explicit user approval, including nested review subagents.
- Preserve the numbered worktree invariants. This change enforces them and does not supersede them.

## Implementation

1. Capture the failing order before editing.
   - Inspect the newest local Kilo session containing a plain `/implement-this` or `/review-this` invocation by exporting/copying the session or querying `~/.local/share/kilo/kilo.db` read-only.
   - Record the ordered worker-management tool calls and confirm whether an outer Task session was created before any `agent_manager` overview or start call. Redact credentials and unrelated transcript text.
   - If no matching transcript remains, record that fact and do not mutate GitHub or create a disposable worktree merely to manufacture a reproduction.

2. Add the enforceable project guardrail in `.kilo/kilo.jsonc`.
   - Keep `snapshot: false`.
   - Add `permission.agent_manager: "allow"` so the extension can dispatch without an approval pause.
   - Add `permission.task: "ask"` so no Task subagent can start unless the user explicitly approves it.
   - Do not edit `.kilo/agent-manager.json`.

3. Tighten the positive execution order in both repository skills.
   - In `skills/implement-this/SKILL.md`, require the first worker-management call to be `agent_manager` overview, followed by worktree-mode dispatch. State that Task is not an outer-worker fallback and that unavailable Agent Manager capability stops the run before claims or edits.
   - In `skills/review-this/SKILL.md`, require Agent Manager overview and creation of the persistent PR worktree before Standards, Spec, or fix Task calls. Keep nested subagents valid only inside that established PR worktree. Stop before a verdict if the persistent worktree cannot be created.
   - Keep the existing invocation slots, workflow stages, worker caps, and fixed-template boundaries unchanged.

4. Pin the contract in composition tests.
   - Extend `skills/implement-this/tests/composition.test.ts` to assert automatic `agent_manager` worktree dispatch, overview-first ordering, the explicit outer Task-substitution ban, and the tracked `agent_manager: allow` plus `task: ask` permission gate.
   - Extend `skills/review-this/tests/composition.test.ts` to assert that `agent_manager` appears before Task, the persistent PR worktree exists before nested Standards, Spec, or fix subagents, Task cannot replace that worktree, and the same permission gate is present.
   - Keep tests textual and deterministic. Do not create live sessions or worktrees in the test suite.

5. Update the owning documentation in the same change.
   - Amend `docs/leaves/implement-this.md` INV-6 and its data flow to describe overview-first automatic dispatch and the project Task approval gate.
   - Amend `docs/leaves/review-this.md` INV-13 and its data flow to distinguish the persistent Agent Manager PR worker from later approved nested Task contexts.
   - Update each skill's `INSTALL.md` only if needed to tell Kilo Code installers about the `agent_manager: allow` and `task: ask` project guardrail. Do not broaden unrelated installation guidance.

6. Align runtime copies after repository tests pass.
   - Treat `skills/implement-this/` and `skills/review-this/` as canonical.
   - Copy only the changed runtime-facing files to both `~/.kilocode/skills/<name>/` and `~/.agents/skills/<name>/`, preserving unrelated installed files.
   - Verify byte parity for each synchronized file. Confirm with the Skill tool that Kilo still resolves both skills from `~/.kilocode/skills/`.

7. Validate behavior and repository coherence.
   - Run `node --test skills/implement-this/tests/composition.test.ts skills/review-this/tests/composition.test.ts`.
   - Run `npm test` and `npx tsc --noEmit`.
   - Run `./scripts/docs-check.sh` as the final repository check. Treat any failure as part of this change.
   - Inspect a post-change plain command transcript when a safe existing target is available. Pass criteria: `agent_manager` overview and worktree start occur before any Task execution; an attempted Task fallback requires approval; review Tasks appear only after the persistent PR worktree exists.

## Failure handling

- If `agent_manager` is absent, denied, or cannot create an isolated worktree, stop before claims, edits, or review verdicts. Do not fall back to Task.
- If the user approves a Task prompt, treat that approval as the explicit forced exception and keep review subagents inside the persistent PR worktree.
- If runtime resolution changes away from `~/.kilocode/skills/`, stop synchronization and re-check Kilo config precedence before overwriting another installed source.
- Preserve unrelated working-tree and installed-skill changes.

## Prose audit

Scope: this plan. Scanner: not run; model-only review used. Accepted findings: none. Protected commands, paths, identifiers, permission values, and invariant references are unchanged. Preservation audit: passed.
