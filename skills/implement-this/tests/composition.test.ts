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
function bodyAfterFrontmatter(skill: string): string {
  const parts = skill.split("---");
  // frontmatter is between first two ---; body is after second ---
  if (parts.length >= 3) {
    return parts.slice(2).join("---");
  }
  return skill;
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
    assert.ok(n.includes("user-invoked") || n.includes("user invoked") || n.includes("user invocation") || n.includes("user invokes"));
    assert.ok(n.includes("explicit"));
  });

  test("frontmatter description delegates to /implement, /code-review, /unslop", () => {
    const skill = read("skills/implement-this/SKILL.md");
    // frontmatter is first block
    const front = skill.split("---")[1] ?? "";
    assert.ok(front.includes("/implement"));
    assert.ok(front.includes("/code-review"));
    assert.ok(front.includes("/unslop"));
  });

  test("registry-lane install guidance present with exact command and discovery example", () => {
    const install = read("skills/implement-this/INSTALL.md");
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill implement-this"));
    assert.ok(install.includes("cp -r skills/implement-this"));
    assert.ok(install.includes("/implement-this #100") || install.includes("/implement-this #<n>"));
    // SKILL.md body uses Issue #0 placeholder; INSTALL verifies registry lane
    const skill = read("skills/implement-this/SKILL.md");
    assert.ok(skill.includes("Issue #0"));
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
  test("preserves exact implementation prefix — worktree, authority, six Rules bullets, Start, Build, Review, Ticket", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const body = bodyAfterFrontmatter(skill);
    // worktree line
    assert.ok(body.includes("Implement the GitHub ticket in this dedicated worktree: `/implement` → `/code-review`"));
    // authority line
    assert.ok(body.includes("Treat the ticket, its comments, and its linked parent specification as the task authority."));
    assert.ok(body.includes("Do not assume access to earlier sessions."));
    // Rules header and six bullets
    assert.ok(body.includes("## Rules"));
    assert.ok(body.includes("Load `/unslop` before the first progress update. Apply it throughout the session"));
    assert.ok(body.includes("Before every edit, reread the current target region from this worktree."));
    assert.ok(body.includes("Maintain a concise To-Do List covering Start, Build, Verify, Review, and Deliver."));
    assert.ok(body.includes("Use ELI18 language for questions, decisions, and the final summary."));
    assert.ok(body.includes("Follow `AGENTS.md` and `docs/agents/issue-tracker.md`."));
    assert.ok(body.includes("Work only on the ticket below."));
    // count six bullets under Rules
    const rulesBullets = (body.match(/^- Load `\/unslop`/m) ? 1 : 0) + (body.match(/^- Before every edit/m) ? 1 : 0) + (body.match(/^- Maintain a concise To-Do List/m) ? 1 : 0) + (body.match(/^- Use ELI18 language/m) ? 1 : 0) + (body.match(/^- Follow `AGENTS\.md`/m) ? 1 : 0) + (body.match(/^- Work only on the ticket below\./m) ? 1 : 0);
    assert.equal(rulesBullets, 6, "six Rules bullets must be present");
    // Start section
    assert.ok(body.includes("## Start"));
    assert.ok(body.includes("git branch --show-current"));
    assert.ok(body.includes("git status --short"));
    assert.ok(body.includes("export PATH=\"$HOME/.nvm/versions/node/v24.18.0/bin:$PATH\""));
    assert.ok(body.includes("git fetch origin"));
    assert.ok(body.includes("gh issue edit <n> --add-assignee @me"));
    assert.ok(body.includes("npm ci"));
    // Build and verify
    assert.ok(body.includes("## Build and verify"));
    assert.ok(body.includes("Run `/implement`."));
    assert.ok(body.includes("Keep tests co-located as `*.test.ts`."));
    assert.ok(body.includes("Put scratch files in `/tmp/kilo`."));
    assert.ok(body.includes("npm run format &&"));
    assert.ok(body.includes("npm test &&"));
    assert.ok(body.includes("npm run lint &&"));
    assert.ok(body.includes("npx tsc --noEmit &&"));
    assert.ok(body.includes("npm run docs:check &&"));
    assert.ok(body.includes("npm run build"));
    assert.ok(body.includes("Commit the verified work on the feature branch. Include the issue number in the commit message."));
    // Review & Deliver
    assert.ok(body.includes("## Review & Deliver"));
    assert.ok(body.includes("BASE=$(git merge-base origin/main HEAD)"));
    assert.ok(body.includes("Pass `$BASE` as the fixed point to `/code-review`"));
    assert.ok(body.includes("git rebase origin/main"));
    assert.ok(body.includes("git push origin HEAD:main"));
    assert.ok(body.includes("Never force-push."));
    assert.ok(body.includes("comment with evidence for each acceptance criterion"));
    assert.ok(body.includes("remove `ready-for-agent`"));
    assert.ok(body.includes("close only the assigned ticket"));
    assert.ok(body.includes("Finish with an ELI18 \"Why, What, Where, and How summary\""));
    // Ticket slot
    assert.ok(body.includes("## Ticket"));
    assert.ok(body.includes("Issue #0"));
    assert.ok(!body.includes("## Task:"), "implement-this must not contain planning placeholder ## Task:");
  });

  test("body contains Issue #0 exactly once and no wrapper phrases", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const body = bodyAfterFrontmatter(skill);
    const issueMatches = body.match(/Issue #0/g) ?? [];
    assert.equal(issueMatches.length, 1, "body must contain Issue #0 exactly once");
    // total file has Issue #0 in frontmatter + body = 2
    const totalMatches = (skill.match(/Issue #0/g) ?? []).length;
    assert.ok(totalMatches >= 1, "file must contain Issue #0");
    // wrapper phrases must be absent from body and file
    assert.equal(skill.includes("Rules preserved"), false, "must not contain Rules preserved");
    assert.equal(skill.includes("## Installation"), false, "must not contain ## Installation");
    assert.equal(skill.includes("## Boundary"), false, "must not contain ## Boundary");
    assert.equal(skill.includes("--- start of supplied"), false, "must not contain start marker");
    assert.equal(skill.includes("This skill is a thin fixed-template adapter"), false, "must not contain wrapper adapter phrase");
    assert.equal(skill.includes("# implement-this —"), false, "must not contain title header");
    assert.equal(skill.includes("## Invocation"), false, "must not contain Invocation header");
    assert.equal(skill.includes("## Hard dependencies"), false, "must not contain Hard dependencies header");
  });

  test("line-count bound enforces trimmed shape", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const lines = skill.split("\n").length;
    // trimmed file is 83 lines; wrapper was 144. Bound catches leak.
    assert.ok(lines < 100, `line count ${lines} must be < 100 (trimmed shape)`);
    assert.ok(lines > 60, `line count ${lines} must be > 60 (not truncated)`);
  });

  test("substitution: /implement-this 100 emits Issue #100 and #53 emits Issue #53", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const body = bodyAfterFrontmatter(skill);
    function substitute(input: string): string {
      const normalized = input.replace(/^#/, "");
      return body.replace("Issue #0", `Issue #${normalized}`);
    }
    const out100 = substitute("100");
    assert.ok(out100.includes("Issue #100"), "100 must become Issue #100");
    assert.equal(out100.includes("Issue #0"), false, "placeholder must be replaced for 100");
    const out100Hash = substitute("#100");
    assert.ok(out100Hash.includes("Issue #100"), "#100 must become Issue #100");
    const out53 = substitute("53");
    assert.ok(out53.includes("Issue #53"), "53 must become Issue #53");
    const out53Hash = substitute("#53");
    assert.ok(out53Hash.includes("Issue #53"), "#53 must become Issue #53");
    // ensure other content unchanged except Issue reference
    assert.ok(out100.includes("Implement the GitHub ticket in this dedicated worktree"));
  });

  test("preserves exact protected identifiers and does not add extra runtime machinery", () => {
    const skill = read("skills/implement-this/SKILL.md");
    assert.ok(skill.includes("`ready-for-agent`"));
    assert.ok(skill.includes("`AGENTS.md`"));
    assert.ok(skill.includes("`docs/agents/issue-tracker.md`"));
    assert.ok(skill.includes("Issue #0"));
    assert.ok(skill.includes("/tmp/kilo"));
    assert.ok(skill.includes("*.test.ts"));
    // no extra machinery on disk
    const files = fs.readdirSync(path.join(ROOT, "skills/implement-this"));
    assert.ok(!files.includes("scripts"));
    assert.ok(!fs.existsSync(path.join(ROOT, "skills/implement-this/package.json")));
    assert.ok(!fs.existsSync(path.join(ROOT, ".kilo/command/implement-this.md")));
    assert.ok(!fs.existsSync(path.join(ROOT, "skills/implement-this/scripts")));
  });
});

describe("implement-this hard dependencies and workflow order (implement-this:INV-4)", () => {
  test("declares /unslop as hard dependency before first progress and workflow order", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const body = bodyAfterFrontmatter(skill);
    const n = norm(body);
    assert.ok(n.includes("/unslop"));
    assert.ok(n.includes("before the first progress update"));
    assert.ok(skill.includes("/implement"));
    assert.ok(skill.includes("/code-review"));
    const idxImpl = body.indexOf("/implement");
    const idxReview = body.indexOf("/code-review");
    assert.ok(idxImpl !== -1 && idxReview !== -1);
    assert.ok(idxImpl < idxReview, "workflow must be /implement followed by /code-review");
    assert.ok(body.includes("/implement") && body.includes("/code-review") && body.includes("/unslop"));
  });

  test("does not depend on grill-with-docs for implementation", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const body = bodyAfterFrontmatter(skill);
    const n = norm(body);
    assert.equal(n.includes("grill-with-docs"), false, "implement-this body must not mention grill-with-docs");
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
    const body = bodyAfterFrontmatter(skill);
    const n = norm(body);
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
    assert.ok(n.includes("user-invoked") || n.includes("user invoked") || n.includes("user invocation") || n.includes("user invokes"));
    assert.ok(skill.includes("/implement-this #<n>"));
    assert.equal(n.includes("when implementation work appears"), false);
  });
});
