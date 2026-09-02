// document-for-agents:INV-8 — size ceilings are caps, not targets (ADR-0030):
// the 225-line index, three-minute leaf read, 105-line policy budget, ~15-line
// dependency entry, 3–8 initial invariants, ~23-invariant review trigger, the
// unchanged trimming order, the never-silently-truncate rule, and the small
// unit limits (ADR decision 2–4 sentences, glossary definition 1–2 sentences,
// routing statement one line) are stated consistently in the guidance, and the
// relaxed byte caps appear in every published table.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { read, norm } from "../../../scripts/test-helpers.ts";

const ROOT = path.resolve(import.meta.dirname ?? ".", "..", "..", "..");

describe("size ceilings after ADR-0030 (document-for-agents:INV-8)", () => {
  test("the compact index ceiling is 225 lines", () => {
    assert.ok(norm(read("skills/document-for-agents/SKILL.md")).includes("under 225 lines"), "SKILL.md must raise the index ceiling");
    assert.ok(norm(read("README.md")).includes("under 225 lines"), "README must raise the index ceiling");
  });

  test("a leaf doc is at most a three-minute read", () => {
    assert.ok(norm(read("skills/document-for-agents/reference/templates.md")).includes("three-minute read"), "templates must raise the leaf read ceiling");
    assert.ok(norm(read("skills/document-for-agents/SKILL.md")).includes("three-minute read"), "SKILL.md must raise the leaf read ceiling");
    assert.ok(norm(read("CONTEXT.md")).includes("three-minute read"), "the glossary must raise the leaf read ceiling");
    assert.ok(norm(read("README.md")).includes("three-minute read"), "README must raise the leaf read ceiling");
  });

  test("a policy doc including REVIEW.md carries a 105-line budget", () => {
    const t = norm(read("skills/document-for-agents/reference/templates.md"));
    assert.ok(t.includes("105 lines") || t.includes("105-line"), "templates must state the 105-line policy budget");
    assert.ok(norm(read("skills/document-for-agents/reference/classify.md")).includes("105 lines"), "classify must state the 105-line policy budget");
    assert.ok(norm(read("skills/document-for-agents/SKILL.md")).includes("105 lines"), "SKILL.md must state the 105-line policy budget");
  });

  test("a dependency reference entry is about 15 lines", () => {
    assert.ok(read("skills/document-for-agents/reference/templates.md").includes("~15-line"), "templates must raise the vendor-facts entry size");
  });

  test("a leaf establishes 3–8 invariants and the complexity review triggers past ~23", () => {
    const t = norm(read("skills/document-for-agents/reference/templates.md"));
    const c = norm(read("skills/document-for-agents/reference/classify.md"));
    assert.ok(t.includes("3–8 invariants at establishment"), "templates must raise the establishment range");
    assert.ok(c.includes("3–8 at establishment"), "classify must raise the establishment range");
    assert.ok(t.includes("~23 invariants"), "templates must move the review trigger to ~23");
    assert.ok(c.includes("~23"), "classify must move the review trigger to ~23");
    assert.ok(t.includes("never an automatic seam split") || t.includes("review, not an automatic"), "crossing the trigger reviews the seam, never auto-splits");
  });

  test("ceilings are caps, not targets, and nothing is padded to fill them", () => {
    const t = norm(read("skills/document-for-agents/reference/templates.md"));
    assert.ok(t.includes("caps, not targets"), "templates must state caps-are-not-targets");
    assert.ok(t.includes("never padded"), "templates must forbid padding existing docs");
  });

  test("trimming still removes recoverable repetition before essential rules", () => {
    const t = norm(read("skills/document-for-agents/reference/templates.md"));
    for (const removable of [
      "work history",
      "stale text",
      "duplication",
      "code-recoverable detail",
      "long file tours",
      "coverage restatement",
    ]) {
      assert.ok(t.includes(removable), `trimming order must name ${removable}`);
    }
    assert.ok(t.includes("before essential material"), "trimming order must cut the removable half first");
    for (const essential of ["decisions", "vocabulary", "boundaries", "invariants", "operational warnings"]) {
      assert.ok(t.includes(essential), `the preserved half must cover ${essential}`);
    }
    assert.ok(t.includes("nonessential reference"), "extended detail files hold only nonessential reference");
  });

  test("an essential rule is never silently truncated to fit a limit", () => {
    const t = norm(read("skills/document-for-agents/reference/templates.md"));
    assert.ok(t.includes("never silently truncate an essential rule"), "the no-silent-truncation rule must be stated");
    assert.ok(t.includes("over-budget report") || t.includes("over-limit report"), "over-cap essential content fails with the existing report");
    assert.ok(t.includes("decision path"), "the failure routes through the decision path");
  });

  test("small units keep their limits", () => {
    const t = read("skills/document-for-agents/reference/templates.md");
    assert.ok(t.includes("2–4 sentences"), "an ADR decision stays two to four sentences");
    assert.ok(t.includes("1–2 sentences"), "a glossary definition stays one to two sentences");
    assert.ok(t.includes("one line naming"), "a routing statement stays one line");
  });

  test("every published cap table states the relaxed byte ceilings", () => {
    const arch = norm(read("ARCHITECTURE.md"));
    for (const value of ["9,000", "13,500", "18,000", "10,500"]) {
      assert.ok(arch.includes(value), `ARCHITECTURE.md must carry the ${value} cap`);
    }
    const orientation = norm(read("skills/document-for-agents/reference/orientation.md"));
    for (const value of ["9,000", "13,500", "18,000", "10,500"]) {
      assert.ok(orientation.includes(value), `reference/orientation.md must carry the ${value} cap`);
    }
    const templates = norm(read("skills/document-for-agents/reference/templates.md"));
    assert.ok(templates.includes("no set exceeds 18,000"), "templates must raise the absolute cap");
    const harness = norm(read("skills/document-for-agents/reference/harness.md"));
    assert.ok(harness.includes("13,500") && harness.includes("18,000") && harness.includes("10,500"), "harness check 11 must state the new caps");
    const classify = norm(read("skills/document-for-agents/reference/classify.md"));
    assert.ok(classify.includes("18,000 bytes"), "classify must raise the absolute cap");
    const context = norm(read("CONTEXT.md"));
    assert.ok(context.includes("13,500") && context.includes("10,500"), "the glossary must carry the new task-band caps");
    const readme = norm(read("README.md"));
    assert.ok(readme.includes("13,500") && readme.includes("10,500"), "README must carry the new task-band caps");
  });

  test("ADR-0030 records the relaxation, narrows ADR-0024, and is cited by every affected leaf", () => {
    const adr = "docs/adr/0030-larger-orientation-ceilings.md";
    assert.ok(fs.existsSync(path.join(ROOT, adr)), "ADR-0030 must exist");
    const n = norm(read(adr));
    assert.ok(/status:\s*accepted/.test(n), "ADR-0030 must be accepted");
    assert.ok(n.includes("narrows: 0024"), "ADR-0030 must narrow ADR-0024");
    assert.ok(n.includes("caps, not targets"), "ADR-0030 must keep ceilings strict");
    assert.ok(n.includes("trimming order"), "ADR-0030 must preserve the trimming order");
    assert.ok(
      fs.readFileSync(path.join(ROOT, "docs/manifest.md"), "utf8").includes("0030-larger-orientation-ceilings.md"),
      "manifest must list ADR-0030",
    );
    for (const leaf of ["document-for-agents", "plan-this", "implement-this", "review-this"]) {
      assert.ok(read(`docs/leaves/${leaf}.md`).includes("ADR-0030"), `the ${leaf} leaf must cite ADR-0030`);
    }
    const dfaLeaf = read("docs/leaves/document-for-agents.md");
    assert.ok(dfaLeaf.includes("18,000"), "the owning leaf must state the absolute cap");
  });
});
