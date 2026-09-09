// Authored source of the pure workflow state core (single-target production
// workflows, ADR-0031, finalization in ADR-0035).
// scripts/generate-workflow-state.ts copies this file byte-identical into
// skills/plan-this/, skills/implement-this/, skills/review-this/, and
// skills/fix-this/ so each registry install is self-contained. Edit this
// file, run the generator, and commit both; repository verification fails
// when a copy drifts.
//
// Purity contract: facts in, decisions out. No imports and no network,
// GitHub, git, filesystem-mutation, or worker-management calls. No Agent
// Manager, worktree, worker-cap, polling, cloud, or wave concepts live here:
// the production commands run one target in the current checkout.

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

// Criterion records (ADR-0037): one shared syntax covers the standardized
// GitHub checkbox form `- [ ] AC-1: text` (plan-this output, `[x]` allowed),
// the legacy bullet form `- \`AC-1\`: text`, and the bare-ID form
// `AC-1: text`. Backticks around the ID are optional and a `*` bullet is
// accepted. Checkbox state is never criterion status and never reaches the
// canonical serialization; a checked box is not completion evidence.
const CRITERION_LINE =
  /^\s*(?:[-*]\s*)?(?:\[[ xX]\]\s*)?(?:~~)?`?([A-Za-z]{2,3}-\d+)`?(?:~~)?\s*\(retired\)\s*:\s*(.+)$/;
const ACTIVE_CRITERION_LINE =
  /^\s*(?:[-*]\s*)?(?:\[[ xX]\]\s*)?(?:~~)?`?([A-Za-z]{2,3}-\d+)`?(?:~~)?\s*:\s*(.+)$/;
const CHECKED_CRITERION_LINE =
  /^\s*(?:[-*]\s*)?\[[xX]\]\s*(?:~~)?`?[A-Za-z]{2,3}-\d+`?(?:~~)?\s*(?:\(retired\))?\s*:/;

/**
 * Parse the published acceptance-criteria bullets of one issue body.
 * An active record is `- [ ] AC-1: text` (standardized), `- \`AC-1\`: text`
 * (legacy bullet), or `AC-1: text` (bare ID); a retired record carries a
 * `(retired)` marker, e.g. `- \`AC-2\` (retired): old text`. A checked
 * checkbox is normalized to an active record; it never means done.
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

// --- Adapted intake (ADR-0037) -------------------------------------------------
//
// Bodies published outside the plan-this template resolve through one shared
// consumption resolver instead of stopping on format. Canonical bodies keep
// the existing versioned fingerprint; adapted bodies carry a second explicit
// version over the complete normalized bodies, so no requirement-bearing
// text can hide from freshness. Adaptation is read-only: it never rewrites
// issue bodies, never invents criterion IDs, and never repins old evidence.
export const REQUIREMENTS_ADAPTED_VERSION = "requirements-adapted-v1";

/** Requirements-revision versions understood by every consuming stage. */
export const SUPPORTED_REQUIREMENTS_VERSIONS: readonly string[] = [
  REQUIREMENTS_REVISION_VERSION,
  REQUIREMENTS_ADAPTED_VERSION,
];

/** True when the value names a supported requirements-revision version. */
export function isSupportedRequirementsVersion(version: string): boolean {
  return SUPPORTED_REQUIREMENTS_VERSIONS.includes(version);
}

/** Labels that end an acceptance-criteria section in an adapted body. */
const ADAPTED_SECTION_BOUNDARIES = new Set([
  "affected seams",
  "acceptance criteria",
  "structural constraints",
  "blocked by",
  "settled decisions",
  "solution",
  "risk",
  "smallest sufficient verification",
  "smallest test-first verification",
  "smallest verification",
  "verification",
  "parent",
  "prerequisites",
  "overlap",
  "orientation evidence",
  "completion record",
  "what to build",
  "scope",
  "non-goals",
  "out of scope",
  "notes",
]);

function stripAdaptedLabelMarkup(line: string): string {
  let text = line.trim().replace(/^#{1,6}\s+/, "").trim();
  text = text.replace(/^\*\*(.+)\*\*:?\s*$/, "$1").replace(/^\*(.+)\*:?\s*$/, "$1").trim();
  return text;
}

function adaptedLabel(line: string): string | null {
  const text = stripAdaptedLabelMarkup(line);
  if (text === "") return null;
  // A label stays a section boundary only when no other text precedes it on
  // the line: criterion paragraphs absorb their own colons (`AC-1: text`),
  // and a section ends at `Label`, `Label:`, or `Label: content` lines.
  const labelMatch = text.match(/^([A-Za-z][A-Za-z0-9 /_-]{1,60}?)\s*(?::\s*.*)?$/);
  if (!labelMatch) return null;
  const label = labelMatch[1].trim().toLowerCase();
  if (ADAPTED_SECTION_BOUNDARIES.has(label)) return label;
  return null;
}

/**
 * Split a body into fenced and prose segments. A fence run opens on a line
 * whose first non-whitespace characters are at least three backticks and
 * closes on the next such line; a lone opening fence runs to the body end.
 */
function fenceSegments(body: string): { text: string; fenced: boolean }[] {
  const segments: { text: string; fenced: boolean }[] = [];
  const lines = body.split("\n");
  let prose: string[] = [];
  let fence: string[] | null = null;
  const flush = (): void => {
    if (prose.length > 0) {
      segments.push({ text: `${prose.join("\n")}\n`, fenced: false });
      prose = [];
    }
  };
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      if (fence === null) {
        flush();
        fence = [line];
      } else {
        fence.push(line);
        segments.push({ text: `${fence.join("\n")}\n`, fenced: true });
        fence = null;
      }
      continue;
    }
    if (fence === null) prose.push(line);
    else fence.push(line);
  }
  if (fence !== null) segments.push({ text: `${fence.join("\n")}\n`, fenced: true });
  else if (prose.length > 0) segments.push({ text: `${prose.join("\n")}\n`, fenced: false });
  if (segments.length === 0) segments.push({ text: body, fenced: false });
  return segments;
}

const ACCEPTANCE_LABEL = "acceptance criteria";

function isAcceptanceStart(line: string): boolean {
  const text = stripAdaptedLabelMarkup(line).replace(/:\s*$/, "").trim().toLowerCase();
  return text === ACCEPTANCE_LABEL;
}

function criterionFromRecord(line: string): AcceptanceCriterion | null {
  const retired = line.match(CRITERION_LINE);
  if (retired) return { id: retired[1], text: retired[2].trim(), status: "retired" };
  const active = line.match(ACTIVE_CRITERION_LINE);
  if (active) return { id: active[1], text: active[2].trim(), status: "active" };
  return null;
}

/** A label-shaped line that is not a criterion and not a known boundary. */
function looksLikeLabel(line: string): boolean {
  const text = line.trim();
  return /^[A-Z][A-Za-z0-9 /_-]{2,60}:\s*\S/.test(text) && criterionFromRecord(line) === null;
}

export type RequirementsBodyFormat = "canonical" | "adapted";

export interface RequirementsBodyResolution {
  /** True when the body resolved to usable criteria. */
  ok: boolean;
  format: RequirementsBodyFormat;
  role: PlanningRole;
  /** Criteria records for evidence matching (possibly empty for a parent). */
  criteria: AcceptanceCriterion[];
  /** Errors stop the run; adaptation never downgrades them. */
  errors: string[];
  /** Informational notes for the run log, e.g. checkbox normalization. */
  notes: string[];
}

/**
 * Adapted acceptance-criteria extraction. Fenced examples, quoted examples,
 * and validated-content exclusions never create criteria. Continuation lines
 * fold into the previous criterion only when they cannot be a new record, a
 * known section boundary, or a label-shaped line; anything else stops with
 * a line-specific diagnostic instead of being silently dropped or merged.
 */
function extractAdaptedCriteria(
  lines: readonly string[],
  role: PlanningRole,
): { criteria: AcceptanceCriterion[]; errors: string[]; notes: string[] } {
  const errors: string[] = [];
  const notes: string[] = [];
  const start = lines.findIndex(isAcceptanceStart);
  if (start < 0) {
    if (role === "ticket") {
      errors.push(
        "no acceptance criteria section found; publish explicit `AC-N:` records under an Acceptance criteria section",
      );
    } else {
      notes.push("parent supplies shared contracts without an acceptance criteria section");
    }
    return { criteria: [], errors, notes };
  }
  const duplicates = lines.filter(isAcceptanceStart);
  if (duplicates.length > 1) {
    errors.push("duplicate section: Acceptance criteria");
    return { criteria: [], errors, notes };
  }
  const criteria: AcceptanceCriterion[] = [];
  let lastRecord = -1;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === "") continue;
    if (/^#{1,6}\s/.test(trimmed) || /^```/.test(trimmed)) break;
    if (isAcceptanceStart(line)) {
      errors.push("duplicate section: Acceptance criteria");
      return { criteria: [], errors, notes };
    }
    const boundary = adaptedLabel(line);
    if (boundary !== null) break;
    const record = criterionFromRecord(line);
    if (record) {
      criteria.push(record);
      lastRecord = criteria.length - 1;
      if (CHECKED_CRITERION_LINE.test(line)) {
        notes.push(
          `checked checkbox normalized to an active criterion, never completion evidence: ${record.id}`,
        );
      }
      continue;
    }
    if (/^>\s?/.test(trimmed)) {
      errors.push(`unsupported criterion line (use "- [ ] AC-N: text"): ${trimmed.slice(0, 80)}`);
      return { criteria: [], errors, notes };
    }
    if (lastRecord >= 0 && !looksLikeLabel(line)) {
      criteria[lastRecord] = {
        ...criteria[lastRecord],
        text: `${criteria[lastRecord].text} ${trimmed}`,
      };
      continue;
    }
    errors.push(`unsupported criterion line (use "- [ ] AC-N: text"): ${trimmed.slice(0, 80)}`);
    return { criteria: [], errors, notes };
  }
  const recordErrors = validateCriterionRecords(criteria);
  for (const error of recordErrors) errors.push(error);
  if (errors.length > 0) return { criteria: [], errors, notes };
  const active = criteria.filter((c) => c.status === "active");
  if (role === "ticket" && active.length === 0) {
    errors.push(
      "missing required content: Acceptance criteria has no active criterion records",
    );
  }
  return { criteria, errors, notes };
}

/**
 * Resolve one planning body for consumption. Canonical bodies pass straight
 * through. Bodies that fail canonical formatting adapt when their
 * requirements are unambiguous; structural ambiguity (conflicting settlement
 * homes, unbalanced workflow-evidence markers, duplicate or unparsable
 * criterion records) still stops. Comments never enter criteria.
 */
export function resolveRequirementsBody(
  body: string,
  role: PlanningRole,
): RequirementsBodyResolution {
  const canonical = validateAuthoritativeBody(body, role);
  if (canonical.length === 0) {
    return {
      ok: true,
      format: "canonical",
      role,
      criteria: parseAuthoritativeSections(body).criteria,
      errors: [],
      notes: [],
    };
  }
  const lines = proseLines(body);
  const structural: string[] = [];
  const hasSolution = lines.some((line) => line.trim() === "## Solution");
  const hasSettled = lines.some((line) => line.trim() === "## Settled decisions");
  if (hasSolution && hasSettled) {
    structural.push("ambiguous sections: ## Solution and ## Settled decisions must not both carry requirements");
  }
  for (const segment of fenceSegments(body)) {
    if (segment.fenced) continue;
    for (const [start, end] of workflowEvidenceMarkerPairs()) {
      const starts = segment.text.split(start).length - 1;
      const ends = segment.text.split(end).length - 1;
      if (starts !== ends) {
        structural.push("unbalanced workflow evidence markers in the issue body; reconcile them before pinning");
        break;
      }
    }
    if (structural.length > 0) break;
  }
  if (structural.length > 0) {
    return { ok: false, format: "adapted", role, criteria: [], errors: structural, notes: [] };
  }
  const adapted = extractAdaptedCriteria(proseLines(body), role);
  if (adapted.errors.length > 0) {
    return { ok: false, format: "adapted", role, criteria: [], errors: adapted.errors, notes: adapted.notes };
  }
  return {
    ok: true,
    format: "adapted",
    role,
    criteria: adapted.criteria,
    errors: [],
    notes: [
      "adapted intake: the body uses a non-canonical template; criteria and requirements resolved by explicit IDs and section labels",
      ...adapted.notes,
    ],
  };
}

/**
 * Prose lines of a body for structural and criterion extraction: fenced
 * content never carries requirements, so extraction reads only prose.
 */
function proseLines(body: string): string[] {
  const normalized = fenceSegments(normalizeNewlines(body))
    .filter((segment) => !segment.fenced)
    .map((segment) => segment.text)
    .join("");
  const lines = normalized.endsWith("\n") ? normalized.slice(0, -1).split("\n") : normalized.split("\n");
  return lines.map((line) => line.replace(/[ \t]+$/g, ""));
}

/** Workflow-generated evidence blocks excluded from adapted fingerprints. */
function workflowEvidenceMarkerPairs(): [string, string][] {
  return [
    [COMPACT_START, COMPACT_END],
    [LEGACY_START, LEGACY_END],
    [REVIEW_HANDOFF_START, REVIEW_HANDOFF_END],
    [FIX_PROGRESS_START, FIX_PROGRESS_END],
  ];
}

/**
 * Normalized whole-body text for the adapted fingerprint. Normalizes line
 * endings and trailing horizontal whitespace only; prose and Markdown
 * structure (including blank lines) stay intact. Structurally valid workflow
 * evidence blocks outside fences are excluded. Malformed or fenced markers
 * are retained, never removed, because their presence is a
 * requirement-state fact.
 */
function normalizedFullBody(body: string): string {
  const normalized = normalizeNewlines(body)
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");
  // Strip complete block runs: from a start marker line through its matching
  // end marker line, or a complete block on one line. The exclusion requires
  // the full marker range on marker-bearing lines, so partial or prose-bound
  // markers are retained.
  const pairs = workflowEvidenceMarkerPairs();
  const opensMarker = (line: string): boolean =>
    pairs.some(([start]) => line.includes(start));
  const closesMarker = (line: string): boolean =>
    pairs.some(([, end]) => line.includes(end));
  const stripped = fenceSegments(normalized)
    .map((segment) => {
      if (segment.fenced) return segment.text;
      for (const [start, end] of pairs) {
        const starts = segment.text.split(start).length - 1;
        const ends = segment.text.split(end).length - 1;
        if (starts === 0 && ends === 0) continue;
        if (starts !== ends) return segment.text;
      }
      const out: string[] = [];
      let depth = 0;
      for (const line of segment.text.split("\n")) {
        const opens = opensMarker(line);
        const closes = closesMarker(line);
        if (depth === 0 && !opens) {
          out.push(line);
          continue;
        }
        if (depth === 0 && opens && closes) continue;
        depth += (opens ? 1 : 0) - (closes ? 1 : 0);
        if (depth < 0) depth = 0;
      }
      return out.join("\n");
    })
    .join("");
  return stripped;
}

export function requirementsRevision(
  parentBody: string,
  ticketBody: string,
  hash: RevisionHasher,
): RequirementsRevision {
  const parentLines = normalizeNewlines(parentBody).split("\n").map((line) =>
    line.replace(/[ \t]+$/g, "")
  );
  const ticketLines = normalizeNewlines(ticketBody).split("\n").map((line) =>
    line.replace(/[ \t]+$/g, "")
  );
  const parent = resolveRequirementsBody(parentLines.join("\n"), "parent");
  const ticket = resolveRequirementsBody(ticketLines.join("\n"), "ticket");
  if (parent.format === "canonical" && ticket.format === "canonical") {
    return {
      version: REQUIREMENTS_REVISION_VERSION,
      parent: hash(canonicalRequirementsText(parseAuthoritativeSections(parentBody))),
      ticket: hash(canonicalRequirementsText(parseAuthoritativeSections(ticketBody))),
    };
  }
  return {
    version: REQUIREMENTS_ADAPTED_VERSION,
    parent: hash(normalizedFullBody(parentBody)),
    ticket: hash(normalizedFullBody(ticketBody)),
  };
}

/** One stable carrier string so dispatch and review packets compare the same value. */
export function requirementsRevisionValue(rev: RequirementsRevision): string {
  return `${rev.version}:parent=${rev.parent};ticket=${rev.ticket}`;
}

/**
 * Raw equality of two revision carrier values. An absent or blank pin never
 * matches: a missing pin is not proof that the bodies are current.
 */
export function requirementsMatch(dispatched: string, current: string): boolean {
  if (dispatched.trim() === "" || current.trim() === "") return false;
  return dispatched === current;
}

/** True when a requirements carrier is present, supported, and well formed. */
export function requirementsPinWellFormed(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (value.trim() === "") return false;
  const versions = SUPPORTED_REQUIREMENTS_VERSIONS.map(escapeHandoffRegExp).join("|");
  return new RegExp(`^(?:${versions}):parent=[a-f0-9]{64};ticket=[a-f0-9]{64}$`).test(value);
}

export interface RequirementsGateDecision {
  action: "continue" | "stop";
  addLabels: readonly string[];
  reason: string;
}

/**
 * The requirements gate. A mismatch stops and records `needs-info`; there is
 * no waiver path. Only reconciling the issue bodies changes the input. Both
 * sides must be well-formed supported pins before equality can pass: a
 * missing or malformed pin is never provenance.
 */
export function requirementsGate(
  dispatched: string,
  current: string,
): RequirementsGateDecision {
  if (!requirementsPinWellFormed(dispatched) || !requirementsPinWellFormed(current)) {
    return {
      action: "stop",
      addLabels: [LABEL_NEEDS_INFO],
      reason:
        "the pinned or current requirements revision is missing or malformed; reconcile the issue bodies and resume explicitly",
    };
  }
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

  // Criterion syntax: single-line records via the shared parser — the
  // standardized `- [ ] AC-N: text` checkbox form, legacy `- \`AC-N\`: text`
  // bullets, and bare `AC-N: text` records.
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
      const canonical = CRITERION_LINE.test(line) || ACTIVE_CRITERION_LINE.test(line);
      if (canonical) {
        const id = line.match(/([A-Za-z]{2,3}-\d+)/)?.[1] ?? line;
        if (seen.has(id)) errors.push(`duplicate or reused criterion id within the issue: ${id}`);
        seen.add(id);
        continue;
      }
      errors.push(`unsupported criterion line (use "- [ ] AC-N: text"): ${trimmed.slice(0, 80)}`);
    }
    if (seen.size === 0) errors.push("missing required content: ## Acceptance criteria has no criterion records");
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

// --- Review handoff for fix-this (ADR-0035) ----------------------------------
//
// `review-this` publishes readable Standards/Spec prose plus exactly one
// machine-readable `review-handoff-v1` block. `fix-this` consumes only a
// block that validates here. Arbitrary review prose never authorizes fixes,
// conflict resolution, merge, or bookkeeping. The handoff pins the completed
// review; it never approves future commits.

export const REVIEW_HANDOFF_VERSION = "review-handoff-v1";

const REVIEW_HANDOFF_START = "<!-- ruralnative:review-handoff:start -->";
const REVIEW_HANDOFF_END = "<!-- ruralnative:review-handoff:end -->";

export type ReviewHandoffSource = "standards" | "spec";
export type ReviewHandoffCategory =
  | "security"
  | "performance"
  | "correctness-and-edge-cases"
  | "style"
  | "tests-and-test-bloat"
  | "documentation";
export type ReviewHandoffSeverity = "advisory" | "blocking";
export type ReviewHandoffEvidenceKind = "inline" | "failure";

export interface ReviewHandoffFinding {
  /** Stable finding ID unique within the handoff, e.g. `F-1`. */
  id: string;
  source: ReviewHandoffSource;
  category: ReviewHandoffCategory;
  severity: ReviewHandoffSeverity;
  file: string;
  /** Pinned 1-based line in the reviewed head. */
  line: number;
  message: string;
  evidenceKind: ReviewHandoffEvidenceKind;
  /** Quoted offending span for inline evidence. */
  quote?: string;
  /** Failing command for failure evidence. */
  command?: string;
  /** Observed output for failure evidence. */
  output?: string;
  /** Governing rule, e.g. a Standards rule or `#<issue>:AC-N`. */
  governingRule: string;
  reviewedHeadSha: string;
  reviewedBaseSha: string;
  /** Linked implementation ticket, when the finding names one. */
  ticket?: number;
}

export interface ReviewHandoffProvenance {
  /** Native GitHub review ID as observed by the reader, e.g. `123456`. */
  reviewId: string;
  /** Native author login, e.g. `octocat`. */
  reviewAuthor: string;
  /** Commit reviewed by that native report. */
  reviewedCommit: string;
  /** Native review timestamp when known, otherwise empty. */
  reviewedAt: string;
  /** Native API URL of the source report when known, otherwise empty. */
  sourceUrl: string;
  /**
   * Reviewer permission observed at read time:
   * `policy` means a project policy establishes this reviewer,
   * otherwise `write`, `maintain`, or `admin`.
   */
  reviewerPermission: "policy" | "write" | "maintain" | "admin";
  /** Associated native comment IDs, when any. */
  commentIds: readonly string[];
}

export interface ReviewHandoffInput {
  /** Repository in `owner/name` form. */
  repository: string;
  prNumber: number;
  reviewedHeadSha: string;
  reviewedBaseSha: string;
  /** Closed-ticket association carried by the reviewed PR. */
  closesTicket: number | null;
  requirementsRevision: string;
  reviewPolicyRevision: string;
  /** Local verification recorded by the review publication. */
  verificationCommand: string;
  verificationResult: string;
  verificationPassed: boolean;
  /** Complete validated findings; empty means no findings. */
  findings: readonly ReviewHandoffFinding[];
  provenance: ReviewHandoffProvenance;
}

export type ReviewHandoffStatus =
  | "current"
  | "missing"
  | "malformed"
  | "unsupported-version"
  | "stale";

export interface ReviewHandoffResult {
  status: ReviewHandoffStatus;
  reason: string;
  handoff?: ReviewHandoffInput;
}

export interface ReviewHandoffCheck {
  /** Raw published review body that should carry the handoff block. */
  body: string;
  /** Repository in `owner/name` form. */
  repository: string;
  prNumber: number;
  /** Current PR head SHA known to the consumer. */
  currentHeadSha: string;
  /** Current PR base SHA known to the consumer. */
  currentBaseSha: string;
  /** Current requirements value recomputed from the issue bodies. */
  currentRequirementsRevision: string;
  /** Current effective-policy value recomputed from governing sources. */
  currentReviewPolicyRevision: string;
  /**
   * Native metadata observed for the selected review. The payload never
   * authenticates itself: this observation must supply identity, author,
   * permission, commit, and source report before the handoff is usable.
   */
  observedProvenance: {
    reviewId: string;
    reviewAuthor: string;
    reviewerPermission: ReviewHandoffProvenance["reviewerPermission"] | "unknown";
    reviewedCommit: string;
    reviewedAt?: string;
    sourceUrl?: string;
    commentIds?: readonly string[];
  };
  /** True when the selected native review is completed. */
  reviewCompleted: boolean;
  /** True when the selected native review was dismissed. */
  reviewDismissed: boolean;
}

function escapeReviewHandoffRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function reviewHandoffInner(body: string): string | null {
  const normalized = normalizeNewlines(body);
  const pattern = new RegExp(
    `${escapeReviewHandoffRegExp(REVIEW_HANDOFF_START)}[ \\t]*\\n([\\u0000-\\uFFFF]*?)\\n[ \\t]*${escapeReviewHandoffRegExp(REVIEW_HANDOFF_END)}`,
  );
  return normalized.match(pattern)?.[1] ?? null;
}

/** Count review-handoff blocks in a published body (LF/CRLF tolerant). */
export function countReviewHandoffBlocks(body: string): number {
  const normalized = normalizeNewlines(body);
  const pattern = new RegExp(
    `${escapeReviewHandoffRegExp(REVIEW_HANDOFF_START)}[ \\t]*\\n([\\u0000-\\uFFFF]*?)\\n[ \\t]*${escapeReviewHandoffRegExp(REVIEW_HANDOFF_END)}`,
    "g",
  );
  return [...normalized.matchAll(pattern)].length;
}

function reviewHandoffField(inner: string, label: string): string[] {
  const pattern = new RegExp(`^[ \\t]*-[ \\t]*${escapeReviewHandoffRegExp(label)}[ \\t]*:(.*)$`, "gm");
  const values: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(inner)) !== null) values.push((m[1] ?? "").trim());
  return values;
}

function reviewHandoffSubfield(segment: string, label: string): string | null {
  const lines = segment.split("\n");
  // The finding header `- Finding:` is top-level; its fields are indented.
  const start = label === "Finding" ? 0 : 1;
  for (let i = start; i < lines.length; i++) {
    if (label !== "Finding" && !/^[ \t]+-/.test(lines[i])) continue;
    const m = lines[i].match(new RegExp(`^[ \\t]*-[ \\t]*${escapeReviewHandoffRegExp(label)}[ \\t]*:(.*)$`));
    if (m) {
      const value = (m[1] ?? "").trim();
      return value === "" ? null : value;
    }
  }
  return null;
}

function oneReviewHandoffField(inner: string, label: string): string | null {
  const values = reviewHandoffField(inner, label);
  if (values.length !== 1 || values[0] === "") return null;
  return values[0];
}

function parseReviewHandoffFindings(inner: string): { findings: ReviewHandoffFinding[]; error: string | null } {
  const findings: ReviewHandoffFinding[] = [];
  const lines = inner.split("\n");
  const starts: number[] = [];
  lines.forEach((line, i) => {
    if (/^[ \t]*-[ \t]*Finding:[ \t]*\S/.test(line)) starts.push(i);
  });
  const end = lines.findIndex((line) => /^[ \t]*-[ \t]*Findings count:/.test(line));
  const stop = end >= 0 ? end : lines.length;
  const relevant = starts.filter((i) => i < stop);
  for (let h = 0; h < relevant.length; h++) {
    const segment = lines.slice(relevant[h], h + 1 < relevant.length ? relevant[h + 1] : stop).join("\n");
    const get = (label: string): string | null => reviewHandoffSubfield(segment, label);
    const id = get("Finding");
    const source = get("Source");
    const category = get("Category");
    const severity = get("Severity");
    const file = get("File");
    const lineRaw = get("Line");
    const message = get("Message");
    const evidenceKind = get("Evidence");
    const governingRule = get("Governing rule");
    const headSha = get("Reviewed head");
    const baseSha = get("Reviewed base");
    if (!id || !source || !category || !severity || !file || !lineRaw || !message || !evidenceKind || !governingRule || !headSha || !baseSha) {
      return { findings: [], error: "review handoff carries an incomplete finding; republish the review" };
    }
    if (source !== "standards" && source !== "spec") {
      return { findings: [], error: `review handoff finding ${id} has an unknown source` };
    }
    if (severity !== "advisory" && severity !== "blocking") {
      return { findings: [], error: `review handoff finding ${id} has an unknown severity` };
    }
    if (
      category !== "security" &&
      category !== "performance" &&
      category !== "correctness-and-edge-cases" &&
      category !== "style" &&
      category !== "tests-and-test-bloat" &&
      category !== "documentation"
    ) {
      return { findings: [], error: `review handoff finding ${id} has an unknown category` };
    }
    if (evidenceKind !== "inline" && evidenceKind !== "failure") {
      return { findings: [], error: `review handoff finding ${id} has an unknown evidence kind` };
    }
    const line = Number(lineRaw);
    if (!Number.isInteger(line) || line < 1) {
      return { findings: [], error: `review handoff finding ${id} has an invalid line` };
    }
    const quote = get("Quote");
    const command = get("Command");
    const output = get("Output");
    if (evidenceKind === "inline" && !quote) {
      return { findings: [], error: `review handoff finding ${id} needs quoted evidence` };
    }
    if (evidenceKind === "failure" && (!command || !output)) {
      return { findings: [], error: `review handoff finding ${id} needs command and output evidence` };
    }
    const ticketRaw = get("Ticket");
    let ticket: number | undefined;
    if (ticketRaw !== null) {
      const ticketNumber = Number(ticketRaw.replace(/^#/, ""));
      if (!Number.isInteger(ticketNumber) || ticketNumber < 1) {
        return { findings: [], error: `review handoff finding ${id} has an invalid ticket` };
      }
      ticket = ticketNumber;
    }
    findings.push({
      id,
      source,
      category,
      severity,
      file,
      line,
      message,
      evidenceKind,
      quote: quote ?? undefined,
      command: command ?? undefined,
      output: output ?? undefined,
      governingRule,
      reviewedHeadSha: headSha,
      reviewedBaseSha: baseSha,
      ticket,
    });
  }
  return { findings, error: null };
}

function validateReviewHandoffInput(input: ReviewHandoffInput): string | null {
  if (!/^[A-Za-z0-9-_.]+\/[A-Za-z0-9-_.]+$/.test(input.repository)) return "review handoff repository must be owner/name";
  if (!Number.isInteger(input.prNumber) || input.prNumber < 1) return "review handoff PR number is invalid";
  if (input.reviewedHeadSha.trim() === "" || input.reviewedBaseSha.trim() === "") {
    return "review handoff needs trustworthy reviewed revisions";
  }
  if (!requirementsPinWellFormed(input.requirementsRevision)) return "review handoff requirements revision is malformed";
  if (input.reviewPolicyRevision.trim() === "") return "review handoff policy revision is malformed";
  if (!isNonEmptyHandoffString(input.verificationCommand)) return "review handoff verification command is missing";
  if (!isNonEmptyHandoffString(input.verificationResult)) return "review handoff verification result is missing";
  if (input.closesTicket !== null && (!Number.isInteger(input.closesTicket) || input.closesTicket < 1)) {
    return "review handoff closing ticket is invalid";
  }
  const ids = new Set<string>();
  for (const finding of input.findings) {
    if (ids.has(finding.id)) return `review handoff carries a duplicate finding id: ${finding.id}`;
    ids.add(finding.id);
    if (finding.reviewedHeadSha !== input.reviewedHeadSha || finding.reviewedBaseSha !== input.reviewedBaseSha) {
      return `review handoff finding ${finding.id} is pinned to another revision`;
    }
  }
  if (input.provenance.reviewId.trim() === "") return "review handoff provenance needs a native review ID";
  if (input.provenance.reviewAuthor.trim() === "") return "review handoff provenance needs a native author";
  if (input.provenance.reviewedCommit.trim() === "") return "review handoff provenance needs the reviewed commit";
  if (input.provenance.reviewedCommit !== input.reviewedHeadSha) {
    return "review handoff provenance commit does not match the reviewed head";
  }
  return null;
}

function isNonEmptyHandoffString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function escapeHandoffText(value: string): string {
  return value.replace(/-->/g, "--\\u003E").replace(/\r?\n/g, " ");
}

/**
 * Render the machine-readable review handoff published by `review-this`.
 * Throws on invalid input so malformed reviews never publish a usable block.
 */
export function renderReviewHandoff(input: ReviewHandoffInput): string {
  const error = validateReviewHandoffInput(input);
  if (error) throw new Error(`invalid review handoff: ${error}`);
  const lines: string[] = [REVIEW_HANDOFF_START, "## Review handoff", "", `- Handoff version: ${REVIEW_HANDOFF_VERSION}`];
  lines.push(`- Repository: ${escapeHandoffText(input.repository)}`);
  lines.push(`- PR: ${input.prNumber}`);
  lines.push(`- Reviewed head: ${escapeHandoffText(input.reviewedHeadSha)}`);
  lines.push(`- Reviewed base: ${escapeHandoffText(input.reviewedBaseSha)}`);
  lines.push(`- Closes ticket: ${input.closesTicket === null ? "none" : `#${input.closesTicket}`}`);
  lines.push(`- Requirements revision: ${escapeHandoffText(input.requirementsRevision)}`);
  lines.push(`- Review policy revision: ${escapeHandoffText(input.reviewPolicyRevision)}`);
  lines.push(`- Verification command: \`${escapeHandoffText(input.verificationCommand)}\``);
  lines.push(`- Verification passed: ${input.verificationPassed ? "true" : "false"}`);
  lines.push(`- Verification result: ${escapeHandoffText(input.verificationResult)}`);
  lines.push(`- Review ID: ${escapeHandoffText(input.provenance.reviewId)}`);
  lines.push(`- Review author: ${escapeHandoffText(input.provenance.reviewAuthor)}`);
  lines.push(`- Reviewed commit: ${escapeHandoffText(input.provenance.reviewedCommit)}`);
  lines.push(`- Reviewed at: ${escapeHandoffText(input.provenance.reviewedAt)}`);
  lines.push(`- Source URL: ${escapeHandoffText(input.provenance.sourceUrl)}`);
  lines.push(`- Reviewer permission: ${input.provenance.reviewerPermission}`);
  lines.push(`- Comment IDs: ${input.provenance.commentIds.map((id) => escapeHandoffText(id)).join(", ")}`);
  for (const finding of input.findings) {
    lines.push(`- Finding: ${escapeHandoffText(finding.id)}`);
    lines.push(`  - Source: ${finding.source}`);
    lines.push(`  - Category: ${finding.category}`);
    lines.push(`  - Severity: ${finding.severity}`);
    lines.push(`  - File: ${escapeHandoffText(finding.file)}`);
    lines.push(`  - Line: ${finding.line}`);
    lines.push(`  - Message: ${escapeHandoffText(finding.message)}`);
    lines.push(`  - Evidence: ${finding.evidenceKind}`);
    if (finding.evidenceKind === "inline") lines.push(`  - Quote: ${escapeHandoffText(finding.quote ?? "")}`);
    else {
      lines.push(`  - Command: \`${escapeHandoffText(finding.command ?? "")}\``);
      lines.push(`  - Output: ${escapeHandoffText(finding.output ?? "")}`);
    }
    lines.push(`  - Governing rule: ${escapeHandoffText(finding.governingRule)}`);
    lines.push(`  - Reviewed head: ${escapeHandoffText(finding.reviewedHeadSha)}`);
    lines.push(`  - Reviewed base: ${escapeHandoffText(finding.reviewedBaseSha)}`);
    if (finding.ticket !== undefined) lines.push(`  - Ticket: #${finding.ticket}`);
  }
  lines.push(`- Findings count: ${input.findings.length}`);
  lines.push(REVIEW_HANDOFF_END);
  return lines.join("\n");
}

/** Parse one review-handoff block without trusting it. Callers must validate. */
export function parseReviewHandoff(body: string): { found: boolean; version: string | null } {
  const inner = reviewHandoffInner(body);
  if (inner === null) return { found: false, version: null };
  const version = oneReviewHandoffField(inner, "Handoff version");
  return { found: true, version };
}

/**
 * Validate the published review handoff for `fix-this`. The observed native
 * provenance must match the payload; a forged, partial, dismissed, unknown,
 * stale, or mismatched report is never current. Requirements and policy must
 * also match the consumer's recomputed current values.
 */
export function validateReviewHandoff(check: ReviewHandoffCheck): ReviewHandoffResult {
  const normalized = normalizeNewlines(check.body);
  const starts = normalized.split(REVIEW_HANDOFF_START).length - 1;
  const ends = normalized.split(REVIEW_HANDOFF_END).length - 1;
  if (starts !== ends || starts !== countReviewHandoffBlocks(check.body)) {
    return { status: "malformed", reason: "stray or unbalanced review handoff markers in the review body" };
  }
  if (starts === 0) {
    return { status: "missing", reason: "no review handoff block in the published review; republish the review" };
  }
  if (starts > 1) {
    return { status: "malformed", reason: "multiple review handoff blocks in the published review" };
  }
  const inner = reviewHandoffInner(check.body);
  if (inner === null) {
    return { status: "malformed", reason: "review handoff block is unreadable; republish the review" };
  }
  const version = oneReviewHandoffField(inner, "Handoff version");
  if (version === null) {
    return { status: "malformed", reason: "review handoff version is missing or duplicated" };
  }
  if (version !== REVIEW_HANDOFF_VERSION) {
    return { status: "unsupported-version", reason: `unsupported review handoff ${version}; upgrade the producing skill` };
  }
  const lines = inner.split("\n");
  const topLevel = (label: string): string | null => {
    const values: string[] = [];
    for (const line of lines) {
      if (/^[ \t]+-/.test(line)) continue;
      const m = line.match(new RegExp(`^[ \\t]*-[ \\t]*${escapeReviewHandoffRegExp(label)}[ \\t]*:(.*)$`));
      if (m) values.push((m[1] ?? "").trim());
    }
    if (values.length !== 1 || values[0] === "") return null;
    return values[0];
  };
  const required = [
    "Repository",
    "PR",
    "Reviewed head",
    "Reviewed base",
    "Requirements revision",
    "Review policy revision",
    "Verification command",
    "Verification passed",
    "Verification result",
    "Review ID",
    "Review author",
    "Reviewed commit",
    "Reviewer permission",
    "Findings count",
  ] as const;
  for (const label of required) {
    if (topLevel(label) === null) {
      return { status: "malformed", reason: `review handoff ${label.toLowerCase()} is missing or duplicated` };
    }
  }
  const repository = topLevel("Repository")!;
  const prRaw = topLevel("PR")!;
  const reviewedHead = topLevel("Reviewed head")!;
  const reviewedBase = topLevel("Reviewed base")!;
  const prNumber = Number(prRaw);
  if (!Number.isInteger(prNumber) || prNumber < 1) {
    return { status: "malformed", reason: "review handoff PR number is invalid" };
  }
  const closesRaw = topLevel("Closes ticket") ?? "none";
  let closesTicket: number | null = null;
  if (closesRaw !== "none") {
    const parsed = Number(closesRaw.replace(/^#/, ""));
    if (!Number.isInteger(parsed) || parsed < 1) {
      return { status: "malformed", reason: "review handoff closing ticket is invalid" };
    }
    closesTicket = parsed;
  }
  const requirementsRevision = topLevel("Requirements revision")!;
  const policyRevision = topLevel("Review policy revision")!;
  const verificationCommand = topLevel("Verification command")!;
  const verificationPassedRaw = topLevel("Verification passed")!;
  const verificationResult = topLevel("Verification result")!;
  if (verificationPassedRaw !== "true" && verificationPassedRaw !== "false") {
    return { status: "malformed", reason: "review handoff verification status is invalid" };
  }
  const findingsCountRaw = topLevel("Findings count")!;
  const findingsCount = Number(findingsCountRaw);
  if (!Number.isInteger(findingsCount) || findingsCount < 0) {
    return { status: "malformed", reason: "review handoff findings count is invalid" };
  }
  const parsedFindings = parseReviewHandoffFindings(inner);
  if (parsedFindings.error) return { status: "malformed", reason: parsedFindings.error };
  if (parsedFindings.findings.length !== findingsCount) {
    return { status: "malformed", reason: "review handoff findings count does not match its findings" };
  }
  const reviewId = topLevel("Review ID")!;
  const reviewAuthor = topLevel("Review author")!;
  const reviewedCommit = topLevel("Reviewed commit")!;
  const reviewedAt = topLevel("Reviewed at") ?? "";
  const sourceUrl = topLevel("Source URL") ?? "";
  const reviewerPermission = topLevel("Reviewer permission")!;
  if (
    reviewerPermission !== "policy" &&
    reviewerPermission !== "write" &&
    reviewerPermission !== "maintain" &&
    reviewerPermission !== "admin"
  ) {
    return { status: "malformed", reason: "review handoff reviewer permission is invalid" };
  }
  const commentIds = topLevel("Comment IDs") ?? "";
  const handoff: ReviewHandoffInput = {
    repository,
    prNumber,
    reviewedHeadSha: reviewedHead,
    reviewedBaseSha: reviewedBase,
    closesTicket,
    requirementsRevision,
    reviewPolicyRevision: policyRevision,
    verificationCommand,
    verificationResult,
    verificationPassed: verificationPassedRaw === "true",
    findings: parsedFindings.findings,
    provenance: {
      reviewId,
      reviewAuthor,
      reviewedCommit,
      reviewedAt,
      sourceUrl,
      reviewerPermission,
      commentIds: commentIds === "" ? [] : commentIds.split(",").map((id) => id.trim()).filter((id) => id !== ""),
    },
  };
  if (validateReviewHandoffInput(handoff)) {
    return { status: "malformed", reason: validateReviewHandoffInput(handoff)! };
  }
  if (!check.reviewCompleted || check.reviewDismissed) {
    return { status: "stale", reason: "the selected native review is incomplete or dismissed; republish the review" };
  }
  if (check.observedProvenance.reviewerPermission === "unknown") {
    return { status: "malformed", reason: "reviewer permission was not observed; verify it before fixes" };
  }
  if (
    check.observedProvenance.reviewId !== handoff.provenance.reviewId ||
    check.observedProvenance.reviewAuthor !== handoff.provenance.reviewAuthor ||
    check.observedProvenance.reviewerPermission !== handoff.provenance.reviewerPermission ||
    check.observedProvenance.reviewedCommit !== handoff.provenance.reviewedCommit ||
    check.observedProvenance.reviewedCommit !== handoff.reviewedHeadSha
  ) {
    return { status: "stale", reason: "observed native review does not match the published handoff" };
  }
  if (handoff.repository.toLowerCase() !== check.repository.toLowerCase() || handoff.prNumber !== check.prNumber) {
    return { status: "stale", reason: "review handoff names another repository or pull request" };
  }
  if (handoff.reviewedHeadSha !== check.currentHeadSha || handoff.reviewedBaseSha !== check.currentBaseSha) {
    return {
      status: "stale",
      reason: "review handoff is pinned to another head or base; republish the review on the current revisions",
    };
  }
  if (!requirementsPinWellFormed(check.currentRequirementsRevision) || handoff.requirementsRevision !== check.currentRequirementsRevision) {
    return { status: "stale", reason: "review handoff requirements revision no longer matches the issue bodies" };
  }
  if (handoff.reviewPolicyRevision !== check.currentReviewPolicyRevision) {
    return { status: "stale", reason: "review handoff policy revision no longer matches the governing sources" };
  }
  return { status: "current", reason: "validated review handoff for the current revisions", handoff };
}

// --- Fix-this finalization (ADR-0035) ----------------------------------------
//
// `fix-this` owns post-review fixes, conflict resolution, merge, and
// bookkeeping. It never generates another review verdict. Local verification
// is mandatory; CI status is observed only when GitHub enforces it as a merge
// restriction. A successful local gate without CI or fresh review is weaker
// assurance; that tradeoff was explicitly selected and is recorded here.

export type FixProgressStep = "fixes" | "evidence" | "push" | "merge" | "bookkeeping";

export interface FixFindingDisposition {
  /** Stable finding ID from the validated handoff. */
  findingId: string;
  /** How the finding was resolved. */
  disposition: "fixed" | "already-resolved" | "unresolvable";
  /** Changed files for this finding, if any. */
  files: readonly string[];
  /** Resulting commit SHA carrying the resolution, if any. */
  commitSha: string;
  /** Focused verification command. */
  verificationCommand: string;
  /** Observed verification result. */
  verificationResult: string;
}

export interface FixEligibilityFact {
  /** Validated handoff status from `validateReviewHandoff`. */
  handoffStatus: string;
  /** Current requirements value still matches the handoff. */
  requirementsCurrent: boolean;
  /** Current policy value still matches the handoff. */
  policyCurrent: boolean;
  /** Every published finding has a proven disposition. */
  allFindingsResolved: boolean;
  /** At least one disposition still needs a human decision. */
  hasUnresolvableFinding: boolean;
  /** Local merge conflicts are complete. */
  conflictsResolved: boolean;
  /** Whether conflict resolution needed a new product decision. */
  conflictNeedsDecision: boolean;
  /** Local verification ran on the resulting head and passed. */
  localVerificationPassed: boolean;
  /** Local verification command is established, not invented. */
  verificationCapable: boolean;
  /** Implementation evidence validates `current` on the resulting head. */
  evidenceCurrent: boolean;
  /** Clean worktree before merge. */
  worktreeClean: boolean;
  /** PR is open and not a draft. */
  pullRequestOpen: boolean;
  /** GitHub reports the PR mergeable. */
  mergeable: boolean;
  /** Resulting head equals the verified PR head. */
  headMatchesVerifiedResult: boolean;
}

export interface FixEligibilityDecision {
  eligible: boolean;
  blockers: string[];
}

/**
 * Dedicated finalization gate for `fix-this`. It does not call the legacy
 * exact-revision review gate and adds no CI condition. GitHub branch
 * protection remains authoritative at merge time.
 */
export function isFixEligible(fact: FixEligibilityFact): FixEligibilityDecision {
  const blockers: string[] = [];
  if (fact.handoffStatus !== "current") blockers.push("validated review handoff is not current");
  if (!fact.requirementsCurrent) blockers.push("the issue bodies no longer match the reviewed requirements revision");
  if (!fact.policyCurrent) blockers.push("governing policy no longer matches the reviewed policy revision");
  if (fact.hasUnresolvableFinding) blockers.push("a finding needs a human decision before merge");
  if (!fact.allFindingsResolved) blockers.push("published findings are unresolved");
  if (fact.conflictNeedsDecision) blockers.push("conflict resolution needs a new product decision");
  if (!fact.conflictsResolved) blockers.push("merge conflicts are unresolved");
  if (!fact.verificationCapable) blockers.push("no established local verification command; do not invent one");
  if (!fact.localVerificationPassed) blockers.push("local verification did not pass on the resulting head");
  if (!fact.evidenceCurrent) blockers.push("implementation evidence is not current on the resulting head");
  if (!fact.worktreeClean) blockers.push("the worktree is not clean");
  if (!fact.pullRequestOpen) blockers.push("the pull request is not open");
  if (!fact.mergeable) blockers.push("pull request is not mergeable");
  if (!fact.headMatchesVerifiedResult) blockers.push("the pull-request head is not the verified result");
  return { eligible: blockers.length === 0, blockers };
}

export const FIX_PROGRESS_VERSION = "fix-progress-v1";
const FIX_PROGRESS_START = "<!-- ruralnative:fix-progress:start -->";
const FIX_PROGRESS_END = "<!-- ruralnative:fix-progress:end -->";

export interface FixProgressInput {
  repository: string;
  prNumber: number;
  sourceReviewId: string;
  sourceHandoffDigest: string;
  ticket: number | null;
  parent: number | null;
  startedHeadSha: string;
  startedBaseSha: string;
  resultingHeadSha: string;
  resultingBaseSha: string;
  dispositions: readonly FixFindingDisposition[];
  completedSteps: readonly FixProgressStep[];
}

export interface FixProgressCheck {
  body: string;
  repository: string;
  prNumber: number;
}

function fixProgressInner(body: string): string | null {
  const normalized = normalizeNewlines(body);
  const pattern = new RegExp(
    `${escapeReviewHandoffRegExp(FIX_PROGRESS_START)}[ \\t]*\\n([\\u0000-\\uFFFF]*?)\\n[ \\t]*${escapeReviewHandoffRegExp(FIX_PROGRESS_END)}`,
  );
  return normalized.match(pattern)?.[1] ?? null;
}

/** Count fix-progress blocks in a comment body (LF/CRLF tolerant). */
export function countFixProgressBlocks(body: string): number {
  const normalized = normalizeNewlines(body);
  const pattern = new RegExp(
    `${escapeReviewHandoffRegExp(FIX_PROGRESS_START)}[ \\t]*\\n([\\u0000-\\uFFFF]*?)\\n[ \\t]*${escapeReviewHandoffRegExp(FIX_PROGRESS_END)}`,
    "g",
  );
  return [...normalized.matchAll(pattern)].length;
}

/** Render the resumable progress checkpoint consumed only by reruns. */
export function renderFixProgress(input: FixProgressInput): string {
  const lines: string[] = [FIX_PROGRESS_START, "## Fix progress", "", `- Progress version: ${FIX_PROGRESS_VERSION}`];
  lines.push(`- Repository: ${escapeHandoffText(input.repository)}`);
  lines.push(`- PR: ${input.prNumber}`);
  lines.push(`- Source review: ${escapeHandoffText(input.sourceReviewId)}`);
  lines.push(`- Handoff digest: ${escapeHandoffText(input.sourceHandoffDigest)}`);
  lines.push(`- Ticket: ${input.ticket === null ? "none" : `#${input.ticket}`}`);
  lines.push(`- Parent: ${input.parent === null ? "none" : `#${input.parent}`}`);
  lines.push(`- Started head: ${escapeHandoffText(input.startedHeadSha)}`);
  lines.push(`- Started base: ${escapeHandoffText(input.startedBaseSha)}`);
  lines.push(`- Resulting head: ${escapeHandoffText(input.resultingHeadSha)}`);
  lines.push(`- Resulting base: ${escapeHandoffText(input.resultingBaseSha)}`);
  for (const disposition of input.dispositions) {
    lines.push(`- Finding: ${escapeHandoffText(disposition.findingId)}`);
    lines.push(`  - Disposition: ${disposition.disposition}`);
    lines.push(`  - Files: ${disposition.files.map((file) => escapeHandoffText(file)).join(", ")}`);
    lines.push(`  - Commit: ${escapeHandoffText(disposition.commitSha)}`);
    lines.push(`  - Verification command: \`${escapeHandoffText(disposition.verificationCommand)}\``);
    lines.push(`  - Verification result: ${escapeHandoffText(disposition.verificationResult)}`);
  }
  lines.push(`- Findings count: ${input.dispositions.length}`);
  lines.push(`- Completed steps: ${input.completedSteps.join(", ")}`);
  lines.push(FIX_PROGRESS_END);
  return lines.join("\n");
}

/** Parse the resumable progress checkpoint for a rerun. Never authorizes work alone. */
export function parseFixProgress(check: FixProgressCheck): {
  found: boolean;
  repository?: string;
  prNumber?: number;
  sourceReviewId?: string;
  sourceHandoffDigest?: string;
  startedHeadSha?: string;
  startedBaseSha?: string;
  resultingHeadSha?: string;
  resultingBaseSha?: string;
  malformed: boolean;
  reason: string;
} {
  const normalized = normalizeNewlines(check.body);
  const starts = normalized.split(FIX_PROGRESS_START).length - 1;
  const ends = normalized.split(FIX_PROGRESS_END).length - 1;
  if (starts !== ends || starts !== countFixProgressBlocks(check.body)) {
    return { found: false, malformed: true, reason: "stray or unbalanced fix progress markers" };
  }
  if (starts === 0) return { found: false, malformed: false, reason: "no fix progress checkpoint" };
  if (starts > 1) return { found: false, malformed: true, reason: "multiple fix progress checkpoints" };
  const inner = fixProgressInner(check.body);
  if (inner === null) return { found: false, malformed: true, reason: "fix progress checkpoint is unreadable" };
  const one = (label: string): string | null => oneReviewHandoffField(inner, label);
  const repository = one("Repository");
  const prRaw = one("PR");
  const sourceReviewId = one("Source review");
  const digest = one("Handoff digest");
  const startedHeadSha = one("Started head");
  const startedBaseSha = one("Started base");
  const resultingHeadSha = one("Resulting head");
  const resultingBaseSha = one("Resulting base");
  if (!repository || !prRaw || !sourceReviewId || !digest || !startedHeadSha || !startedBaseSha || !resultingHeadSha || !resultingBaseSha) {
    return { found: false, malformed: true, reason: "fix progress checkpoint is incomplete" };
  }
  const prNumber = Number(prRaw);
  if (!Number.isInteger(prNumber) || prNumber < 1) {
    return { found: false, malformed: true, reason: "fix progress PR number is invalid" };
  }
  if (repository.toLowerCase() !== check.repository.toLowerCase() || prNumber !== check.prNumber) {
    return { found: false, malformed: true, reason: "fix progress checkpoint names another target" };
  }
  return {
    found: true,
    repository,
    prNumber,
    sourceReviewId,
    sourceHandoffDigest: digest,
    startedHeadSha,
    startedBaseSha,
    resultingHeadSha,
    resultingBaseSha,
    malformed: false,
    reason: "fix progress checkpoint parsed",
  };
}
