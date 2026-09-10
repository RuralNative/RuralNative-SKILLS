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
    assert.ok(skill.includes("review-handoff-v1"), "skill must publish the fix-this handoff");
    assert.ok(skill.includes("detached `HEAD`"), "skill must document commit-based checkout matching");
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
    assert.ok(skill.includes("## Prepare"));
    assert.ok(skill.includes("## Policy"));
    assert.ok(skill.includes("## Review"));
    assert.ok(skill.includes("## Publish"));
    assert.ok(skill.includes("## Spec\n\nIssue #0"));
  });
  test("Prepare aligns a clean mismatching checkout and keeps every other stop", () => {
    const skill = read("skills/review-this/SKILL.md");
    assert.ok(skill.includes("checkoutPreparationDecision"), "skill must decide checkout preparation");
    assert.ok(skill.includes("checkoutMatchDecision"), "skill must keep the strict final match gate");
    assert.ok(skill.includes("git fetch origin refs/pull/<n>/head"), "skill must fetch the pull-request head ref");
    assert.ok(skill.includes("git -c core.hooksPath= checkout --detach"), "skill must align without moving branches or running checkout hooks");
    assert.ok(skill.includes("Never force the switch, stash, reset, clean"), "skill must forbid destructive recovery");
    assert.ok(skill.includes("stays at the reviewed commit for `/fix-this`"), "skill must leave the aligned checkout for fix-this");
    assert.ok(skill.includes("only working-tree effect"), "skill must scope the working-tree exception to alignment");
    const install = read("skills/review-this/INSTALL.md");
    assert.ok(norm(install).includes("automatically aligns"), "install must document automatic alignment");
  });
  test("review-only authority forbids delivery and the fixer is retired", () => {
    const authority = read("skills/review-this/review-authority.ts");
    assert.ok(authority.includes("REVIEWER_FORBIDDEN_ACTIONS"));
    assert.ok(authority.includes("align-clean-checkout"), "checkout alignment must be an allowed preparation action");
    assert.ok(norm(authority).includes("never applies fixes"));
    assert.equal(fs.existsSync(path.join(ROOT, ".kilo/agent/review-fixer.md")), false, "fixer definition must be removed");
  });
  test("config carries no Agent Manager authority", () => {
    const config = JSON.parse(read(".kilo/kilo.jsonc"));
    const perm = config.agent?.["review-this"]?.permission ?? config.agent?.["fix-this"]?.permission ?? config.agent?.["implement-this"]?.permission ?? {};
    assert.ok(!("agent_manager" in perm) || (perm as any)["agent_manager"] === "deny", "Agent Manager must be absent or denied");
  });
  test("leaf tombstones retired wave and delivery invariants without reuse", () => {
    const leaf = read("docs/leaves/review-this.md");
    assert.ok(leaf.includes("Retired by ADR-0031"));
    assert.ok(leaf.includes("Retired by ADR-0033"));
  });
});

describe("review policy (INV-16, INV-17, INV-18)", () => {
  test("REVIEW.md is optional project guidance without bootstrap or cloud", () => {
    const policy = read("REVIEW.md");
    assert.equal(policy.includes("cloud review"), false);
    assert.equal(policy.includes("Review policy bootstrap"), false);
    assert.ok(policy.includes("optional project guidance"));
    assert.ok(policy.includes("npm run verify"));
    const skill = read("skills/review-this/SKILL.md");
    assert.ok(skill.includes("REVIEW.md` is optional"));
    assert.ok(skill.includes("effectivePolicyRevision"));
  });
});
