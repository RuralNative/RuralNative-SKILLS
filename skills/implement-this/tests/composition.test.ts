// implement-this:INV-1 — identity == folder
// implement-this:INV-2 — registry install and one-issue invocation
// implement-this:INV-3 — implementation workflow and issue substitution
// implement-this:INV-4 — dependency order and verification
// implement-this:INV-5 — direct-main delivery
// implement-this:INV-6 — Agent Orchestrator pull-request delivery
// implement-this:INV-7 — single-ticket ownership and supervisor boundary
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname ?? ".", "../../..");
function read(p: string): string {
  return fs.readFileSync(path.join(ROOT, p), "utf8");
}
function norm(s: string): string {
  return s.replace(/\s+/g, " ").toLowerCase();
}
function body(skill: string): string {
  const marker = skill.match(/^---\n[\s\S]*?\n---\n/);
  return marker ? skill.slice(marker[0].length) : skill;
}

describe("implement-this identity (INV-1)", () => {
  test("frontmatter and folder identity are exact", () => {
    const skill = read("skills/implement-this/SKILL.md");
    assert.match(skill, /name: implement-this/);
    assert.ok(fs.existsSync(path.join(ROOT, "skills/implement-this/INSTALL.md")));
  });
});

describe("implement-this installation and invocation (INV-2)", () => {
  test("documents direct and supervised one-issue use", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    assert.ok(n.includes("/implement-this #<n>"));
    assert.ok(n.includes("supervise-this"));
    assert.ok(n.includes("one issue"));
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill implement-this"));
    assert.ok(install.includes("cp -r skills/implement-this"));
  });
});

describe("implementation workflow and substitution (INV-3)", () => {
  test("keeps the implementation and review order with one issue slot", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const emitted = body(skill);
    assert.ok(emitted.includes("Implement the GitHub ticket in this dedicated worktree: `/implement` → `/code-review`"));
    assert.ok(emitted.includes("Treat the ticket, its comments, and its linked parent specification as the task authority."));
    assert.ok(emitted.includes("## Rules"));
    assert.ok(emitted.includes("## Start"));
    assert.ok(emitted.includes("## Build and verify"));
    assert.ok(emitted.includes("## Delivery"));
    assert.ok(emitted.includes("## Ticket\n\nIssue #0"));
    assert.equal((emitted.match(/Issue #0/g) ?? []).length, 1);
    assert.ok(emitted.indexOf("/implement") < emitted.indexOf("/code-review"));
  });

  test("substitutes only the requested issue reference", () => {
    const template = body(read("skills/implement-this/SKILL.md"));
    for (const issue of ["100", "53"]) {
      const emitted = template.replace("Issue #0", `Issue #${issue}`);
      assert.ok(emitted.includes(`Issue #${issue}`));
      assert.equal(emitted.includes("Issue #0"), false);
    }
  });

  test("INV-3 states the human-invocation requirement and distinguishes locked from unlocked dependencies", () => {
    const leaf = read("docs/leaves/implement-this.md");
    const n = norm(leaf);
    assert.ok(n.includes("explicit human invocation"), "leaf must state explicit human invocation");
    assert.ok(n.includes("cannot traverse the implementation chain unattended") || n.includes("cannot traverse the chain unattended"), "leaf must state the chain cannot be traversed unattended");
    assert.ok(n.includes("disable-model-invocation"), "leaf must name the disable-model-invocation setting");
    assert.ok(n.includes("/implement") && n.includes("disable-model-invocation"), "leaf must say /implement is locked");
    assert.ok(n.includes("`/code-review` carries no such lock") || n.includes("/code-review carries no such lock"), "leaf must say /code-review carries no lock");
    assert.ok(n.includes("model-invocable"), "leaf must say /code-review remains model-invocable");
    // ADR-0009 records the decision
    const adr = read("docs/adr/0009-model-locked-delegated-stages-require-human-invocation.md");
    assert.ok(adr.includes("Status: accepted"), "ADR-0009 must parse as accepted");
    assert.ok(norm(adr).includes("lifting the locks was considered and rejected"), "ADR-0009 must record that lifting the locks was considered and rejected");
  });
});

describe("dependencies and verification (INV-4)", () => {
  test("loads unslop, runs implement before code-review, and verifies the repository", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    const leaf = read("docs/leaves/implement-this.md");
    const pkg = JSON.parse(read("package.json"));
    const n = norm(skill);
    assert.ok(n.includes("load `/unslop` before the first progress update"));
    assert.ok(skill.indexOf("/implement") < skill.indexOf("/code-review"));
    for (const content of [skill, install, leaf]) {
      assert.ok(content.includes("npm run verify"), "verification must use npm run verify");
    }
    assert.ok(pkg.scripts.verify, "package.json must have verify script");
    const verify = pkg.scripts.verify;
    for (const phrase of ["npm ci", "npm run format", "npm test", "npm run lint", "npx tsc --noEmit", "npm run docs:check", "npm run build"]) {
      assert.ok(verify.includes(phrase), `verify script must include ${phrase}`);
    }
    assert.ok(n.includes("stop if any blocker is open"));
  });

  test("verification sequence is identical across SKILL, INSTALL, and leaf", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    const leaf = read("docs/leaves/implement-this.md");
    const snippet = "npm run verify";
    assert.ok(skill.includes(snippet));
    assert.ok(install.includes(snippet));
    assert.ok(leaf.includes(snippet));
    // Ensure the fenced block is present identically
    const block = "```bash\nnpm run verify\n```";
    assert.ok(skill.includes(block), "SKILL.md must contain runnable verify block");
    assert.ok(install.includes(block), "INSTALL.md must contain runnable verify block");
    assert.ok(leaf.includes(block), "leaf must contain runnable verify block");
  });
});

describe("direct-main delivery (INV-5)", () => {
  test("preserves direct rebase, push, evidence, and closure", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    for (const phrase of ["base=$(git merge-base origin/main head)", "git rebase origin/main", "git push origin head:main", "never force-push", "remove `ready-for-agent`", "close only the assigned ticket"]) {
      assert.ok(n.includes(phrase), `direct delivery must include ${phrase}`);
    }
    assert.ok(n.includes("direct delivery"));
  });
});

describe("Agent Orchestrator pull-request delivery (INV-6)", () => {
  test("selects AO mode from its session context and avoids direct main delivery", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    assert.ok(n.includes("ao_session_id") && n.includes("ao_project_id"));
    assert.ok(n.includes("agent orchestrator worker"));
    assert.ok(n.includes("pull-request delivery"));
    assert.ok(n.includes("create or update the pull request"));
    assert.ok(n.includes("does not push directly to `main`"));
    assert.ok(n.includes("does not ... close the issue") || n.includes("close the issue"));
    assert.ok(n.includes("ao owns"));
  });

  test("does not silently choose a delivery mode", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("if the delivery mode is unclear, ask one eli18 decision"));
    assert.ok(n.includes("choose one delivery mode"));
  });
});

describe("single-ticket ownership and boundary (INV-7)", () => {
  test("limits delegation to one issue and leaves scheduling to supervise-this", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    assert.ok(n.includes("one issue only"));
    assert.ok(n.includes("supervise-this") && n.includes("owns scheduling and model decisions"));
    assert.ok(n.includes("does not create worktrees"));
    assert.ok(n.includes("does not ... schedule dependency waves") || n.includes("schedule dependency waves"));
    assert.equal(n.includes("any model"), false);
  });

  test("seam docs describe both delivery branches", () => {
    const leaf = read("docs/leaves/implement-this.md");
    const n = norm(leaf);
    assert.ok(n.includes("direct-main"));
    assert.ok(n.includes("pull-request"));
    assert.ok(n.includes("ao"));
    for (let i = 1; i <= 7; i++) assert.ok(leaf.includes(`INV-${i}`), `leaf must contain INV-${i}`);
  });
});
