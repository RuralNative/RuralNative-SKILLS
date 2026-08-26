# Remediation: Snyk Critical findings on `document-for-agents` and `document-for-humans`

## Goal

Remove the Snyk Critical-risk findings on the two documentation skills by eliminating the embedded executable installer instruction from their agent-facing `SKILL.md` files, following the trust boundary already established in ADR-0015.

## Root cause (why Snyk flags these two as Critical)

Both skills embed this instruction inside `SKILL.md` — the file an LLM loads and obeys:

> If `unslopify` is absent, stop before any draft and emit `npx skills add RuralNative/RuralNative-SKILLS --skill unslopify`.

- `skills/document-for-agents/SKILL.md:71`
- `skills/document-for-humans/SKILL.md:35`

This is a prompt-injection → remote-code-execution vector:

1. **Agent-executed installer**: the skill text directs the model to run (or emit for execution) a network-fetching command during workflow execution. Static analyzers treat executable commands in prompt files as injection vectors because the agent can run them without a human approval gate.
2. **Unpinned supply chain**: `npx` downloads and executes the `skills` CLI with no version pin, which then pulls content from a GitHub repo shorthand with no commit pin or integrity check. A compromised upstream executes arbitrary code on the user's machine.
3. **Inconsistent with shelf policy**: ADR-0015 (`docs/adr/0015`) decided "Workflow execution performs no skill downloads; installation stays a user step outside the run." Every other skill on the shelf complies — `grep 'skills add' skills/*/SKILL.md` matches only these two files. They are the outliers, which is why they carry the finding.

## Decisions

- Keep the hard-dependency stop behavior: if `unslopify` is absent, the skill stops before drafting.
- Replace "emit `npx skills add ...`" with "stop and direct the owner to install `unslopify` via this skill's `INSTALL.md`". No command string appears in `SKILL.md`.
- Install commands remain in `INSTALL.md` (human-facing) only — same posture as `plan-this`, `implement-this`, `review-this`, `release-skills`, `unslopify`.
- Update the provenance sections to record that the Snyk audit reported Critical for these two skills' install path (not just for `plan-this`).

## Tasks

1. **`skills/document-for-agents/SKILL.md`** (Dependency section, ~line 71): rewrite the absence clause to stop and refer the owner to `INSTALL.md`; delete the `npx` command string. Preserve: stop-before-draft, parent-decisions-outrank, missing-Python-does-not-stop, final-audit requirements (guarded by existing tests).
2. **`skills/document-for-humans/SKILL.md`** (Dependency section, ~line 35): identical rewrite.
3. **`skills/document-for-agents/tests/composition.test.ts`** (~line 54–64): invert the assertion — `SKILL.md` must NOT contain `npx skills add` / must not contain `skills add`; keep assertions for stop-before-draft, model-only path. Add an assertion that `INSTALL.md` retains the dependency-order commands.
4. **`skills/document-for-humans/tests/composition.test.ts`** (~line 55): same inversion.
5. **`skills/document-for-agents/INSTALL.md`** (~lines 26–30, 69–72): replace "the workflow stops ... and emits the exact instruction `npx ...`" with "stops and directs the owner to this file's Install section"; update the provenance paragraph (~line 115) to state the audit reported Critical for this skill's install path.
6. **`skills/document-for-humans/INSTALL.md`**: same two edits (~lines 26–31, 69–73, 121).
7. **`README.md:9`**: replace the emit-command sentence with "the documentation workflows stop and direct you to each skill's INSTALL.md".
8. **Docs together with code** (repo rule): check `docs/leaves/document-for-agents.md` and `docs/leaves/document-for-humans.md` for statements about emitting the install instruction and update to match. If ADR-0015's scope needs extending to cover these two skills explicitly, note it in the leaf docs rather than rewriting the accepted ADR.
9. **Reinstall local copies** (owner action, outside the repo): refresh `~/.agents/skills/document-for-agents/` and `~/.agents/skills/document-for-humans/` (and `.kilocode/skills/` copies if present) from the fixed source so the running agents load clean files.

## Validation

- `grep -rn "skills add" skills/*/SKILL.md` → zero matches.
- `npm test` (or the repo's test runner) passes, including the updated composition tests.
- `./scripts/docs-check.sh` green before finishing (repo harness requirement).
- Re-run the Snyk scan and confirm both Criticals clear; W011-class residual-trust notes stay in place (they are advisory, not auto-fixable).

## Risks / notes

- Older installed skill copies on disk will keep instructing the old behavior until refreshed — step 9 is mandatory for the fix to take effect locally.
- Do not claim in prose that the Snyk findings are "gone" beyond what a fresh scan shows; shelf convention (guarded by tests in `plan-this`/`unslopify`) forbids overclaiming.
- Other skills keep their `npx` commands in `INSTALL.md`; those are human-facing install docs and were rated Medium/W011, not Critical. Out of scope unless the new scan escalates them.

## Open questions

None blocking. If the fresh Snyk scan still reports Critical after the command strings leave `SKILL.md`, capture its exact rule ID and re-plan against the specific detector.
