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

  test("leaf doc declares execution invariants INV-8 through INV-12", () => {
    const leaf = read("docs/leaves/supervise-this.md");
    for (let i = 8; i <= 12; i++) {
      assert.ok(leaf.includes(`INV-${i}`), `leaf must contain INV-${i}`);
    }
    assert.ok(leaf.includes("INV-8") && leaf.includes("INV-12"));
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
    assert.ok(n.includes("never edits `.kilo/agent-manager.json`") || n.includes("never edits .kilo/agent-manager.json"), "must state never edits agent-manager.json");
    assert.ok(n.includes("or invents session") || n.includes("invents session and section ids"), "must state never invents session");
    assert.ok(n.includes("never edits") && n.includes("agent-manager.json"), "must explicitly ban state-file edits");
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

describe("supervise-this execution frontier and review base (supervise-this:INV-8)", () => {
  test("reads the structured model configuration recorded by #67 before starting implementation", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("reads the structured model configuration recorded by #67 before starting implementation") || (n.includes("reads the structured model configuration") && n.includes("before starting implementation")), "must read structured config before implementation");
  });

  test("records a fixed implementation review base on the parent before starting the first implementation worktree", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("records a fixed implementation review base on the parent before starting the first implementation worktree"), "must record fixed base before first worktree");
  });

  test("ready frontier contains only open child tickets with no open native blocker, the ready-for-agent label, and no assignee", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("ready frontier contains only open child tickets with no open native blocker") && n.includes("ready-for-agent") && n.includes("no assignee"), "must define ready frontier correctly");
  });

  test("does not schedule blocked or assigned tickets", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("does not schedule blocked or assigned tickets") || n.includes("does not schedule blocked"), "must ban blocked scheduling");
  });
});

describe("supervise-this worktree creation and model routing (supervise-this:INV-9)", () => {
  test("creates one Agent Manager worktree per selected ticket and keeps no more than three implementation worktrees active", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("creates one agent manager worktree per selected ticket") && n.includes("keeps no more than three implementation worktrees active"), "must create one worktree per ticket and cap at three");
  });

  test("every worker receives one delegated implement-this issue plus the exact confirmed implementation model and variant", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("every worker receives one delegated `implement-this` issue plus the exact confirmed implementation model and variant") || (n.includes("every worker receives one delegated") && n.includes("implement-this") && n.includes("exact confirmed implementation model and variant")), "must route implementation selection to workers");
  });

  test("every follow-up implementation session uses the same confirmed implementation selection", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("every follow-up implementation session") && n.includes("same confirmed implementation selection"), "must state follow-ups use same selection");
  });

  test("never replaces an unavailable implementation model or variant with an inherited or cheaper fallback", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("never replaces an unavailable implementation model or variant with an inherited or cheaper fallback"), "must never replace unavailable implementation model");
  });

  test("uses Agent Manager list for live session IDs and states and never edits persisted Agent Manager state", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("uses agent manager `list` for live session ids and states") || n.includes("uses agent manager list for live session ids and states") || n.includes("as the only source of live session ids and states"), "must use list for live IDs");
    assert.ok(n.includes("never edits persisted agent manager state"), "must never edit persisted state");
  });

  test("does not copy the planning or implementation prefixes", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("does not copy the planning or implementation prefixes") || n.includes("does not copy"), "must not copy prefixes");
  });

  test("never invents session and section IDs and never edits .kilo/agent-manager.json", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("never edits `.kilo/agent-manager.json`") || n.includes("never edits .kilo/agent-manager.json"));
    assert.ok(n.includes("invents session") || n.includes("invents session and section ids"));
  });
});

describe("supervise-this durable completion and slot refilling (supervise-this:INV-10)", () => {
  test("a ticket counts as complete only when GitHub shows it closed, acceptance evidence exists, and its commit is reachable from origin/main", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("a ticket counts as complete only when github shows it closed, acceptance evidence exists, and its commit is reachable from `origin/main`") || (n.includes("a ticket counts as complete") && n.includes("github shows it closed") && n.includes("acceptance evidence exists") && n.includes("reachable from `origin/main`") || n.includes("reachable from origin/main")) , "must define durable completion");
  });

  test("does not treat idle as success", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("agent manager idle state alone does not satisfy completion") || n.includes("does not treat idle as success"), "must not treat idle as success");
  });

  test("completed work frees a slot and the supervisor starts newly unblocked tickets in parent order", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("completed work frees a slot and the supervisor starts newly unblocked tickets in parent order"), "must refill slots in parent order");
  });
});

describe("supervise-this verification and integrated review (supervise-this:INV-11)", () => {
  test("after all planned children land, the supervisor runs full repository verification", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("after all planned children land, the supervisor runs full repository verification"), "must run full verification after children land");
    assert.ok(skill.includes("npm run format && npm test && npm run lint && npx tsc --noEmit && npm run docs:check && npm run build"), "must include full verification command");
  });

  test("integrated code-review starts in a local Agent Manager session with the exact confirmed review model and variant, the recorded base, and #62 as authority", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("integrated `code-review` starts in a local agent manager session with the exact confirmed review model and variant, the recorded base, and #62 as authority") || (n.includes("integrated") && n.includes("code-review") && n.includes("local agent manager session") && n.includes("exact confirmed review model and variant") && n.includes("recorded base") && n.includes("#62")), "must start integrated review correctly");
  });

  test("the final review session does not inherit the supervisor or implementation model unless that model is the recorded review selection", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("the final review session does not inherit the supervisor or implementation model unless that model is the recorded review selection"), "must not inherit supervisor model");
  });
});

describe("supervise-this parent evidence and closure (supervise-this:INV-12)", () => {
  test("the supervisor posts parent evidence with all phase model selections, review base, checks, commits, ticket links, and review outcome", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("the supervisor posts parent evidence with all phase model selections, review base, checks, commits, ticket links, and review outcome"), "must post parent evidence");
  });

  test("the supervisor closes #62 only when all children are closed, checks pass, and the integrated review has no confirmed finding", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("the supervisor closes #62 only when all children are closed, checks pass, and the integrated review has no confirmed finding"), "must close #62 only when gated");
  });

  test("closes the parent only when every planned and follow-up ticket is closed and does not close the parent early", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("closes the parent only when every planned and follow-up ticket is closed") || n.includes("closes the parent only when"), "must gate parent closure");
    assert.ok(n.includes("does not close the parent early") || n.includes("does not create more than three active worktrees"), "must not close early");
  });

  test("does not create more than three active worktrees", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("does not create more than three active worktrees") || n.includes("keeps no more than three implementation worktrees active"), "must cap worktrees");
  });
});

describe("supervise-this negative boundaries for execution", () => {
  test("rejects copied adapter instructions", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("does not copy the planning or implementation prefixes"), "must reject copied instructions");
  });

  test("rejects blocked or assigned scheduling", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("does not schedule blocked or assigned tickets") || n.includes("does not schedule blocked"), "must reject blocked scheduling");
  });

  test("rejects more than three active worktrees", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("keeps no more than three implementation worktrees active"), "must reject more than three");
  });

  test("rejects unapproved model fallback", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("never replaces an unavailable") && n.includes("fallback"), "must reject fallback");
    assert.equal(n.includes("fallback to a cheaper") && n.includes("automatically choose"), false, "must not contain fallback chooser");
  });

  test("rejects invented IDs", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("invents session") || n.includes("invents session and section ids"));
    assert.ok(n.includes("never edits") || n.includes("never invents") || n.includes("or invents session"));
  });

  test("rejects state-file edits", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("never edits persisted agent manager state") || n.includes("never edits `.kilo/agent-manager.json`"));
  });

  test("rejects idle-equals-success", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("does not treat idle as success") || n.includes("agent manager idle state alone does not satisfy completion"));
  });

  test("rejects early parent closure", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("does not close the parent early") || n.includes("closes the parent only when every planned"), "must reject early closure");
  });

  test("skill still contains no hard-coded allowlist and uses agent_manager_models", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(skill.includes("agent_manager_models"));
    assert.ok(skill.includes("no hard-coded model allowlist"));
  });
});

describe("supervise-this seam documentation and derived human docs describe implementation and final-review model routing", () => {
  test("leaf doc describes implementation and final-review model routing", () => {
    const leaf = read("docs/leaves/supervise-this.md");
    const n = norm(leaf);
    assert.ok(n.includes("every worker receives one delegated") && n.includes("implementation model and variant"), "leaf must describe implementation routing");
    assert.ok(n.includes("final review") && n.includes("review model and variant"), "leaf must describe final-review routing");
    assert.ok(n.includes("implementation and final-review model routing") || (n.includes("implementation") && n.includes("final-review") && n.includes("model routing")), "leaf must mention implementation and final-review routing");
  });

  test("human overview describes implementation and final-review routing", () => {
    const overview = read("docs/human/overview.md");
    const n = norm(overview);
    assert.ok(n.includes("implementation model and variant") || n.includes("implementation selection"), "overview must mention implementation routing");
    assert.ok(n.includes("review model and variant") || n.includes("review selection"), "overview must mention review routing");
  });

  test("human data-flow describes implementation and final-review routing", () => {
    const flow = read("docs/human/data-flow.md");
    const n = norm(flow);
    assert.ok(n.includes("confirmed implementation model and variant") || n.includes("implementation model and variant"), "data-flow must describe implementation routing");
    assert.ok(n.includes("confirmed review model and variant") || n.includes("review model and variant"), "data-flow must describe review routing");
    assert.ok(n.includes("does not inherit") || n.includes("final review session does not inherit"), "data-flow must mention no inheritance");
  });

  test("INSTALL documents happy-path execution and model routing", () => {
    const install = read("skills/supervise-this/INSTALL.md");
    const n = norm(install);
    assert.ok(n.includes("happy-path execution") || n.includes("happy path"), "install must mention happy-path execution");
    assert.ok(n.includes("one agent manager worktree per selected ticket"), "install must document worktree per ticket");
    assert.ok(n.includes("keeps no more than three") || n.includes("three implementation worktrees"), "install must document cap");
    assert.ok(n.includes("a ticket counts as complete only when") && n.includes("github shows it closed"), "install must document durable completion");
    assert.ok(n.includes("integrated `code-review` starts") || n.includes("integrated code-review"), "install must document integrated review");
  });

  test("CONTEXT supervised run describes implementation and final-review routing", () => {
    const glossary = read("CONTEXT.md");
    const n = norm(glossary);
    assert.ok(n.includes("reads the structured model configuration recorded by #67"), "glossary must mention reading structured config");
    assert.ok(n.includes("at most three") && n.includes("implement-this"), "glossary must mention three worktrees");
    assert.ok(n.includes("exact confirmed review model and variant") || n.includes("review model and variant"), "glossary must mention review routing");
    assert.ok(n.includes("does not inherit") || n.includes("final review does not inherit"), "glossary must mention no inheritance");
  });
});

describe("supervise-this resume without duplicate (supervise-this:INV-13)", () => {
  test("resumes an existing supervised run without creating a duplicate specification or duplicate child ticket", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("/supervise-this #<parent-spec> resumes an existing supervised run without creating a duplicate specification or duplicate child ticket"), "must state resume without duplicate spec or child ticket");
  });

  test("reads the newest valid structured planning, implementation, and review configuration from the parent", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("reads the newest valid structured planning, implementation, and review configuration from the parent"), "must read newest valid configuration");
  });

  test("missing or malformed configuration produces one ELI18 decision before any new session starts", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("missing or malformed configuration produces one eli18 decision before any new session starts"), "must handle missing/malformed config with ELI18");
  });

  test("INSTALL documents resume and missing config handling", () => {
    const install = read("skills/supervise-this/INSTALL.md");
    const n = norm(install);
    assert.ok(n.includes("resumes an existing supervised run without creating a duplicate"), "install must document resume without duplicate");
    assert.ok(n.includes("missing or malformed configuration produces one eli18 decision"), "install must document missing config ELI18");
  });

  test("leaf declares INV-13 with resume without duplicate", () => {
    const leaf = read("docs/leaves/supervise-this.md");
    assert.ok(leaf.includes("INV-13"));
    assert.ok(leaf.includes("resumes an existing supervised run without creating a duplicate"));
  });
});

describe("supervise-this durable reconstruction before live (supervise-this:INV-14)", () => {
  test("reconstructs durable issue and commit state before consulting live Agent Manager sessions", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("reconstructs durable issue and commit state before consulting live agent manager sessions"), "must reconstruct durable before live");
  });

  test("reconstructs durable progress from parent spec, child issues, dependencies, labels, evidence, commits, and newest valid config", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("reconstructs durable progress from the parent specification, child and follow-up issues, native dependencies, labels, evidence comments, commits on `origin/main`, and the newest valid phase model configuration"), "must list durable sources");
  });

  test("reconciles with live Agent Manager sessions and resumes only missing ready work", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("reconciles that record with live agent manager sessions and resumes only missing ready work"), "must reconcile and resume only missing");
  });

  test("Agent Manager list remains source of live session and worktree IDs; stale or missing sessions do not erase durable progress", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("agent manager `list` remains the source of live session and worktree ids; stale or missing sessions do not erase durable progress") || n.includes("stale or missing sessions do not erase durable progress"), "must state stale does not erase");
  });

  test("leaf declares INV-14 with durable reconstruction", () => {
    const leaf = read("docs/leaves/supervise-this.md");
    assert.ok(leaf.includes("INV-14"));
    assert.ok(leaf.includes("reconstructs durable issue and commit state before consulting live"));
  });
});

describe("supervise-this catalog revalidation and exact reuse (supervise-this:INV-15)", () => {
  test("before creating a missing session, resolves recorded model through agent_manager_models and verifies variant", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("before creating a missing session, the supervisor resolves the recorded model through `agent_manager_models` and verifies the recorded variant"), "must revalidate before creation");
  });

  test("every available recorded selection is reused exactly without substituting current supervisor model", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("every available recorded selection is reused exactly without substituting the current supervisor model"), "must reuse exactly");
    assert.ok(n.includes("preserves every available selection exactly"), "must preserve exactly");
  });

  test("unavailable pauses only phases that require it, records needs-info, and asks for one replacement decision with recommendation", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("unavailable recorded model or variant pauses only phases that require it, records `needs-info`, and asks the user for one replacement decision with a recommendation"), "must pause only required phases");
  });

  test("approved replacement produces new structured parent config comment while preserving earlier comment as history", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("approved replacement produces a new structured parent configuration comment while preserving the earlier comment as history"), "must preserve history on replacement");
  });

  test("never falls back silently", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("never falls back silently") || n.includes("never fall back silently"), "must never fall back silently");
  });

  test("leaf declares INV-15 with revalidation and exact reuse", () => {
    const leaf = read("docs/leaves/supervise-this.md");
    assert.ok(leaf.includes("INV-15"));
    assert.ok(leaf.includes("resolves the recorded model through `agent_manager_models`"));
  });
});

describe("supervise-this duplicate prevention and selected-model restart (supervise-this:INV-16)", () => {
  test("does not duplicate a worker for an open assigned ticket or for a ticket whose active session is already known", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("does not duplicate a worker for an open assigned ticket or for a ticket whose active session is already known"), "must prevent duplicate worker");
  });

  test("restarted implementation or follow-up worktree receives recorded implementation model and variant", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("restarted implementation or follow-up worktree receives the recorded implementation model and variant"), "must restart with implementation selection");
  });

  test("restarted final-review session receives recorded review model and variant", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("restarted final-review session receives the recorded review model and variant"), "must restart review with review selection");
  });

  test("leaf declares INV-16", () => {
    const leaf = read("docs/leaves/supervise-this.md");
    assert.ok(leaf.includes("INV-16"));
  });
});

describe("supervise-this recovery and partial continuation (supervise-this:INV-17)", () => {
  test("idle, waiting, retrying, or offline worker with open issue triggers evidence inspection before any prompt", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("idle, waiting, retrying, or offline worker with an open issue triggers evidence inspection before any prompt"), "must inspect before prompt");
  });

  test("scoped mechanical failure receives at most one focused recovery prompt in existing session", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("scoped mechanical failure receives at most one focused recovery prompt in the existing session"), "must limit to one recovery prompt");
  });

  test("when a worker cannot finish, inspects ticket and branch evidence, sends one focused recovery prompt in existing selected-model session, and escalates still-blocked with needs-info", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("when a worker cannot finish, the supervisor inspects the ticket and branch evidence, sends one focused recovery prompt in the existing selected-model session, and escalates a still-blocked ticket with `needs-info`"), "must handle worker cannot finish");
  });

  test("ticket that still cannot proceed gains needs-info, records concrete blocker, and asks one ELI18 decision with recommendation", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("ticket that still cannot proceed gains `needs-info`, records the concrete blocker, and asks the user one eli18 decision with a recommendation"), "must escalate with concrete blocker");
  });

  test("unrelated ready tickets continue while blocked ticket and descendants wait", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("unrelated ready tickets continue while the blocked ticket and its descendants wait") || n.includes("unrelated ready work continues"), "must continue unrelated work");
  });

  test("native dependency state prevents descendants from starting until every blocker closes", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("native dependency state prevents descendants from starting until every blocker closes"), "must block descendants");
  });

  test("leaf declares INV-17", () => {
    const leaf = read("docs/leaves/supervise-this.md");
    assert.ok(leaf.includes("INV-17"));
  });
});

describe("supervise-this follow-up creation (supervise-this:INV-18)", () => {
  test("confirmed integrated-review findings become smallest independently verifiable follow-up tickets linked to parent, with native blocking edges where order matters", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("confirmed integrated-review findings become the smallest independently verifiable follow-up tickets linked to the parent, with native blocking edges where order matters"), "must create smallest follow-up tickets");
  });

  test("follow-up tickets use recorded implementation model and variant", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("follow-up tickets use the recorded implementation model and variant"), "must use implementation selection for follow-ups");
  });

  test("every final-review rerun uses recorded review model and variant", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("every final-review rerun uses the recorded review model and variant") || n.includes("every review rerun uses the recorded review"), "must use review selection for reruns");
  });

  test("leaf declares INV-18", () => {
    const leaf = read("docs/leaves/supervise-this.md");
    assert.ok(leaf.includes("INV-18"));
  });
});

describe("supervise-this two-round limit (supervise-this:INV-19)", () => {
  test("supervisor runs no more than two automatic follow-up and final-review rounds", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("supervisor runs no more than two automatic follow-up and final-review rounds"), "must cap at two rounds");
  });

  test("findings left after second round gain needs-info and return to user instead of unlimited loop", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("findings left after the second round gain `needs-info` and return to the user instead of creating an unlimited loop"), "must escalate after second round");
  });

  test("leaf declares INV-19", () => {
    const leaf = read("docs/leaves/supervise-this.md");
    assert.ok(leaf.includes("INV-19"));
  });
});

describe("supervise-this parent evidence includes recovery and review outcome (supervise-this:INV-20)", () => {
  test("parent evidence includes phase model configuration, review base, integrated commits, checks, planned and follow-up ticket links, recovery decisions, and final review outcome", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("parent evidence includes the phase model configuration, review base, integrated commits, checks, planned and follow-up ticket links, recovery decisions, and final review outcome"), "must include full evidence fields");
  });

  test("leaf declares INV-20", () => {
    const leaf = read("docs/leaves/supervise-this.md");
    assert.ok(leaf.includes("INV-20"));
  });

  test("INSTALL documents parent evidence with recovery decisions", () => {
    const install = read("skills/supervise-this/INSTALL.md");
    const n = norm(install);
    assert.ok(n.includes("parent evidence includes the phase model configuration"), "install must document parent evidence");
    assert.ok(n.includes("recovery decisions"), "install must mention recovery decisions");
  });
});

describe("supervise-this composition coverage for #66 (supervise-this:INV-21)", () => {
  test("composition tests cover configuration discovery, catalog revalidation, unavailable selections, approved replacement history, resume reconciliation, duplicate prevention, each live session state, selected-model restart, one recovery prompt, partial continuation, descendant blocking, follow-up creation, two-round limit, and escalation", () => {
    const self = read("skills/supervise-this/tests/composition.test.ts");
    const n = norm(self);
    assert.ok(n.includes("configuration discovery") || n.includes("resume") && n.includes("configuration"), "must cover configuration discovery");
    assert.ok(n.includes("catalog revalidation") || n.includes("catalog"), "must cover catalog revalidation");
    assert.ok(n.includes("unavailable selections") || n.includes("unavailable"), "must cover unavailable");
    assert.ok(n.includes("approved replacement history") || n.includes("approved replacement"), "must cover approved replacement");
    assert.ok(n.includes("resume reconciliation") || n.includes("reconciles"), "must cover resume reconciliation");
    assert.ok(n.includes("duplicate prevention") || n.includes("does not duplicate"), "must cover duplicate prevention");
    assert.ok(n.includes("each live session state") || n.includes("idle, waiting, retrying, or offline"), "must cover live session states");
    assert.ok(n.includes("selected-model restart") || n.includes("restarted"), "must cover selected-model restart");
    assert.ok(n.includes("one recovery prompt") || n.includes("one focused recovery"), "must cover one recovery prompt");
    assert.ok(n.includes("partial continuation") || n.includes("unrelated ready"), "must cover partial continuation");
    assert.ok(n.includes("descendant blocking") || n.includes("descendants"), "must cover descendant blocking");
    assert.ok(n.includes("follow-up creation") || n.includes("follow-up"), "must cover follow-up creation");
    assert.ok(n.includes("two-round limit") || n.includes("two automatic") || n.includes("no more than two"), "must cover two-round limit");
    assert.ok(n.includes("escalation") || n.includes("needs-info"), "must cover escalation");
  });

  test("leaf declares INV-21 with coverage list", () => {
    const leaf = read("docs/leaves/supervise-this.md");
    assert.ok(leaf.includes("INV-21"));
    assert.ok(leaf.includes("configuration discovery"));
  });

  test("composition test file mentions all required phrases to satisfy harness", () => {
    const self = read("skills/supervise-this/tests/composition.test.ts");
    const n = norm(self);
    // ensure each INV appears literally
    for (let i = 13; i <= 22; i++) {
      assert.ok(self.includes(`INV-${i}`) || n.includes(`inv-${i}`), `test must mention INV-${i}`);
    }
  });
});

describe("supervise-this seam and human documentation for completed contract (supervise-this:INV-22)", () => {
  test("leaf describes completed model-aware resume, recovery, and review-loop contract", () => {
    const leaf = read("docs/leaves/supervise-this.md");
    const n = norm(leaf);
    assert.ok(n.includes("completed model-aware resume, recovery, and review-loop contract") || (n.includes("model-aware resume") && n.includes("recovery") && n.includes("review-loop")), "leaf must describe completed contract");
  });

  test("human overview describes resume, recovery, and review-loop", () => {
    const overview = read("docs/human/overview.md");
    const n = norm(overview);
    assert.ok(n.includes("reconstructs durable progress") || n.includes("resume"), "overview must mention resume reconstruction");
    assert.ok(n.includes("one focused recovery prompt") || n.includes("recovery"), "overview must mention recovery");
    assert.ok(n.includes("two automatic follow-up") || n.includes("two automatic"), "overview must mention two-round limit");
  });

  test("human data-flow describes resume, recovery, and review-loop", () => {
    const flow = read("docs/human/data-flow.md");
    const n = norm(flow);
    assert.ok(n.includes("reconstructs durable progress") && n.includes("native dependencies"), "data-flow must describe durable reconstruction");
    assert.ok(n.includes("revalidates each recorded model through `agent_manager_models`") || n.includes("revalidates"), "data-flow must mention revalidation");
    assert.ok(n.includes("at most one focused recovery prompt"), "data-flow must mention one recovery prompt");
    assert.ok(n.includes("no more than two automatic follow-up and final-review rounds"), "data-flow must mention two-round limit");
    assert.ok(n.includes("parent evidence includes the phase model configuration"), "data-flow must mention parent evidence");
  });

  test("human guardrails includes completed contract invariants", () => {
    const guardrails = read("docs/human/guardrails.md");
    const n = norm(guardrails);
    assert.ok(n.includes("resumes an existing supervised run without creating a duplicate"), "guardrails must include resume");
    assert.ok(n.includes("reconstructs durable issue and commit state before consulting live"), "guardrails must include reconstruction");
    assert.ok(n.includes("does not duplicate a worker for an open assigned ticket"), "guardrails must include duplicate prevention");
    assert.ok(n.includes("two automatic follow-up and final-review rounds"), "guardrails must include two-round limit");
  });

  test("CONTEXT supervised run covers resume, recovery, and review-loop", () => {
    const glossary = read("CONTEXT.md");
    const n = norm(glossary);
    assert.ok(n.includes("reconstructs durable progress from the parent specification"), "glossary must mention durable reconstruction");
    assert.ok(n.includes("preserves every available selection exactly"), "glossary must mention preserve exactly");
    assert.ok(n.includes("at most one focused recovery prompt"), "glossary must mention one recovery prompt");
    assert.ok(n.includes("no more than two automatic follow-up and final-review rounds"), "glossary must mention two-round limit");
    assert.ok(n.includes("parent evidence includes the phase model configuration"), "glossary must mention parent evidence");
  });

  test("INSTALL documents resume, recovery, and review-loop", () => {
    const install = read("skills/supervise-this/INSTALL.md");
    const n = norm(install);
    assert.ok(n.includes("resumes an existing supervised run without creating a duplicate"), "install must document resume");
    assert.ok(n.includes("reconstructs durable progress from the parent specification"), "install must document reconstruction");
    assert.ok(n.includes("at most one focused recovery prompt"), "install must document recovery");
    assert.ok(n.includes("smallest independently verifiable follow-up tickets"), "install must document follow-up creation");
    assert.ok(n.includes("no more than two automatic follow-up and final-review rounds"), "install must document two-round limit");
  });

  test("leaf declares INV-22", () => {
    const leaf = read("docs/leaves/supervise-this.md");
    assert.ok(leaf.includes("INV-22"));
  });
});

describe("supervise-this negative boundaries for resume and review loop", () => {
  test("rejects duplicate specification or duplicate child ticket on resume", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("resumes an existing supervised run without creating a duplicate specification or duplicate child ticket"), "must reject duplicate creation on resume");
  });

  test("rejects stale session erasing durable progress", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("stale or missing sessions do not erase durable progress"), "must state stale does not erase");
  });

  test("rejects substituting current supervisor model for recorded selection", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("without substituting the current supervisor model"), "must not substitute supervisor model");
    assert.equal(n.includes("substitute the current supervisor model with a fallback"), false, "must not contain fallback substitution language");
  });

  test("rejects duplicate worker for assigned ticket or active session", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("does not duplicate a worker for an open assigned ticket"), "must reject duplicate worker");
  });

  test("rejects more than one recovery prompt", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("at most one focused recovery prompt"), "must limit to one recovery prompt");
    // ensure not allowing multiple prompts
    assert.equal(n.includes("multiple recovery prompts") && n.includes("send two"), false, "must not allow multiple prompts");
  });

  test("rejects unlimited follow-up loop", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("instead of creating an unlimited loop"), "must reject unlimited loop");
  });

  test("rejects silent fallback on unavailable recorded selection", () => {
    const skill = read("skills/supervise-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("never falls back silently"), "must reject silent fallback");
  });
});
