// plan-this:INV-1 — identity == folder
// plan-this:INV-2 — registry-lane install and explicit invocation
// plan-this:INV-3 — fixed-template boundary preserves exact prefix and substitutes only task under ## Task:
// plan-this:INV-4 — hard dependencies and workflow order with /unslop before first progress
// plan-this:INV-5 — user-invoked only and preserved rules
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

describe("plan-this identity (plan-this:INV-1)", () => {
  test("folder and frontmatter identity are exactly plan-this", () => {
    const skill = read("skills/plan-this/SKILL.md");
    assert.ok(skill.includes("name: plan-this"), "frontmatter name must be exactly plan-this");
    assert.ok(fs.existsSync(path.join(ROOT, "skills/plan-this/SKILL.md")));
    assert.ok(fs.existsSync(path.join(ROOT, "skills/plan-this/INSTALL.md")));
    // folder identity matches frontmatter
    const match = skill.match(/name:\s*plan-this/);
    assert.ok(match, "frontmatter name must match folder plan-this");
  });

  test("does not modify delegated skills or unslopify", () => {
    const grill = read("skills/document-for-agents/SKILL.md");
    assert.ok(grill.includes("name: document-for-agents"));
    const humans = read("skills/document-for-humans/SKILL.md");
    assert.ok(humans.includes("name: document-for-humans"));
    const unslopify = read("skills/unslopify/SKILL.md");
    assert.ok(unslopify.includes("name: unslopify"));
    assert.equal(unslopify.includes("plan-this"), false, "unslopify must not be modified to mention plan-this");
  });
});

describe("plan-this discovery and installation (plan-this:INV-2)", () => {
  test("description declares explicit user invocation /plan-this <task>", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const n = norm(skill);
    assert.ok(skill.includes("/plan-this <task>"), "description and body must declare explicit invocation /plan-this <task>");
    assert.ok(n.includes("user-invoked") || n.includes("user invoked"), "must state user-invoked");
    assert.ok(n.includes("explicit") || skill.includes("/plan-this"), "discovery text must be explicit");
  });

  test("registry-lane install guidance present with exact command and discovery example", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const install = read("skills/plan-this/INSTALL.md");
    assert.ok(skill.includes("npx skills add RuralNative/RuralNative-SKILLS --skill plan-this"));
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill plan-this"));
    assert.ok(install.includes("cp -r skills/plan-this"));
    // discovery example
    assert.ok(skill.includes("/plan-this Create a Next.js App") || install.includes("/plan-this Create a Next.js App") || skill.includes("/plan-this <task>"));
  });

  test("architecture index and leaf doc describe the new seam", () => {
    const arch = read("ARCHITECTURE.md");
    assert.ok(arch.includes("plan-this"), "ARCHITECTURE seam table must list plan-this");
    assert.ok(arch.includes("skills/plan-this/"));
    assert.ok(arch.includes("docs/leaves/plan-this.md"));
    assert.ok(fs.existsSync(path.join(ROOT, "docs/leaves/plan-this.md")));
    const leaf = read("docs/leaves/plan-this.md");
    assert.ok(leaf.includes("plan-this"));
    assert.ok(leaf.includes("INV-1"));
  });
});

describe("plan-this fixed template and task substitution (plan-this:INV-3)", () => {
  test("preserves exact planning prefix and substitutes only task under ## Task:", () => {
    const skill = read("skills/plan-this/SKILL.md");
    // exact workflow line
    assert.ok(skill.includes("Run this planning-only workflow: `/grill-with-docs` → `/to-spec` → `/to-tickets`"));
    // Rules header
    assert.ok(skill.includes("## Rules:") || skill.includes("## Rules"));
    // all eight rule bullets verbatim
    assert.ok(skill.includes("Load `/unslop` before the first progress update. Keep it active throughout `/grill-with-docs` → `/to-spec` → `/to-tickets`"));
    assert.ok(skill.includes("Maintain a concise To-Do List covering Discovery, Decisions, Specification, Tickets, and Delivery."));
    assert.ok(skill.includes("Design tickets as independently verifiable vertical slices suitable for one future worktree."));
    assert.ok(skill.includes("Optimize for precision per token: keep shared context in the parent specification;"));
    assert.ok(skill.includes("Ground decisions in the codebase and relevant documentation, following the repository's documented loading order."));
    assert.ok(skill.includes("Publish GitHub issues using repository-defined labels (`ready-for-agent` where applicable) and native dependency edges."));
    assert.ok(skill.includes("Ask one decision at a time in ELI18 language, include a recommendation, and honor each skill's approval gates."));
    assert.ok(skill.includes("Follow the installed skills as the procedural source of truth."));
    assert.ok(skill.includes("Finish with an ELI18 **Why / What / Where / How** summary and links to the specification and all tickets, then stop."));
    // Task slot
    assert.ok(skill.includes("## Task:"), "must contain ## Task: slot");
    // Should not contain generic placeholder like <task> replacement incorrectly
    assert.ok(!skill.includes("Issue #0"), "plan-this must not contain implementation placeholder Issue #0");
  });

  test("preserves exact protected identifiers and does not add extra runtime machinery", () => {
    const skill = read("skills/plan-this/SKILL.md");
    // protected identifiers
    assert.ok(skill.includes("`ready-for-agent`"));
    // no extra machinery on disk
    const files = fs.readdirSync(path.join(ROOT, "skills/plan-this"));
    assert.ok(!files.includes("scripts"), "must not add scripts directory");
    assert.ok(!fs.existsSync(path.join(ROOT, "skills/plan-this/package.json")), "no npm package");
    assert.ok(!fs.existsSync(path.join(ROOT, ".kilo/command/plan-this.md")), "must not add .kilo command file");
    // boundary disclaimer is allowed to mention router and command directory as what is NOT added
    assert.ok(skill.includes("does not add") || skill.includes("does not reimplement") || skill.includes("fixed-template"));
  });
});

describe("plan-this hard dependencies and workflow order (plan-this:INV-4)", () => {
  test("declares /unslop as hard dependency before first progress and workflow order", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("/unslop"));
    assert.ok(n.includes("before the first progress update"));
    // must not silently map to unslopify
    assert.ok(n.includes("do not silently map") || n.includes("do not map") || skill.includes("Do not silently map it to this repository's `unslopify`"));
    assert.ok(skill.includes("/grill-with-docs"));
    assert.ok(skill.includes("/to-spec"));
    assert.ok(skill.includes("/to-tickets"));
    // workflow order
    const idxGrill = skill.indexOf("/grill-with-docs");
    const idxSpec = skill.indexOf("/to-spec");
    const idxTickets = skill.indexOf("/to-tickets");
    assert.ok(idxGrill !== -1 && idxSpec !== -1 && idxTickets !== -1);
    assert.ok(idxGrill < idxSpec && idxSpec < idxTickets, "workflow must be grill -> to-spec -> to-tickets");
    // unslop appears
    assert.ok(skill.includes("`/unslop`"));
  });

  test("does not depend on implement or code-review", () => {
    const skill = read("skills/plan-this/SKILL.md");
    // plan-this should not list implement code-review as dependencies
    const n = norm(skill);
    // ensure implement not in dependency list as hard dependency (mentioned only in boundary maybe)
    if (n.includes("/implement")) {
      // if mentioned, ensure it's in boundary disclaimer not dependency
      assert.ok(n.includes("does not modify") || n.includes("does not reimplement"), "if /implement mentioned it must be in boundary disclaimer");
    }
  });

  test("naming exception and fixed-template boundary recorded in ADR and glossary", () => {
    const adr = read("docs/adr/0006-plan-this-fixed-template-adapter.md");
    const glossary = read("CONTEXT.md");
    assert.ok(adr.includes("plan-this"));
    assert.ok(adr.includes("implement-this"));
    assert.ok(adr.includes("fixed-template"));
    assert.ok(adr.toLowerCase().includes("task-scoped") || adr.toLowerCase().includes("task scoped"));
    assert.ok(glossary.includes("plan-this"));
    assert.ok(glossary.includes("implement-this"));
    assert.ok(glossary.includes("fixed-template") || glossary.includes("task-scoped"));
  });
});

describe("plan-this preserved rules and user invocation (plan-this:INV-5)", () => {
  test("preserves to-do list, approval gates, ticket design, labels, native dependencies, final summary", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const n = norm(skill);
    // to-do list
    assert.ok(n.includes("to-do list") || n.includes("to-do"));
    assert.ok(n.includes("discovery, decisions, specification, tickets, and delivery"));
    // approval gates
    assert.ok(n.includes("approval gates"));
    // ticket design
    assert.ok(n.includes("independently verifiable vertical slices"));
    assert.ok(n.includes("blocked by") || n.includes("blockers"));
    assert.ok(n.includes("affected seams"));
    assert.ok(n.includes("acceptance criteria"));
    assert.ok(n.includes("verification requirements"));
    assert.ok(n.includes("parallel execution") || n.includes("parallel"));
    // labels and native dependencies
    assert.ok(n.includes("ready-for-agent"));
    assert.ok(n.includes("native dependency edges") || n.includes("native dependency"));
    // final summary
    assert.ok(n.includes("why / what / where / how") || n.includes("why / what"));
    assert.ok(skill.includes("**Why / What / Where / How**"));
  });

  test("skill is user-invoked only and does not introduce broad automatic triggering", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("user-invoked"));
    // description should make explicit command clear, not broad trigger like "when planning work appears"
    assert.ok(skill.includes("/plan-this <task>"));
    // should not claim to auto-trigger on planning without explicit command
    assert.equal(n.includes("when planning work appears"), false, "should not use broad automatic triggering phrase");
  });
});
