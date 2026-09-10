# Fix the `/implement-this` sub-issue endpoint

## Goal and scope

Fix the native GitHub sub-issue lookup that blocked validation of ticket #293 in `RuralNative/eScraper-Business-Brokers-for-Seacher-Insights`. This is workflow maintenance in `RuralNative/RuralNative-SKILLS`, not implementation of #293.

Limit production changes to the incorrect endpoint in the two maintained readers and their generated copies. Keep the public operation name `sub-issues`, existing result shapes, native relationship authority, pagination, and stop-on-failure behavior unchanged. No new dependencies, API wrappers, fallback routes, retries, permission changes, or workflow redesign.

This file is the client-required planning artifact. Do not include it in the fix commit. Approved durable work belongs in this repository's GitHub issue tracker; publishing it is deferred until writes are authorized.

## Confirmed cause

- Handoff: `/tmp/kilo/issue-293-handoff.md`.
- `scripts/github-facts.ts:431` and `scripts/github-facts.mjs:82` both request `/issues/{number}/sub-issues` instead of GitHub's `/issues/{number}/sub_issues`.
- These are separate authored implementations. The `.mjs` file is not compiled from the `.ts` file, so both need the correction.
- `scripts/generate-workflow-state.ts` copies both files into `plan-this`, `implement-this`, `review-this`, and `fix-this`. Updating those eight copies is required distribution maintenance for this same defect, not additional workflow work.
- On 2026-09-10, a direct `gh api` request to the incorrect route returned `HTTP 404`. The corrected route returned children #288 through #293, with #293 open. The corrected route also succeeded with `--paginate --slurp`. No relationship creation or repair is needed.

References: [GitHub sub-issues REST API](https://docs.github.com/en/rest/issues/sub-issues), [GitHub CLI pagination](https://cli.github.com/manual/gh_api), `docs/adr/0040-github-native-production-workflows.md`, and `docs/leaves/implement-this.md`.

## Implementation steps

1. **Add defect-specific regression tests before changing the readers.** Extend `tests/github-facts.test.ts` using the existing Node test runner.
   - Import `readSubIssues`. Use its injected runner to assert the exact argv `['api', '--paginate', '--slurp', 'repos/o/r/issues/5/sub_issues']`. Return two pages and assert the complete, ordered child-number result.
   - Exercise the real `.mjs` CLI through `spawnSync`, passing the unchanged input operation `sub-issues`. Use a minimal temporary fake `gh` on the child process's `PATH`, following the existing pattern in `skills/review-this/tests/prepare-review-cli.test.ts`. Reject unexpected arguments, record argv, and return fixture output. Never invoke live GitHub from these tests.
   - Run that CLI regression against the authored script and the bundled `skills/implement-this/github-facts.mjs`. Do not rely solely on source-text checks or a TypeScript test to cover the installed execution path.
   - Include complete-empty output and failed or malformed reads. Success requires a complete enumeration; failures must not become a successful empty relationship list. Keep these cases local to the sub-issue operation and clean up temporary fixtures.
   - Capture RED output showing the wrong endpoint fails the new assertion.

2. **Correct only the URL suffix in the authored readers.** Change `/sub-issues` to `/sub_issues` in `scripts/github-facts.ts` and `scripts/github-facts.mjs`.
   - Retain `sub-issues` in operation names and descriptive strings.
   - Keep `gh api --paginate --slurp`. Do not add `--jq` to that invocation or replace GitHub's pagination with custom code.
   - Leave dependency routes, requirement validation, eligibility, PR associations, and unrelated error-message classification untouched. A genuine 403 or 404 must still stop validation.

3. **Regenerate through the existing generator.** Run `node scripts/generate-workflow-state.ts`, then its `--check` mode. Expect changes only to `github-facts.ts` and `github-facts.mjs` under the four workflow skill directories. Investigate unexpected generated changes rather than absorbing unrelated drift. Do not hand-edit bundles or change the generator.

4. **Update the existing documentation with the fix.** Add a short verification note to `docs/leaves/implement-this.md` distinguishing the CLI operation `sub-issues` from the REST suffix `/sub_issues`, with the regression command and official API reference. Review the affected claims for all four generated-copy consumers, then refresh only their fingerprint and verification-date rows in `docs/manifest.md` using the digests reported by `scripts/docs-check.sh`. Do not merely replace fingerprints without reviewing claims. No new ADR, glossary entry, or documentation restructuring is needed.

5. **Verify the source and bundled execution paths.** Capture GREEN output and run:

   ```sh
   node --test tests/github-facts.test.ts
   node scripts/generate-workflow-state.ts --check
   node --test tests/workflow-state.test.ts
   npx tsc --noEmit
   ./scripts/docs-check.sh
   git diff --check
   ```

   Use the installed project toolchain and Node 24 or newer. Do not add dependencies or weaken a failing gate. Unrelated failures are separate work items, not permission to widen this fix.

6. **Perform a read-only integration check.** Invoke the corrected bundled reader with this JSON on stdin:

   ```json
   {"operation":"sub-issues","repository":"RuralNative/eScraper-Business-Brokers-for-Seacher-Insights","issueNumber":287}
   ```

   Compare its complete result with a fresh native lookup:

   ```sh
   gh api --paginate repos/RuralNative/eScraper-Business-Brokers-for-Seacher-Insights/issues/287/sub_issues --jq 'map({number,state})'
   ```

   Expect `ok: true`, `status: "complete"`, and matching child numbers. Treat today's issue states as observations, not permanent test fixtures. If authentication or access prevents the check, report that limitation rather than claiming integration success.

## Rollout boundary

The repository fix does not refresh the installed reader used by the handed-off session. Replacing an existing installation requires explicit approval under `skills/implement-this/INSTALL.md`; none was granted during planning. Keep installed-skill writes outside this implementation scope.

After a separately approved refresh, use the established installation process, verify the actual loaded `implement-this` location and source revision, and repeat the read-only lookup through that installed reader. Do not patch the installed file as a substitute for the maintained fix or assume the default install destination is the active one.

Resuming #293 requires a separate human invocation and fresh validation of all requirements, relationships, blockers, checkout state, and default branch. This fix does not authorize bypassing validation, changing issues or labels, editing Agent Manager state, or automatically starting another workflow stage.

## Completion criteria and planning limits

- Both authored readers and all eight generated copies use the native `/sub_issues` route.
- The unchanged `sub-issues` operation succeeds through the bundled CLI, with endpoint-sensitive RED/GREEN regression evidence and complete pagination.
- Failed reads still block validation; no fabricated relationship or fallback success is introduced.
- Generated-copy checks, type checking, documentation coherence, and diff checks pass. The live integration result is recorded separately from deterministic tests.
- Changes are limited to the two authored readers, one test file, eight generated reader copies, the implementation leaf, and the four relevant manifest rows.
- No source or installed-skill changes were made during planning. Direct GitHub route checks ran successfully as described above. Execution of the reader and `./scripts/docs-check.sh` was blocked by plan-mode permissions, so no runtime-test or documentation-gate pass is claimed.
