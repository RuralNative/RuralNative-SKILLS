// implement-this composition: single target in the current checkout (ADR-0031).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { read, norm, body } from "../../../scripts/test-helpers.ts";

const ROOT = path.resolve(import.meta.dirname ?? ".", "../../..");

describe("implement-this identity (INV-1)", () => {
  test("frontmatter and folder identity are exact", () => {
    const skill = read("skills/implement-this/SKILL.md");
    assert.match(skill, /name: implement-this/);
    assert.ok(fs.existsSync(path.join(ROOT, "skills/implement-this/INSTALL.md")));
  });
});

describe("implement-this installation and invocation (INV-2)", () => {
  test("documents the single-ticket form only", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    assert.ok(n.includes("/implement-this #<n>"), "single-ticket form");
    assert.equal(n.includes("#<n1>"), false, "no multi-ticket form");
    assert.equal(n.includes("#<spec>"), false, "no parent-specification form");
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill implement-this"));
  });
});

describe("single checkout contract (INV-6, INV-7)", () => {
  test("skill runs in the current checkout with no worker machinery", () => {
    const skill = read("skills/implement-this/SKILL.md");
    assert.ok(skill.includes("current checkout"));
    assert.ok(skill.includes("Never call Agent Manager"), "skill must prohibit Agent Manager use");
    for (const banned of ["worktree mode", "isolated worktree", "persistent worktree", "MAX_ACTIVE_WORKERS", "MAX_MANAGED_WORKERS", "nextPollDelay", "POLL_DELAY", "checkpointDue", "Agent Manager overview", "Agent Manager catalog", "planAgentManagerTasks"]) {
      assert.equal(skill.includes(banned), false, `skill must not mention ${banned}`);
    }
    assert.ok(skill.includes("## Validate"));
    assert.ok(skill.includes("## Build and verify"));
    assert.ok(skill.includes("## Delivery"));
    assert.ok(skill.includes("## Ticket\n\nIssue #0"));
  });
  test("no dispatch, setup, or timing modules remain", () => {
    for (const f of ["dispatch-packet.ts", "setup.ts", "timing.ts"]) {
      assert.equal(fs.existsSync(path.join(ROOT, "skills/implement-this", f)), false, `${f} must be removed`);
    }
  });
  test("config carries no Agent Manager permission", () => {
    const config = read(".kilo/kilo.jsonc");
    assert.equal(config.includes("agent_manager"), false);
  });
});

describe("evidence and verification (INV-13, INV-15, INV-16)", () => {
  test("compact evidence lives in the PR body with no full gate", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("focused"), "focused proof");
    assert.ok(n.includes("pull request body"), "PR-body evidence");
    assert.ok(n.includes("never") && n.includes("full repository gate"), "no full gate");
  });
  test("leaf tombstones retired worker invariants without reuse", () => {
    const leaf = read("docs/leaves/implement-this.md");
    assert.ok(leaf.includes("Retired by ADR-0031"));
    assert.ok(leaf.includes("INV-6"));
    assert.ok(leaf.includes("INV-7"));
  });
});
