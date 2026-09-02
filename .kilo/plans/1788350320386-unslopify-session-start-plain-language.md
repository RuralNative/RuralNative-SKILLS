# Improve unslopify setup, plain language, and doc limits

## Goal

Make `unslopify` load at the start of later sessions, make every model-authored English question and response easy to understand, add the requested phrase replacements, and give `document-for-agents` 50% more room for essential information without weakening its trimming rules.

## Scope and boundaries

Affected seams: `unslopify`, `document-for-agents`, `plan-this`, `implement-this`, and `review-this`. The last three are affected only because they carry their own copy of the task-reading limits.

Keep these existing guarantees:

- User text changes only when the user asks for an edit.
- Protected quotations, commands, identifiers, exact names, and marked ranges stay unchanged.
- English-only handling, silent normal audits, technical accuracy, scanner purity, and scanner exit behavior remain.
- The first five `document-for-agents` commands and its management marker remain unchanged and in the same order.
- Skills remain self-contained after installation. No new runtime dependency or network call is added.
- Larger document limits are ceilings, not targets. Existing docs are not padded to fill them.

Out of scope: background services, installer hooks, authorship detection, automatic rewriting of user prompts, nested `AGENTS.md` files, and non-English rewriting.

## Settled design

### Project setup

On every load, `unslopify` checks the active project's root `AGENTS.md` before normal work. Resolve one root in this order: the workspace root reported by the host, the current Git repository root when available, then the current working directory. Never walk above that root or edit other roots in a multi-root workspace.

The skill owns this exact block:

```md
<!-- unslopify:session-start:start -->
Load `unslopify` before the first user-visible response in every session. Keep it active for all model-authored English questions and prose.
<!-- unslopify:session-start:end -->
```

Setup behavior:

1. Create root `AGENTS.md` with the block when the file is absent.
2. If a `document-for-agents` management marker exists, insert the block directly after it. This keeps the five commands and marker first.
3. Otherwise, insert after valid frontmatter when present, or at byte zero when there is no frontmatter.
4. If the exact block exists once, make no write.
5. If one complete owned block has old text, replace only its body.
6. If markers are duplicate, unmatched, reversed, or nested, make no edit and explain the conflict plainly.
7. Do not follow an `AGENTS.md` symlink or edit a file that explicitly says another generator owns it. Report the skip and give the exact manual block.
8. If the host or parent workflow forbids writes, keep the skill active for this session, make no partial edit, and report that future-session setup was skipped.
9. After a successful first write, say: `Updated AGENTS.md so future sessions load unslopify before replying.` Do not ask for approval first. Repeated no-op checks stay silent.

This automatic write is a narrow exception to caller-owned scope and protected comments. The exception covers only root `AGENTS.md` and only the owned block. Every byte outside that block remains protected. Record this narrowing of unslopify INV-3 in the new decision and leaf invariant instead of claiming the old rule is unchanged.

The Skills CLI has no skill-defined setup hook. `INSTALL.md` must say that installation copies the skill, then the user invokes `unslopify` once in each project to establish later session loading.

### Plain-language behavior

Apply two layers to all model-authored English:

- **Active drafting:** Start with the practical point. Use common words and direct sentences. Ask one choice at a time. Explain a necessary specialist term where it first appears and describe what each option changes for the user.
- **Passive check:** Before sending any question, progress note, recommendation, document, or ordinary response, silently remove needless jargon, inflated wording, and clever-sounding phrases. Do not append an audit report unless the user explicitly asks for one.

Do not remove needed detail or weaken facts, certainty, causality, requirements, or commands. Plain language changes how the explanation is written, not what the system does.

Add `AIT-LEX-009` for these replacements in unprotected model prose and requested rewrite scope:

- `load-bearing` or `load bearing` becomes `essential`, followed by what depends on it.
- `smoking gun` becomes `direct evidence`, followed by what it proves.
- `smoke test` or `smoke tests` becomes `quick check`, followed by what it checks.

Replace all three even when the phrase is technically correct in ordinary prose. Existing protection still wins for exact quotations, commands, identifiers, and names. Remove `load bearing` from context-aware `AIT-LEX-008`; `vertical slice` and `native dependency edges` remain there.

The advisory scanner reports each visible occurrence from a count of one under `AIT-LEX-009`. The model chooses the smallest safe rewrite. Bump the scanner behavior version from `1.0` to `1.1`; keep JSON schema version `1.0` because the output shape does not change.

### Documentation and task-reading limits

Increase every current `document-for-agents` size ceiling by 50%:

- Compact index: 150 to 225 lines.
- Leaf doc: maximum two-minute read to maximum three-minute read.
- Policy doc, including `REVIEW.md`: 70 to 105 lines. Replace vague page wording with the line limit where a check needs an exact boundary.
- Dependency reference entry: about 10 to about 15 lines.
- Initial leaf invariants: 3–5 to 3–8. The set may still grow only when decisions add real rules.
- Leaf complexity review: about 15 to about 23 invariants. Crossing this point triggers review, not an automatic seam split.
- Ordinary task orientation: 6,000 to 9,000 UTF-8 bytes.
- API or route task orientation: 9,000 to 13,500 bytes.
- Schema or data task orientation: 12,000 to 18,000 bytes.
- Re-orientation after context loss: 7,000 to 10,500 bytes.
- Absolute orientation maximum: 12,000 to 18,000 bytes.

Keep the current trimming order and effort. Remove work history, stale text, duplication, code-recoverable detail, long file tours, and coverage restatement before considering essential material. Preserve decisions, rejected alternatives needed to understand them, vocabulary, boundaries, invariants, and operational warnings. Use extended detail files only for nonessential reference. Never silently truncate an essential rule to fit a limit; if essential content still exceeds the new cap, fail with the existing over-limit report and decision path.

Keep limits on one small unit unchanged: an ADR decision remains two to four sentences, a glossary definition remains one to two sentences, and routing statements remain one line. These limits keep each item readable without limiting how many distinct essential items a document may contain.

Record the new values in a separate decision that narrows ADR-0024. The change is a relaxed ceiling, so it needs no destructive migration. Existing documents and routes remain valid.

## Implementation order

1. **Add failing tests for unslopify setup and language behavior.**
   - Extend `skills/unslopify/tests/composition.test.ts` to assert that the written contract contains the exact block, root resolution, automatic-write exception, placement, no-op behavior, malformed-marker handling, symlink or externally generated file handling, read-only fallback, one-time notice, active drafting, passive checking, and install guidance.
   - Add prompt and file fixtures for absent, ordinary, frontmatter, managed, stale, duplicate, unmatched, and protected `AGENTS.md` cases. Exercise actual edits in the temporary model comparison in step 7, where before-and-after hashes must prove that only the owned block changed.
   - Add phrase fixtures with one and several visible occurrences, both `load-bearing` spellings, plural `smoke tests`, protected copies, and nearby text that must not match.

2. **Implement the unslopify instruction contract.**
   - Update `skills/unslopify/SKILL.md` description, setup step, scope exception, Live output section, process, self-check, phrase catalog, and scanner notes.
   - Keep setup host-independent by expressing the file operation as skill behavior using the host's existing file tools. Do not add a Python, Node, or shell requirement merely for setup.
   - Update `skills/unslopify/scanner.py` with a dedicated `AIT-LEX-009` detector that reuses current masking and stable span logic.
   - Update `skills/unslopify/reference/parity.md`, `INSTALL.md`, and fixtures. Keep all upstream 1 through 31 mappings intact and all local IDs unique.

3. **Add failing tests for the larger limits.**
   - Update machine-enforced orientation boundary tests to pass at each new byte cap and fail one byte above it.
   - Update `REVIEW.md` policy tests from 70 to 105 lines.
   - Update plan, implementation, and review orientation tests for the new cap table and over-limit messages.
   - Add one repository-level parity test that reads the exported values from all four orientation modules and fails if they differ. Keep each installed skill self-contained; do not add a shared runtime import.
   - Use composition tests for the 225-line index guidance, three-minute leaf guidance, 3–8 initial invariants, review near 23 invariants, and 15-line dependency entries. Do not add a twelfth harness check merely to enforce prose guidance.
   - Add tests or fixtures showing that trimming still removes recoverable repetition before essential rules and that an essential rule is never silently cut.

4. **Apply the 50% limit change everywhere it is enforced or stated.**
   - Update `skills/document-for-agents/orientation.ts`, `reference/orientation.md`, `reference/templates.md`, `reference/classify.md`, `reference/harness.md`, and `SKILL.md`.
   - Update the matching constants in `skills/plan-this/orientation.ts`, `skills/implement-this/orientation.ts`, and `skills/review-this/orientation.ts`.
   - Update `scripts/docs-check.sh`, root `REVIEW.md` guidance if needed, and every test with a cap boundary. Do not change source selection, deduplication, cache-gap handling, or stop behavior.

5. **Make generated `AGENTS.md` files keep the unslopify block.**
   - Add the exact block after the management marker in `skills/document-for-agents/reference/templates.md` and this repository's root `AGENTS.md`.
   - Update Establish, Improve, and Maintain instructions so they preserve the block.
   - Extend document-for-agents tests to prove the five-command prefix, marker position, single unslopify block, and later-section order.

6. **Record decisions and update authored docs.**
   - Add one accepted ADR for session-start setup, the narrow root-file scope exception, plain-language live output, and the `load-bearing` change that narrows ADR-0015.
   - Add a separate accepted ADR for the 50% document and orientation limits that narrows ADR-0024 while preserving strict ceilings and trimming order.
   - Update `docs/leaves/unslopify.md` with a new setup invariant and the revised phrase invariant.
   - Update `docs/leaves/document-for-agents.md` with generated-block placement, new size ceilings, and unchanged trimming priority.
   - Update the bounded-orientation invariants and decision links in the `plan-this`, `implement-this`, and `review-this` leaves.
   - Update `CONTEXT.md`, `ARCHITECTURE.md`, `README.md`, and `docs/manifest.md`; refresh all affected seam fingerprints. Regenerate human docs from authored sources rather than hand-maintaining conflicting summaries.

7. **Validate behavior and quality.**
   - Run focused tests for all five affected seams, then `npm test`, `npx tsc --noEmit`, and `./scripts/docs-check.sh`.
   - Confirm every declared route fits the new cap and all four orientation modules report the same table.
   - In `/tmp/kilo`, compare the previous and revised skills with the same model and prompts on: missing `AGENTS.md`; managed `AGENTS.md`; repeated setup; malformed markers; a read-only root; a plain-language decision question; and all three target phrases.
   - Run a small old-cap versus new-cap task set: one route that fits both limits, one containing an essential rule after the old limit but before the new limit, and one containing removable repetition. The revised run must retain every required rule, introduce no unsupported requirement, pass the fixture's behavior checks, and show no correctness regression on the control case. Record input and output size so the extra context cost is visible.

## Rollout and failure handling

- Existing installations gain persistence only after `unslopify` is loaded once after update. Do not imply installation performed setup.
- Projects maintained by `document-for-agents` gain the block the next time it creates or maintains root `AGENTS.md`.
- The first automatic setup may leave an intentional tracked change. Report it once and never commit it automatically.
- Unknown generated files, symlinks, malformed blocks, and denied writes remain untouched. Current-session cleanup still works.
- Larger caps relax prior failures and require no content migration. They do not authorize broader source selection.
- Rollback removes only the owned block, restores scanner `1.0` behavior and prior limits, and leaves all unrelated project prose untouched.

## Acceptance criteria

- `AC-1`: First load in a writable project creates or updates exactly one owned root `AGENTS.md` block and reports the change once without asking first.
- `AC-2`: Setup preserves every byte outside its block, is silent and byte-identical on repeat, and makes no partial edit for malformed markers, symlinks, external ownership, or write failure.
- `AC-3`: A managed `AGENTS.md` still starts with the exact five commands and management marker, then contains the exact unslopify block once.
- `AC-4`: A session that cannot persist setup still uses unslopify for its own output and gives a plain manual fallback.
- `AC-5`: Install guidance says the CLI has no setup hook and requires one initial invocation per project.
- `AC-6`: Every model-authored English question and response uses the active plain-language drafting rules and passes the silent pre-send check without losing technical meaning.
- `AC-7`: User text, protected content, exact names, and non-English text retain their existing protections.
- `AC-8`: A single visible `load-bearing`, `load bearing`, `smoking gun`, `smoke test`, or `smoke tests` occurrence produces `AIT-LEX-009`; requested rewrites replace it with concrete language.
- `AC-9`: `vertical slice` and `native dependency edges` remain context-aware `AIT-LEX-008` candidates; upstream mappings and all other local identifiers remain stable.
- `AC-10`: Scanner version is `1.1`, schema stays `1.0`, and deterministic, no-network, no-write, masking, JSON, hash, and exit-code behavior remains green.
- `AC-11`: Document ceilings are 225 index lines, a three-minute leaf read, 105 policy lines, about 15 dependency-entry lines, 3–8 initial invariants, and review near 23 invariants, without automatic expansion of existing docs; short ADR, glossary, and routing units keep their current limits.
- `AC-12`: All orientation consumers and the harness use 9,000, 13,500, 18,000, and 10,500-byte task caps with an 18,000-byte absolute maximum; exact-boundary tests pass and one-byte-over tests fail.
- `AC-13`: Trimming tests prove repetition and code-recoverable detail are removed before essential decisions, vocabulary, boundaries, invariants, or warnings; essential text is never silently truncated.
- `AC-14`: The old-versus-new quality check shows no correctness regression on a route that fits both limits and successful use of an essential rule that only fits under the new limit.
- `AC-15`: Both new decisions, all five affected leaf docs, public guidance, derived docs, manifest, and fingerprints agree with the implemented behavior.
- `AC-16`: Focused tests, full tests, TypeScript checking, and the docs harness all pass.
