// fix-this composition: one reviewed PR in the current checkout (ADR-0035).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { read, norm } from "../../../scripts/test-helpers.ts";

const ROOT = path.resolve(import.meta.dirname ?? ".", "../../..");

describe("fix-this identity (INV-1)", () => {
  test("frontmatter and folder identity are exact", () => {
    const skill = read("skills/fix-this/SKILL.md");
    assert.match(skill, /name: fix-this/);
    assert.ok(fs.existsSync(path.join(ROOT, "skills/fix-this/INSTALL.md")));
  });
});

describe("fix-this installation and target (INV-2)", () => {
  test("documents the single-PR finalization form only", () => {
    const skill = read("skills/fix-this/SKILL.md");
    const install = read("skills/fix-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    assert.ok(n.includes("/fix-this <target>"), "single-PR form");
    assert.ok(n.includes("review-handoff-v1"), "shared handoff contract");
    assert.ok(n.includes("issue number never resolves"), "issue targets rejected");
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill fix-this"));
  });
});

describe("final-stage contract (INV-5, INV-6, INV-13, INV-14)", () => {
  test("skill finalizes in the current checkout with no review or CI gate", () => {
    const skill = read("skills/fix-this/SKILL.md");
    assert.ok(skill.includes("Never call Agent Manager"), "skill must prohibit Agent Manager use");
    for (const banned of [
      "worktree mode",
      "isolated worktree",
      "persistent PR worker",
      "persistent worktree",
      "review-fixer",
      "polls CI",
      "conditions merge on CI",
      "bypasses branch protection",
      "Agent Manager catalog",
    ]) {
      assert.equal(skill.includes(banned), false, `skill must not mention ${banned}`);
    }
    assert.ok(skill.includes("never waits for CI"), "skill must prohibit CI waiting");
    assert.ok(skill.includes("never force-push"), "skill must prohibit force-push");
    assert.ok(skill.includes("current checkout"));
    assert.ok(skill.includes("## Resolve"));
    assert.ok(skill.includes("## Fix"));
    assert.ok(skill.includes("## Verify"));
    assert.ok(skill.includes("## Merge"));
    assert.ok(skill.includes("## Bookkeeping"));
    assert.ok(skill.includes("## Ticket\n\nIssue #0"));
  });
  test("fix authority forbids another review and protected delivery actions", () => {
    const authority = read("skills/fix-this/fix-session.ts");
    assert.ok(authority.includes("FIX_THIS_FORBIDDEN_ACTIONS"));
    assert.ok(authority.includes("invoke-review-this"));
    assert.ok(authority.includes("use-ci-as-merge-gate"));
  });
  test("config carries no Agent Manager authority", () => {
    const config = JSON.parse(read(".kilo/kilo.jsonc"));
    const perm = config.agent?.["review-this"]?.permission ?? config.agent?.["fix-this"]?.permission ?? config.agent?.["implement-this"]?.permission ?? {};
    assert.ok(!("agent_manager" in perm) || (perm as any)["agent_manager"] === "deny", "Agent Manager must be absent or denied");
  });
  test("leaf keeps final-stage invariants test-encoded", () => {
    const leaf = read("docs/leaves/fix-this.md");
    assert.ok(leaf.includes("INV-5"));
    assert.ok(leaf.includes("INV-13"));
  });
});
