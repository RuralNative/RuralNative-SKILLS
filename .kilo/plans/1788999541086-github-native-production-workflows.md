# GitHub-native production workflows

## Goal and scope

Make `plan-this`, `implement-this`, `review-this`, and `fix-this` use GitHub's native operations and observed records as their authority. Repair the remaining publication and recovery defects without building another workflow engine.

This is a plan, not completed implementation. The user approved this one temporary `.kilo/plans` file because the client denied an external temporary location. Keep it out of commits. Publish the approved durable plan in the issue tracker when writes are authorized, following `AGENTS.md`.

## Baseline and findings

The checkout was clean at `f3aa615d408613a786347ce7f531bc7323efa297`. The invalid events reported in `/tmp/kilo/handoff-295-20260909.md` were already corrected in commit `0ea8bf4`. Current code creates pending reviews without `event` and submits through `POST .../reviews/{id}/events`. Preserve those fixes and their existing transport tests.

The installed `/home/ruralnative/.kilocode/skills/review-this/gh-review-transport.ts` also has the corrected events but differs from the checkout. Full installation parity was not verified because the command was denied.

Read-only GitHub checks on 2026-09-10 confirmed incident PR #295 is still open at head `ca77a40823c48ddfbaee537255bbbf54446cc917`, base `363fe3b0a00ffed6af4e30b6fcec26386eb84cd0`, with zero native reviews. Native `closingIssuesReferences` links issue #288. Re-fetch these facts before any future recovery.

| Remaining gap | Source evidence |
| --- | --- |
| Review/comment reads omit pagination; failed comment reads become an empty list | `skills/review-this/gh-review-transport.ts:121-191` |
| The claimed reviewer permission is reused as the supposedly observed permission | `skills/review-this/publish-review.ts:183-199` |
| Pending-review adoption/resumption accepts commit equality without proving publication ownership | `publish-review.ts:154-164,227-263,278-342`; the effectful wrapper does not call the stronger `decidePublicationResume` checks |
| The transport cannot create the native inline comments promised by the skill | `ReviewPublicationTransport.createPendingReview` accepts only PR/commit; `gh-review-transport.ts:73-84` sends no comments |
| Decisions lack mechanical evidence that caller-supplied native relationship collections are complete | `scripts/workflow-state.ts:22-29,905-930`; `skills/plan-this/SKILL.md:53-57`; review/fix adapter interfaces |
| Local closing-keyword parsing can disagree with GitHub, including repository identity and syntax | `scripts/workflow-state.ts:1721-1805` |
| A successful remote push can be rejected because its progress flag was not saved | `skills/fix-this/fix-session.ts:71-97,146-168` |
| Bookkeeping depends on a custom checkpoint even after GitHub confirms merge; checkpoint author must equal reviewer | `skills/fix-this/fix-session.ts:173-253` |
| Delivery hard-codes `main` | `skills/implement-this/command-session.ts:46-56,148-150`; fix-this INV-14 |

These are source-inspection findings. Executable regression tests were not run during planning. `./scripts/docs-check.sh` was attempted and denied, not passed.

## Approved decisions

1. Use native `COMMENT` reviews by default. Blocking findings remain explicit, mandatory fix input. Never choose `APPROVE` or `REQUEST_CHANGES` automatically from finding counts. Non-default events require explicit human intent and GitHub eligibility; never retry rejection as another event. Continue reading existing approved/change-requested reviews. Required independent approvals remain GitHub's responsibility.
2. Read and pin the repository's configured default branch. Use it for new delivery and finalization; stop on a mid-run change or an incompatible existing PR. Never retarget silently.
3. Authorize reviewer, fixer, and checkpoint writer independently. A verified collaborator may fix another person's review. Preserve the original review; validate GitHub permission or narrowly scoped, source-backed project authorization.
4. A confirmed native merge permits bookkeeping-only recovery without a current checkpoint. Verify exact PR/issue associations and remaining operations. Never invent missing test receipts, repeat a merge, or claim an externally merged PR passed this workflow.

Retain explicit human stage invocation, single-target/current-checkout execution, mandatory local fix verification, and the existing no-force-push, no-admin-override, no-CI-polling, no-auto-merge, and no-automatic-next-stage boundaries.

## Authority and data flow

| Information | Authority |
| --- | --- |
| Repository, default branch, PR refs/revisions | GitHub records checked against the selected Git remote |
| Parent/children and blockers | Complete native parent, sub-issue, `blocked_by`, and `blocking` reads |
| PR-to-ticket association | Native closing references with full repository identity |
| Review ID, author, permission, state/time, comments, thread resolution | Independently fetched GitHub metadata |
| Merge completion | Native merged state and merge commit, never CLI exit status, closure alone, or a checkpoint flag |
| Requirements and policy | Live issue bodies and pinned governing sources, using existing revision validators |
| Acceptance proof, local test receipts, finding dispositions | Validated workflow-owned evidence published on GitHub and bound to revisions |

Each stage reads current native facts, computes its permitted next operation, performs that operation, and reads back before recording success. A timeout triggers reconciliation, not blind replay. Scratch files and chat must not be required to resume completed remote work. Native state cannot prove a local test ran, and a custom receipt cannot override native identity or merge state.

## Implementation sequence

### 1. Record decisions and add failing regressions

- Publish the approved scope in the tracker. Record one new ADR before changing conflicting contracts; leave historical ADRs intact.
- Narrow review-this INV-9/INV-14 for owned pending-review recovery and independent provenance; implement-this INV-5/INV-16 and fix-this INV-14 for the default branch; fix-this INV-2/INV-5/INV-15 for native-state recovery and independent fixer authority. Update other affected claims without weakening proof or stage boundaries.
- Preserve existing corrected-event tests. Add failing tests for the remaining gaps first, especially page-two discovery, unknown comments, payload-supplied permission, unrelated pending drafts, and a successful push with a stale checkpoint flag. Do not reintroduce invalid events to manufacture RED.

### 2. Share a small native-read implementation

- Reuse the injectable `gh` runner. Add only the shared reads needed by these stages in an authored `scripts/github-facts.ts` with a narrow read-only `github-facts.mjs` entry point. Extend the existing generator to distribute them into the four self-contained bundles. Keep `workflow-state.ts` pure and `workflow-cli.mjs` a read-only validator.
- Provide operation-scoped repository, issue, PR, review, and review-thread observations, not a whole-repository snapshot. Fetch native relationships, full repository identity, current actor/permissions, bodies, and relevant revisions. The production path must execute these reads rather than accept an agent-supplied `observed: true` or permission string.
- Use explicit repository/host selection. Support remains github.com; reject unsupported hosts rather than accidentally using `GH_HOST` for another server. No new Enterprise or GitHub App integration is included.
- For REST lists use `gh api --paginate --slurp`, then parse and flatten pages in code. Do not combine `--slurp` with `--jq`; installed `gh 2.98.0` rejects that combination. GraphQL connections require cursor/pageInfo handling, including nested connections. Aggregated `gh pr view` output is not proof of exhaustive review/comment discovery.
- Distinguish complete-empty from unavailable, forbidden, malformed, truncated, or partial data. Unknown dependencies/comments/permissions never become zero, empty, or allowed. Auth failures, rate limits, and ordinary 404s do not establish unsupported native features.
- Keep direct native CLI issue/PR/label writes where sufficient. Do not add a general publisher, SDK, retry framework, scheduler, database, or custom pagination engine. Deduplicate the two `ReviewPublicationTransport` declarations rather than maintaining parallel interfaces.

### 3. Complete native review publication

- Preserve pending creation without an event, submission of the same review through the native events endpoint, and submitted-state read-back. Keep event values distinct from returned states.
- Validate input and fresh target before creation. Before submission/resume, recheck head/base, requirements, policy/owner decisions, authenticated actor, and review ownership. Fetch permission independently; neither the handoff's permission nor `author_association` is authorization. For legacy reports, a claimed historical role cannot override current authorization, and movement between still-authorized roles alone should not invalidate the review content.
- Create validated, diff-anchorable findings as native comments in the pending review using GitHub's `comments` payload with `path`, `line`, `side`, and optional range fields. Derive anchors from the pinned diff. Keep command failures and other non-inline findings in the summary without invented anchors.
- Obtain real review/comment identities before rendering the final existing handoff. Correlate comments with stable finding IDs and require complete read-back coverage. Failed comment reads must prevent publication success.
- Store a small deterministic publication-content marker in the pending review body. GitHub provides no review-create idempotency key; this marker identifies the intended draft after a lost response, not workflow state. Match target, actor, pins, and content before adoption. Never overwrite a person's unrelated pending review at the same commit.
- Discover and reuse an exact completed workflow review before creating another. Reconcile uncertain creation/submission once and resume only the same verified pending review within the existing bound. Ambiguity, edited content, dismissal, denial, invalid requests, or moved pins stop without another review or repeated Standards/Spec pass.
- Wire the same checks through both `publish-review.mjs` and `prepare-review.mjs publish-review`. Preserve valid `review-handoff-v1` consumption. Unmarked legacy pending drafts are diagnostic-only unless ownership can be independently established.

### 4. Use native relationships in planning and implementation

- `plan-this`: retain native issue/sub-issue creation and dependency edges using numeric database IDs. Publish without claimable labels; validate read-back bodies and the complete native graph before readiness. Reconcile uncertain writes to exactly one identified matching issue; ambiguity stops instead of creating another.
- Limit legacy `Part of`/`Blocked by` fallback to an explicitly established unsupported-capability path. An empty native graph remains authoritative. Stale text and API failures never replace native relationships.
- `implement-this`: discover/reuse the verified PR through native closing links, repository identity, and head refs. Keep single-ticket and eligibility protections. Thread the observed default branch through checkout decisions, creation, repair, and delivery validation.
- Keep `Closes #<ticket>` generation as presentation for new PRs, not association authority. Validate actual GitHub links, including repository-qualified references and additional/conflicting linked issues. Do not rewrite valid published associations for formatting alone.
- Keep labels/assignees in GitHub. Blocker labels are derived conveniences, not replacements for live edges. Preserve human stops and unrelated labels; add no ownership locks or background synchronization.

### 5. Reconcile finalization with GitHub

- Select workflow reviews from complete native results. Never fall back past a newer malformed workflow review. Ordinary human review activity does not erase a workflow report; native dismissal and branch restrictions remain authoritative.
- Replace checkpoint-author-equals-reviewer with independent observed authorization. Bind the checkpoint to its native comment ID, target, validated source-review digest, result revisions, dispositions, and receipts. Preserve original authorship when another authorized actor resumes.
- For open PRs, validate the source review on its original revisions and the fix result separately. If a recorded intended push succeeded and GitHub shows exactly the verified result, recognize success despite a stale progress flag. Skip verified no-ops; unexplained movement or missing proof still stops.
- Use existing native review threads for inline finding dispositions. Resolve only matching, verified findings when GitHub permits it, using actual thread node IDs, not comment IDs. Thread resolution never substitutes for code verification. Summary-only findings retain proof in the compact checkpoint.
- Implement the real `FixPublishAdapter` native operations in a small `skills/fix-this/gh-fix-transport.ts` and bounded publication entry point, following the existing review transport pattern. Normal merge uses REST `PUT .../pulls/{n}/merge` with verified `sha` and `merge_method: squash`. This avoids `gh pr merge` implicitly entering a merge queue or scheduling auto-merge. No admin, auto-merge, or queue-management behavior is added.
- Re-read native PR state/merge commit after an uncertain response. A confirmed merged PR enters bookkeeping only, even without a current checkpoint. Preserve contradictory records for diagnosis rather than using them to authorize more code changes. Unknown mergeability does not authorize a merge.
- Verify native closing links and closure state before bookkeeping. Close only the exact still-open implementation issue after confirmed merge under existing policy, then reconcile label deltas, direct dependents, and the complete nonempty child set. Inspect native history before treating an open issue as missed automatic closure; an intentionally reopened issue needs a decision. Stop the affected operation on ambiguity, incomplete reads, or unresolved human stops. Report partial bookkeeping separately from merge success.

### 6. Update documentation and distribution together

- Update the four `SKILL.md`/`INSTALL.md` files, their leaf docs, `REVIEW.md`, and relevant glossary definitions. Correct claims that metadata is independently observed when code currently copies it from input.
- Regenerate shared runtime files with `scripts/generate-workflow-state.ts` and extend drift coverage. Preserve evidence/requirements serialization and valid published records. If an incompatible extension proves necessary, introduce an explicit versioned reader/writer rather than silently changing the existing format.
- Update only necessary `.kilo/` permission routes for narrow installed helpers. Keep arbitrary endpoints and cross-stage writes denied. Create no new config under `.kilocode/` or `.opencode/`; do not change active global configuration silently.
- Extend installation checks to all four complete bundles and their runtime routing from one tested revision. Identify actual installation paths before any update. Installation remains a separately authorized procedure outside production workflow execution, not a new auto-updater.
- Refresh affected doc fingerprints and derived human docs through the existing lifecycle. Keep audit/work evidence in the tracker. Leave legacy merge/fix-round APIs out of active paths; removing their compatibility support is not part of this repair.

## Validation and acceptance

Use the existing Node test runner, recorded native response fixtures, and a fake `gh` executable. Derive request-contract assertions from the official GitHub schema, not internal event names shared by the implementation and its fake. Exercise real entry-point argument/payload construction and parsing, not just a fake implementation of an abstract transport. Default tests make no live writes.

Required coverage:

- Pending/submission endpoints, omitted creation event, event/state mapping, explicit non-default-event gating, and same-account `COMMENT` publication.
- Inline publication/read-back, summary-only failures, invalid anchors, wrong authors, unobserved permissions, denied actors, and comment-read failures.
- Multiple pages of reviews/comments/dependencies/children, GraphQL connection completeness, malformed responses, partial failures, and the actual CLI pagination shape.
- Lost create/submit responses, unrelated pending drafts at the same commit, duplicate candidates, exact submitted-review reuse, dismissals, body changes, and pin movement between reads.
- Native links overriding stale text, repository-number collisions, a non-`main` default branch, default-branch movement, and explicit unsupported-capability handling.
- Different authorized fixer, unauthorized checkpoint writer, tampered digest/dispositions, legitimate fix pushes, and successful remote operations with stale progress flags.
- Merged bookkeeping without a checkpoint, closed-unmerged refusal, intentionally reopened tickets, incomplete child reads, denied thread resolution, protected/queue-required merge rejection, and no empty fix commit for a clean review.
- A recorded-host four-stage scenario that publishes approved issues, delivers a PR, publishes a native review, and resumes finalization from GitHub artifacts after local scratch state is discarded.
- Mixed/stale bundle detection and isolated ESM/CommonJS target execution on Node 24+, without downloads or broadened permissions.

Run focused changed suites, then `npm test`, `npx tsc --noEmit`, `node scripts/generate-workflow-state.ts --check`, and `./scripts/docs-check.sh`. Finish with the established `npm run verify` in an implementation-capable environment. Failed or denied checks remain explicit work items.

## Rollout and limits

- Upgrade all four bundles from one verified revision. Retain backward reading of valid published evidence/reviews, and discover fresh GitHub state before resuming.
- A live canary requires explicit authorization for a named test repository/PR. Report local contract tests separately from live validation.
- Publishing, fixing, or merging incident PR #295 requires a separate invocation. Its historical ten findings and unrelated lint blocker are evidence, not current authorization or a fresh verdict.
- No new Actions service, persistent orchestrator, worktree manager, alternate tracker, database, general SDK, automatic approval loop, automatic release, or Enterprise rollout.
- Implementation requires an implementation-capable agent. Planning changed only this approved temporary plan file, not source, installations, repository policy, or GitHub content.

## Primary API references

- Reviews and batched comments: https://docs.github.com/en/rest/pulls/reviews
- Normal merge endpoint and expected-head constraint: https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request
- Dependencies: https://docs.github.com/en/rest/issues/issue-dependencies
- Parent/sub-issues: https://docs.github.com/en/rest/issues/sub-issues
- Closing links/default branch: https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue
- Review restrictions: https://github.com/github/docs/blob/3a6ec97402d27f2d33d7a930378874de8c2762c6/data/reusables/repositories/request-changes-tips.md
- CLI input/pagination: https://cli.github.com/manual/gh_api
- CLI merge/queue behavior: https://cli.github.com/manual/gh_pr_merge
- Read-only GitHub GraphQL schema inspection confirmed `ResolveReviewThreadInput.threadId: ID!`, with optional `clientMutationId` and `resolutionReason`. Verify mutation/viewer permissions against the current schema when implementing; these fields provide no assumed idempotency guarantee.
