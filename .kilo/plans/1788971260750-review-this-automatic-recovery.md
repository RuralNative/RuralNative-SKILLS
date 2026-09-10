# Automatic recovery for Review This

## Goal and approved boundaries

One `/review-this <target>` invocation should repair recoverable review prerequisites, perform the Standards and Spec review, publish its verified result, and finish without asking the user to repair or restart the run.

The user approved these decisions during planning:

- Revalidate existing implementation against current requirements and repair only workflow-owned PR evidence. Preserve the old pin, new pin, reason, and real verification results.
- Review unapproved policy changes under the established rules and publish unresolved conflicts as blocking findings. Do not pause for approval or invent an exception.
- Restore repository-prescribed local prerequisites, including locked dependencies in ignored directories and an already-installed compatible runtime. No source or lockfile edits, global installs, credential changes, or live/paid service operations.

Review remains separate from implementation and finalization. No source fixes, commits, pushes, merges, labels, ticket closure, worktree creation, Agent Manager changes, or automatic `/fix-this` invocation. A completed review may contain blocking findings; completion does not mean approval.

This is a client planning artifact, not a repository work document. Do not commit it. Record the implementation work and decision evidence in the issue tracker when implementation begins. Preserve the unrelated existing plan `1788959010486-rewrite-kilo-workflow-agents.md`.

## Findings from inspection

- `/tmp/kilo/handoff-295-review-continuation.md` describes a same-version `requirements-adapted-v1` mismatch on PR #295, repaired by replacing the evidence pin. Its claim of historical equivalence is not a sufficient general repair algorithm. Matching ticket criteria does not establish unchanged parent requirements or other constraints.
- `/tmp/kilo/pr-295-review-handoff.md` describes three repository-local policy exceptions, approved outside review. The canonical owner decision is [PR comment 5605141890](https://github.com/RuralNative/eScraper-Business-Brokers-for-Seacher-Insights/pull/295#issuecomment-5605141890). Its body was read during planning. Neither handoff is independent authority to change policy or restart that PR's review.
- `skills/review-this/SKILL.md:19,26,47-50`, `discovery.ts:71-90`, and `review-policy.ts:55-60` explicitly require these manual stops. Permissions alone cannot fix the behavior.
- `scripts/workflow-state.ts:2911-2944` rejects a same-version mismatch even with `currentScopeResolved` and `proofRevalidated`. Existing tests require that rejection. This implementation-stage helper must not be loosened accidentally for every consumer.
- `reviewPolicyDecision` receives an unchecked `conflictingSources` boolean. It neither discovers approvals nor distinguishes a proposed policy violation from unavailable governing authority.
- Review publication already has an injectable transport, native pending-review discovery, read-back validation, and `resumeReviewId`. Reuse them instead of introducing a general workflow engine.
- Code inspection also exposes a policy-revision round-trip problem: `effectivePolicyRevision` joins multiple sources with newlines, while `escapeHandoffText` flattens those newlines before the validator compares the result with the original revision. Adding an approval source must not introduce another publication blocker. This needs a regression test using real generated revisions rather than a constant policy string.
- The session's skill registry resolves `review-this` to `~/.kilocode/skills/review-this/`, whose installed bundle is stale. It lacks `gh-review-transport.ts` and the current publication/receipt contract. The other installed copy, `~/.agents/skills/review-this/`, matches the repository. Repository tests do not detect this installed-copy drift.
- The global agent is defined in `~/.config/kilo/kilo.jsonc` at `agent.review-this`, with a duplicate in `~/.config/kilo/agent/review-this.md`. Its deny-all edits and ask-by-default Bash rules do not pre-approve its Node helpers or local setup. A trailing cross-tool catch-all also needs an effective-permissions check, not an assumption that earlier denials survive.
- `~/.config/kilo/command/review-this.md` routes to `review-this` with `subtask: false`. Project `.kilo/kilo.jsonc` currently sets only `snapshot: false` and `permission.task: ask`. No tracked Review This agent definition or installed-copy check exists.
- Runtime reproduction and `./scripts/docs-check.sh` were attempted but denied by this plan agent's permissions. No passing test baseline or live end-to-end reproduction is claimed.

## Implementation

### 1. Lock down both incidents before changing behavior

Extend the existing Node test suite with sanitized PR #295 fixtures. Keep the existing PR #294 legacy-contract fixture in `tests/incident-fixtures.ts` distinct.

- Model a valid nine-criterion evidence block whose adapted pin differs under the same version, with unchanged head and current resolvable parent/ticket bodies.
- Model missing `REVIEW.md`, proposed changes to other governing sources, and the three scoped owner exceptions. Test both an authenticated matching decision and no decision.
- Assert the complete path through preparation, review readiness, publication, and read-back. Tests must fail on today's manual-stop behavior, not merely assert new strings or caller-supplied `ready: true` flags.

Use existing fakes and tests under `skills/review-this/tests/`, `tests/workflow-cli.test.ts`, and `tests/workflow-state.test.ts`. Add only the recovery-specific test files needed.

### 2. Give review preparation a bounded recovery path

Keep pure decisions in the review package and effectful operations behind `skills/review-this/prepare-review.mjs` with a testable TypeScript implementation. Reuse `targets.ts`, `review-session.ts`, the shared requirements/evidence validators, and the existing injectable `gh` runner. Keep the entry point limited to prerequisite observation, approved preparation/verification, and scoped evidence repair. It must not expose a general shell or arbitrary GitHub request interface.

Order the skill as follows:

1. Resolve exactly one target and capture live PR, ticket, parent, body, and revisions.
2. Prepare the clean checkout using the existing verified detached alignment.
3. Resolve governing policy and inspect the verification commands before executing project code.
4. Classify and recover evidence or local verification prerequisites.
5. Recheck readiness, review once, and publish.

Return explicit outcomes for ready, recoverable preparation, reviewable with blockers, and restricted. Keep implementation-evidence validity separate from whether a read-only review can proceed. Never make a failed evidence validator return `current` merely to start review.

Use one corrective attempt per recoverable failure class. Re-read observations before repeating an operation. A transient read failure or a correctable input-format error can retry once; an authorization denial cannot be bypassed through another tool. A revision change can trigger one fresh preparation before review starts. Movement during review or publication invalidates the pinned result and must not publish it as current. No indefinite retry loop or CI polling.

### 3. Repair evidence from current proof, not inferred history

Add a review-specific recovery decision rather than silently changing `decideRepairRevalidation` for implementation and finalization. Keep `classifyRequirementsPin` diagnostics honest about unknown historical causes.

- Permit recovery of supported legacy and same-version stale pins, or a missing pin in an otherwise unambiguous supported evidence block, only after current requirements resolve and full current-scope proof is revalidated on the selected head.
- Revalidate all active ticket criteria and applicable inherited parent constraints. Execute behavior checks established by inspected, checked-in configuration and retain actual command/output/exit-status receipts. Inspect non-behavior criteria directly. Do not relabel behavior criteria as non-behavior to evade receipts.
- Reuse an identical verification receipt within the invocation when its head, base, requirements, policy, command, and environment are unchanged. Do not rerun the broad fallback solely because recovery already ran it.
- Preserve genuine historical bug RED evidence. Never reconstruct lost history or describe fresh verification as proof that historical requirements were identical.
- Render a candidate evidence block with the bundled helpers and require `workflow-cli.mjs evidence` to accept it, including criterion coverage and receipt checks, before publication.
- Record the old evidence/pin, new pin, reason, target revisions, and new verification provenance in one workflow-owned repair record on the same PR. Reuse an identical record after interruption.
- Re-read the full PR body and all pinned inputs immediately before writing. Replace exactly one validated evidence region, preserving everything outside it byte-for-byte. Reject duplicate/unbalanced markers, unknown envelope versions, conflicting associations, or unexpected content changes instead of guessing.
- Read back the PR and run the consumer validator again. Continue automatically only from the observed result. Reconcile uncertain writes by reading back, never by blind resubmission.

GitHub's documented PR-body PATCH has no expected-body-version parameter. Do not claim an atomic compare-and-swap. Use immediate pre-write comparison, minimal replacement, retained provenance, and post-write validation; report any observed race. A concurrent human edit in the remaining network window is a documented risk.

If real verification fails, retain the old evidence unchanged and carry the observed failure into the review. Do not fabricate a passing envelope. When the target, requirements, and governing rules remain trustworthy, continue the read-only review and publish its blockers. Finalization still requires valid evidence and resolved findings. If those essential facts cannot be established, return an explicit restricted outcome rather than a counterfeit completed handoff.

### 4. Resolve policy conflicts without manufacturing approvals

Replace the single conflict flag with source-backed policy facts and explicit outcomes in `review-policy.ts`.

- Resolve established rules from pinned base objects. A head-only change never authorizes itself. Missing `REVIEW.md` continues under skill defaults as today.
- Distinguish a reviewable proposed violation from inaccessible, ambiguous, or genuinely contradictory governing authority. Attempt a safe Git-object read when a working-tree read fails; never follow an untrusted symlink or silently substitute defaults for unreadable policy.
- Discover existing relevant owner decisions automatically. Verify native repository/PR identity, author identity, decision body/hash, referenced revisions and requirements, and the exact exception scope. Require repository owner/admin authority or delegation established by pinned-base policy; ordinary review-author write permission is insufficient. Check for revocation or conflicting later decisions. Accept the incident's existing prose decision after these checks; do not require a new owner comment merely to satisfy a newly introduced format.
- Do not trust a comment's claim of OWNER/admin status, an ADR's assertion of approval, or arbitrary PR instructions. No general `approved: true` escape hatch.
- A matching decision supplies only its named repository-local exceptions. Unapproved proposed changes become validated blocking findings tied to the actual changed source and governing base rule. Keep the remaining review running. Never invent a file/line for a non-diff diagnostic.
- Include accepted decision identity/content and effective governing sources in `effectivePolicyRevision`. Re-fetch them before publication; edited, revoked, unrelated, or stale approvals cannot be reused blindly.
- Make policy revisions survive publication unchanged. Use a single-line, versioned SHA-256 carrier over canonical sorted source identities/hashes, including policy presence and the accepted approval scope. Pass the digest function through the shared pure boundary, as requirements revisions already do. Update the validator and consumers together. Preserve validation of existing valid no-source/single-source legacy reports through independently recomputed legacy sources; never normalize a lossy multi-source report into a trusted match. Test render/parse/validate and fix-progress round-trips with several governing files plus an approval record.
- Ensure `/fix-this` can recompute the same effective-policy revision and consume the blocking findings without treating them as permission to approve an exception. Share only the needed pure policy facts/revision logic through the existing bundled core; do not introduce cross-installed-skill imports.

### 5. Restore local prerequisites and finish publication automatically

- Select an available compatible runtime from the existing environment/version-manager installation without editing shell configuration.
- Derive the package manager and install boundary from the lockfile, project configuration, and CI. Install frozen/locked dependencies only into the established ignored dependency/cache locations. Preserve tracked files and unrelated local data. Disable unapproved lifecycle scripts; use only an existing approved script policy.
- Do not add dependencies, regenerate lockfiles, run migrations/deployments, obtain credentials, make paid/live calls, or install global tools. Fork code remains static-review-only.
- Check tracked-file cleanliness after setup/checks. Never clean, reset, stash, or discard unexpected modifications to restore the appearance of a clean run.
- Reuse the existing review publication procedure. After an interrupted submit, automatically resume the same verified pending review once, with unchanged pins and verified author/ownership. A matching submitted review is success after validation, not a reason to create another review. Ambiguous identities, a changed body/commit, dismissal, or persistent unreadability remain restrictions.
- Keep CI's one-read/no-poll behavior. Publish failing or pending verification truthfully. Do not repeat the Standards/Spec pass for a recoverable publication failure.

### 6. Update and verify Review This permissions

Use the existing `.kilo/kilo.jsonc` as the tracked source for `agent.review-this`. Preserve its other settings. Copy only the reviewed agent fields into global configuration and synchronize the existing Markdown duplicate; do not create a third user-wide agent definition or rewrite unrelated settings.

| File or location | Required change |
| --- | --- |
| `.kilo/kilo.jsonc` | Add the tracked Review This prompt and least-privilege permission definition. Preserve the current model, variant, primary mode, and unrelated project settings. |
| `~/.config/kilo/kilo.jsonc`, `agent.review-this` | Apply the tested definition only to this object. Preserve all other agent, provider, MCP, and global permission fields. |
| `~/.config/kilo/agent/review-this.md` | Synchronize the existing duplicate's prompt and permissions so either loading route gives the same behavior. |
| `~/.config/kilo/command/review-this.md` | Verify `agent: review-this`, `subtask: false`, and argument forwarding. No command change is needed while these remain correct. |
| `~/.kilocode/skills/review-this/` and `~/.agents/skills/review-this/` | Replace only these installed bundles from the tested local source, then check complete file-set and byte parity. |

The review agent must not perform its own installation or permission edits. Those are one-time implementation/installation operations.

- Put broad fallback rules before specific rules. Deny prohibited operations explicitly; do not leave them merely ask-gated or let a trailing cross-tool catch-all override them. Leave unrelated global defaults unchanged and verify the merged profile cannot inherit broader execution authority.
- Allow normal source/document reads and required skill loading. Permit read-only GitHub discovery, verified fetch/detach preparation, validators, evidence repair, publication, and approved project setup/checks through the fixed installed helpers. Read-only Git inspection may remain directly available. Remove unrestricted checkout/switch patterns; perform clean detached alignment through the checked preparation path, including `git -c core.hooksPath= checkout --detach <sha>`.
- Bind allowed helper invocations to the installed `prepare-review.mjs`, `workflow-cli.mjs`, and `publish-review.mjs` paths and compatible Node executable paths resolved during installation. Do not grant blanket `node *`, `npm *`, `npx *`, `gh api *`, version-manager shell evaluation, or arbitrary script execution. Unknown flags, interpreter preloads, environment overrides, and payload-selected commands/endpoints must not turn a trusted entry point into an escape hatch.
- Helpers call `gh` and approved setup/check commands using argument arrays, with validated targets and a sanitized environment. The helper's child processes are not separately constrained by Kilo's model-facing command allowlist. Enforce the operation/argument restrictions inside the helper; input may select an approved operation or criterion, never arbitrary shell text or API fields. Inspection by the reviewer is required before executing project code.
- Prefer supported stdin inputs where the host permits them. When files are necessary, let the preparation helper create a private run directory under `/tmp/kilo/review-this/`; allow native writes only there. Reject symlinks, traversal, and paths outside that run directory. Keep source files, installed helper code, agent definitions, credentials, and unrelated external paths unwritable through native edit tools.
- Keep source fixes, arbitrary PR/issue mutation, Git delivery/destructive operations, global installs, subagent delegation, and permission self-modification denied. Missing authentication, a host/managed restriction, or an unapproved setup command produces a truthful restriction or static review with blockers, not an attempted permission bypass.
- Verify last-matching-rule behavior using the installed Kilo runtime, including global, agent, project, and environment/managed overrides. The [official CLI documentation](https://github.com/kilo-org/kilo/blob/main/packages/kilo-docs/pages/code-with-ai/platforms/cli.md) and [permission evaluator](https://github.com/kilo-org/kilo/blob/main/packages/opencode/src/permission/next.ts) support last-match behavior; the built-in skill's first-match sentence is not the test oracle. Inspect only a sanitized projection of the resolved review agent and command, never dump global configuration containing MCP credentials.
- Add fixture-based permission/configuration tests under `skills/review-this/tests/`. CI must not require this user's home directory or credentials. Separately run an opt-in installed-profile check against the actual loaded configuration and skill root. Test allowed operations and denied shell chaining/redirection, interpreter evaluation/preloads, arbitrary API fields/endpoints, path traversal, scratch symlinks, and broader inherited rules. Command permissions are not an OS sandbox; retain code inspection and fork restrictions.

### 7. Update the contract and install the tested result

- Add the next available ADR recording the user-approved exceptions to review-this INV-9, INV-14, INV-16, INV-18, and INV-19. Keep historical ADRs unchanged. Explain why metadata/setup repair belongs to review preparation but source fixes and approval decisions do not.
- Update `skills/review-this/SKILL.md`, `INSTALL.md`, `docs/leaves/review-this.md`, `REVIEW.md`, the relevant `CONTEXT.md` definitions, and the affected README/index/derived-document claims. Include the tracked agent configuration in the owning documentation and fingerprint coverage. Update the minimal `/fix-this` policy-consumption documentation if shared resolution changes.
- Keep the fixed skill template and both Standards/Spec checklists. Replace external-repair-and-manual-resume instructions only for the approved recoverable cases. State every retained restriction plainly.
- Author shared changes only in `scripts/workflow-state.ts` or `scripts/workflow-cli.mjs`, then regenerate their four packaged copies with `scripts/generate-workflow-state.ts`. Preserve existing serialized contracts unless a tested compatibility change is necessary. Refresh affected documentation fingerprints after reviewing their claims.
- Correct the installation instructions: `~/.agents/skills/review-this/` alone is insufficient for this session's registry. Discover the active root on installation rather than asserting one universal precedence. Install every changed workflow bundle needed for the shared contract, including `review-this` and `fix-this`, into its existing discovered roots. Do not copy unrelated skills or create new commands/agents in legacy directories.
- Add a small, read-only installation check accepting explicit source/install roots. Check complete bundle file sets and bytes, agent prompt/permissions, command routing, and the runtime-resolved skill path; exercise it in isolated fixture homes in CI and run it against the real installation before completion. Keep any one-time synchronization targeted; no general configuration manager is needed.
- After tests pass, apply the global agent changes and resynchronize the stale `.kilocode` bundle and matching `.agents` bundle from local source. Recheck the active configuration and registry in a fresh agent/session, both in this repository and a fixture project without a local override. Do not depend on a remote release or silently download skills during review. Preserve protected local copies of overwritten installation artifacts for rollback; if activation fails, restore only the changed agent objects/mirror and skill bundles, then validate the restored installation. Never emit config secrets or store them in the repository.
- Do not commit, push, merge, or restart the incident PR's review as part of this task unless separately requested.

## Acceptance and validation

| Scenario | Required outcome |
| --- | --- |
| Same-version stale pin, full current proof available | Revalidate, publish one scoped evidence repair, validate read-back, review and publish without a question or manual restart. |
| Matching verified owner decision | Apply only its named exceptions; continue with the same policy revision in review and fix consumers. |
| No valid approval for a proposed policy change | Review under established rules and publish blocking findings; no invented approval and no request to restart. |
| Both incident failures in one invocation | Resolve each independently; do not lose verified work or repeat the review pass. |
| Missing locked dependencies or wrong selected runtime | Perform the allowed local setup, preserve tracked files, and resume verification. |
| Failed checks, missing receipts, or insufficient historical proof | No false `current` evidence or passing verification; publish supported blockers or an explicit restriction. |
| Changed revisions, edited approval, ambiguous markers, dirty checkout, or hostile fork | No unsafe repair, stale verdict, source overwrite, or execution of untrusted fork code. |
| Lost evidence/review write response | Read back and adopt only the matching result; at most one repair record and one native review. |
| Permission profile | Ordinary recovery operations need no approval; prohibited operations remain denied after merging actual configuration. |
| Stale duplicate installation or higher-priority agent override | Installation check identifies the loaded path and mismatch; activation is not reported successful until the actual resolved profile and bundle pass. |
| Independent checkout without local agent configuration | The updated user-wide command, agent, and skill complete the same allowed recovery without approval prompts. |

Run focused review/recovery and shared-contract tests first, then `npm test`, `npx tsc --noEmit`, `node scripts/generate-workflow-state.ts --check`, and `./scripts/docs-check.sh`. All must pass in an implementation-capable session. Test installed isolated packages in both ESM and CommonJS target projects without repository dependencies.

Run old-versus-new skill evaluations for the two incidents and a combined case using fake GitHub responses and the actual Review This permission profile. Assert zero user-question calls and zero permission prompts on recoverable paths, one complete review publication, truthful receipts, and no forbidden effects. Negative permission probes must use permission evaluation or harmless fakes, never execute a real prohibited operation. No live GitHub mutation is needed for regression tests. Finish with an installed-agent end-to-end check against a disposable fixture project, not the real incident PR.

Planning decisions are resolved. Runtime, permission, installation, and documentation checks remain implementation acceptance gates; this planning session has not run them successfully.
