// Authored source of the pure workflow state core (#132, parent #130).
// scripts/generate-workflow-state.ts copies this file byte-identical into
// skills/plan-this/, skills/implement-this/, and skills/review-this/ so each
// registry install is self-contained. Edit this file, run the generator, and
// commit both; repository verification fails when a copy drifts.
//
// Purity contract: facts in, decisions out. No imports and no network,
// GitHub, git, filesystem-mutation, or worker-management calls, so a later
// persistent coordinator can reuse the same decisions on any host.

export const MAX_ACTIVE_WORKERS = 3;
export const MAX_FIX_ROUNDS = 2;

export const LABEL_READY_FOR_AGENT = "ready-for-agent";
export const LABEL_BLOCKED = "blocked";
export const LABEL_UNBLOCKED = "unblocked";
export const LABEL_NEEDS_INFO = "needs-info";

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
 * timing summaries, paths, branches, commit SHAs, and runtime output never
 * enter the fingerprint. Section lists keep body order, so an ordering
 * change is never hidden; line endings and insignificant trailing whitespace
 * normalize.
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
 * prose, sibling scheduling collisions, parallel safety, evidence, timings)
 * is excluded, so requirement text and ordering changes inside the named
 * sections always change the revision and everything else never does.
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

/** Raw equality of two revision carrier values. */
export function requirementsMatch(dispatched: string, current: string): boolean {
  return dispatched === current;
}

export interface RequirementsGateDecision {
  action: "continue" | "stop";
  addLabels: readonly string[];
  reason: string;
}

/**
 * The requirements gate (AC-8, AC-9). A mismatch stops and records
 * `needs-info`; there is no waiver path, so a worker or reviewer can never
 * override a mismatch. Only reconciling the issue bodies changes the input;
 * the resumed run compares the reconciled bodies against a fresh dispatch.
 */
export function requirementsGate(
  dispatched: string,
  current: string,
): RequirementsGateDecision {
  if (dispatched === current) {
    return {
      action: "continue",
      addLabels: [],
      reason: "the issue bodies still match the dispatched requirements revision",
    };
  }
  return {
    action: "stop",
    addLabels: [LABEL_NEEDS_INFO],
    reason:
      "the parent or ticket body changed after dispatch; reconcile the issue bodies and resume explicitly",
  };
}

export interface WorkerFact {
  id: string;
  ticket: number;
  status: "running" | "failed" | "offline" | "stopped";
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
  cloudReviewAvailable: boolean;
  trustedSummaryUpdated: boolean;
  inlineFindingsVerified: boolean;
  /**
   * The current issue bodies still match the requirements revision the
   * review pinned (ticket #190). A body edit invalidates the verdict.
   */
  requirementsCurrent: boolean;
}

export interface FinalVerificationFact {
  finalVerificationPassed: boolean;
  wholeSpecReviewPassed: boolean;
}

export interface LabelTransition {
  number: number;
  add: string[];
  remove: string[];
}

export interface DispatchPlan {
  dispatch: number[];
  violations: string[];
}

export interface RetryDecision {
  action: "retry" | "stop-ticket";
  addLabels: string[];
}

export interface MergeDecision {
  eligible: boolean;
  blockers: string[];
  cloudReview: "available" | "unavailable";
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

export function validateDispatch(
  requested: readonly number[],
  tickets: readonly TicketFact[],
  workers: readonly WorkerFact[],
  spec: number,
): DispatchPlan {
  const byNumber = new Map(tickets.map((t) => [t.number, t]));
  const activeWorkers = workers.filter((w) => w.status !== "stopped");
  const ownedTickets = new Map(
    activeWorkers.map((w) => [w.ticket, w.id]),
  );
  const capacity = MAX_ACTIVE_WORKERS - activeWorkers.length;
  const seen = new Set<number>();
  const dispatch: number[] = [];
  const violations: string[] = [];

  for (const n of requested) {
    const ticket = byNumber.get(n);
    if (!ticket) {
      violations.push(`#${n} is not among the observed ticket facts`);
      continue;
    }
    if (seen.has(n)) {
      violations.push(`duplicate ownership: #${n} requested twice`);
      continue;
    }
    seen.add(n);
    if (!isOpen(ticket)) {
      violations.push(`#${n} is closed`);
      continue;
    }
    if (isStopped(ticket)) {
      violations.push(`#${n} is stopped with ${LABEL_NEEDS_INFO}`);
      continue;
    }
    if (ticket.parent !== spec) {
      violations.push(`#${n} does not belong to specification #${spec}`);
      continue;
    }
    if (ticket.openBlockers.length > 0) {
      violations.push(`#${n} has open native blockers`);
      continue;
    }
    if (ticket.assignees.length > 0) {
      violations.push(`#${n} already has an assignee`);
      continue;
    }
    if (!hasLabel(ticket, LABEL_READY_FOR_AGENT)) {
      violations.push(`#${n} does not carry ${LABEL_READY_FOR_AGENT}`);
      continue;
    }
    const ownerId = ownedTickets.get(n);
    if (ownerId !== undefined) {
      violations.push(
        `duplicate ownership: #${n} is already owned by worker ${ownerId}`,
      );
      continue;
    }
    if (dispatch.length >= capacity) {
      violations.push(
        `worker cap: at most ${MAX_ACTIVE_WORKERS} active implementation workers`,
      );
      continue;
    }
    dispatch.push(n);
  }

  return { dispatch, violations };
}

export function retryDecision(failuresSoFar: number): RetryDecision {
  if (failuresSoFar <= 1) {
    return { action: "retry", addLabels: [] };
  }
  return { action: "stop-ticket", addLabels: [LABEL_NEEDS_INFO] };
}

export function reviewIsFresh(
  currentHeadSha: string,
  reviewedHeadSha: string,
  currentBaseSha?: string,
  reviewedBaseSha?: string,
): boolean {
  if (currentHeadSha !== reviewedHeadSha) return false;
  if (currentBaseSha === undefined && reviewedBaseSha === undefined) return true;
  return currentBaseSha !== undefined && currentBaseSha === reviewedBaseSha;
}

export type FixRoundKind =
  | "code-fix"
  | "conflict-resolution"
  | "infrastructure-retry"
  | "conflict-free-base-refresh";

export interface FixRoundDecision {
  allowed: boolean;
  consumesRound: boolean;
  reason: string;
}

/**
 * Infrastructure retries and conflict-free base refreshes do not consume a
 * code-fix round. A code fix or conflict resolution does, with two rounds
 * remaining the hard maximum.
 */
export function fixRoundDecision(
  roundsUsed: number,
  kind: FixRoundKind,
): FixRoundDecision {
  const consumesRound = kind === "code-fix" || kind === "conflict-resolution";
  if (!consumesRound) {
    return {
      allowed: true,
      consumesRound: false,
      reason: "infrastructure retry or conflict-free base refresh does not consume a fix round",
    };
  }
  if (roundsUsed >= MAX_FIX_ROUNDS) {
    return {
      allowed: false,
      consumesRound: true,
      reason: `at most ${MAX_FIX_ROUNDS} code-fix rounds are allowed per pull request`,
    };
  }
  return {
    allowed: true,
    consumesRound: true,
    reason: "code changes consume one bounded fix round",
  };
}

export function isMergeEligible(
  pullRequest: PullRequestFact,
  review: ReviewFact,
): MergeDecision {
  const blockers: string[] = [];
  if (!pullRequest.requiredChecksGreen) {
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
    (pullRequest.baseSha !== undefined ||
      review.reviewedBaseSha !== undefined) &&
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
    cloudReview: review.cloudReviewAvailable ? "available" : "unavailable",
  };
}

export function promotionAfterClosure(
  tickets: readonly TicketFact[],
  spec: number,
): LabelTransition[] {
  return labelTransitions(tickets, spec).filter((t) =>
    t.remove.includes(LABEL_BLOCKED),
  );
}

export function followUpRequired(verification: FinalVerificationFact): boolean {
  return !verification.finalVerificationPassed || !verification.wholeSpecReviewPassed;
}

export function parentClosureReady(
  children: readonly TicketFact[],
  verification: FinalVerificationFact,
): boolean {
  return (
    children.every((child) => child.state === "closed") &&
    !followUpRequired(verification)
  );
}
