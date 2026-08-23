// document-for-agents:INV-14 — opt-in private skill diagnostics: consent gating, write notice, revocation, disposition, private placement, read-set exclusion, sanitization, non-normative wording.
// document-for-agents:INV-15 — protected management marker after the five commands and cautious provenance states (confirmed / likely / unknown).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { read, norm } from "../../../scripts/test-helpers.ts";

describe("opt-in skill diagnostics (document-for-agents:INV-14)", () => {
  const SKILL = "skills/document-for-agents/SKILL.md";
  const TEMPLATES = "skills/document-for-agents/reference/templates.md";
  const CLASSIFY = "skills/document-for-agents/reference/classify.md";
  const FIXTURE = "skills/document-for-agents/tests/fixtures/diagnostics-entry.json";

  test("no diagnostics file is created before explicit consent to create and maintain it", () => {
    const n = norm(read(SKILL));
    assert.ok(n.includes("explicit consent to create and maintain"));
    assert.ok(n.includes("no diagnostics file is created before"));
    assert.ok(n.includes("ask once"));
  });

  test("initial consent covers later maintenance but every write has a clear prior notice", () => {
    const n = norm(read(SKILL));
    assert.ok(n.includes("before every later write"));
    assert.ok(n.includes("what category of information will be added"));
    assert.ok(n.includes("sensitive details will be removed"));
  });

  test("revocation stops writes immediately and asks for a separate keep, export, or delete decision", () => {
    const n = norm(read(SKILL));
    assert.ok(n.includes("revocation stops writes immediately"));
    assert.ok(n.includes("keep, export, or delete"));
    assert.ok(n.includes("never deletes the file without that separate choice"));
  });

  test("the diagnostics file is private, append-only, outside the doc cache and version control by default", () => {
    const n = norm(read(SKILL));
    assert.ok(n.includes("append-only"));
    assert.ok(n.includes("outside the doc cache"));
    assert.ok(n.includes("outside version control by default"));
    assert.ok(n.includes("private"));
    assert.ok(
      n.includes("record its version-control exclusion"),
      "creating the file must record an exclusion mechanism, e.g. .git/info/exclude"
    );
  });

  test("normal loading protocols and task guidance never include the diagnostics file", () => {
    const n = norm(read(SKILL));
    assert.ok(n.includes("excluded from every normal agent read set"));
    assert.ok(n.includes("never task guidance"));
    const templates = read(TEMPLATES);
    const loading = templates.slice(
      templates.indexOf("## Loading protocol"),
      templates.indexOf("## Skill diagnostics entry")
    );
    assert.equal(loading.toLowerCase().includes("diagnostics"), false,
      "loading protocol must not route agents into the diagnostics file");
    const classify = norm(read(CLASSIFY));
    assert.ok(classify.includes("outside every tier") || classify.includes("not a doc-cache tier"));
  });

  test("entries accept confirmed mistakes only and use the approved sanitized fields", () => {
    const n = norm(read(SKILL));
    assert.ok(n.includes("confirmed by the user or proved from the prompt, code, checks, or docs"));
    const templates = norm(read(TEMPLATES));
    for (const field of [
      "category",
      "intended outcome",
      "observed mistake",
      "impact",
      "correction",
      "documentation role",
      "available pinned skill revision evidence",
      "attribution confidence",
      "redactions applied",
    ]) {
      assert.ok(templates.includes(field), `templates.md lacks approved field: ${field}`);
    }
    const fixture = JSON.parse(read(FIXTURE));
    assert.deepEqual(Object.keys(fixture.sanitized).sort(), [...fixture.approvedFields].sort());
    assert.equal(fixture.sanitized.skillRevision, "document-for-agents, none");
    assert.equal(fixture.sanitized.attributionConfidence, "unknown");
  });

  test("hostile fixture: sanitized entries omit prompt-like text and sensitive placeholders rather than copying them", () => {
    const fixture = JSON.parse(read(FIXTURE));
    for (const field of fixture.forbiddenFields) {
      assert.ok(field in fixture.candidate, `candidate must carry hostile field ${field}`);
      assert.equal(field in fixture.sanitized, false, `sanitized entry carries forbidden field ${field}`);
    }
    const sanitizedText = norm(JSON.stringify(fixture.sanitized));
    for (const secret of fixture.sensitiveStrings) {
      assert.equal(sanitizedText.includes(norm(secret)), false, `sanitized entry leaks: ${secret}`);
    }
    const candidateText = norm(JSON.stringify(fixture.candidate));
    for (const secret of fixture.sensitiveStrings) {
      assert.ok(candidateText.includes(norm(secret)), "fixture candidate should stay hostile");
    }
  });

  test("entries omit raw prompts, code, secrets, personal data, absolute paths, repository remotes, and proprietary names", () => {
    const n = norm(read(SKILL));
    assert.ok(
      n.includes("omit raw prompts, code, secrets, personal data, absolute paths, repository remotes, and proprietary names")
    );
  });

  test("entries describe evidence and correction without turning a past mistake into a general prohibition", () => {
    const n = norm(read(SKILL));
    assert.ok(n.includes("describe evidence and correction"));
    assert.ok(n.includes("never become a general prohibition or instruction"));
  });

  test("diagnostics are evidence for optional user-reviewed submission, not policy, debt, invariant, or guidance; nothing uploads", () => {
    const n = norm(read(SKILL));
    assert.ok(n.includes("optional user-reviewed submission to the skill developer"));
    assert.ok(n.includes("not policy, debt, an invariant, or task guidance"));
    assert.ok(n.includes("no upload, network call, or telemetry"));
    assert.ok(n.includes("reviews the file before any manual submission"));
  });
});

describe("management marker and provenance states (document-for-agents:INV-15)", () => {
  const SKILL = "skills/document-for-agents/SKILL.md";
  const TEMPLATES = "skills/document-for-agents/reference/templates.md";
  const PROTECTED_MARKER =
    /^<!-- managed: document-for-agents · revision-evidence: (?:none|[0-9a-f]{40}|install record: .+) -->$/;

  test("templates define one protected management marker after the five commands", () => {
    const t = read(TEMPLATES);
    const fifth = t.indexOf("5. Put work docs in the tracker; decide invariant conflicts first.");
    const markerLine = "<!-- managed: document-for-agents · revision-evidence: <available revision evidence> -->";
    const marker = t.indexOf(markerLine);
    assert.ok(fifth !== -1 && marker !== -1, "templates.md lacks commands or marker");
    assert.ok(marker > fifth, "marker must come after the five commands");
    const nextHeading = t.indexOf("\n## ", fifth);
    assert.ok(marker < nextHeading, "marker belongs inside the index template section");
    assert.equal(t.split("\n").filter((line) => line === markerLine).length, 1,
      "exactly one complete marker shape may appear in templates.md");
  });

  test("this repository's generated AGENTS.md carries exactly one marker after the five commands", () => {
    const agents = read("AGENTS.md");
    const lines = agents.split("\n");
    const markers = lines
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => /^<!-- managed: document-for-agents/.test(line));
    assert.equal(markers.length, 1, `expected one management marker, got ${markers.length}`);
    const m = markers[0];
    assert.match(m.line, PROTECTED_MARKER, "marker must use the complete protected format");
    const fifthIdx = lines.findIndex((l) => l.startsWith("5. Put work docs in the tracker"));
    const firstSection = lines.findIndex((l) => l.startsWith("## "));
    assert.notEqual(fifthIdx, -1, "AGENTS.md lacks command 5");
    assert.notEqual(firstSection, -1, "AGENTS.md lacks its first section");
    assert.equal(m.i, fifthIdx + 1, "marker must be directly after command 5");
    assert.ok(m.i < firstSection, "marker must sit before any other AGENTS.md section");
  });

  test("provenance is confirmed only when marker and evidence support it; ambiguous cases use likely or unknown", () => {
    const t = norm(read(TEMPLATES));
    assert.ok(t.includes("confirmed only when the marker plus supporting evidence backs it"));
    assert.ok(
      read(TEMPLATES).includes("Attribution confidence: confirmed | likely | unknown"),
      "the diagnostics entry must enumerate exactly the three provenance states"
    );
    assert.ok(t.includes("never guessed certainty"));
    assert.ok(t.includes("mutable branch or path alone is not revision evidence"));
    const skill = norm(read(SKILL));
    assert.ok(skill.includes("available pinned skill revision evidence"));
    const leaf = norm(read("docs/leaves/document-for-agents.md"));
    assert.ok(leaf.includes("confirmed") && leaf.includes("unknown"));
  });

  test("decision record and glossary back the contract", () => {
    const adr = read("docs/adr/0018-opt-in-skill-diagnostics.md");
    assert.ok(/^Status: accepted$/m.test(adr));
    const glossary = norm(read("CONTEXT.md"));
    assert.ok(glossary.includes("skill diagnostics"));
    assert.ok(glossary.includes("management marker"));
    const arch = norm(read("ARCHITECTURE.md"));
    assert.ok(arch.includes("docs/adr/0018-opt-in-skill-diagnostics.md"));
  });
});
