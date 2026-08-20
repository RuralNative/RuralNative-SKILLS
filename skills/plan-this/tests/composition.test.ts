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
function getBody(skill: string): string {
  const m = skill.match(/^---\n[\s\S]*?\n---\n/);
  if (!m) return skill;
  return skill.slice(m[0].length);
}

describe("plan-this identity (plan-this:INV-1)", () => {
  test("folder and frontmatter identity are exactly plan-this", () => {
    const skill = read("skills/plan-this/SKILL.md");
    assert.ok(skill.includes("name: plan-this"), "frontmatter name must be exactly plan-this");
    assert.ok(fs.existsSync(path.join(ROOT, "skills/plan-this/SKILL.md")));
    assert.ok(fs.existsSync(path.join(ROOT, "skills/plan-this/INSTALL.md")));
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
    assert.ok(n.includes("user-invoked") || n.includes("user invoked") || n.includes("user invocation") || n.includes("user invokes"), "must state user-invoked");
    assert.ok(n.includes("explicit") || skill.includes("/plan-this"), "discovery text must be explicit");
  });

  test("registry-lane install guidance present with exact command and discovery example", () => {
    const install = read("skills/plan-this/INSTALL.md");
    // registry lane lives in INSTALL.md, not duplicated in trimmed SKILL.md
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill plan-this"));
    assert.ok(install.includes("cp -r skills/plan-this"));
    assert.ok(install.includes("/plan-this Create a Next.js App") || install.includes("/plan-this <task>"));
    // trimmed SKILL.md should not duplicate install lane
    const skill = read("skills/plan-this/SKILL.md");
    assert.equal(skill.includes("npx skills add RuralNative/RuralNative-SKILLS --skill plan-this"), false, "trimmed SKILL.md must not duplicate install command");
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
    const body = getBody(skill);
    // exact workflow line
    assert.ok(body.includes("Run this planning-only workflow: `/grill-with-docs` → `/to-spec` → `/to-tickets`"));
    // Rules header
    assert.ok(body.includes("## Rules:"));
    // all eight rule bullets verbatim
    assert.ok(body.includes("Load `/unslop` before the first progress update. Keep it active throughout `/grill-with-docs` → `/to-spec` → `/to-tickets`"));
    assert.ok(body.includes("Maintain a concise To-Do List covering Discovery, Decisions, Specification, Tickets, and Delivery."));
    assert.ok(body.includes("Design tickets as independently verifiable vertical slices suitable for one future worktree."));
    assert.ok(body.includes("Optimize for precision per token: keep shared context in the parent specification;"));
    assert.ok(body.includes("Ground decisions in the codebase and relevant documentation, following the repository's documented loading order."));
    assert.ok(body.includes("Publish GitHub issues using repository-defined labels (`ready-for-agent` where applicable) and native dependency edges."));
    assert.ok(body.includes("Ask one decision at a time in ELI18 language, include a recommendation, and honor each skill's approval gates."));
    assert.ok(body.includes("Follow the installed skills as the procedural source of truth."));
    assert.ok(body.includes("Finish with an ELI18 **Why / What / Where / How** summary and links to the specification and all tickets, then stop."));
    // Task slot exactly once in body
    const taskCount = (body.match(/## Task:/g) || []).length;
    assert.equal(taskCount, 1, "body must contain ## Task: exactly once");
    assert.ok(body.trimEnd().endsWith("## Task:"), "body must end with ## Task: slot");
    assert.ok(!skill.includes("Issue #0"), "plan-this must not contain implementation placeholder Issue #0");
  });

  test("body after frontmatter equals expected prefix verbatim", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const body = getBody(skill);
    const expected = `Run this planning-only workflow: \`/grill-with-docs\` → \`/to-spec\` → \`/to-tickets\`

## Rules:

- Load \`/unslop\` before the first progress update. Keep it active throughout \`/grill-with-docs\` → \`/to-spec\` → \`/to-tickets\`. Apply it to all prose you write, including to-do items, progress updates, interview questions, recommendations, decisions, ADR and glossary text, specification drafts, ticket bodies, GitHub comments, and the final summary. Check prose against \`/unslop\` before showing it to the user or publishing it to GitHub. Preserve exact domain terms, identifiers, commands, labels, dependencies, quotations, and technical meaning.
- Maintain a concise To-Do List covering Discovery, Decisions, Specification, Tickets, and Delivery. Update it at phase changes, decisions, blockers, and publication. State what finished and what happens next without narrating every command.
- Design tickets as independently verifiable vertical slices suitable for one future worktree. Record blockers, affected seams, acceptance criteria, verification requirements, and whether later parallel execution is safe.
- Optimize for precision per token: keep shared context in the parent specification; make tickets self-contained only for their slice; avoid repetition, speculative file paths, and routine pseudocode.
- Ground decisions in the codebase and relevant documentation, following the repository's documented loading order. Inspect facts; ask only unresolved decisions.
- Publish GitHub issues using repository-defined labels (\`ready-for-agent\` where applicable) and native dependency edges.
- Ask one decision at a time in ELI18 language, include a recommendation, and honor each skill's approval gates.
- Follow the installed skills as the procedural source of truth.

Finish with an ELI18 **Why / What / Where / How** summary and links to the specification and all tickets, then stop.

## Task:`;
    assert.equal(body.trim(), expected.trim(), "body after frontmatter must equal expected prefix verbatim");
  });

  test("trimmed shape rejects wrapper phrases and respects line-count bound", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const body = getBody(skill);
    // negative checks for removed wrapper phrases
    assert.equal(skill.includes("Rules preserved"), false, "must not contain Rules preserved");
    assert.equal(skill.includes("## Installation"), false, "must not contain ## Installation");
    assert.equal(skill.includes("## Boundary"), false, "must not contain ## Boundary");
    assert.equal(skill.includes("--- start of supplied"), false, "must not contain start marker");
    assert.equal(skill.includes("This skill is a thin fixed-template adapter"), false, "must not contain thin adapter wrapper phrase");
    assert.equal(skill.includes("# plan-this — fixed-template planning adapter"), false, "must not contain title header");
    assert.equal(body.includes("## Invocation"), false, "body must not contain ## Invocation");
    assert.equal(body.includes("## Hard dependencies"), false, "body must not contain ## Hard dependencies wrapper");
    // line-count bound: ~25-35 lines total including frontmatter, allow 18-35 for trimmed 21-line file
    const lines = skill.trimEnd().split("\n").length;
    assert.ok(lines >= 18 && lines <= 35, `line count ${lines} must be within 18-35 (expected ~21, bound ~25-35)`);
  });

  test("task text like Create a Next.js App preserved verbatim under ## Task:", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const body = getBody(skill);
    // Simulate invoking /plan-this Create a Next.js App
    const task = "Create a Next.js App";
    const emitted = body.trimEnd() + "\n" + task + "\n";
    assert.ok(emitted.includes("## Task:\n" + task), "task must appear verbatim under ## Task:");
    // also test Hello world
    const task2 = "Hello world";
    const emitted2 = body.trimEnd() + "\n" + task2 + "\n";
    assert.ok(emitted2.includes("## Task:\n" + task2));
    // multi-word preservation: Create a Next.js App with auth
    const task3 = "Create a Next.js App with auth";
    const emitted3 = body.trimEnd() + "\n" + task3 + "\n";
    assert.ok(emitted3.includes(task3));
  });

  test("preserves exact protected identifiers and does not add extra runtime machinery", () => {
    const skill = read("skills/plan-this/SKILL.md");
    assert.ok(skill.includes("`ready-for-agent`"));
    const files = fs.readdirSync(path.join(ROOT, "skills/plan-this"));
    assert.ok(!files.includes("scripts"), "must not add scripts directory");
    assert.ok(!fs.existsSync(path.join(ROOT, "skills/plan-this/package.json")), "no npm package");
    assert.ok(!fs.existsSync(path.join(ROOT, ".kilo/command/plan-this.md")), "must not add .kilo command file");
    // no extra machinery: trimmed file should not claim to add router etc
    assert.equal(skill.includes("does not add") || skill.includes("does not reimplement"), false, "trimmed file must not contain boundary disclaimer");
  });
});

describe("plan-this hard dependencies and workflow order (plan-this:INV-4)", () => {
  test("declares /unslop as hard dependency before first progress and workflow order", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const body = getBody(skill);
    const n = norm(body);
    assert.ok(n.includes("/unslop"));
    assert.ok(n.includes("before the first progress update"));
    assert.ok(skill.includes("/grill-with-docs"));
    assert.ok(skill.includes("/to-spec"));
    assert.ok(skill.includes("/to-tickets"));
    const idxGrill = skill.indexOf("/grill-with-docs");
    const idxSpec = skill.indexOf("/to-spec");
    const idxTickets = skill.indexOf("/to-tickets");
    assert.ok(idxGrill !== -1 && idxSpec !== -1 && idxTickets !== -1);
    assert.ok(idxGrill < idxSpec && idxSpec < idxTickets, "workflow must be grill -> to-spec -> to-tickets");
    assert.ok(skill.includes("`/unslop`"));
    // frontmatter description also declares delegation
    const frontmatter = skill.slice(0, skill.indexOf("---", 3) + 3);
    assert.ok(frontmatter.includes("/grill-with-docs") && frontmatter.includes("/to-spec") && frontmatter.includes("/to-tickets") && frontmatter.includes("/unslop"), "frontmatter must declare delegation");
  });

  test("does not depend on implement or code-review", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const body = getBody(skill);
    const n = norm(body);
    assert.equal(n.includes("/implement"), false, "trimmed body must not mention /implement");
    assert.equal(n.includes("code-review"), false, "trimmed body must not mention code-review");
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
    const body = getBody(skill);
    const n = norm(body);
    assert.ok(n.includes("to-do list") || n.includes("to-do"));
    assert.ok(n.includes("discovery, decisions, specification, tickets, and delivery"));
    assert.ok(n.includes("approval gates"));
    assert.ok(n.includes("independently verifiable vertical slices"));
    assert.ok(n.includes("blocked by") || n.includes("blockers"));
    assert.ok(n.includes("affected seams"));
    assert.ok(n.includes("acceptance criteria"));
    assert.ok(n.includes("verification requirements"));
    assert.ok(n.includes("parallel execution") || n.includes("parallel"));
    assert.ok(n.includes("ready-for-agent"));
    assert.ok(n.includes("native dependency edges") || n.includes("native dependency"));
    assert.ok(n.includes("why / what / where / how") || n.includes("why / what"));
    assert.ok(skill.includes("**Why / What / Where / How**"));
  });

  test("skill is user-invoked only and does not introduce broad automatic triggering", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("user-invoked") || n.includes("user invoked") || n.includes("user invocation") || n.includes("user invokes"), "must indicate user-invoked");
    assert.ok(skill.includes("/plan-this <task>"));
    assert.equal(n.includes("when planning work appears"), false, "should not use broad automatic triggering phrase");
  });
});
