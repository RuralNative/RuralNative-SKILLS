// review-this:INV-1 — identity == folder
// review-this:INV-2 — registry-lane install, manual copy, and explicit spec invocation
// review-this:INV-3 — fixed-template boundary with single ## Spec slot and discovery phrasing
// review-this:INV-4 — hard dependencies /code-review and /unslopify in order with unslopify contracts and focused doc-cache route
// review-this:INV-5 — discovery contract: current review wave from parent spec
// review-this:INV-6 — cloud and local review contract
// review-this:INV-7 — finding reconciliation with axes separate
// review-this:INV-8 — freshness and merge gates
// review-this:INV-9 — squash-merge and dependent promotion
// review-this:INV-10 — final verification and parent closure
// review-this:INV-11 — state and adapter boundaries for future coordinator
// review-this:INV-12 — trust precedence and install boundary
// review-this:INV-13 — persistent PR fixes, delta rereview, and bounded verification
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

describe("review-this identity (review-this:INV-1)", () => {
  test("folder and frontmatter identity are exactly review-this", () => {
    const skill = read("skills/review-this/SKILL.md");
    assert.ok(skill.includes("name: review-this"), "frontmatter name must be exactly review-this");
    assert.ok(fs.existsSync(path.join(ROOT, "skills/review-this/SKILL.md")));
    assert.ok(fs.existsSync(path.join(ROOT, "skills/review-this/INSTALL.md")));
    const match = skill.match(/name:\s*review-this/);
    assert.ok(match, "frontmatter name must match folder review-this");
  });

  test("does not modify sibling seams or delegated repository-owned skills", () => {
    const unslopify = read("skills/unslopify/SKILL.md");
    assert.equal(unslopify.includes("review-this"), false, "unslopify must not be modified to mention review-this");
    const planThis = read("skills/plan-this/SKILL.md");
    assert.ok(planThis.includes("name: plan-this"));
  });
});

describe("review-this discovery and installation (review-this:INV-2)", () => {
  test("description declares explicit invocation /review-this #<spec>", () => {
    const skill = read("skills/review-this/SKILL.md");
    assert.ok(skill.includes("/review-this #<spec>"), "description must declare explicit invocation /review-this #<spec>");
  });

  test("registry-lane install guidance present with exact command and manual copy", () => {
    const install = read("skills/review-this/INSTALL.md");
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill review-this"));
    assert.ok(install.includes("cp -r skills/review-this"));
    const skill = read("skills/review-this/SKILL.md");
    assert.equal(skill.includes("npx skills add RuralNative/RuralNative-SKILLS --skill review-this"), false, "trimmed SKILL.md must not duplicate install command");
  });

  test("architecture index and leaf doc describe the new seam (review-this:INV-2)", () => {
    const arch = read("ARCHITECTURE.md");
    assert.ok(arch.includes("review-this"), "ARCHITECTURE seam table must list review-this");
    assert.ok(arch.includes("skills/review-this/"));
    assert.ok(arch.includes("docs/leaves/review-this.md"));
    assert.ok(fs.existsSync(path.join(ROOT, "docs/leaves/review-this.md")));
    const leaf = read("docs/leaves/review-this.md");
    for (let i = 1; i <= 13; i++) assert.ok(leaf.includes(`INV-${i}`), `leaf must contain INV-${i}`);
  });
});

describe("review-this fixed template and spec substitution (review-this:INV-3)", () => {
  test("preserves review prefix and substitutes only the spec under ## Spec", () => {
    const skill = read("skills/review-this/SKILL.md");
    const body = getBody(skill);
    assert.ok(body.includes("Review the parent specification's pull-request wave: `/code-review`"));
    assert.ok(body.includes("## Rules"));
    assert.ok(body.trimEnd().endsWith("Issue #0"), "body must end with Issue #0 spec slot");
    // Count heading lines that are exactly "## Spec" (not references like "under ## Standards and ## Spec")
    const headingCount = body.split("\n").filter((l) => l.trim() === "## Spec").length;
    assert.equal(headingCount, 1, "body must contain ## Spec heading exactly once");
    const lastIdx = body.lastIndexOf("## Spec");
    const slotBody = body.slice(lastIdx + "## Spec".length).trim();
    assert.equal(slotBody, "Issue #0", "slot must host only Issue #0, nothing else");
    // single slot hosting only the spec text
    const emitted = body.trimEnd().replace("Issue #0", "Issue #130");
    assert.ok(emitted.includes("Issue #130"));
    assert.equal(emitted.includes("Issue #0"), false);
  });

  test("discovers native child tickets, linked pull requests, blockers, checks, reviews, current head SHAs", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("native child tickets"), "must mention native child tickets");
    assert.ok(n.includes("linked pull requests"), "must mention linked pull requests");
    assert.ok(n.includes("blockers"), "must mention blockers");
    assert.ok(n.includes("checks"), "must mention checks");
    assert.ok(n.includes("reviews"), "must mention reviews");
    assert.ok(n.includes("current head sha"), "must mention current head SHAs");
    assert.ok(n.includes("selects only the current review wave and runs once from the control workspace"));
  });

  test("trimmed shape rejects wrapper phrases and avoids extra machinery", () => {
    const skill = read("skills/review-this/SKILL.md");
    const body = getBody(skill);
    assert.equal(skill.includes("Rules preserved"), false, "must not contain Rules preserved");
    assert.equal(skill.includes("## Installation"), false, "must not contain ## Installation");
    assert.equal(skill.includes("## Boundary"), false, "must not contain ## Boundary");
    assert.equal(body.includes("## Hard dependencies"), false, "body must not contain ## Hard dependencies wrapper");
    assert.equal(skill.includes("## Fixed point:"), false, "new skill must not contain old ## Fixed point:");
    const files = fs.readdirSync(path.join(ROOT, "skills/review-this"));
    assert.ok(!files.includes("scripts"), "must not add scripts directory");
    assert.ok(!fs.existsSync(path.join(ROOT, "skills/review-this/package.json")), "no npm package");
    assert.ok(!fs.existsSync(path.join(ROOT, ".kilo/command/review-this.md")), "must not add .kilo command file");
  });
});

describe("review-this hard dependencies and workflow order (review-this:INV-4)", () => {
  test("declares /code-review and /unslopify in order with unslopify before first progress update", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("/unslopify"));
    assert.ok(n.includes("/code-review"));
    assert.ok(n.includes("before the first progress update"));
    const body = getBody(skill);
    const idxReview = body.indexOf("/code-review");
    const idxUnslopify = body.indexOf("/unslopify");
    assert.ok(idxReview !== -1 && idxUnslopify !== -1 && idxReview < idxUnslopify, "body must name /code-review before /unslopify loads");
    const frontmatter = skill.slice(0, skill.indexOf("---", 3) + 3);
    assert.ok(frontmatter.includes("/code-review") && frontmatter.includes("/unslopify"), "frontmatter must declare both hard dependencies");
    assert.ok(n.includes("protected-content") || n.includes("protected content"), "must name protected-content contract");
    assert.ok(n.includes("preservation"), "must name preservation contract");
    assert.ok(n.includes("completion report"), "must require completion report");
    assert.ok(n.includes("scope"), "must name scope contract");
  });

  test("code-review stays model-invocable and focused doc-cache route excludes derived human docs", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("no `disable-model-invocation` lock") || n.includes("disable-model-invocation"), "must state the invocation-lock status of /code-review");
    assert.ok(n.includes("model-invocable"), "must state /code-review remains model-invocable");
    assert.ok(skill.includes("AGENTS.md"));
    assert.ok(skill.includes("ARCHITECTURE.md"));
    assert.ok(skill.includes("CONTEXT.md"));
    assert.ok(skill.includes("docs/leaves/") || n.includes("seam leaf"));
    assert.ok(n.includes("adr"));
    assert.ok(n.includes("document-for-humans") || n.includes("human docs"), "must exclude derived human docs");
  });
});

describe("review-this discovery contract (review-this:INV-5)", () => {
  test("resolves the invocation target before any write with normalizeReference and resolveReviewTarget", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("normalizereference"), "must name normalizeReference from targets.ts");
    assert.ok(n.includes("resolvereviewtarget"), "must name resolveReviewTarget from targets.ts");
    assert.ok(n.includes("/review-this 100` and `/review-this #100` normalize to the same repository number"), "bare and hash references must normalize identically");
    assert.ok(n.includes("cross-repository target stops before any write unless the user explicitly chose that repository"), "cross-repository targets stop before writes");
    assert.ok(n.includes("malformed-reference") && n.includes("target-not-found") && n.includes("closed-pull-request") && n.includes("standalone-issue-without-pull-request") && n.includes("ambiguous-pull-requests"), "named diagnostic states must be listed");
    assert.ok(n.includes("no review or fix worktree intent exists for an invalid or ambiguous target"));
    assert.ok(n.includes("performs no network, git, filesystem, agent manager, or github writes"), "the resolver returns facts and decisions only");
    assert.ok(n.includes("a pull request without an originating specification produces a standards-only plan, reports spec unavailable, and cannot auto-merge"));
  });

  test("selectReviewWave discovers only the current wave pinned to current head SHA", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("selectreviewwave"), "must name selectReviewWave from discovery.ts");
    assert.ok(n.includes("open pull request"), "must describe open pull requests");
    assert.ok(n.includes("native child order"), "must preserve native child order");
    assert.ok(n.includes("current head sha"), "must pin to current head SHA");
  });

  test("readiness comes from PR facts, not ready-for-human, which keeps its triage meaning", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("review readiness comes from an open pull request, a valid closing reference, current head and base revisions, and posted implementation acceptance evidence"));
    assert.ok(n.includes("`ready-for-human` keeps its triage meaning and is never pull-request readiness"));
    assert.ok(n.includes("never selects an already-reviewed unchanged head-and-base pair twice"));
  });
});

describe("review-this cloud and local review contract (review-this:INV-6)", () => {
  test("collects Kilo cloud summary and inline comments for current head when available", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("kilo cloud"), "must mention Kilo cloud");
    assert.ok(n.includes("inline comments"), "must mention inline comments");
    assert.ok(n.includes("current head"), "must mention current head");
    assert.ok(n.includes("when available"), "must mention when available");
    assert.ok(n.includes("available") && n.includes("unavailable"));
  });

  test("local Standards and Spec always runs; cloud absence, failure, or timeout is recorded and does not block a complete local review", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("local standards and spec review") && n.includes("always runs") || n.includes("always run the local standards and spec review"), "must state local review always runs");
    assert.ok(
      n.includes("cloud review absence, failure, or timeout is recorded and does not block a complete local review") ||
        (n.includes("unavailable") && (n.includes("does not block") || n.includes("never blocks"))),
    );
    assert.ok(n.includes("cloud review") && n.includes("unavailable"));
  });

  test("spawns Standards and Spec sub-agents in parallel without merging or reranking", () => {
    const skill = read("skills/review-this/SKILL.md");
    const body = getBody(skill);
    assert.ok(body.includes("Spawn the Standards and Spec sub-agents in parallel"));
    assert.ok(body.includes("Never merge or rerank findings across axes"));
    assert.ok(body.includes("`## Standards`") && body.includes("`## Spec`"));
  });
});

describe("review-this reconciliation (review-this:INV-7)", () => {
  test("reconciles cloud, Standards, and Spec against each current head while keeping axes separate", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("reconcilefindings"), "must name reconcileFindings from reconciliation.ts");
    assert.ok(n.includes("keep standards and spec axes separate") || n.includes("keeping standards and spec axes separate"));
  });

  test("rejects duplicate, stale, out-of-scope, and unverified findings with evidence", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("duplicate, stale, out-of-scope, and unverified findings are rejected with evidence"));
    assert.ok(n.includes("duplicate"));
    assert.ok(n.includes("stale"));
    assert.ok(n.includes("out-of-scope") || n.includes("out of scope"));
    assert.ok(n.includes("unverified"));
  });

  test("confirmed findings use a fresh fix context inside the persistent PR worktree", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("one fresh fix subagent inside the same pr worktree per round"));
    assert.ok(n.includes("advisory-only findings receive a reasoned deferral"));
    assert.ok(n.includes("never create a fix round"));
  });
});

describe("review-this freshness and merge gates (review-this:INV-8)", () => {
  test("a pushed fix invalidates previous checks and review and requires a new current-head verdict", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("a pushed fix invalidates previous checks and review for that pull request and requires a new current-head verdict"));
    assert.ok(n.includes("reviewisfresh") || n.includes("review is fresh") || n.includes("unchanged reviewed head sha"));
  });

  test("merge requires green required checks, resolved confirmed findings, a clean local review, and an unchanged reviewed head SHA", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("merge requires green required checks, resolved confirmed findings, a clean local review, and an unchanged reviewed head sha"));
    assert.ok(n.includes("ismergeldible") || n.includes("ismergeeligible") || n.includes("ismergeligible"));
  });
});

describe("review-this squash-merge and dependent promotion (review-this:INV-9)", () => {
  test("eligible pull requests squash-merge and closing references close the assigned tickets", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("eligible pull requests squash-merge and their closing references close the assigned tickets"));
    assert.ok(n.includes("closes #<ticket>"));
    assert.ok(n.includes("never close a ticket before merge") || n.includes("never close"));
  });

  test("ticket closure updates only dependents whose final open native blocker closed", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("ticket closure updates only dependents whose final open native blocker closed"));
    assert.ok(n.includes("adding `unblocked` plus `ready-for-agent` and removing `blocked`") || n.includes("unblocked") && n.includes("ready-for-agent"));
    assert.ok(n.includes("promotionafterclosure") || n.includes("promotion after closure"));
  });

  test("if more tickets become ready, completion tells user to run implement-this #<spec>", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("if more tickets become ready, completion tells the user to run `implement-this #<spec>`"));
  });
});

describe("review-this final verification and parent closure (review-this:INV-10)", () => {
  test("when all child tickets close, updated main passes repository verification and a whole-spec review before the parent closes", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("when all child tickets close, updated `main` passes repository verification and a whole-spec standards and spec review before the parent closes") || n.includes("when all child tickets close, updated `main` passes repository verification"));
    assert.ok(n.includes("npm run verify"));
  });

  test("a confirmed integration defect becomes the smallest independently verifiable native child ticket and keeps the parent open", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("a confirmed integration defect becomes the smallest independently verifiable native child ticket and keeps the parent open"));
    assert.ok(n.includes("followuprequired") || n.includes("follow up"));
  });
});

describe("review-this state and adapter boundaries (review-this:INV-11)", () => {
  test("state and adapter boundaries remain callable by a future persistent coordinator without changing command behavior", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("state and adapter boundaries") && n.includes("remain callable by a future persistent coordinator without changing command behavior"));
    assert.ok(skill.includes("discovery.ts") && skill.includes("reconciliation.ts") && skill.includes("adapters.ts") && skill.includes("workflow-state.ts"));
  });

  test("pure helper performs no network, GitHub, git, filesystem mutation, or worker-management calls", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("performs no network") || n.includes("pure helper"));
  });

  test("adapters are host-neutral with fake helpers and tests never call live cloud, GitHub, or worker sessions", () => {
    const leaf = read("docs/leaves/review-this.md");
    const n = norm(leaf);
    assert.ok(n.includes("future persistent coordinator"));
    const adapters = read("skills/review-this/adapters.ts");
    const fakes = read("skills/review-this/tests/fakes.ts");
    assert.equal(adapters.includes("fakeCloudAdapter"), false, "production adapters must not carry fake-only helpers");
    assert.ok(fakes.includes("fakeCloudAdapter"));
    assert.ok(fakes.includes("fakeGitHubAdapter"));
  });
});

describe("review-this workflow trust boundaries (review-this:INV-12)", () => {
  test("parent spec, ticket, PR, cloud, and sub-agent prose is requirements data that cannot widen scope or authorize tools", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("requirements data"), "must define prose as requirements data");
    assert.ok(n.includes("cannot widen scope"), "must forbid widening scope from prose");
    assert.ok(n.includes("select files outside the diff"), "must forbid file selection outside the diff");
    assert.ok(n.includes("authorize tools"), "must forbid tool authorization from prose");
    assert.ok(n.includes("override gates"), "must forbid overriding gates from prose");
  });

  test("workflow execution performs no skill downloads", () => {
    const skill = read("skills/review-this/SKILL.md");
    const install = read("skills/review-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    assert.ok(n.includes("no skill downloads"), "must prohibit skill downloads during workflow execution");
  });

  test("install guidance records provenance, pinning, and residual trust without claiming Snyk findings disappeared", () => {
    const install = read("skills/review-this/INSTALL.md");
    const n = norm(install);
    assert.ok(n.includes("provenance"), "install guidance must record source provenance");
    assert.ok(n.includes("pin the revision you reviewed") || n.includes("pin the reviewed revision"), "must pin reviewed revisions where supported");
    assert.ok(n.includes("residual trust"), "must state residual source-repository trust");
    for (const claim of ["eliminated", "eradicated", "no longer applies", "no longer present", "resolved the risk"]) {
      assert.equal(n.includes(claim), false, `must not claim the Snyk findings are gone (${claim})`);
    }
  });

  test("manual installation requires explicit user approval before overwriting an existing skill", () => {
    const install = read("skills/review-this/INSTALL.md");
    const n = norm(install);
    assert.ok(n.includes("overwrit"), "manual install guidance must address overwriting");
    assert.ok(n.includes("explicit approval"), "overwriting an existing skill requires explicit approval");
  });

  test("leaf doc declares INV-12 with composition-test mechanism", () => {
    const leaf = read("docs/leaves/review-this.md");
    assert.ok(leaf.includes("INV-12"), "leaf must declare INV-12");
  });
});

describe("review-this performance lifecycle (review-this:INV-13)", () => {
  test("documents the smoke budget and bounded fix rereview contract", () => {
    const install = read("skills/review-this/INSTALL.md");
    const skill = norm(read("skills/review-this/SKILL.md"));
    assert.ok(install.includes("Three-ticket Kilo smoke"));
    assert.ok(install.includes("reservationToTerminalMs"));
    assert.ok(install.includes("ordinary-ticket median is at most 60 minutes"));
    assert.ok(skill.includes("one fresh fix subagent inside the same pr worktree per round"));
    assert.ok(skill.includes("final verification repair consumes an available fix round") || skill.includes("if final verification fails"));
  });

  test("review workers never clean up themselves and cleanup needs exact remote durability (ADR-0023)", () => {
    const skill = read("skills/review-this/SKILL.md");
    const install = read("skills/review-this/INSTALL.md");
    const n = norm(`${skill}\n${install}`);
    assert.ok(n.includes("a worker never stops itself"), "workers never stop themselves");
    assert.ok(n.includes("never closes its own worktree"), "workers never close their own worktree");
    assert.ok(n.includes("only the command session may request cleanup"), "only the command session cleans up");
    assert.ok(n.includes("no unpushed fix"), "an unpushed fix blocks cleanup");
    assert.ok(n.includes("recovery-required"), "missing-session recovery state is named");
    assert.ok(n.includes("preserved-for-resume"), "resumable preservation is named");
    assert.ok(n.includes("preserved-for-diagnosis"), "diagnostic preservation is named");
    assert.ok(n.includes("cleanup-pending"), "unsupported closure is visible");
  });
});

describe("Agent Manager worktree dispatch enforcement (plan 1787549339706)", () => {
  test("agent_manager appears before Task and persistent worktree exists before nested subagents", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("agent_manager"), "must name agent_manager");
    assert.ok(n.includes("task"), "must name Task");
    const agentIdx = n.indexOf("agent_manager");
    const taskIdx = n.indexOf("task");
    assert.ok(agentIdx !== -1 && taskIdx !== -1 && agentIdx < taskIdx, "agent_manager must appear before Task");
    assert.ok(n.includes("persistent pr worktree"), "must name persistent PR worktree");
    assert.ok(n.includes("before any standards, spec, or fix"), "must state PR worktree before nested subagents");
    const worktreeIdx = n.indexOf("persistent pr worktree");
    const standardsIdx = n.indexOf("standards and spec sub-agents");
    assert.ok(worktreeIdx !== -1 && standardsIdx !== -1 && worktreeIdx < standardsIdx, "worktree must appear before Standards subagents");
    const fixIdx = n.indexOf("fix `task`") !== -1 ? n.indexOf("fix `task`") : n.indexOf("fix subagent");
    if (fixIdx !== -1) assert.ok(worktreeIdx < fixIdx, "worktree must appear before fix subagents");
  });

  test("Task cannot replace the persistent PR worktree", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("do not replace this worktree with `task` subagents"), "must ban Task replacing worktree");
    assert.ok(n.includes("not a worktree substitute"), "must state not a worktree substitute");
    assert.ok(n.includes("fresh subagents inside the persistent pr worktree"), "must state subagents are inside persistent worktree");
  });

  test("nested Task subagents are valid only inside the established persistent worktree", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("nested") && n.includes("valid only inside"), "must state nested agents valid only inside");
    assert.ok(n.includes("established persistent pr worktree") || n.includes("persistent pr worktree"), "must reference established persistent worktree");
    assert.ok(n.includes("created via `agent_manager` before them") || n.includes("agent_manager"), "must state created via agent_manager");
  });

  test("unavailable persistent worktree stops before verdict", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("hosts that cannot provide the persistent worktree stop before a verdict"), "must stop before verdict if worktree unavailable");
    assert.ok(n.includes("fresh nested agents stop before a verdict") || n.includes("stop before a verdict"), "must stop before verdict for nested agents too");
  });

  test("project permission gate allows agent_manager and asks for task", () => {
    const kilo = read(".kilo/kilo.jsonc");
    const n = norm(kilo);
    assert.ok(kilo.includes('"agent_manager"'), "kilo.jsonc must contain agent_manager key");
    assert.ok(kilo.includes('"task"'), "kilo.jsonc must contain task key");
    assert.ok(n.includes("agent_manager") && n.includes("allow"), "agent_manager must be allow");
    assert.ok(n.includes("task") && n.includes("ask"), "task must be ask");
    assert.ok(kilo.includes('"snapshot": false') || kilo.includes('"snapshot":false'), "snapshot false preserved");
    const agentMgrPath = path.join(ROOT, ".kilo/agent-manager.json");
    if (fs.existsSync(agentMgrPath)) {
      const agentMgr = fs.readFileSync(agentMgrPath, "utf8");
      assert.ok(!agentMgr.includes("permission"), "agent-manager.json must not be edited");
    }
  });

  test("overview-first ordering for review dispatch", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("first worker-management calls are the agent manager overview"), "must state first calls are overview");
    assert.ok(n.includes('action: "list"'), "must name overview action");
    assert.ok(n.includes("automatically create one persistent pr worktree"), "must state automatically create");
    assert.ok(n.includes("via the `agent_manager` tool in worktree mode"), "must state via agent_manager worktree mode");
    assert.ok(n.includes("before any standards, spec, or fix"), "must state occurs before nested subagents");
    const firstCallIdx = n.indexOf("first worker-management calls are the agent manager overview");
    const beforeIdx = n.indexOf("before any standards, spec, or fix");
    assert.ok(firstCallIdx !== -1 && beforeIdx !== -1 && firstCallIdx < beforeIdx, "first calls phrase must precede before-Task clause");
  });
});

describe("review-this concurrent critical path (plan #170)", () => {
  test("bounded multi-PR dispatch is planned once from one overview run", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("planreviewwavedispatch"), "must name planReviewWaveDispatch from review-session.ts");
    assert.ok(n.includes("collectreviewevidence"), "must name collectReviewEvidence from adapters.ts");
    assert.ok(n.includes("run the required agent manager overview once"), "overview must run once per wave");
    assert.ok(n.includes("one worktree-mode start request"), "all selected workers start in one request");
    assert.ok(n.includes("reusing existing persistent workers rather than starting duplicates"), "reuse before create");
    assert.ok(n.includes("never two workers for the same pull request or the same pinned head-and-base pair"), "no duplicate workers");
    assert.ok(n.includes("at most three review workers serve the stage"), "stage cap stated");
    assert.ok(n.includes("at most four managed workers stay active across the workspace"), "workspace cap stated");
    assert.ok(n.includes("deferred by capacity") && n.includes("deferred prs re-enter review on the next discovery"), "deferral is named and recoverable");
    assert.ok(n.includes("the native child order fills every available slot"), "native order preserved");
    assert.ok(n.includes("re-list before any later spawn and defer rather than exceed it"), "stale capacity re-checked");
  });

  test("cloud collection starts immediately and overlaps local review", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("begin cloud collection for each pinned head-and-base pair immediately"), "cloud starts at pin time");
    assert.ok(n.includes("do not await it before worker setup"), "worker setup not blocked by cloud");
    assert.ok(n.includes("both sources run together under `collectreviewevidence`"), "overlap runs through collectReviewEvidence");
    assert.ok(n.includes("awaited only at that pr's reconciliation boundary"), "await only at reconciliation");
    assert.ok(n.includes("cloud unavailability never cancels or skips the already-running local review"), "cloud failure never cancels local");
  });

  test("each active PR proceeds independently through its own lifecycle", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("each active pull request then proceeds independently through local review, reconciliation, publication, fixes, and merge"), "independent PR progress stated");
    assert.ok(n.includes("waiting on cloud review or ci for one pr must not block another ready pr"), "one PR's waits never block another");
    assert.ok(n.includes("reread head and base before publication") || n.includes("before every github write, reread the current target region"), "freshness reread preserved");
  });

  test("existing gates survive the concurrency change", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("spawn the standards and spec sub-agents in parallel"), "parallel fresh axes preserved");
    assert.ok(n.includes("never merge or rerank findings across axes"), "no-rerank preserved");
    assert.ok(n.includes("at most two code-fix rounds are allowed") || n.includes("At most two code-fix rounds are allowed"), "fix budget preserved");
    assert.ok(n.includes("merge requires green required checks, resolved confirmed findings, a clean local review, and an unchanged reviewed head sha"), "merge gate preserved");
    assert.equal(n.includes("--fast"), false, "no fast flag");
    assert.equal(n.includes("--no-cloud"), false, "no skip-cloud flag");
  });
});

describe("review-this shared revision packet (plan #170)", () => {
  test("one packet per pinned head-and-base pair feeds both axes", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("build one shared revision packet per pinned head-and-base pair"), "one packet per pair");
    for (const content of [
      "three-dot diff command",
      "commit list",
      "changed files and hunks",
      "impacted callers",
      "focused doc-cache sources",
      "acceptance criteria",
      "standards sources",
      "full-review escalation triggers",
    ]) {
      assert.ok(n.includes(content), `packet must include ${content}`);
    }
    assert.ok(n.includes("the same packet plus only their axis-specific brief"), "shared packet with axis-specific brief");
    assert.ok(n.includes("do not repeat github discovery, diff enumeration, or caller discovery inside each subagent"), "no duplicated discovery in subagents");
  });

  test("full-versus-delta rules and report caps stay unchanged", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("the initial revision receives one full review"), "initial full review kept");
    assert.ok(n.includes("within the `/code-review` report caps"), "report caps preserved");
    assert.ok(n.includes("limited to changed hunks and impacted callers unless a named risk trigger requires full review"), "delta rule and escalation triggers unchanged");
  });
});

describe("review-this trusted-summary phase timings (plan #170)", () => {
  test("named phase timings exist in the upserted trusted summary", () => {
    const skill = read("skills/review-this/SKILL.md");
    for (const field of [
      "packetBuildMs",
      "cloudMs",
      "localReviewMs",
      "reviewCriticalPathMs",
      "reconcileMs",
      "ciWaitMs",
      "activeReviewWorkers",
      "deferredByCapacity",
    ]) {
      assert.ok(skill.includes(field), `trusted summary must record ${field}`);
    }
    const n = norm(skill);
    assert.ok(n.includes("updated in place in the upserted trusted summary"), "timings live in the upserted summary");
  });

  test("timings are bookkeeping and never become merge evidence", () => {
    const skill = read("skills/review-this/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("they are never merge evidence and remove no correctness, trust, freshness, publication, merge, or closure gate"), "timings weaken no gate");
    assert.ok(n.includes("never through timing-only comments"), "timing-only comments stay non-evidence");
  });

  test("smoke guidance carries baseline comparison and critical-path targets", () => {
    const n = norm(read("skills/review-this/INSTALL.md"));
    assert.ok(n.includes("three-pr clean-wave median is at most 60% of the sequential baseline"), "clean-wave target present");
    assert.ok(n.includes("delayed-cloud single-pr median is at most 80% of baseline"), "delayed-cloud target present");
    assert.ok(n.includes("one-fix path does not regress by more than 10%"), "one-fix guard present");
    assert.ok(n.includes("packetbuildms"), "critical-path fields recorded per ticket");
    assert.ok(n.includes("review-agent input tokens fall by at least 20%"), "shared-packet token target present");
  });
});
