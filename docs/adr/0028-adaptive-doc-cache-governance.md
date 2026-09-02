# 0028 — Adaptive doc-cache governance

Status: accepted
Narrows: 0024 (Improve approval and Additive-promotion clauses), 0018 (consent-memory clause), 0002 (check-2 same-diff clause)
Date: 2026-09-02

Decision: the doc-cache lifecycle adapts to a growing project on its own. Every
branch runs a common preflight and a completion gate that resolve the current
tier, the diagnostics consent state, the decision frontier, and the required
tier from evidence. Promotion is monotonic and additive: Establish, Maintain,
and Improve apply a higher tier in the same run without a second command or a
separate approval, and the skill never demotes a tier automatically. The
minimal-to-standard trigger is the first ADR-worthy durable decision or more
than one independently editable seam; the standard-to-full trigger is a
review-confirmed code/doc contradiction, multi-agent or multi-package
coordination, or a code-derived artifact that would replace high-decay
restatement. Audit stays read-only: it reports a required promotion instead of
applying it. Destructive repair (trim, move, delete, demotion) still lands only
through one approved Improve preview, so ADR-0024's approval gate survives for
non-additive work.

Harness check 2 changes from touch-only `Same-diff freshness` to `Seam
coherence`. Each documented seam carries a harness-owned code fingerprint in the
coverage manifest's `Seam verification` table: a canonical SHA-256 over its
VCS-visible code root (tracked plus non-ignored untracked files, sorted by
path, each contributing path, type, byte length, and content hash). A missing
or stale fingerprint fails the gate in a dirty worktree and in a clean CI
checkout alike, because the stored digest is compared with current source
content, not with `git status` or a base range. Refreshing a fingerprint is
valid only after Maintain reviews every affected authored claim against current
code and applies the code-wins rule; touching a leaf without refreshing stays
red, and a reviewed no-text-change result may refresh. The harness stays at
eleven checks: check 2 is replaced, not added. Standard tier arms this
mechanical drift protection; the fingerprints and the private consent state are
manifest and local state, never orientation-set inputs, so ADR-0024's caps and
ADR-0025's resolution inputs are unchanged.

Decision capture becomes a prospective gate, not only a supersession step.
Before implementation the agent names choices that change what a future agent
may assume; during implementation a newly discovered qualifying tradeoff pauses
the work and is recorded before continuing. An ADR-worthy choice requires the
decision, its context, the alternatives genuinely considered with rejection
reasons, and the consequences, written while the reasoner still holds them.
Completion requires an empty decision frontier. Reversible trivia stays in the
commit message. Legacy ADRs missing rationale are recovered only from cited
repository or tracker evidence, recorded in a separate accepted `Clarifies:`
clarification record that leaves the original verbatim; unsupported rationale is
recorded as a cache gap with `unknown` and never invented.

Diagnostics consent becomes an unavoidable first-run checkpoint with a
remembered choice. The consent state (`enabled` or `declined`) is stored in a
private local directory outside version control and every orientation set — the
common Git directory for Git repositories so linked worktrees share it, the
platform user-state directory keyed by the repository root otherwise. Absent,
corrupt, or unsupported state asks again; a failed persistence leaves diagnostics
disabled and never infers consent. ADR-0018's privacy guarantees stand: no log
before `enabled`, prior notice per write, sanitization, immediate revocation,
the separate keep/export/delete choice, read-set exclusion, and no upload.

Why: the lifecycle sized the tree only at Establish, so projects that grew past
minimal kept a stale, under-tiered cache until a manual rebuild, and by then the
reasoning behind earlier ADRs was already lost. Consent sat in prose with no
lifecycle checkpoint, so the diagnostics record was never offered or kept. The
same-diff check read only the working tree and accepted a touched leaf as
evidence, so a clean CI checkout could not see code-only drift and a doc could
stay green while its claims went false. Decisions were captured only when
superseding an old one, so the first rationale — the one nobody remembers later
— was the one most often skipped.

Consequences:
- `document-for-agents:INV-13` stands unchanged at eleven checks; check 2 is
  replaced in place.
- `document-for-agents:INV-16` is narrowed: additive tier promotion is automatic
  within a run; Audit stays read-only and reports it; destructive Improve work
  keeps the one-preview, one-approval gate.
- `document-for-agents:INV-14` is narrowed: consent is a first-run checkpoint
  remembered in private local state; every other ADR-0018 clause stands.
- New invariants `INV-18` (monotonic tier governance), `INV-19` (prospective
  decision capture and evidence-only rationale recovery), and `INV-20`
  (fingerprint seam coherence) are declared in the seam leaf.
- A deterministic `governance.ts` reference implementation ships beside
  `orientation.ts`: tier ranking, evidence-to-tier, monotonic promotion,
  canonical seam fingerprinting, and consent-state resolution.
- The coverage manifest gains a `Seam verification` table; the compact index
  gains a `Documentation tier:` line; tier evidence lives in the manifest.
- This repository adopts the contract in the same change: its own fingerprint
  baseline is reviewed and recorded for every seam, its declared tier is `full`,
  and the glossary freezes Tier governor, Seam fingerprint, Seam coherence, and
  Clarification record.
