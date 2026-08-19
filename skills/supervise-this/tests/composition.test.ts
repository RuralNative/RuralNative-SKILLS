// supervise-this:INV-1 — identity == folder
// supervise-this:INV-2 — AO-first install and invocation
// supervise-this:INV-3 — AO project and role-profile preflight
// supervise-this:INV-4 — inline planning and intermediate checkpoints
// supervise-this:INV-5 — native frontier and bounded AO workers
// supervise-this:INV-6 — persistent AO event loop
// supervise-this:INV-7 — pull-request worker delivery
// supervise-this:INV-8 — durable completion and reconciliation
// supervise-this:INV-9 — resume and recovery
// supervise-this:INV-10 — final review and bounded follow-up loop
// supervise-this:INV-11 — current AO command boundary
// supervise-this:INV-12 — composition and documentation coverage
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

describe("supervise-this identity (INV-1)", () => {
  test("frontmatter and folder identity are exact", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    assert.match(skill, /name: supervise-this/);
    assert.ok(fs.existsSync(path.join(ROOT, "skills/supervise-this/INSTALL.md")));
  });
});

describe("AO-first discovery and installation (INV-2)", () => {
  test("declares both explicit invocations and registry installation", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const install = read("skills/supervise-this/INSTALL.md");
    assert.ok(skill.includes("/supervise-this <task>"));
    assert.ok(skill.includes("/supervise-this #<spec>"));
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill supervise-this"));
    assert.ok(install.includes("cp -r skills/supervise-this"));
    assert.ok(norm(skill).includes("agent orchestrator"));
  });
});

describe("AO project and role-profile preflight (INV-3)", () => {
  test("requires AO health, project, agent, and role configuration", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    for (const phrase of ["ao status --json", "ao project", "ao agent ls --refresh --json", "ao_project_id", "orchestrator", "worker", "role profiles"]) {
      assert.ok(n.includes(phrase), `skill must mention ${phrase}`);
    }
    assert.ok(n.includes("do not invent per-spawn model flags"));
    assert.ok(n.includes("reviewer profile"));
    assert.ok(n.includes("ask one eli18 decision"));
  });
});

describe("inline planning and intermediate checkpoints (INV-4)", () => {
  test("delegates plan-this inline and keeps the run open after planning", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("delegate the complete planning workflow to `/plan-this`"));
    assert.ok(n.includes("same persistent orchestrator session"));
    assert.ok(n.includes("not a reason to return a final summary"));
    assert.ok(n.includes("do not give the user a conclusive summary yet"));
    assert.ok(n.includes("structured parent comment"));
  });
});

describe("AO frontier and bounded workers (INV-5)", () => {
  test("uses GitHub blockers, AO sessions, and three-worker cap", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    for (const phrase of ["no open native blocker", "ready-for-agent", "no assignee", "ao session ls", "at most three", "ao spawn", "--kind worker", "--issue <n>"]) {
      assert.ok(n.includes(phrase), `skill must mention ${phrase}`);
    }
    assert.ok(n.includes("never duplicate a worker"));
    assert.ok(n.includes("twenty characters or fewer"));
  });
});

describe("persistent AO event loop (INV-6)", () => {
  test("treats spawn as intermediate and consumes AO completion messages", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("persistent owner of the run"));
    assert.ok(n.includes("worker spawn is an intermediate checkpoint"));
    assert.ok(n.includes("consume ao completion or handoff events"));
    assert.ok(n.includes("reconcile github before the next spawn"));
  });
});

describe("AO pull-request worker delivery (INV-7)", () => {
  test("routes one issue to implement-this and forbids direct main delivery", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("exactly one issue"));
    assert.ok(n.includes("/implement-this #<n>"));
    assert.ok(n.includes("pull-request delivery"));
    assert.ok(n.includes("does not push directly to `main`"));
    assert.ok(n.includes("ao owns the worker session"));
    assert.ok(n.includes("ao send --session <id> --message"));
  });
});

describe("durable completion and reconciliation (INV-8)", () => {
  test("requires merged PR, evidence, issue closure, and dependency refill", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    for (const phrase of ["pr is merged", "acceptance evidence", "issue is closed", "refill free worker slots", "descendants remain unscheduled"]) {
      assert.ok(n.includes(phrase), `skill must mention ${phrase}`);
    }
    assert.ok(n.includes("ao pr merge"));
  });
});

describe("resume and recovery (INV-9)", () => {
  test("rebuilds state before AO reconciliation and escalates safely", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("must not create a duplicate specification, ticket, worker, or pr"));
    assert.ok(n.includes("reconcile github first, then ao sessions"));
    assert.ok(n.includes("one focused recovery message"));
    assert.ok(n.includes("add `needs-info`"));
    assert.ok(n.includes("continue unrelated ready work"));
    assert.ok(n.includes("never silently change the ao project role model"));
  });
});

describe("review and closure (INV-10)", () => {
  test("runs whole-spec review and caps automatic follow-up rounds", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("run `/code-review` in the ao orchestrator"));
    assert.ok(n.includes("fixed base"));
    assert.ok(n.includes("smallest independently verifiable follow-up ticket"));
    assert.ok(n.includes("at most two automatic follow-up and review rounds"));
    assert.ok(n.includes("close the parent only after"));
    assert.ok(n.includes("final evidence comment"));
  });
});

describe("current AO command boundary (INV-11)", () => {
  test("does not document retired or unverified AO mechanisms", () => {
    const all = `${read("skills/supervise-this/SKILL.md")}\n${read("skills/supervise-this/INSTALL.md")}`;
    const n = norm(all);
    assert.equal(n.includes("ao batch-spawn"), false);
    assert.equal(n.includes("ao spawn --model"), false);
    assert.equal(n.includes("reactions:"), false);
    assert.ok(n.includes("project role profiles"));
    assert.ok(n.includes("do not pass an unverified `--model` flag"));
  });
});

describe("composition and documentation coverage (INV-12)", () => {
  test("leaf, ADR, glossary, and architecture references exist", () => {
    const leaf = read("docs/leaves/supervise-this.md");
    const adr = read("docs/adr/0008-supervise-this-agent-orchestrator.md");
    const glossary = read("CONTEXT.md");
    const arch = read("ARCHITECTURE.md");
    for (let i = 1; i <= 12; i++) assert.ok(leaf.includes(`INV-${i}`), `leaf must contain INV-${i}`);
    assert.ok(adr.includes("Agent Orchestrator"));
    assert.ok(glossary.includes("Agent Orchestrator run"));
    assert.ok(arch.includes("0008-supervise-this-agent-orchestrator.md"));
  });
});
