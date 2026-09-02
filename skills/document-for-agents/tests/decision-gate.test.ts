// document-for-agents:INV-19 (ADR-0028) — decision capture is a prospective
// gate, not only a supersession step. ADR-worthy choices record the decision,
// context, genuinely considered alternatives with rejection reasons, and
// consequences while the reasoner still holds them; a discovered tradeoff
// during implementation pauses the work until recorded. Legacy ADRs missing
// rationale are recovered only from cited evidence into a separate accepted
// `Clarifies:` record that leaves the original verbatim; unsupported rationale
// is a cache gap marked `unknown`, never invented.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { read, norm } from "../../../scripts/test-helpers.ts";

describe("prospective decision capture (document-for-agents:INV-19, ADR-0028)", () => {
  const SKILL = read("skills/document-for-agents/SKILL.md");
  const TEMPLATES = read("skills/document-for-agents/reference/templates.md");
  const n = norm(SKILL);
  const tn = norm(TEMPLATES);

  test("the decision gate runs before implementation and names choices that change future assumptions", () => {
    assert.ok(n.includes("before implementation"), "capture must precede implementation");
    assert.ok(n.includes("changes what a future agent may assume"));
    assert.ok(n.includes("decision gate"));
    assert.ok(tn.includes("the gate is prospective, not only a supersession step"));
  });

  test("a qualifying tradeoff discovered during implementation pauses the work and is recorded before continuing", () => {
    assert.ok(n.includes("pauses the work") || n.includes("pause the work"));
    assert.ok(n.includes("recorded before continuing"));
    assert.ok(tn.includes("during implementation a newly discovered qualifying tradeoff pauses the work"));
  });

  test("an ADR-worthy choice requires decision, context, alternatives with rejection reasons, and consequences", () => {
    assert.ok(n.includes("the decision, its context, the alternatives genuinely"));
    assert.ok(n.includes("with why each was rejected"));
    assert.ok(n.includes("the consequences"));
    assert.ok(n.includes("written while the reasoner still holds them"));
    for (const word of ["hard to reverse", "surprising without context", "real tradeoff"]) {
      assert.ok(tn.includes(word), `templates.md must name the ADR-worthy test: ${word}`);
    }
  });

  test("reversible trivia stays in the commit message and completion requires an empty decision frontier", () => {
    assert.ok(n.includes("reversible trivia stays in the commit message"));
    assert.ok(n.includes("completion requires an empty decision frontier"));
  });

  test("a changed decision gets a new ADR; the original record is left verbatim", () => {
    assert.ok(n.includes("gets a new adr"));
    assert.ok(n.includes("left verbatim") || n.includes("original record is left verbatim"));
    assert.ok(tn.includes("leaves the original verbatim") || tn.includes("original verbatim"));
  });
});

describe("evidence-only rationale recovery (document-for-agents:INV-19, ADR-0028)", () => {
  const SKILL = read("skills/document-for-agents/SKILL.md");
  const TEMPLATES = read("skills/document-for-agents/reference/templates.md");
  const LEAF = read("docs/leaves/document-for-agents.md");
  const n = norm(SKILL);
  const tn = norm(TEMPLATES);

  test("lost rationale is recovered from cited repository or tracker evidence into a separate accepted Clarifies: record", () => {
    assert.ok(n.includes("clarifies:") || n.includes("clarifies: clarification"));
    assert.ok(n.includes("repository history and tracker records"));
    assert.ok(n.includes("separate accepted"));
    assert.ok(n.includes("leaving the original untouched") || n.includes("leaves the original untouched"));
    const template = TEMPLATES.slice(TEMPLATES.indexOf("## Clarification record"), TEMPLATES.indexOf("## Leaf doc"));
    assert.ok(template.includes("Clarifies: 00NN"), "clarification template must carry the Clarifies anchor");
    assert.ok(template.includes("Evidence:"));
    assert.ok(template.includes("Recovered rationale:"));
    assert.ok(template.includes("Alternatives:") && template.includes("not recovered"));
  });

  test("unsupported rationale is a cache gap marked unknown, never invented", () => {
    assert.ok(n.includes("`unknown`") || n.includes("unknown"));
    assert.ok(n.includes("invent nothing"));
    assert.ok(tn.includes("unproven rationale is"));
    assert.ok(tn.includes("`unknown`, never invented") || tn.includes("never invented"));
    assert.ok(tn.includes("cache gap"), "insufficient evidence names a cache gap");
  });

  test("the leaf declares INV-19 as a numbered invariant", () => {
    assert.ok(LEAF.includes("INV-19"));
    assert.ok(norm(LEAF).includes("legacy rationale from evidence only"));
  });

  test("the ADR-0028 record narrows and preserves prior consent and Improve rules", () => {
    const adr = read("docs/adr/0028-adaptive-doc-cache-governance.md");
    assert.ok(adr.includes("Narrows:"));
    assert.ok(adr.includes("0024"), "ADR-0028 must narrow ADR-0024");
    assert.ok(adr.includes("0018"), "ADR-0028 must narrow ADR-0018");
    assert.ok(adr.includes("Status: accepted"));
  });
});
