# Complete `/review-this` scoped evidence repair

## Goal and approved scope

Make `prepare-review.mjs` perform the scoped PR-description repair authorized
by ADR-0039 and ADR-0040. A recovery decision alone must never report success.

- The user chose to keep evidence in the PR description, not migrate it to
  checks or comments.
- The user approved this file as a one-off, uncommitted local planning draft.
  Do not change the tracker-only work-doc policy or publish tracker records.
- Switch to an implementation-capable agent for source changes. Installation
  and either live review require separate explicit authorization.

## Evidence and diagnosis

Sources:

- `/tmp/kilo/handoffs/handoff-review-296-20260910-0842.md`
- `/tmp/handoff-review-pr-297.md`
- `docs/leaves/review-this.md`, `CONTEXT.md`, ADR-0038, ADR-0039, ADR-0040
- [GitHub's pull-request REST contract](https://docs.github.com/en/rest/pulls/pulls#update-a-pull-request), consulted through Context7.

Both incidents concern `RuralNative/eScraper-Business-Brokers-for-Seacher-Insights`,
parent #287, and same-version requirements-pin mismatches of unproven cause.

| Incident | Ticket | Head in handoff | Reported stop |
| --- | --- | --- | --- |
| PR #296 | #291 | `e9863aeef16bff3468d600826809f2fb24783b4e` | `evidence-repair-capability-unavailable` |
| PR #297 | #289 | `4a5e33dd829e5a0410478a6cdfca6437bbf28548` | `scoped-evidence-repair-unavailable` |

Both handoffs pin base `71966a164c45af2959d2c92df06b8b6c846883cc`.
PR #297 reports complete criterion coverage, four passing proof commands,
a clean checkout, and no published review. Its proof commands were:

```text
npm run docs:check
node scripts/evidence-check.mjs
npm run docs:diagrams
npm run docs:diagrams:render
```

Treat the handoffs as historical reports, not current-run receipts. Reobserve
live facts before acting; unequal pins/timestamps do not prove historical edits.

Confirmed code findings:

- `skills/review-this/prepare-review.mjs:538-569` handles both recovery
  operations by accepting five caller facts and returning a pure decision.
  There is no repair write or read-back in this branch.
- `run-check` already executes approved commands and returns receipts at
  lines 246-305. Reuse it; `verify-commands` is intentionally validation-only.
- `scripts/workflow-state.ts` already owns the recovery gate, evidence
  renderer/validators, scoped replacement, and `evidence-repair-v1` records.
- `scripts/workflow-cli.mjs` validates passing behavior claims against
  receipts. An all-non-behavior evidence block does not cause it to check
  the project's mandatory verification commands.
- `replaceSingleEvidenceBlock` normalizes the whole body before splicing.
  That violates outside-region byte preservation for mixed line endings.
- Existing recovery tests cannot detect the missing write. Repository and both
  inspected installed review bundles were byte-identical during investigation.

## Retained boundaries

- One resolved open PR in the selected repository and current checkout;
  existing native-association, base-policy, and readiness checks still apply.
- No source fixes, commits, pushes, merges, labels, approvals, issue edits,
  worktree management, credential acquisition, or automatic next stage.
- Only supported stale/legacy pins, or a genuinely absent pin in one otherwise
  valid supported block, qualify. An absent block is not an absent pin.
  Malformed carriers, unknown envelopes, ambiguous markers, and proven
  requirements-body changes remain restrictions.
- Preserve genuine historical bug RED command/output. Never manufacture it
  or replace it with a current passing run.
- Keep the implementation/finalization `decideRepairRevalidation` gate narrow.
  Do not change requirements fingerprinting, relax shared consumer acceptance,
  add an evidence version, or redesign review publication.
- No permission widening, new dependencies, or cross-installed-skill imports.

Risk is high because this path uses credentials to overwrite a full native
PR body. Scoped composition, actual proof, fresh guards, and read-back are
required despite the narrow implementation scope.

## Implementation sequence

### 1. Add a regression through the real public operation

Start with a failing test invoking the non-dry-run `prepare-review.mjs` recovery
branch through the real Node executable. Use isolated checkout/run fixtures and
a PATH-scoped fake `gh` that records argv and maintains PR-body state. Never
contact live GitHub or overwrite installed skills. Do not expose a production
input option for fake transports, executables, endpoints, or environment overrides.

Model both incidents with adapted parent/ticket bodies and seven active ticket
criteria. Derive current revisions with the shared resolver; label synthetic
receipts as fixtures, not live proof.

Require exactly one body-only PATCH, native read-back, and acceptance by the
actual bundled `workflow-cli.mjs evidence`. A decision or mocked validator is
insufficient. Include #297's four commands and all-non-behavior criteria.
Initially satisfy today's decision-only inputs so the test fails on the absent
PATCH, not an input error or missing import.

### 2. Finish the existing bounded operation

Keep effects in `prepare-review.mjs` and `prepare-review.ts` pure. Extract only
small internal functions for executor reuse/testing; add no new executable.

- Make `recover-evidence` the sole repair writer. Define `repair-record` as
  read-only inspection/reconciliation of an existing attempted repair, not a
  separate record writer or authorization bypass.
- Input identifies repository, PR, expected head/base, private run ID, and
  criterion/check observations. Derive classification, scope resolution, block
  validity, proof result, and RED preservation from observations/validators,
  not caller booleans. Reject obsolete decision-only requests explicitly.
- Observe the authenticated actor and sufficient native write permission
  independently. Read the full PR body, open state, head/base, exact native
  closing-ticket/parent associations, current issue bodies, and governing
  source revisions. Failed or incomplete reads are not empty observations.
- Verify local HEAD, checkout identity, cleanliness, and same-repository
  execution. Never execute fork code. Reuse shared readers and add only missing
  bounded reads.
- Establish the repair's required checks from inspected pinned project
  configuration, requirements verification intent, and criterion claims.
  PR prose or a caller's approved-command list cannot authorize arbitrary code.
  Semantic criterion assessment remains the reviewer's responsibility.
- Run one deduplicated set of repair-time checks through the existing
  `run-check` executor. Route stale evidence here before separately repeating
  its proof commands; do not create another runner.
- Require actual execution receipts for every required check, including those
  supporting non-behavior criteria. Validate approved commands, integer exit
  status, complete recorded output, and pinned context. No behavior downgrades,
  historical claims, `dryRun`, or caller-authored receipts may substitute.
- Retain complete results privately, including timeout/truncation status.
  A shortened display is not a receipt. Published provenance contains a bounded,
  non-secret summary/digest, not raw logs or temporary paths.
- Recheck tracked-file cleanliness after setup/checks. Never clean, reset,
  stash, or discard changes to make the run look clean.

### 3. Compose and validate one replacement region

In authored `scripts/workflow-state.ts`, reuse `renderCompactEvidence`,
`validateCompactEvidence`, `renderEvidenceRepairRecord`,
`parseEvidenceRepairRecord`, `evidenceRepairReusable`, and
`replaceSingleEvidenceBlock`.

- Render current evidence from verified observations. Preserve original RED
  command/output; ambiguous extraction stops. The caller cannot clear a bug-fix
  requirement or remove an existing RED section to bypass this check.
- Place one `evidence-repair-v1` record inside the compact evidence block after
  metadata, before its closing marker. Evidence and provenance then share one
  permitted region and native write. Test existing consumer compatibility
  without loosening acceptance.
- Record the old/new requirements pins, old/current head, pinned base,
  repository/PR, honest reason, and actual verification provenance. Use the
  existing missing-pin representation, not an invented historical pin.
- Reject duplicate, malformed, conflicting, or out-of-region repair records
  instead of moving or deleting them. Reuse an identical already-applied
  record. A different prior record needs reconciliation, not silent overwrite.
- Splice original string ranges, preserving outside bytes including mixed
  LF/CRLF, whitespace, Unicode, closing references, and final-newline state.
  Never use the producer's broad upsert/compose to create an absent block.
- Validate the full candidate with bundled `workflow-cli.mjs evidence`, current
  requirements, pinned head, configured commands, and receipts. Separately
  enforce mandatory-check coverage for non-behavior proof. Rejection means no write.

### 4. Perform the native write and reconcile interruptions

Use the existing fixed-endpoint, argument-array pattern from
`skills/fix-this/gh-fix-transport.ts:68-72` without importing that installed
skill. The request is `PATCH /repos/{owner}/{repo}/pulls/{number}` with only
the `body` field. Repository/PR and request fields are helper-controlled.

Immediately before writing, reread body, requirements, associations, governing
sources, permission, and local HEAD/cleanliness. Compare with the verified
attempt. Unexpected movement or incomplete reads prevent the write.

Keep the exact candidate, original/candidate digests, intended record, pins,
and provenance in the existing private run directory. Validate every path
component against symlinks/traversal. This is a reconciliation hint, not
authority over live state or permission to replay. Local artifacts are not
a security boundary against malicious processes running as the same user.

After PATCH, reread full body and pinned facts. Require exact candidate/record
equality and consumer acceptance. On timeout or response loss, read first and
adopt an exact validated result without PATCH. If the body remains exactly
original, permit at most the existing bounded corrective attempt with fresh
guards. Different or persistently unreadable state stops. No blind replay,
rollback of another actor's edit, or polling.

GitHub documents no expected-body-version parameter here. Do not borrow
`expected_head_sha` from branch updates or promise atomic compare-and-swap.
Pre-read/read-back cannot prevent or detect every concurrent edit in the
final network window.

### 5. Return truthful preparation outcomes and document the working path

- Valid current evidence: no write; normal readiness rules still apply.
- Repair plus verified read-back: ready. Exact completed repair after an
  interruption: reuse, not another write or another record.
- Real check failure with trustworthy target, requirements, and policy:
  `reviewable-with-blockers`; retain the old evidence unchanged and carry the
  recorded failure into the normal single Standards-plus-Spec pass.
- Untrusted essential facts, malformed evidence, missing RED, failed permission,
  or unreconciled write/read-back: restricted with a specific diagnostic.
- Dry-run/input validation: explicitly not repaired and not ready by itself.

Update review-this `SKILL.md`, `INSTALL.md`, and its leaf with the actual
operation contract. Fix stale code comments. Update `CONTEXT.md` and `REVIEW.md`
only where needed for single-region provenance. Existing ADRs authorize this;
do not rewrite historical ADRs or add a new policy decision.

## Required tests and acceptance

- Both incident-shaped CLI fixtures observe PATCH and accepted native read-back.
- All four #297 commands pass only when established by inspected configuration;
  reject unlisted commands, unsafe arguments, shell syntax, interpreter preloads,
  absolute/traversing Node script paths, and fork execution.
- Missing/nonzero/invalid receipts, incomplete output, dirty tracked files,
  stale run context, and false success booleans never yield a repair. Include
  the all-non-behavior case and a failed verification that continues with blockers.
- Cover equal pins, supported legacy pins, a genuinely missing pin, malformed
  pins, no block, duplicate/unbalanced/unknown blocks, proven body change,
  conflicting native associations, and authentic/missing/altered RED history.
- Assert exact preservation outside the region and exactly one inner repair
  record. Include mixed line endings, Unicode, fenced marker examples, and
  malformed/conflicting repair records.
- Exercise pre-write body/head/base/requirements/policy/permission movement,
  401/403, malformed/partial reads, failed PATCH, timeout after successful PATCH,
  unchanged-body retry exhaustion, mismatching read-back, and idempotent rerun.
  Assert no unrelated GitHub method or field is written.
- Preserve negative tests for implementation/finalization same-version repinning,
  generic PR-body edits, and review publication's `COMMENT` default.

Primary test homes: `skills/review-this/tests/recovery.test.ts`, a focused
`skills/review-this/tests/prepare-review-cli.test.ts`,
`skills/review-this/tests/permissions.test.ts`,
`skills/review-this/tests/review-authority.test.ts`, and
`tests/workflow-cli.test.ts`. Reuse existing fixture and recording-runner
patterns; add transport tests only where actual transport code changes.

## Validation and rollout

1. Run the new CLI regression first and record its failure on the missing
   effect. Then implement until it passes. Planning did not run this test.
2. Regenerate shared bundles with `node scripts/generate-workflow-state.ts`,
   then run `node scripts/generate-workflow-state.ts --check`. Edit authored
   sources, never generated copies independently.
3. Run `node --test skills/review-this/tests/*.test.ts tests/workflow-cli.test.ts`.
4. Run the full verification checks with lifecycle scripts disabled for dependency
   installation: `npm ci --ignore-scripts`, `npm test`,
   `node node_modules/typescript/bin/tsc --noEmit`, and `./scripts/docs-check.sh`.
   These expand the checks in `npm run verify`; report the actual commands, not
   a claim that the unchanged wrapper ran. Review changed seam claims, refresh
   required derived docs and `docs/manifest.md` fingerprints for affected bundles,
   then require a green final harness and `git diff --check`.
5. Test bundle/parity checks in isolated install fixtures. Retain the current
   executable/permissions. Any necessary new supporting module must be included
   in both install-check inventories and fixture coverage.
6. After separate approval, discover active roots, update only changed workflow
   bundles, and run the documented read-only install checks. No automatic install
   overwrites, Agent Manager changes, or in-review skill downloads.
7. Separately authorized `/review-this` invocations may resume #296 or #297 one
   at a time after fresh observations. Verify repaired readiness and the existing
   publication path, or report a genuine blocker. Do not resume them while planning.

Sequence tests before effects and contract changes before generated bundles and
documentation. Keep this as one focused fix, not parallel competing rewrites.
No implementation design decision remains open. Historical pin mismatch cause
and live incident outcomes remain outside scope. The earlier planning attempt
to run `./scripts/docs-check.sh` was denied by tool permissions; no passing
baseline or completed repair is claimed.
