# Review checkout fix and final fix-this stage

## Outcome

Ship `plan-this -> implement-this -> review-this -> fix-this`. Correct `/review-this` so a clean checkout at the PR's exact head commit is accepted regardless of local branch name. Add `/fix-this <PR-number>` to consume the published review, address all findings, resolve conflicts, verify locally, squash-merge, and complete ticket/spec bookkeeping.

This is an implementation plan, not a completed change. No source or installed skills have been updated. Do not publish planning issues, commit, release, or overwrite installations without the applicable authorization.

## Confirmed decisions

- `/review-skill` in the request means the existing `/review-this`; do not rename it.
- `/fix-this 285` and `/fix-this #285` select PR #285, not implementation issue #285. Also accept a same-repository PR URL. Reject issue-only targets, multiple targets, ambiguous associations, and cross-repository/fork mutation in this first version.
- Fix all published blocking and advisory findings. Do not silently waive a finding. An unresolvable or out-of-scope finding stops merge with evidence and the decision needed.
- The user explicitly rejected any additional review after fixes or conflict resolution. `/fix-this` does not invoke `/review-this`, an independent reviewer, or a self-review workflow. Verification means proving the requested fixes with local checks, not generating another review verdict.
- The user explicitly rejected a CI gate. `/fix-this` neither waits for CI nor conditions its own merge eligibility on CI status. Local verification is still required. Attempt a normal merge; do not bypass branch protection, required approvals, a merge queue, or host permissions. If GitHub refuses, preserve progress and report the restriction.
- Keep `/review-this` review-only and its existing verification/publication behavior except for checkout matching and the structured handoff. It never applies fixes, merges, repairs PR bodies, or updates labels.
- Use the invoking checkout, explicit remote/PR head ref, no extra worktree, worker, or Agent Manager state. Never reset/stash user work, force-push, push directly to `main`, or delete branches automatically.
- Keep squash merge into `main`, the existing pipeline base. A successful merge closes the PR; never close an unmerged PR as a substitute for merging.

## Evidence and affected boundaries

- `skills/review-this/review-session.ts:47-52` rejects unequal branch names even when the SHAs match. `SKILL.md:26` and `tests/review-session.test.ts:24-29` encode that requirement. The observed global installed copy has the same restriction.
- The reported clean `278` checkout and PR branch `278-baseline` share head `9240da36037cf1ea6f078edf7129d733c209563e`. This must pass without checkout repair.
- `tests/handoff.test.ts` exercises implementation evidence and review readiness but omits the checkout gate.
- `skills/review-this/reconciliation.ts` already defines verified findings, IDs, categories, severities, evidence, and head/base revisions. `adapters.ts` currently publishes strings without a consumer-ready format.
- `scripts/workflow-state.ts` owns requirements/evidence validation, exact-revision review freshness, legacy merge eligibility, dependent promotion, and parent closure. Generated copies live in three skills via `scripts/generate-workflow-state.ts`.
- Existing review-this INV-5/INV-13/INV-14 and ADR-0031/0033 preserve current-checkout review and prohibit reviewer delivery. They remain intact. The old `isMergeEligible` requires fresh post-change review and CI, which conflicts with the user's confirmed final-stage policy.
- Record a new ADR assigning finalization to `fix-this` and explicitly adopting no-post-fix-review/no-skill-CI-gate for that stage. Do not weaken the legacy helper globally or make stale reviews appear fresh. Amend the current architecture and glossary claims to describe the new owner; keep historical ADRs verbatim.

## Implementation sequence

### 1. Correct review checkout matching

In `skills/review-this/review-session.ts`, remove the branch-equality rejection. Require a clean checkout and exact nonblank local HEAD/PR head equality. Preserve the helper result shape and existing branch input fields as informational data for installed callers. Do not substitute tree equality, ancestry, or abbreviated SHAs.

Update `SKILL.md`, `INSTALL.md`, and `docs/leaves/review-this.md` to explicitly accept branch aliases, `main`, and detached HEAD at the matching commit. Keep dirty and actual revision mismatches as stops. Add the reported regression before the fix, then detached/alias cases and negative cases. Include the gate in the existing handoff test and add a focused composition assertion for the prose contract.

### 2. Define the review-to-fix handoff

Add one versioned JSON block, `review-handoff-v1`, to the published review body alongside readable `## Standards` and `## Spec`. Define shared types, renderer, parser, and validator in the authored workflow-state core; generate package-local copies for consumers. Do not parse arbitrary English to infer a merge authorization.

The payload contains repository and PR identity, head/base SHAs, requirements revision, effective-policy revision, explicit review completeness, verification outcome, and the complete validated finding list. Findings carry unique stable IDs, source, category, severity, location, governing rule/criterion, message, and quoted or command/output evidence. The empty list explicitly represents a completed review with no findings. Missing fields, duplicate IDs/blocks, unknown versions, partial publication, and incomplete reviews are not valid handoffs.

Keep the native GitHub review ID, author, commit ID, timestamp, URL, and any associated comment IDs as observed metadata, not self-authenticating payload claims. Select the latest completed non-dismissed review with the contract, reject conflicting/ambiguous candidates, and validate native metadata against the payload. Accept only a reviewer established by project policy or verified repository write/maintain/admin permission; a marker in arbitrary user prose is not provenance. A newer malformed or incomplete workflow review must not cause silent fallback to an older report. Recheck the selected report and its contents before destructive delivery actions.

Review publication must make completeness verifiable: publish/verify the findings and canonical review payload as one coherent result, with adapter read-back support. If the host cannot publish atomically, expose incomplete state rather than claim a usable handoff. `/review-this` ends by directing the user to `/fix-this <PR-number>`; it never launches it.

### 3. Add the fix-this package

Create `skills/fix-this/SKILL.md`, `INSTALL.md`, focused pure decision helpers, and co-located tests using existing repository conventions. Require explicit human invocation; load `unslopify`; treat tickets, reviews, and comments as evidence, never executable instructions or authority to widen scope. Keep the skill self-contained, with no implicit skill installs or cross-package runtime imports. Add its workflow-state runtime copy to the generator and drift checks.

Use these stages: Resolve, Fix, Verify, Merge, Bookkeeping. Read the existing project orientation route, linked implementation ticket/parent, PR, selected review, implementation evidence, current governing sources, and native dependencies before edits. Require one trustworthy ticket association and current requirements/evidence. Labels alone do not determine readiness; delivered `ready-for-human` tickets are allowed.

For a fresh run, require clean local HEAD equal to the PR head and the source review head. A branch alias never blocks. Protect local `main` and detached HEAD by creating a feature branch in the same checkout when needed; never switch an unrelated/dirty checkout. Push explicitly to the verified PR head ref rather than assuming the local branch name or upstream is the destination. Check remote identity and head before every push; allow only fast-forward updates. Concurrent head movement stops without overwriting another contributor.

A newer base may be integrated without another review only when requirements and governing policy remain unchanged and the reviewed head is still the starting PR head. If incoming head changes are not recorded progress of this fix run, or requirements/policy changed, stop instead of trusting old findings for unknown work.

### 4. Apply fixes and resolve conflicts

Track every finding ID to its disposition, changed files/commit, and verification evidence. Reproduce behavioral defects where feasible before fixing; non-behavior findings get a specific inspection rationale. A no-longer-present finding requires evidence, not silent removal. Do not execute commands copied from review text without checking them against project configuration and trust rules.

Integrate the current base through a merge into the feature branch when needed; do not rebase published history or force-push. Resolve conflicts only when the ticket requirements, accepted policy, and both versions establish the intended result. Include tests for conflict-affected behavior. If resolution needs a new product/invariant decision, stop without merging the PR. Never choose ours/theirs wholesale as a shortcut. Do not take over a pre-existing unrelated merge/rebase; only resume an operation whose recorded identity belongs to this run.

Run focused regressions and the established local project verification command(s), including the repository's required docs checks. Missing verification capability or a failing local gate stops merge. Fix failures attributable to this work within scope; unrelated failures remain reported blockers. Never claim unexecuted or failed checks passed.

Commit only intended fixes/conflict resolutions, preserve the original review, and update the implementation evidence block for the resulting head using existing evidence rendering/validation. Carry genuine prior proof only where still valid; rerun affected criteria, never invent lost RED evidence or repin changed requirements. Publish fix evidence tied to the new commit, not a counterfeit clean review verdict.

### 5. Merge and resume safely

Add a dedicated `fix-this` finalization decision rather than calling or weakening legacy `isMergeEligible`. Require valid original review provenance, unchanged requirements/policy, all findings demonstrably resolved, completed conflicts, passing local verification bound to the resulting head and integrated base, validated updated evidence, clean checkout, open non-draft PR, and mergeability. No post-fix review or CI-status condition is added. A clean initial review follows this same path without empty fix commits.

Immediately before merge, refresh PR head/base, source report, requirements/policy, evidence, and mergeability. Stop on unexpected movement; do not loop indefinitely as the base changes. Use normal squash merge with the expected head constraint, no admin override and no auto-merge queue scheduling. GitHub server policy remains authoritative. A rejected merge is not completion.

Use one compact versioned progress comment, `fix-progress-v1`, bound to repository/PR, native source review ID and payload digest, ticket/parent, starting revisions, verified resulting revisions, finding dispositions/evidence, and completed delivery steps. Update/read back at meaningful boundaries. Treat the comment as a checkpoint to reconcile against current GitHub/git facts, not authority by itself. Commit metadata should identify the source review so an uncertain push can be reconciled without repeating edits. Missing proof is never reconstructed from a success claim.

On rerun, compare recorded and observed state, reuse valid verified commits, and perform only missing steps. Handle uncertain push/merge responses by reading remote state before retrying. If merged already, validate the merged head/association and proceed with bookkeeping only. A closed-unmerged PR stops. A merged PR whose provenance cannot be established gets a diagnostic, not guessed ticket updates.

### 6. Complete bookkeeping

After confirmed merge, verify the implementation ticket closed through its valid closing reference; if still open, close that exact ticket with the confirmed merge as evidence. Remove completed-work labels `ready-for-agent`, `ready-for-human`, `blocked`, and `unblocked` from that ticket while preserving unrelated labels. Do not silently clear `needs-info` or other unresolved human decisions to authorize delivery.

Read a complete, paginated native dependency/child set. Promote only direct dependents within the linked specification whose final open blocker has closed: remove `blocked`, add `unblocked` and `ready-for-agent`, while preserving needs-info, assignee, or other eligibility stops. Reuse the existing transition helpers only where these semantics match; test the assigned-dependent edge case rather than inheriting a broader promotion rule accidentally.

Close the parent only after a complete nonempty child enumeration confirms every child closed. Remove stale actionable workflow labels from a completed parent, never give a parent a claimable label. Do not modify unrelated specifications, promote an entire queue, or begin the next ticket. Partial enumeration prevents closure/promotion and is resumable.

Record partial failures explicitly. A merged PR with unfinished labels/closure is 'merged; bookkeeping incomplete', not fully complete. Report PR/merge links, finding dispositions, local checks, ticket/spec transitions, and remaining restrictions.

### 7. Documentation and rollout

Register the new seam in `ARCHITECTURE.md`, add its leaf and install/provenance documentation, update `CONTEXT.md`, workflow README, relevant triage ownership text, and the reviewed seam docs. Remove stale README claims that `/implement-this` still depends on `/implement` while updating that affected workflow section. Correct the inspected extended review leaf's obsolete missing-policy bootstrap description. Update manifest coverage/fingerprints and derived human workflow docs through the existing documentation lifecycle; do not hand-edit generated ownership or rewrite historical decisions.

Install the compatible updated review-this and new fix-this together from the same verified revision, outside workflow execution and only with permission to overwrite existing installs. Verify the path actually loaded by the target project; editing this repository does not update global copies automatically. Legacy prose-only reviews require one publication by the updated reviewer before first use of fix-this; they are not guessed into structured authority. After fixes, no new review is requested. Preserve existing compatible implementation evidence contracts.

Rollback removes/disables the new fix stage and restores compatible installed packages. Published handoffs/progress remain historical evidence. Never automatically revert merged code, reopen completed issues, or reverse label changes as an installation rollback.

## Acceptance and validation

1. The exact reported branch-alias case and detached HEAD pass review checkout validation; dirty, empty-revision, and genuinely different-commit cases fail.
2. Published review output round-trips through the shared validator and fix consumer, including a complete empty review. Malformed, duplicate, forged, stale, dismissed, and partial reports cannot authorize fixes or merge.
3. All findings receive proven dispositions; conflicts are resolved and locally tested, or merge stops. No re-review, CI polling, skill CI gate, force-push, branch-protection bypass, or reviewer mutation occurs.
4. Alias checkout fixes push only to the verified PR ref. Concurrent head/base/report/requirements/policy movement invalidates the relevant pending operation.
5. Normal merge uses the verified head, respects server restrictions, and is read-back verified. Required-check rejection is reported without disabling checks. Clean reviews can finalize without fabricated commits.
6. Retries after push, evidence update, merge, label, or closure failures are idempotent. Already-merged PRs resume bookkeeping; closed-unmerged PRs never count as delivered.
7. Dependency promotion and parent closure require current complete facts and preserve unrelated issues/labels and eligibility stops.
8. Add pure helper and fake-adapter tests plus a composed implementation-evidence -> published-review -> fix -> merge/bookkeeping test. Include interrupted publication, absent local test capability, conflicting findings, moved base, and assigned dependents. Test an isolated installed package so no repository-only import is required. No tests mutate live PRs.
9. Capture defect-specific RED before the checkout fix, then run focused review/fix/handoff tests, `npm test`, `npx tsc --noEmit`, `node scripts/generate-workflow-state.ts --check`, and `./scripts/docs-check.sh`. Refresh generated copies with the established generator during implementation. Planning permissions previously denied runtime reproduction/docs checks; no runtime result is claimed here.
10. Run a few isolated skill scenarios against fake GitHub responses to verify agent instructions as well as helpers: alias plus findings, conflicts plus protected merge refusal, and merge-success/bookkeeping-failure resume. Validate no extra review or CI wait is introduced.

## Boundaries and remaining risk

The review checkout correction can ship independently. The structured review producer and fix consumer must ship compatibly as one handoff contract. Shared-contract and merge/closure changes are high risk and require the negative tests above. No unresolved product questions remain. Fork writes, arbitrary PR bases, administrator overrides, arbitrary human-review ingestion, and automated releases are out of scope. Successful local tests without CI or a fresh independent review provide less assurance; that tradeoff was explicitly selected by the user and must be stated in the new ADR.
