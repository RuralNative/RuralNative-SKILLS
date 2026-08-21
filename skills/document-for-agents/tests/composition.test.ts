// document-for-agents:INV-6 — hard dependency composition: unslopify loads by skill identity before prose and audits again before publishing; parent scope and decisions outrank rewrites; missing unslopify stops with install instruction, missing Python does not; catalog not copied; installed behavior not repo-relative.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { read, norm } from "../../../scripts/test-helpers.ts";

const ROOT = path.resolve(import.meta.dirname ?? ".", "../../..");

describe("document-for-agents hard dependency (document-for-agents:INV-6)", () => {
  test("adapter loads unslopify by skill identity before user-visible prose without copying catalog", () => {
    const skill = read("skills/document-for-agents/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("unslopify"));
    // Short adapter by skill identity, not a repo-relative runtime path
    assert.ok(n.includes("by skill identity"));
    assert.ok(n.includes("before the first user-visible prose"));
    assert.ok(n.includes("before publishing") || n.includes("before marking complete"));
    // No copied AIT catalog
    assert.equal(skill.includes("| 1 | Puffery |"), false);
    assert.equal(skill.includes("| 7 | AI vocabulary |"), false);
    assert.ok(skill.includes("reference/parity.md") || n.includes("parity"));
    // At least one AIT mention for ownership note is allowed, but no table
    const aitMatches = skill.match(/AIT-[A-Z]+-\d{3}/g) || [];
    assert.ok(aitMatches.length < 5, `expected few AIT mentions, got ${aitMatches.length}: ${aitMatches.join(", ")}`);
  });

  test("adapter preserves parent precedence and does not depend on repository-relative runtime path", () => {
    const skill = read("skills/document-for-agents/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("parent decisions outrank") || n.includes("parent precedence") || n.includes("parent decisions outrank style findings"));
    assert.ok(n.includes("factual correctness"));
    assert.ok(n.includes("glossary terms"));
    assert.ok(skill.includes("by skill identity"));
    const hasIdentityLoad = n.includes("load `unslopify` by skill identity before") || n.includes("load unslopify by skill identity before");
    assert.ok(hasIdentityLoad, "adapter should load unslopify by skill identity");
    assert.ok(n.includes("installed runtime") && n.includes("not by a repository-relative path") || n.includes("skill identity, not by a repository-relative path"));
  });

  test("adapter keeps parent-owned scope and orders final audit before completion", () => {
    const skill = read("skills/document-for-agents/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("parent scope governs") || n.includes("scope governs") || n.includes("parent-owned scope") || n.includes("parent scope"));
    assert.ok(n.includes("routine"));
    assert.ok(n.includes("repository sweep") || n.includes("audit may sweep"));
    assert.ok(n.includes("final `unslopify` audit"));
    assert.ok(n.includes("before publishing") || n.includes("before marking"));
    assert.ok(n.includes("completion report") || (n.includes("scope") && n.includes("accepted") && n.includes("rejected")));
    assert.ok(n.includes("scanner availability") || n.includes("scanner"));
    assert.ok(n.includes("protected-content") || n.includes("protected content"));
    assert.ok(n.includes("preservation"));
  });

  test("missing dependency stops with exact install instruction; missing Python permits model-only path", () => {
    const skill = read("skills/document-for-agents/SKILL.md");
    const n = norm(skill);
    // Must give exact instruction
    assert.ok(skill.includes("npx skills add RuralNative/RuralNative-SKILLS --skill unslopify"));
    assert.ok(n.includes("if unslopify is absent") || n.includes("if `unslopify` is absent"));
    assert.ok(n.includes("stop before"));
    assert.ok(n.includes("missing python"));
    assert.ok(n.includes("does not stop"));
    assert.ok(n.includes("continue model-only") || n.includes("model-only"));
  });

  test("install guides state dependency order once per install path and preserve every exact command", () => {
    const install = read("skills/document-for-agents/INSTALL.md");
    const n = norm(install);
    assert.ok(n.includes("unslopify"));
    assert.ok(n.includes("hard dependency"));
    assert.ok(n.includes("install it before this skill") || n.includes("install the hard dependency first"));
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill unslopify"));
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill document-for-agents"));
    const idxUnslop = install.indexOf("npx skills add RuralNative/RuralNative-SKILLS --skill unslopify");
    const idxAgent = install.indexOf("npx skills add RuralNative/RuralNative-SKILLS --skill document-for-agents");
    assert.ok(idxUnslop < idxAgent, "unslopify install must appear before document-for-agents");
    assert.ok(install.includes("cp -r skills/unslopify"));
    assert.ok(install.includes("cp -r skills/document-for-agents"));
    assert.ok(install.includes("git clone https://github.com/RuralNative/RuralNative-SKILLS.git"));
  });

  test("Establish tiers control artifacts: minimal creates only index, glossary, conventions", () => {
    const skill = read("skills/document-for-agents/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("branch a"));
    assert.ok(n.includes("establish"));
    assert.ok(n.includes("entry: the repository lacks a coherent agent-facing doc tree") || n.includes("lacks a coherent agent-facing doc tree"));
    assert.ok(n.includes("ask the owner to approve the tier") || n.includes("owner approved the tier"));
    assert.ok(n.includes("minimal"));
    assert.ok(n.includes("index"));
    assert.ok(n.includes("glossary"));
    assert.ok(n.includes("conventions policy") || n.includes("conventions"));
    assert.ok(n.includes("does not create per-seam leaf docs") || n.includes("does not create per-seam"));
    assert.ok(n.includes("does not create") && n.includes("adr directory"));
    assert.ok(n.includes("does not create") && n.includes("generated"));
    assert.ok(n.includes("unless a later verified need crosses the threshold") || n.includes("verified need"));
  });

  test("minimal-tier fixture: minimal does not create higher-tier artifacts", () => {
    const skill = read("skills/document-for-agents/SKILL.md");
    const classify = read("skills/document-for-agents/reference/classify.md");
    const templates = read("skills/document-for-agents/reference/templates.md");
    const fixture = JSON.parse(read("skills/document-for-agents/tests/fixtures/minimal-tier.json"));
    const nS = norm(skill);
    const nC = norm(classify);
    const nT = norm(templates);
    assert.ok(
      nS.includes("minimal") && nS.includes("does not create per-seam") ||
      nC.includes("minimal") && nC.includes("no per-seam leaf doc"),
      "minimal tier boundary must be documented"
    );
    assert.ok(nT.includes("leaf doc") && (nT.includes("standard tier") || nT.includes("minimal tier has no leaf doc")));
    assert.ok(nS.includes("minimal tier skips") || nS.includes("when the selected tier includes the harness") || nC.includes("dormant"));
    assert.ok(!nS.includes("create the tree. index") || nS.includes("create only the artifacts the approved tier requires") || nS.includes("create the tiered tree"));
    // Fixture proves minimal does not include higher-tier artifacts
    assert.ok(Array.isArray(fixture.minimal));
    assert.ok(fixture.minimal.includes("AGENTS.md"));
    assert.ok(fixture.minimal.includes("CONTEXT.md"));
    assert.ok(Array.isArray(fixture.notInMinimal));
    assert.ok(fixture.notInMinimal.includes("docs/leaves/"));
    assert.ok(fixture.notInMinimal.includes("docs/adr/"));
    assert.ok(fixture.notInMinimal.includes("generated/"));
    assert.ok(!fixture.minimal.some((f: string) => f.includes("docs/leaves/")));
    assert.ok(!fixture.minimal.some((f: string) => f.includes("docs/adr/")));
  });

  test("Branch definitions and harness detail live behind references, not repeated in entry", () => {
    const skill = read("skills/document-for-agents/SKILL.md");
    const n = norm(skill);
    // Branch-only tables should be referenced, not duplicated
    assert.ok(!skill.includes("| Why is the system shaped this way?"));
    assert.ok(!skill.includes("coverage ↔ disk"));
    assert.ok(!skill.includes("Status: accepted | superseded"));
    assert.ok(skill.includes("reference/classify.md"));
    assert.ok(skill.includes("reference/harness.md"));
    assert.ok(skill.includes("reference/templates.md"));
  });

  test("Audit runs mechanical checks before manual review and completes with owned executable plan", () => {
    const skill = read("skills/document-for-agents/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("branch b"));
    assert.ok(n.includes("entry: an existing doc system needs diagnosis") || n.includes("existing doc system needs diagnosis"));
    assert.ok(n.includes("run mechanical checks") || n.includes("run the harness"));
    assert.ok(n.includes("before manual"));
    assert.ok(n.includes("highest-decay") || n.includes("high-decay"));
    assert.ok(n.includes("ask the owner to confirm each tier and fix"));
    assert.ok(n.includes("numbered") && n.includes("owned") && n.includes("executable plan"));
  });

  test("Maintain starts with seam change or re-orientation and completes after audits", () => {
    const skill = read("skills/document-for-agents/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("branch c"));
    assert.ok(n.includes("entry: a seam change or re-orientation") || n.includes("seam change or re-orientation"));
    assert.ok(n.includes("read the loading protocol"));
    assert.ok(n.includes("non-negotiables") || n.includes("seam invariants"));
    assert.ok(n.includes("same diff"));
    assert.ok(n.includes("code wins"));
    assert.ok(n.includes("fix the doc") && n.includes("flag the discrepancy"));
    assert.ok(n.includes("decision gate") && n.includes("supersed"));
    assert.ok(n.includes("prose audit and harness both pass") || (n.includes("prose audit") && n.includes("harness")));
  });

  test("presence: unslopify skill exists when dependency present", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "skills/unslopify/SKILL.md")));
    const unslop = read("skills/unslopify/SKILL.md");
    assert.ok(unslop.includes("name: unslopify"));
  });
});
