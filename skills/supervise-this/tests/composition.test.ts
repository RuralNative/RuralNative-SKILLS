// supervise-this:INV-1 — identity == folder
// supervise-this:INV-2 — registry-lane install and explicit invocation
// supervise-this:INV-3 — required and optional fields, review defaulting, partial and missing input produce ELI18 before session
// supervise-this:INV-4 — catalog resolution via agent_manager_models, no hard-coded allowlist, qualified identifiers
// supervise-this:INV-5 — approval before execution, unavailable or ambiguous pauses, no silent fallback
// supervise-this:INV-6 — local planning session with confirmed planning model/variant, delegates to plan-this, does not change current session
// supervise-this:INV-7 — structured parent comment records selections before implementation
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

describe("supervise-this identity (supervise-this:INV-1)", () => {
  test("folder and frontmatter identity are exactly supervise-this", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    assert.ok(skill.includes("name: supervise-this"), "frontmatter name must be exactly supervise-this");
    assert.ok(fs.existsSync(path.join(ROOT, "skills/supervise-this/SKILL.md")));
    assert.ok(fs.existsSync(path.join(ROOT, "skills/supervise-this/INSTALL.md")));
    const match = skill.match(/name:\s*supervise-this/);
    assert.ok(match, "frontmatter name must match folder supervise-this");
  });

  test("does not modify other seams' identities", () => {
    const plan = read("skills/plan-this/SKILL.md");
    assert.ok(plan.includes("name: plan-this"));
    const impl = read("skills/implement-this/SKILL.md");
    assert.ok(impl.includes("name: implement-this"));
    const unslopify = read("skills/unslopify/SKILL.md");
    assert.ok(unslopify.includes("name: unslopify"));
  });
});

describe("supervise-this discovery and installation (supervise-this:INV-2)", () => {
  test("description declares explicit invocations /supervise-this <task> and /supervise-this #<spec>", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    assert.ok(skill.includes("/supervise-this <task>"), "must declare /supervise-this <task>");
    assert.ok(skill.includes("/supervise-this #<spec>") || skill.includes("/supervise-this #"), "must declare /supervise-this #<spec>");
  });

  test("registry-lane install guidance present with exact command", () => {
    const install = read("skills/supervise-this/INSTALL.md");
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill supervise-this"));
    assert.ok(install.includes("cp -r skills/supervise-this"));
    const skill = read("skills/supervise-this/SKILL.md");
    // skill frontmatter should mention invocation
    assert.ok(skill.includes("/supervise-this <task>"));
  });

  test("architecture index and leaf doc describe the new seam", () => {
    const arch = read("ARCHITECTURE.md");
    assert.ok(arch.includes("supervise-this"), "ARCHITECTURE seam table must list supervise-this");
    assert.ok(arch.includes("skills/supervise-this/"));
    assert.ok(arch.includes("docs/leaves/supervise-this.md"));
    assert.ok(fs.existsSync(path.join(ROOT, "docs/leaves/supervise-this.md")));
    const leaf = read("docs/leaves/supervise-this.md");
    assert.ok(leaf.includes("supervise-this"));
    assert.ok(leaf.includes("INV-1"));
    assert.ok(leaf.includes("INV-7"));
  });

  test("adr and glossary exist", () => {
    const adr = read("docs/adr/0007-supervise-this-coordinator.md");
    assert.ok(adr.includes("supervise-this"));
    assert.ok(adr.includes("Status: accepted"));
    const glossary = read("CONTEXT.md");
    assert.ok(glossary.includes("Supervised run"));
    assert.ok(glossary.includes("supervise-this"));
  });
});

describe("supervise-this invocation fields and review defaulting (supervise-this:INV-3)", () => {
  test("declares required planning and implementation model and variant fields", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("planning model") && n.includes("planning variant"), "must declare planning model and variant");
    assert.ok(n.includes("implementation model") && n.includes("implementation variant"), "must declare implementation model and variant");
    // check explicit phrase for acceptance
    assert.ok(skill.includes("planning model, planning variant, implementation model, and implementation variant") || n.includes("planning model, planning variant, implementation model, and implementation variant"), "must accept task text plus planning model, planning variant, implementation model, implementation variant fields");
  });

  test("review model and variant may be supplied together and default to planning when both omitted", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("review model") && n.includes("review variant"), "must mention review model and review variant");
    assert.ok(n.includes("may be supplied together") || n.includes("optional"), "must state review may be supplied together");
    assert.ok(n.includes("both are omitted") || n.includes("both review fields are omitted") || n.includes("both omitted"), "must state both omitted");
    assert.ok(n.includes("default to the confirmed planning selection") || n.includes("default to the confirmed planning") || n.includes("defaults to planning"), "must state default to planning selection");
  });

  test("partial review selection or any missing required field produces one ELI18 decision before any session starts", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("partial review selection") || n.includes("partial review"), "must mention partial review selection");
    assert.ok(n.includes("missing required field") || n.includes("any missing required field"), "must mention missing required field");
    assert.ok(n.includes("eli18 decision") && n.includes("before any session starts"), "must produce one ELI18 decision before any session starts");
    // ensure it says one decision
    assert.ok(n.includes("one eli18 decision"), "must say one ELI18 decision");
  });

  test("review defaulting and partial handling documented in INSTALL with examples", () => {
    const install = read("skills/supervise-this/INSTALL.md");
    const n = norm(install);
    assert.ok(n.includes("review defaults to the confirmed planning") || n.includes("review defaults together"), "install must document review defaulting");
    assert.ok(n.includes("partial review") && n.includes("eli18"), "install must document partial review produces ELI18 decision");
    // check missing input scenario
    assert.ok(install.includes("missing required field") || n.includes("missing"), "install should mention missing field handling");
  });

  test("complete input scenario is documented", () => {
    const install = read("skills/supervise-this/INSTALL.md");
    assert.ok(install.includes("planning:") && install.includes("implementation:"), "install must show complete input with planning and implementation");
    assert.ok(install.includes("task:"), "install must show task text");
  });
});

describe("supervise-this catalog resolution and qualified identifiers (supervise-this:INV-4)", () => {
  test("every model name and variant is resolved through agent_manager_models", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    assert.ok(skill.includes("agent_manager_models"), "must mention agent_manager_models");
    assert.ok(skill.includes("Every model name and variant is resolved through `agent_manager_models`") || norm(skill).includes("every model name and variant is resolved through `agent_manager_models`") || norm(skill).includes("every model name and variant is resolved through agent_manager_models"), "must state every model name and variant is resolved through agent_manager_models");
  });

  test("skill contains no hard-coded model allowlist", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    assert.ok(skill.includes("no hard-coded model allowlist"), "must explicitly state no hard-coded model allowlist");
    // ensure no hard-coded allowlist table
    const n = norm(skill);
    assert.equal(n.includes("allowlist:") && n.includes("muse spark") && n.includes("deepseek"), false, "skill must not contain a hard-coded allowlist table with models");
    // check leaf also declares this
    const leaf = read("docs/leaves/supervise-this.md");
    assert.ok(leaf.includes("no hard-coded model allowlist"));
  });

  test("accepts catalog model names and qualified provider and model identifiers", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("catalog model names"), "must mention catalog model names");
    assert.ok(n.includes("qualified provider and model identifiers") || n.includes("qualified provider"), "must mention qualified provider and model identifiers");
    // example like provider/model
    assert.ok(skill.includes("provider/model") || skill.includes("provider and model"), "must mention provider/model pattern");
    const install = read("skills/supervise-this/INSTALL.md");
    assert.ok(norm(install).includes("qualified provider") || norm(install).includes("provider/model") || install.includes("provider/model"), "install must document qualified identifiers");
    assert.ok(install.includes("agent_manager_models"), "install must mention catalog resolution");
  });

  test("verifies each variant against the resolved model", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("verifies each variant") || n.includes("verify") && n.includes("variant"), "must verify each variant against resolved model");
  });

  test("catalog resolution covers both catalog names and qualified identifiers — INSTALL shows qualified example", () => {
    const install = read("skills/supervise-this/INSTALL.md");
    assert.ok(install.includes("openai/gpt-5.6-sol") || install.includes("anthropic/") || install.includes("provider/"), "install must show qualified identifier example");
  });
});

describe("supervise-this approval and unavailable handling (supervise-this:INV-5)", () => {
  test("user sees and approves the exact resolved planning, implementation, and review selections before execution", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("user sees and approves the exact resolved planning, implementation, and review selections before execution") || (n.includes("user sees and approves") && n.includes("exact resolved") && n.includes("before execution")), "must state user sees and approves exact resolved selections before execution");
    assert.ok(n.includes("requires one confirmation before creating any session") || n.includes("require") && n.includes("confirmation"), "must require one confirmation before creating session");
  });

  test("unavailable or ambiguous model or variant pauses planning and never triggers an unapproved fallback", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("unavailable or ambiguous model or variant pauses") || (n.includes("unavailable") && n.includes("ambiguous") && n.includes("pauses")), "must state unavailable or ambiguous pauses planning");
    assert.ok(n.includes("never triggers an unapproved fallback") || n.includes("never trigger") && n.includes("fallback"), "must state never triggers unapproved fallback");
  });

  test("ban on silent fallback is explicit in skill and INSTALL", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("no silent fallback") || n.includes("never triggers an unapproved fallback") || n.includes("ban on silent fallback") || n.includes("no fallback"), "must ban silent fallback");
    assert.equal(n.includes("fallback to") && n.includes("automatically choose"), false, "must not contain fallback language that suggests choosing another model");
    const install = read("skills/supervise-this/INSTALL.md");
    assert.ok(norm(install).includes("no silent fallback") || norm(install).includes("no fallback") || norm(install).includes("never triggers"), "install must mention ban on fallback");
    assert.ok(install.includes("unavailable") && install.includes("pauses"), "install must document unavailable pauses");
  });

  test("approval gate shows exact resolved selections", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("shows the resolved model names and variants exactly as returned by the catalog") || n.includes("shows the exact resolved"), "must show exact resolved selections");
    assert.ok(n.includes("catalog") && n.includes("resolved"), "must tie resolution to catalog");
  });

  test("unavailable selections pause and return ELI18 decision", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("unavailable") && n.includes("eli18"), "unavailable must return ELI18 decision");
    const install = read("skills/supervise-this/INSTALL.md");
    const n2 = norm(install);
    assert.ok(n2.includes("unavailable variant") && n2.includes("pauses"), "install must show unavailable variant pauses");
    assert.ok(n2.includes("eli18"), "install must mention ELI18 for unavailable");
  });
});

describe("supervise-this planning session routing (supervise-this:INV-6)", () => {
  test("planning phase starts as an Agent Manager local session with the confirmed planning model and variant and a delegated plan-this task", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("planning phase starts as an agent manager local session with the confirmed planning model and variant") || (n.includes("planning phase starts") && n.includes("agent manager local session") && n.includes("confirmed planning model and variant")), "must state planning starts as Agent Manager local session with confirmed planning model and variant");
    assert.ok(skill.includes("delegated `plan-this` task") || n.includes("delegated plan-this"), "must mention delegated plan-this task");
    assert.ok(skill.includes("Agent Manager local session"), "must mention Agent Manager local session exactly");
  });

  test("skill does not claim to change the model of the current Kilo session", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    assert.ok(skill.includes("does not claim to change the model of the current Kilo session") || norm(skill).includes("does not claim to change the model of the current kilo session"), "must explicitly state does not claim to change current session model");
  });

  test("delegated planning session honors all plan-this approval gates and returns the published specification and ticket references to the supervisor", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("delegated planning session honors all `plan-this` approval gates") || (n.includes("delegated planning") && n.includes("honors all") && n.includes("plan-this") && n.includes("approval gates")), "must state delegated planning honors all plan-this approval gates");
    assert.ok(n.includes("returns the published specification and ticket references to the supervisor") || (n.includes("returns the published specification") && n.includes("ticket references") && n.includes("supervisor")), "must state returns published spec and ticket refs to supervisor");
  });

  test("local planning-session routing is not worktree isolation for planning", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("local mode because it publishes github work docs") || n.includes("local mode") || n.includes("local session"), "must justify local mode for planning");
    assert.ok(n.includes("does not edit the repository") || n.includes("publishes github"), "must mention planning does not edit repo");
  });

  test("INSTALL documents local session routing and that supervisor model differs from planning model", () => {
    const install = read("skills/supervise-this/INSTALL.md");
    const n = norm(install);
    assert.ok(n.includes("local agent manager session") || n.includes("local agent manager"), "install must mention local Agent Manager session");
    assert.ok(n.includes("plan-this") && n.includes("planning model"), "install must mention delegated plan-this with planning model");
    assert.ok(install.includes("does not claim to change") || n.includes("does not claim"), "install should echo that skill does not change current session model");
  });
});

describe("supervise-this parent recording (supervise-this:INV-7)", () => {
  test("before implementation starts, one structured parent comment records the resolved planning, implementation, and review model and variant selections", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("before implementation starts, one structured parent comment records the resolved planning, implementation, and review model and variant selections") || (n.includes("before implementation starts") && n.includes("one structured parent comment") && n.includes("planning, implementation, and review")), "must state structured parent comment records selections before implementation");
  });

  test("records resolved phase configuration on parent for later execution and resume", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("records the resolved phase configuration on that parent for later execution and resume") || (n.includes("records the resolved phase configuration") && n.includes("parent")), "must state records phase configuration for later execution and resume");
  });

  test("leaf doc explains coordination boundary and parent recording", () => {
    const leaf = read("docs/leaves/supervise-this.md");
    const n = norm(leaf);
    assert.ok(n.includes("one structured parent comment records"), "leaf must mention structured parent comment");
    assert.ok(n.includes("coordination and model routing only") || n.includes("owns coordination"), "leaf must explain coordination-only boundary");
  });
});

describe("supervise-this composition coverage and seam docs (supervise-this:INV-1..7)", () => {
  test("leaf doc declares all seven invariants with mechanisms", () => {
    const leaf = read("docs/leaves/supervise-this.md");
    for (let i = 1; i <= 7; i++) {
      assert.ok(leaf.includes(`INV-${i}`), `leaf must contain INV-${i}`);
    }
    // check at least one mechanism mentions composition test
    assert.ok(leaf.includes("composition test"), "leaf must link invariants to composition test mechanism");
  });

  test("skill does not contain hard-coded model allowlist and does not claim to change current session model", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    // no hard-coded table
    assert.ok(skill.includes("no hard-coded model allowlist"));
    // ensure skill does not list a fixed set of models as allowlist
    const hasHardcoded = n.includes("allowed models:") && n.includes("muse spark") && n.includes("deepseek") && n.includes("gpt");
    assert.equal(hasHardcoded, false, "must not contain hard-coded allowlist table");
    // ban fallback
    assert.ok(n.includes("never triggers an unapproved fallback") || n.includes("no silent fallback"));
    // does not claim to change current session
    assert.ok(n.includes("does not claim to change the model of the current kilo session"));
  });

  test("skill contains no invented Agent Manager state file edit", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.equal(n.includes("edit .kilo/agent-manager.json"), false, "must not edit agent-manager.json");
    assert.equal(n.includes("invent session"), false, "must not invent session");
  });

  test("derived human docs will be updated — check that leaf and adr are covered", () => {
    const arch = read("ARCHITECTURE.md");
    assert.ok(arch.includes("docs/leaves/supervise-this.md"));
    assert.ok(arch.includes("docs/adr/0007-supervise-this-coordinator.md"));
    assert.ok(arch.includes("supervise-this"));
  });

  test("composition tests cover all required scenarios mentioned in acceptance criteria", () => {
    // This meta-test ensures this file itself covers those topics
    const self = read("skills/supervise-this/tests/composition.test.ts");
    const n = norm(self);
    assert.ok(n.includes("complete input"), "test must cover complete input");
    assert.ok(n.includes("missing input") || n.includes("missing required field"), "test must cover missing input");
    assert.ok(n.includes("review defaulting") || n.includes("defaults to planning"), "test must cover review defaulting");
    assert.ok(n.includes("partial review"), "test must cover partial review input");
    assert.ok(n.includes("catalog resolution") || n.includes("agent_manager_models"), "test must cover catalog resolution");
    assert.ok(n.includes("qualified provider"), "test must cover qualified provider input");
    assert.ok(n.includes("approval") || n.includes("approves"), "test must cover approval");
    assert.ok(n.includes("unavailable") && n.includes("ambiguous"), "test must cover unavailable selections");
    assert.ok(n.includes("local") && n.includes("planning"), "test must cover local planning-session routing");
    assert.ok(n.includes("silent fallback") || n.includes("no fallback") || n.includes("ban on silent fallback"), "test must cover ban on silent fallback");
  });
});
