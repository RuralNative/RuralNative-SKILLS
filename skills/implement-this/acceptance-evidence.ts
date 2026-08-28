// Acceptance evidence for implement-this worker contract (#152).
//
// Pure: facts in, decisions out. No network, GitHub, filesystem-mutation,
// clocks, or Agent Manager calls. The worker supplies trigger facts from the
// current diff; this module validates criterion coverage and renders a stable
// Markdown block. Caller-provided text is escaped consistently with
// timing.ts so "-->" cannot corrupt the trusted HTML-comment marker.

export type ExemptionKind = "docs-only" | "static-content" | "rename-only" | "format-only";

export type CriterionEvidence =
  | {
      criterion: string;
      kind: "behavior";
      focusedTests: readonly string[];
      redReason: string;
      greenPassed: true;
    }
  | {
      criterion: string;
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

export interface AcceptanceEvidenceInput {
  criteria: readonly string[];
  evidence: readonly CriterionEvidence[];
  triggers: {
    touchesVersionedExternalApi: boolean;
    touchesPublicInterface: boolean;
    dependencyOrConfigCriteria: readonly string[];
    externalSourceResolved: boolean;
    externalDocumentationAuthoritative: boolean;
    isBugFix: boolean;
    bugFixRedConfirmed: boolean;
  };
  externalSource?: ExternalSourceEvidence | null;
  compatibility?: CompatibilityEvidence | null;
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

  const dependencyCriteriaValues = input.triggers.dependencyOrConfigCriteria;
  const dependencyCriteria = new Set(
    Array.isArray(dependencyCriteriaValues) ? dependencyCriteriaValues : [],
  );
  if (!Array.isArray(dependencyCriteriaValues)) {
    errors.push("worker must supply dependency/configuration criterion names from the diff");
  }
  for (const criterion of dependencyCriteria) {
    if (!input.criteria.includes(criterion)) {
      errors.push(`dependency/configuration trigger names unknown criterion: ${criterion}`);
    }
  }

  // Exact coverage: one entry per criterion, no unknown, no duplicate, no missing
  const criterionSet = new Set(input.criteria);
  if (input.evidence.length !== input.criteria.length) {
    errors.push(
      `criterion coverage: expected ${input.criteria.length} evidence entries, got ${input.evidence.length}`,
    );
  }

  const seen = new Set<string>();
  for (const ev of input.evidence) {
    if (!criterionSet.has(ev.criterion)) {
      errors.push(`unknown criterion: ${ev.criterion}`);
    }
    if (seen.has(ev.criterion)) {
      errors.push(`duplicate criterion: ${ev.criterion}`);
    }
    seen.add(ev.criterion);
  }

  for (const c of input.criteria) {
    if (!seen.has(c)) {
      errors.push(`missing evidence for criterion: ${c}`);
    }
  }

  // Per-criterion validation
  for (const ev of input.evidence) {
    if (ev.kind === "behavior") {
      if (!isNonEmptyString(ev.redReason)) {
        errors.push(`behavior criterion "${ev.criterion}" requires non-empty redReason`);
      }
      if (!ev.focusedTests || ev.focusedTests.length === 0) {
        errors.push(`behavior criterion "${ev.criterion}" requires at least one focusedTests entry`);
      } else {
        for (const t of ev.focusedTests) {
          if (!isNonEmptyString(t)) {
            errors.push(`behavior criterion "${ev.criterion}" has empty focusedTests entry`);
          }
        }
      }
      if (ev.greenPassed !== true) {
        errors.push(`behavior criterion "${ev.criterion}" requires greenPassed true`);
      }
    } else if (ev.kind === "non-behavior") {
      if (!(ALLOWED_EXEMPTIONS as readonly string[]).includes(ev.exemption)) {
        errors.push(`non-behavior criterion "${ev.criterion}" has invalid exemption: ${ev.exemption}`);
      }
      if (!isNonEmptyString(ev.reason)) {
        errors.push(`non-behavior criterion "${ev.criterion}" requires non-empty reason`);
      }
    } else {
      errors.push(`criterion "${(ev as { criterion: string }).criterion}" has unknown kind`);
    }
  }

  // Dependency/configuration changes are never exempt. The worker supplies the
  // affected criterion names from the diff; this module does not inspect prose.
  for (const ev of input.evidence) {
    if (ev.kind === "non-behavior" && dependencyCriteria.has(ev.criterion)) {
      errors.push(`dependency/configuration change is never exempt: "${ev.criterion}"`);
    }
  }

  // Bug-fix: first behavioral criterion must reproduce defect
  if (input.triggers.isBugFix === true) {
    const evidenceByCriterion = new Map(input.evidence.map((e) => [e.criterion, e] as const));
    let firstBehavioral: CriterionEvidence | null = null;
    for (const c of input.criteria) {
      const ev = evidenceByCriterion.get(c);
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

  return { ok: errors.length === 0, errors };
}

export function renderAcceptanceEvidence(input: AcceptanceEvidenceInput): string {
  const validation = validateAcceptanceEvidence(input);
  if (!validation.ok) {
    throw new Error(`invalid acceptance evidence: ${validation.errors.join("; ")}`);
  }

  // Deterministic order: follow criteria order
  const evidenceByCriterion = new Map(input.evidence.map((e) => [e.criterion, e] as const));

  const lines: string[] = [];
  lines.push(ACCEPTANCE_EVIDENCE_MARKER_START);
  lines.push("## Acceptance evidence");
  lines.push("");

  for (const criterion of input.criteria) {
    const ev = evidenceByCriterion.get(criterion)!;
    const safeCriterion = escapeForMarkdown(criterion);
    lines.push(`- **Criterion:** ${safeCriterion}`);
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

  lines.push(ACCEPTANCE_EVIDENCE_MARKER_END);
  return lines.join("\n");
}
