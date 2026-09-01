// implement-this:INV-13 — worker evidence contract (plan 1787879273774;
// stable criterion identity #188). Evidence matches criteria by stable local
// ID, never by full sentence text.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  renderAcceptanceEvidence,
  validateAcceptanceEvidence,
  ACCEPTANCE_EVIDENCE_MARKER_START,
  ACCEPTANCE_EVIDENCE_MARKER_END,
  type AcceptanceEvidenceInput,
  type CriterionEvidence,
} from "../acceptance-evidence.ts";
import type { AcceptanceCriterion } from "../workflow-state.ts";
import { criterionKey, criteriaRevision } from "../workflow-state.ts";

const defaultTriggers: AcceptanceEvidenceInput["triggers"] = {
  touchesVersionedExternalApi: false,
  touchesPublicInterface: false,
  dependencyOrConfigCriteria: [],
  externalSourceResolved: false,
  externalDocumentationAuthoritative: false,
  isBugFix: false,
  bugFixRedConfirmed: false,
  touchesBrowserBehavior: false,
  touchesSecurityBoundary: false,
  touchesProductionOperability: false,
  touchesMigration: false,
  touchesExplicitPerformance: false,
};

function testTriggers(
  overrides: Partial<AcceptanceEvidenceInput["triggers"]> = {},
): AcceptanceEvidenceInput["triggers"] {
  return { ...defaultTriggers, ...overrides };
}

function recordsOf(
  entries: Array<[string, string]>,
): AcceptanceCriterion[] {
  return entries.map(([id, text]) => ({ id, text, status: "active" as const }));
}

/** ID 1 text, ID 2 text, mixing wording so 2 issues share local IDs safely. */
const TWO_ACTIVE = [
  ["AC-1", "criterion A"],
  ["AC-2", "criterion B"],
] as Array<[string, string]>;

function baseInput(overrides: Partial<AcceptanceEvidenceInput> = {}): AcceptanceEvidenceInput {
  const criteria = overrides.criteria ?? recordsOf(TWO_ACTIVE);
  const evidence: readonly CriterionEvidence[] =
    overrides.evidence ??
    ([
      {
        criterionId: "AC-1",
        kind: "behavior",
        focusedTests: ["a.test.ts"],
        redReason: "fails without feature",
        greenPassed: true,
      },
      {
        criterionId: "AC-2",
        kind: "non-behavior",
        exemption: "docs-only",
        reason: "only updates README",
      },
    ] as const);
  return {
    criteria,
    evidence,
    triggers: overrides.triggers ?? testTriggers(),
    externalSource: overrides.externalSource ?? null,
    compatibility: overrides.compatibility ?? null,
    requirementsRevision: overrides.requirementsRevision,
  };
}

describe("acceptance evidence — criterion coverage by ID", () => {
  test("requires exactly one entry per active criterion, matched by ID", () => {
    const ok = validateAcceptanceEvidence(baseInput());
    assert.equal(ok.ok, true);

    const missing = validateAcceptanceEvidence(
      baseInput({
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
        ],
      }),
    );
    assert.equal(missing.ok, false);
    assert.ok(missing.errors.join(" ").includes("expected 2"));
  });

  test("rejects unknown and duplicate criteria IDs", () => {
    const duplicate = validateAcceptanceEvidence(
      baseInput({
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["b.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
        ],
      }),
    );
    assert.equal(duplicate.ok, false);
    assert.ok(duplicate.errors.join(" ").includes("duplicate"));

    const unknown = validateAcceptanceEvidence(
      baseInput({
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
          {
            criterionId: "AC-99",
            kind: "non-behavior",
            exemption: "docs-only",
            reason: "docs",
          },
        ],
      }),
    );
    assert.equal(unknown.ok, false);
    assert.ok(unknown.errors.join(" ").includes("unknown"));
  });

  test("wording drift between issues with the same local ID still matches by ID", () => {
    const input = baseInput({
      criteria: recordsOf([
        ["AC-1", "criterion A wording one"],
        ["AC-2", "criterion B wording one"],
      ]),
      evidence: [
        {
          criterionId: "AC-1",
          kind: "behavior",
          focusedTests: ["a.test.ts"],
          redReason: "fails",
          greenPassed: true,
        },
        {
          criterionId: "AC-2",
          kind: "non-behavior",
          exemption: "docs-only",
          reason: "docs",
        },
      ],
    });
    assert.equal(validateAcceptanceEvidence(input).ok, true);
    const rendered = renderAcceptanceEvidence(input);
    assert.ok(rendered.includes("AC-1"));
    assert.ok(rendered.includes("AC-2"));
  });
});

describe("acceptance evidence — RED requirements", () => {
  for (const { name, evidence } of [
    {
      name: "empty redReason",
      evidence: {
        criterionId: "AC-1",
        kind: "behavior",
        focusedTests: ["a.test.ts"],
        redReason: "   ",
        greenPassed: true,
      } as CriterionEvidence,
    },
    {
      name: "empty focusedTests",
      evidence: {
        criterionId: "AC-1",
        kind: "behavior",
        focusedTests: [],
        redReason: "fails",
        greenPassed: true,
      } as CriterionEvidence,
    },
    {
      name: "blank focusedTests entry",
      evidence: {
        criterionId: "AC-1",
        kind: "behavior",
        focusedTests: ["   "],
        redReason: "fails",
        greenPassed: true,
      } as CriterionEvidence,
    },
    {
      name: "greenPassed false",
      evidence: {
        criterionId: "AC-1",
        kind: "behavior",
        focusedTests: ["a.test.ts"],
        redReason: "fails",
        greenPassed: false,
      } as unknown as CriterionEvidence,
    },
  ]) {
    test(`behavioral criterion rejects ${name}`, () => {
      const result = validateAcceptanceEvidence(
        baseInput({
          criteria: recordsOf([["AC-1", "criterion A"]]),
          evidence: [evidence],
        }),
      );
      assert.equal(result.ok, false);
    });
  }

  test("behavioral criterion requires non-empty RED and focused test", () => {
    const ok = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails without implementation",
            greenPassed: true,
          },
        ],
      }),
    );
    assert.equal(ok.ok, true);
  });
});

describe("acceptance evidence — exemption whitelist", () => {
  for (const exemption of ["docs-only", "static-content", "rename-only", "format-only"] as const) {
    test(`accepts exemption ${exemption}`, () => {
      const result = validateAcceptanceEvidence(
        baseInput({
          criteria: recordsOf([["AC-1", "criterion A"]]),
          evidence: [
            {
              criterionId: "AC-1",
              kind: "non-behavior",
              exemption,
              reason: "no observable behavior",
            },
          ],
        }),
      );
      assert.equal(result.ok, true);
    });
  }

  test("rejects unknown exemption", () => {
    const result = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "non-behavior",
            exemption: "other" as never,
            reason: "reason",
          },
        ],
      }),
    );
    assert.equal(result.ok, false);
    assert.ok(result.errors.join(" ").includes("invalid exemption"));
  });

  test("non-behavior requires non-empty reason", () => {
    const result = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "non-behavior",
            exemption: "docs-only",
            reason: "   ",
          },
        ],
      }),
    );
    assert.equal(result.ok, false);
  });

  test("dependency/configuration changes are never exempt (diff-derived trigger)", () => {
    const criterion = "AC-1";
    // Without trigger, exemption is allowed
    const allowed = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: criterion,
            kind: "non-behavior",
            exemption: "docs-only",
            reason: "only docs",
          },
        ],
        triggers: { touchesVersionedExternalApi: false, touchesPublicInterface: false, dependencyOrConfigCriteria: [], externalSourceResolved: false, externalDocumentationAuthoritative: false, isBugFix: false, bugFixRedConfirmed: false, touchesBrowserBehavior: false, touchesSecurityBoundary: false, touchesProductionOperability: false, touchesMigration: false, touchesExplicitPerformance: false },
      }),
    );
    assert.equal(allowed.ok, true);

    // With diff-derived dependency/config trigger, same evidence is rejected regardless of wording
    const rejected = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: criterion,
            kind: "non-behavior",
            exemption: "docs-only",
            reason: "only docs",
          },
        ],
        triggers: { touchesVersionedExternalApi: false, touchesPublicInterface: false, dependencyOrConfigCriteria: [criterion], externalSourceResolved: false, externalDocumentationAuthoritative: false, isBugFix: false, bugFixRedConfirmed: false, touchesBrowserBehavior: false, touchesSecurityBoundary: false, touchesProductionOperability: false, touchesMigration: false, touchesExplicitPerformance: false },
      }),
    );
    assert.equal(rejected.ok, false);
    assert.ok(rejected.errors.join(" ").toLowerCase().includes("never exempt"));

    // An unknown dependency/config ID is rejected too
    const unknownDep = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
        ],
        triggers: testTriggers({ dependencyOrConfigCriteria: ["AC-99"] }),
      }),
    );
    assert.equal(unknownDep.ok, false);
    assert.ok(unknownDep.errors.join(" ").toLowerCase().includes("unknown or retired"));

    // A dependency/configuration criterion is blocked without blocking an unrelated docs-only criterion
    const mixed = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([
          ["AC-1", "upgrade React"],
          ["AC-2", "update migration guide"],
        ]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["dependency.test.ts"],
            redReason: "old API fails",
            greenPassed: true,
          },
          {
            criterionId: "AC-2",
            kind: "non-behavior",
            exemption: "docs-only",
            reason: "documentation only",
          },
        ],
        triggers: testTriggers({ dependencyOrConfigCriteria: ["AC-1"] }),
      }),
    );
    assert.equal(mixed.ok, true);
  });
});

describe("acceptance evidence — retired criteria (#188)", () => {
  test("a retired criterion is never accepted as active evidence", () => {
    const input = baseInput({
      criteria: [
        { id: "AC-1", text: "current behavior", status: "active" },
        { id: "AC-2", text: "old behavior", status: "retired" },
      ],
      evidence: [
        {
          criterionId: "AC-1",
          kind: "behavior",
          focusedTests: ["a.test.ts"],
          redReason: "fails",
          greenPassed: true,
        },
        {
          criterionId: "AC-2",
          kind: "non-behavior",
          exemption: "docs-only",
          reason: "docs",
        },
      ],
    });
    const result = validateAcceptanceEvidence(input);
    assert.equal(result.ok, false);
    assert.ok(result.errors.join(" ").includes("retired criterion is never accepted"));
  });

  test("retired records may be retained while only active evidence is required", () => {
    const input = baseInput({
      criteria: [
        { id: "AC-1", text: "current behavior", status: "active" },
        { id: "AC-2", text: "superseded behavior", status: "retired" },
      ],
      evidence: [
        {
          criterionId: "AC-1",
          kind: "behavior",
          focusedTests: ["a.test.ts"],
          redReason: "fails",
          greenPassed: true,
        },
      ],
    });
    const result = validateAcceptanceEvidence(input);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
  });

  test("duplicate or reused IDs within an issue are rejected", () => {
    const input = baseInput({
      criteria: [
        { id: "AC-1", text: "first", status: "active" },
        { id: "AC-1", text: "renumbered reuse", status: "retired" },
      ],
      evidence: [
        {
          criterionId: "AC-1",
          kind: "behavior",
          focusedTests: ["a.test.ts"],
          redReason: "fails",
          greenPassed: true,
        },
      ],
    });
    const result = validateAcceptanceEvidence(input);
    assert.equal(result.ok, false);
    assert.ok(result.errors.join(" ").includes("duplicate or reused"));
  });
});

describe("acceptance evidence — conditional source and compatibility", () => {
  test("requires externalSource when touchesVersionedExternalApi", () => {
    const missing = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
        ],
        triggers: testTriggers({ touchesVersionedExternalApi: true }),
      }),
    );
    assert.equal(missing.ok, false);
    assert.ok(missing.errors.join(" ").includes("externalSource"));

    const missingWorkerFacts = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
        ],
        triggers: testTriggers({ touchesVersionedExternalApi: true }),
        externalSource: {
          dependency: "react",
          version: "18.2.0",
          url: "https://random.example/docs",
          supportedDecision: "use new API",
        },
      }),
    );
    assert.equal(missingWorkerFacts.ok, false);
    assert.ok(missingWorkerFacts.errors.join(" ").includes("worker-confirmed"));

    const ok = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
        ],
        triggers: testTriggers({ touchesVersionedExternalApi: true, externalSourceResolved: true, externalDocumentationAuthoritative: true }),
        externalSource: {
          dependency: "react",
          version: "18.2.0",
          url: "https://react.dev/reference/react",
          supportedDecision: "use new API",
        },
      }),
    );
    assert.equal(ok.ok, true);
  });

  test("requires compatibility when touchesPublicInterface", () => {
    const missing = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
        ],
        triggers: testTriggers({ touchesPublicInterface: true }),
      }),
    );
    assert.equal(missing.ok, false);
    assert.ok(missing.errors.join(" ").includes("compatibility"));

    const ok = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
        ],
        triggers: testTriggers({ touchesPublicInterface: true }),
        compatibility: {
          interface: "public API",
          change: "additive",
          consumerImpact: "no break",
          migration: "none",
          boundaryTests: ["compat.test.ts"],
        },
      }),
    );
    assert.equal(ok.ok, true);
  });

  test("compatibility rejects invalid change and empty boundaryTests", () => {
    const invalid = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
        ],
        triggers: testTriggers({ touchesPublicInterface: true }),
        compatibility: {
          interface: "API",
          change: "unknown" as never,
          consumerImpact: "impact",
          migration: "migration",
          boundaryTests: ["t.test.ts"],
        },
      }),
    );
    assert.equal(invalid.ok, false);

    const emptyBoundary = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
        ],
        triggers: testTriggers({ touchesPublicInterface: true }),
        compatibility: {
          interface: "API",
          change: "breaking",
          consumerImpact: "breaks consumers",
          migration: "major bump",
          boundaryTests: [],
        },
      }),
    );
    assert.equal(emptyBoundary.ok, false);
  });

  test("bug-fix requires first behavioral criterion with RED", () => {
    // Valid: first behavioral (second criterion) has RED — docs-only first is allowed
    const validWithDocsFirst = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([
          ["AC-1", "criterion A"],
          ["AC-2", "criterion B"],
        ]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "non-behavior",
            exemption: "docs-only",
            reason: "docs",
          },
          {
            criterionId: "AC-2",
            kind: "behavior",
            focusedTests: ["b.test.ts"],
            redReason: "reproduces defect #123",
            greenPassed: true,
          },
        ],
        triggers: testTriggers({ isBugFix: true, bugFixRedConfirmed: true }),
      }),
    );
    assert.equal(validWithDocsFirst.ok, true);

    // Invalid: no behavioral criterion at all
    const noBehavioral = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([
          ["AC-1", "criterion A"],
          ["AC-2", "criterion B"],
        ]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "non-behavior",
            exemption: "docs-only",
            reason: "docs",
          },
          {
            criterionId: "AC-2",
            kind: "non-behavior",
            exemption: "format-only",
            reason: "format",
          },
        ],
        triggers: testTriggers({ isBugFix: true }),
      }),
    );
    assert.equal(noBehavioral.ok, false);
    assert.ok(noBehavioral.errors.join(" ").includes("bug-fix"));

    // Invalid: first behavioral has empty RED
    const emptyRed = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "   ",
            greenPassed: true,
          },
        ],
        triggers: testTriggers({ isBugFix: true }),
      }),
    );
    assert.equal(emptyRed.ok, false);

    // Invalid: worker did not confirm that the RED reproduces the defect
    const genericRed = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
        ],
        triggers: testTriggers({ isBugFix: true }),
      }),
    );
    assert.equal(genericRed.ok, false);
    assert.ok(genericRed.errors.join(" ").includes("worker must confirm"));

    // Valid: the worker supplies the semantic confirmation; the validator does not parse RED prose
    const naturalRed = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "crashes on empty input",
            greenPassed: true,
          },
        ],
        triggers: testTriggers({ isBugFix: true, bugFixRedConfirmed: true }),
      }),
    );
    assert.equal(naturalRed.ok, true);

    const omittedClassification = validateAcceptanceEvidence({
      criteria: recordsOf([["AC-1", "criterion A"]]),
      evidence: [
        {
          criterionId: "AC-1",
          kind: "behavior",
          focusedTests: ["a.test.ts"],
          redReason: "crashes on empty input",
          greenPassed: true,
        },
      ],
      triggers: {
        touchesVersionedExternalApi: false,
        touchesPublicInterface: false,
        dependencyOrConfigCriteria: [],
        externalSourceResolved: false,
        externalDocumentationAuthoritative: false,
        isBugFix: undefined,
        bugFixRedConfirmed: false,
      },
    } as unknown as AcceptanceEvidenceInput);
    assert.equal(omittedClassification.ok, false);
    assert.ok(omittedClassification.errors.join(" ").includes("classify"));
  });
});

describe("acceptance evidence — escaping and deterministic rendering", () => {
  test("escaping prevents --> corruption", () => {
    const input: AcceptanceEvidenceInput = {
      criteria: recordsOf([["AC-1", "criterion A"]]),
      evidence: [
        {
          criterionId: "AC-1",
          kind: "behavior",
          focusedTests: ["a.test.ts"],
          redReason: "blocked by --> injection",
          greenPassed: true,
        },
      ],
      triggers: testTriggers(),
    };
    const rendered = renderAcceptanceEvidence(input);
    assert.ok(rendered.includes(ACCEPTANCE_EVIDENCE_MARKER_START));
    assert.ok(rendered.includes(ACCEPTANCE_EVIDENCE_MARKER_END));
    assert.equal((rendered.match(/ruralnative:acceptance-evidence:end/g) ?? []).length, 1);
    assert.ok(rendered.includes("--\\u003E"), "must escape -->");
  });

  test("deterministic rendering: same input yields same output", () => {
    const input: AcceptanceEvidenceInput = {
      criteria: recordsOf([
        ["AC-1", "criterion A"],
        ["AC-2", "criterion B"],
      ]),
      evidence: [
        {
          criterionId: "AC-1",
          kind: "behavior",
          focusedTests: ["a.test.ts"],
          redReason: "fails",
          greenPassed: true,
        },
        {
          criterionId: "AC-2",
          kind: "non-behavior",
          exemption: "format-only",
          reason: "whitespace only",
        },
      ],
      triggers: testTriggers(),
    };
    const first = renderAcceptanceEvidence(input);
    const second = renderAcceptanceEvidence(input);
    assert.equal(first, second);
  });

  test("a wording clarification keeps the ID and changes the requirements revision", () => {
    const clarifiedText = "criterion A wording clarified";
    const original = baseInput();
    const clarified = baseInput({
      criteria: recordsOf([[ "AC-1", clarifiedText]]),
    });
    assert.notEqual(
      criteriaRevision(clarified.criteria),
      criteriaRevision(original.criteria),
      "clarification must change the requirements revision",
    );
    assert.ok(
      criteriaRevision(clarified.criteria).includes("AC-1"),
      "the same stable ID survives the clarification",
    );
  });

  test("the versioned requirements revision rides the evidence block (ticket #190)", () => {
    const revision = "requirements-v1:parent=0000000000000000000000000000000000000000000000000000000000000000;ticket=1111111111111111111111111111111111111111111111111111111111111111";
    const rendered = renderAcceptanceEvidence(
      baseInput({
        requirementsRevision: revision,
      }),
    );
    assert.ok(rendered.includes(`- Requirements revision: ${revision}`));
    assert.ok(rendered.includes("- Criteria revision: "));
  });

  test("a misshapen requirements revision is rejected; legacy absence stays valid", () => {
    const malformed = baseInput({
      requirementsRevision: "parent=stale",
    });
    const errors = validateAcceptanceEvidence(malformed).errors;
    assert.ok(
      errors.some((e) => e.includes("requirements revision")),
      "a value outside the contract version is rejected",
    );
    const legacy = baseInput();
    assert.deepEqual(validateAcceptanceEvidence(legacy).errors, []);
    const rendered = renderAcceptanceEvidence(legacy);
    assert.equal(rendered.includes("- Requirements revision: "), false);
  });

  test("external and compatibility sections appear only when triggered", () => {
    const without = renderAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
        ],
      }),
    );
    assert.equal(without.includes("External source"), false);
    assert.equal(without.includes("Compatibility"), false);

    const withBoth = renderAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
        ],
        triggers: testTriggers({
          touchesVersionedExternalApi: true,
          touchesPublicInterface: true,
          externalSourceResolved: true,
          externalDocumentationAuthoritative: true,
        }),
        externalSource: {
          dependency: "dep",
          version: "1.0.0",
          url: "https://example.com/docs",
          supportedDecision: "decision",
        },
        compatibility: {
          interface: "API",
          change: "breaking",
          consumerImpact: "major",
          migration: "migrate",
          boundaryTests: ["b.test.ts"],
        },
      }),
    );
    assert.ok(withBoth.includes("External source"));
    assert.ok(withBoth.includes("Compatibility"));
  });

  test("external source requires semver and authoritative https URL", () => {
    const badVersion = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
        ],
        triggers: testTriggers({ touchesVersionedExternalApi: true }),
        externalSource: {
          dependency: "react",
          version: "latest",
          url: "https://react.dev/reference/react",
          supportedDecision: "use new API",
        },
      }),
    );
    assert.equal(badVersion.ok, false);
    assert.ok(badVersion.errors.join(" ").includes("semver"));

    const badUrl = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
        ],
        triggers: testTriggers({ touchesVersionedExternalApi: true }),
        externalSource: {
          dependency: "react",
          version: "18.2.0",
          url: "not-a-url",
          supportedDecision: "use new API",
        },
      }),
    );
    assert.equal(badUrl.ok, false);
    assert.ok(badUrl.errors.join(" ").includes("https"));

    const garbageVersion = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
        ],
        triggers: testTriggers({ touchesVersionedExternalApi: true }),
        externalSource: {
          dependency: "dep",
          version: "1.2.3garbage",
          url: "https://example.com/docs",
          supportedDecision: "x",
        },
      }),
    );
    assert.equal(garbageVersion.ok, false);
    assert.ok(garbageVersion.errors.join(" ").includes("semver"));

    const httpUrl = validateAcceptanceEvidence(
      baseInput({
        criteria: recordsOf([["AC-1", "criterion A"]]),
        evidence: [
          {
            criterionId: "AC-1",
            kind: "behavior",
            focusedTests: ["a.test.ts"],
            redReason: "fails",
            greenPassed: true,
          },
        ],
        triggers: testTriggers({ touchesVersionedExternalApi: true }),
        externalSource: {
          dependency: "dep",
          version: "1.2.3",
          url: "http://example.com/docs",
          supportedDecision: "x",
        },
      }),
    );
    assert.equal(httpUrl.ok, false);
    assert.ok(httpUrl.errors.join(" ").includes("https"));
  });
});

describe("conditional quality evidence triggers (#172, ADR-0021 extension)", () => {
  function triggeredInput(
    overrides: Partial<AcceptanceEvidenceInput> = {},
  ): AcceptanceEvidenceInput {
    return {
      ...baseInput(),
      ...overrides,
      triggers: {
        ...testTriggers(),
        ...(overrides.triggers ?? {}),
      },
    };
  }

  test("validation rejects a triggered fact without its narrow evidence section", () => {
    const facts = [
      ["touchesBrowserBehavior", "browser evidence"],
      ["touchesSecurityBoundary", "security evidence"],
      ["touchesProductionOperability", "operability evidence"],
      ["touchesMigration", "migration evidence"],
      ["touchesExplicitPerformance", "performance evidence"],
    ] as const;
    for (const [fact, section] of facts) {
      const result = validateAcceptanceEvidence(
        triggeredInput({
          triggers: testTriggers({ [fact]: true }),
        }),
      );
      assert.equal(result.ok, false, `${fact} must fail without its narrow evidence section`);
      assert.ok(
        result.errors.join(" ").toLowerCase().includes(section),
        `${fact} must name the missing ${section} section`,
      );
    }
  });

  test("a triggered fact does not satisfy a different section", () => {
    const browserOnly = validateAcceptanceEvidence({
      ...triggeredInput({
        triggers: testTriggers({
          touchesBrowserBehavior: true,
          touchesSecurityBoundary: true,
        }),
      }),
      browserEvidence: {
        interaction: "click submit",
        runtimeEvidence: "console error 'x is not defined' on submit",
        evidenceType: "console",
        toolingOrigin: "host-browser",
      },
    });
    assert.equal(browserOnly.ok, false);
    assert.ok(
      browserOnly.errors.join(" ").toLowerCase().includes("security"),
      "missing security evidence must be named",
    );
  });

  test("browser evidence rejects a generic screenshot as insufficient", () => {
    const screenshotOnly = validateAcceptanceEvidence({
      ...triggeredInput({ triggers: testTriggers({ touchesBrowserBehavior: true }) }),
      browserEvidence: {
        interaction: "load page",
        runtimeEvidence: "screenshot of the rendered page",
        evidenceType: "dom",
        toolingOrigin: "host-browser",
      },
    });
    assert.equal(screenshotOnly.ok, false);
    assert.ok(screenshotOnly.errors.join(" ").toLowerCase().includes("screenshot"));
  });

  test("valid evidence for every triggered section passes", () => {
    const input: AcceptanceEvidenceInput = {
      ...triggeredInput({
        triggers: testTriggers({
          touchesBrowserBehavior: true,
          touchesSecurityBoundary: true,
          touchesProductionOperability: true,
          touchesMigration: true,
          touchesExplicitPerformance: true,
        }),
      }),
      browserEvidence: {
        interaction: "click submit",
        runtimeEvidence: "console error 'x is not defined' logged on submit",
        evidenceType: "console",
        toolingOrigin: "host-browser",
      },
      securityEvidence: {
        assets: "login endpoint, auth token store",
        trustBoundaries: "untrusted network to trusted token store",
        abuseCases: "credential stuffing, token replay",
        controlTests: ["security-control.test.ts"],
      },
      operabilityEvidence: {
        onCallQuestions: "what raises the error budget on checkout?",
        metricLabels: ["app.checkout.errors", "app.checkout.latency"],
        telemetryExercised: true,
      },
      migrationEvidence: {
        consumers: "api clients v1",
        phases: ["additive: new endpoint alongside v1", "destructive: remove v1 after cutover"],
        cutover: "feature flag flips v1 off",
        rollback: "flag flip restores v1",
        boundaryVerification: ["migration-boundary.test.ts"],
      },
      performanceEvidence: {
        baseline: { conditions: "cold cache, 1KB payload", measured: 240 },
        result: { conditions: "cold cache, 1KB payload", measured: 120 },
        variance: "repeat 5 runs, p95 118-124",
        attribution: "bundler change in this PR",
        keepOrRevert: "keep",
      },
    };
    const result = validateAcceptanceEvidence(input);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
  });

  test("untriggered tickets keep the current shape and render no extra sections", () => {
    const plain = baseInput();
    assert.equal(validateAcceptanceEvidence(plain).ok, true);
    const rendered = renderAcceptanceEvidence(plain);
    for (const section of [
      "Browser evidence",
      "Security evidence",
      "Operability evidence",
      "Migration evidence",
      "Performance evidence",
    ]) {
      assert.equal(rendered.includes(section), false, `${section} must not render when untriggered`);
    }
  });

  test("operability keeps metric labels bounded and records telemetry exercise", () => {
    const unbounded = validateAcceptanceEvidence({
      ...triggeredInput({ triggers: testTriggers({ touchesProductionOperability: true }) }),
      operabilityEvidence: {
        onCallQuestions: "what is broken?",
        metricLabels: ["app.*.errors", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"],
        telemetryExercised: false,
      },
    });
    assert.equal(unbounded.ok, false);
    assert.ok(unbounded.errors.join(" ").toLowerCase().includes("bounded"));

    const ok = validateAcceptanceEvidence({
      ...triggeredInput({ triggers: testTriggers({ touchesProductionOperability: true }) }),
      operabilityEvidence: {
        onCallQuestions: "what raises the error budget on checkout?",
        metricLabels: ["app.checkout.errors", "app.checkout.latency"],
        telemetryExercised: true,
      },
    });
    assert.equal(ok.ok, true);
  });

  test("migration evidence names consumers, phases, cutover, rollback, and boundary", () => {
    const missingRollback = validateAcceptanceEvidence({
      ...triggeredInput({ triggers: testTriggers({ touchesMigration: true }) }),
      migrationEvidence: {
        consumers: "v1 clients",
        phases: ["additive"],
        cutover: "flag",
        rollback: "",
        boundaryVerification: [],
      },
    });
    assert.equal(missingRollback.ok, false);

    const complete = validateAcceptanceEvidence({
      ...triggeredInput({ triggers: testTriggers({ touchesMigration: true }) }),
      migrationEvidence: {
        consumers: "v1 clients",
        phases: ["additive: new endpoint", "destructive: remove v1"],
        cutover: "flag flip",
        rollback: "flag restore",
        boundaryVerification: ["migration.test.ts"],
      },
    });
    assert.equal(complete.ok, true);
  });

  test("performance evidence records matched conditions, variance, attribution, and keep-or-revert", () => {
    const unmatched = validateAcceptanceEvidence({
      ...triggeredInput({ triggers: testTriggers({ touchesExplicitPerformance: true }) }),
      performanceEvidence: {
        baseline: { conditions: "cold", measured: 100 },
        result: { conditions: "warm cache", measured: 50 },
        variance: "",
        attribution: "",
        keepOrRevert: "keep",
      },
    });
    assert.equal(unmatched.ok, false);

    const missingDecision = validateAcceptanceEvidence({
      ...triggeredInput({ triggers: testTriggers({ touchesExplicitPerformance: true }) }),
      performanceEvidence: {
        baseline: { conditions: "cold", measured: 100 },
        result: { conditions: "cold", measured: 50 },
        variance: "",
        attribution: "",
        keepOrRevert: "undecided" as never,
      },
    });
    assert.equal(missingDecision.ok, false);

    const complete = validateAcceptanceEvidence({
      ...triggeredInput({ triggers: testTriggers({ touchesExplicitPerformance: true }) }),
      performanceEvidence: {
        baseline: { conditions: "cold cache, 1KB", measured: 240 },
        result: { conditions: "cold cache, 1KB", measured: 120 },
        variance: "5 runs, p95 118-124",
        attribution: "this PR's bundler change",
        keepOrRevert: "keep",
      },
    });
    assert.equal(complete.ok, true);
  });

  test("rendering includes triggered sections and skips untriggered ones", () => {
    const input: AcceptanceEvidenceInput = {
      ...triggeredInput({ triggers: testTriggers({ touchesBrowserBehavior: true }) }),
      browserEvidence: {
        interaction: "click submit",
        runtimeEvidence: "console error logged",
        evidenceType: "console",
        toolingOrigin: "host-browser",
      },
    };
    const rendered = renderAcceptanceEvidence(input);
    assert.ok(rendered.includes("Browser evidence"));
    assert.ok(rendered.includes("- Interaction:"));
    assert.ok(rendered.includes("click submit"));
    assert.equal(rendered.includes("Security evidence"), false);
  });
});

describe("fixture review cases — four plan fixtures", () => {
  test("ordinary behavioral feature renders RED/GREEN by ID", () => {
    const input: AcceptanceEvidenceInput = {
      criteria: recordsOf([["AC-1", "add validation"]]),
      evidence: [
        {
          criterionId: "AC-1",
          kind: "behavior",
          focusedTests: ["validation.test.ts"],
          redReason: "fails without validation",
          greenPassed: true,
        },
      ],
      triggers: testTriggers(),
    };
    const rendered = renderAcceptanceEvidence(input);
    assert.ok(rendered.includes("RED: fails without validation"));
    assert.ok(rendered.includes("GREEN: passed"));
  });

  test("bug fix reproduces defect in first behavioral RED", () => {
    const input: AcceptanceEvidenceInput = {
      criteria: recordsOf([["AC-1", "fix crash on empty input"]]),
      evidence: [
        {
          criterionId: "AC-1",
          kind: "behavior",
          focusedTests: ["reproduce-crash.test.ts"],
          redReason: "reproduces crash on empty input",
          greenPassed: true,
        },
      ],
      triggers: testTriggers({ isBugFix: true, bugFixRedConfirmed: true }),
    };
    assert.equal(validateAcceptanceEvidence(input).ok, true);
    assert.ok(renderAcceptanceEvidence(input).includes("worker-confirmed defect reproduction"));
  });

  test("docs-only exemption records whitelist reason", () => {
    const input: AcceptanceEvidenceInput = {
      criteria: recordsOf([["AC-1", "update README"]]),
      evidence: [
        {
          criterionId: "AC-1",
          kind: "non-behavior",
          exemption: "docs-only",
          reason: "no observable behavior, only documentation",
        },
      ],
      triggers: testTriggers(),
    };
    const rendered = renderAcceptanceEvidence(input);
    assert.ok(rendered.includes("Exemption: docs-only"));
  });

  test("version-sensitive public-interface change includes source and compatibility", () => {
    const input: AcceptanceEvidenceInput = {
      criteria: recordsOf([["AC-1", "expose new public API"]]),
      evidence: [
        {
          criterionId: "AC-1",
          kind: "behavior",
          focusedTests: ["api.test.ts"],
          redReason: "fails without new endpoint",
          greenPassed: true,
        },
      ],
      triggers: testTriggers({
        touchesVersionedExternalApi: true,
        touchesPublicInterface: true,
        externalSourceResolved: true,
        externalDocumentationAuthoritative: true,
      }),
      externalSource: {
        dependency: "my-lib",
        version: "2.3.0",
        url: "https://my-lib.dev/docs/api",
        supportedDecision: "use stable API per docs",
      },
      compatibility: {
        interface: "public API",
        change: "additive",
        consumerImpact: "new endpoint, no break",
        migration: "none",
        boundaryTests: ["compat.test.ts"],
      },
    };
    assert.equal(validateAcceptanceEvidence(input).ok, true);
    const rendered = renderAcceptanceEvidence(input);
    assert.ok(rendered.includes("External source"));
    assert.ok(rendered.includes("worker-confirmed"));
    assert.ok(rendered.includes("Compatibility"));
  });
});

describe("stable criterion key (parent #183, ticket #188)", () => {
  test("the stable key is the authority issue number plus the local ID", () => {
    assert.equal(criterionKey(188, "AC-1"), "#188:AC-1");
    assert.equal(criterionKey(183, "AC-1"), "#183:AC-1");
  });

  test("two issues using the same local ID are safe because keys differ", () => {
    assert.notEqual(criterionKey(183, "AC-1"), criterionKey(188, "AC-1"));
  });
});