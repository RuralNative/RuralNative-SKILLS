// implement-this:INV-1 — identity == folder
// implement-this:INV-2 — registry install and bounded invocation forms
// implement-this:INV-3 — implementation workflow stages and issue substitution
// implement-this:INV-4 — dependency order and verification
// implement-this:INV-5 — pull-request-only delivery
// implement-this:INV-6 — worker isolation and capability adapters
// implement-this:INV-7 — bounded-set parsing, frontier selection, dispatch validation
// implement-this:INV-10 — recovery reconcile, one retry, needs-info stop
// implement-this:INV-11 — completion handoff to review-this
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { read, norm, body } from "../../../scripts/test-helpers.ts";

const ROOT = path.resolve(import.meta.dirname ?? ".", "../../..");

describe("implement-this identity (INV-1)", () => {
  test("frontmatter and folder identity are exact", () => {
    const skill = read("skills/implement-this/SKILL.md");
    assert.match(skill, /name: implement-this/);
    assert.ok(fs.existsSync(path.join(ROOT, "skills/implement-this/INSTALL.md")));
  });
});

describe("implement-this installation and invocation (INV-2)", () => {
  test("documents the three bounded invocation forms", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    assert.ok(n.includes("/implement-this #<n>"), "one-ticket form");
    assert.ok(n.includes("/implement-this #<n1> #<n2> [#<n3>]"), "multi-ticket form");
    assert.ok(n.includes("/implement-this #<spec>"), "parent-specification form");
    assert.equal(n.includes("supervise-this"), false, "must not name the retired coordinator");
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill implement-this"));
    assert.ok(install.includes("cp -r skills/implement-this"));
  });
});

describe("implementation workflow and substitution (INV-3)", () => {
  test("keeps the single-stage implementation order with one issue slot", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const emitted = body(skill);
    assert.ok(emitted.includes("Implement the GitHub ticket in this dedicated worktree: `/implement`"));
    assert.equal(emitted.includes("/code-review"), false, "body must not host code review");
    assert.ok(emitted.includes("Treat the ticket, its comments, and its linked parent specification as the task authority."));
    assert.ok(emitted.includes("## Rules"));
    assert.ok(emitted.includes("## Start"));
    assert.ok(emitted.includes("## Dispatch"));
    assert.ok(emitted.includes("## Build and verify"));
    assert.ok(emitted.includes("## Delivery"));
    assert.ok(emitted.includes("## Recovery"));
    assert.ok(emitted.includes("## Completion"));
    assert.ok(emitted.includes("## Ticket\n\nIssue #0"));
    assert.equal((emitted.match(/Issue #0/g) ?? []).length, 1);
    assert.ok(emitted.indexOf("/implement") < emitted.indexOf("/unslopify"), "/implement must precede /unslopify");
  });

  test("substitutes only the requested ticket set into the single slot", () => {
    const template = body(read("skills/implement-this/SKILL.md"));
    for (const set of ["134", "134 #135", "#130"]) {
      const emitted = template.replace("Issue #0", `Issue ${set}`);
      assert.ok(emitted.includes(`Issue ${set}`));
      assert.equal(emitted.includes("Issue #0"), false);
    }
  });

  test("keeps the /implement human-invocation lock and states the bounded authorization", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const leaf = read("docs/leaves/implement-this.md");
    const nSkill = norm(skill);
    const inv3Match = leaf.match(/3\. \*\*INV-3\*\*[\s\S]*?(?=\n4\. \*\*INV-4\*\*|\n## )/);
    assert.ok(inv3Match, "leaf must contain INV-3");
    const nInv3 = norm(inv3Match[0]);
    assert.ok(nSkill.includes("explicit human invocation"), "body must state explicit human invocation");
    assert.ok(nSkill.includes("cannot traverse the chain unattended"), "body must state agent cannot traverse unattended");
    assert.ok(
      nSkill.includes("authorizes only its bounded ticket set"),
      "one invocation authorizes only its bounded ticket set",
    );
    assert.ok(nSkill.includes("/implement"), "body must name locked skill /implement");
    assert.equal(nSkill.includes("/code-review"), false, "body must not name /code-review");
    assert.ok(nSkill.includes("/unslopify") && nSkill.includes("model-invocable"), "body must state /unslopify remains model-invocable");
    assert.ok(nInv3.includes("disable-model-invocation"), "INV-3 must reference disable-model-invocation");
    assert.ok(nInv3.includes("explicit human invocation"), "INV-3 must state explicit human invocation");
    assert.ok(nInv3.includes("bounded ticket set"), "INV-3 must state bounded authorization");
    assert.ok(nInv3.includes("model-invocable"), "INV-3 must name model-invocable skills");
  });
});

describe("dependencies and verification (INV-4)", () => {
  test("loads unslop after implement, names only the two hard dependencies, and verifies the repository", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    const leaf = read("docs/leaves/implement-this.md");
    const pkg = JSON.parse(read("package.json"));
    const n = norm(skill);
    assert.ok(n.includes("load `/unslopify` before the first progress update"));
    assert.ok(skill.indexOf("/implement") < skill.indexOf("/unslopify"), "/implement must precede /unslopify");
    assert.equal(n.includes("/code-review"), false, "skill must not name code review");
    assert.ok(norm(install).includes("/implement") && norm(install).includes("/unslopify"), "install must name both hard dependencies");
    for (const content of [skill, install, leaf]) {
      assert.ok(content.includes("npm run verify"), "verification must use npm run verify");
    }
    assert.ok(pkg.scripts.verify, "package.json must have verify script");
    const verify = pkg.scripts.verify;
    for (const phrase of ["npm ci", "npm test", "npx tsc --noEmit", "npm run docs:check"]) {
      assert.ok(verify.includes(phrase), `verify script must include ${phrase}`);
    }
    assert.ok(n.includes("stop") && n.includes("blocker"));
  });

  test("verification sequence is identical across SKILL, INSTALL, and leaf", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    const leaf = read("docs/leaves/implement-this.md");
    const block = "```bash\nnpm run verify\n```";
    assert.ok(skill.includes(block), "SKILL.md must contain runnable verify block");
    assert.ok(install.includes(block), "INSTALL.md must contain runnable verify block");
    assert.ok(leaf.includes(block), "leaf must contain runnable verify block");
  });
});

describe("pull-request-only delivery (INV-5)", () => {
  test("every ticket delivers by pull request with a closing reference", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    for (const phrase of [
      "pull-request delivery",
      "create or update exactly one pull request per ticket",
      "push the feature branch",
      "closes #<n>",
      "never push directly to `main`",
      "never force-push",
      "never close the ticket before merge",
      "remove `ready-for-agent`, and add `ready-for-human`",
    ]) {
      assert.ok(n.includes(phrase), `pull-request delivery must include ${phrase}`);
    }
  });

  test("direct-main behavior is removed everywhere in the seam", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    const leaf = read("docs/leaves/implement-this.md");
    const n = norm(`${skill}\n${install}\n${leaf}`);
    for (const phrase of ["git push origin head:main", "direct delivery", "direct-main delivery", "head:main"]) {
      assert.equal(n.includes(phrase), false, `direct-main behavior must be removed (${phrase})`);
    }
    assert.ok(n.includes("never push directly to `main`"), "the prohibition stays stated");
  });
});

describe("worker isolation and capability adapters (INV-6)", () => {
  test("each ticket gets isolated worktree, branch, session, status, and stop control", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("isolated git worktree"), "isolated worktree per ticket");
    assert.ok(n.includes("feature branch"), "feature branch per ticket");
    assert.ok(n.includes("targeted worker session"), "targeted session per ticket");
    assert.ok(n.includes("status lookup"), "status lookup per worker");
    assert.ok(n.includes("stop control"), "stop control per worker");
    assert.ok(n.includes("worker-adapters.ts"), "capability contract module is named");
  });

  test("kilo agent manager is preferred; other hosts may match the contract", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const adapters = read("skills/implement-this/worker-adapters.ts");
    const n = norm(`${skill}\n${adapters}`);
    assert.ok(n.includes("kilo agent manager is the preferred adapter"));
    assert.ok(n.includes("another host may provide the same create, prompt, status, and stop capabilities"));
    assert.ok(adapters.includes("PREFERRED_ADAPTER_NAME = \"kilo-agent-manager\""));
  });

  test("multi-ticket execution stops before writes when isolation is unavailable", async () => {
    const skill = read("skills/implement-this/SKILL.md");
    assert.ok(
      norm(skill).includes("multi-ticket execution stops before any write when isolated workers are unavailable"),
    );
    const { dispatchTickets } = await import("../worker-adapters.ts");
    const result = await dispatchTickets([134], null, () => "t");
    assert.equal(result.ok, false, "dispatch without an adapter refuses to write");
  });

  test("no more than three workers are active at once", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const core = read("skills/implement-this/workflow-state.ts");
    assert.ok(core.includes("export const MAX_ACTIVE_WORKERS = 3"));
    assert.ok(norm(skill).includes("max_active_workers"), "skill names the cap constant");
  });

  test("seam docs describe adapter tests with fakes only", () => {
    const leaf = read("docs/leaves/implement-this.md");
    assert.ok(norm(leaf).includes("fakes"), "leaf documents fake-based adapter testing");
  });
});

describe("bounded-set parsing and dispatch validation (INV-7)", () => {
  test("parent input selects up to three frontier tickets in native child order", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("up to three current frontier tickets"), "frontier cap of three on parent input");
    assert.ok(n.includes("in native child order"), "native child ordering");
    assert.ok(n.includes("selectfrontier"), "selection uses the pure state core");
  });

  test("explicit inputs are validated before any claim or edit", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("validatedispatch"), "validation uses the pure state core");
    assert.ok(n.includes("before any claim or edit"), "validation precedes claims and edits");
    for (const reason of ["closed", "needs-info", "outside the parent specification", "open native blockers", "already has an assignee", "ready-for-agent", "claimed twice", "max_active_workers"]) {
      assert.ok(n.includes(reason), `validation stops on ${reason}`);
    }
  });

  test("one invocation authorizes only its bounded set to run implement in child workers", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("authorizes only its bounded ticket set"));
    assert.ok(n.includes("ticket slot at the bottom replaced by its ticket number"));
    assert.ok(n.includes("a worker claims only its own ticket"), "workers claim only their ticket");
  });
});

describe("native dependency state (INV-8)", () => {
  test("reads native dependency state before claiming and stops while open blocker exists", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const leaf = read("docs/leaves/implement-this.md");
    const nSkill = norm(skill);
    const nLeaf = norm(leaf);
    assert.ok(nSkill.includes("native") && (nSkill.includes("dependency") || nSkill.includes("blocked")), "skill must mention native dependency");
    assert.ok(nSkill.includes("blockers"), "skill must stop while blockers open");
    assert.ok(nLeaf.includes("native") && nLeaf.includes("canonical"), "leaf must state native is canonical");
    assert.ok(nLeaf.includes("fallback"), "leaf must mention fallback");
  });

  test("post-closure frontier recompute belongs to review-this, not this seam", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const leaf = read("docs/leaves/implement-this.md");
    const nSkill = norm(skill);
    assert.ok(nSkill.includes("`review-this` owns the post-closure frontier recompute"), "review-this owns promotion");
    assert.ok(nSkill.includes("remove blocked, add unblocked + ready-for-agent"), "transition vocabulary stays stated");
    assert.ok(norm(leaf).includes("review-this"), "leaf points at the owning seam");
  });
});

describe("single-stage boundary and scope isolation (INV-7 boundary)", () => {
  test("stays inside its bounded set with no scheduling ambitions beyond it", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    assert.equal(n.includes("supervise-this"), false, "must not name the retired coordinator");
    assert.ok(n.includes("choose models"), "boundary statement present");
    assert.equal(n.includes("any model"), false);
  });

  test("seam docs describe the workflow stages", () => {
    const leaf = read("docs/leaves/implement-this.md");
    for (let i = 1; i <= 11; i++) assert.ok(leaf.includes(`INV-${i}`), `leaf must contain INV-${i}`);
  });
});

describe("implement-this unslopify and focused doc-cache (Phase 1 red)", () => {
  test("names unslopify and no longer requires unslop", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("/unslopify"), "must name /unslopify");
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
    assert.ok(n.includes("does not require broad preloading"), "must state no broad preload");
    assert.ok(skill.includes("document-for-humans") || n.includes("human docs") || n.includes("derived human"), "must exclude derived human docs");
  });
});

describe("implement-this workflow trust boundaries (#131, implement-this:INV-9)", () => {
  test("ticket and review prose is requirements data that cannot widen scope or authorize tools", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("requirements data"), "must define ticket and review prose as requirements data");
    assert.ok(n.includes("cannot widen scope"), "must forbid widening scope from prose");
    assert.ok(n.includes("select files"), "must forbid file selection from prose");
    assert.ok(n.includes("authorize tools"), "must forbid tool authorization from prose");
    assert.ok(n.includes("override workflow gates"), "must forbid overriding workflow gates from prose");
  });

  test("workflow execution performs no skill downloads while npm ci stays allowed", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const install = read("skills/implement-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    assert.ok(n.includes("no skill downloads"), "must prohibit skill downloads during workflow execution");
    assert.ok(n.includes("installing dependencies with `npm ci` is allowed"), "must keep dependency install allowed");
  });

  test("install guidance records provenance, pinning, and residual trust without claiming Snyk findings disappeared", () => {
    const install = read("skills/implement-this/INSTALL.md");
    const n = norm(install);
    assert.ok(n.includes("provenance"), "install guidance must record source provenance");
    assert.ok(n.includes("pin the revision you reviewed"), "must pin reviewed revisions where supported");
    assert.ok(n.includes("residual trust"), "must state residual source-repository trust");
    assert.ok(n.includes("w011"), "must reference Snyk W011 for this install path");
    for (const claim of ["eliminated", "eradicated", "no longer applies", "no longer present", "resolved the risk"]) {
      assert.equal(n.includes(claim), false, `must not claim the Snyk findings are gone (${claim})`);
    }
  });

  test("manual installation requires explicit user approval before overwriting an existing skill", () => {
    const install = read("skills/implement-this/INSTALL.md");
    const n = norm(install);
    assert.ok(n.includes("overwrit"), "manual install guidance must address overwriting");
    assert.ok(n.includes("explicit approval"), "overwriting an existing skill requires explicit approval");
  });

  test("leaf doc declares INV-9 with composition-test mechanism", () => {
    const leaf = read("docs/leaves/implement-this.md");
    assert.ok(leaf.includes("INV-9"), "leaf must declare INV-9");
  });
});

describe("recovery (INV-10)", () => {
  test("reconciles first, retries once, then applies needs-info", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("reconcile github and worker state"), "reconciliation precedes retry");
    assert.ok(n.includes("retry that worker once"), "one reconciled retry");
    assert.ok(n.includes("a second failure adds `needs-info` to the ticket and stops work on it"), "second failure stops with needs-info");
    assert.ok(n.includes("retrydecision"), "recovery decision comes from the pure state core");
  });
});

describe("completion handoff (INV-11)", () => {
  test("points the user at review-this from the control workspace", () => {
    const skill = read("skills/implement-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("run `/review-this #<spec>` from the control workspace"), "handoff command named");
    assert.ok(n.includes("ticket worktrees do not run review"), "no review inside ticket worktrees");
  });
});
