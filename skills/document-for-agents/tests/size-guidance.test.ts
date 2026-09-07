// document-for-agents:INV-8 — relevance without size quotas (ADR-0032):
// documents stay complete and direct, repetition and irrelevant material are
// removed, and length alone never decides validity. The trimming order, the
// never-silently-truncate rule, and complete explanation shapes are stated
// consistently in the guidance.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { read, norm } from "../../../scripts/test-helpers.ts";

const ROOT = path.resolve(import.meta.dirname ?? ".", "..", "..", "..");

describe("relevance without size quotas (document-for-agents:INV-8, ADR-0032)", () => {
  test("no current guidance imposes a fixed prose length", () => {
    for (const file of [
      "skills/document-for-agents/SKILL.md",
      "skills/document-for-agents/reference/templates.md",
      "skills/document-for-agents/reference/classify.md",
      "ARCHITECTURE.md",
      "CONTEXT.md",
      "README.md",
    ]) {
      const content = read(file);
      assert.equal(content.includes("under 225 lines"), false, `${file} must not impose an index line quota`);
      assert.equal(content.includes("three-minute read"), false, `${file} must not impose a leaf reading-time quota`);
      assert.equal(content.includes("105 lines") || content.includes("105-line"), false, `${file} must not impose a policy line quota`);
      assert.equal(content.includes("2–4 sentences"), false, `${file} must not impose an ADR sentence quota`);
      assert.equal(content.includes("1–2 sentences"), false, `${file} must not impose a glossary sentence quota`);
    }
    const templates = read("skills/document-for-agents/reference/templates.md");
    assert.equal(templates.includes("~15-line"), false, "templates must not impose a dependency-entry quota");
    assert.equal(templates.includes("3–8 invariants at establishment"), false, "templates must not impose an invariant establishment quota");
  });

  test("length alone never decides validity", () => {
    const templates = norm(read("skills/document-for-agents/reference/templates.md"));
    assert.ok(templates.includes("length alone never fails a route") || templates.includes("length alone never"), "templates must state the replacement");
    assert.ok(templates.includes("never padded"), "templates must forbid padding existing docs");
    for (const file of [
      "skills/document-for-agents/orientation.ts",
      "skills/plan-this/orientation.ts",
      "skills/implement-this/orientation.ts",
      "skills/review-this/orientation.ts",
      "scripts/docs-check.sh",
    ]) {
      const code = read(file);
      assert.equal(code.includes("over budget"), false, `${file} must not fail on size`);
    }
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

  test("an essential rule is never silently truncated", () => {
    const t = norm(read("skills/document-for-agents/reference/templates.md"));
    assert.ok(t.includes("never silently truncate an essential rule"), "the no-silent-truncation rule must be stated");
    assert.ok(t.includes("staged reading") || t.includes("continuity handoff"), "exhausted context must use staged reading or handoff");
    assert.ok(t.includes("disclose"), "incomplete inspection must be disclosed");
  });

  test("explanations stay complete without sentence quotas", () => {
    const t = read("skills/document-for-agents/reference/templates.md");
    assert.ok(t.includes("Keep it complete"), "an ADR decision stays complete without a quota");
    assert.ok(t.includes("definition in the domain vocabulary"), "a glossary definition stays complete without a quota");
  });

  test("task bands select source categories without caps", () => {
    const orientation = norm(read("skills/document-for-agents/reference/orientation.md"));
    assert.ok(orientation.includes("never limit length"), "orientation bands must not limit length");
    const harness = norm(read("skills/document-for-agents/reference/harness.md"));
    assert.ok(harness.includes("orientation routes"), "harness check 11 must validate orientation routes");
    assert.equal(harness.includes("over-budget route"), false, "harness check 11 must not fail on size");
  });

  test("ADR-0032 records the replacement, narrows prior cap decisions, and is cited by every affected leaf", () => {
    const adr = "docs/adr/0032-remove-document-size-gates.md";
    assert.ok(fs.existsSync(path.join(ROOT, adr)), "ADR-0032 must exist");
    const n = norm(read(adr));
    assert.ok(/status:\s*accepted/.test(n), "ADR-0032 must be accepted");
    assert.ok(n.includes("narrows: 0017, 0024, 0030"), "ADR-0032 must narrow prior cap decisions");
    assert.ok(n.includes("length alone never"), "ADR-0032 must state the replacement");
    assert.ok(
      fs.readFileSync(path.join(ROOT, "docs/manifest.md"), "utf8").includes("0032-remove-document-size-gates.md"),
      "manifest must list ADR-0032",
    );
    for (const leaf of ["document-for-agents", "plan-this", "implement-this", "review-this"]) {
      assert.ok(read(`docs/leaves/${leaf}.md`).includes("ADR-0032"), `the ${leaf} leaf must cite ADR-0032`);
    }
  });
});
