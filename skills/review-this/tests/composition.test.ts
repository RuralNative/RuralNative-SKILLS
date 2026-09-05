// review-this composition: one pull request in the current checkout (ADR-0031).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { read, norm, body } from "../../../scripts/test-helpers.ts";

const ROOT = path.resolve(import.meta.dirname ?? ".", "../../..");

describe("review-this identity (INV-1)", () => {
  test("frontmatter and folder identity are exact", () => {
    const skill = read("skills/review-this/SKILL.md");
    assert.match(skill, /name: review-this/);
    assert.ok(fs.existsSync(path.join(ROOT, "skills/review-this/INSTALL.md")));
  });
});

describe("review-this installation and target (INV-2)", () => {
  test("documents the single-target form only", () => {
    const skill = read("skills/review-this/SKILL.md");
    const install = read("skills/review-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    assert.ok(n.includes("/review-this <target>"), "single-target form");
    assert.equal(n.includes("#<spec>"), false, "no parent-specification wave form");
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill review-this"));
  });
});

describe("single checkout contract (INV-5, INV-6, INV-13, INV-14)", () => {
  test("skill runs one frontier pass with no worker machinery", () => {
    const skill = read("skills/review-this/SKILL.md");
    assert.ok(skill.includes("Never call Agent Manager"), "skill must prohibit Agent Manager use");
    for (const banned of [
      "worktree mode",
      "isolated worktree",
      "persistent PR worker",
      "persistent worktree",
      "planReviewWaveDispatch",
      "collectReviewEvidence",
      "resolveExecutionModel",
      "CloudAdapter",
      "Cloud collection",
      "Agent Manager overview",
      "Agent Manager catalog",
      "Requires /code-review",
      "delegation to `/code-review`",
    ]) {
      assert.equal(skill.includes(banned), false, `skill must not mention ${banned}`);
    }
    assert.ok(skill.includes("current checkout"));
    assert.ok(skill.includes("## Resolve"));
    assert.ok(skill.includes("## Review"));
    assert.ok(skill.includes("## Fix"));
    assert.ok(skill.includes("## Merge"));
    assert.ok(skill.includes("## Spec\n\nIssue #0"));
  });
  test("review-fixer definition exists with narrow permissions", () => {
    const agent = read(".kilo/agent/review-fixer.md");
    assert.ok(agent.includes("review-fixer"));
    assert.ok(agent.includes("mode: subagent"), "fixer must be Task-invocable");
    assert.match(agent, /edit:\s+"\*": ask/, "every fixer edit requires approval");
    assert.match(agent, /bash:\s+"\*": ask/, "every focused test command requires approval");
    assert.equal(agent.includes("bash: allow"), false, "fixer must not have unrestricted shell access");
    assert.ok(norm(agent).includes("do not commit"));
    assert.ok(norm(agent).includes("focused test command"), "shell use limited to packet test commands");
  });
  test("config carries no Agent Manager permission", () => {
    assert.equal(read(".kilo/kilo.jsonc").includes("agent_manager"), false);
  });
  test("leaf tombstones retired wave invariants without reuse", () => {
    const leaf = read("docs/leaves/review-this.md");
    assert.ok(leaf.includes("Retired by ADR-0031"));
  });
});

describe("review policy (INV-16, INV-17)", () => {
  test("REVIEW.md defines CI equivalence and verdict reuse without cloud", () => {
    const policy = read("REVIEW.md");
    assert.equal(policy.includes("cloud review"), false);
    assert.ok(policy.includes("CI equivalence"));
    assert.ok(policy.includes("review-policy revision"));
  });
});
