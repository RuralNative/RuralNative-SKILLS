// Sanitized, source-attributed structural fixtures for the incident handoff
// (ADR-0038). The shapes mirror the live bodies observed on 2026-09-09 in
// RuralNative/eScraper-Business-Brokers-for-Seacher-Insights:
//   - parent issue #287 (both `## Solution` and `## Settled decisions`, twelve
//     criteria under `## Project-level acceptance criteria`, trailing
//     delivery-graph/out-of-scope metadata),
//   - implementation ticket #288 (alternate template: `## Parent` inheritance,
//     inline Risk/Affected seams/Smallest verification fields, nine checkbox
//     records under `## Acceptance criteria`, trailing orientation/completion
//     records),
//   - pull request #294 (human summary, a nine-entry `evidence-v2` block
//     carrying a legacy `requirements-v1` pin, `Closes #288`).
//
// Text is paraphrased and shortened; the structural features the parsers
// depend on are preserved exactly. The legacy pin below is a fixture constant,
// not a reproducible hash of these sanitized bodies: the pre-0038 parser's
// preimage is not part of this fixture set, and an unverified preimage never
// proves historical equivalence (ADR-0038).

export const INCIDENT_REPOSITORY = "owner/eScraper-Business-Brokers-for-Seacher-Insights";
export const INCIDENT_PARENT_NUMBER = 287;
export const INCIDENT_TICKET_NUMBER = 288;
export const INCIDENT_PR_NUMBER = 294;
export const INCIDENT_PR_HEAD_SHA = "48748370726634c9f85c2f758e8cd94ad9bf84d5";

function parentCriterion(n: number, text: string): string {
  return `- \`AC-${n}\`: ${text}`;
}

const PARENT_CRITERIA: readonly string[] = [
  "The manual covers purpose, design, layers, flows, authorization, and operations at progressive depth.",
  "Every current page and access state is represented with the full reference contract; no retired or planned feature reads as current.",
  "Tutorials explain goals, actions, results, state changes, errors, and recovery for the supported scope with explicit gaps.",
  "Onboarding and recipes explain architecture, boundaries, tests, invariants, and recovery without beginning with a directory dump.",
  "The study artifacts, typed evidence, and benchmark cases exist, are complete for the final scope, and stay non-authoritative.",
  "The repository-local governance change is tested and leaves the shared skill unchanged.",
  "The protected manual is reachable only through the owner boundary; wrong hosts, direct paths, and hostile content cannot bypass it.",
  "Diagrams are scoped, narrated, mechanically valid, semantically checked, and consistent with current behavior and limits.",
  "All review perspectives and iterative fixes are recorded; no critical or high finding hides behind an aggregate score.",
  "Links, reachability, evidence existence, freshness, authority exclusion, checks, and build pass with reproducible evidence.",
  "Methodology and lessons describe observable evidence and concise rationale, never private chain-of-thought.",
  "No unrelated redesign, revived view, live paid verification, real-data mutation, or skill rewrite is included.",
] as const;

/** Parent body carrying both settlement homes and a suffixed acceptance heading. */
export function incidentParentBody(): string {
  return [
    "## Problem Statement",
    "",
    "Readers need supported workflows and explicit limits; the owner must not be the primary detector of documentation defects.",
    "",
    "## Solution",
    "",
    "Deliver the audience-based manual, owner-only protected access, and reproducible evidence-backed benchmark below. The user approved publication on 2026-09-09. Implementation divides into six dependent tickets; this parent is not an implementation ticket.",
    "",
    "## User Stories",
    "",
    "1. As a stakeholder, I want plain-language product purpose and limits.",
    "2. As a user, I want a reference for every current page and access state.",
    "3. As an operator, I want offline recovery guidance.",
    "4. As a reader, I want accessible diagrams and usable navigation.",
    "",
    "## Source Baseline",
    "",
    "Repository baseline: `99b016dd1489eac85bbeca68e18502cda25824aa`. Evaluated skill revision: `124f150f819f3e4ed25ec78a3d780f843f14d3ca`. Recheck baseline observations at implementation start.",
    "",
    "## Intent",
    "",
    "| Field | Settled intent |",
    "| --- | --- |",
    "| Outcome | A current-state human manual with protected access and reproducible benchmark evidence. |",
    "| Why now | Existing artifacts cannot establish complete understanding; the owner needs independent detection. |",
    "| Non-goals | No product redesign, no live paid verification, no shared-skill changes. |",
    "",
    "## Settled decisions",
    "",
    "### Authority, observation, and disagreement",
    "",
    "1. Authored docs remain the preferred sources; current code establishes observed behavior; tests prove only their assertions.",
    "2. Human outputs never become coding-agent authority and their exclusion is mechanically enforced.",
    "3. Contradictions are never silently resolved; unrelated defect repair requires separate scope.",
    "",
    "The proposed evidence flow is:",
    "",
    "```mermaid",
    "flowchart TD",
    "  A[Implementation] --> B[Inspection]",
    "  B --> C[Validated current model]",
    "```",
    "",
    "### Narrow governance change",
    "",
    "- Expand the human-docs seam to an audience-based hierarchy under `docs/human/`.",
    "- Keep derived artifacts visible and add separately typed evidence links.",
    "- Exclude the study directory from ordinary orientation and technical authority.",
    "",
    "## Evidence and study design",
    "",
    "### Required permanent records",
    "",
    "All ten study records exist with substantive foundation material; later-result sections are explicitly pending, never fabricated.",
    "",
    "## Risks, controls, and rollback",
    "",
    "- Changes repository documentation contracts, authority exclusion, and shared tooling used by every later package.",
    "",
    "## Project-level acceptance criteria",
    "",
    ...PARENT_CRITERIA.map((text, i) => parentCriterion(i + 1, text)),
    "",
    "## Delivery Graph",
    "",
    "P1 establishes governance, inventory, evidence, and shared validation. P2 through P6 depend only on their declared predecessors. Native sub-issues identify the six tickets; native blocking relationships enforce this graph.",
    "",
    "## Out of Scope",
    "",
    "No production runtime, live provider work, or unrelated application work.",
    "",
    "## Further Notes",
    "",
    "Record the implemented revision, verification outcomes, and remaining limitations in the tracker, not the repository.",
    "",
  ].join("\n");
}

function ticketCriterion(n: number, text: string): string {
  return `- [ ] \`AC-${n}\`: ${text}`;
}

const TICKET_CRITERIA: readonly string[] = [
  "The approved local governance change is implemented with an append-only decision, affected seam and policy updates, and tests; the shared skill stays unchanged.",
  "Baseline state, evaluated revision, environment limits, and the missing-policy reference failure are recorded; the deliberate deletion is respected.",
  "Independent reconstruction covers every required inventory category and records current, disabled, reserved, and absent behavior.",
  "All required study records exist with substantive foundation material; later-result sections are explicitly pending, never fabricated.",
  "Stable subject IDs, evidence kinds, verification states, and the content contract are defined and validated.",
  "The benchmark rubric, reader tasks, holdout protocol, and observation format are fixed before broad drafting.",
  "Focused fixtures prove path validation, authority exclusion, discovery, coverage, duplicate rejection, and freshness failure.",
  "The manual hierarchy provides a stable structure and a representative article establishes the content contract.",
  "Shared validation tooling is runnable before sibling authors start, with locked dependencies and focused failure fixtures.",
] as const;

/** Ticket body in the alternate template: `## Parent` plus inline fields. */
export function incidentTicketBody(): string {
  return [
    "## Parent",
    "",
    "https://github.com/owner/eScraper-Business-Brokers-for-Seacher-Insights/issues/287",
    "",
    "The parent specification's shared contracts, page requirements, study artifacts, review protocol, risks, and non-goals apply in full.",
    "",
    "## Blocked by",
    "",
    "None (can start immediately).",
    "",
    "Risk: **high-risk**. Changes repository documentation contracts, authority exclusion, freshness, and shared tooling used by every later package.",
    "",
    "Affected seams: documentation, human-docs, types, persistence, find, api, auth, integrations, ui, validate, enrich, research, compose, pipeline, control.",
    "",
    "## What to build",
    "",
    "Establish a mechanically checked, current-state evidence model and the local governance needed for this benchmark.",
    "",
    "## Acceptance criteria",
    "",
    ...TICKET_CRITERIA.map((text, i) => ticketCriterion(i + 1, text)),
    "",
    "Smallest verification: existing docs and orientation tests plus targeted contract fixtures. No production runtime or live provider work is needed for this package.",
    "",
    "Prerequisites: none. Overlap: this package alone establishes the shared contracts and the complete denominator of subjects.",
    "",
    "## Orientation evidence",
    "",
    "Task band: ordinary. Resolved source count: 17. Cache-gap state: none.",
    "",
    "## Completion record",
    "",
    "Record the implemented revision, verification commands and outcomes, independent review findings, and remaining limitations. Do not report skipped checks as passing.",
    "",
  ].join("\n");
}

/**
 * The legacy pin the fixture PR body carries. Well-formed but not a hash of
 * the fixture bodies under the current parser; it stands for an
 * old-parser pin whose preimage predates ADR-0038 parsing.
 */
export const INCIDENT_LEGACY_PIN =
  "requirements-v1:parent=eb3670aa4f1f8da6ba4c1266e2dbfee87969f8ab9a534fd4771b0f6d8ee7938c;ticket=12e605494b147dc8444175c76c71275b7043613c8694d9a2448e45c55694835a";

function prEvidenceEntry(n: number): string[] {
  const text = TICKET_CRITERIA[n - 1];
  return [
    `- **Criterion:** \`AC-${n}\` — ${text}`,
    "  - Focused command: `node scripts/docs-check.mjs`",
    "  - Passed: true",
    "  - Result: focused fixture checks passed",
  ];
}

// --- PR #295 automatic-recovery fixtures (distinct from the #294 legacy case) --
//
// #295 closes the same ticket #288 under parent #287, but its evidence block
// carries a same-version `requirements-adapted-v1` stale pin (not a legacy
// `requirements-v1` pin) with an unchanged head and currently resolvable
// parent/ticket bodies. Policy: root REVIEW.md absent at both revisions;
// the head proposes changes to three governing sources, covered by three
// scoped owner exceptions in the matching decision.

export const INCIDENT_295_PR_NUMBER = 295;
export const INCIDENT_295_HEAD_SHA = "ca77a40823c48ddfbaee537255bbbf54446cc917";
export const INCIDENT_295_BASE_SHA = "363fe3b0a00ffed6af4e30b6fcec26386eb84cd0";
export const INCIDENT_295_DECISION_COMMENT_ID = "5605141890";
export const INCIDENT_295_DECISION_BODY =
  "Owner approval for PR #295: scoped repository-local exceptions for docs/adr/0041-benchmark-governance-human-manual-study.md, docs/seams/documentation.md, and scripts/docs-check.mjs. Base and head pins verified; requirements revision verified. No general approval; all other proposed governing changes remain blocking.";

export const INCIDENT_295_EXCEPTION_SCOPE: readonly string[] = [
  "docs/adr/0041-benchmark-governance-human-manual-study.md",
  "docs/seams/documentation.md",
  "scripts/docs-check.mjs",
];

export function incident295BaseSources(): { path: string; hash: string }[] {
  return [];
}

export function incident295HeadSources(): { path: string; hash: string }[] {
  return [
    { path: "docs/adr/0041-benchmark-governance-human-manual-study.md", hash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2" },
    { path: "docs/seams/documentation.md", hash: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3" },
    { path: "scripts/docs-check.mjs", hash: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4" },
  ];
}

/** PR body with a nine-entry evidence-v2 block pinned to the legacy value. */
export function incidentPullRequestBody(): string {
  const lines: string[] = [
    "P1 — Governed reconstruction and evidence foundation for the documentation benchmark (spec #287).",
    "",
    "Ships the append-only governance decision with gate extensions, the audience manual hierarchy, and the shared validation tooling.",
    "",
    "<!-- ruralnative:compact-evidence:start -->",
    "## Implementation evidence",
    "",
  ];
  for (let n = 1; n <= 9; n++) lines.push(...prEvidenceEntry(n));
  lines.push(
    "",
    "- Criteria revision: criteria-v1:AC-1\tactive\tThe approved local governance change is implemented with an append-only decision, affected seam and policy updates, and tests; the shared skill stays unchanged.",
    `- Requirements revision: ${INCIDENT_LEGACY_PIN}`,
    "- Envelope version: evidence-v2",
    `- Head SHA: ${INCIDENT_PR_HEAD_SHA}`,
    "<!-- ruralnative:compact-evidence:end -->",
    "",
    "Closes #288",
    "",
  );
  return lines.join("\n");
}
