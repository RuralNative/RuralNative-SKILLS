# 0042 — Run-Local Tooling Repair and Native Closing Links

Status: accepted
Date: 2026-09-14
Narrows: 0039 (installed-only execution), 0040 (native closing links), review-this INV-12/INV-14

## Context

PR #312 in `RuralNative/eScraper-Business-Brokers-for-Seacher-Insights` natively closes #305 through `closingIssuesReferences`, but carries no historical timeline `connected` event. The shared reader derived closing issues solely from timeline events and certified the empty result as complete, so preparation rejected the valid association. Separately, recovery handled inputs, runtime, dependencies, checkout, evidence, and publication, but supplied no tested helper-defect repair path, and the retry budget keyed by broad failure class rather than observed cause and operation.

## Decision

Narrow review-this INV-12, INV-14, and the ADR-0039 installed-only execution boundary for bounded run-local repair. Historical ADRs stay unchanged.

- Native `PullRequest.closingIssuesReferences` is the authoritative closing-link source with full repository identity. Historical timeline events are never unioned, disconnected links never revive, and prose never infers closure. Complete-empty means a successfully exhausted connection; missing, forbidden, malformed, partial, or truncated observations never become empty success. Cursors are followed to completion with repeated and missing cursor detection.
- A reproduced helper defect may be corrected in an isolated copy below `/tmp/kilo/review-this/<runId>/`, tested through helper-observed regression receipts with unchanged guards, then used to retry only the failed phase. Shared installs, PR source, permissions, requirements, and approval rules stay unchanged. Guards (permission checks, side-effect guards, validators) stay byte-identical; only operational readers and adapters may change. Attempts budget by observed cause and operation with normalization, surviving interruption; new run IDs never reset an unchanged failure, while distinct evidenced causes receive their own correction.
- Bootstrap prefers the skill loader but falls back to permitted file reads of the discovered trusted installation. A missing tool is not a missing installation, and a denial never authorizes a bypass. A small capability check precedes checkout effects.

Source fixes, delivery, permission edits, and self-authorized approvals stay outside review.

## Consequences

- `scripts/github-facts.ts` with `github-facts.mjs` carries the GraphQL closing-link read; the executable consumes the shared reader.
- `skills/review-this/prepare-review.{ts,mjs}` carries the cause-tracked budget and the isolated prepare and verify operations.
- `docs/leaves/review-this.md` narrows INV-12 and INV-14 by this ADR; `SKILL.md`, `INSTALL.md`, and the architecture index state the retained limits.
