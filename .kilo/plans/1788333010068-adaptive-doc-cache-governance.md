# Adaptive doc-cache governance plan

## Intent

- **Outcome:** Make `document-for-agents` adapt its documentation tier during normal work, capture decision rationale while it is available, ask once about private diagnostics, and block stale documentation in both working trees and clean CI checkouts.
- **User:** Maintainers who install the skill in projects that grow across sessions, seams, and agents.
- **Why now:** The current lifecycle sizes the tree only during Establish, leaves diagnostics consent outside the executable branch flow, and treats a touched leaf as freshness evidence. Projects can therefore outgrow their tier, lose ADR rationale, and pass checks with stale claims.
- **Success:** The same lifecycle run that observes growth promotes the cache; every ADR-worthy choice records rationale and alternatives before context is lost; diagnostics consent cannot be skipped; a stale seam fingerprint keeps the harness red until claims are reviewed.
- **Constraints:** Preserve code-wins, orientation byte caps, private diagnostics, append-only decision history, Audit read-only behavior, and the existing eleven-check harness count. Automatic changes may only add or activate documentation. Demotion, deletion, trimming, and moves retain the Improve preview and approval gate.
- **Non-goals:** Project logging, metrics, traces, or telemetry documentation; background monitoring; automatic demotion; invented rationale; code-architecture redesign; changes to orientation-set inputs.

## Settled design

### Lifecycle preflight

Add one common preflight used by Establish, Audit, Maintain, and Improve:

1. Resolve the current declared or inferred documentation tier.
2. Resolve private diagnostics consent state. If no valid state exists, ask before branch work starts.
3. Run the prospective decision gate against the requested work.
4. Evaluate tier evidence and produce the required tier.

Run the tier and decision checks again before completion so evidence introduced during implementation cannot escape. Audit computes and reports the result without changing repository files. Establish, Maintain, and Improve apply additive promotions in the same run.

### Tier governor

Use an ordered, monotonic tier model. Never lower a tier automatically.

- **Minimal to standard:** Trigger on the first ADR-worthy durable decision or when the seam map contains more than one independently editable seam.
- **Standard to full:** Trigger when review proves a code/doc contradiction, the repository needs multi-agent or multi-package coordination, or a code-derived artifact would replace high-decay restatement.
- A fingerprint mismatch alone is not confirmed drift. The review must find a false claim before it becomes full-tier evidence.
- Record `Documentation tier:` and concise promotion evidence in the compact architecture index. Infer the tier for legacy caches that lack the marker.
- Minimal keeps the index, glossary, and conventions policy.
- Standard adds leaf docs, lazy ADR creation, applicable policy docs, the harness-owned manifest, active seam fingerprints, and the harness wired into the normal check path.
- Full retains the standard controls and activates generated artifacts, package-local indexes, orientation routes, and scorecard sections only where their documented need exists. Dormant categories do not create empty files.
- Generated `AGENTS.md` guidance must tell agents to run Maintain for every seam change. This makes the entry and completion governor part of ordinary code work rather than a manual rebuild command.

### Private diagnostics checkpoint

Keep the ADR-0018 privacy boundary and make it executable:

- Store the remembered choice as `enabled` or `declined` in a private local state directory outside version control and every orientation set. For Git repositories, use the common Git directory so linked worktrees share the choice. For non-Git repositories, use the platform user-state directory keyed by a hash of the canonical repository root.
- Create no diagnostics log before `enabled` consent. A declined choice creates only the private consent-state record.
- If state is absent, corrupt, or unsupported, ask again. If persistence fails, continue with diagnostics disabled and do not infer consent.
- Before every append, state the mistake category and that sensitive details will be removed.
- Preserve immediate revocation and the separate keep, export, or delete decision.
- Log only confirmed skill/documentation failures in the approved sanitized form. Add no network call or automatic submission.

### Decision and rationale gate

Promote decision capture from a supersession-only step to a prospective lifecycle gate:

- Before implementation, identify choices that alter future assumptions about boundaries, contracts, security, data, conventions, or ownership.
- Create an ADR when the choice is costly to reverse, surprising without context, and the result of a real tradeoff. Require the decision, context, alternatives considered, rejection reasons, and consequences before code work proceeds.
- During implementation, pause when a new qualifying tradeoff appears and record it before continuing.
- Completion requires an empty decision-candidate list. Reversible implementation trivia stays in commit history.
- For legacy ADRs with missing rationale, search repository history and tracker records. When evidence is sufficient, create a separate accepted clarification record with `Clarifies: 00NN`, evidence references, recovered rationale, and remaining unknowns. Do not edit or supersede the original decision merely to add history.
- When evidence is insufficient, record a cache gap with rationale `unknown`; do not create a speculative clarification. With diagnostics consent, the missed capture may also be logged after notice.

### Fingerprint drift gate

Replace harness check 2, `Same-diff freshness`, with `Seam coherence`. Keep the harness at eleven checks.

- Add a harness-owned `Seam verification` table to `docs/manifest.md`. Each row stores seam identity, a canonical SHA-256 code fingerprint, verification status, and the leaf or policy claims reviewed. The manifest remains excluded from every orientation set.
- Compute the fingerprint from VCS-visible files under the seam code root: tracked files plus non-ignored untracked files. Sort repository-relative paths deterministically and hash path, file type or mode, byte length, and content hash. Hash symlink targets and Git link identities explicitly. A deleted file changes the resulting digest.
- In non-Git adopters, require a configured VCS/file-enumeration adapter. Fail closed when the harness cannot compute a trustworthy fingerprint.
- A mismatch blocks both a dirty worktree and a clean checkout because the persisted digest is compared with current source content, not `git status` or a CI base range.
- Refresh a digest only after Maintain checks every affected authored claim against current code, applies code-wins corrections, and records whether prose changed or remained true.
- Touching a leaf without refreshing the fingerprint stays red. Refreshing after a no-text-change review is valid. If code changes again after refresh, the final harness run goes red again.
- Extend governing-source policy freshness to use the same content-based mechanism where a policy declares code sources.

## Repository changes

1. **Record the decision first.** Add one ADR for adaptive doc-cache governance. It must narrow ADR-0018 for persistent private consent state, narrow ADR-0024/INV-16 so additive promotion is automatic while destructive Improve work remains approval-gated, and replace ADR-0002's check-2 touch semantics without changing INV-13's eleven-check count. State that fingerprints are manifest metadata and never orientation inputs.
2. **Implement a deterministic governance core.** Add `skills/document-for-agents/governance.ts` with pure tier-ranking, evidence-to-required-tier, monotonic-promotion, and canonical seam-fingerprint functions plus a small CLI surface for fixtures and harness integration. Keep private-state writes behind explicit consent handling rather than inside pure classification functions.
3. **Rewrite the executable lifecycle.** Update `skills/document-for-agents/SKILL.md` so common preflight and completion gates cannot be skipped, Branch C owns prospective decision capture and fingerprint refresh, Audit remains read-only, and additive promotion no longer requires a second invocation. Update the frontmatter description so growth, drift, and lost decision context trigger the skill.
4. **Update the reference contract.** Revise `reference/classify.md`, `reference/harness.md`, and `reference/templates.md` for tier evidence, standard-tier drift protection, consent state, clarification records, and the new check-2 semantics. Update `reference/orientation.md` only to state that fingerprints and private state never enter orientation resolution. Update `INSTALL.md` with standard-tier harness wiring, private-state behavior, and any new bundled file.
5. **Update this repository's harness.** Change `scripts/docs-check.sh` to parse the declared tier and seam-verification rows, compute the same canonical digest, fail on missing or stale verification, retain all other checks, and include tier and fingerprint status in the scorecard. Do not rely on the current working-tree-only `git status` comparison.
6. **Update the doc cache in the same change.** Add `INV-18` for monotonic tier governance, `INV-19` for prospective decision capture and evidence-only rationale recovery, and `INV-20` for fingerprint coherence in `docs/leaves/document-for-agents.md`; update their mechanisms in the extended leaf. Amend INV-14 and INV-16 wording under the new ADR without renumbering them. Add glossary entries with avoid lists for `Tier governor`, `Seam fingerprint`, `Seam coherence`, and `Clarification record`. Update `ARCHITECTURE.md`, `docs/manifest.md`, `README.md`, and the generated human docs. Preserve the five AGENTS commands and protected marker exactly.
7. **Migrate existing adopters safely.** On the first run with the revised skill, infer the existing tier, ask diagnostics consent if state is absent, review each documented seam before writing its initial fingerprint, and apply any required additive promotion. A standard/full cache with no baseline remains red until that review. Never bootstrap fingerprints by trusting existing prose without comparison to code.

## Verification plan

- Add `governance.test.ts` and a tier-governor fixture covering every promotion trigger, entry and completion evaluation, combined evidence, full-tier stability, and forbidden automatic demotion.
- Extend `diagnostics.test.ts` with absent/enabled/declined/corrupt state cases, shared Git-worktree state resolution, non-Git state resolution, failed persistence, no-log-before-consent, revocation, and read-set exclusion.
- Add decision-gate tests for pre-change and mid-change ADR capture, required alternatives and rejection reasons, evidence-backed `Clarifies:` records, and unsupported rationale remaining `unknown`.
- Add fingerprint unit tests for deterministic ordering, tracked and untracked content, deletion, symlink, Git link, dirty-tree, clean-checkout, and unsupported-adapter cases.
- Add harness fixtures proving: a code change fails without refresh; committing that code-only change still fails in a clean checkout; touching only the leaf still fails; reviewed prose plus refresh passes; reviewed no-text-change plus refresh passes; a later code change fails again; standard tier arms the gate.
- Update composition, Improve, orientation, review-policy, manifest, and minimal-tier fixtures to preserve existing invariants and prove that fingerprint/private-state metadata never enters orientation sets.
- Run the focused Node tests, the full test suite and typecheck, then `./scripts/docs-check.sh`. Deliberately create a fingerprint mismatch, prove the harness goes red, restore or refresh it through the review path, and prove the harness goes green.
- Run the final `unslopify` audit on changed prose and regenerate all human-derived docs before completion.

## Failure and migration behavior

- Missing or corrupt consent state never enables diagnostics.
- Missing or stale fingerprints fail with the seam name, expected digest, actual digest, and remediation command or workflow step.
- A promotion that would exceed an orientation cap must trim or reroute high-decay content before completion. It may not waive the cap or demote automatically.
- Audit reports promotion and fingerprint deltas but writes no repository file.
- Destructive repair and demotion still require the complete Improve preview and explicit approval.
- Tracker or history unavailability leaves legacy rationale `unknown`; no fallback invents a reason.
- Private state and diagnostics failures do not block code/doc work, but they do block diagnostics writes.

## Acceptance criteria

- `AC-1`: Every lifecycle branch evaluates tier evidence at entry and before completion.
- `AC-2`: Establish, Maintain, and Improve apply evidence-backed additive promotions in the same run without a second command or approval; Audit reports them without mutation.
- `AC-3`: Promotion is monotonic and follows the settled minimal-to-standard and standard-to-full evidence triggers; no path automatically demotes.
- `AC-4`: Standard tier installs and wires mechanical seam-coherence protection.
- `AC-5`: A first run with no valid private state always asks for diagnostics consent, remembers enabled or declined outside version control, and never creates a diagnostics log before consent.
- `AC-6`: Diagnostics keeps prior notice, sanitization, revocation, disposition, read-set exclusion, and no-upload guarantees.
- `AC-7`: New ADR-worthy decisions record context, alternatives, rejection reasons, and consequences before implementation or immediately when discovered mid-work.
- `AC-8`: Legacy rationale recovery creates a separate clarification only from cited repository or tracker evidence; unresolved rationale is marked `unknown` and never guessed.
- `AC-9`: Harness check 2 uses canonical seam fingerprints and fails for stale documentation in dirty worktrees and clean CI checkouts.
- `AC-10`: A leaf-only touch cannot satisfy seam coherence; a reviewed no-text-change result can satisfy it only by refreshing the harness-owned fingerprint.
- `AC-11`: The harness remains eleven checks, the manifest and private state remain outside orientation sets, and all orientation caps continue to pass.
- `AC-12`: Existing adopters receive an evidence-reviewed baseline and any required promotion on their first revised-skill run; no existing prose is silently trusted.
- `AC-13`: Source, tests, install guidance, ADRs, glossary, leaf docs, manifest, README, and derived human docs change together and the full verification suite passes.
