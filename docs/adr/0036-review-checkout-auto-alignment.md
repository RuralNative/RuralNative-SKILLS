# 0036 — Automatic clean-checkout alignment for review

Status: accepted
Date: 2026-09-08
Supersedes: 0031 (review checkout-match clause only), 0035 (review checkout-mismatch stop clause only)

Decision: `/review-this` aligns a clean mismatching checkout instead of
stopping.

- When the resolved checkout is clean but at a commit other than the pinned
  pull-request head, the run fetches the pull-request head ref from the
  resolved repository's remote (`refs/pull/<n>/head`), verifies the fetched
  object is a commit equal to the pinned head SHA, and switches this checkout
  to that exact commit in detached `HEAD`. The switch uses no forced
  checkout, runs no checkout hooks, moves no local branch, creates no
  worktree, and recurses into no submodule. Review continues in the same
  invocation.
- Before switching, the run rechecks cleanliness and unfinished git
  operations and stops on an ignored-file collision between the working tree
  and the files the switch would write; git replaces ignored files silently,
  so the check is required, not optional. After switching, the run re-reads
  `HEAD`, passes the strict commit-equality match check, and rereads the
  pull-request head and base once; a revision that moved during preparation
  stops with a revision-change diagnostic instead of reviewing stale content.
- Only a clean mismatch aligns. A dirty worktree, an unfinished merge,
  rebase, cherry-pick, revert, or bisect, a missing revision, a fetch or
  checkout failure, or a denied permission stops with no checkout effect.
  The run never stashes, resets, cleans, force-switches, or creates another
  worktree as recovery.
- The checkout stays at the reviewed commit for `/fix-this`; no automatic
  restore of the starting branch. The starting state is recorded for
  diagnostics only.
- Alignment is checkout preparation, not a source edit. Review stays
  publication-only: the pinned `checkoutMatchDecision` contract is unchanged
  and still gates review; evidence validation, base-authoritative policy
  resolution, freshness, and publication gates all still apply afterwards.
  `/fix-this` keeps its own stop-based checkout rule under ADR-0035.

Why: a clean checkout on `main` blocked every review of an open PR whose head
was elsewhere, forcing the user to align manually and rerun. The stop existed
because alignment was confused with delivery authority; fetching and
switching a clean checkout to a verified commit edits no file, moves no
branch, and publishes nothing, so it does not need the terminal-stop
protection.

Consequences:

- `review-session.ts` gains `checkoutPreparationDecision` with
  `proceed`/`align`/`stop`; `checkoutMatchDecision` stays the strict final
  gate, and its mismatch reason now means alignment did not complete.
- `review-authority.ts` adds `align-clean-checkout` to the allowed actions;
  every forbidden delivery action stays forbidden.
- `SKILL.md` gains a `## Prepare` phase between Resolve and Policy; the
  blanket "no repository file is created or edited" rule is scoped to
  authorship, with alignment as the single working-tree effect.
- review-this INV-5 and INV-14 narrow; INV-13's no-worktree and no-worker
  boundary stays. Historical ADRs stay verbatim as evidence.

Activation: this decision governs new `/review-this` invocations from today.
Installed copies update when the user reinstalls from this repository
revision.
