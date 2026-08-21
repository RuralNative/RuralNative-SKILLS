// implement-this:INV-1 — identity == folder
// implement-this:INV-2 — registry install and one-issue invocation
// implement-this:INV-3 — implementation workflow and issue substitution
// implement-this:INV-4 — dependency order and verification
// implement-this:INV-5 — direct-main delivery
// implement-this:INV-6 — manager-worktree pull-request delivery
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
  test("documents direct and manager-worktree one-issue use", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    assert.ok(n.includes("/implement-this #<n>"));
    assert.equal(n.includes("supervise-this"), false, "must not name the retired coordinator");
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

  test("distinguishes locked dependency (/implement) from unlocked (/code-review, /unslop) and states human-invocation requirement", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const leaf = read("docs/leaves/implement-this.md");
    const nSkill = norm(skill);
    // Extract INV-3 block and scope assertions to the amended invariant text
    const inv3Match = leaf.match(/3\. \*\*INV-3\*\*[\s\S]*?(?=\n4\. \*\*INV-4\*\*|\n## )/);
    assert.ok(inv3Match, "leaf must contain INV-3");
    const nInv3 = norm(inv3Match[0]);
    // body states the human-invocation requirement (skill body is the workflow, whole body is the invariant)
    assert.ok(nSkill.includes("explicit human invocation"), "body must state explicit human invocation");
    assert.ok(nSkill.includes("cannot traverse the chain unattended"), "body must state agent cannot traverse unattended");
    // body names the locked skill
    assert.ok(nSkill.includes("/implement"), "body must name locked skill /implement");
    // body names the unlocked skills
    assert.ok(nSkill.includes("/code-review") && nSkill.includes("model-invocable"), "body must state /code-review remains model-invocable");
    assert.ok(nSkill.includes("/unslop") && nSkill.includes("model-invocable"), "body must state /unslop remains model-invocable");
    // INV-3 itself must state the classification (scoped, not whole-leaf)
    assert.ok(nInv3.includes("disable-model-invocation"), "INV-3 must reference disable-model-invocation");
    assert.ok(nInv3.includes("explicit human invocation"), "INV-3 must state explicit human invocation");
    assert.ok(nInv3.includes("cannot traverse the chain unattended"), "INV-3 must state agent cannot traverse unattended");
    assert.ok(nInv3.includes("model-invocable"), "INV-3 must name model-invocable skills");
    assert.ok(nInv3.includes("/implement") && nInv3.includes("/code-review"), "INV-3 must name both /implement and /code-review");
    assert.ok(nInv3.includes("/implement") && nInv3.includes("disable-model-invocation"), "INV-3 must flag /implement as locked");
    assert.ok(nInv3.includes("/code-review") && nInv3.includes("no such lock"), "INV-3 must distinguish /code-review as model-invocable with no such lock");
    // ADR-0009 exists and records the decision
    const adr = read("docs/adr/0009-delegation-invariants-human-invocation.md");
    assert.ok(adr.includes("Status: accepted"), "ADR-0009 must be accepted");
    assert.ok(adr.includes("disable-model-invocation"), "ADR-0009 must reference disable-model-invocation");
    assert.ok(adr.includes("rejected") && adr.includes("removing"), "ADR-0009 must state removing locks was rejected");
  });
});

describe("dependencies and verification (INV-4)", () => {
  test("loads unslop, runs implement before code-review, and verifies the repository", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    const leaf = read("docs/leaves/implement-this.md");
    const pkg = JSON.parse(read("package.json"));
    const n = norm(skill);
    assert.ok(n.includes("load `/unslopify` before the first progress update"));
    assert.ok(skill.indexOf("/implement") < skill.indexOf("/code-review"));
    for (const content of [skill, install, leaf]) {
      assert.ok(content.includes("npm run verify"), "verification must use npm run verify");
    }
    assert.ok(pkg.scripts.verify, "package.json must have verify script");
    const verify = pkg.scripts.verify;
    for (const phrase of ["npm ci", "npm run format", "npm test", "npm run lint", "npx tsc --noEmit", "npm run docs:check", "npm run build"]) {
      assert.ok(verify.includes(phrase), `verify script must include ${phrase}`);
    }
    assert.ok(n.includes("stop") && n.includes("blocker"));
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

describe("manager-worktree pull-request delivery (INV-6)", () => {
  test("selects manager mode by worktree path and avoids direct main delivery", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    assert.ok(n.includes("manager-worktree"), "must name manager-worktree delivery");
    assert.ok(n.includes("agent manager worktree location"), "must name the manager worktree location");
    assert.ok(n.includes("worktree root sits under"), "must detect by worktree root path");
    assert.ok(n.includes("pull-request delivery"), "must name pull-request delivery");
    assert.ok(n.includes("create or update the pull request"), "must create or update the pull request");
    assert.ok(n.includes("push the feature branch"), "must push the feature branch");
    assert.ok(n.includes("never push directly to `main`"), "must not push directly to main");
    assert.ok(n.includes("never close the ticket before merge"), "must not close before merge");
    assert.ok(n.includes("ready-for-human"), "must add ready-for-human");
    assert.ok(n.includes("remove `ready-for-agent`, and add `ready-for-human`"), "must swap ready-for-agent for ready-for-human in the manager branch");
    assert.ok(n.includes("closes #<n>"), "must put the closing reference in the PR body");
  });

  test("does not silently choose a delivery mode", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("if the delivery mode is unclear, ask one eli18 decision"), "must ask when unclear");
    assert.ok(n.includes("choose the delivery mode"), "must choose a delivery mode");
  });
});

describe("native dependency state (INV-8)", () => {
  test("reads native dependency state before claiming and stops while open blocker exists", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const leaf = read("docs/leaves/implement-this.md");
    const nSkill = norm(skill);
    const nLeaf = norm(leaf);
    assert.ok(nSkill.includes("native") && (nSkill.includes("dependency") || nSkill.includes("blocked")), "skill must mention native dependency");
    assert.ok(nSkill.includes("stop") && nSkill.includes("blocker"), "skill must stop while blocker open");
    assert.ok(nLeaf.includes("native") && nLeaf.includes("canonical"), "leaf must state native is canonical");
    assert.ok(nLeaf.includes("fallback") || nLeaf.includes("human-readable"), "leaf must mention fallback");
  });
  test("after closure recomputes frontier and updates only newly unblocked dependents with label transitions", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const leaf = read("docs/leaves/implement-this.md");
    const nSkill = norm(skill);
    const nLeaf = norm(leaf);
    assert.ok(nSkill.includes("frontier") || nLeaf.includes("frontier"), "must mention dependent frontier");
    assert.ok(nLeaf.includes("unblocked") && nLeaf.includes("ready-for-agent") && nLeaf.includes("blocked"), "must describe label transitions");
    assert.ok(nLeaf.includes("only") && (nLeaf.includes("newly unblocked") || nLeaf.includes("made ready")), "must state only newly unblocked");
    assert.ok(nLeaf.includes("except") || nSkill.includes("except") || nLeaf.includes("only its assigned ticket"), "must state scope isolation");
  });
});

describe("single-ticket ownership and boundary (INV-7)", () => {
  test("limits the adapter to one issue with no scheduling ambitions", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    assert.ok(n.includes("one issue only"));
    assert.equal(n.includes("supervise-this"), false, "must not name the retired coordinator");
    assert.ok(n.includes("does not create worktrees"));
    assert.ok(n.includes("does not ... schedule dependency waves") || n.includes("schedule dependency waves"));
    assert.equal(n.includes("any model"), false);
  });

  test("seam docs describe both delivery branches", () => {
    const leaf = read("docs/leaves/implement-this.md");
    const n = norm(leaf);
    assert.ok(n.includes("direct-main"));
    assert.ok(n.includes("pull-request"));
    assert.ok(n.includes("manager"));
    for (let i = 1; i <= 7; i++) assert.ok(leaf.includes(`INV-${i}`), `leaf must contain INV-${i}`);
  });
});

describe("implement-this unslopify and focused doc-cache (Phase 1 red)", () => {
  test("names unslopify and no longer requires unslop", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("/unslopify"), "must name /unslopify");
    assert.ok(n.includes("unslopify"), "must name unslopify dependency");
    assert.ok(n.includes("load `/unslopify`"), "must load /unslopify before the first progress update");
  });

  test("applies unslopify preservation, protected-content, and completion-report contract", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("protected-content") || n.includes("protected content"), "must name protected-content contract");
    assert.ok(n.includes("preservation"), "must name preservation contract");
    assert.ok(n.includes("completion report"), "must require completion report");
    assert.ok(n.includes("scope"), "must name scope contract");
  });

  test("requires focused orientation route AGENTS, ARCHITECTURE, seam leaf, CONTEXT, ADRs", () => {
    const skill = read("skills/implement-this/SKILL.md");
    assert.ok(skill.includes("AGENTS.md"), "must require AGENTS.md");
    assert.ok(skill.includes("ARCHITECTURE.md"), "must require ARCHITECTURE.md");
    assert.ok(skill.includes("CONTEXT.md"), "must require CONTEXT.md");
    assert.ok(skill.includes("docs/leaves/") || norm(skill).includes("seam leaf"), "must require affected seam leaf doc");
    assert.ok(norm(skill).includes("adr"), "must require relevant ADRs");
  });

  test("does not require broad preload or derived human docs", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("does not require") || n.includes("do not preload") || n.includes("focused"), "must state focused loading / no broad preload");
    assert.ok(skill.includes("document-for-humans") || n.includes("human docs") || n.includes("derived human"), "must exclude derived human docs");
    assert.equal(n.includes("preload all docs") || n.includes("read all documentation"), false, "must not require broad preload");
  });
});
