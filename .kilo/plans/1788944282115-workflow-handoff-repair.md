# Repair the four workflow handoffs

Status: implementation-ready. Both audits are complete and the material design decisions are approved. Source changes require an implementation-capable agent.

## Goal and limits

Make `/plan-this` → `/implement-this` → `/review-this` → `/fix-this` exchange artifacts accepted by the next stage. Repair and test the contracts, then recover PR #294 without reviewing or merging it. Machine checks establish artifact validity against observed facts; they cannot guarantee that an agent never skips a step or supplies inaccurate facts.

Keep four explicit human entry points and single-target execution in the current checkout. No coordinator, worker, worktree, implicit skill installation, second review pass, CI polling, force push, protection bypass, or changes to unrelated requirements. Review never repairs the PR body. Finalization remains owned by `/fix-this`.

## Decisions approved during planning

- `/implement-this` owns verified recovery of an existing matching PR. It may replace incompatible metadata only after resolving complete requirements and revalidating real evidence. Preserve the PR, historical proof, and human prose; stop for changed scope, conflicting requirements, or unavailable proof.
- Include recovery of `RuralNative/eScraper-Business-Brokers-for-Seacher-Insights#294` in that repository's own checkout after the skill fixes pass. Stop when it is ready for `/review-this`. Do not publish a review, merge, change application requirements, or perform production/provider work.
- `/fix-this` may resume its own verified work through a checkpoint. Fresh-run reviewed-head equality does not apply to an explained result. Unexplained movement, untrusted progress, changed requirements/policy, and missing proof still stop. Confirmed merged PRs resume only bookkeeping.
- Review publication may create one pending native review, complete its handoff using GitHub's returned identity, submit it, and read it back. These operations are one publication step, not a fix/review loop. Incomplete publication never authorizes finalization.
- Each stage must execute a bundled validator command. Node 24+ is an explicit prerequisite. No target-repository dependencies or automatic downloads are allowed; missing capability produces a named stop diagnostic, never simulated validation.

## Evidence and affected contracts

- Shared authored core: `scripts/workflow-state.ts`, generated into the four skill packages by `scripts/generate-workflow-state.ts`.
- `resolveRequirementsBody` rejects the coexistence of `Solution` and `Settled decisions` before evaluating the rest of the requirements. `requirementsRevision` ignores unsuccessful resolution and can still emit a pin.
- `/plan-this` lacks shipped canonical templates and published-body read-back checks. The delegated `/to-spec` and `/to-tickets` default templates omit required sections or criterion IDs. This is a producer-contract gap, not proof that those publishers edited the incident's requirements after implementation.
- Incident parent #287 contains both headings, detailed inherited contracts, and twelve explicit criteria under `Project-level acceptance criteria`. Ticket #288 has nine checkbox criteria plus inline risk, seam, and verification fields. The current regression fixture omits the actual parent shape.
- PR #294 predates `bdd3402`, which changed checkbox parsing and adapted fingerprint selection. Parent #287's observed creation/update timestamps were equal, and installed core copies matched source. The old pin's preimage remains unverified. Pin inequality alone does not prove a requirements edit.
- The review publisher cannot capture/update/read back the native identity required by its own handoff. The fix stage cannot reach its checkpoint after its own push, rejects merged targets before bookkeeping, lacks a packaged evidence renderer, and loses checkpoint version, dispositions, and completed steps when parsing.
- Owning docs: `docs/leaves/{plan-this,implement-this,review-this,fix-this}.md`; ADR-0034, ADR-0035, ADR-0036, ADR-0037; `CONTEXT.md`; affected `SKILL.md` and `INSTALL.md` files. Historical ADRs remain unchanged.

## Implementation sequence

### 1. Record the decisions and reproduce the failures

- Before changing numbered invariants, record the approved trade-offs in one append-only ADR. Narrow the planning/implementation contract, review publication boundary, and fix fresh/resume rules; preserve historical ADRs.
- Add minimal sanitized, source-attributed fixtures matching #287/#288's structure and PR evidence. Preserve both settlement headings, twelve parent criteria, nine ticket checkbox records, inherited contracts, inline fields, and trailing metadata.
- Record failing tests for invalid-body pinning, actual-template intake, publication read-back, native review identity, and restart after push/merge. Compute the old pin with historical code only as a diagnostic; an incomplete old fingerprint never proves coverage.
- Freeze valid `requirements-v1`, `requirements-adapted-v1`, `evidence-v2`, and `review-handoff-v1` fixtures. Preserve their existing serialization. Adopt `fix-progress-v2` for the new verified-recovery receipts; legacy progress is diagnostic input, not permission to skip work.

### 2. Make requirements resolution the only route to a usable pin

- Keep strict canonical publication validation. For consumption, treat an overview plus detailed settled decisions as an adapted body, retaining both in whole-body hashing rather than choosing one or calling coexistence a contradiction.
- Resolve explicit parent `Project-level acceptance criteria` and ticket acceptance records without manufacturing IDs. Preserve issue-scoped identity: `#287:AC-1` and `#288:AC-1` are different obligations. Retain inherited parent contracts without requiring one ticket to finish its siblings' scope.
- Continue to reject missing/duplicate IDs, ambiguous record boundaries, duplicate acceptance sections, malformed evidence markers, and genuinely unresolved requirements. Mechanical parsing establishes structure, not semantic agreement; conflicting product instructions still require a human decision.
- Make `requirementsRevision` throw a typed resolution error containing role-specific diagnostics before hashing invalid input. Update every caller and CLI boundary; no default, partial-body, or agent-computed replacement pin.
- Distinguish resolution failure, missing/malformed/unsupported pin, incompatible contract, and revision mismatch with unproven cause. Only proven content changes are described as changed requirements. Diagnostics name the owning repair command and preserve each stage's write restrictions.

### 3. Ship executable, self-contained checks

- Keep `scripts/workflow-state.ts` pure and import-free. Author `scripts/workflow-cli.mjs` and generate it into all four packages. It supplies standard-library SHA-256 and validates versioned JSON inputs for `planning`, `requirements`, `evidence`, `review`, and `fix-progress` operations. Return JSON results and diagnostics; use exit 0 for valid input, 1 for contract rejection, 2 for input/runtime failure.
- Check Node 24+ before dynamically importing TypeScript. Declare the runtime in root/skill package metadata and align existing CI where needed. Ship dependency-free ESM metadata so execution works inside a CommonJS target too. No target `node_modules`, sibling imports, downloads, arbitrary evaluation, or execution of issue/review text.
- Accept full raw bodies and separately observed native facts. Compute revisions, active-criterion coverage, and validity internally. Verification claims require recorded command/output/exit status checked against project configuration, not caller-supplied success labels alone.
- Require the actual bundled command before writes and again over published read-back artifacts. Document exact invocation and schema examples in each skill; extend generated-copy drift checks to all shipped runtime files.

### 4. Repair planning and implementation producer gates

- Ship literal canonical parent/ticket templates in `skills/plan-this/reference/canonical-bodies.md`. Both include affected seams, checkbox criteria, structural constraints, blockers, risk, and exactly one verification section. Parent decisions belong under `## Solution`; ticket decisions under `## Settled decisions`. Use `None` only for genuinely empty fields. Keep all new requirement-bearing content in fingerprinted sections.
- Give `/to-spec` and `/to-tickets` the approved bodies and publication rules explicitly, overriding their default templates and labels without modifying those external skills. Validate before approval. Publish initially without claimable labels, then read back the actual bodies, native parent links, and complete blocker graph. Run canonical and consumer checks before applying ready/blocked labels or claiming completion.
- Reuse identified issues after uncertain publication; do not create duplicates. A read-back mismatch stops readiness and reports the partial state. Never rewrite published issues for formatting alone. Intentional changes affecting an open implementation PR require explicit replanning and evidence invalidation, not silent repinning.
- In `/implement-this`, execute requirements resolution and eligibility before mutation. At delivery, re-read requirements, verify the pushed head, publish one closing reference plus evidence block, then run the review consumer's validator against the read-back PR. Match evidence IDs to the resolved active ticket criteria, not merely the envelope's self-reported count. Only successful read-back permits `ready-for-human`.
- Implement the approved repair branch before ordinary stale-pin rejection. Require one same-repository open PR with the exact ticket association and clean matching checkout; preserve blocker, assignee, and `needs-info` stops. For a known legacy-contract mismatch, revalidate the full current scope and real proof, retaining the old pin and repair reason as provenance. Publish fresh evidence only after successful revalidation. Unknown contracts, actual requirements changes, or missing bug RED evidence stop. Never call a legacy pin proof of historical equivalence.

### 5. Publish one complete, verifiable review

- Extend `skills/review-this/adapters.ts` and add a callable publication procedure: refresh pinned inputs → create pending review at the pinned commit → retrieve native identity/comment IDs → render the final body → submit that same review with the body → read back and validate. Submit the final body with that review; do not add a redundant update.
- Wire this procedure to a review-only `skills/review-this/publish-review.mjs` entry point with an allowlisted `gh` adapter using argument arrays, never shell interpolation. It runs only in the explicit review publication step for the resolved same-repository PR. The shared validator CLI remains read-only. Tests replace the transport and never call live GitHub.
- Validate repository/PR, native ID, author permission, commit, source URL, and comment ownership independently. Missing or forged required provenance stops. Omit the optional native submission timestamp while pending; obtain it from GitHub after submission. If a payload supplies a native timestamp, it must match observation.
- On uncertain responses, read back before retrying; stop if one reconciliation cannot establish the outcome. Resume only an identified review belonging to this publication. Complete paginated selection must not fall back past a conflicting or incomplete workflow report. Pending publication never authorizes fixes. Preserve valid completed `review-handoff-v1` reports; provenance-deficient reports need republication, not silent repair by `/fix-this`.
- Record pending/failed CI truthfully with a non-passing result and an explicit not-run reason where applicable. Update allowed actions and review INV-9/INV-14 to cover this bounded publication step, retaining every existing source/PR-body/merge prohibition.

### 6. Make finalization restartable without treating a fix as a new review

- Move pure evidence render/upsert helpers from `skills/implement-this/acceptance-evidence.ts` into the authored shared core, keeping any compatibility exports local. `/fix-this` must render and validate `evidence-v2` from its own installed bundle.
- Resolve PR state and trustworthy progress before gates requiring an open PR or original head. Fresh entry keeps clean HEAD = PR head = reviewed head. Resume validates the original review on its original revisions, then independently validates the checkpoint's resulting commit, ancestry, unchanged requirements/policy, finding dispositions, and exact local/remote state. Never describe the old review as reviewing new commits. Confirmed merged PRs enter bookkeeping only; closed-unmerged PRs stop.
- Implement strict `fix-progress-v2` render/parse/reconciliation. Preserve target/ticket/parent, source review, versioned canonical handoff digest, started/result head/base, complete dispositions, verification receipts, intended remote operation, completed steps, and confirmed merge receipt. Reject duplicates, unknown versions, missing fields, forged native checkpoint authorship, or digest mismatch. Hash the deterministic rendering of the validated source handoff, not surrounding review prose.
- Update/read back the intended result before push or merge, and observe remote state before marking completion. A prepared-but-unpushed result requires the old remote head and the exact recorded local result. A pushed result requires matching remote/local result. Lost responses cause read-back, not blind retries. Rerun checks when reusable GREEN proof is missing; never invent historical RED.
- Make `isFixEligible` consume validated source-review and resulting-state facts rather than an unchecked status string. Require complete finding coverage, passing local verification, current implementation evidence, clean checkout, and expected head. Changed requirements/policy, a conflicting newer review, external head movement, and unresolved decisions stop.
- Merge base into the feature branch using existing conflict rules; verify the resulting head/base and stop on unexpected movement at final refresh. From detached HEAD or `main`, create a safe feature branch and push with the explicit verified PR refspec. No guessed branch, force push, extra review, or CI polling.
- Update fix INV-2/INV-5/INV-7/INV-11/INV-13/INV-15 and the relevant helpers in `targets.ts`, `fix-session.ts`, and `adapters.ts`. Keep resumable bookkeeping and the exact `merged; bookkeeping incomplete` outcome.

### 7. Prove the composed handoffs and keep docs current

- Extend `tests/{requirements-revision,alternate-template-intake,handoff,review-handoff,workflow-state}.test.ts` and stage tests. Fill the shipped canonical templates, then carry their actual output through implementation evidence, native review publication, fix, and bookkeeping. Host-shaped fakes allocate IDs only on creation and return persisted bodies; hand-crafted downstream success inputs are insufficient.
- Cover adapted incident input; parent/ticket wrong settlement homes at strict publication; duplicate/missing criteria; invalid bodies producing no pin; unsupported versions; changed requirements/policy; altered read-back; forged URL/comment provenance; incomplete newer review; pending CI; detached push; moved head/base; and clean review without an empty fix commit.
- Interrupt before/after push, evidence publication, merge, and bookkeeping, including successful writes followed by lost responses. Assert bounded recovery, no duplicate writes/merges, no skipped proof, and no recovery from untrusted or lossy legacy checkpoints. Exercise actual producer ordering and forbidden-action traces, not just SKILL phrase presence.
- Execute every bundled command from isolated skill copies without repository dependencies, including a foreign CommonJS project and missing/unsupported runtime cases. Verify allowed/forbidden writes at each stage and generated-file parity.
- Update affected leaf docs, stage/install instructions, `CONTEXT.md` terms, and documentation fingerprints with code. Cover plan INV-12/INV-13 in composition tests, correct stale retired-dispatch text in `docs/leaves/ext/plan-this.md`, and fix missing ADR links. Work evidence belongs in the tracker, not new repository audit documents.
- Run focused tests, `node scripts/generate-workflow-state.ts --check`, `npm test`, `npx tsc --noEmit`, and `./scripts/docs-check.sh`; finish with `npm run verify`. Include authored command code and integration tests in typechecking where needed. Any red gate remains a work item or explicit blocker, not a warning.

### 8. Roll out together and recover only PR #294

- Install the four tested bundles together outside workflow execution using the documented local/manual installation route. Verify complete file and contract parity; preserve unrelated installed customizations and stop on conflicts. No automatic commit, push, release, or PR creation in the skills repository is authorized by this plan.
- In the incident repository's own existing checkout, re-read its instructions, target association, parent/ticket bodies, PR head/base, implementation evidence, local status, runtime, and established verification commands. Re-fetch facts rather than trusting planning-time observations.
- Run the fixed checks and classify the old pin. Revalidate all nine ticket criteria and relevant inherited contracts against code and available proof. Run only the project's safe, required focused checks; do not expand this repair to production runtime, real data, paid providers, or unrelated application work.
- If requirements, identity, checkout, or proof cannot be reconciled, stop with the exact blocker. Otherwise update only the existing PR's justified workflow metadata, preserving human content and closing reference, then read back and run the review-readiness validator.
- Report the exact verified head, new contract/pin, observed checks, PR URL, and remaining restrictions. Stop before invoking `/review-this` or `/fix-this` and before any review publication or merge.

## Planning verification limits

Source inspection and read-only GitHub lookups support the findings. Plan mode denied Node execution and `./scripts/docs-check.sh`; runtime tests and historical digest reproduction remain implementation tasks. Only this plan file changed. No open design decisions remain; runtime failures, missing proof, installation conflicts, or changed live PR state are explicit stop conditions.
