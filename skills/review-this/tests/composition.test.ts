// review-this composition: one pull request in the current checkout (review-only).
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
  test("skill runs one frontier pass with no worker or delivery machinery", () => {
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
      "squash-merge",
      "review-fixer",
    ]) {
      assert.equal(skill.includes(banned), false, `skill must not mention ${banned}`);
    }
    assert.ok(skill.includes("current checkout"));
    assert.ok(skill.includes("## Resolve"));
    assert.ok(skill.includes("## Policy"));
    assert.ok(skill.includes("## Review"));
    assert.ok(skill.includes("## Publish"));
    assert.ok(skill.includes("## Spec\n\nIssue #0"));
  });
  test("review-only authority forbids delivery and the fixer is retired", () => {
    const authority = read("skills/review-this/review-authority.ts");
    assert.ok(authority.includes("REVIEWER_FORBIDDEN_ACTIONS"));
    assert.ok(norm(authority).includes("never applies fixes"));
    assert.equal(fs.existsSync(path.join(ROOT, ".kilo/agent/review-fixer.md")), false, "fixer definition must be removed");
  });
  test("config carries no Agent Manager permission", () => {
    assert.equal(read(".kilo/kilo.jsonc").includes("agent_manager"), false);
  });
  test("leaf tombstones retired wave and delivery invariants without reuse", () => {
    const leaf = read("docs/leaves/review-this.md");
    assert.ok(leaf.includes("Retired by ADR-0031"));
    assert.ok(leaf.includes("Retired by ADR-0033"));
  });
});

describe("review policy (INV-16, INV-17, INV-18)", () => {
  test("REVIEW.md defines publication, CI equivalence, and bootstrap without cloud", () => {
    const policy = read("REVIEW.md");
    assert.equal(policy.includes("cloud review"), false);
    assert.ok(policy.includes("CI equivalence"));
    assert.ok(policy.includes("review-policy revision"));
    assert.ok(policy.includes("Review policy bootstrap"));
    assert.ok(norm(policy).includes("no fix subagent"));
  });
});
