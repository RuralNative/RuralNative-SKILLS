// Authored source of the pure workflow state core (single-target production
// workflows, ADR-0031).
// scripts/generate-workflow-state.ts copies this file byte-identical into
// skills/plan-this/, skills/implement-this/, and skills/review-this/ so each
// registry install is self-contained. Edit this file, run the generator, and
// commit both; repository verification fails when a copy drifts.
//
// Purity contract: facts in, decisions out. No imports and no network,
// GitHub, git, filesystem-mutation, or worker-management calls. No Agent
// Manager, worktree, worker-cap, polling, cloud, or wave concepts live here:
// both production commands run one target in the current checkout.

export const MAX_FIX_ROUNDS = 1;

export const LABEL_READY_FOR_AGENT = "ready-for-agent";
export const LABEL_BLOCKED = "blocked";
export const LABEL_UNBLOCKED = "unblocked";
export const LABEL_NEEDS_INFO = "needs-info";
export const LABEL_READY_FOR_HUMAN = "ready-for-human";

export interface TicketFact {
  number: number;
  state: "open" | "closed";
  labels: string[];
  assignees: string[];
  parent: number | null;
  openBlockers: number[];
}

/** Stable acceptance-criterion identity (parent #183, ticket #188). */
export type CriterionStatus = "active" | "retired";

export interface AcceptanceCriterion {
  /** Issue-scoped local ID, e.g. `AC-1`. Unique within one issue. */
  id: string;
  text: string;
  status: CriterionStatus;
}

export const CRITERION_REVISION_VERSION = "criteria-v1";

/**
 * The stable key of one acceptance criterion: the authority issue number plus
 * its local ID. Two issues may use `AC-1` safely because the key differs.
 */
export function criterionKey(issue: number, id: string): string {
  return `#${issue}:${id}`;
}

const CRITERION_LINE =
  /^\s*-\s*(?:~~)?`?([A-Za-z]{2,3}-\d+)`?(?:~~)?\s*(?:\(retired\))\s*:\s*(.+)$/;
const ACTIVE_CRITERION_LINE = /^\s*-\s*`?([A-Za-z]{2,3}-\d+)`?\s*:\s*(.+)$/;

/**
 * Parse the published acceptance-criteria bullets of one issue body.
 * An active bullet is `- \`AC-1\`: text`; a retired bullet carries a
 * `(retired)` marker, e.g. `- \`AC-2\` (retired): old text`.
 */
export function parseAcceptanceCriteria(body: string): AcceptanceCriterion[] {
  const criteria: AcceptanceCriterion[] = [];
  for (const line of body.split("\n")) {
    const retired = line.match(CRITERION_LINE);
    if (retired) {
      criteria.push({ id: retired[1], text: retired[2].trim(), status: "retired" });
      continue;
    }
    const active = line.match(ACTIVE_CRITERION_LINE);
    if (active) {
      criteria.push({ id: active[1], text: active[2].trim(), status: "active" });
    }
  }
  return criteria;
}

/**
 * Local uniqueness within one issue: the same ID never appears twice (active
 * or retired), so a retired ID is never reused or renumbered. Retired records
 * are legitimate carriers of the retired status; they stay in the revision.
 */
export function validateCriterionRecords(
  criteria: readonly AcceptanceCriterion[],
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const idShape = /^[A-Za-z]{2,3}-\d+$/;
  for (const criterion of criteria) {
    if (!idShape.test(criterion.id)) {
      errors.push(`malformed criterion id: ${criterion.id}`);
      continue;
    }
    if (seen.has(criterion.id)) {
      errors.push(`duplicate or reused criterion id within the issue: ${criterion.id}`);
      continue;
    }
    seen.add(criterion.id);
  }
  return errors;
}

/**
 * Versioned requirements revision over the criterion records. A wording
 * clarification keeps the local ID but changes this revision; changed
 * observable behavior carries a new ID and retires the old one.
 */
export function criteriaRevision(criteria: readonly AcceptanceCriterion[]): string {
  const canonical = [...criteria]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => `${c.id}\t${c.status}\t${c.text.trim().replace(/\s+/g, " ")}`)
    .join("\n");
  return `${CRITERION_REVISION_VERSION}:${canonical}`;
}

export function activeCriteria(
  criteria: readonly AcceptanceCriterion[],
): AcceptanceCriterion[] {
  return criteria.filter((c) => c.status === "active");
}

/**
 * Versioned requirements revision (parent #183, ticket #190).
 *
 * A fingerprint over the normalized authoritative sections of the parent
 * specification and ticket bodies: affected seams, criterion IDs/text/status,
 * structural constraints, blockers, settled decisions, risk, and verification
 * intent. SHA-256 comes from the standard library; this core stays
 * import-free, so callers pass the hasher. Comments, acceptance evidence,
 * timings, paths, branches, commit SHAs, and runtime output never enter the
 * fingerprint. Section lists keep body order, so an ordering change is never
 * hidden; line endings and insignificant trailing whitespace normalize.
 */
export const REQUIREMENTS_REVISION_VERSION = "requirements-v1";

export type RevisionHasher = (canonicalText: string) => string;

/** One versioned revision: a contract version plus separate parent and ticket fingerprints. */
export interface RequirementsRevision {
  version: string;
  parent: string;
  ticket: string;
}

/** The canonical authoritative sections a fingerprint is built from. */
export interface AuthoritativeSections {
  affectedSeams: string[];
  criteria: AcceptanceCriterion[];
  constraints: string[];
  blockers: string[];
  settledDecisions: string[];
  risk: string[];
  verificationIntent: string[];
}

const SECTION_HEADERS = {
  affectedSeams: "## Affected seams",
  criteria: "## Acceptance criteria",
  constraints: "## Structural constraints",
  blockers: "## Blocked by",
  settledDecisions: "## Settled decisions",
  solution: "## Solution",
  risk: "## Risk",
  verificationSufficient: "## Smallest sufficient verification",
  verificationTestFirst: "## Smallest test-first verification",
} as const;

function normalizedBodyLines(body: string): string[] {
  return body
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""));
}

function sectionContent(
  lines: readonly string[],
  header: string,
  alternativeHeader?: string,
): string[] {
  const start = lines.findIndex(
    (line) => line.trim() === header || line.trim() === alternativeHeader,
  );
  if (start < 0) return [];
  const content: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) break;
    const trimmed = line.trim();
    if (trimmed === "") continue;
    content.push(trimmed.replace(/^-\s+/, ""));
  }
  return content;
}

/** Section lines with bullet markers intact, e.g. for the criteria parser. */
function rawSectionContent(
  lines: readonly string[],
  header: string,
): string[] {
  const start = lines.findIndex((line) => line.trim() === header);
  if (start < 0) return [];
  const content: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) break;
    const trimmed = line.trim();
    if (trimmed === "") continue;
    content.push(trimmed);
  }
  return content;
}

function bulletLines(lines: readonly string[], header: string): string[] {
  return sectionContent(lines, header);
}

/**
 * Extract the authoritative sections of one issue body. Only the seven
 * named categories enter the fingerprint; every other section (behavior
 * prose, evidence, paths, branches) is excluded, so requirement text and
 * ordering changes inside the named sections always change the revision and
 * everything else never does.
 */
export function parseAuthoritativeSections(body: string): AuthoritativeSections {
  const lines = normalizedBodyLines(body);
  const criteriaText = rawSectionContent(lines, SECTION_HEADERS.criteria).join("\n");
  return {
    affectedSeams: bulletLines(lines, SECTION_HEADERS.affectedSeams),
    criteria: parseAcceptanceCriteria(criteriaText),
    constraints: bulletLines(lines, SECTION_HEADERS.constraints),
    blockers: bulletLines(lines, SECTION_HEADERS.blockers),
    settledDecisions: sectionContent(
      lines,
      SECTION_HEADERS.settledDecisions,
      SECTION_HEADERS.solution,
    ),
    risk: bulletLines(lines, SECTION_HEADERS.risk),
    verificationIntent: sectionContent(
      lines,
      SECTION_HEADERS.verificationSufficient,
      SECTION_HEADERS.verificationTestFirst,
    ),
  };
}

/**
 * Deterministic canonical serialization of the authoritative sections.
 * Criteria sort by local ID like `criteriaRevision`; every other list keeps
 * body order so ordering changes stay visible. A contract version line heads
 * the text, so a canonical-format change also changes every fingerprint.
 */
export function canonicalRequirementsText(sections: AuthoritativeSections): string {
  const canonical = {
    affectedSeams: [...sections.affectedSeams],
    criteria: [...sections.criteria]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((c) => ({
        id: c.id,
        status: c.status,
        text: c.text.trim().replace(/\s+/g, " "),
      })),
    constraints: [...sections.constraints],
    blockers: [...sections.blockers],
    settledDecisions: [...sections.settledDecisions],
    risk: [...sections.risk],
    verificationIntent: [...sections.verificationIntent],
  };
  return `${REQUIREMENTS_REVISION_VERSION}\n${JSON.stringify(canonical)}`;
}

export function requirementsRevision(
  parentBody: string,
  ticketBody: string,
  hash: RevisionHasher,
): RequirementsRevision {
  return {
    version: REQUIREMENTS_REVISION_VERSION,
    parent: hash(canonicalRequirementsText(parseAuthoritativeSections(parentBody))),
    ticket: hash(canonicalRequirementsText(parseAuthoritativeSections(ticketBody))),
  };
}

/** One stable carrier string so dispatch and review packets compare the same value. */
export function requirementsRevisionValue(rev: RequirementsRevision): string {
  return `${REQUIREMENTS_REVISION_VERSION}:parent=${rev.parent};ticket=${rev.ticket}`;
}

/**
 * Raw equality of two revision carrier values. An absent or blank pin never
 * matches: a missing pin is not proof that the bodies are current.
 */
export function requirementsMatch(dispatched: string, current: string): boolean {
  if (dispatched.trim() === "" || current.trim() === "") return false;
  return dispatched === current;
}

/** True when a requirements carrier is present and well formed. */
export function requirementsPinWellFormed(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (value.trim() === "") return false;
  return new RegExp(
    `^${REQUIREMENTS_REVISION_VERSION}:parent=[a-f0-9]{64};ticket=[a-f0-9]{64}$`,
  ).test(value);
}

export interface RequirementsGateDecision {
  action: "continue" | "stop";
  addLabels: readonly string[];
  reason: string;
}

/**
 * The requirements gate. A mismatch stops and records `needs-info`; there is
 * no waiver path. Only reconciling the issue bodies changes the input.
 */
export function requirementsGate(
  dispatched: string,
  current: string,
): RequirementsGateDecision {
  if (dispatched === current) {
    return {
      action: "continue",
      addLabels: [],
      reason: "the issue bodies still match the pinned requirements revision",
    };
  }
  return {
    action: "stop",
    addLabels: [LABEL_NEEDS_INFO],
    reason:
      "the parent or ticket body changed after the pin; reconcile the issue bodies and resume explicitly",
  };
}

export interface LabelTransition {
  number: number;
  add: string[];
  remove: string[];
}

function isOpen(ticket: TicketFact): boolean {
  return ticket.state === "open";
}

function hasLabel(ticket: TicketFact, label: string): boolean {
  return ticket.labels.includes(label);
}

function isStopped(ticket: TicketFact): boolean {
  return hasLabel(ticket, LABEL_NEEDS_INFO);
}

export function labelTransitions(
  tickets: readonly TicketFact[],
  spec: number,
): LabelTransition[] {
  const transitions: LabelTransition[] = [];
  for (const ticket of tickets) {
    if (!isOpen(ticket) || isStopped(ticket)) continue;
    if (ticket.openBlockers.length > 0) {
      const add = hasLabel(ticket, LABEL_BLOCKED) ? [] : [LABEL_BLOCKED];
      const remove = [LABEL_READY_FOR_AGENT, LABEL_UNBLOCKED].filter((label) =>
        hasLabel(ticket, label),
      );
      if (add.length > 0 || remove.length > 0) {
        transitions.push({ number: ticket.number, add, remove });
      }
    } else if (hasLabel(ticket, LABEL_BLOCKED)) {
      const add = [LABEL_UNBLOCKED, LABEL_READY_FOR_AGENT].filter(
        (label) => !hasLabel(ticket, label),
      );
      transitions.push({
        number: ticket.number,
        add,
        remove: [LABEL_BLOCKED],
      });
    } else if (
      ticket.parent === spec &&
      ticket.assignees.length === 0 &&
      !hasLabel(ticket, LABEL_READY_FOR_AGENT)
    ) {
      transitions.push({
        number: ticket.number,
        add: [LABEL_READY_FOR_AGENT],
        remove: [],
      });
    }
  }
  return transitions;
}

/**
 * User-managed parallel safety for `plan-this` publication: the open,
 * unassigned, unblocked, ready children of one specification in native child
 * order. No worker cap lives here; the user chooses the checkout strategy.
 */
export function selectFrontier(
  tickets: readonly TicketFact[],
  spec: number,
): number[] {
  return tickets
    .filter(
      (t) =>
        isOpen(t) &&
        t.parent === spec &&
        t.openBlockers.length === 0 &&
        t.assignees.length === 0 &&
        !isStopped(t) &&
        hasLabel(t, LABEL_READY_FOR_AGENT),
    )
    .map((t) => t.number);
}

export interface SingleTicketValidation {
  ok: boolean;
  violations: string[];
}

/**
 * Single-target validation for `/implement-this`: exactly one open,
 * unblocked, unassigned implementation ticket carrying `ready-for-agent`.
 * Parent specifications are rejected here; the caller reports the diagnostic.
 */
export function validateSingleTicket(
  ticket: TicketFact | undefined,
  ticketNumber: number,
  linkedParent?: TicketFact,
): SingleTicketValidation {
  const violations: string[] = [];
  if (!ticket) {
    return { ok: false, violations: [`#${ticketNumber} was not found`] };
  }
  if (ticket.parent === null) {
    violations.push(`#${ticketNumber} has no linked parent specification`);
  } else if (!linkedParent || linkedParent.number !== ticket.parent) {
    violations.push(`#${ticketNumber}'s linked parent specification was not observed`);
  }
  if (!isOpen(ticket)) violations.push(`#${ticketNumber} is closed`);
  if (isStopped(ticket)) violations.push(`#${ticketNumber} is stopped with ${LABEL_NEEDS_INFO}`);
  if (ticket.openBlockers.length > 0) {
    violations.push(`#${ticketNumber} has open native blockers`);
  }
  if (ticket.assignees.length > 0) {
    violations.push(`#${ticketNumber} already has an assignee`);
  }
  if (!hasLabel(ticket, LABEL_READY_FOR_AGENT)) {
    violations.push(`#${ticketNumber} does not carry ${LABEL_READY_FOR_AGENT}`);
  }
  return { ok: violations.length === 0, violations };
}

export function reviewIsFresh(
  currentHeadSha: string,
  reviewedHeadSha: string,
  currentBaseSha?: string,
  reviewedBaseSha?: string,
): boolean {
  if (currentHeadSha.trim() === "" || currentHeadSha !== reviewedHeadSha) return false;
  if (
    currentBaseSha === undefined ||
    reviewedBaseSha === undefined ||
    currentBaseSha.trim() === "" ||
    reviewedBaseSha.trim() === ""
  ) return false;
  return currentBaseSha === reviewedBaseSha;
}

export interface FixRoundDecision {
  allowed: boolean;
  consumesRound: boolean;
  reason: string;
}

/**
 * At most one automatic code-fix round per pull request. A conflict-free base
 * refresh or infrastructure retry never consumes the round; anything else
 * does, and a second code change is a stop with a pinned report.
 */
export function fixRoundDecision(roundsUsed: number): FixRoundDecision {
  if (roundsUsed >= MAX_FIX_ROUNDS) {
    return {
      allowed: false,
      consumesRound: true,
      reason: `at most ${MAX_FIX_ROUNDS} automatic code-fix round is allowed per pull request`,
    };
  }
  return {
    allowed: true,
    consumesRound: true,
    reason: "one bounded automatic fix round",
  };
}

export interface PullRequestFact {
  headSha: string;
  /** The base revision pinned by the current pull-request facts. */
  baseSha?: string;
  mergeable: boolean;
  requiredChecksGreen: boolean;
}

export interface ReviewFact {
  reviewedHeadSha: string;
  /** The base revision examined by the current verdict. */
  reviewedBaseSha?: string;
  unresolvedConfirmedFindings: number;
  localReviewClean: boolean;
  trustedSummaryUpdated: boolean;
  inlineFindingsVerified: boolean;
  /**
   * The current issue bodies still match the requirements revision the
   * review pinned. A body edit invalidates the verdict.
   */
  requirementsCurrent: boolean;
  /**
   * Full local gate result when run once as the approved broad-verification
   * fallback. Required checks must still be green; the fallback never excuses
   * failed required checks and applies only when no equivalent CI exists.
   */
  localFallbackPassed?: boolean | null;
  /** False when repository policy maps no required check to the full gate. */
  equivalentCiEstablished?: boolean;
}

export interface MergeDecision {
  eligible: boolean;
  blockers: string[];
}

export function isMergeEligible(
  pullRequest: PullRequestFact,
  review: ReviewFact,
): MergeDecision {
  const blockers: string[] = [];
  const checksOk =
    pullRequest.requiredChecksGreen &&
    (review.equivalentCiEstablished === true ||
      (review.equivalentCiEstablished === false && review.localFallbackPassed === true));
  if (!checksOk) {
    blockers.push("required checks are not green");
  }
  if (review.unresolvedConfirmedFindings > 0) {
    blockers.push("confirmed findings are unresolved");
  }
  if (!review.localReviewClean) {
    blockers.push("local review is not clean");
  }
  if (review.trustedSummaryUpdated === false) {
    blockers.push("trusted review summary was not published");
  }
  if (review.inlineFindingsVerified === false) {
    blockers.push("inline findings were not verified");
  }
  if (review.requirementsCurrent === false) {
    blockers.push(
      "the requirements revision no longer matches the current issue bodies",
    );
  }
  if (pullRequest.headSha !== review.reviewedHeadSha) {
    blockers.push("reviewed head SHA does not match the current head SHA");
  }
  if (
    pullRequest.baseSha === undefined ||
    review.reviewedBaseSha === undefined ||
    !reviewIsFresh(
      pullRequest.headSha,
      review.reviewedHeadSha,
      pullRequest.baseSha,
      review.reviewedBaseSha,
    )
  ) {
    blockers.push("reviewed base SHA does not match the current base SHA");
  }
  if (!pullRequest.mergeable) {
    blockers.push("pull request is not mergeable");
  }
  return {
    eligible: blockers.length === 0,
    blockers,
  };
}

/**
 * Direct dependent promotion only: after one ticket closes, update exactly
 * the children of the specification whose final open native blocker closed.
 * Tickets parented elsewhere are never promoted here. No wave, no next
 * review launch.
 */
export interface NativeDependencyEdge {
  blocked: number;
  blockedBy: number;
}

export function promotionAfterClosure(
  tickets: readonly TicketFact[],
  spec: number,
  closedTicket: number,
  dependencies: readonly NativeDependencyEdge[],
): LabelTransition[] {
  const parents = new Map(tickets.map((t) => [t.number, t.parent] as const));
  const directDependents = new Set(
    dependencies
      .filter((edge) => edge.blockedBy === closedTicket)
      .map((edge) => edge.blocked),
  );
  return labelTransitions(tickets, spec).filter(
    (t) =>
      t.remove.includes(LABEL_BLOCKED) &&
      parents.get(t.number) === spec &&
      directDependents.has(t.number),
  );
}

/**
 * The linked parent closes only when a confirmed non-empty child set is
 * fully closed. An empty or partial enumeration never closes. No
 * verification run lives here.
 */
export interface ParentClosureFact {
  children: readonly TicketFact[];
  enumerationComplete: boolean;
}

export function parentClosureReady(fact: ParentClosureFact): boolean {
  return (
    fact.enumerationComplete &&
    fact.children.length > 0 &&
    fact.children.every((child) => child.state === "closed")
  );
}

export interface TrustedVerdictKey {
  prNumber: number;
  headSha: string;
  baseSha: string;
  requirementsRevision: string;
  reviewPolicyRevision: string;
}

/** One stable carrier string for the reusable review verdict. */
export function verdictKeyValue(key: TrustedVerdictKey): string {
  return `pr=${key.prNumber};head=${key.headSha};base=${key.baseSha};requirements=${key.requirementsRevision};policy=${key.reviewPolicyRevision}`;
}

/** Reuse a pinned verdict only when every key is unchanged. */
export function verdictReusable(
  pinned: TrustedVerdictKey,
  current: TrustedVerdictKey,
): boolean {
  const complete = (key: TrustedVerdictKey): boolean =>
    Number.isInteger(key.prNumber) &&
    key.prNumber > 0 &&
    key.headSha.trim() !== "" &&
    key.baseSha.trim() !== "" &&
    key.requirementsRevision.trim() !== "" &&
    key.reviewPolicyRevision.trim() !== "";
  if (!complete(pinned) || !complete(current)) return false;
  return verdictKeyValue(pinned) === verdictKeyValue(current);
}

// ---------------------------------------------------------------------------
// Shared planning/implementation/review handoff contract (ADR-0034).
//
// Planning owns validated parent/ticket bodies. Implementation owns the PR
// body and its evidence envelope. Review consumes that envelope and never
// repairs it. Each packaged skill carries this file byte-identical, so the
// same validator runs on both sides of the handoff without cross-skill
// imports.
// ---------------------------------------------------------------------------

/** Evidence envelope versions understood by this contract. */
export const EVIDENCE_ENVELOPE_VERSION = "evidence-v2";
const EVIDENCE_ENVELOPE_V1 = "evidence-v1";

export const REVIEW_CONTRACT_VERSION = "review-contract-v1";

export type EvidenceHandoffStatus =
  | "current"
  | "missing"
  | "malformed"
  | "unsupported-version"
  | "stale";

export interface ParsedEvidenceHandoff {
  /** True when exactly one compact evidence block was found. */
  found: boolean;
  /** Envelope version line, or v1 when the block predates the version line. */
  envelopeVersion: string | null;
  /** Requirements carrier extracted from the block, if any. */
  requirementsRevision: string | null;
  /** Head SHA the evidence was bound to, if any. */
  headSha: string | null;
}

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

const COMPACT_START = "<!-- ruralnative:compact-evidence:start -->";
const COMPACT_END = "<!-- ruralnative:compact-evidence:end -->";

function escapeHandoffRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parse the evidence envelope out of a pull-request body. Accepts LF and
 * CRLF. Returns `found: false` when no compact block exists. A block whose
 * markers repeat is reported through `validateEvidenceHandoff`, not here.
 */
export function parseEvidenceHandoff(body: string): ParsedEvidenceHandoff {
  const normalized = normalizeNewlines(body);
  const pattern = new RegExp(
    `${escapeHandoffRegExp(COMPACT_START)}[ \t]*\n([\u0000-\uFFFF]*?)\n[ \t]*${escapeHandoffRegExp(COMPACT_END)}`,
  );
  const match = normalized.match(pattern);
  if (!match) return { found: false, envelopeVersion: null, requirementsRevision: null, headSha: null };
  const inner = match[1];
  const versionMatch = inner.match(/^[ \t]*-[ \t]*Envelope version:[ \t]*(.*?)[ \t]*$/m);
  const revisionMatch = inner.match(/^[ \t]*-[ \t]*Requirements revision:[ \t]*(.*?)[ \t]*$/m);
  const headMatch = inner.match(/^[ \t]*-[ \t]*Head SHA:[ \t]*(.*?)[ \t]*$/m);
  const versionRaw = versionMatch ? versionMatch[1].trim() : "";
  const revisionRaw = revisionMatch ? revisionMatch[1].trim() : "";
  const headRaw = headMatch ? headMatch[1].trim() : "";
  return {
    found: true,
    envelopeVersion: versionRaw !== "" ? versionRaw : EVIDENCE_ENVELOPE_V1,
    requirementsRevision: revisionRaw !== "" ? revisionRaw : null,
    headSha: headRaw !== "" ? headRaw : null,
  };
}

function metadataValues(inner: string, label: string): string[] {
  const pattern = new RegExp(`^[ \\t]*-[ \\t]*${escapeHandoffRegExp(label)}[ \\t]*:(.*)$`, "gm");
  const values: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(inner)) !== null) values.push((m[1] ?? "").trim());
  return values;
}

function validateEvidenceProof(inner: string): string | null {
  const headerPattern = /^.*\*\*Criterion:\*\*.*$/gm;
  const headers = inner.match(headerPattern) ?? [];
  if (headers.length === 0) {
    return "evidence block carries no criterion proof; reconcile implementation evidence outside review";
  }
  const lines = inner.split("\n");
  const headerIndexes: number[] = [];
  lines.forEach((line, i) => {
    if (/\*\*Criterion:\*\*/.test(line)) headerIndexes.push(i);
  });
  const criteriaEnd = lines.findIndex((line) => /^[ \t]*-[ \t]*Criteria revision:/.test(line));
  const end = criteriaEnd >= 0 ? criteriaEnd : lines.length;
  for (let h = 0; h < headerIndexes.length; h++) {
    const start = headerIndexes[h];
    const stop = h + 1 < headerIndexes.length ? headerIndexes[h + 1] : end;
    const segment = lines.slice(start, stop).join("\n");
    if (!/`[A-Za-z]{2,3}-\d+`/.test(segment)) {
      return "evidence block carries a criterion without a stable ID; reconcile implementation evidence outside review";
    }
    const hasBehaviorCommand = /Focused command:[ \t]*\S/.test(segment);
    const hasPassedTrue = /Passed:[ \t]*true/i.test(segment);
    const hasResult = /Result:[ \t]*\S/.test(segment);
    const hasCheck = /Check:[ \t]*\S/.test(segment);
    if (/Passed:\s*false/i.test(segment)) {
      return "evidence block records a non-passing result; reconcile implementation evidence outside review";
    }
    const behaviorComplete = hasBehaviorCommand && hasPassedTrue && hasResult;
    if (!behaviorComplete && !hasCheck) {
      return "evidence block carries incomplete criterion proof; reconcile implementation evidence outside review";
    }
  }
  const criteriaValues = metadataValues(inner, "Criteria revision");
  if (criteriaValues.length !== 1 || criteriaValues[0] === "") {
    return "evidence block carries no criteria revision; reconcile implementation evidence outside review";
  }
  if (!criteriaValues[0].startsWith("criteria-v1:")) {
    return "evidence block carries a malformed criteria revision; reconcile implementation evidence outside review";
  }
  return null;
}

/** Count compact evidence blocks in a body (LF/CRLF tolerant). */
export function countEvidenceBlocks(body: string): number {
  const normalized = normalizeNewlines(body);
  const pattern = new RegExp(
    `${escapeHandoffRegExp(COMPACT_START)}[ \t]*\n([\u0000-\uFFFF]*?)\n[ \t]*${escapeHandoffRegExp(COMPACT_END)}`,
    "g",
  );
  return [...normalized.matchAll(pattern)].length;
}

export interface EvidenceHandoffCheck {
  /** Raw pull-request body. */
  body: string;
  /** Current requirements carrier recomputed from parent and ticket bodies. */
  currentRequirementsRevision: string;
  /** Current pull-request head SHA, when known. */
  currentHeadSha?: string;
  /**
   * Positive provenance for evidence that predates the revision contract.
   * Absence of a pin is never provenance on its own.
   */
  legacyProvenance?: boolean;
}

export interface EvidenceHandoffResult {
  status: EvidenceHandoffStatus;
  reason: string;
}

/**
 * Shared implementation/review gate over the PR body. Both sides reject a
 * missing pin, a malformed carrier, an unknown envelope version, stale
 * requirements, and (for v2 envelopes) proof bound to another head. Legacy
 * evidence without a pin passes only with explicit `legacyProvenance: true`.
 */
const LEGACY_START = "<!-- ruralnative:acceptance-evidence:start -->";
const LEGACY_END = "<!-- ruralnative:acceptance-evidence:end -->";

function hasLegacyEvidenceBlock(body: string): boolean {
  const normalized = normalizeNewlines(body);
  return normalized.includes(LEGACY_START) && normalized.includes(LEGACY_END);
}

function hasStrayEvidenceMarkers(body: string): boolean {
  const normalized = normalizeNewlines(body);
  const starts = normalized.split(COMPACT_START).length - 1;
  const ends = normalized.split(COMPACT_END).length - 1;
  return starts !== ends || starts !== countEvidenceBlocks(body);
}

export function validateEvidenceHandoff(check: EvidenceHandoffCheck): EvidenceHandoffResult {
  if (hasStrayEvidenceMarkers(check.body)) {
    return { status: "malformed", reason: "stray or unbalanced compact evidence markers in the pull-request body" };
  }
  const blocks = countEvidenceBlocks(check.body);
  if (blocks === 0) {
    if (check.legacyProvenance === true && hasLegacyEvidenceBlock(check.body)) {
      return { status: "current", reason: "legacy evidence with established pre-contract provenance" };
    }
    return {
      status: "missing",
      reason: "no compact evidence block in the pull-request body; reconcile implementation evidence outside review",
    };
  }
  if (blocks > 1) {
    return { status: "malformed", reason: "multiple compact evidence blocks in the pull-request body" };
  }
  const parsed = parseEvidenceHandoff(check.body);
  const inner = (() => {
    const normalized = normalizeNewlines(check.body);
    const pattern = new RegExp(
      `${escapeHandoffRegExp(COMPACT_START)}[ \t]*\n([\u0000-\uFFFF]*?)\n[ \t]*${escapeHandoffRegExp(COMPACT_END)}`,
    );
    return normalized.match(pattern)?.[1] ?? "";
  })();
  const versionValues = metadataValues(inner, "Envelope version");
  if (versionValues.length > 1) {
    return { status: "malformed", reason: "duplicate envelope version lines in the evidence block" };
  }
  if (versionValues.length === 1 && versionValues[0] === "") {
    return { status: "malformed", reason: "evidence envelope version is empty" };
  }
  const requirementValues = metadataValues(inner, "Requirements revision");
  if (requirementValues.length > 1) {
    return { status: "malformed", reason: "duplicate requirements revision lines in the evidence block" };
  }
  const headValues = metadataValues(inner, "Head SHA");
  if (headValues.length > 1) {
    return { status: "malformed", reason: "duplicate head SHA lines in the evidence block" };
  }
  if (parsed.envelopeVersion !== EVIDENCE_ENVELOPE_VERSION && parsed.envelopeVersion !== EVIDENCE_ENVELOPE_V1) {
    return {
      status: "unsupported-version",
      reason: `unsupported evidence envelope ${parsed.envelopeVersion ?? "unknown"}; upgrade the producing skill before review`,
    };
  }
  if (!parsed.requirementsRevision) {
    if (requirementValues.length === 1) {
      return { status: "malformed", reason: "evidence requirements revision is malformed" };
    }
    if (check.legacyProvenance === true && parsed.envelopeVersion === EVIDENCE_ENVELOPE_V1) {
      return { status: "current", reason: "legacy evidence with established pre-contract provenance" };
    }
    return {
      status: "missing",
      reason: "evidence block carries no requirements revision; reconcile implementation evidence outside review",
    };
  }
  if (!requirementsPinWellFormed(parsed.requirementsRevision)) {
    return { status: "malformed", reason: "evidence requirements revision is malformed" };
  }
  if (!requirementsPinWellFormed(check.currentRequirementsRevision)) {
    return { status: "malformed", reason: "current requirements revision is unavailable; reconcile the issue bodies" };
  }
  if (parsed.requirementsRevision !== check.currentRequirementsRevision) {
    return {
      status: "stale",
      reason: "evidence requirements revision does not match the current parent and ticket bodies",
    };
  }
  if (parsed.envelopeVersion === EVIDENCE_ENVELOPE_V1 && versionValues.length === 0 && check.legacyProvenance !== true) {
    return { status: "malformed", reason: "evidence envelope version is missing; re-render with evidence-v2" };
  }
  if (parsed.envelopeVersion === EVIDENCE_ENVELOPE_VERSION) {
    const expectedHead = (check.currentHeadSha ?? "").trim();
    const evidenceHead = (parsed.headSha ?? "").trim();
    if (expectedHead === "") {
      return { status: "malformed", reason: "no trustworthy pull-request head to bind v2 evidence against" };
    }
    if (evidenceHead === "") {
      return { status: "malformed", reason: "v2 evidence carries no head SHA" };
    }
    if (evidenceHead !== expectedHead) {
      return { status: "stale", reason: "evidence is bound to another head SHA; rerun verification on the current head" };
    }
  } else if (headValues.length === 0 && (check.currentHeadSha ?? "").trim() !== "" && (parsed.headSha ?? "") === "") {
    // v1 without a head binding stays readable only with explicit provenance;
    // otherwise the normal proof checks below still apply.
  }
  const proofError = validateEvidenceProof(inner);
  if (proofError) {
    return { status: "malformed", reason: proofError };
  }
  return { status: "current", reason: "evidence requirements revision matches the current bodies" };
}

// --- Planning body validation ---------------------------------------------

export type PlanningRole = "parent" | "ticket";

const REQUIRED_PARENT_SECTIONS = [
  "## Affected seams",
  "## Acceptance criteria",
  "## Structural constraints",
  "## Blocked by",
  "## Solution",
  "## Risk",
] as const;

const REQUIRED_TICKET_SECTIONS = [
  "## Affected seams",
  "## Acceptance criteria",
  "## Structural constraints",
  "## Blocked by",
  "## Settled decisions",
  "## Risk",
] as const;

const VERIFICATION_HEADERS = [
  "## Smallest sufficient verification",
  "## Smallest test-first verification",
] as const;

/**
 * Validate a parent specification or ticket body before it is fingerprinted.
 * Rejects missing required sections, duplicate authoritative headings,
 * duplicate criterion IDs, and every non-canonical acceptance-section line
 * the parser would otherwise drop silently (continuations, checkboxes,
 * numbered items, plain bullets). Explicit `None` satisfies
 * applicable-but-empty sections outside acceptance criteria. Returns
 * actionable errors; an empty array means publishable.
 */
export function validateAuthoritativeBody(body: string, role: PlanningRole): string[] {
  const errors: string[] = [];
  const lines = normalizeNewlines(body).split("\n").map((line) => line.replace(/[ \t]+$/g, ""));
  const counts = new Map<string, number>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("## ")) continue;
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }
  const required = role === "parent" ? REQUIRED_PARENT_SECTIONS : REQUIRED_TICKET_SECTIONS;
  for (const section of required) {
    if ((counts.get(section) ?? 0) === 0) errors.push(`missing required section: ${section}`);
    if ((counts.get(section) ?? 0) > 1) errors.push(`duplicate section: ${section}`);
  }
  const verificationCount = VERIFICATION_HEADERS.reduce((n, h) => n + (counts.get(h) ?? 0), 0);
  if (verificationCount === 0) {
    errors.push("missing required section: ## Smallest sufficient verification or ## Smallest test-first verification");
  }
  if (verificationCount > 1) {
    errors.push("duplicate section: smallest verification intent must appear exactly once");
  }
  // Both settlement homes present is ambiguous: exactly one side owns them.
  if ((counts.get("## Solution") ?? 0) > 0 && (counts.get("## Settled decisions") ?? 0) > 0) {
    errors.push("ambiguous sections: ## Solution and ## Settled decisions must not both carry requirements");
  }
  // Duplicate authoritative headings beyond the required set are ambiguous.
  for (const [heading, n] of counts) {
    if (n > 1 && heading !== "## Acceptance criteria") {
      const known = [
        ...REQUIRED_PARENT_SECTIONS,
        ...REQUIRED_TICKET_SECTIONS,
        ...VERIFICATION_HEADERS,
      ].includes(heading as never);
      if (!known) continue;
      if (!errors.some((e) => e === `duplicate section: ${heading}`)) {
        errors.push(`duplicate section: ${heading}`);
      }
    }
  }
  if ((counts.get("## Acceptance criteria") ?? 0) > 1) {
    errors.push("duplicate section: ## Acceptance criteria");
  }

  // Criterion syntax: only canonical single-line bullets are fingerprinted.
  const criteriaStart = lines.findIndex((line) => line.trim() === "## Acceptance criteria");
  if (criteriaStart >= 0) {
    const raw: string[] = [];
    for (let i = criteriaStart + 1; i < lines.length; i++) {
      if (lines[i].startsWith("## ")) break;
      if (lines[i].trim() === "") continue;
      raw.push(lines[i]);
    }
    const seen = new Set<string>();
    for (const line of raw) {
      const trimmed = line.trim();
      const canonical =
        /^\s*-\s*(?:~~)?`?([A-Za-z]{2,3}-\d+)`?(?:~~)?\s*(?:\(retired\))\s*:\s*(.+)$/.test(line) ||
        /^\s*-\s*`?([A-Za-z]{2,3}-\d+)`?\s*:\s*(.+)$/.test(line);
      if (canonical) {
        const id = line.match(/([A-Za-z]{2,3}-\d+)/)?.[1] ?? line;
        if (seen.has(id)) errors.push(`duplicate or reused criterion id within the issue: ${id}`);
        seen.add(id);
        continue;
      }
      errors.push(`unsupported criterion line (use "- \`AC-N\`: text"): ${trimmed.slice(0, 80)}`);
    }
    if (seen.size === 0) errors.push("missing required content: ## Acceptance criteria has no criterion bullets");
  }
  return errors;
}

// --- Delivery repair eligibility -------------------------------------------

/**
 * Repair eligibility for `/implement-this`: an otherwise eligible ticket that
 * already transitioned to `ready-for-human` may continue only against exactly
 * one verified matching open PR. Requirements, blocker, needs-info,
 * ownership, and parent-link gates stay identical to initial validation.
 */
export function validateRepairTicket(
  ticket: TicketFact | undefined,
  ticketNumber: number,
  linkedParent?: TicketFact,
): SingleTicketValidation {
  const violations: string[] = [];
  if (!ticket) {
    return { ok: false, violations: [`#${ticketNumber} was not found`] };
  }
  if (ticket.parent === null) {
    violations.push(`#${ticketNumber} has no linked parent specification`);
  } else if (!linkedParent || linkedParent.number !== ticket.parent) {
    violations.push(`#${ticketNumber}'s linked parent specification was not observed`);
  }
  if (!ticket.state || ticket.state !== "open") violations.push(`#${ticketNumber} is closed`);
  if (ticket.labels.includes(LABEL_NEEDS_INFO)) {
    violations.push(`#${ticketNumber} is stopped with ${LABEL_NEEDS_INFO}`);
  }
  if (ticket.openBlockers.length > 0) {
    violations.push(`#${ticketNumber} has open native blockers`);
  }
  if (ticket.assignees.length > 0) {
    violations.push(`#${ticketNumber} already has an assignee`);
  }
  if (!ticket.labels.includes(LABEL_READY_FOR_HUMAN)) {
    violations.push(`#${ticketNumber} does not carry ${LABEL_READY_FOR_HUMAN}`);
  }
  return { ok: violations.length === 0, violations };
}

export interface RepairPrMatch {
  /** Count of matching open PRs for this ticket in the same repository. */
  matchingOpenPrs: number;
  /** The single match has the expected base (`main`). */
  baseIsMain: boolean;
  /** The single match targets the ticket (valid `Closes #<ticket>`). */
  closesTicket: boolean;
  /** Current checkout branch equals the PR head branch. */
  checkoutMatchesPrHead: boolean;
}

/** Decide whether delivery repair may proceed against the matched PR. */
export function decideRepairPath(match: RepairPrMatch): { proceed: boolean; reason: string } {
  if (match.matchingOpenPrs === 0) {
    return { proceed: false, reason: "no matching open pull request; create one through the fresh delivery path" };
  }
  if (match.matchingOpenPrs > 1) {
    return { proceed: false, reason: "multiple matching open pull requests; resolve the ambiguity outside this command" };
  }
  if (!match.closesTicket) {
    return { proceed: false, reason: "the single open pull request does not close this ticket" };
  }
  if (!match.baseIsMain) {
    return { proceed: false, reason: "the single open pull request does not target main" };
  }
  if (!match.checkoutMatchesPrHead) {
    return { proceed: false, reason: "the current checkout does not match the pull-request head branch" };
  }
  return { proceed: true, reason: "exactly one verified matching open pull request" };
}

// --- Effective review-policy revision --------------------------------------

export interface PolicySource {
  /** Stable source identity, e.g. `REVIEW.md` or `package.json:scripts.verify`. */
  path: string;
  /** Content hash or literal version string of the source. */
  hash: string;
}

/**
 * Deterministic effective-policy revision. Sorts sources so file discovery
 * order never changes the value. Absence of REVIEW.md is part of the value,
 * so adding or removing it invalidates verdict reuse.
 */
export function effectivePolicyRevision(
  sources: readonly PolicySource[],
): string {
  const canonical = [...sources]
    .map((s) => `${s.path}\t${s.hash}`)
    .sort()
    .join("\n");
  return `${REVIEW_CONTRACT_VERSION}:${canonical === "" ? "no-sources" : canonical}`;
}
