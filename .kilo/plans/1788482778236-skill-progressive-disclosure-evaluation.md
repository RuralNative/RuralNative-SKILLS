# Evaluate progressive disclosure for repository skills

## Goal

Determine whether shorter, router-like `SKILL.md` entry files improve this
repository's skills without reducing instruction compliance, safety-gate
reliability, portability, or maintainability. Adopt the pattern only where a
measured branch-specific benefit exceeds its added routing risk.

## Settled verdict

Do not convert every skill to a short table of contents.

The proposal is sound as **selective progressive disclosure**. It is unsound as
a blanket rule. A skill entry should keep the instructions required on every
activation, including branch selection, standing rules, ordering constraints,
approval gates, recovery rules, and completion criteria. Move only substantial
material that is conditional, mutually exclusive, or used as lookup data.

This does not reopen ADR-0004. That decision rejects a catalog-wide parent
router because descriptions already choose skills before activation. This plan
considers only routing inside an activated skill.

## Evidence behind the verdict

### What the platform guarantees

The Agent Skills specification defines three loading levels:

1. `name` and `description` load at startup.
2. The complete `SKILL.md` body loads when the skill activates.
3. Referenced resources load only when read or executed.

Official guidance recommends keeping `SKILL.md` under 500 lines, using direct
one-level references, and testing whether agents follow those references. It
also warns that nested references may be read only partially.

Sources:

- https://agentskills.io/specification
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- https://code.claude.com/docs/en/skills

### What that means here

- Shortening `SKILL.md` changes only activation and execution cost. It does not
  reduce the startup cost of skill descriptions.
- Moving content that every run eventually reads does not materially reduce
  total context. It adds a read operation and another chance to miss a rule.
- The largest benefit occurs when branches are mutually exclusive or a large
  appendix is rarely needed.
- The largest risk occurs when a hidden instruction is needed before the model
  can know that it should load the file containing that instruction.
- Referenced content may not receive the same compaction treatment as the
  original skill body. Each branch therefore needs an explicit reload or resume
  rule if a long-running workflow can cross a compaction boundary.
- More files increase audit, packaging, path-resolution, and drift costs. They
  also make malicious or stale instructions less obvious during a quick review.

## Current repository assessment

Sizes below are raw source measurements. Token counts must be measured in the
target runtimes rather than inferred from bytes.

| Skill | Current shape | Source size | Decision | Reason |
|---|---|---:|---|---|
| `document-for-agents` | Common contract plus four exclusive branches and four references | 381 lines, 24,199 bytes | Conditional candidate | One branch runs per activation, so branch modules can avoid loading three unused workflows. Keep principles, preflight, diagnostics consent, decision gates, and branch selection inline. |
| `document-for-humans` | Common contract plus three short branches and three references | 185 lines, 10,557 bytes | Retain | It already uses progressive disclosure and is small enough that another split would mainly add routing overhead. |
| `plan-this` | Five ordered phases with one task slot | 57 lines, 9,498 bytes | Retain | Nearly every phase is used. The explicit publication gate and delegated-skill order must remain visible together. |
| `implement-this` | One control and worker contract with one ticket slot | 115 lines, 21,833 bytes | Retain | The worker receives the complete template. Splitting it risks losing dispatch, evidence, delivery, requirements-revision, and cleanup gates. |
| `review-this` | One long review lifecycle with one spec slot | 74 lines, 22,608 bytes | Retain | Review authority, revision freshness, merge eligibility, and cleanup rules apply across phases. Total context would not fall if all phases still load. |
| `release-skills` | Ten-step mainline plus large conditional appendices | 582 lines, 20,487 bytes | First pilot | Backfill, multilingual tables, hook/config detail, and long examples are conditional or removable. The ten-step order and release confirmation remain inline. |
| `unslopify` | Session-long standing contract, rewrite rubric, scanner detail | 431 lines, 26,095 bytes | Narrow experiment only | Persistent context makes savings valuable, but hiding the rubric may weaken every later response. Only scanner-specific operational detail is an initially safe candidate. |

## Benefits worth pursuing

1. Lower activated context for ordinary release runs and one-branch
   documentation work.
2. Better attention on the current branch, with fewer unrelated instructions
   competing for the model's attention.
3. Easier maintenance of large lookup tables, examples, schemas, and optional
   modes when each has one clear owner.
4. Better use of scripts for deterministic behavior, where only script output
   enters context.

## Costs and failure modes

1. **Missed pointers.** The model may continue without reading a required
   module, especially when the pointer is vague or appears after the relevant
   decision.
2. **Circular discovery.** A rule cannot be hidden in the same file whose rule
   tells the model when to load it. Trigger conditions stay in the entry file.
3. **Skipped gates.** Approval, trust, safety, publication, merge, and recovery
   rules can be bypassed if they load only after an action begins.
4. **Premature completion.** A short entry can make the visible workflow appear
   complete before later modules load.
5. **Compaction loss.** Long workflows may retain or reattach the entry file but
   lose previously read references. Resume instructions must reconstruct the
   active branch from durable state and reload its module.
6. **Higher latency.** Every useful reference adds a tool call and file read.
   Small files can cost more in latency and attention than they save in tokens.
7. **Fragmentation.** Too many files scatter one concept and increase
   contradictory edits, duplicated rules, broken links, and review burden.
8. **Portability variance.** Skill clients differ in resource discovery,
   permissions, compaction, and whether supporting files are surfaced with the
   skill. The installed directory must remain self-contained.
9. **Weaker audits.** Reviewers may inspect only `SKILL.md` and miss risky code or
   instructions in a referenced file.
10. **False optimization.** Line count is not token count. A 582-line file with
    compact tables may cost less than a dense 100-line workflow.

## Structural rules for any accepted split

1. Keep the entry file as an executable control plane, not a bare contents
   list. It must state the skill's outcome, branch discriminator, common
   contract, exact load point for each module, failure behavior, and final
   completion criteria.
2. Keep every rule needed before branch selection inline.
3. Keep all destructive-action approvals and no-waiver gates inline.
4. Keep the main workflow order inline when every run follows that order.
5. Use direct paths one level below `SKILL.md`. Do not chain one reference
   through another.
6. Give each pointer a checkable condition, for example: read
   `reference/backfill.md` before inspecting historical tags when
   `--backfill-releases` is present.
7. Keep each meaning in one authoritative file. Do not leave summaries that
   restate the moved rules unless the summary is the necessary branch trigger.
8. Prefer deleting no-op examples over moving them.
9. Keep every installed skill self-contained. Do not add runtime downloads or
   cross-skill relative file dependencies.
10. Add a contents list to any reference longer than 100 lines.

## Implementation plan

### 1. Establish an evaluation baseline

- Snapshot the current skill versions outside the repository under
  `/tmp/kilo/skill-disclosure-evals/`.
- Record body lines, bytes, tokenizer-reported input tokens where the runtime
  exposes them, reference reads, tool calls, latency, completion result, and
  guardrail result.
- Build representative cases before changing prose:
  - `release-skills`: ordinary Node release, multilingual changelogs, configured
    hooks, dry run, historical backfill, and lightweight-tag rewrite refusal.
  - `document-for-agents`: Establish, Audit, Maintain, Improve, invariant
    collision, cache gap, and diagnostics-consent paths.
  - `unslopify`: routine live output, explicit rewrite audit, scanner-present,
    scanner-absent, and protected-content cases.
- Run each case against the models and skill clients the repository intends to
  support. Include the current Kilo runtime and one conforming Agent Skills
  client when available.
- Treat approval, scope, trust, preservation, publication, merge, and recovery
  failures as critical. One critical miss rejects the candidate regardless of
  token savings.

### 2. Add mechanical reference validation

- Extend repository tests to parse direct resource paths named by each
  `SKILL.md`.
- Reject missing paths, absolute paths, `../` escapes, and reference chains
  deeper than one level.
- Copy each tested skill to a temporary installed-skill directory and rerun path
  resolution there, proving that references do not rely on the repository root.
- Keep install commands in `INSTALL.md`, not in skill instructions or reference
  modules.

### 3. Pilot `release-skills`

- Keep supported-project detection, options, the ordered ten-step mainline,
  confirmation before commit/tag/publish, no inline multiline release notes,
  no automatic public-tag rewrite, and completion output in `SKILL.md`.
- Move only branch-specific material to direct files under
  `skills/release-skills/reference/`:
  - release hook contract and `.releaserc.yml` schema;
  - multilingual changelog lookup tables and attribution detail;
  - historical release backfill procedure.
- Delete repetitive worked examples that do not change behavior. Retain one
  short example only where an evaluation proves it improves compliance.
- Put each load instruction before the first decision or action that depends on
  the module.
- Update composition tests so they prove both sides of the boundary: common
  gates remain in `SKILL.md`, conditional detail exists once in its module, and
  every module has a reachable trigger.

### 4. Evaluate the pilot against the baseline

- Use matched prompts and clean contexts for old and new variants.
- Check whether the agent reads the correct module and leaves unrelated modules
  unread.
- Compare completion, critical guardrails, non-critical instruction adherence,
  activated input tokens, total tokens, tool calls, and latency.
- Classify the result:
  - high benefit: at least 30 percent median activated-context reduction with no
    completion or guardrail regression;
  - modest benefit: 10 to 29 percent reduction with no regression;
  - reject: less than 10 percent reduction, any critical miss, or repeated
    unnecessary module reads.
- Revert the pilot if it is rejected. Do not rationalize a reliability loss as
  an acceptable token trade.

### 5. Apply the pattern only to proven candidates

- If the release pilot passes, evaluate `document-for-agents` with the same
  method.
- Keep Principles, Boundaries, `unslopify` dependency, Preflight, diagnostics
  consent, tier promotion, decision gate, and branch selection in `SKILL.md`.
- Move Establish, Audit, Maintain, and Improve into direct branch modules only
  if each branch is selected and loaded reliably before branch work starts.
- Add a resume rule that reselects and reloads the active branch after context
  compaction or interruption.
- For `unslopify`, test moving only scanner invocation, output schema, and exit
  detail. Keep scope, protected content, inert input, live output, markers,
  rewrite contract, rubric needed for live behavior, preservation, and
  self-audit inline unless a separate evaluation proves equivalent behavior.
- Leave `document-for-humans`, `plan-this`, `implement-this`, and `review-this`
  structurally unchanged in this rollout.

### 6. Update repository contracts with each accepted change

- Update the affected seam leaf and public install/file descriptions in the
  same change as each skill.
- Add a new ADR only if the repository adopts a general placement rule that
  future skills may assume. Do not rewrite ADR-0004.
- Review affected claims and refresh each touched seam fingerprint in
  `docs/manifest.md`.
- Run the skill-specific tests, installed-copy tests, Agent Skills format
  validation when available, `npm run verify`, and `./scripts/docs-check.sh`.

## Rollout and rollback

- Roll out one skill at a time, beginning with `release-skills`.
- Keep the old version as the fixed A/B baseline outside the repository.
- A candidate that misses a critical gate returns to the inline structure.
- Consumers receive the accepted structure through the normal registry-lane
  update. No runtime migration or compatibility shim is needed because the
  reference files ship inside the skill directory.
- Do not add a catalog router, shared runtime reference directory, or network
  fetch fallback.

## Acceptance criteria

- `AC-1`: The repository keeps its flat shelf and description-based skill
  selection. No parent router skill is added, and ADR-0004 remains authoritative.
- `AC-2`: Every changed `SKILL.md` retains all standing rules, branch triggers,
  destructive-action approvals, no-waiver gates, and completion criteria needed
  before a reference can safely load.
- `AC-3`: Every resource path resolves from the installed skill root, stays one
  level deep, and passes automated missing-path, absolute-path, and path-escape
  checks.
- `AC-4`: In evaluation, every branch loads its required module before the first
  dependent action and leaves unrelated modules unread in ordinary cases.
- `AC-5`: The accepted pilot has zero critical guardrail regressions and no task
  completion regression against the fixed baseline.
- `AC-6`: The accepted pilot reduces median activated instruction context by at
  least 10 percent. A claim of high benefit requires at least 30 percent.
- `AC-7`: Tool-call and latency increases are recorded and included in the
  adoption decision rather than hidden behind token savings.
- `AC-8`: Moved guidance exists in one authoritative location. Tests fail on
  duplication of the moved tables, examples, or procedures.
- `AC-9`: `plan-this`, `implement-this`, and `review-this` keep their fixed
  ordered templates and placeholder boundaries in this rollout.
- `AC-10`: A compaction or resume case reloads the active branch from durable
  state before continuing, or the candidate is rejected for long-running use.
- `AC-11`: Skill-specific tests, installed-copy reference tests, `npm run verify`,
  and `./scripts/docs-check.sh` pass after every accepted skill migration.
- `AC-12`: Documentation and seam fingerprints change with the code, and no
  work notes or evaluation artifacts are committed.

## Non-goals

- Replacing skill descriptions with a central router.
- Splitting files merely to satisfy a line-count target.
- Moving mandatory gates out of the entry file.
- Rewriting the planning, implementation, or review workflow contracts.
- Publishing specifications, tickets, labels, assignees, or blockers as part of
  this planning run.
