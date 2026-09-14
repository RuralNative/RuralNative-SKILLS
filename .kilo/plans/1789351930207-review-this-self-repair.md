# Review This recovery and wrapper repair

## Goal and approved scope

Make `/review-this` recover from repairable tooling failures and finish its existing review invocation without asking the user to repair tooling or restart. Keep the custom Review This agent a thin loader for the installed skill.

The user approved **run-local helper repair**. Future reviews may reproduce a helper defect, correct an isolated copy, test it, and resume. They may not alter shared installations, PR source, permissions, requirements, or approval rules. This maintenance task will fix and synchronize the known defects in the shared source and active installations.

This file is the native client's review artifact, not a durable repository document. Keep implementation work records in the GitHub tracker. Do not commit this plan. No source/configuration edits, installation changes, reviews, commits, or pushes occurred during planning.

## Evidence

- The supplied handoff is `/tmp/kilo/handoff-review-312-20260914.md`. A live read confirmed PR #312 in `RuralNative/eScraper-Business-Brokers-for-Seacher-Insights` remains open at head `47aa0e730711f7fd4e05fe7d87d060b6a0bff655`, base `f49b6ea63a2b9e7f9016f7cb3c84fe5ed9d9321f`, and natively closes #305.
- `scripts/github-facts.ts:274-312` and `scripts/github-facts.mjs:119-137` derive closing issues solely from historical PR timeline `connected` events. The handoff records no such event for #312. The reader certifies an empty result as complete, and `skills/review-this/prepare-review.mjs:1317-1322` rejects the valid association. Its pre-write guard repeats this reader.
- GitHub accepted `closingIssuesReferences(first: 100) { totalCount nodes { number repository { nameWithOwner } } pageInfo { hasNextPage endCursor } }`. It returned #305. GitHub rejected `includeClosed` on this field; do not add that unsupported argument.
- Existing recovery handles inputs, runtime, dependencies, checkout, evidence, and publication, but supplies no tested helper-defect repair path. `decidePrepareRetry` keys attempts by broad failure class, whereas `scripts/workflow-recovery.md` describes distinct causes.
- `.kilo/kilo.jsonc` already permits `skill` loading and eight installed helper routes. Its argument-bearing helper patterns conflict with `install-check.mjs:199-200`, which rejects trailing wildcards. Tests use separate hand-written agent fixtures rather than the real configuration. Do not incorrectly report that `github-facts.mjs` permissions are absent.
- Global JSON and Markdown definitions duplicate Review This with different models and broader permissions. The global command correctly names `agent: review-this` and `subtask: false`. Current definitions do not establish why the historical #200 session lacked `skill`; targeted logs did not reveal its effective tool inventory. Observed serve version is Kilo 7.6.2.
- Current Kilo source, consulted through Context7, uses last-matching permission rules and can remove tools entirely after a wildcard denial. File inspection alone is not proof of effective runtime access.

## Implementation

### 1. Lock down both incident paths before fixing them

Extend the existing Node test suites, using injected runners and isolated fixture homes. Do not contact live GitHub or use real credentials in automated tests.

- Add the #312 pattern to `tests/github-facts.test.ts` and `skills/review-this/tests/prepare-review-cli.test.ts`: no qualifying timeline event, native closing connection contains the expected ticket, supported evidence lacks its requirements pin. Exercise the real executable through evidence validation, not just a mocked readiness Boolean.
- Replace fabricated positive agent fixtures with the actual canonical agent definition, rendered through the same path used for installation. Add a failing argument-bearing helper invocation and effective skill-visibility assertion to the permission/install tests.
- Record the failing test commands and results before applying the fixes. Planning did not execute these tests.

### 2. Correct closing-reference observation at its shared owner

Edit `scripts/github-facts.ts` and its executable entry point, not the generated skill copies.

- Read the current GraphQL `PullRequest.closingIssuesReferences` connection using a fixed read-only query, validated variables, and argument arrays. Follow cursors to completion; validate response identity, nodes, repository identity, pagination, counts, and GraphQL errors. A successful HTTP exit with GraphQL errors is not complete evidence.
- Preserve `FactStatus` distinctions. Complete-empty means a successfully exhausted native connection. Missing, forbidden, malformed, partial, or truncated observations never become an empty success. Detect repeated/missing cursors rather than looping.
- Preserve full repository identity and deduplicate identical links. Keep exact-target checks, including rejection of genuinely ambiguous associations. Do not union historical `connected` events into the current link set, revive disconnected links, infer closure from PR prose, or promote ordinary cross-references.
- Make the `.mjs` entry point consume the shared reader under the existing Node 24 requirement, preserving its public output contract. Avoid maintaining two independent association parsers.
- Keep evidence revalidation and all pre-write/read-back guards. Fix the observation rather than weakening the exact-one-ticket requirement. Cover every consumer through the existing bundle generator.

### 3. Add bounded, run-local tooling recovery

Extend `skills/review-this/prepare-review.{ts,mjs}` and the skill-owned recovery instructions. Reuse the existing run directory, outcome types, receipts, and interruption records; do not introduce a separate orchestrator or fixer agent.

The recovery sequence is: diagnose complete error output, establish a reproducible operational defect, prepare an isolated installed-bundle copy, apply a minimal correction, run the regression and guard checks, reread live state, then retry only the failed phase.

- Create copies only below `/tmp/kilo/review-this/<runId>/`. Record the trusted install origin and file hashes, operation, observed cause, changed helper files, actual failing/passing receipts, and target/revision bindings. Preserve the record in session context as well as the private files.
- The installed entry point owns preparation, validation, and execution of the corrected copy. Keep executable paths and operations constrained; do not grant blanket execution of scripts from `/tmp`, the PR checkout, or arbitrary caller paths. Reject symlinks, traversal, stale source hashes, changed guard files, and reuse across different targets or revisions.
- Allow corrections to operational readers/adapters without changing authority, evidence-validation, or publication rules. Keep permission checks, side-effect guards, and validators unchanged and verify their bytes before executing a corrected copy. A repair needing altered authorization or proof rules remains outside this automatic path.
- Run the original failing case and relevant negative tests against the correction. Validate corrected facts through the unchanged workflow gates. Test receipts and repair completion must be observed by the helper, not accepted as caller-supplied success flags.
- Diagnose an incorrect observation independently before treating it as a helper defect. An error saying `restricted` is not permission to override a gate; actual authentication, host permission, policy, and target restrictions remain restrictions.
- Track attempts by an observed cause and operation, with a bounded budget that survives interruption. Unchanged failures cannot receive fresh budgets from reworded errors or new run IDs. Distinct, evidenced causes may receive their own correction. Resume completed checks and publication instead of starting the whole review again.
- Keep shared installs and PR source unchanged during reviews. Retain a repair summary and validated patch identity for later maintenance. Do not silently install or download another skill revision.
- When existing rules permit review with blockers, continue and publish the truthful result. Do not mark invalid evidence current to make the workflow proceed. Escalate only after authorized recovery is exhausted or a genuine decision/capability is missing.

### 4. Make bootstrap independent of the presence of a skill API

Keep the wrapper limited to forwarding the exact target, loading installed instructions, and deferring to them. Put the review sequence and recovery decisions in `skills/review-this/SKILL.md` and its references.

- Prefer the `skill` tool. If the host does not provide a skill loader, use permitted file reads of the discovered, trusted installed `SKILL.md` and required references. Load `unslopify` before prose and keep relative resources bound to the selected installation. A missing tool is not a missing skill installation.
- Distinguish absence from denial. A denied skill/read operation, conflicting install provenance, or a host read-only restriction must not trigger a permission bypass or an invented workflow. Do not claim that changing configuration can add tools to an already restricted running session.
- Perform a small capability check before checkout effects. Identify the actual agent, resolved installation, compatible runtime, required tools, private-file writes, and helper invocation path. Use only safe diagnostics; do not dump credentials or full global configuration.
- Add a tracked `.kilo/command/review-this.md` that routes to the primary `review-this` agent, forwards `$ARGUMENTS`, and uses `subtask: false`. Direct agent selection with a number or URL must use the same installed workflow. No duplicated review policy, nested worker, or automatic `/fix-this` invocation.

### 5. Make permissions and installation agree

Keep `.kilo/kilo.jsonc` as the canonical agent definition. Add a small repository-owned synchronization path for the command and generated global agent definition, with explicit destination roots and fixture-home tests. Do not maintain hand-edited competing prompts.

- Permit installed skill loading and its required dependencies, read/search tools, progress and genuine-decision tools, permitted documentation lookup, and read-only session recovery when available. Allow external reads of the discovered skill roots, including `unslopify`, and private run-directory access without repeated prompts.
- Cover every phase's approved operations: native reads, fetch/preparation, JSON input and receipt files, compatible installed Node invocation, locked setup, configured verification, evidence repair, and review publication. Keep side effects behind the bounded helpers. Test argument-bearing and alternate-runtime invocations, not just executable filenames.
- Align `.kilo/kilo.jsonc`, `permissions.test.ts`, and `install-check.mjs` on effective behavior under Kilo's current precedence and tool aliases. Remove the checker's impossible trailing-wildcard rule in favor of positive supported invocations plus negative suffix, chaining, redirection, preload, and untrusted-path cases.
- Ensure actual edit/write/patch tools can create the permitted private JSON files while remaining unable to edit PR source, credentials, shared skills, permission configuration, or Agent Manager state. Avoid contradictory alias rules that hide a needed tool.
- During this authorized maintenance task, synchronize only active Review This configuration and changed workflow bundles. Resolve its redundant global JSON/Markdown definitions without altering other agents, providers, or secrets. Leave inactive backup directories alone. Preserve a rollback copy before replacing active files.
- Extend the read-only install check to compare canonical/generated configuration and resolved roots. Validate actual tool visibility in the installed Kilo runtime in both this repository and an isolated consumer checkout. Consult the installed diagnostic help instead of guessing CLI flags. Static permission-map tests alone do not satisfy completion.

### 6. Record the changed boundary and regenerate bundles

Record the approved run-local repair decision in the next available ADR, narrowing review-this INV-12/INV-14 and the installed-only execution boundary of ADR-0039. Preserve historical ADR text. Keep PR source fixes, delivery, permission edits, and self-authorized approvals outside review.

Update only affected durable claims in the review leaf, `SKILL.md`, `INSTALL.md`, the architecture index, and glossary. Update `scripts/workflow-recovery.md` only for shared bootstrap/cause-tracking language; other roles do not inherit review-specific repair authority. Run `scripts/generate-workflow-state.ts` for all four bundles, review affected claims, and refresh their documentation fingerprints. Do not create `REVIEW.md`.

## Acceptance and validation

Use the existing test framework. Add coverage for:

- Native links without timeline events; complete-empty; removed links; duplicate links; multiple targets; repository collisions; multiple pages; GraphQL partial errors; forbidden reads; truncated JSON and cursor failures. Exercise both the shared reader and shipped executable.
- Skill-tool present, skill-tool absent with authorized file-read loading, explicit skill denial with no bypass, wrong command routing, overlapping config precedence, alternate runtime, and actual private-file creation. All required ordinary review actions must be allowed without intervention; forbidden effects must remain denied.
- Successful isolated repair, failed regression, changed immutable guards, malicious paths, stale hashes/pins, lost repair files, interruption and retry-budget retention, and two concurrent runs with no shared changes.
- A combined fixture run that recovers missing evidence metadata, completes one Standards-plus-Spec review, reconciles a lost publication response, and produces exactly one validated review. Confirm no source, permission, label, ticket-state, or delivery writes and no invented receipts.

Required checks in an implementation-capable session:

```text
node --test tests/github-facts.test.ts
node --test skills/review-this/tests/*.test.ts
node scripts/generate-workflow-state.ts --check
npm run verify
./scripts/docs-check.sh
```

Run the extended install check against each changed active bundle and the effective wrapper/command. Run a non-publishing Kilo bootstrap check with recorded agent/tool provenance. Finish with a read-only installed-helper observation of PR #312 confirming #305 and the currently observed pins. Do not invoke a real review, patch its evidence, or publish to #312/#200 merely as a test.

Planning validation was limited to source/configuration inspection and live read-only GitHub queries. The planning profile denied `./scripts/docs-check.sh`; no test or documentation gate has been reported as passing.

## Completion boundary

Complete only when the regression suites, repository verification, documentation checks, installation parity, and effective-runtime bootstrap checks pass. Report the paths updated, recovery behavior, active installation used, and any unavoidable host/authentication restriction. Do not promise recovery from unavailable credentials, enforced host denials, unsafe data loss, or contradictory authority. No commit, push, PR creation, or review publication is authorized by this maintenance plan.
