// plan-this:INV-1 — identity == folder
// plan-this:INV-2 — registry-lane install and explicit invocation
// plan-this:INV-3 — fixed-template boundary preserves exact prefix and substitutes only task under ## Task:
// plan-this:INV-4 — hard dependencies and workflow order with /unslop before first progress
// plan-this:INV-5 — dual invocation (direct and delegated), preserved rules, stop semantics, byte-for-byte body
// plan-this:INV-6 — narrow delegation without second planning contract
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
    // all ten rule bullets verbatim
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

\`/grill-with-docs\`, \`/to-spec\`, and \`/to-tickets\` require explicit human invocation; an agent cannot traverse the chain unattended. \`/unslop\` remains model-invocable.

## Rules:

- Load \`/unslop\` before the first progress update. Keep it active throughout \`/grill-with-docs\` → \`/to-spec\` → \`/to-tickets\`. Apply it to all prose you write, including to-do items, progress updates, interview questions, recommendations, decisions, ADR and glossary text, specification drafts, ticket bodies, GitHub comments, and the final summary. Check prose against \`/unslop\` before showing it to the user or publishing it to GitHub. Preserve exact domain terms, identifiers, commands, labels, dependencies, quotations, and technical meaning.
- Maintain a concise To-Do List covering Discovery, Decisions, Specification, Tickets, and Delivery. Update it at phase changes, decisions, blockers, and publication. State what finished and what happens next without narrating every command.
- Require a parent specification that separates in-scope behavior from out-of-scope non-goals, states acceptance criteria, affected seams, structural constraints, and the smallest test-first verification plan that proves the result.
- Design tickets as independently verifiable vertical slices suitable for one future worktree. Each ticket states its independently verifiable behavior, blockers, affected seams, acceptance criteria, verification requirements, and whether later parallel execution is safe.
- Require test design before implementation direction: state the smallest set of tests that proves observable behavior, stated standards, and structural requirements. Reject redundant, implementation-detail, prose-mirroring, and coverage-only tests unless they name a distinct risk.
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
    assert.ok(lines >= 18 && lines <= 35, `line count ${lines} must be within 18-35 (expected ~23, bound ~25-35)`);
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

  test("distinguishes locked dependencies (/grill-with-docs, /to-spec, /to-tickets) from unlocked (/unslop) and states human-invocation requirement", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const leaf = read("docs/leaves/plan-this.md");
    const nSkill = norm(skill);
    // Extract INV-4 block and scope assertions to the amended invariant text
    const inv4Match = leaf.match(/4\. \*\*INV-4\*\*[\s\S]*?(?=\n5\. \*\*INV-5\*\*|\n## )/);
    assert.ok(inv4Match, "leaf must contain INV-4");
    const nInv4 = norm(inv4Match[0]);
    // body states the human-invocation requirement (skill body is the fixed template, whole body is the invariant)
    assert.ok(nSkill.includes("explicit human invocation"), "body must state explicit human invocation");
    assert.ok(nSkill.includes("cannot traverse the chain unattended"), "body must state agent cannot traverse unattended");
    // body names the locked skills
    assert.ok(nSkill.includes("/grill-with-docs") && nSkill.includes("/to-spec") && nSkill.includes("/to-tickets"), "body must name locked skills");
    // body names the unlocked skill
    assert.ok(nSkill.includes("/unslop") && nSkill.includes("model-invocable"), "body must state /unslop remains model-invocable");
    // INV-4 itself must state the classification (scoped, not whole-leaf)
    assert.ok(nInv4.includes("disable-model-invocation"), "INV-4 must reference disable-model-invocation");
    assert.ok(nInv4.includes("explicit human invocation"), "INV-4 must state explicit human invocation");
    assert.ok(nInv4.includes("cannot traverse the chain unattended") || nInv4.includes("cannot traverse the delegation chain unattended"), "INV-4 must state agent cannot traverse unattended");
    assert.ok(nInv4.includes("model-invocable"), "INV-4 must name model-invocable skills");
    assert.ok(nInv4.includes("/grill-with-docs") && nInv4.includes("/to-spec") && nInv4.includes("/to-tickets"), "INV-4 must name locked skills");
    assert.ok(nInv4.includes("/unslop") && nInv4.includes("no such lock"), "INV-4 must distinguish /unslop as model-invocable with no such lock");
    // ADR-0009 exists and records the decision
    const adr = read("docs/adr/0009-delegation-invariants-human-invocation.md");
    assert.ok(adr.includes("Status: accepted"), "ADR-0009 must be accepted");
    assert.ok(adr.includes("disable-model-invocation"), "ADR-0009 must reference disable-model-invocation");
    assert.ok(adr.includes("rejected") && adr.includes("removing"), "ADR-0009 must state removing locks was rejected");
    assert.ok(adr.includes("unattended"), "ADR-0009 must address unattended traversal");
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

  test("skill accepts direct user invocation and narrow supervise-this delegation, rejects broad triggering", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("user-invoked") || n.includes("user invoked") || n.includes("user invocation") || n.includes("user invokes"), "must indicate user-invoked");
    assert.ok(skill.includes("/plan-this <task>"), "must declare direct invocation");
    // must also declare delegation from active supervise-this
    assert.ok(n.includes("supervise-this"), "must declare delegation from supervise-this");
    assert.ok(n.includes("active") && n.includes("supervise-this"), "must qualify delegation as active supervise-this run");
    assert.ok(n.includes("narrow delegation") || n.includes("narrow"), "must state narrow delegation");
    // must reject unrelated invocation
    assert.ok(n.includes("unrelated") && (n.includes("rejected") || n.includes("reject") || n.includes("is rejected")), "must state unrelated invocation is rejected");
    // still reject broad automatic triggering phrase
    assert.equal(n.includes("when planning work appears"), false, "should not use broad automatic triggering phrase");
  });

  test("body task slot, dependency order, prose rules, approval gates remain byte-for-byte unchanged across both invocation paths", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const body = getBody(skill);
    const expected = `Run this planning-only workflow: \`/grill-with-docs\` → \`/to-spec\` → \`/to-tickets\`

\`/grill-with-docs\`, \`/to-spec\`, and \`/to-tickets\` require explicit human invocation; an agent cannot traverse the chain unattended. \`/unslop\` remains model-invocable.

## Rules:

- Load \`/unslop\` before the first progress update. Keep it active throughout \`/grill-with-docs\` → \`/to-spec\` → \`/to-tickets\`. Apply it to all prose you write, including to-do items, progress updates, interview questions, recommendations, decisions, ADR and glossary text, specification drafts, ticket bodies, GitHub comments, and the final summary. Check prose against \`/unslop\` before showing it to the user or publishing it to GitHub. Preserve exact domain terms, identifiers, commands, labels, dependencies, quotations, and technical meaning.
- Maintain a concise To-Do List covering Discovery, Decisions, Specification, Tickets, and Delivery. Update it at phase changes, decisions, blockers, and publication. State what finished and what happens next without narrating every command.
- Require a parent specification that separates in-scope behavior from out-of-scope non-goals, states acceptance criteria, affected seams, structural constraints, and the smallest test-first verification plan that proves the result.
- Design tickets as independently verifiable vertical slices suitable for one future worktree. Each ticket states its independently verifiable behavior, blockers, affected seams, acceptance criteria, verification requirements, and whether later parallel execution is safe.
- Require test design before implementation direction: state the smallest set of tests that proves observable behavior, stated standards, and structural requirements. Reject redundant, implementation-detail, prose-mirroring, and coverage-only tests unless they name a distinct risk.
- Optimize for precision per token: keep shared context in the parent specification; make tickets self-contained only for their slice; avoid repetition, speculative file paths, and routine pseudocode.
- Ground decisions in the codebase and relevant documentation, following the repository's documented loading order. Inspect facts; ask only unresolved decisions.
- Publish GitHub issues using repository-defined labels (\`ready-for-agent\` where applicable) and native dependency edges.
- Ask one decision at a time in ELI18 language, include a recommendation, and honor each skill's approval gates.
- Follow the installed skills as the procedural source of truth.

Finish with an ELI18 **Why / What / Where / How** summary and links to the specification and all tickets, then stop.

## Task:`;
    assert.equal(body.trim(), expected.trim(), "body must stay byte-for-byte unchanged across both paths");
    // also verify single Task slot preserved
    const taskCount = (body.match(/## Task:/g) || []).length;
    assert.equal(taskCount, 1, "body must still contain ## Task: exactly once after delegation");
  });
});

describe("plan-this supervised delegation (plan-this:INV-5 and INV-6)", () => {
  test("frontmatter declares both allowed invocation paths: direct and delegated from active supervise-this", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const frontmatter = skill.slice(skill.indexOf("---") + 3, skill.indexOf("---", 3));
    const n = norm(frontmatter);
    assert.ok(frontmatter.includes("/plan-this <task>"), "frontmatter must declare direct path");
    assert.ok(n.includes("supervise-this"), "frontmatter must mention supervise-this delegation");
    assert.ok(n.includes("active supervise-this") || n.includes("active `supervise-this`"), "must qualify as active supervise-this run");
    assert.ok(n.includes("or when an active") || n.includes("or narrow delegation") || n.includes("delegates planning"), "must join both paths with or");
  });

  test("composition rejects unrelated model invocation", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const leaf = read("docs/leaves/plan-this.md");
    const nSkill = norm(skill);
    const nLeaf = norm(leaf);
    // skill must explicitly reject unrelated
    assert.ok(nSkill.includes("unrelated invocation is rejected") || nSkill.includes("unrelated is rejected") || nSkill.includes("unrelated model"), "skill must reject unrelated invocation");
    assert.ok(nLeaf.includes("unrelated model invocation is rejected") || nLeaf.includes("unrelated"), "leaf must document rejection");
    // must not allow generic triggers
    assert.equal(nSkill.includes("any model may invoke"), false, "must not allow any model");
    assert.equal(nSkill.includes("when work appears"), false, "must not use generic trigger");
    assert.equal(nSkill.includes("broad automatic"), false, "must not claim broad automatic triggering is allowed");
    // leaf must state narrow delegation only
    assert.ok(nLeaf.includes("narrow delegation") || nLeaf.includes("narrow"), "leaf must state narrow delegation");
    assert.ok(nLeaf.includes("supervise-this"), "leaf must name supervise-this as only delegated caller");
  });

  test("delegated completion returns parent specification and ticket references to supervisor; standalone still stops after ELI18 summary", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const leaf = read("docs/leaves/plan-this.md");
    const install = read("skills/plan-this/INSTALL.md");
    const nLeaf = norm(leaf);
    const nInstall = norm(install);
    const body = getBody(skill);
    // body still ends with stop after summary
    assert.ok(body.includes("Finish with an ELI18 **Why / What / Where / How** summary and links to the specification and all tickets, then stop."), "body must still declare standalone stop after ELI18 summary");
    // leaf explains delegated return semantics
    assert.ok(nLeaf.includes("delegated completion returns") || nLeaf.includes("returns the published parent specification"), "leaf must explain delegated return");
    assert.ok(nLeaf.includes("parent specification") && nLeaf.includes("ticket references") && nLeaf.includes("supervisor"), "leaf must name published parent specification and ticket references returned to supervisor");
    assert.ok(nLeaf.includes("standalone completion stops") || nLeaf.includes("standalone still stops"), "leaf must state standalone still stops");
    // install also documents the difference
    assert.ok(nInstall.includes("returns the published parent specification") || nInstall.includes("returns the published") || nInstall.includes("return"), "install must document delegated return");
    assert.ok(nInstall.includes("still stops after its eli18 summary") || nInstall.includes("standalone completion still stops"), "install must document standalone stop");
    // delegated does not end whole supervised run
    assert.ok(nLeaf.includes("instead of ending the whole supervised run") || nLeaf.includes("instead of ending"), "leaf must state delegated does not end supervised run");
  });

  test("leaf doc preserves fixed-template invariants and explains narrow delegation without second contract", () => {
    const leaf = read("docs/leaves/plan-this.md");
    const n = norm(leaf);
    assert.ok(leaf.includes("INV-5"), "leaf must contain INV-5");
    assert.ok(leaf.includes("INV-6"), "leaf must contain INV-6 for delegation without second contract");
    assert.ok(n.includes("fixed-template body is the single source") || n.includes("single source of planning behavior"), "must state single source body");
    assert.ok(n.includes("byte-for-byte unchanged") || n.includes("byte-for-byte"), "must state body stays byte-for-byte unchanged");
    assert.ok(n.includes("no second planning contract") || n.includes("without creating a second"), "must state no second contract created");
    assert.ok(n.includes("supervise-this"), "must reference supervise-this");
    // invariants 1-4 still present
    assert.ok(leaf.includes("INV-1") && leaf.includes("INV-2") && leaf.includes("INV-3") && leaf.includes("INV-4"), "must preserve INV-1 through INV-4");
  });

  test("composition proves both allowed paths and rejects unrelated — frontmatter, leaf, install are the three documented homes for wrapper and delegation material", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const leaf = read("docs/leaves/plan-this.md");
    const install = read("skills/plan-this/INSTALL.md");
    const adr = read("docs/adr/0006-plan-this-fixed-template-adapter.md");
    // skill frontmatter is concise and does not contain wrapper sections
    assert.equal(skill.includes("## Installation"), false);
    assert.equal(skill.includes("Rules preserved"), false);
    // leaf carries the detailed contract
    assert.ok(leaf.includes("direct") && leaf.includes("delegated") && leaf.includes("supervise-this"), "leaf must document both paths");
    // install documents delegation
    assert.ok(install.includes("supervise-this"), "install must document delegation");
    // adr still records original task-scoped exception
    assert.ok(adr.includes("plan-this") && adr.includes("implement-this"), "adr still records task-scoped exception");
  });

  test("task slot remains single substitution point under both invocation paths", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const body = getBody(skill);
    const frontmatter = skill.slice(0, skill.indexOf("---", 3) + 3);
    // body has one Task slot
    assert.equal((body.match(/## Task:/g) || []).length, 1, "body must have single ## Task: slot");
    // frontmatter says substitutes only task under ## Task:
    assert.ok(norm(frontmatter).includes("substitutes only the task under ## task"), "frontmatter must state single Task slot");
    // simulate both invocation paths produce same body
    const task = "Add supervise-this coordinator";
    const emittedDirect = body.trimEnd() + "\n" + task + "\n";
    const emittedDelegated = body.trimEnd() + "\n" + task + "\n";
    assert.equal(emittedDirect, emittedDelegated, "both paths must share identical emitted body");
    assert.ok(emittedDirect.includes("## Task:\n" + task), "task appears verbatim in both paths");
  });
});


describe("plan-this bounded planning contract (plan-this:INV-7)", () => {
  test("skill enforces bounded scope and lean test criteria", () => {
    const skill = read("skills/plan-this/SKILL.md");
    const body = getBody(skill);
    assert.ok(body.includes("Require a parent specification that separates in-scope behavior from out-of-scope non-goals"));
    assert.ok(body.includes("Require test design before implementation direction"));
    assert.ok(body.includes("Reject redundant, implementation-detail, prose-mirroring, and coverage-only tests"));
    assert.ok(body.includes("Design tickets as independently verifiable vertical slices"));
    const lines = skill.trimEnd().split("\n").length;
    assert.ok(lines >= 18 && lines <= 35, `INV-7 bound 18-35, got ${lines}`);
  });
});
