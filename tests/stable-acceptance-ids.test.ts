// Stable acceptance-criterion identity (ticket #188, parent #183).
//
// Cross-stage tests: the same criterion wording moves between planning
// (published issue body), dispatch (dispatch packet), worker evidence, and
// review references. Matching always happens by the stable local ID
// `(authority issue number, local ID)`, never by full sentence text.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  activeCriteria,
  criterionKey,
  criteriaRevision,
  parseAcceptanceCriteria,
  validateCriterionRecords,
} from "../scripts/workflow-state.ts";
import {
  createDispatchPacket,
  renderDispatchPacket,
} from "../skills/implement-this/dispatch-packet.ts";
import {
  renderAcceptanceEvidence,
  validateAcceptanceEvidence,
  type AcceptanceEvidenceInput,
} from "../skills/implement-this/acceptance-evidence.ts";

const PARENT_BODY = [
  "## Behaviour",
  "",
  "Publish stable criterion IDs.",
  "",
  "## Acceptance criteria",
  "",
  "- `AC-1`: Every published parent and child acceptance criterion has a local ID unique within that issue.",
  "- `AC-2`: The internal criterion record contains ID, text, and active or retired status.",
].join("\n");

const TICKET_BODY = [
  "Part of #183",
  "",
  "## Behavior",
  "",
  "Carry stable criterion IDs through dispatch, evidence, and review.",
  "",
  "## Acceptance criteria",
  "",
  "- `AC-1`: Worker dispatch and implementation evidence match criteria by ID instead of full text.",
  "- `AC-2`: Review findings and whole-spec verification name the same stable key.",
  "- `AC-3`: A wording clarification keeps the ID and changes the requirements revision.",
].join("\n");

const triggers: AcceptanceEvidenceInput["triggers"] = {
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

describe("published acceptance criteria (#188)", () => {
  test("parse assigns local IDs from the published bullets", () => {
    const criteria = parseAcceptanceCriteria(PARENT_BODY);
    assert.deepEqual(criteria.map((c) => c.id), ["AC-1", "AC-2"]);
    assert.equal(criteria.every((c) => c.status === "active"), true);
  });

  test("local IDs are unique within one issue under validation", () => {
    assert.deepEqual(validateCriterionRecords(parseAcceptanceCriteria(PARENT_BODY)), []);
  });

  test("a duplicate or reused local ID is a violation", () => {
    const body = [
      "## Acceptance criteria",
      "- `AC-1`: first",
      "- `AC-1` (retired): reused under the same ID",
    ].join("\n");
    const criteria = parseAcceptanceCriteria(body);
    const errors = validateCriterionRecords(criteria);
    assert.ok(errors.some((e) => e.includes("AC-1")));
  });

  test("a retired marker is parsed as retired status", () => {
    const body = [
      "## Acceptance criteria",
      "- `AC-1`: current behavior",
      "- `AC-2` (retired): superseded behavior",
    ].join("\n");
    const criteria = parseAcceptanceCriteria(body);
    assert.equal(criteria.find((c) => c.id === "AC-1")?.status, "active");
    assert.equal(criteria.find((c) => c.id === "AC-2")?.status, "retired");
    assert.deepEqual(activeCriteria(criteria).map((c) => c.id), ["AC-1"]);
  });
});

describe("stable key and requirements revision (#188)", () => {
  test("the stable key is the authority issue number plus the local ID", () => {
    assert.equal(criterionKey(183, "AC-1"), "#183:AC-1");
    assert.equal(criterionKey(188, "AC-2"), "#188:AC-2");
  });

  test("two issues using the same local ID are safe because the key differs", () => {
    const parent = criterionKey(183, "AC-1");
    const ticket = criterionKey(188, "AC-1");
    assert.notEqual(parent, ticket);
  });

  test("a wording clarification keeps the ID and changes the requirements revision", () => {
    const before = parseAcceptanceCriteria(TICKET_BODY);
    const clarified = before.map((c) =>
      c.id === "AC-3"
        ? { ...c, text: "A wording clarification keeps the same ID and changes the requirements revision value." }
        : c,
    );
    assert.equal(clarified[2].id, "AC-3", "the ID survives the clarification");
    assert.notEqual(criteriaRevision(clarified), criteriaRevision(before));
  });

  test("changed observable behavior gets a new ID and retires the old one", () => {
    const before = parseAcceptanceCriteria(TICKET_BODY);
    const replaced = [
      ...before.filter((c) => c.id !== "AC-1").map((c) => ({ ...c })),
      { id: "AC-1", text: "old dispatch matching behavior", status: "retired" as const },
      { id: "AC-4", text: "dispatch and evidence now match criteria by ID", status: "active" as const },
    ];
    assert.equal(replaced.find((c) => c.id === "AC-1")?.status, "retired");
    assert.equal(replaced.find((c) => c.id === "AC-4")?.status, "active");
    assert.notEqual(criteriaRevision(replaced), criteriaRevision(before));
  });

  test("retired IDs are never renumbered or reused", () => {
    const before = parseAcceptanceCriteria(TICKET_BODY);
    const after = [
      ...before.map((c) => (c.id === "AC-1" ? { ...c, status: "retired" as const } : c)),
      { id: "AC-4", text: "new behavior", status: "active" as const },
    ];
    const errors = validateCriterionRecords(after);
    assert.deepEqual(errors, []);
    // Reusing the retired ID as active would be a duplicate violation.
    const reused = [
      ...after,
      { id: "AC-1", text: "illegal reuse", status: "active" as const },
    ];
    assert.ok(validateCriterionRecords(reused).some((e) => e.includes("duplicate")));
  });
});

describe("cross-stage matching by ID (#188)", () => {
  test("a dispatch packet carries the criteria records with their IDs", () => {
    const packet = createDispatchPacket({
      ticket: 188,
      riskClass: "high-risk",
      revisions: { base: "base-a", head: "head-a" },
      affectedSeams: ["plan-this", "implement-this", "review-this"],
      acceptanceCriteria: parseAcceptanceCriteria(TICKET_BODY),
      settledDecisions: ["criteria are matched by ID"],
    });
    const rendered = renderDispatchPacket(packet);
    assert.ok(rendered.includes("`AC-1`"));
    assert.ok(rendered.includes("`AC-3`"));
  });

  test("evidence references criteria by ID even when wording drifts", () => {
    // Planning wording differs from the dispatch/evidence wording but the IDs
    // stay stable across the pipeline.
    const planningWording = [
      { id: "AC-1", text: "match by ID, not by sentence", status: "active" as const },
      { id: "AC-2", text: "review names the same key", status: "active" as const },
    ];
    const input: AcceptanceEvidenceInput = {
      criteria: planningWording,
      evidence: [
        {
          criterionId: "AC-1",
          kind: "behavior",
          focusedTests: ["cross-stage.test.ts"],
          redReason: "matching by full text ties to stale wording",
          greenPassed: true,
        },
        {
          criterionId: "AC-2",
          kind: "non-behavior",
          exemption: "docs-only",
          reason: "review prose only",
        },
      ],
      triggers,
    };
    assert.equal(validateAcceptanceEvidence(input).ok, true);
    const rendered = renderAcceptanceEvidence(input);
    assert.ok(rendered.includes("`AC-1`"));
    assert.ok(rendered.includes("`AC-2`"));
  });

  test("unknown, retired, missing, and duplicate IDs fail evidence validation", () => {
    const criteria = parseAcceptanceCriteria(TICKET_BODY);
    const base: AcceptanceEvidenceInput = {
      criteria,
      evidence: criteria.map((c, i) => ({
        criterionId: c.id,
        kind: i === 0 ? ("behavior" as const) : ("non-behavior" as const),
        focusedTests: i === 0 ? ["t.test.ts"] : undefined,
        redReason: i === 0 ? "fails" : undefined,
        greenPassed: i === 0 ? (true as const) : undefined,
        exemption: i === 0 ? undefined : ("docs-only" as const),
        reason: i === 0 ? undefined : "docs",
      })),
      triggers,
    };

    const unknown = validateAcceptanceEvidence({
      ...base,
      evidence: base.evidence.map((e, i) =>
        i === 0 ? { ...e, criterionId: "AC-99" } : e,
      ),
    });
    assert.equal(unknown.ok, false);
    assert.ok(unknown.errors.join(" ").includes("unknown"));

    const retired = validateAcceptanceEvidence({
      ...base,
      criteria: [
        ...criteria,
        { id: "AC-9", text: "retired", status: "retired" },
      ],
      evidence: [
        ...base.evidence,
        {
          criterionId: "AC-9",
          kind: "non-behavior",
          exemption: "docs-only",
          reason: "docs",
        },
      ],
    });
    assert.equal(retired.ok, false);
    assert.ok(retired.errors.join(" ").includes("retired"));

    const duplicate = validateAcceptanceEvidence({
      ...base,
      evidence: [
        base.evidence[0],
        { ...base.evidence[0], kind: "non-behavior", exemption: "docs-only", reason: "dup" },
        ...base.evidence.slice(1),
      ],
    });
    assert.equal(duplicate.ok, false);
    assert.ok(duplicate.errors.join(" ").includes("duplicate"));

    const missing = validateAcceptanceEvidence({
      ...base,
      evidence: base.evidence.slice(0, base.evidence.length - 1),
    });
    assert.equal(missing.ok, false);
    assert.ok(missing.errors.join(" ").includes("missing evidence"));
  });

  test("review references name the same stable key the evidence rendered", () => {
    const input: AcceptanceEvidenceInput = {
      criteria: [{ id: "AC-1", text: "criterion A", status: "active" }],
      evidence: [
        {
          criterionId: "AC-1",
          kind: "behavior",
          focusedTests: ["a.test.ts"],
          redReason: "fails",
          greenPassed: true,
        },
      ],
      triggers,
    };
    const rendered = renderAcceptanceEvidence(input);
    assert.ok(rendered.includes("AC-1"), "evidence renders the stable local ID");
  });
});