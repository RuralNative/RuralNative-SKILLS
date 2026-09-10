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
 * Coverage of proof entries against the resolved active criteria of one
 * issue (ADR-0038). Evidence IDs must match the resolved records: an
 * envelope's self-reported count never substitutes for per-ID coverage.
 */
export interface CriterionCoverageReport {
  /** Active criterion IDs in local order. */
  expectedIds: readonly string[];
  /** Proof IDs present exactly once. */
  covered: readonly string[];
  /** Active criteria without proof. */
  missing: readonly string[];
  /** Proof IDs that are retired or unknown for this issue. */
  extra: readonly string[];
  /** Proof IDs recorded more than once. */
  duplicates: readonly string[];
}

export function criterionCoverage(
  criteria: readonly AcceptanceCriterion[],
  proofIds: readonly string[],
): CriterionCoverageReport {
  const known = new Map(criteria.map((c) => [c.id, c.status] as const));
  const expected = activeCriteria(criteria).map((c) => c.id);
  const seen = new Set<string>();
  const covered: string[] = [];
  const duplicates: string[] = [];
  const extra: string[] = [];
  for (const id of proofIds) {
    const status = known.get(id);
    if (status !== "active") {
      extra.push(id);
      continue;
    }
    if (seen.has(id)) duplicates.push(id);
    else {
      seen.add(id);
      covered.push(id);
    }
  }
  const missing = expected.filter((id) => !seen.has(id));
  return { expectedIds: expected, covered, missing, extra, duplicates };
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

/**
 * True when a line starts an acceptance-criteria section in an adapted body.
 * Exact labels (`Acceptance criteria`, `**Acceptance criteria**:`, headings)
 * are recognized everywhere. Heading-styled lines whose label ends in
 * `acceptance criteria` (for example `## Project-level acceptance criteria`)
 * are recognized too, so a parent's suffixed acceptance heading resolves
 * instead of being read as an empty criterion set. A prose line merely
 * mentioning the phrase never starts a section.
 */
function isAcceptanceStart(line: string): boolean {
  const trimmed = line.trim();
  const headingStyled = /^#{1,6}\s+/.test(trimmed) || /^\*\*.*\*\*\s*:?\s*$/.test(trimmed);
  const text = stripAdaptedLabelMarkup(line).replace(/:\s*$/, "").trim().toLowerCase();
  if (text === ACCEPTANCE_LABEL) return true;
  if (headingStyled && text.endsWith(ACCEPTANCE_LABEL)) return true;
  return false;
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
  const notes: string[] = [];
  // A body carrying both settlement homes is not a consumption
  // contradiction (ADR-0038): the adapted fingerprint retains both homes in
  // the whole-body hash. Strict canonical publication validation still
  // rejects the pair, so canonical output keeps one home per role.
  const hasSolution = lines.some((line) => line.trim() === "## Solution");
  const hasSettled = lines.some((line) => line.trim() === "## Settled decisions");
  if (hasSolution && hasSettled) {
    notes.push(
      "adapted intake: the body carries both ## Solution and ## Settled decisions; the complete body is fingerprinted with both homes retained",
    );
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
      ...notes,
    ],
  };
}

/**
 * Typed requirements-resolution failure (ADR-0038). Thrown before any
 * fingerprint is computed when a parent or ticket body does not resolve;
 * callers stop with `needs-info` and surface the role-specific diagnostics.
 * No default, partial-body, or agent-computed pin replaces the throw.
 */
export interface RequirementsResolutionDiagnostic {
  role: PlanningRole;
  errors: readonly string[];
}

export class RequirementsResolutionError extends Error {
  readonly name = "RequirementsResolutionError";
  readonly diagnostics: readonly RequirementsResolutionDiagnostic[];
  constructor(diagnostics: readonly RequirementsResolutionDiagnostic[]) {
    const detail = diagnostics
      .map((d) => `${d.role}: ${d.errors.join("; ")}`)
      .join(" | ");
    super(`requirements resolution failed; no requirements revision is emitted for unresolved bodies (${detail})`);
    this.diagnostics = diagnostics;
  }
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
  // A requirements revision exists only for resolved requirements (ADR-0038).
  // Resolution failure stops before hashing; the typed error carries the
  // role-specific diagnostics so every caller and CLI boundary can name them.
  if (!parent.ok || !ticket.ok) {
    const diagnostics: RequirementsResolutionDiagnostic[] = [];
    if (!parent.ok) diagnostics.push({ role: "parent", errors: parent.errors });
    if (!ticket.ok) diagnostics.push({ role: "ticket", errors: ticket.errors });
    throw new RequirementsResolutionError(diagnostics);
  }
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

export interface EvidenceBehaviorClaim {
  criterionId: string;
  /** Focused command the criterion proof claims passed. */
  command: string;
}

/**
 * Extract the passing behavior claims from an evidence block. A claim exists
 * only for a criterion whose segment records a focused command, `Passed:
 * true`, and a result; non-behavior checks and non-passing records never
 * claim success. The bundled CLI uses these claims to require recorded
 * execution receipts checked against the observed project configuration
 * (ADR-0038): the block alone never authenticates a success label.
 */
export function extractEvidenceBehaviorClaims(body: string): EvidenceBehaviorClaim[] {
  const normalized = normalizeNewlines(body);
  const pattern = new RegExp(
    `${escapeHandoffRegExp(COMPACT_START)}[ \t]*\n([\u0000-\uFFFF]*?)\n[ \t]*${escapeHandoffRegExp(COMPACT_END)}`,
  );
  const match = normalized.match(pattern);
  if (!match) return [];
  const inner = match[1];
  const lines = inner.split("\n");
  const headerIndexes: number[] = [];
  lines.forEach((line, i) => {
    if (/\*\*Criterion:\*\*/.test(line)) headerIndexes.push(i);
  });
  const criteriaEnd = lines.findIndex((line) => /^[ \t]*-[ \t]*Criteria revision:/.test(line));
  const end = criteriaEnd >= 0 ? criteriaEnd : lines.length;
  const claims: EvidenceBehaviorClaim[] = [];
  for (let h = 0; h < headerIndexes.length; h++) {
    const segment = lines.slice(headerIndexes[h], h + 1 < headerIndexes.length ? headerIndexes[h + 1] : end).join("\n");
    const idMatch = segment.match(/`?([A-Za-z]{2,3}-\d+)`?/);
    const commandMatch = segment.match(/Focused command:[ \t]*`([^`]+)`/);
    const passedTrue = /Passed:[ \t]*true/i.test(segment);
    const hasResult = /Result:[ \t]*\S/.test(segment);
    if (!idMatch || !commandMatch) continue;
    if (!passedTrue || !hasResult) continue;
    claims.push({ criterionId: idMatch[1], command: commandMatch[1] });
  }
  return claims;
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

// --- Shared implementation evidence rendering (ADR-0038) ---------------------
//
// Pure evidence render/upsert/read helpers shared by `/implement-this` and
// `/fix-this`. Both stages render and validate `evidence-v2` from their own
// installed bundle; `implement-this` keeps local compatibility exports that
// re-export from this core.

/** Marker constants kept for compatibility with local producer modules. */
export const COMPACT_EVIDENCE_MARKER_START = COMPACT_START;
export const COMPACT_EVIDENCE_MARKER_END = COMPACT_END;
export const LEGACY_EVIDENCE_MARKER_START = LEGACY_START;
export const LEGACY_EVIDENCE_MARKER_END = LEGACY_END;

export type CriterionEvidence =
  | {
      criterionId: string;
      kind: "behavior";
      /** Focused command run, e.g. `node --test skills/...`. */
      focusedCommand: string;
      /** Observed result, e.g. `12 passed`. */
      result: string;
      /** Explicit result from the focused command. Failed runs are not proof. */
      passed: boolean;
    }
  | {
      criterionId: string;
      kind: "non-behavior";
      /** Narrow check run, or why no executable behavior changed. */
      rationale: string;
    };

export interface CompactEvidenceInput {
  /** Criterion records carrying stable local IDs, text, and status. */
  criteria: readonly AcceptanceCriterion[];
  evidence: readonly CriterionEvidence[];
  isBugFix: boolean;
  /** Defect-specific failing command recorded before the fix. */
  bugRedCommand?: string;
  /** Defect-specific failing output recorded before the fix. */
  bugRedOutput?: string;
  /** The versioned requirements revision value pinned for this ticket. */
  requirementsRevision: string;
  /** Final committed head SHA the evidence was verified against. */
  headSha: string;
}

export interface EvidenceValidationResult {
  ok: boolean;
  errors: readonly string[];
}

function isNonEmptyEvidenceString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function escapeEvidenceText(value: string): string {
  return value.replace(/-->/g, "--\\u003E");
}

function activeCriterionIdSet(criteria: readonly AcceptanceCriterion[]): Set<string> {
  return new Set(activeCriteria(criteria).map((c) => c.id));
}

function retiredCriterionIdSet(criteria: readonly AcceptanceCriterion[]): Set<string> {
  return new Set(criteria.filter((c) => c.status === "retired").map((c) => c.id));
}

export function validateCompactEvidence(
  input: CompactEvidenceInput,
): EvidenceValidationResult {
  const errors: string[] = [];

  const activeIds = activeCriterionIdSet(input.criteria);
  const retiredIds = retiredCriterionIdSet(input.criteria);
  const allCriterionIds = new Set(input.criteria.map((c) => c.id));

  for (const criterion of input.criteria) {
    if (!/^[A-Za-z]{2,3}-\d+$/.test(criterion.id)) {
      errors.push(`malformed criterion id: ${criterion.id}`);
    }
    if (criterion.status !== "active" && criterion.status !== "retired") {
      errors.push(`criterion ${criterion.id} must be active or retired`);
    }
  }
  const seenCriteria = new Set<string>();
  for (const criterion of input.criteria) {
    if (seenCriteria.has(criterion.id)) {
      errors.push(`duplicate or reused criterion id within the issue: ${criterion.id}`);
    }
    seenCriteria.add(criterion.id);
  }

  const expectedActive = activeCriteria(input.criteria).length;
  if (input.evidence.length !== expectedActive) {
    errors.push(
      `criterion coverage: expected ${expectedActive} evidence entries, got ${input.evidence.length}`,
    );
  }

  const seen = new Set<string>();
  for (const ev of input.evidence) {
    if (!allCriterionIds.has(ev.criterionId)) {
      errors.push(`unknown criterion: ${ev.criterionId}`);
    } else if (retiredIds.has(ev.criterionId)) {
      errors.push(`retired criterion is never accepted as active evidence: ${ev.criterionId}`);
    }
    if (seen.has(ev.criterionId)) {
      errors.push(`duplicate criterion: ${ev.criterionId}`);
    }
    seen.add(ev.criterionId);
  }
  for (const id of activeIds) {
    if (!seen.has(id)) {
      errors.push(`missing evidence for criterion: ${id}`);
    }
  }

  for (const ev of input.evidence) {
    if (ev.kind === "behavior") {
      if (!isNonEmptyEvidenceString(ev.focusedCommand)) {
        errors.push(`behavior criterion "${ev.criterionId}" requires a focused command`);
      }
      if (!isNonEmptyEvidenceString(ev.result)) {
        errors.push(`behavior criterion "${ev.criterionId}" requires a result`);
      }
      if (ev.passed !== true) {
        errors.push(`behavior criterion "${ev.criterionId}" requires an explicitly passing result`);
      }
    } else if (ev.kind === "non-behavior") {
      if (!isNonEmptyEvidenceString(ev.rationale)) {
        errors.push(`non-behavior criterion "${ev.criterionId}" requires a rationale`);
      }
    } else {
      errors.push(`criterion "${(ev as { criterionId: string }).criterionId}" has unknown kind`);
    }
  }

  if (input.isBugFix === true) {
    if (!isNonEmptyEvidenceString(input.bugRedCommand)) {
      errors.push("bug-fix ticket requires the defect-specific failing command");
    }
    if (!isNonEmptyEvidenceString(input.bugRedOutput)) {
      errors.push("bug-fix ticket requires the defect-specific failing output");
    }
  }

  if (!requirementsPinWellFormed(input.requirementsRevision)) {
    errors.push(
      `requirements revision must match a supported version (${SUPPORTED_REQUIREMENTS_VERSIONS.join(", ")}):parent=<sha256>;ticket=<sha256>`,
    );
  }

  if (!isNonEmptyEvidenceString(input.headSha)) {
    errors.push("evidence head SHA must be a non-empty value");
  }

  return { ok: errors.length === 0, errors };
}

export function renderCompactEvidence(input: CompactEvidenceInput): string {
  const validation = validateCompactEvidence(input);
  if (!validation.ok) {
    throw new Error(`invalid compact evidence: ${validation.errors.join("; ")}`);
  }
  const evidenceByCriterion = new Map(input.evidence.map((e) => [e.criterionId, e] as const));
  const lines: string[] = [];
  lines.push(COMPACT_START);
  lines.push("## Implementation evidence");
  lines.push("");
  for (const criterion of activeCriteria(input.criteria)) {
    const ev = evidenceByCriterion.get(criterion.id)!;
    lines.push(`- **Criterion:** \`${escapeEvidenceText(criterion.id)}\` — ${escapeEvidenceText(criterion.text)}`);
    if (ev.kind === "behavior") {
      lines.push(`  - Focused command: \`${escapeEvidenceText(ev.focusedCommand)}\``);
      lines.push("  - Passed: true");
      lines.push(`  - Result: ${escapeEvidenceText(ev.result)}`);
    } else {
      lines.push(`  - Check: ${escapeEvidenceText(ev.rationale)}`);
    }
  }
  if (input.isBugFix === true) {
    lines.push("");
    lines.push("### Bug reproduction");
    lines.push(`- RED command: \`${escapeEvidenceText(input.bugRedCommand!)}\``);
    lines.push(`- RED output: ${escapeEvidenceText(input.bugRedOutput!)}`);
  }
  lines.push("");
  lines.push(`- Criteria revision: ${escapeEvidenceText(criteriaRevision(input.criteria))}`);
  lines.push(`- Requirements revision: ${escapeEvidenceText(input.requirementsRevision)}`);
  lines.push(`- Envelope version: ${EVIDENCE_ENVELOPE_VERSION}`);
  lines.push(`- Head SHA: ${escapeEvidenceText(input.headSha)}`);
  lines.push(COMPACT_END);
  return lines.join("\n");
}

function evidenceBlockSource(): string {
  return `${escapeReviewHandoffRegExp(COMPACT_START)}[ \\t]*\\r?\\n([\\s\\S]*?)\\r?\\n[ \\t]*${escapeReviewHandoffRegExp(COMPACT_END)}`;
}

function evidenceBodyPattern(): RegExp {
  return new RegExp(evidenceBlockSource());
}

function evidenceBodyPatternGlobal(): RegExp {
  return new RegExp(evidenceBlockSource(), "g");
}

/** Upsert exactly one compact evidence block into a pull-request body. */
export function upsertCompactEvidenceBlock(existingBody: string, block: string): string {
  const withoutOldBlocks = existingBody.replace(evidenceBodyPatternGlobal(), "").trimEnd();
  return withoutOldBlocks.length > 0
    ? `${withoutOldBlocks}\n\n${block}\n`
    : `${block}\n`;
}

/** Read the compact block from a pull-request body, if present. */
export function parseCompactEvidenceBlock(body: string): string | null {
  const normalized = normalizeNewlines(body);
  const match = normalized.match(evidenceBodyPattern());
  return match ? match[1] : null;
}

/**
 * Migration read: the compact block lives only in the pull-request body,
 * otherwise the legacy acceptance-evidence block in the body or comments.
 * Comment bodies carry legacy evidence only. New runs write only the
 * compact body form.
 */
export function readEvidenceForReview(
  body: string,
  comments: readonly string[] = [],
): string | null {
  const compact = parseCompactEvidenceBlock(body);
  if (compact !== null) return compact;
  const normalized = normalizeNewlines(body);
  const legacy = normalized.match(
    new RegExp(
      `${escapeReviewHandoffRegExp(LEGACY_START)}[ \\t]*\\n([\\s\\S]*?)\\n[ \\t]*${escapeReviewHandoffRegExp(LEGACY_END)}`,
    ),
  );
  if (legacy) return legacy[1];
  for (const comment of comments) {
    const normalizedComment = normalizeNewlines(comment);
    const legacyComment = normalizedComment.match(
      new RegExp(
        `${escapeReviewHandoffRegExp(LEGACY_START)}[ \\t]*\\n([\\s\\S]*?)\\n[ \\t]*${escapeReviewHandoffRegExp(LEGACY_END)}`,
      ),
    );
    if (legacyComment) return legacyComment[1];
  }
  return null;
}

function evidenceFenceSegments(body: string): { text: string; fenced: boolean }[] {
  const segments: { text: string; fenced: boolean }[] = [];
  const fencePattern = /```[\s\S]*?(?:```|$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = fencePattern.exec(body)) !== null) {
    if (m.index > last) segments.push({ text: body.slice(last, m.index), fenced: false });
    segments.push({ text: m[0], fenced: true });
    last = m.index + m[0].length;
  }
  if (last < body.length) segments.push({ text: body.slice(last), fenced: false });
  if (segments.length === 0) segments.push({ text: body, fenced: false });
  return segments;
}

function evidenceTargetClosingAssociation(ticket: number): RegExp {
  return new RegExp(
    `(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)[ \\t]+(?:https?:\\/\\/[^\\s]+\\/issues\\/${ticket}(?!\\d)|#${ticket}(?!\\d))`,
    "i",
  );
}

function evidenceProseHasTargetClosing(body: string, ticket: number): boolean {
  const pattern = evidenceTargetClosingAssociation(ticket);
  return evidenceFenceSegments(body).some((s) => !s.fenced && pattern.test(s.text));
}

function evidenceRemoveStandaloneTargetCloses(body: string, ticket: number): string {
  return evidenceFenceSegments(body)
    .map((s) => {
      if (s.fenced) return s.text;
      return s.text.replace(/^[ \t]*[Cc]loses[ \t]+#\d+[ \t]*\r?$/gm, (line) => {
        const n = Number(line.match(/#(\d+)/)?.[1] ?? NaN);
        return n === ticket ? "" : line;
      });
    })
    .join("");
}

function evidenceCollapseProseBlankLines(body: string): string {
  return evidenceFenceSegments(body)
    .map((s) => (s.fenced ? s.text : s.text.replace(/\n{3,}/g, "\n\n")))
    .join("");
}

/**
 * Ensure exactly one `Closes #<ticket>` line for the target ticket.
 * Preserves unrelated prose and fenced examples.
 */
export function ensureClosingReference(body: string, ticket: number): string {
  const prose = evidenceFenceSegments(body)
    .filter((s) => !s.fenced)
    .map((s) => s.text)
    .join("");
  const targetPattern = new RegExp(`^[ \\t]*[Cc]loses[ \\t]+#${ticket}[ \\t]*\\r?$`, "gm");
  if ((prose.match(targetPattern) ?? []).length === 1 && !evidenceProseHasTargetClosingOtherForm(body, ticket)) {
    return body.endsWith("\n") ? body : `${body}\n`;
  }
  const withoutTargets = evidenceRemoveStandaloneTargetCloses(body, ticket);
  if (evidenceProseHasTargetClosing(withoutTargets, ticket)) {
    const cleaned = evidenceCollapseProseBlankLines(withoutTargets).trimEnd();
    return cleaned.endsWith("\n") ? cleaned : `${cleaned}\n`;
  }
  const cleaned = evidenceCollapseProseBlankLines(withoutTargets).trimEnd();
  const line = `Closes #${ticket}`;
  return cleaned.length > 0 ? `${cleaned}\n\n${line}\n` : `${line}\n`;
}

function evidenceProseHasTargetClosingOtherForm(body: string, ticket: number): boolean {
  const segments = evidenceFenceSegments(body);
  const prose = segments
    .filter((s) => !s.fenced)
    .map((s) => s.text)
    .join("");
  const withoutCanonical = prose.replace(/^[ \t]*[Cc]loses[ \t]+#\d+[ \t]*\r?$/gm, "");
  return evidenceTargetClosingAssociation(ticket).test(withoutCanonical);
}

export interface NativeClosingReference {
  /** Repository in `owner/name` form when the reference names one, else null. */
  repository: string | null;
  ticket: number;
  /** Raw matched text for diagnostics. */
  raw: string;
}

/**
 * Native closing references with full repository identity (ADR-0040).
 * Local `Closes #<ticket>` text is presentation only; association authority
 * is the native link GitHub reports. This parser extracts only closing-keyword
 * references (`Closes owner/repo#123`, `Fixes #123`, closing issue URLs) so a
 * plain mention such as `see o/r#288` never counts as association proof.
 */
export function extractClosingReferences(body: string): NativeClosingReference[] {
  const out: NativeClosingReference[] = [];
  const keyword = "(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)";
  for (const segment of evidenceFenceSegments(body)) {
    if (segment.fenced) continue;
    const text = segment.text;
    const urlPattern = new RegExp(`${keyword}[ \\t]+https?://[^\\s]+/([A-Za-z0-9-_.]+/[A-Za-z0-9-_.]+)/issues/(\\d+)(?!\\d)`, "gi");
    let m: RegExpExecArray | null;
    while ((m = urlPattern.exec(text)) !== null) {
      out.push({ repository: m[1], ticket: Number(m[2]), raw: m[0] });
    }
    const qualifiedPattern = new RegExp(`${keyword}[ \\t]+([A-Za-z0-9-_.]+/[A-Za-z0-9-_.]+)#(\\d+)(?!\\d)`, "gi");
    while ((m = qualifiedPattern.exec(text)) !== null) {
      out.push({ repository: m[1], ticket: Number(m[2]), raw: m[0] });
    }
    const barePattern = /(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)[ \t]+#(\d+)(?!\d)/gi;
    while ((m = barePattern.exec(text)) !== null) {
      const before = text.slice(Math.max(0, (m.index ?? 0) - 60), m.index ?? 0);
      if (/[A-Za-z0-9-_.]+\/[A-Za-z0-9-_.]+$/.test(before.trimEnd())) continue;
      out.push({ repository: null, ticket: Number(m[1]), raw: m[0] });
    }
  }
  return out;
}

/**
 * True when the body carries a native closing link for the ticket in the
 * expected repository. Bare `#<ticket>` counts only when no conflicting
 * repository-qualified link for the same ticket names another repository.
 * An empty expected repository never matches.
 */
export function hasNativeClosingReference(body: string, ticket: number, expectedRepository: string): boolean {
  if (expectedRepository.trim() === "") return false;
  const refs = extractClosingReferences(body).filter((r) => r.ticket === ticket);
  if (refs.length === 0) return false;
  const expected = expectedRepository.toLowerCase();
  let bare = false;
  for (const ref of refs) {
    if (ref.repository === null) {
      bare = true;
      continue;
    }
    if (ref.repository.toLowerCase() === expected) return true;
  }
  return bare && !refs.some((r) => r.repository !== null && r.repository.toLowerCase() !== expected);
}

/**
 * Compose the pull-request body in one publication operation: exactly one
 * compact evidence block plus exactly one target closing reference,
 * preserving unrelated prose and fenced examples.
 */
export function composePullRequestBody(
  existingBody: string,
  ticket: number,
  block: string,
): string {
  const withoutBlocks = existingBody.replace(evidenceBodyPatternGlobal(), "");
  const withoutTargets = evidenceRemoveStandaloneTargetCloses(withoutBlocks, ticket);
  const trimmedBlock = block.trim();
  if (evidenceProseHasTargetClosing(withoutTargets, ticket)) {
    const cleaned = evidenceCollapseProseBlankLines(withoutTargets).trimEnd();
    if (cleaned.length === 0) return `${trimmedBlock}\n`;
    return `${cleaned}\n\n${trimmedBlock}\n`;
  }
  const cleaned = evidenceCollapseProseBlankLines(withoutTargets).trimEnd();
  const line = `Closes #${ticket}`;
  if (cleaned.length === 0) return `${trimmedBlock}\n\n${line}\n`;
  return `${cleaned}\n\n${trimmedBlock}\n\n${line}\n`;
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
  /** The single match has the expected base (`main`). @deprecated Use baseMatchesDefault. */
  baseIsMain: boolean;
  /** The single match targets the pinned default branch (ADR-0040). */
  baseMatchesDefault?: boolean;
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
  const baseOk = match.baseMatchesDefault ?? match.baseIsMain;
  if (!baseOk) {
    return { proceed: false, reason: "the single open pull request does not target the pinned default branch" };
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
 *
 * Legacy contract: multi-source values contain newlines and do not survive
 * `escapeHandoffText` flattening. New code uses `reviewPolicyRevision`
 * (single-line SHA-256 carrier) for publication; this function is retained
 * for independent recomputation of existing valid no-source/single-source
 * legacy reports. Never normalize a lossy multi-source flattened report
 * into a trusted match.
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

// --- Review-policy revision v1 (single-line carrier) ------------------------
//
// `effectivePolicyRevision` joins multiple sources with newlines while
// `escapeHandoffText` flattens newlines to spaces before the validator
// compares the result. A multi-source policy revision therefore never
// round-trips. `reviewPolicyRevision` is the publication carrier: a
// single-line, versioned SHA-256 over the canonical sorted source
// identities/hashes, including policy presence and the accepted approval
// scope. Callers pass the hasher through the shared pure boundary, as
// requirements revisions already do.

export const REVIEW_POLICY_VERSION = "review-policy-v1";

export const SUPPORTED_POLICY_VERSIONS: readonly string[] = [
  REVIEW_CONTRACT_VERSION,
  REVIEW_POLICY_VERSION,
];

export function isSupportedPolicyVersion(version: string): boolean {
  return (SUPPORTED_POLICY_VERSIONS as readonly string[]).includes(version);
}

/** Canonical text hashed by `reviewPolicyRevision`. Sorted; presence is explicit. */
export function policyCanonicalText(
  sources: readonly PolicySource[],
  acceptedApproval?: { commentId: string; bodyHash: string; scope: readonly string[] } | null,
): string {
  const sorted = [...sources]
    .map((s) => `${s.path}\t${s.hash}`)
    .sort();
  const body = sorted.length === 0 ? "no-sources" : sorted.join("\n");
  const approval = acceptedApproval
    ? `approval:${acceptedApproval.commentId}\t${acceptedApproval.bodyHash}\t${[...acceptedApproval.scope].sort().join(",")}`
    : "no-approval";
  return `${REVIEW_POLICY_VERSION}\n${body}\n${approval}`;
}

/**
 * Single-line versioned policy revision. Includes governing sources and the
 * accepted approval scope; adding, removing, or changing a source or the
 * approval invalidates verdict reuse. Survives `escapeHandoffText`
 * unchanged because it contains no newlines.
 */
export function reviewPolicyRevision(
  sources: readonly PolicySource[],
  hash: RevisionHasher,
  acceptedApproval?: { commentId: string; bodyHash: string; scope: readonly string[] } | null,
): string {
  return `${REVIEW_POLICY_VERSION}:${hash(policyCanonicalText(sources, acceptedApproval ?? null))}`;
}

/** True when the value is a well-formed supported policy revision. */
export function policyRevisionWellFormed(value: unknown): boolean {
  if (typeof value !== "string" || value.trim() === "") return false;
  if (new RegExp(`^${escapeHandoffRegExp(REVIEW_POLICY_VERSION)}:[a-f0-9]{64}$`).test(value)) return true;
  if (value.startsWith(`${REVIEW_CONTRACT_VERSION}:`) && value.length > REVIEW_CONTRACT_VERSION.length + 1) {
    // Legacy single-line reports (no-source or single-source) round-trip;
    // lossy multi-source flattened reports never equal a recomputed legacy
    // value and therefore never match.
    return !value.includes("\n");
  }
  return false;
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
  /** Native review-comment ID carrying this finding, when published inline. */
  commentId?: string;
  /** Native review-thread node ID for disposition, when GitHub reports one. */
  threadId?: string;
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
    /**
     * True when the comment list is a complete native enumeration.
     * When true, an empty claimed set passes only against an empty
     * observation and every claimed ID must be observed (ADR-0040).
     * When absent, legacy subset checking applies to valid prior records.
     */
    commentIdsComplete?: boolean;
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
    const commentId = get("Comment ID");
    const threadId = get("Thread ID");
    if (commentId !== null && commentId.trim() === "") {
      return { findings: [], error: `review handoff finding ${id} has an invalid comment ID` };
    }
    if (threadId !== null && threadId.trim() === "") {
      return { findings: [], error: `review handoff finding ${id} has an invalid thread ID` };
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
      commentId: commentId ?? undefined,
      threadId: threadId ?? undefined,
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
  if (!policyRevisionWellFormed(input.reviewPolicyRevision)) return "review handoff policy revision is malformed";
  if (!isNonEmptyHandoffString(input.verificationCommand)) return "review handoff verification command is missing";
  if (!isNonEmptyHandoffString(input.verificationResult)) return "review handoff verification result is missing";
  if (input.closesTicket !== null && (!Number.isInteger(input.closesTicket) || input.closesTicket < 1)) {
    return "review handoff closing ticket is invalid";
  }
  const ids = new Set<string>();
  const commentIds = new Set<string>();
  for (const finding of input.findings) {
    if (ids.has(finding.id)) return `review handoff carries a duplicate finding id: ${finding.id}`;
    ids.add(finding.id);
    if (finding.reviewedHeadSha !== input.reviewedHeadSha || finding.reviewedBaseSha !== input.reviewedBaseSha) {
      return `review handoff finding ${finding.id} is pinned to another revision`;
    }
    if (finding.commentId !== undefined) {
      if (finding.commentId.trim() === "") return `review handoff finding ${finding.id} has an invalid comment ID`;
      if (commentIds.has(finding.commentId)) {
        return `review handoff carries a duplicate comment id: ${finding.commentId}`;
      }
      commentIds.add(finding.commentId);
    }
    if (finding.threadId !== undefined && finding.threadId.trim() === "") {
      return `review handoff finding ${finding.id} has an invalid thread ID`;
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
    if (finding.commentId !== undefined) lines.push(`  - Comment ID: ${escapeHandoffText(finding.commentId)}`);
    if (finding.threadId !== undefined) lines.push(`  - Thread ID: ${escapeHandoffText(finding.threadId)}`);
  }
  lines.push(`- Findings count: ${input.findings.length}`);
  lines.push(REVIEW_HANDOFF_END);
  return lines.join("\n");
}

/**
 * Deterministic canonical text of a validated review handoff (ADR-0038).
 * Fix progress digests hash this rendering of the validated source handoff,
 * never the surrounding review prose.
 */
export function reviewHandoffCanonicalText(input: ReviewHandoffInput): string {
  const findings = [...input.findings]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(
      (f) =>
        `${f.id}\t${f.source}\t${f.category}\t${f.severity}\t${f.file}\t${f.line}\t${f.message}\t${f.evidenceKind}\t${f.quote ?? ""}\t${f.command ?? ""}\t${f.output ?? ""}\t${f.governingRule}\t${f.ticket ?? ""}`,
    )
    .join("\n");
  return [
    `repository=${input.repository}`,
    `pr=${input.prNumber}`,
    `head=${input.reviewedHeadSha}`,
    `base=${input.reviewedBaseSha}`,
    `closes=${input.closesTicket ?? ""}`,
    `requirements=${input.requirementsRevision}`,
    `policy=${input.reviewPolicyRevision}`,
    `verification=${input.verificationCommand}\t${input.verificationPassed}\t${input.verificationResult}`,
    `provenance=${input.provenance.reviewId}\t${input.provenance.reviewAuthor}\t${input.provenance.reviewedCommit}\t${input.provenance.reviewerPermission}`,
    findings,
  ].join("\n");
}

/** Digest of the deterministic handoff rendering for fix-progress receipts. */
export function reviewHandoffDigest(
  input: ReviewHandoffInput,
  hash: RevisionHasher,
): string {
  return hash(reviewHandoffCanonicalText(input));
}

export type ReviewHandoffStructuralParse =
  | { ok: true; handoff: ReviewHandoffInput }
  | { ok: false; reason: string };

/**
 * Structural parse of one review-handoff block into a validated input. It
 * checks markers, version, required fields, findings, and payload
 * self-consistency only; it never compares against current revisions or
 * observed native facts, which belong to `validateReviewHandoff`. Callers
 * use it to recompute the canonical handoff digest from a published body
 * (ADR-0038) before trusting a checkpoint that names that digest.
 */
export function parseReviewHandoffInput(body: string): ReviewHandoffStructuralParse {
  const normalized = normalizeNewlines(body);
  const starts = normalized.split(REVIEW_HANDOFF_START).length - 1;
  const ends = normalized.split(REVIEW_HANDOFF_END).length - 1;
  if (starts !== ends || starts !== countReviewHandoffBlocks(body)) {
    return { ok: false, reason: "stray or unbalanced review handoff markers in the review body" };
  }
  if (starts !== 1) {
    return { ok: false, reason: "the review body must carry exactly one review handoff block" };
  }
  const inner = reviewHandoffInner(body);
  if (inner === null) {
    return { ok: false, reason: "review handoff block is unreadable" };
  }
  const version = oneReviewHandoffField(inner, "Handoff version");
  if (version === null) {
    return { ok: false, reason: "review handoff version is missing or duplicated" };
  }
  if (version !== REVIEW_HANDOFF_VERSION) {
    return { ok: false, reason: `unsupported review handoff ${version}` };
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
      return { ok: false, reason: `review handoff ${label.toLowerCase()} is missing or duplicated` };
    }
  }
  const prNumber = Number(topLevel("PR")!);
  if (!Number.isInteger(prNumber) || prNumber < 1) {
    return { ok: false, reason: "review handoff PR number is invalid" };
  }
  const closesRaw = topLevel("Closes ticket") ?? "none";
  let closesTicket: number | null = null;
  if (closesRaw !== "none") {
    const parsed = Number(closesRaw.replace(/^#/, ""));
    if (!Number.isInteger(parsed) || parsed < 1) {
      return { ok: false, reason: "review handoff closing ticket is invalid" };
    }
    closesTicket = parsed;
  }
  const verificationPassedRaw = topLevel("Verification passed")!;
  if (verificationPassedRaw !== "true" && verificationPassedRaw !== "false") {
    return { ok: false, reason: "review handoff verification status is invalid" };
  }
  const findingsCountRaw = topLevel("Findings count")!;
  const findingsCount = Number(findingsCountRaw);
  if (!Number.isInteger(findingsCount) || findingsCount < 0) {
    return { ok: false, reason: "review handoff findings count is invalid" };
  }
  const parsedFindings = parseReviewHandoffFindings(inner);
  if (parsedFindings.error) return { ok: false, reason: parsedFindings.error };
  if (parsedFindings.findings.length !== findingsCount) {
    return { ok: false, reason: "review handoff findings count does not match its findings" };
  }
  const reviewerPermission = topLevel("Reviewer permission")!;
  if (
    reviewerPermission !== "policy" &&
    reviewerPermission !== "write" &&
    reviewerPermission !== "maintain" &&
    reviewerPermission !== "admin"
  ) {
    return { ok: false, reason: "review handoff reviewer permission is invalid" };
  }
  const commentIds = topLevel("Comment IDs") ?? "";
  const handoff: ReviewHandoffInput = {
    repository: topLevel("Repository")!,
    prNumber,
    reviewedHeadSha: topLevel("Reviewed head")!,
    reviewedBaseSha: topLevel("Reviewed base")!,
    closesTicket,
    requirementsRevision: topLevel("Requirements revision")!,
    reviewPolicyRevision: topLevel("Review policy revision")!,
    verificationCommand: (topLevel("Verification command") ?? "").replace(/^`|`$/g, ""),
    verificationResult: topLevel("Verification result")!,
    verificationPassed: verificationPassedRaw === "true",
    findings: parsedFindings.findings,
    provenance: {
      reviewId: topLevel("Review ID")!,
      reviewAuthor: topLevel("Review author")!,
      reviewedCommit: topLevel("Reviewed commit")!,
      reviewedAt: topLevel("Reviewed at") ?? "",
      sourceUrl: topLevel("Source URL") ?? "",
      reviewerPermission,
      commentIds: commentIds === "" ? [] : commentIds.split(",").map((id) => id.trim()).filter((id) => id !== ""),
    },
  };
  const error = validateReviewHandoffInput(handoff);
  if (error) return { ok: false, reason: error };
  return { ok: true, handoff };
}

/**
 * Recompute the canonical handoff digest from a published review body. The
 * checkpoint digest must equal this value; hashing surrounding review prose
 * or accepting a payload-supplied digest never counts (ADR-0038).
 */
export function reviewHandoffDigestOfBody(
  body: string,
  hash: RevisionHasher,
): { ok: true; digest: string } | { ok: false; reason: string } {
  const parsed = parseReviewHandoffInput(body);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  return { ok: true, digest: reviewHandoffDigest(parsed.handoff, hash) };
}

/**
 * Collaborator permissions that authorize review content (ADR-0040).
 * Movement between these roles alone never invalidates the content;
 * `policy` is a separate project authorization and `unknown` never passes.
 */
export function isCollaboratorReviewPermission(
  value: string,
): value is "write" | "maintain" | "admin" {
  return value === "write" || value === "maintain" || value === "admin";
}

/**
 * Payload permission matches observation when both name the same
 * collaborator tier or both name `policy`. A claimed historical role never
 * overrides current authorization: the observed value decides.
 */
export function reviewerPermissionMatches(
  observed: string,
  claimed: string,
): boolean {
  if (observed === claimed) return true;
  return isCollaboratorReviewPermission(observed) && isCollaboratorReviewPermission(claimed);
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
  const verificationCommand = (topLevel("Verification command") ?? "").replace(/^`|`$/g, "");
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
    check.observedProvenance.reviewedCommit !== handoff.provenance.reviewedCommit ||
    check.observedProvenance.reviewedCommit !== handoff.reviewedHeadSha
  ) {
    return { status: "stale", reason: "observed native review does not match the published handoff" };
  }
  // Independent authorization (ADR-0040): the observed permission decides.
  // Movement between still-authorized collaborator roles alone keeps the
  // content valid; a claimed role never overrides the observation.
  if (!reviewerPermissionMatches(check.observedProvenance.reviewerPermission, handoff.provenance.reviewerPermission)) {
    return { status: "stale", reason: "observed reviewer permission does not authorize the published handoff" };
  }
  const observedSourceUrl = check.observedProvenance.sourceUrl ?? "";
  const observedComments = new Set(check.observedProvenance.commentIds ?? []);
  const observedReviewedAt = check.observedProvenance.reviewedAt ?? "";
  // Provenance fields beyond identity are validated independently (ADR-0038):
  // a payload-supplied source URL, comment ownership, or timestamp must match
  // the observation. The handoff renders before GitHub reports the native
  // submission timestamp, so an empty payload timestamp stays valid while
  // pending; once the payload supplies one it must match observation.
  if (observedSourceUrl.trim() === "") {
    return { status: "malformed", reason: "the observed native review source URL is missing; verify it before fixes" };
  }
  if (handoff.provenance.sourceUrl.trim() !== "" && handoff.provenance.sourceUrl !== observedSourceUrl) {
    return { status: "stale", reason: "review handoff source URL does not match the observed native report" };
  }
  for (const id of handoff.provenance.commentIds) {
    if (!observedComments.has(id)) {
      return { status: "stale", reason: "review handoff claims comments the observed native report does not own" };
    }
  }
  // Complete enumeration (ADR-0040): when the caller proves the comment list
  // is complete, every observed comment must be claimed. An empty claimed set
  // passes only against a complete empty observation.
  if (check.observedProvenance.commentIdsComplete === true) {
    const claimed = new Set(handoff.provenance.commentIds);
    for (const id of observedComments) {
      if (!claimed.has(id)) {
        return { status: "stale", reason: "observed native comments are missing from the published handoff" };
      }
    }
  }
  if (
    handoff.provenance.reviewedAt.trim() !== "" &&
    handoff.provenance.reviewedAt !== observedReviewedAt
  ) {
    return { status: "stale", reason: "review handoff timestamp does not match the observed native report" };
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
  /**
   * The published review handoff validated `current` through
   * `validateReviewHandoff` with independently observed native provenance.
   * An unchecked status string never enters this gate (ADR-0038).
   */
  reviewHandoffCurrent: boolean;
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
  if (!fact.reviewHandoffCurrent) blockers.push("the validated review handoff is not current");
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

/**
 * Classify a pinned requirements carrier against the current one (ADR-0038).
 * Pin inequality alone never proves a requirements edit. This function sees
 * only the two carriers, never the historical body or how the old pin was
 * produced, so a same-version mismatch reports a revision mismatch with
 * unproven cause unless the caller separately proves the body changed. A
 * version difference is a legacy-contract mismatch whose cause is unproven
 * and whose recovery requires full revalidation before any repin.
 */
export type PinnedRevisionClassification =
  | "equal"
  | "legacy-contract"
  | "body-change"
  | "revision-mismatch"
  | "missing-or-malformed";

export interface PinnedRevisionClassificationResult {
  classification: PinnedRevisionClassification;
  reason: string;
}

export function classifyRequirementsPin(
  pinned: string,
  current: string,
  options: { provenBodyChange?: boolean } = {},
): PinnedRevisionClassificationResult {
  if (!requirementsPinWellFormed(pinned)) {
    return {
      classification: "missing-or-malformed",
      reason: "the pinned requirements revision is missing or malformed; it is never provenance",
    };
  }
  if (pinned === current) {
    return { classification: "equal", reason: "the pinned revision matches the current bodies" };
  }
  const pinnedVersion = pinned.slice(0, pinned.indexOf(":"));
  const currentVersion = current.slice(0, current.indexOf(":"));
  if (pinnedVersion !== currentVersion) {
    return {
      classification: "legacy-contract",
      reason: `the pinned ${pinnedVersion} revision and the current ${currentVersion} revision differ under different parser contracts; cause unproven, full revalidation required before any repin`,
    };
  }
  if (options.provenBodyChange === true) {
    return {
      classification: "body-change",
      reason: "the pinned and current revisions differ under the same contract and separate evidence proves the parent or ticket body changed; reconcile the changed requirements before any repin",
    };
  }
  return {
    classification: "revision-mismatch",
    reason: "the pinned and current revisions differ under the same contract; pin inequality alone never proves a body change, so reconcile the bodies and proof before any repin (ADR-0038)",
  };
}

/**
 * Repair revalidation gate for `/implement-this` (ADR-0038). Only a
 * legacy-contract mismatch with the full current scope resolved and real
 * proof revalidated may publish fresh evidence. A proven body change, an
 * unproven same-version revision mismatch, malformed provenance, or missing
 * proof stops.
 */
export interface RepairRevalidationFact {
  classification: PinnedRevisionClassification;
  /** The full current parent and ticket scope resolves. */
  currentScopeResolved: boolean;
  /** Real proof was revalidated against the current scope on the current head. */
  proofRevalidated: boolean;
}

export function decideRepairRevalidation(
  fact: RepairRevalidationFact,
): { proceed: boolean; reason: string } {
  if (fact.classification === "body-change") {
    return {
      proceed: false,
      reason: "the parent or ticket body changed under the same contract with proof; reconcile the changed requirements before any repin",
    };
  }
  if (fact.classification === "revision-mismatch") {
    return {
      proceed: false,
      reason: "revision mismatch with unproven cause under the same contract; only a proven legacy-contract mismatch may republish after full revalidation, so stop with needs-info",
    };
  }
  if (fact.classification === "missing-or-malformed") {
    return {
      proceed: false,
      reason: "the pinned evidence is missing or malformed; it is never provenance and never proof of historical equivalence",
    };
  }
  if (!fact.currentScopeResolved) {
    return { proceed: false, reason: "the current parent and ticket scope does not resolve; stop with needs-info" };
  }
  if (!fact.proofRevalidated) {
    return { proceed: false, reason: "real proof was not revalidated against the current scope; never republish evidence on unproven work" };
  }
  if (fact.classification === "equal") {
    return { proceed: true, reason: "the pinned revision still matches; no repin is needed" };
  }
  return {
    proceed: true,
    reason: "legacy-contract mismatch with revalidated current scope and proof; fresh evidence may publish with the old pin and repair reason retained as provenance",
  };
}

// --- Review-specific evidence recovery (review-this preparation) -------------
//
// `decideRepairRevalidation` stays narrow for implementation/finalization:
// a same-version `revision-mismatch` never repins there. Review preparation
// may recover supported legacy and same-version stale pins, or a missing pin
// in an otherwise unambiguous supported block, only after current
// requirements resolve and full current-scope proof is revalidated on the
// selected head. `classifyRequirementsPin` stays honest about unknown
// historical causes; recovery never describes fresh verification as proof
// that historical requirements were identical and never reconstructs lost
// history.

export interface ReviewEvidenceRecoveryFact {
  classification: PinnedRevisionClassification;
  /** Full current parent/ticket scope resolves. */
  currentScopeResolved: boolean;
  /** Real proof revalidated against the current scope on the current head. */
  proofRevalidated: boolean;
  /**
   * Exactly one validated evidence region with a known envelope version,
   * no duplicate/unbalanced markers, and no conflicting associations.
   * False for ambiguous, duplicated, or unknown-version blocks.
   */
  unambiguousBlock: boolean;
  /**
   * Genuine historical bug RED evidence preserved (or not a bug-fix).
   * Fresh verification never replaces lost RED history.
   */
  historicalBugRedPreserved: boolean;
}

export function decideReviewEvidenceRecovery(
  fact: ReviewEvidenceRecoveryFact,
): { proceed: boolean; reason: string } {
  if (fact.classification === "body-change") {
    return {
      proceed: false,
      reason: "the parent or ticket body changed with proof; reconcile the changed requirements before any repin",
    };
  }
  if (!fact.currentScopeResolved) {
    return { proceed: false, reason: "the current parent and ticket scope does not resolve; stop with needs-info" };
  }
  if (!fact.proofRevalidated) {
    return { proceed: false, reason: "real proof was not revalidated against the current scope on the current head; never republish evidence on unproven work" };
  }
  if (!fact.historicalBugRedPreserved) {
    return { proceed: false, reason: "genuine historical bug RED evidence is missing; never reconstruct lost history" };
  }
  if (!fact.unambiguousBlock) {
    return { proceed: false, reason: "the evidence block is ambiguous, duplicated, or carries an unknown envelope version; reconcile it outside review" };
  }
  if (fact.classification === "equal") {
    return { proceed: true, reason: "the pinned revision still matches; no repin is needed" };
  }
  if (fact.classification === "legacy-contract") {
    return {
      proceed: true,
      reason: "supported legacy pin with revalidated current scope and proof; fresh evidence may publish with the old pin and repair reason retained as provenance",
    };
  }
  if (fact.classification === "revision-mismatch") {
    return {
      proceed: true,
      reason: "same-version stale pin with revalidated current scope and proof; fresh evidence may publish with the old pin and repair reason retained as provenance (review preparation only)",
    };
  }
  // missing-or-malformed: only a missing pin in an otherwise unambiguous
  // supported block may recover; malformed carriers never become provenance.
  return {
    proceed: true,
    reason: "missing pin in an otherwise unambiguous supported evidence block with revalidated current scope and proof; fresh evidence may publish with repair provenance",
  };
}

// --- Evidence repair body helpers (review preparation) -----------------------
//
// GitHub's PR-body PATCH has no expected-body-version parameter; there is no
// atomic compare-and-swap. Callers must re-read the full PR body and all
// pinned inputs immediately before writing, replace exactly one validated
// evidence region preserving everything outside it byte-for-byte, then read
// back and revalidate. A concurrent human edit in the remaining network
// window is a documented risk; report any observed race.

/**
 * Replace exactly one compact evidence block, preserving surrounding bytes.
 * Rejects duplicate/unbalanced markers, unknown envelope versions, and
 * conflicting closing associations instead of guessing.
 */
export function replaceSingleEvidenceBlock(
  existingBody: string,
  newBlock: string,
): { ok: true; body: string } | { ok: false; reason: string } {
  if (hasStrayEvidenceMarkers(existingBody)) {
    return { ok: false, reason: "stray or unbalanced compact evidence markers in the pull-request body" };
  }
  const blocks = countEvidenceBlocks(existingBody);
  if (blocks !== 1) {
    return {
      ok: false,
      reason: blocks === 0
        ? "no compact evidence block to replace; use compose for a missing block"
        : "multiple compact evidence blocks in the pull-request body",
    };
  }
  const parsed = parseEvidenceHandoff(existingBody);
  if (
    parsed.envelopeVersion !== EVIDENCE_ENVELOPE_VERSION &&
    parsed.envelopeVersion !== EVIDENCE_ENVELOPE_V1
  ) {
    return {
      ok: false,
      reason: `unsupported evidence envelope ${parsed.envelopeVersion ?? "unknown"}; upgrade the producing skill before review`,
    };
  }
  // Conflicting associations: more than one distinct closing target outside
  // fences, across close/fix/resolve forms and `#N`/URL references.
  const proseOutsideFences = evidenceFenceSegments(existingBody)
    .filter((s) => !s.fenced)
    .map((s) => s.text)
    .join("");
  const closingTargets = [
    ...normalizeNewlines(proseOutsideFences).matchAll(
      /(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)[ \t]+(?:https?:\/\/[^\s]+\/issues\/(\d+)|#(\d+))/gi,
    ),
  ].map((m) => m[1] ?? m[2]);
  const distinct = [...new Set(closingTargets.filter(Boolean))];
  if (distinct.length > 1) {
    return { ok: false, reason: "conflicting closing associations in the pull-request body; reconcile them outside review" };
  }
  // Splice the original string ranges without normalizing the whole body.
  // Everything outside the one validated region stays byte-for-byte identical,
  // including mixed LF/CRLF, whitespace, Unicode, and the final-newline state.
  const trimmedBlock = newBlock.trim();
  if (!trimmedBlock.startsWith(COMPACT_START) || !trimmedBlock.endsWith(COMPACT_END)) {
    return { ok: false, reason: "replacement block must be exactly one rendered compact evidence block" };
  }
  const start = existingBody.indexOf(COMPACT_START);
  const endMarker = existingBody.indexOf(COMPACT_END, start + COMPACT_START.length);
  if (start < 0 || endMarker < 0) {
    return { ok: false, reason: "evidence block is unreadable; reconcile it outside review" };
  }
  const end = endMarker + COMPACT_END.length;
  // Match the replaced region's own line ending so a CRLF region stays CRLF
  // without rewriting a single byte outside it.
  const region = existingBody.slice(start, end);
  const replacement = region.includes("\r\n") ? trimmedBlock.replace(/\n/g, "\r\n") : trimmedBlock;
  return { ok: true, body: `${existingBody.slice(0, start)}${replacement}${existingBody.slice(end)}` };
}

// --- Workflow-owned evidence repair record -----------------------------------

export const EVIDENCE_REPAIR_VERSION = "evidence-repair-v1";
const EVIDENCE_REPAIR_START = "<!-- ruralnative:evidence-repair:start -->";
const EVIDENCE_REPAIR_END = "<!-- ruralnative:evidence-repair:end -->";

export interface EvidenceRepairRecord {
  repository: string;
  prNumber: number;
  oldRequirementsRevision: string;
  newRequirementsRevision: string;
  oldHeadSha: string;
  newHeadSha: string;
  baseSha: string;
  reason: string;
  verificationProvenance: string;
}

function evidenceRepairField(inner: string, label: string): string | null {
  const pattern = new RegExp(`^[ \\t]*-[ \\t]*${escapeHandoffRegExp(label)}[ \\t]*:(.*)$`, "gm");
  const values: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(inner)) !== null) values.push((m[1] ?? "").trim());
  if (values.length !== 1 || values[0] === "") return null;
  return values[0];
}

function encodeRepairField(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n?/g, "\n")
    .replace(/-->/g, "--\\u003E")
    .replace(/\n/g, "\\n");
}

function decodeRepairField(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; ) {
    if (value.startsWith("--\\u003E", i)) {
      out += "-->";
      i += 8;
      continue;
    }
    if (value[i] === "\\" && i + 1 < value.length) {
      const nxt = value[i + 1];
      if (nxt === "n") {
        out += "\n";
        i += 2;
        continue;
      }
      if (nxt === "\\") {
        out += "\\";
        i += 2;
        continue;
      }
    }
    out += value[i];
    i += 1;
  }
  return out;
}

export function renderEvidenceRepairRecord(input: EvidenceRepairRecord): string {
  if (!/^[A-Za-z0-9-_.]+\/[A-Za-z0-9-_.]+$/.test(input.repository)) throw new Error("invalid evidence repair repository");
  if (!Number.isInteger(input.prNumber) || input.prNumber < 1) throw new Error("invalid evidence repair PR number");
  if (!requirementsPinWellFormed(input.newRequirementsRevision)) throw new Error("invalid evidence repair new pin");
  if (input.oldRequirementsRevision.trim() !== "" && !requirementsPinWellFormed(input.oldRequirementsRevision) && input.oldRequirementsRevision !== "missing") {
    throw new Error("invalid evidence repair old pin");
  }
  if (input.newHeadSha.trim() === "" || input.baseSha.trim() === "") throw new Error("evidence repair needs trustworthy revisions");
  if (input.reason.trim() === "" || input.verificationProvenance.trim() === "") throw new Error("evidence repair needs a reason and verification provenance");
  const lines = [
    EVIDENCE_REPAIR_START,
    "## Evidence repair",
    "",
    `- Repair version: ${EVIDENCE_REPAIR_VERSION}`,
    `- Repository: ${input.repository}`,
    `- PR: ${input.prNumber}`,
    `- Old requirements revision: ${input.oldRequirementsRevision === "" ? "missing" : input.oldRequirementsRevision}`,
    `- New requirements revision: ${input.newRequirementsRevision}`,
    `- Old head: ${input.oldHeadSha === "" ? "missing" : input.oldHeadSha}`,
    `- New head: ${input.newHeadSha}`,
    `- Base: ${input.baseSha}`,
    `- Reason: ${encodeRepairField(input.reason)}`,
    `- Verification: ${encodeRepairField(input.verificationProvenance)}`,
    EVIDENCE_REPAIR_END,
  ];
  return lines.join("\n");
}

export function parseEvidenceRepairRecord(body: string): { found: boolean; record?: EvidenceRepairRecord; reason: string } {
  const normalized = normalizeNewlines(body);
  const starts = normalized.split(EVIDENCE_REPAIR_START).length - 1;
  const ends = normalized.split(EVIDENCE_REPAIR_END).length - 1;
  if (starts === 0 && ends === 0) return { found: false, reason: "no evidence repair record" };
  if (starts !== ends || starts !== 1) return { found: false, reason: "stray, unbalanced, or duplicate evidence repair markers" };
  const inner = normalized.match(
    new RegExp(`${escapeHandoffRegExp(EVIDENCE_REPAIR_START)}[ \\t]*\\n([\\u0000-\\uFFFF]*?)\\n[ \\t]*${escapeHandoffRegExp(EVIDENCE_REPAIR_END)}`),
  )?.[1] ?? null;
  if (inner === null) return { found: false, reason: "evidence repair record is unreadable" };
  const version = evidenceRepairField(inner, "Repair version");
  if (version !== EVIDENCE_REPAIR_VERSION) return { found: false, reason: `unsupported evidence repair ${version ?? "unknown"}` };
  const repository = evidenceRepairField(inner, "Repository");
  const prRaw = evidenceRepairField(inner, "PR");
  const oldPin = evidenceRepairField(inner, "Old requirements revision");
  const newPin = evidenceRepairField(inner, "New requirements revision");
  const oldHead = evidenceRepairField(inner, "Old head");
  const newHead = evidenceRepairField(inner, "New head");
  const base = evidenceRepairField(inner, "Base");
  const reason = evidenceRepairField(inner, "Reason");
  const verification = evidenceRepairField(inner, "Verification");
  if (!repository || !prRaw || !oldPin || !newPin || !oldHead || !newHead || !base || !reason || !verification) {
    return { found: false, reason: "evidence repair record is incomplete" };
  }
  const prNumber = Number(prRaw);
  if (!Number.isInteger(prNumber) || prNumber < 1) return { found: false, reason: "evidence repair PR number is invalid" };
  return {
    found: true,
    reason: "evidence repair record parsed",
    record: {
      repository,
      prNumber,
      oldRequirementsRevision: oldPin === "missing" ? "" : oldPin,
      newRequirementsRevision: newPin,
      oldHeadSha: oldHead === "missing" ? "" : oldHead,
      newHeadSha: newHead,
      baseSha: base,
      reason: decodeRepairField(reason),
      verificationProvenance: decodeRepairField(verification),
    },
  };
}

/** Reuse an identical repair record after interruption; any difference stops. */
export function evidenceRepairReusable(
  pinned: EvidenceRepairRecord,
  current: EvidenceRepairRecord,
): boolean {
  return (
    pinned.repository.toLowerCase() === current.repository.toLowerCase() &&
    pinned.prNumber === current.prNumber &&
    pinned.oldRequirementsRevision === current.oldRequirementsRevision &&
    pinned.newRequirementsRevision === current.newRequirementsRevision &&
    pinned.oldHeadSha === current.oldHeadSha &&
    pinned.newHeadSha === current.newHeadSha &&
    pinned.baseSha === current.baseSha &&
    pinned.reason === current.reason &&
    pinned.verificationProvenance === current.verificationProvenance
  );
}

// --- Review-preparation repair composition (ADR-0039) ------------------------
//
// `classifyRequirementsPin` collapses a genuinely absent pin and a malformed
// carrier into `missing-or-malformed`. Review preparation needs the
// difference: only an absent pin in an otherwise valid supported block may
// recover. These helpers also keep the repair record inside the single
// permitted evidence region and preserve genuine historical RED history.

export type EvidencePinPresence =
  | { kind: "present"; value: string }
  | { kind: "absent"; reason: string }
  | { kind: "malformed"; reason: string }
  | { kind: "duplicate"; reason: string }
  | { kind: "no-block"; reason: string };

/**
 * Distinguish a genuinely absent requirements pin from an empty, malformed, or
 * duplicated carrier inside exactly one compact block.
 */
export function evidencePinPresence(body: string): EvidencePinPresence {
  if (hasStrayEvidenceMarkers(body) || countEvidenceBlocks(body) !== 1) {
    return { kind: "no-block", reason: "expected exactly one compact evidence block" };
  }
  const normalized = normalizeNewlines(body);
  const inner = normalized.match(evidenceBodyPattern())?.[1] ?? "";
  const values = metadataValues(inner, "Requirements revision");
  if (values.length === 0) return { kind: "absent", reason: "the evidence block carries no requirements revision" };
  if (values.length > 1) return { kind: "duplicate", reason: "duplicate requirements revision lines in the evidence block" };
  if (values[0] === "") return { kind: "malformed", reason: "evidence requirements revision is empty" };
  if (!requirementsPinWellFormed(values[0])) return { kind: "malformed", reason: "evidence requirements revision is malformed" };
  return { kind: "present", value: values[0] };
}

export type EvidenceRedRead =
  | { kind: "none" }
  | { kind: "present"; redCommand: string; redOutput: string }
  | { kind: "malformed"; reason: string };

/**
 * Read the genuine historical bug RED record from one compact block. A
 * partial record is malformed, never reconstructed; an absent record is
 * distinct from a broken one.
 *
 * RED output is free text and may span multiple lines: the renderer only
 * escapes `-->`, so a multi-line failing log is a legal record. Capture the
 * full span after `RED output:` up to the next metadata line (or block end)
 * so a repair round-trip never truncates recorded history.
 */
export function readEvidenceRed(body: string): EvidenceRedRead {
  if (hasStrayEvidenceMarkers(body) || countEvidenceBlocks(body) !== 1) {
    return { kind: "malformed", reason: "expected exactly one compact evidence block" };
  }
  const normalized = normalizeNewlines(body);
  const inner = normalized.match(evidenceBodyPattern())?.[1] ?? "";
  const lines = inner.split("\n");
  const headingIndex = lines.findIndex((line) => /^### Bug reproduction[ \t]*$/.test(line));
  const commandIndex = lines.findIndex((line) => /^[ \t]*-[ \t]*RED command:[ \t]*`([^`]*)`[ \t]*$/.test(line));
  const outputIndex = lines.findIndex((line) => /^[ \t]*-[ \t]*RED output:[ \t]?/.test(line));
  if (headingIndex < 0 && commandIndex < 0 && outputIndex < 0) return { kind: "none" };
  if (headingIndex < 0 || commandIndex < 0 || outputIndex < 0) {
    return { kind: "malformed", reason: "bug reproduction RED record is incomplete; never reconstruct lost history" };
  }
  const commandMatch = lines[commandIndex].match(/^[ \t]*-[ \t]*RED command:[ \t]*`([^`]*)`[ \t]*$/);
  if (!commandMatch || commandMatch[1].trim() === "") {
    return { kind: "malformed", reason: "bug reproduction RED record is incomplete; never reconstruct lost history" };
  }
  let end = lines.length;
  for (let i = outputIndex + 1; i < lines.length; i++) {
    if (/^[ \t]*-[ \t]*(Criteria revision|Requirements revision|Envelope version|Head SHA)[ \t]*:/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const firstOutput = lines[outputIndex].replace(/^[ \t]*-[ \t]*RED output:[ \t]?/, "");
  const outputLines = [firstOutput, ...lines.slice(outputIndex + 1, end)];
  while (outputLines.length > 0 && outputLines[outputLines.length - 1].trim() === "") outputLines.pop();
  const redOutput = outputLines.join("\n").trim();
  if (redOutput === "") {
    return { kind: "malformed", reason: "bug reproduction RED record is incomplete; never reconstruct lost history" };
  }
  return { kind: "present", redCommand: commandMatch[1], redOutput };
}

/**
 * Extract every criterion id whose segment *declares* behavior proof
 * (`Focused command:`), regardless of pass state. `extractEvidenceBehaviorClaims`
 * returns only passing claims; recovery uses this wider set to reject a
 * downgrade that would erase a failed or torn behavior record.
 */
export function extractDeclaredBehaviorCriteria(body: string): string[] {
  const normalized = normalizeNewlines(body);
  const pattern = new RegExp(
    `${escapeHandoffRegExp(COMPACT_START)}[ \t]*\n([\u0000-\uFFFF]*?)\n[ \t]*${escapeHandoffRegExp(COMPACT_END)}`,
  );
  const match = normalized.match(pattern);
  if (!match) return [];
  const inner = match[1];
  const lines = inner.split("\n");
  const headerIndexes: number[] = [];
  lines.forEach((line, i) => {
    if (/\*\*Criterion:\*\*/.test(line)) headerIndexes.push(i);
  });
  const criteriaEnd = lines.findIndex((line) => /^[ \t]*-[ \t]*Criteria revision:/.test(line));
  const end = criteriaEnd >= 0 ? criteriaEnd : lines.length;
  const ids: string[] = [];
  for (let h = 0; h < headerIndexes.length; h++) {
    const segment = lines.slice(headerIndexes[h], h + 1 < headerIndexes.length ? headerIndexes[h + 1] : end).join("\n");
    if (!/Focused command:[ \t]*\S/.test(segment)) continue;
    const idMatch = segment.match(/`?([A-Za-z]{2,3}-\d+)`?/);
    if (idMatch) ids.push(idMatch[1]);
  }
  return ids;
}

/**
 * Insert one evidence-repair record inside the compact block after its
 * metadata and before the closing marker, so evidence and provenance share one
 * permitted region and one native write.
 */
export function insertEvidenceRepairRecord(block: string, record: EvidenceRepairRecord): string {
  const trimmed = block.trim();
  if (!trimmed.startsWith(COMPACT_START) || !trimmed.endsWith(COMPACT_END)) {
    throw new Error("evidence repair composition requires exactly one rendered compact evidence block");
  }
  const body = trimmed.slice(0, trimmed.length - COMPACT_END.length).trimEnd();
  return `${body}\n\n${renderEvidenceRepairRecord(record)}\n${COMPACT_END}`;
}

export type EvidenceRepairLocation = "absent" | "inside" | "outside" | "ambiguous" | "malformed";

/**
 * Locate an existing evidence-repair record relative to the single compact
 * block. A record outside the block, duplicate, or malformed record stops
 * reconciliation instead of being moved or overwritten.
 */
export function locateEvidenceRepairRecord(
  body: string,
): { location: EvidenceRepairLocation; record?: EvidenceRepairRecord; reason: string } {
  const normalized = normalizeNewlines(body);
  const starts = normalized.split(EVIDENCE_REPAIR_START).length - 1;
  const ends = normalized.split(EVIDENCE_REPAIR_END).length - 1;
  if (starts === 0 && ends === 0) return { location: "absent", reason: "no evidence repair record" };
  if (starts !== 1 || ends !== 1) {
    return { location: "ambiguous", reason: "stray, unbalanced, or duplicate evidence repair markers" };
  }
  if (hasStrayEvidenceMarkers(body) || countEvidenceBlocks(body) !== 1) {
    return { location: "ambiguous", reason: "repair record requires exactly one compact evidence block" };
  }
  const recordStart = normalized.indexOf(EVIDENCE_REPAIR_START);
  const recordEnd = normalized.indexOf(EVIDENCE_REPAIR_END) + EVIDENCE_REPAIR_END.length;
  const blockStart = normalized.indexOf(COMPACT_START);
  const blockEnd = normalized.indexOf(COMPACT_END) + COMPACT_END.length;
  if (recordStart < blockStart || recordEnd > blockEnd) {
    return { location: "outside", reason: "evidence repair record is outside the compact evidence block" };
  }
  const parsed = parseEvidenceRepairRecord(body);
  if (!parsed.found || !parsed.record) return { location: "malformed", reason: parsed.reason };
  return { location: "inside", record: parsed.record, reason: parsed.reason };
}

// --- Shared owner-decision and policy-change facts (review + fix) ------------
//
// A head-only policy change never authorizes itself. Owner decisions are
// discovered automatically and verified against native repository/PR
// identity, author identity (owner/admin or delegation established by
// pinned-base policy; ordinary write permission is insufficient),
// body/hash, referenced revisions/requirements, and exact exception scope.
// Comment claims of OWNER/admin status, ADR assertions, or arbitrary PR
// instructions are never trusted, and there is no general `approved: true`
// escape hatch. A matching decision supplies only its named repository-local
// exceptions; everything else becomes validated blocking findings.

export interface OwnerDecisionFact {
  repository: string;
  prNumber: number;
  commentId: string;
  authorLogin: string;
  /** Observed via the native permission API, never a comment claim. */
  authorIsOwnerOrAdmin: boolean;
  /** Delegation established by pinned-base policy. */
  authorDelegatedByBasePolicy: boolean;
  decisionBody: string;
  decisionBodyHash: string;
  referencedHeadSha: string;
  referencedBaseSha: string;
  referencedRequirementsRevision: string;
  /** Named repository-local exception scope, e.g. `REVIEW.md:rule-3`. */
  exceptionScope: readonly string[];
  revoked: boolean;
  superseded: boolean;
  unrelated: boolean;
}

export interface OwnerDecisionExpectation {
  repository: string;
  prNumber: number;
  headSha: string;
  baseSha: string;
  requirementsRevision: string;
}

function isRepoLocalExceptionScope(value: string): boolean {
  if (value.trim() === "" || value.includes("..") || value.startsWith("/") || value.includes("\\")) return false;
  return /^[A-Za-z0-9._/-]+(?::[A-Za-z0-9._/ -]+)?$/.test(value);
}

export function verifyOwnerDecision(
  decision: OwnerDecisionFact,
  expected: OwnerDecisionExpectation,
  hash: RevisionHasher,
): { valid: boolean; reason: string } {
  if (decision.repository.toLowerCase() !== expected.repository.toLowerCase() || decision.prNumber !== expected.prNumber) {
    return { valid: false, reason: "owner decision names another repository or pull request" };
  }
  if (decision.commentId.trim() === "" || decision.authorLogin.trim() === "") {
    return { valid: false, reason: "owner decision needs a native comment identity and author" };
  }
  if (!decision.authorIsOwnerOrAdmin && !decision.authorDelegatedByBasePolicy) {
    return { valid: false, reason: "owner decision requires repository owner/admin authority or delegation established by pinned-base policy; ordinary write permission is insufficient" };
  }
  if (decision.revoked) return { valid: false, reason: "owner decision was revoked" };
  if (decision.superseded) return { valid: false, reason: "owner decision was superseded by a later decision" };
  if (decision.unrelated) return { valid: false, reason: "owner decision references unrelated work" };
  if (decision.decisionBody.trim() === "") return { valid: false, reason: "owner decision body is missing" };
  if (decision.decisionBodyHash !== hash(decision.decisionBody)) {
    return { valid: false, reason: "owner decision body hash does not match the observed body; re-fetch before publication" };
  }
  if (decision.referencedHeadSha !== expected.headSha || decision.referencedBaseSha !== expected.baseSha) {
    return { valid: false, reason: "owner decision references stale revisions; re-fetch it before publication" };
  }
  if (decision.referencedRequirementsRevision !== expected.requirementsRevision) {
    return { valid: false, reason: "owner decision references stale requirements; re-fetch it before publication" };
  }
  if (decision.exceptionScope.length === 0) {
    return { valid: false, reason: "owner decision names no repository-local exceptions" };
  }
  for (const scope of decision.exceptionScope) {
    if (!isRepoLocalExceptionScope(scope)) {
      return { valid: false, reason: `owner decision scope is not repository-local: ${scope}` };
    }
  }
  return { valid: true, reason: "owner decision verified against native identity, authority, revisions, and exact exception scope" };
}

export type PolicyChangeKind =
  | "unchanged"
  | "proposed-violation-reviewable"
  | "inaccessible"
  | "ambiguous"
  | "contradictory";

export interface PolicyChangeFact {
  baseSources: readonly PolicySource[];
  headSources: readonly PolicySource[];
  baseReadable: boolean;
  headReadable: boolean;
  baseIsSymlink: boolean;
  headIsSymlink: boolean;
  /** Safe git-object read succeeded when the working-tree read failed. */
  gitObjectFallbackReadable: boolean;
  /** Content inspection found genuinely contradictory governing authority. */
  baseContradictory: boolean;
  /** Content inspection found ambiguous governing authority. */
  baseAmbiguous: boolean;
}

function policySourceKey(s: PolicySource): string {
  return `${s.path}\t${s.hash}`;
}

export function classifyPolicyChange(fact: PolicyChangeFact): { kind: PolicyChangeKind; reason: string } {
  if (fact.baseIsSymlink || fact.headIsSymlink) {
    return { kind: "ambiguous", reason: "a policy path is a symlink; resolve it outside this command and never follow an untrusted link" };
  }
  if (!fact.baseReadable || !fact.headReadable) {
    if (!fact.gitObjectFallbackReadable) {
      return { kind: "inaccessible", reason: "governing policy is unreadable and no safe git-object read succeeded; never substitute defaults for unreadable policy" };
    }
  }
  if (fact.baseContradictory) {
    return { kind: "contradictory", reason: "governing authority is genuinely contradictory; reconcile it outside this command" };
  }
  if (fact.baseAmbiguous) {
    return { kind: "ambiguous", reason: "governing authority is ambiguous; reconcile it outside this command" };
  }
  const base = new Set(fact.baseSources.map(policySourceKey));
  const head = new Set(fact.headSources.map(policySourceKey));
  const same = base.size === head.size && [...base].every((k) => head.has(k));
  if (same) return { kind: "unchanged", reason: "governing sources are unchanged between base and head" };
  // Any head-only addition, removal, or relaxation never authorizes itself.
  // The established base rule stays in force; the proposed change is a
  // reviewable violation that becomes blocking findings when unapproved.
  return {
    kind: "proposed-violation-reviewable",
    reason: "the pull request adds, removes, or relaxes a governing source; the established base rule stays in force and a head-only relaxation never authorizes itself",
  };
}

export interface PolicyBlockingFindingDraft {
  /** Governing base rule, e.g. `REVIEW.md: Verification expectations`. */
  governingRule: string;
  /** Actual changed source path, e.g. `REVIEW.md`. */
  sourcePath: string;
  message: string;
}

/**
 * Build validated blocking findings for unapproved proposed policy changes.
 * Each finding is tied to the actual changed source and its governing base
 * rule. Callers must supply a `fileInDiff` check: a finding whose file is
 * not in the reviewed diff is not invented here — the caller returns a
 * restriction instead. Never invent a file/line for a non-diff diagnostic.
 */
export function buildPolicyBlockingFindings(
  drafts: readonly PolicyBlockingFindingDraft[],
  fileInDiff: (file: string) => boolean,
): { findings: readonly PolicyBlockingFindingDraft[]; restricted: readonly PolicyBlockingFindingDraft[] } {
  const findings: PolicyBlockingFindingDraft[] = [];
  const restricted: PolicyBlockingFindingDraft[] = [];
  for (const draft of drafts) {
    if (draft.governingRule.trim() === "" || draft.sourcePath.trim() === "" || draft.message.trim() === "") {
      restricted.push(draft);
      continue;
    }
    if (!fileInDiff(draft.sourcePath)) {
      restricted.push(draft);
      continue;
    }
    findings.push(draft);
  }
  return { findings, restricted };
}

export const FIX_PROGRESS_LEGACY_VERSION = "fix-progress-v1";
export const FIX_PROGRESS_VERSION = "fix-progress-v2";
const FIX_PROGRESS_START = "<!-- ruralnative:fix-progress:start -->";
const FIX_PROGRESS_END = "<!-- ruralnative:fix-progress:end -->";

export interface FixVerificationReceipt {
  /** Command whose recorded output and exit status carry the claim. */
  command: string;
  /** Observed result output. */
  result: string;
  /** Explicit passing result; a skipped or failed check never passes. */
  passed: boolean;
}

export type FixIntendedRemoteOperation = "none" | "push" | "merge";

export interface FixProgressInput {
  repository: string;
  prNumber: number;
  sourceReviewId: string;
  /** Digest over the deterministic rendering of the validated source handoff. */
  sourceHandoffDigest: string;
  ticket: number | null;
  parent: number | null;
  startedHeadSha: string;
  startedBaseSha: string;
  resultingHeadSha: string;
  resultingBaseSha: string;
  dispositions: readonly FixFindingDisposition[];
  /** Complete verification receipts for the resulting head. */
  verificationReceipts: readonly FixVerificationReceipt[];
  /** The intended remote operation recorded before it runs. */
  intendedRemoteOperation: FixIntendedRemoteOperation;
  completedSteps: readonly FixProgressStep[];
  /** Confirmed merge commit SHA once the host reports the merge. */
  mergeReceipt: string | null;
}

export interface FixProgressCheck {
  body: string;
  repository: string;
  prNumber: number;
}

export interface ParsedFixProgress {
  found: boolean;
  malformed: boolean;
  reason: string;
  version?: string;
  /** True for legacy fix-progress-v1 receipts: diagnostic only. */
  legacy?: boolean;
  repository?: string;
  prNumber?: number;
  sourceReviewId?: string;
  sourceHandoffDigest?: string;
  ticket?: number | null;
  parent?: number | null;
  startedHeadSha?: string;
  startedBaseSha?: string;
  resultingHeadSha?: string;
  resultingBaseSha?: string;
  dispositions?: readonly FixFindingDisposition[];
  verificationReceipts?: readonly FixVerificationReceipt[];
  intendedRemoteOperation?: FixIntendedRemoteOperation;
  completedSteps?: readonly FixProgressStep[];
  mergeReceipt?: string | null;
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

const FIX_PROGRESS_STEPS: readonly FixProgressStep[] = [
  "fixes",
  "evidence",
  "push",
  "merge",
  "bookkeeping",
];

function validateFixProgressInput(input: FixProgressInput): string | null {
  if (!/^[A-Za-z0-9-_.]+\/[A-Za-z0-9-_.]+$/.test(input.repository)) {
    return "fix progress repository must be owner/name";
  }
  if (!Number.isInteger(input.prNumber) || input.prNumber < 1) {
    return "fix progress PR number is invalid";
  }
  if (input.sourceReviewId.trim() === "") return "fix progress needs the source review ID";
  if (!/^[a-f0-9]{64}$/.test(input.sourceHandoffDigest)) {
    return "fix progress handoff digest must be a sha256 hex value";
  }
  if (input.ticket !== null && (!Number.isInteger(input.ticket) || input.ticket < 1)) {
    return "fix progress ticket is invalid";
  }
  if (input.parent !== null && (!Number.isInteger(input.parent) || input.parent < 1)) {
    return "fix progress parent is invalid";
  }
  if (input.startedHeadSha.trim() === "" || input.startedBaseSha.trim() === "") {
    return "fix progress needs a trustworthy started revision pair";
  }
  if (input.resultingHeadSha.trim() === "" || input.resultingBaseSha.trim() === "") {
    return "fix progress needs a trustworthy resulting revision pair";
  }
  if (input.intendedRemoteOperation !== "none" && input.intendedRemoteOperation !== "push" && input.intendedRemoteOperation !== "merge") {
    return "fix progress intended remote operation is invalid";
  }
  const ids = new Set<string>();
  for (const disposition of input.dispositions) {
    if (ids.has(disposition.findingId)) {
      return `fix progress carries a duplicate disposition: ${disposition.findingId}`;
    }
    ids.add(disposition.findingId);
    if (
      disposition.disposition !== "fixed" &&
      disposition.disposition !== "already-resolved" &&
      disposition.disposition !== "unresolvable"
    ) {
      return `fix progress disposition ${disposition.findingId} is invalid`;
    }
    if (disposition.disposition === "unresolvable" && disposition.commitSha.trim() !== "") {
      return `fix progress disposition ${disposition.findingId} cannot carry a fix commit`;
    }
  }
  const steps = new Set<string>();
  for (const step of input.completedSteps) {
    if (!FIX_PROGRESS_STEPS.includes(step)) {
      return `fix progress completed step is invalid: ${step}`;
    }
    if (steps.has(step)) return `fix progress completed step repeats: ${step}`;
    steps.add(step);
  }
  if (input.mergeReceipt !== null && !/^[a-f0-9]{40,64}$/.test(input.mergeReceipt)) {
    return "fix progress merge receipt is invalid";
  }
  if (input.mergeReceipt !== null && !steps.has("merge")) {
    return "fix progress merge receipt requires a completed merge step";
  }
  if (input.mergeReceipt === null && steps.has("merge")) {
    return "fix progress completed merge step requires a confirmed merge receipt";
  }
  return null;
}

/** Render the fix-progress-v2 checkpoint consumed only by reruns. Throws on invalid input. */
export function renderFixProgress(input: FixProgressInput): string {
  const error = validateFixProgressInput(input);
  if (error) throw new Error(`invalid fix progress: ${error}`);
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
  lines.push(`- Intended operation: ${input.intendedRemoteOperation}`);
  for (const disposition of input.dispositions) {
    lines.push(`- Finding: ${escapeHandoffText(disposition.findingId)}`);
    lines.push(`  - Disposition: ${disposition.disposition}`);
    lines.push(`  - Files: ${disposition.files.map((file) => escapeHandoffText(file)).join(", ")}`);
    lines.push(`  - Commit: ${escapeHandoffText(disposition.commitSha)}`);
    lines.push(`  - Verification command: \`${escapeHandoffText(disposition.verificationCommand)}\``);
    lines.push(`  - Verification result: ${escapeHandoffText(disposition.verificationResult)}`);
  }
  lines.push(`- Findings count: ${input.dispositions.length}`);
  for (const receipt of input.verificationReceipts) {
    lines.push(`- Verification receipt: \`${escapeHandoffText(receipt.command)}\``);
    lines.push(`  - Passed: ${receipt.passed ? "true" : "false"}`);
    lines.push(`  - Result: ${escapeHandoffText(receipt.result)}`);
  }
  lines.push(`- Merge receipt: ${input.mergeReceipt === null ? "none" : escapeHandoffText(input.mergeReceipt)}`);
  lines.push(`- Completed steps: ${input.completedSteps.join(", ")}`);
  lines.push(FIX_PROGRESS_END);
  return lines.join("\n");
}

function parseFixProgressDispositions(
  inner: string,
): { dispositions: FixFindingDisposition[]; error: string | null } {
  const lines = inner.split("\n");
  const starts: number[] = [];
  lines.forEach((line, i) => {
    if (/^[ \t]*-[ \t]*Finding:[ \t]*\S/.test(line)) starts.push(i);
  });
  const end = lines.findIndex((line) => /^[ \t]*-[ \t]*Findings count:/.test(line));
  const stop = end >= 0 ? end : lines.length;
  const relevant = starts.filter((i) => i < stop);
  const dispositions: FixFindingDisposition[] = [];
  const seen = new Set<string>();
  for (let h = 0; h < relevant.length; h++) {
    const segment = lines.slice(relevant[h], h + 1 < relevant.length ? relevant[h + 1] : stop).join("\n");
    const get = (label: string): string | null => reviewHandoffSubfield(segment, label);
    const findingId = get("Finding");
    const disposition = get("Disposition");
    const filesRaw = get("Files") ?? "";
    const commitSha = get("Commit") ?? "";
    const verificationCommand = get("Verification command");
    const verificationResult = get("Verification result");
    if (!findingId || !disposition || !verificationCommand || !verificationResult) {
      return { dispositions: [], error: "fix progress carries an incomplete finding disposition" };
    }
    if (seen.has(findingId)) {
      return { dispositions: [], error: `fix progress carries a duplicate disposition: ${findingId}` };
    }
    seen.add(findingId);
    if (disposition !== "fixed" && disposition !== "already-resolved" && disposition !== "unresolvable") {
      return { dispositions: [], error: `fix progress disposition ${findingId} is invalid` };
    }
    const files = filesRaw === "" ? [] : filesRaw.split(",").map((file) => file.trim()).filter((file) => file !== "");
    dispositions.push({
      findingId,
      disposition,
      files,
      commitSha,
      verificationCommand: verificationCommand.replace(/^`|`$/g, ""),
      verificationResult,
    });
  }
  return { dispositions, error: null };
}

function parseFixProgressReceipts(
  inner: string,
): { receipts: FixVerificationReceipt[]; error: string | null } {
  const lines = inner.split("\n");
  const starts: number[] = [];
  lines.forEach((line, i) => {
    if (/^[ \t]*-[ \t]*Verification receipt:[ \t]*\S/.test(line)) starts.push(i);
  });
  const stop = lines.findIndex((line) => /^[ \t]*-[ \t]*Merge receipt:/.test(line));
  const limit = stop >= 0 ? stop : lines.length;
  const relevant = starts.filter((i) => i < limit);
  const receipts: FixVerificationReceipt[] = [];
  for (let h = 0; h < relevant.length; h++) {
    const segment = lines.slice(relevant[h], h + 1 < relevant.length ? relevant[h + 1] : limit).join("\n");
    const get = (label: string): string | null => reviewHandoffSubfield(segment, label);
    const headerLine = segment.split("\n")[0];
    const headerMatch = headerLine.match(/^[ \t]*-[ \t]*Verification receipt:[ \t]*(.*)$/);
    const command = headerMatch ? headerMatch[1].trim() : get("Verification receipt");
    const passed = get("Passed");
    const result = get("Result");
    if (!command || (passed !== "true" && passed !== "false") || !result) {
      return { receipts: [], error: "fix progress carries an incomplete verification receipt" };
    }
    receipts.push({
      command: command.replace(/^`|`$/g, ""),
      passed: passed === "true",
      result,
    });
  }
  return { receipts, error: null };
}

function parseOneFixProgressField(inner: string, label: string): string | null {
  return oneReviewHandoffField(inner, label);
}

function parseFixProgressNumber(raw: string | null): number | null {
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

function parseFixProgressSteps(inner: string): { steps: FixProgressStep[]; error: string | null } {
  const raw = parseOneFixProgressField(inner, "Completed steps");
  if (raw === null || raw === "") return { steps: [], error: "fix progress completed steps are missing" };
  const steps: FixProgressStep[] = [];
  for (const step of raw.split(",").map((s) => s.trim()).filter((s) => s !== "")) {
    if (!FIX_PROGRESS_STEPS.includes(step as FixProgressStep)) {
      return { steps: [], error: `fix progress completed step is invalid: ${step}` };
    }
    if (steps.includes(step as FixProgressStep)) {
      return { steps: [], error: `fix progress completed step repeats: ${step}` };
    }
    steps.push(step as FixProgressStep);
  }
  return { steps, error: null };
}

/**
 * Parse the resumable progress checkpoint for a rerun without trusting it.
 * fix-progress-v2 receipts carry the full verified-recovery record; legacy
 * fix-progress-v1 checkpoints parse as diagnostic input only and never
 * authorize skipping work (ADR-0038). Unknown versions, duplicate or
 * unbalanced markers, and incomplete records are malformed.
 */
export function parseFixProgress(check: FixProgressCheck): ParsedFixProgress {
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
  const version = parseOneFixProgressField(inner, "Progress version");
  if (version === null) return { found: false, malformed: true, reason: "fix progress version is missing" };
  if (version !== FIX_PROGRESS_VERSION && version !== FIX_PROGRESS_LEGACY_VERSION) {
    return { found: false, malformed: true, reason: `unsupported fix progress version: ${version}` };
  }
  const repository = parseOneFixProgressField(inner, "Repository");
  const prRaw = parseOneFixProgressField(inner, "PR");
  const sourceReviewId = parseOneFixProgressField(inner, "Source review");
  const digest = parseOneFixProgressField(inner, "Handoff digest");
  const startedHeadSha = parseOneFixProgressField(inner, "Started head");
  const startedBaseSha = parseOneFixProgressField(inner, "Started base");
  const resultingHeadSha = parseOneFixProgressField(inner, "Resulting head");
  const resultingBaseSha = parseOneFixProgressField(inner, "Resulting base");
  if (
    !repository || !prRaw || !sourceReviewId || !digest || !startedHeadSha ||
    !startedBaseSha || !resultingHeadSha || !resultingBaseSha
  ) {
    return { found: false, malformed: true, reason: "fix progress checkpoint is incomplete" };
  }
  if (!/^[a-f0-9]{64}$/.test(digest)) {
    return { found: false, malformed: true, reason: "fix progress handoff digest is malformed" };
  }
  const prNumber = parseFixProgressNumber(prRaw);
  if (prNumber === null) {
    return { found: false, malformed: true, reason: "fix progress PR number is invalid" };
  }
  if (repository.toLowerCase() !== check.repository.toLowerCase() || prNumber !== check.prNumber) {
    return { found: false, malformed: true, reason: "fix progress checkpoint names another target" };
  }
  const ticketRaw = parseOneFixProgressField(inner, "Ticket");
  const parentRaw = parseOneFixProgressField(inner, "Parent");
  const ticket = ticketRaw === null || ticketRaw === "none" ? null : parseFixProgressNumber(ticketRaw.replace(/^#/, ""));
  const parent = parentRaw === null || parentRaw === "none" ? null : parseFixProgressNumber(parentRaw.replace(/^#/, ""));
  if ((ticketRaw !== null && ticketRaw !== "none" && ticket === null) || (parentRaw !== null && parentRaw !== "none" && parent === null)) {
    return { found: false, malformed: true, reason: "fix progress ticket or parent is invalid" };
  }
  if (version !== FIX_PROGRESS_LEGACY_VERSION && (ticketRaw === null || parentRaw === null)) {
    return { found: false, malformed: true, reason: "fix progress checkpoint is missing its ticket or parent" };
  }
  const parsedDispositions = parseFixProgressDispositions(inner);
  if (parsedDispositions.error) {
    return { found: false, malformed: true, reason: parsedDispositions.error };
  }
  const countRaw = parseOneFixProgressField(inner, "Findings count");
  const count = countRaw === null ? null : Number(countRaw);
  if (count === null || !Number.isInteger(count) || count < 0 || count !== parsedDispositions.dispositions.length) {
    return { found: false, malformed: true, reason: "fix progress findings count does not match its dispositions" };
  }
  const parsedSteps = parseFixProgressSteps(inner);
  if (parsedSteps.error) {
    return { found: false, malformed: true, reason: parsedSteps.error };
  }
  const legacy = version === FIX_PROGRESS_LEGACY_VERSION;
  const base: ParsedFixProgress = {
    found: true,
    malformed: false,
    reason: legacy
      ? "legacy fix-progress-v1 checkpoint parsed as diagnostic input; it never authorizes skipping work"
      : "fix progress checkpoint parsed; reconcile it against observed facts before resuming",
    version,
    legacy,
    repository,
    prNumber,
    sourceReviewId,
    sourceHandoffDigest: digest,
    ticket: ticketRaw === null ? null : ticket,
    parent: parentRaw === null ? null : parent,
    startedHeadSha,
    startedBaseSha,
    resultingHeadSha,
    resultingBaseSha,
    dispositions: parsedDispositions.dispositions,
    completedSteps: parsedSteps.steps,
  };
  if (legacy) return base;
  const operation = parseOneFixProgressField(inner, "Intended operation");
  if (
    operation === null ||
    (operation !== "none" && operation !== "push" && operation !== "merge")
  ) {
    return { found: false, malformed: true, reason: "fix progress intended operation is missing or invalid" };
  }
  const receipts = parseFixProgressReceipts(inner);
  if (receipts.error) {
    return { found: false, malformed: true, reason: receipts.error };
  }
  const mergeRaw = parseOneFixProgressField(inner, "Merge receipt");
  const mergeReceipt = mergeRaw === null || mergeRaw === "none" ? null : mergeRaw;
  if (mergeReceipt !== null && !/^[a-f0-9]{40,64}$/.test(mergeReceipt)) {
    return { found: false, malformed: true, reason: "fix progress merge receipt is invalid" };
  }
  if (mergeReceipt !== null && !parsedSteps.steps.includes("merge")) {
    return { found: false, malformed: true, reason: "fix progress merge receipt requires a completed merge step" };
  }
  if (mergeReceipt === null && parsedSteps.steps.includes("merge")) {
    return { found: false, malformed: true, reason: "fix progress completed merge step requires a confirmed merge receipt" };
  }
  return {
    ...base,
    verificationReceipts: receipts.receipts,
    intendedRemoteOperation: operation,
    mergeReceipt,
  };
}
