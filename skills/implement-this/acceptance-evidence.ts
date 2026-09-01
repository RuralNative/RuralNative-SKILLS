// Acceptance evidence for implement-this worker contract (#152; stable
// criterion identity #188).
//
// Pure: facts in, decisions out. No network, GitHub, filesystem-mutation,
// clocks, or Agent Manager calls. The worker supplies trigger facts from the
// current diff; this module validates criterion coverage by stable criterion
// ID (never by full sentence text) and renders a stable Markdown block.
// Caller-provided text is escaped consistently with timing.ts so "-->"
// cannot corrupt the trusted HTML-comment marker.

import type { AcceptanceCriterion } from "./workflow-state.ts";
import {
  REQUIREMENTS_REVISION_VERSION,
  activeCriteria,
  criteriaRevision,
} from "./workflow-state.ts";

export type ExemptionKind = "docs-only" | "static-content" | "rename-only" | "format-only";

export type CriterionEvidence =
  | {
      criterionId: string;
      kind: "behavior";
      focusedTests: readonly string[];
      redReason: string;
      greenPassed: true;
    }
  | {
      criterionId: string;
      kind: "non-behavior";
      exemption: ExemptionKind;
      reason: string;
    };

export interface ExternalSourceEvidence {
  dependency: string;
  version: string;
  url: string;
  supportedDecision: string;
}

export interface CompatibilityEvidence {
  interface: string;
  change: "additive" | "breaking" | "no-contract-change";
  consumerImpact: string;
  migration: string;
  boundaryTests: readonly string[];
}

export type BrowserEvidenceType =
  | "console"
  | "network"
  | "accessibility"
  | "trace"
  | "dom";

export interface BrowserEvidence {
  interaction: string;
  runtimeEvidence: string;
  evidenceType: BrowserEvidenceType;
  toolingOrigin: string;
}

export interface SecurityEvidence {
  assets: string;
  trustBoundaries: string;
  abuseCases: string;
  controlTests: readonly string[];
}

export interface OperabilityEvidence {
  onCallQuestions: string;
  metricLabels: readonly string[];
  telemetryExercised: boolean;
}

export interface MigrationEvidence {
  consumers: string;
  phases: readonly string[];
  cutover: string;
  rollback: string;
  boundaryVerification: readonly string[];
}

export interface MatchedMeasurement {
  conditions: string;
  measured: number;
}

export interface PerformanceEvidence {
  baseline: MatchedMeasurement;
  result: MatchedMeasurement;
  variance: string;
  attribution: string;
  keepOrRevert: "keep" | "revert";
}

export interface AcceptanceEvidenceInput {
  /** Criterion records carrying stable local IDs, text, and status. */
  criteria: readonly AcceptanceCriterion[];
  evidence: readonly CriterionEvidence[];
  triggers: {
    touchesVersionedExternalApi: boolean;
    touchesPublicInterface: boolean;
    /** Criterion IDs the diff touches as dependency/configuration change. */
    dependencyOrConfigCriteria: readonly string[];
    externalSourceResolved: boolean;
    externalDocumentationAuthoritative: boolean;
    isBugFix: boolean;
    bugFixRedConfirmed: boolean;
    touchesBrowserBehavior: boolean;
    touchesSecurityBoundary: boolean;
    touchesProductionOperability: boolean;
    touchesMigration: boolean;
    touchesExplicitPerformance: boolean;
  };
  externalSource?: ExternalSourceEvidence | null;
  compatibility?: CompatibilityEvidence | null;
  browserEvidence?: BrowserEvidence | null;
  securityEvidence?: SecurityEvidence | null;
  operabilityEvidence?: OperabilityEvidence | null;
  migrationEvidence?: MigrationEvidence | null;
  performanceEvidence?: PerformanceEvidence | null;
  /**
   * The versioned requirements revision value carried from the dispatch
   * packet (ticket #190). Review reads the same value from this evidence.
   */
  requirementsRevision?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: readonly string[];
}

const ALLOWED_EXEMPTIONS: readonly ExemptionKind[] = [
  "docs-only",
  "static-content",
  "rename-only",
  "format-only",
];

const ALLOWED_COMPAT_CHANGES: readonly string[] = [
  "additive",
  "breaking",
  "no-contract-change",
];

export const ACCEPTANCE_EVIDENCE_MARKER_START =
  "<!-- ruralnative:acceptance-evidence:start -->";
export const ACCEPTANCE_EVIDENCE_MARKER_END =
  "<!-- ruralnative:acceptance-evidence:end -->";

function isNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function escapeEvidenceText(value: string): string {
  return value.replace(/-->/g, "--\\u003E");
}

function escapeForMarkdown(value: string): string {
  return escapeEvidenceText(value);
}

function activeCriterionIds(criteria: readonly AcceptanceCriterion[]): Set<string> {
  return new Set(activeCriteria(criteria).map((c) => c.id));
}

function retiredCriterionIds(criteria: readonly AcceptanceCriterion[]): Set<string> {
  return new Set(
    criteria.filter((c) => c.status === "retired").map((c) => c.id),
  );
}

export function validateAcceptanceEvidence(
  input: AcceptanceEvidenceInput,
): ValidationResult {
  const errors: string[] = [];

  if (typeof input.triggers.isBugFix !== "boolean") {
    errors.push("worker must classify whether the ticket is a bug fix");
  }
  if (typeof input.triggers.bugFixRedConfirmed !== "boolean") {
    errors.push("worker must confirm the first behavioral RED for a bug fix");
  }

  // Criteria records must carry a stable local ID and an active or retired
  // status, and duplicate or reused IDs make the issue record invalid.
  const activeIds = activeCriterionIds(input.criteria);
  const retiredIds = retiredCriterionIds(input.criteria);
  const allCriterionIds = new Set(input.criteria.map((c) => c.id));
  const seenCriterionIds = new Set<string>();
  for (const criterion of input.criteria) {
    if (!/^[A-Za-z]{2,3}-\d+$/.test(criterion.id)) {
      errors.push(`malformed criterion id: ${criterion.id}`);
      continue;
    }
    if (seenCriterionIds.has(criterion.id)) {
      errors.push(`duplicate or reused criterion id within the issue: ${criterion.id}`);
      continue;
    }
    seenCriterionIds.add(criterion.id);
    if (criterion.status !== "active" && criterion.status !== "retired") {
      errors.push(`criterion ${criterion.id} must be active or retired`);
    }
  }

  const dependencyCriteriaValues = input.triggers.dependencyOrConfigCriteria;
  const dependencyCriteria = new Set(
    Array.isArray(dependencyCriteriaValues) ? dependencyCriteriaValues : [],
  );
  if (!Array.isArray(dependencyCriteriaValues)) {
    errors.push("worker must supply dependency/configuration criterion IDs from the diff");
  }
  for (const criterionId of dependencyCriteria) {
    if (!activeIds.has(criterionId)) {
      errors.push(`dependency/configuration trigger names unknown or retired criterion: ${criterionId}`);
    }
  }

  // Exact coverage by stable ID: one entry per active criterion, no unknown
  // or retired ID accepted as active evidence, no duplicate, no missing.
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

  // Per-criterion validation
  for (const ev of input.evidence) {
    if (ev.kind === "behavior") {
      if (!isNonEmptyString(ev.redReason)) {
        errors.push(`behavior criterion "${ev.criterionId}" requires non-empty redReason`);
      }
      if (!ev.focusedTests || ev.focusedTests.length === 0) {
        errors.push(`behavior criterion "${ev.criterionId}" requires at least one focusedTests entry`);
      } else {
        for (const t of ev.focusedTests) {
          if (!isNonEmptyString(t)) {
            errors.push(`behavior criterion "${ev.criterionId}" has empty focusedTests entry`);
          }
        }
      }
      if (ev.greenPassed !== true) {
        errors.push(`behavior criterion "${ev.criterionId}" requires greenPassed true`);
      }
    } else if (ev.kind === "non-behavior") {
      if (!(ALLOWED_EXEMPTIONS as readonly string[]).includes(ev.exemption)) {
        errors.push(`non-behavior criterion "${ev.criterionId}" has invalid exemption: ${ev.exemption}`);
      }
      if (!isNonEmptyString(ev.reason)) {
        errors.push(`non-behavior criterion "${ev.criterionId}" requires non-empty reason`);
      }
    } else {
      errors.push(`criterion "${(ev as { criterionId: string }).criterionId}" has unknown kind`);
    }
  }

  // Dependency/configuration changes are never exempt. The worker supplies
  // the affected criterion IDs from the diff; this module does not inspect
  // prose.
  for (const ev of input.evidence) {
    if (ev.kind === "non-behavior" && dependencyCriteria.has(ev.criterionId)) {
      errors.push(`dependency/configuration change is never exempt: "${ev.criterionId}"`);
    }
  }

  // Bug-fix: first behavioral criterion must reproduce defect
  if (input.triggers.isBugFix === true) {
    const evidenceByCriterion = new Map(input.evidence.map((e) => [e.criterionId, e] as const));
    let firstBehavioral: CriterionEvidence | null = null;
    for (const id of activeIds) {
      const ev = evidenceByCriterion.get(id);
      if (ev && ev.kind === "behavior") {
        firstBehavioral = ev;
        break;
      }
    }
    if (!firstBehavioral) {
      errors.push("bug-fix ticket: first behavioral criterion must reproduce the defect");
    } else if (!isNonEmptyString(firstBehavioral.redReason)) {
      errors.push("bug-fix ticket: first behavioral criterion RED must reproduce the reported defect");
    } else if (!input.triggers.bugFixRedConfirmed) {
      errors.push("bug-fix ticket: worker must confirm the first behavioral RED reproduces the reported defect");
    }
  }

  // Conditional external-source evidence
  if (input.triggers.touchesVersionedExternalApi) {
    if (!input.externalSource) {
      errors.push("touchesVersionedExternalApi requires externalSource evidence");
    } else {
      if (!isNonEmptyString(input.externalSource.dependency)) {
        errors.push("externalSource requires non-empty dependency");
      }
      if (!isNonEmptyString(input.externalSource.version)) {
        errors.push("externalSource requires non-empty version");
      } else if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(input.externalSource.version.trim())) {
        errors.push("externalSource version must be a resolved manifest/lockfile version (semver)");
      }
      if (!isNonEmptyString(input.externalSource.url)) {
        errors.push("externalSource requires non-empty url");
      } else if (!/^https:\/\/\S+$/.test(input.externalSource.url.trim())) {
        errors.push("externalSource url must be an https URL");
      }
      if (input.triggers.externalSourceResolved !== true) {
        errors.push("externalSource requires worker-confirmed manifest/lockfile resolution");
      }
      if (input.triggers.externalDocumentationAuthoritative !== true) {
        errors.push("externalSource requires worker-confirmed authoritative documentation");
      }
      if (!isNonEmptyString(input.externalSource.supportedDecision)) {
        errors.push("externalSource requires non-empty supportedDecision");
      }
    }
  }

  // Conditional compatibility evidence
  if (input.triggers.touchesPublicInterface) {
    if (!input.compatibility) {
      errors.push("touchesPublicInterface requires compatibility evidence");
    } else {
      if (!isNonEmptyString(input.compatibility.interface)) {
        errors.push("compatibility requires non-empty interface");
      }
      if (!(ALLOWED_COMPAT_CHANGES as readonly string[]).includes(input.compatibility.change)) {
        errors.push(`compatibility has invalid change: ${input.compatibility.change}`);
      }
      if (!isNonEmptyString(input.compatibility.consumerImpact)) {
        errors.push("compatibility requires non-empty consumerImpact");
      }
      if (!isNonEmptyString(input.compatibility.migration)) {
        errors.push("compatibility requires non-empty migration");
      }
      if (!input.compatibility.boundaryTests || input.compatibility.boundaryTests.length === 0) {
        errors.push("compatibility requires at least one boundaryTests entry");
      } else {
        for (const t of input.compatibility.boundaryTests) {
          if (!isNonEmptyString(t)) {
            errors.push("compatibility has empty boundaryTests entry");
          }
        }
      }
    }
  }

  // Conditional quality evidence sections (#172). Each triggered fact requires
  // exactly its narrow evidence section; sections never satisfy another.
  if (input.triggers.touchesBrowserBehavior) {
    if (!input.browserEvidence) {
      errors.push("touchesBrowserBehavior requires browser evidence");
    } else {
      if (!isNonEmptyString(input.browserEvidence.interaction)) {
        errors.push("browser evidence requires non-empty interaction");
      }
      if (!isNonEmptyString(input.browserEvidence.runtimeEvidence)) {
        errors.push("browser evidence requires non-empty runtimeEvidence");
      }
      if (
        !["console", "network", "accessibility", "trace", "dom"].includes(
          input.browserEvidence.evidenceType,
        )
      ) {
        errors.push(`browser evidence has invalid evidenceType: ${input.browserEvidence.evidenceType}`);
      }
      if (!isNonEmptyString(input.browserEvidence.toolingOrigin)) {
        errors.push("browser evidence requires non-empty toolingOrigin");
      }
      // A generic screenshot does not demonstrate console, network,
      // accessibility, or trace state; it is insufficient browser proof.
      const normalizedEvidence = input.browserEvidence.runtimeEvidence.toLowerCase();
      if (
        normalizedEvidence.includes("screenshot") &&
        !["console", "network", "accessibility", "trace"].some((t) =>
          normalizedEvidence.includes(t),
        )
      ) {
        errors.push("browser evidence: a generic screenshot is insufficient");
      }
    }
  }

  if (input.triggers.touchesSecurityBoundary) {
    if (!input.securityEvidence) {
      errors.push("touchesSecurityBoundary requires security evidence");
    } else {
      if (!isNonEmptyString(input.securityEvidence.assets)) {
        errors.push("security evidence requires non-empty assets");
      }
      if (!isNonEmptyString(input.securityEvidence.trustBoundaries)) {
        errors.push("security evidence requires non-empty trustBoundaries");
      }
      if (!isNonEmptyString(input.securityEvidence.abuseCases)) {
        errors.push("security evidence requires non-empty abuseCases");
      }
      if (!input.securityEvidence.controlTests || input.securityEvidence.controlTests.length === 0) {
        errors.push("security evidence requires at least one controlTests entry");
      } else {
        for (const t of input.securityEvidence.controlTests) {
          if (!isNonEmptyString(t)) {
            errors.push("security evidence has empty controlTests entry");
          }
        }
      }
    }
  }

  if (input.triggers.touchesProductionOperability) {
    if (!input.operabilityEvidence) {
      errors.push("touchesProductionOperability requires operability evidence");
    } else {
      if (!isNonEmptyString(input.operabilityEvidence.onCallQuestions)) {
        errors.push("operability evidence requires non-empty onCallQuestions");
      }
      if (
        !input.operabilityEvidence.metricLabels ||
        input.operabilityEvidence.metricLabels.length === 0
      ) {
        errors.push("operability evidence requires at least one metricLabel");
      } else {
        const labels = input.operabilityEvidence.metricLabels;
        if (labels.length > 10) {
          errors.push(`operability evidence must keep metric labels bounded (${labels.length} > 10)`);
        }
        const wildcard = labels.find((l) => l.includes("*"));
        if (wildcard !== undefined) {
          errors.push(`operability evidence must not use wildcard metric labels: ${wildcard}`);
        }
      }
      if (typeof input.operabilityEvidence.telemetryExercised !== "boolean") {
        errors.push("operability evidence must record whether the telemetry path was exercised");
      }
    }
  }

  if (input.triggers.touchesMigration) {
    if (!input.migrationEvidence) {
      errors.push("touchesMigration requires migration evidence");
    } else {
      if (!isNonEmptyString(input.migrationEvidence.consumers)) {
        errors.push("migration evidence requires non-empty consumers");
      }
      if (!input.migrationEvidence.phases || input.migrationEvidence.phases.length === 0) {
        errors.push("migration evidence requires at least one phase");
      }
      if (!isNonEmptyString(input.migrationEvidence.cutover)) {
        errors.push("migration evidence requires non-empty cutover");
      }
      if (!isNonEmptyString(input.migrationEvidence.rollback)) {
        errors.push("migration evidence requires non-empty rollback");
      }
      if (
        !input.migrationEvidence.boundaryVerification ||
        input.migrationEvidence.boundaryVerification.length === 0
      ) {
        errors.push("migration evidence requires at least one boundaryVerification entry");
      }
    }
  }

  if (input.triggers.touchesExplicitPerformance) {
    if (!input.performanceEvidence) {
      errors.push("touchesExplicitPerformance requires performance evidence");
    } else {
      const p = input.performanceEvidence;
      if (!isNonEmptyString(p.baseline?.conditions) || !isNonEmptyString(p.result?.conditions)) {
        errors.push("performance evidence requires matched baseline and result conditions");
      }
      if (
        isNonEmptyString(p.baseline?.conditions) &&
        isNonEmptyString(p.result?.conditions) &&
        p.baseline.conditions.trim() !== p.result.conditions.trim()
      ) {
        errors.push("performance evidence requires matched baseline and result conditions");
      }
      if (typeof p.baseline?.measured !== "number" || typeof p.result?.measured !== "number") {
        errors.push("performance evidence requires numeric baseline and result measurements");
      }
      if (!isNonEmptyString(p.variance)) {
        errors.push("performance evidence requires non-empty variance");
      }
      if (!isNonEmptyString(p.attribution)) {
        errors.push("performance evidence requires non-empty attribution");
      }
      if (p.keepOrRevert !== "keep" && p.keepOrRevert !== "revert") {
        errors.push("performance evidence requires a keep-or-revert decision");
      }
    }
  }

  // Versioned requirements revision (ticket #190): when supplied it must be a
  // value of the current contract version. Legacy evidence without the field
  // stays valid; a misshapen value is never accepted as a fresh pin.
  if (input.requirementsRevision !== undefined && input.requirementsRevision !== null) {
    if (!isNonEmptyString(input.requirementsRevision)) {
      errors.push("requirements revision must be a non-empty value");
    } else if (!input.requirementsRevision.startsWith(`${REQUIREMENTS_REVISION_VERSION}:`)) {
      errors.push(
        `requirements revision must start with the contract version ${REQUIREMENTS_REVISION_VERSION}`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

export function renderAcceptanceEvidence(input: AcceptanceEvidenceInput): string {
  const validation = validateAcceptanceEvidence(input);
  if (!validation.ok) {
    throw new Error(`invalid acceptance evidence: ${validation.errors.join("; ")}`);
  }

  // Deterministic order: follow the dispatch criteria order, active only.
  const evidenceByCriterion = new Map(input.evidence.map((e) => [e.criterionId, e] as const));

  const lines: string[] = [];
  lines.push(ACCEPTANCE_EVIDENCE_MARKER_START);
  lines.push("## Acceptance evidence");
  lines.push("");

  for (const criterion of activeCriteria(input.criteria)) {
    const ev = evidenceByCriterion.get(criterion.id)!;
    lines.push(`- **Criterion:** \`${escapeForMarkdown(criterion.id)}\` — ${escapeForMarkdown(criterion.text)}`);
    if (ev.kind === "behavior") {
      lines.push(`  - Kind: behavior`);
      lines.push(`  - RED: ${escapeForMarkdown(ev.redReason)}`);
      lines.push(`  - Focused tests: ${ev.focusedTests.map(escapeForMarkdown).join(", ")}`);
      lines.push(`  - GREEN: passed`);
    } else {
      lines.push(`  - Kind: non-behavior`);
      lines.push(`  - Exemption: ${escapeForMarkdown(ev.exemption)}`);
      lines.push(`  - Reason: ${escapeForMarkdown(ev.reason)}`);
    }
  }

  if (input.triggers.isBugFix === true) {
    lines.push("");
    lines.push("### Bug-fix verification");
    lines.push("- First behavioral RED: worker-confirmed defect reproduction");
  }

  if (input.triggers.touchesVersionedExternalApi && input.externalSource) {
    lines.push("");
    lines.push("### External source");
    lines.push(`- Dependency: ${escapeForMarkdown(input.externalSource.dependency)}`);
    lines.push(`- Version: ${escapeForMarkdown(input.externalSource.version)}`);
    lines.push("- Manifest/lockfile resolution: worker-confirmed");
    lines.push(`- URL: ${escapeForMarkdown(input.externalSource.url)}`);
    lines.push("- Documentation authority: worker-confirmed");
    lines.push(`- Supported decision: ${escapeForMarkdown(input.externalSource.supportedDecision)}`);
  }

  if (input.triggers.touchesPublicInterface && input.compatibility) {
    lines.push("");
    lines.push("### Compatibility");
    lines.push(`- Interface: ${escapeForMarkdown(input.compatibility.interface)}`);
    lines.push(`- Change: ${escapeForMarkdown(input.compatibility.change)}`);
    lines.push(`- Consumer impact: ${escapeForMarkdown(input.compatibility.consumerImpact)}`);
    lines.push(`- Migration: ${escapeForMarkdown(input.compatibility.migration)}`);
    lines.push(`- Boundary tests: ${input.compatibility.boundaryTests.map(escapeForMarkdown).join(", ")}`);
  }

  if (input.triggers.touchesBrowserBehavior && input.browserEvidence) {
    lines.push("");
    lines.push("### Browser evidence");
    lines.push(`- Interaction: ${escapeForMarkdown(input.browserEvidence.interaction)}`);
    lines.push(`- Runtime evidence: ${escapeForMarkdown(input.browserEvidence.runtimeEvidence)}`);
    lines.push(`- Evidence type: ${escapeForMarkdown(input.browserEvidence.evidenceType)}`);
    lines.push(`- Tooling origin: ${escapeForMarkdown(input.browserEvidence.toolingOrigin)}`);
  }

  if (input.triggers.touchesSecurityBoundary && input.securityEvidence) {
    lines.push("");
    lines.push("### Security evidence");
    lines.push(`- Assets: ${escapeForMarkdown(input.securityEvidence.assets)}`);
    lines.push(`- Trust boundaries: ${escapeForMarkdown(input.securityEvidence.trustBoundaries)}`);
    lines.push(`- Abuse cases: ${escapeForMarkdown(input.securityEvidence.abuseCases)}`);
    lines.push(`- Control tests: ${input.securityEvidence.controlTests.map(escapeForMarkdown).join(", ")}`);
  }

  if (input.triggers.touchesProductionOperability && input.operabilityEvidence) {
    lines.push("");
    lines.push("### Operability evidence");
    lines.push(`- On-call questions: ${escapeForMarkdown(input.operabilityEvidence.onCallQuestions)}`);
    lines.push(`- Metric labels: ${input.operabilityEvidence.metricLabels.map(escapeForMarkdown).join(", ")}`);
    lines.push(`- Telemetry path exercised: ${input.operabilityEvidence.telemetryExercised ? "yes" : "no"}`);
  }

  if (input.triggers.touchesMigration && input.migrationEvidence) {
    lines.push("");
    lines.push("### Migration evidence");
    lines.push(`- Consumers: ${escapeForMarkdown(input.migrationEvidence.consumers)}`);
    lines.push(`- Phases: ${input.migrationEvidence.phases.map(escapeForMarkdown).join("; ")}`);
    lines.push(`- Cutover: ${escapeForMarkdown(input.migrationEvidence.cutover)}`);
    lines.push(`- Rollback: ${escapeForMarkdown(input.migrationEvidence.rollback)}`);
    lines.push(`- Boundary verification: ${input.migrationEvidence.boundaryVerification.map(escapeForMarkdown).join(", ")}`);
  }

  if (input.triggers.touchesExplicitPerformance && input.performanceEvidence) {
    lines.push("");
    lines.push("### Performance evidence");
    lines.push(`- Baseline: ${escapeForMarkdown(input.performanceEvidence.baseline.conditions)} — ${input.performanceEvidence.baseline.measured}ms`);
    lines.push(`- Result: ${escapeForMarkdown(input.performanceEvidence.result.conditions)} — ${input.performanceEvidence.result.measured}ms`);
    lines.push(`- Variance: ${escapeForMarkdown(input.performanceEvidence.variance)}`);
    lines.push(`- Attribution: ${escapeForMarkdown(input.performanceEvidence.attribution)}`);
    lines.push(`- Decision: ${escapeForMarkdown(input.performanceEvidence.keepOrRevert)}`);
  }

  lines.push("");
  lines.push(`- Criteria revision: ${escapeForMarkdown(criteriaRevision(input.criteria))}`);
  if (input.requirementsRevision !== undefined && input.requirementsRevision !== null) {
    lines.push(`- Requirements revision: ${escapeForMarkdown(input.requirementsRevision)}`);
  }

  lines.push(ACCEPTANCE_EVIDENCE_MARKER_END);
  return lines.join("\n");
}
