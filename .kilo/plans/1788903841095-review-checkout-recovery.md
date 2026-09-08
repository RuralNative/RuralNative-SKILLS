# Automatic checkout recovery for review-this

## Goal and approved decision

Make `/review-this <target>` recover from a clean checkout at the wrong commit and continue reviewing the selected PR in the same invocation. The reported PR #286 scenario must no longer end with instructions to align the checkout manually.

The user approved fetching the verified PR head and checking out its exact commit in detached HEAD, without moving local branches or creating worktrees. Leave the checkout at the reviewed commit for `/fix-this`; do not automatically restore the starting branch. Matching clean checkouts remain untouched, regardless of branch name.

This deliberately narrows review invariant INV-5 and the mismatch restriction recorded in ADR-0035. Review remains publication-only. No fixes, authored source changes, commits, pushes, merges, PR-body edits, labels, or ticket closure are authorized. No change to `/fix-this` checkout policy or shared handoff formats is needed.

## Implementation

1. Record the approved exception in a new ADR through the repository's domain-documentation workflow. Preserve historical ADR text and identify the review-only portions of ADR-0031, ADR-0033, and ADR-0035 that the new decision narrows. Update `docs/leaves/review-this.md`, especially INV-5 and INV-14, to distinguish checkout preparation from source editing. Keep INV-13's no-worktree/no-worker rule intact. Put implementation work records in the issue tracker; this client-required plan is not a repository documentation deliverable.

2. In `skills/review-this/review-session.ts`, retain `checkoutMatchDecision` as the strict final equality check, preserving its shipped `.match` contract. Add a small pure checkout-preparation decision with `proceed`, `align`, and `stop` outcomes. Require trustworthy revisions, clean tracked/index/untracked state, and no merge, rebase, cherry-pick, revert, or other unfinished Git operation. A clean mismatch authorizes alignment, not review. Dirty, missing-revision, and in-progress-operation cases stop. Remove the obsolete diagnostic telling every mismatch to align outside the command. Helpers remain facts-in/decisions-out, with no shell, network, or filesystem execution.

3. Update the Resolve phase of `skills/review-this/SKILL.md` to execute the recovery path after unambiguous target/repository resolution and before Policy/Review. Explain that Git fetch and exact-commit checkout are the only new preparation effects, and qualify the existing blanket ban on repository-file changes accordingly. Resolve/Prepare/Policy/Review/Publish progress must distinguish alignment from a completed review.

4. Define the executable preparation sequence in the skill, using existing host Git/GitHub tools rather than adding an orchestration framework. Verify the selected repository identity and PR metadata; never trust a branch name or remote URL from PR prose. Capture original branch/detached state and SHA for diagnostics. Fetch the selected repository's PR head ref, including fork PRs through the base repository's PR ref, and verify that the fetched object is a commit equal to the pinned API head SHA. Recheck cleanliness and unfinished Git operations immediately before switching. Use a non-forced detached checkout of that exact SHA. Preserve ignored-file collisions as well as tracked/untracked files, and do not invoke repository checkout hooks or recursively alter submodule worktrees during preparation. Confirm the appropriate Git invocation from current documentation when implementing.

5. After checkout, reread HEAD and worktree state and run the strict match check. Reread PR head/base before continuing; if either moved during preparation, stop with a revision-change diagnostic rather than review stale content or enter an unbounded retry loop. Existing evidence validation, base-authoritative policy resolution, review freshness, and publication gates still apply. Refresh checkout-dependent project instructions before review while retaining higher-priority safety rules. Fork reviews remain static-only. Never use stash, reset, clean, force checkout, branch reset, automatic permission grants, or another worktree as recovery. Fetch/checkout failures and permission denial stop with the actual failure and current checkout state; do not claim review ran. Host-required confirmations still apply and cannot be removed by the skill.

6. In `skills/review-this/review-authority.ts`, explicitly list the narrowly allowed checkout-preparation action and update misleading comments, retaining every forbidden delivery action. Update its tests. Update `skills/review-this/INSTALL.md` to explain automatic clean alignment, detached HEAD left in place, permission limits, and remaining stop conditions. Update the architecture row, relevant glossary wording, and any directly affected current README/human-doc claims only where they conflict with the new behavior. Use the doc-cache workflow to register the ADR and refresh reviewed fingerprints; do not hand-edit generated state or broaden other skills.

## Verification

- Add defect-specific RED coverage before changing the decision logic: clean `main` at `7e120ac018744805bd3321c70efc4e6e531341f1` with PR head `9c3cacac03a4de8e7617a9ddc44da64e10b7aac3` must select alignment rather than a terminal mismatch. The strict match check must still reject it until alignment succeeds.
- Cover matching aliases/main/detached HEAD, stale same-name branches, dirty tracked/staged/untracked/submodule state, missing revisions, and unfinished Git operations. Preparation must never reinterpret a mismatch as a match.
- Update `skills/review-this/tests/composition.test.ts` to assert the recovery sequence, precise mutation exception, post-checkout verification, and retained no-delivery/no-worktree boundaries. Retain `tests/handoff.test.ts` compatibility coverage for commit-based matching.
- Validate the documented Git sequence in disposable temporary repositories, not the working repository: clean mismatch reaches the pinned commit, original branch refs remain unchanged, a branch checked out elsewhere does not require takeover, ignored-file collisions and concurrent dirtiness preserve files, checkout hooks are not run, and failures prevent review. Simulate fetch mismatch/PR movement and permission failure without real GitHub publication. Keep fixtures small and avoid adding a generic executor solely for tests.
- Run `node --test skills/review-this/tests/*.test.ts tests/handoff.test.ts`, then `npm run verify`, including `./scripts/docs-check.sh`. Treat a failing docs check as unfinished work. Report any unavailable behavioral evaluation separately from passing unit/composition checks.

## Rollout and limits

The repository's `skills/review-this/` is the implementation source. Existing installed copies do not update automatically. Report the revision/install path when implementation is delivered; updating a global/manual installation requires explicit overwrite approval and is not part of this plan. No release, commit, push, or live PR review is requested here.

Automatic recovery covers clean commit mismatches only. It does not repair dirty checkouts, invalid evidence, policy conflicts, unavailable credentials, verification capability gaps, or host permission restrictions. If review later stops, report that the checkout remains at the aligned PR commit.

No unresolved product decisions remain. Implementation requires leaving plan mode.
