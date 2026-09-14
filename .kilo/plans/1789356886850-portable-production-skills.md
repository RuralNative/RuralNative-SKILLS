# Portable production workflow skills

## Goal and agreed scope

Make `plan-this`, `implement-this`, `review-this`, and `fix-this` usable in Kilo Code, OpenCode CLI, Claude Code, and Codex without duplicating their workflow logic or weakening their gates.

The owner confirmed:

1. Portable skills come first. A custom server runner, process monitor, log store, status API, and automatic session orchestration are out of scope. Document native headless usage only where exercised.
2. Use native invocation syntax. Preserve `/name` where supported and use `$name` or the native skill picker in Codex. Skill identities and stage boundaries stay unchanged.
3. Preserve upstream invocation locks. If Claude Code prevents a planning companion from being called by the model, pause for explicit human invocation in the same planning session. Do not edit upstream dependencies, bypass a denial with file reads, or change permissions during a run.

This is functional portability, not a promise of identical keystrokes, permissions, models, or unattended behavior. Initial compatibility evidence targets the Linux environment requested here; other operating systems receive no new certification claim.

This file is the client-requested plan draft. Do not add it to the durable documentation tree. Saving it does not authorize implementation or GitHub publication. Approved specifications and tickets belong in the tracker. This planning session creates neither.

## Observed baseline and corrections to the supplied proposal

Inspected revision: `3055903cb97a6671cb84e9327838b385e83f2c5d`, on a clean `main` checkout before this plan file was created.

| Proposal assumption | Observed state and consequence |
|---|---|
| The workflow needs a new host-independent execution layer. | The shared core and bundled CLIs already exist. ADR-0031 removed worker orchestration; ADR-0042 added permitted installed-file loading when no skill loader exists. Extend these boundaries, not a new runner interface. |
| Install eleven mandatory companions, including `implement`. | `implement-this` implements directly and explicitly has no `/implement` dependency. Its leaf INV-3/INV-4 and `INSTALL.md` disagree with the README, which still requires it. Correct the README and its tests. Include the actual transitive planning dependencies instead. |
| All hosts can use the same slash dispatch and metadata. | Codex uses explicit skill mentions. OpenCode ignores undocumented frontmatter. Claude Code enforces `disable-model-invocation`, including on upstream planning companions. Dispatch and invocation control need host-specific treatment. |
| OpenCode needs five new command files. | First check native skill-command discovery on the selected released CLI. Add only missing entry points for the four requested workflows; a separate `/grill-with-docs` convenience command is not a release requirement. |
| A command template can safely forward arbitrary task text. | The inspected OpenCode `dev` renderer substitutes or fallback-appends arguments before shell and file expansion, including for skill-sourced commands. Removing placeholders or omitting authored shell blocks does not make forwarded text literal. This is development-source evidence, not a released-CLI result. |
| Review can be put into a blanket read-only mode. | Review legitimately preserves local work, aligns detached HEAD, writes private receipts, repairs one bounded evidence region, and publishes findings. Preserve these exceptions while prohibiting source fixes, delivery, and merge. |
| Permission configuration proves a sandbox. | Existing review tests inspect Kilo configuration and a local matcher. They do not prove another host's effective permissions or isolate arbitrary shell execution. Test native behavior and state the limits. |
| 771 tests pass and derived docs are stale. | Neither claim is a fresh baseline. Planning permissions blocked `./scripts/docs-check.sh` and CLI version execution. Tests, types, generated parity, and documentation status remain NOT VERIFIED. |

`which opencode claude codex kilo node npm gh` found Claude Code, Codex, Node, npm, and gh executables. It did not find OpenCode or the Kilo CLI on this session's PATH. This does not establish versions, authentication, or the Kilo IDE extension's version.

Key local evidence:

- `scripts/generate-workflow-state.ts:13-54` owns the generated state, validator, GitHub-reader, recovery, and ESM metadata copies.
- `skills/implement-this/SKILL.md:14-18,33-54,69-76` owns authorization recovery, single-target intake, focused verification, and verified PR delivery.
- `skills/plan-this/SKILL.md:32,48-56` owns planning precedence, canonical validation, approval, and publication.
- `skills/review-this/install-check.mjs:158-293` currently mixes bundle verification with Kilo-specific history, installation paths, permissions, and routing checks.
- `.kilo/kilo.jsonc:8-149`, `.kilo/command/review-this.md`, and `scripts/sync-review-this.mjs` are existing Kilo integration points.
- `skills/review-this/prepare-review.mjs:41,145-151` already supports `REVIEW_THIS_RUN_ROOT` with system-temp containment. Do not invent a second scratch-root mechanism.

### OpenCode renderer finding

The completed investigation found this order in the floating `dev` copy of `SessionPrompt.command`:

1. Parse positional arguments, substitute `$N` and `$ARGUMENTS`, or append non-empty arguments when no placeholder exists.
2. Extract and execute shell blocks from the resulting template.
3. Resolve file references from that same template, then combine the resulting parts with supplied input parts.

The inspected function has no `cmd.source === "skill"` exception. Native slash-invoked skills use this renderer too; fallback append is not an append-after-preprocessing path. Quote trimming is not an escape mechanism. Shell-block syntax and matching `@path` references can trigger processing; a standalone `$()` occurrence is not by itself proof of execution.

This finding refutes literal slash-argument forwarding for the inspected implementation, not for every OpenCode release or input route. Direct `skill({name})` loading, ordinary user prompts, and composer attachments were not verified by this investigation. They remain candidate routes, not certified safe alternatives. Workflow instructions and validators run too late to prevent command-renderer expansion.

The raw source was fetched from floating `dev`, not a commit-pinned URL. API metadata at the check reported HEAD `df23b7f9488a38e6f8064a0739d4f8cde86d7cfb` and last change to `session/prompt.ts` at `57fa34f23599f65dd1027f9caac31e6c576ce644`. Neither establishes the fetched bytes as a pinned release. Before certification, select a released CLI, re-read its exact commit's renderer, markdown parser, and skill-command registration, then exercise that release.

## Design boundaries

### Shared workflow remains authoritative

Keep the four complete skill bundles and their existing helpers. Host-specific files may select a skill, preserve input, configure supported invocation controls, identify trusted resources, and apply host permissions. They must not restate the workflow, parse a second requirements format, authorize another stage, or create an alternate evidence format.

Preserve these behaviors on every host:

- One explicit human-authorized stage and target in the invoking checkout. Original human messages, not summaries or agent reports, establish continuation authority. Later stop or pause instructions win. A fresh session needs its own instruction.
- Planning stays implementation-free and publishes only after the existing approval preview and explicit approval. Missing human input stops headless planning rather than synthesizing approval.
- Implementation rejects ineligible or ambiguous targets before mutation, pins requirements and default branch, preserves unrelated work, records real focused-check receipts and bug-specific RED evidence, and delivers one PR without merging.
- Review stays in the main session, retains Standards and Spec findings, uses verified head/base and requirements/policy revisions, and publishes only through existing bounded paths. No source fixes, commit, push, merge, or automatic finalization.
- Finalization consumes the validated current review, addresses blocking and advisory findings, runs mandatory local verification, preserves the review body, verifies remote head and squash-merge read-back, and completes bookkeeping only after confirmed merge. Do not add a CI-wait gate or start another ticket.
- Keep native GitHub pagination, provenance checks, argument-array transports, unknown-versus-complete-empty distinctions, and every existing evidence/checkpoint field. Host permissions never override workflow approval.

Keep Node 24+, Git, gh, GitHub-native state, and the existing repository instructions as requirements. This change does not add GitHub Enterprise, another tracker, another JavaScript runtime, an operating-system sandbox, or a model-provider abstraction.

### Native invocation and capability mapping

| Host | Entry and discovery policy |
|---|---|
| Kilo Code | Retain current skill installation support and the existing primary-session review wrapper. Keep Kilo configuration under `.kilo/`. Preserve the owner's existing review model selection without exporting it as a universal requirement. |
| OpenCode CLI | Prefer direct native skill selection or a no-argument entry, with task or target text supplied separately, subject to released-CLI literal-input checks. Do not introduce slash-argument forwarding on the current evidence. Add a thin native command/profile only for a proven discovery or review-routing gap. Keep execution in the main session, not a subtask, and verify installation locations against the selected release. |
| Claude Code | Use `.claude/skills/<identity>/SKILL.md` and native `/identity` invocation. Do not claim native `.agents/skills` discovery. A documented supported symlink may share a trusted bundle. Retain native invocation locks and any required companion pauses. |
| Codex | Use `.agents/skills` and explicit `$identity` or native skill selection. Use supported `agents/openai.yaml` invocation policy for the four top-level workflows. Do not require a tool literally named `Skill`, Kilo history recall, or a custom slash-command framework. |

Prefer the installed skill loader. Only when that mechanism is absent, use permitted reads from a discovered trusted installation, binding relative resources to that installation. A blocked or disabled skill is not an absent loader. Keep `unslopify` available for automatic use; do not blanket-disable companions.

Use available native question, progress, and history mechanisms without requiring their Kilo tool names. If original authorization cannot be recovered, request it. If required execution or publication access is denied, report the exact restriction before the affected mutation; never edit permissions to proceed.

For task and target input, use a proven literal native input route. Do not interpolate task or GitHub text into shell blocks, shell-built commands, or file-expanding templates. For OpenCode, test explicit stage selection with data supplied outside slash-command arguments. A separate ordinary message is a candidate, not an assumed bypass of preprocessing. No home-grown escaping algorithm, replacement command parser, or workflow-level guard presented as protection from earlier host expansion.

The input flow is explicit human stage selection, original human task or target data, native skill loading, the existing canonical input slot and validators, then the unchanged workflow. When selection and data require separate messages, bind them within the same session. Selection alone may request missing input but authorizes no target-specific work or publication. A stop cancels that pending selection; a new session needs a new explicit instruction. Do not introduce durable pending-input state.

Document unsupported invocation forms and test only harmless fixtures when characterizing their renderer behavior. If no native route preserves literal data on the selected release, mark that capability restricted and block its compatibility claim rather than relaxing the workflow contract.

### Dependencies, installations, and trusted paths

- Required local bundles are the four workflows plus `unslopify`.
- Planning requires upstream `grill-with-docs`, `grilling`, `domain-modeling`, `to-spec`, and `to-tickets`, including the companion reference files they actually load. Verify the reviewed upstream revision at implementation time; installed local copies are observations, not proof of an upstream commit.
- `implement` and `code-review` are not restored as runtime dependencies. `ponytail` remains required where repository instructions or the existing Kilo wrapper require it; do not mislabel it as a new universal core dependency.
- Preserve the existing registry lane and complete-directory manual fallback. Document global and project-local installation, reviewed revisions, verification, and explicit overwrite consent. Do not build a general installer or new dependency lockfile unless an exercised native installation gap makes it necessary.
- Verify bundle bytes and required resources against the reviewed source. The ignored local `skills-lock.json` is not the production dependency manifest. Do not silently vendor upstream content or install anything during a workflow run.
- Resolve helper resources from their installed module location while repository operations stay in the invoking checkout. An unrelated working directory may run pure validators, but repository operations must fail if no intended checkout can be established.
- Separate common installation checks from host-specific checks. A Claude or Codex installation must not need `kilo_local_recall`, Kilo agent YAML, or a `/.kilocode/` pathname to pass. Preserve the current Kilo verification path.
- Bind review execution to the verified installation's real path and content, not a directory-name wildcard. A project-local install changed by PR checkout alignment must not silently become trusted code. Revalidate or stop; recommend an independent global installation where needed.
- Reuse the existing constrained scratch-root override and preserve the legacy default for compatibility. Do not rename `/tmp/kilo` for branding or widen temporary-directory, traversal, or symlink permissions.
- New command/agent source files stay under `.kilo/` as repository instructions require. OpenCode-specific distribution templates, if needed, stay in an inactive namespaced location there and are copied only during explicit setup. Do not add an active repository `.opencode/` configuration or overwrite users' global settings. Codex `agents/openai.yaml` is skill metadata, not a new agent definition.

## Ordered implementation work

### 1. Establish the executable baseline and compatibility facts

In an implementation-capable session, record source revision, status, installed host versions, Node and gh versions, and exact baseline command results. Do not install hosts or change the user's global configuration as a hidden prerequisite.

For each selected released host version, verify discovery, native invocation, argument handling, disabled-skill behavior, and required tool/permission capabilities. OpenCode's rendered documentation and development source are not interchangeable release guarantees. Pin the version used for certification. Use isolated homes and disposable repositories, not production tickets or PRs.

Keep OpenCode configuration generations separate. Legacy documentation uses singular `command`; v2 documentation uses plural `commands` and documents fallback argument append. Select the schema belonging to the tested release rather than combining examples from both. Any claim that slash arguments remain literal requires both commit-pinned source verification and a live released-CLI check, including the no-placeholder skill path.

Add the smallest failing regressions for confirmed portability defects before fixing them. A baseline failure is a named blocker with command, exit status, paths, and evidence that it predates this change. Do not repair unrelated documentation or code under cover of migration.

### 2. Make the shared entry and dependency contract portable

Update the four `SKILL.md` entry instructions and their composition tests to recognize the approved native invocation forms while retaining explicit user authorization and existing argument validators. Preserve task text exactly as requirements data and keep the canonical task/ticket slots unambiguous.

Extend the existing `scripts/workflow-recovery.md` only where a shared capability rule is missing, then regenerate its bundle copies. Use documented top-level invocation metadata where supported, with tests that it neither enables autonomous stage chaining nor breaks explicit command loading. Unknown metadata is never an enforcement claim.

Make the planning dependency route complete. For locked companions, preserve the approved plan and canonical publication rules across the human's same-session invocation; do not fall through to upstream default templates, claimable parent labels, or premature publication. Missing, ambiguous, disabled, and denied dependencies need distinct actionable outcomes.

Update installation guidance and README dependency claims in this same change. Update `tests/readme-contract.test.ts`, which currently requires the obsolete upstream `implement` dependency. Do not change the business logic in `workflow-state.ts` or GitHub transports merely to make the prose look portable.

### 3. Make review setup and installation verification host-aware

Refactor the existing `review-this` install check so full-bundle parity is independent of Kilo-specific configuration validation. Extend current synchronization/verification tooling only as necessary; keep `scripts/sync-review-this.mjs` an explicit setup operation, never a workflow dependency.

Provide the minimum native setup needed for the selected hosts. Review must deny source-edit tools and direct delivery paths while allowing trusted installed preparation, validators, private receipts, and bounded publication. Preserve checked checkout alignment and recovery. Do not copy Kilo permission keys into another host unchanged or treat Claude's `allowed-tools` as a deny list. For Codex, distinguish its native sandbox from approval rules; verify narrow helper approvals and private input-file access without granting unrestricted workspace writes or full access.

Test both permitted review operations and prohibited source edits, commits, pushes, merges, arbitrary runtimes, PR-controlled helpers, shell chaining, redirection, preloads, and permission self-edits. Use native host checks for native enforcement claims; fixture matcher tests alone are insufficient. No broad permission bypass flags, subagent review, model pinning across providers, or blanket shell access advertised as isolation.

Host setup that cannot satisfy the required boundary is restricted, not silently relaxed. Keep host-specific restrictions separate from missing requirements and recoverable operational errors.

### 4. Validate complete bundles and stage interoperability

Use existing tests plus focused additions for:

- Frontmatter and native invocation policy, stable identities, full resource copying, missing companions, mismatched expected revisions, conflicting duplicate installations, and explicit overwrite protection.
- Native entry selection, empty/malformed/multiple/cross-repository targets, wrong issue/PR kinds, and no mutation before rejection. Distinguish a permitted no-argument selection awaiting input from a rejected target. Exercise quotes, spaces, newlines, `$()`, shell-block syntax, and `@paths` through the actual supported literal-input route; verify the received text and absence of unintended shell execution or file expansion.
- OpenCode renderer regression cases for `$N`, `$ARGUMENTS`, no-placeholder fallback, and native skill commands. Characterize unsupported slash-argument behavior separately from supported-route acceptance. Test separate-message binding, cancellation, and fresh-session authorization without inventing a new evidence format.
- Loader-present, loader-absent, loader-denied, and companion-locked cases. A denial must never trigger a file-read bypass. Planning approval must survive permitted companion pauses without becoming automatic approval.
- Module/helper execution from a skill directory, repository root, nested repository directory, unrelated directory, global install, and project-local install, including foreign CommonJS repositories and paths with spaces. Keep Git operations bound to the chosen checkout.
- Node 24, Node 26 when available, unsupported/missing runtime, missing gh, authentication failure, missing repository, and non-Git directories. No network-dependent unit tests or real-home changes.
- Existing recovery, preservation, stale revisions, incomplete native reads, publication interruption, and fix-progress behavior. Verify that an artifact produced under one host is accepted unchanged by the next stage under another host.
- Actual output and exit-status receipts, not summaries. Test that pending work, unverified evidence, denied operations, and partial bookkeeping never become complete.

Tests and documentation ship with the behavior they prove. If tickets are published later, use two coherent slices: shared entry/dependency portability, then review-specific host setup and verification. The second consumes the first's contract. Both are `high-risk`: the first changes shared explicit-authorization behavior, and the second changes trusted-helper execution and permission boundaries. Do not create separate tests-only or documentation-only tickets.

### 5. Update durable documentation and certify narrowly

Update the four INSTALL files, README, affected leaf docs, and any changed vocabulary or installation policy. The native invocation decision narrows the slash-only contract in plan-this INV-3/INV-4 and its fixed-template decision history. Preserve explicit stage authorization. Reconcile obsolete `disable-model-invocation` documentation against actual metadata and host behavior rather than deleting safety requirements.

Record one new narrowing ADR if the invocation/delegation boundary meets the repository's decision criteria; do not rewrite historical ADRs or create an ADR per host. Keep `Harness` as the docs-check term and use `agent host` for these products. Refresh affected seam fingerprints and regenerate affected derived human docs through the existing lifecycle, without hand-editing them or touching unrelated docs.

Run the repository acceptance checks after focused work:

```text
npm ci
node scripts/generate-workflow-state.ts --check
npm test
npx tsc --noEmit
npm run docs:check
```

`npm run verify` already runs `npm ci`, tests, types, and docs checks. It may supply that aggregate evidence instead of repeating the same sequence. Preserve its exit status and individual failing-step evidence. These are migration acceptance checks, not a new full-repository gate inside every `/implement-this` run.

For each available host, run a safe live check of discovery, explicit skill loading, argument preservation, one pre-publication planning path or invalid-target rejection, and effective permissions. Record host/version, command, output, exit status, and direct Git state before and after. Use isolated configuration and no real GitHub mutations. Never fabricate a model run or count a fake host executable as live compatibility proof.

Publish a per-host matrix distinguishing documented behavior, deterministic fixture verification, native live checks, and unverified production effects. Preserve Kilo as the regression reference. A missing host or denied runtime check remains NOT VERIFIED; do not label all four hosts production-proven. Add native headless examples only after exercising the actual CLI, and explain approval/permission pauses. Do not add custom monitoring or resume storage.

Roll out through explicit installation or upgrade, not automatic global changes. Preserve the previous bundle revision and affected configuration before replacement, verify the new installation, and document how to restore the prior installation if verification fails. Rollback changes only the installation, never repository work or GitHub artifacts. Use non-sensitive fixtures and sanitize diagnostic evidence before publication; never copy credential stores into fixtures or attach raw authentication data.

## Completion criteria

- The same four bundles retain their workflow authority and existing evidence formats across the four native entry mechanisms.
- OpenCode works without a Kilo executable, Agent Manager, Kilo-only tool names, or a new workflow runner. Every claimed input route has released-version proof of literal task/target handling; unsupported slash-argument forwarding is not advertised as safe.
- Claude's locked planning companions remain locked, with documented and tested explicit-human continuation. Codex needs no invented slash command or Skill tool.
- Installation checks accept verified supported roots while rejecting stale, incomplete, ambiguous, or PR-controlled bundles; repository and helper working directories are not confused.
- Existing stage, recovery, provenance, approval, verification, and merge boundaries remain intact, with positive and negative tests for changed host setup.
- All required local gates pass before claiming the migration fully green. Any outstanding baseline failure or unavailable host has a named blocker and limits the compatibility claim.
- No source, permission, installation, or tracker mutation occurs during this planning pass. Implementation and any later specification/ticket publication require their own authorization.

## External evidence consulted

Retrieved on 2026-09-14. These establish documented behavior, not live certification:

- OpenCode skills: https://opencode.ai/docs/skills/
- OpenCode commands: https://opencode.ai/docs/commands/
- OpenCode v2 commands: https://opencode.ai/v2/docs/commands, also queried through Context7 `/websites/opencode_ai_v2` for fallback append and the `commands` key.
- OpenCode permissions: https://opencode.ai/docs/permissions/
- OpenCode CLI: https://opencode.ai/docs/cli/
- Claude Code skills, invocation control, permissions, and discovery: https://code.claude.com/docs/en/skills
- Codex skills and invocation policy: https://developers.openai.com/codex/skills
- Codex sandbox and approvals: https://developers.openai.com/codex/sandboxing.md
- Existing registry CLI: https://skills.sh/docs/cli

Development-source evidence from the completed renderer investigation, not release certification:

- Command renderer: https://raw.githubusercontent.com/anomalyco/opencode/dev/packages/opencode/src/session/prompt.ts, inspected `SessionPrompt.command` and argument-parser definitions.
- Shell/file extraction: https://raw.githubusercontent.com/anomalyco/opencode/dev/packages/opencode/src/config/markdown.ts.
- Native skill-command registration: https://raw.githubusercontent.com/anomalyco/opencode/dev/packages/opencode/src/command/index.ts.

Final planning check: `git status --short` showed only this untracked plan. A renewed `./scripts/docs-check.sh` attempt was denied by planning-mode permissions before execution. No exit-status receipt or passing result exists for that check; do not bypass the restriction or call the baseline green.

No unresolved product decisions remain. Version-specific discovery, literal-input safety, and effective native permissions are mandatory implementation validation gates, not assumptions that may be waived.
