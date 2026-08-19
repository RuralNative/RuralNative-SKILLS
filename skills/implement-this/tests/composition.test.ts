// implement-this:INV-1 — identity == folder
// implement-this:INV-2 — registry-lane install and explicit invocation
// implement-this:INV-3 — fixed-template boundary preserves exact prefix and substitutes only issue reference
// implement-this:INV-4 — hard dependencies and workflow order with /unslop before first progress
// implement-this:INV-5 — user-invoked only and preserved rules
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

describe("implement-this identity (implement-this:INV-1)", () => {
  test("folder and frontmatter identity are exactly implement-this", () => {
    const skill = read("skills/implement-this/SKILL.md");
    assert.ok(skill.includes("name: implement-this"));
    assert.ok(fs.existsSync(path.join(ROOT, "skills/implement-this/SKILL.md")));
    assert.ok(fs.existsSync(path.join(ROOT, "skills/implement-this/INSTALL.md")));
    const match = skill.match(/name:\s*implement-this/);
    assert.ok(match);
  });

  test("does not modify delegated skills or unslopify", () => {
    const impl = read("skills/document-for-agents/SKILL.md");
    assert.ok(impl.includes("name: document-for-agents"));
    const unslopify = read("skills/unslopify/SKILL.md");
    assert.ok(unslopify.includes("name: unslopify"));
    assert.equal(unslopify.includes("implement-this"), false);
    const plan = read("skills/plan-this/SKILL.md");
    assert.ok(plan.includes("name: plan-this"));
  });
});

describe("implement-this discovery and installation (implement-this:INV-2)", () => {
  test("description declares explicit user invocation /implement-this #<n>", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(skill.includes("/implement-this #<n>") || skill.includes("/implement-this #"));
    assert.ok(n.includes("user-invoked") || n.includes("user invoked"));
    assert.ok(n.includes("explicit"));
  });

  test("registry-lane install guidance present with exact command and discovery example", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    assert.ok(skill.includes("npx skills add RuralNative/RuralNative-SKILLS --skill implement-this"));
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill implement-this"));
    assert.ok(install.includes("cp -r skills/implement-this"));
    assert.ok(skill.includes("/implement-this #100") || install.includes("/implement-this #100"));
    assert.ok(skill.includes("Issue #100") || skill.includes("Issue #0"));
  });

  test("architecture index and leaf doc describe the new seam", () => {
    const arch = read("ARCHITECTURE.md");
    assert.ok(arch.includes("implement-this"));
    assert.ok(arch.includes("skills/implement-this/"));
    assert.ok(arch.includes("docs/leaves/implement-this.md"));
    assert.ok(fs.existsSync(path.join(ROOT, "docs/leaves/implement-this.md")));
    const leaf = read("docs/leaves/implement-this.md");
    assert.ok(leaf.includes("implement-this"));
    assert.ok(leaf.includes("INV-1"));
  });
});

describe("implement-this fixed template and issue substitution (implement-this:INV-3)", () => {
  test("preserves exact implementation prefix and substitutes only issue reference in place of Issue #0", () => {
    const skill = read("skills/implement-this/SKILL.md");
    assert.ok(skill.includes("Implement the GitHub ticket in this dedicated worktree: `/implement` → `/code-review`"));
    assert.ok(skill.includes("Treat the ticket, its comments, and its linked parent specification as the task authority."));
    // Rules header
    assert.ok(skill.includes("## Rules"));
    assert.ok(skill.includes("Load `/unslop` before the first progress update. Apply it throughout the session"));
    assert.ok(skill.includes("Before every edit, reread the current target region from this worktree."));
    assert.ok(skill.includes("Maintain a concise To-Do List covering Start, Build, Verify, Review, and Deliver."));
    assert.ok(skill.includes("Use ELI18 language for questions, decisions, and the final summary."));
    assert.ok(skill.includes("Follow `AGENTS.md` and `docs/agents/issue-tracker.md`."));
    assert.ok(skill.includes("Work only on the ticket below."));
    // Start section
    assert.ok(skill.includes("git branch --show-current"));
    assert.ok(skill.includes("git status --short"));
    assert.ok(skill.includes("export PATH=\"$HOME/.nvm/versions/node/v24.18.0/bin:$PATH\""));
    assert.ok(skill.includes("git fetch origin"));
    assert.ok(skill.includes("gh issue edit <n> --add-assignee @me"));
    assert.ok(skill.includes("npm ci"));
    // Build and verify
    assert.ok(skill.includes("Run `/implement`."));
    assert.ok(skill.includes("Keep tests co-located as `*.test.ts`."));
    assert.ok(skill.includes("Put scratch files in `/tmp/kilo`."));
    assert.ok(skill.includes("npm run format &&"));
    assert.ok(skill.includes("npm test &&"));
    assert.ok(skill.includes("npm run lint &&"));
    assert.ok(skill.includes("npx tsc --noEmit &&"));
    assert.ok(skill.includes("npm run docs:check &&"));
    assert.ok(skill.includes("npm run build"));
    assert.ok(skill.includes("Commit the verified work on the feature branch. Include the issue number in the commit message."));
    // Review & Deliver
    assert.ok(skill.includes("BASE=$(git merge-base origin/main HEAD)"));
    assert.ok(skill.includes("Pass `$BASE` as the fixed point to `/code-review`"));
    assert.ok(skill.includes("git fetch origin"));
    assert.ok(skill.includes("git rebase origin/main"));
    assert.ok(skill.includes("git push origin HEAD:main"));
    assert.ok(skill.includes("Never force-push."));
    assert.ok(skill.includes("comment with evidence for each acceptance criterion"));
    assert.ok(skill.includes("remove `ready-for-agent`"));
    assert.ok(skill.includes("close only the assigned ticket"));
    assert.ok(skill.includes("Finish with an ELI18 \"Why, What, Where, and How summary\""));
    // Ticket slot
    assert.ok(skill.includes("## Ticket"));
    assert.ok(skill.includes("Issue #0"));
    assert.ok(!skill.includes("## Task:"), "implement-this must not contain planning placeholder ## Task:");
  });

  test("preserves exact protected identifiers and does not add extra runtime machinery", () => {
    const skill = read("skills/implement-this/SKILL.md");
    assert.ok(skill.includes("`ready-for-agent`"));
    assert.ok(skill.includes("`AGENTS.md`"));
    assert.ok(skill.includes("`docs/agents/issue-tracker.md`"));
    assert.ok(skill.includes("Issue #0"));
    assert.ok(skill.includes("/tmp/kilo"));
    // no extra machinery on disk
    const files = fs.readdirSync(path.join(ROOT, "skills/implement-this"));
    assert.ok(!files.includes("scripts"));
    assert.ok(!fs.existsSync(path.join(ROOT, "skills/implement-this/package.json")));
    assert.ok(!fs.existsSync(path.join(ROOT, ".kilo/command/implement-this.md")));
    assert.ok(skill.includes("does not add") || skill.includes("fixed-template"));
  });
});

describe("implement-this hard dependencies and workflow order (implement-this:INV-4)", () => {
  test("declares /unslop as hard dependency before first progress and workflow order", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("/unslop"));
    assert.ok(n.includes("before the first progress update"));
    assert.ok(n.includes("do not silently map") || skill.includes("Do not silently map it to this repository's `unslopify`"));
    assert.ok(skill.includes("/implement"));
    assert.ok(skill.includes("/code-review"));
    const idxImpl = skill.indexOf("/implement");
    const idxReview = skill.indexOf("/code-review");
    assert.ok(idxImpl !== -1 && idxReview !== -1);
    assert.ok(idxImpl < idxReview, "workflow must be /implement followed by /code-review");
    // also check hard dependencies in order sentence
    assert.ok(skill.includes("/implement") && skill.includes("/code-review") && skill.includes("/unslop"));
  });

  test("does not depend on grill-with-docs for implementation", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    // planning dependencies should not be listed as hard dependencies for implement-this, except maybe in boundary disclaimer
    if (n.includes("grill-with-docs")) {
      assert.ok(n.includes("does not") || n.includes("boundary") || n.includes("does not modify"), "if grill mentioned it must be in boundary");
    }
  });

  test("naming exception and fixed-template boundary recorded in ADR and glossary", () => {
    const adr = read("docs/adr/0006-plan-this-fixed-template-adapter.md");
    const glossary = read("CONTEXT.md");
    assert.ok(adr.includes("implement-this"));
    assert.ok(adr.includes("plan-this"));
    assert.ok(adr.includes("fixed-template"));
    assert.ok(glossary.includes("implement-this"));
    assert.ok(glossary.includes("plan-this"));
  });
});

describe("implement-this preserved rules and user invocation (implement-this:INV-5)", () => {
  test("preserves worktree, authority, claiming, verification, docs, review, rebase, push, comment, label, closure rules", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("git branch --show-current"));
    assert.ok(n.includes("git status --short"));
    assert.ok(n.includes("work only on the ticket"));
    assert.ok(n.includes("ticket, its comments, and its linked parent specification"));
    assert.ok(n.includes("gh issue edit <n> --add-assignee @me"));
    assert.ok(n.includes("npm run format &&"));
    assert.ok(n.includes("update its leaf document in the same commit"));
    assert.ok(n.includes("keep tests co-located"));
    assert.ok(n.includes("base=$(git merge-base origin/main head)"));
    assert.ok(n.includes("git rebase origin/main"));
    assert.ok(n.includes("git push origin head:main"));
    assert.ok(n.includes("never force-push"));
    assert.ok(n.includes("comment with evidence"));
    assert.ok(n.includes("remove `ready-for-agent`") || n.includes("remove ready-for-agent"));
    assert.ok(n.includes("close only the assigned ticket"));
    assert.ok(n.includes("why, what, where, and how") || n.includes("why / what"));
  });

  test("skill is user-invoked only and does not introduce broad automatic triggering", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("user-invoked"));
    assert.ok(skill.includes("/implement-this #<n>"));
    assert.equal(n.includes("when implementation work appears"), false);
  });
});
