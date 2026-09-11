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
  test("same-session continuation preserves human authorization without trusting handoffs (INV-3)", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const continuation = skill.split("## Same-session continuation\n")[1]?.split("## Rules")[0];
    assert.ok(continuation, "define continuation separately from a new invocation");
    assert.match(continuation, /original human message/);
    assert.match(continuation, /compaction.*background-task completion/);
    assert.match(continuation, /current session's original human messages/);
    assert.match(continuation, /MISSING_TICKET_AUTHORIZATION/);
    assert.match(continuation, /summary, handoff document, or task report.*not authorization/);
    assert.match(continuation, /fresh session requires its own explicit human instruction/);
    assert.match(continuation, /pause, stop, status-only, or handoff-only/);
    assert.match(continuation, /clean-checkout gate is an entry check/);
    assert.match(continuation, /unknown or conflicting changes stop/);
  });
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
  test("config carries no Agent Manager authority", () => {
    const config = JSON.parse(read(".kilo/kilo.jsonc"));
    const perm = (config as any).agent?.["review-this"]?.permission ?? {};
    assert.ok(!("agent_manager" in perm) || (perm as any)["agent_manager"] === "deny", "Agent Manager must be absent or denied");
  });
});

describe("evidence and verification (INV-13, INV-15, INV-16)", () => {
  test("intake distinguishes ticket dependencies from specification children (INV-8)", () => {
    const validate = read("skills/implement-this/SKILL.md").split("## Validate\n")[1].split("## Build and verify")[0];
    assert.match(validate, /Read the ticket's native parent relationship/);
    assert.match(validate, /`blocked-by` operation against the ticket number/);
    assert.match(validate, /Do not query the ticket's sub-issues/);
    assert.match(validate, /`sub-issues` operation against the parent specification number/);
    assert.match(validate, /not an intake prerequisite/);
    assert.match(validate, /unavailable, forbidden, malformed, or partial reads stop/);
  });
  test("compact evidence lives in the PR body with no full gate", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("focused"), "focused proof");
    assert.ok(n.includes("pull request body"), "PR-body evidence");
    assert.ok(n.includes("never") && n.includes("full repository gate"), "no full gate");
  });
  test("self-contained delivery with no /implement delegation (INV-3, INV-4)", () => {
    const skill = read("skills/implement-this/SKILL.md");
    assert.equal(skill.includes("Run `/implement`"), false, "no delegated /implement run");
    assert.equal(skill.includes("`/implement` requires"), false, "no /implement dependency");
    assert.equal(skill.includes("/code-review"), false, "no mandatory code review");
    assert.ok(skill.includes("Implement directly"), "inline implementation guidance");
    assert.ok(skill.includes("composePullRequestBody"), "atomic PR body composition");
    assert.ok(skill.includes("decideDeliveryCompletion"), "read-back completion");
  });
  test("leaf tombstones retired worker invariants without reuse", () => {
    const leaf = read("docs/leaves/implement-this.md");
    assert.ok(leaf.includes("Retired by ADR-0031"));
    assert.ok(leaf.includes("INV-6"));
    assert.ok(leaf.includes("INV-7"));
  });
});
