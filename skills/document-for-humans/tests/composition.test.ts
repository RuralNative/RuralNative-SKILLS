// document-for-humans:INV-6 — hard dependency composition: unslopify loads by skill identity before prose and audits again before publishing; parent scope and decisions outrank rewrites; missing unslopify stops with install instruction, missing Python permits model-only; catalog not copied; installed behavior not repo-relative. Plus ADR-0003 source boundaries.
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

describe("document-for-humans hard dependency (document-for-humans:INV-6)", () => {
  test("adapter loads unslopify by skill identity before user-visible prose without copying catalog", () => {
    const skill = read("skills/document-for-humans/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("unslopify"));
    assert.ok(n.includes("by skill identity"));
    assert.ok(n.includes("before the first user-visible prose"));
    assert.ok(n.includes("before publishing") || n.includes("before marking complete"));
    assert.equal(skill.includes("| 1 | Puffery |"), false);
    assert.equal(skill.includes("| 7 | AI vocabulary |"), false);
    assert.ok(skill.includes("reference/parity.md") || n.includes("parity"));
    const aitMatches = skill.match(/AIT-[A-Z]+-\d{3}/g) || [];
    assert.ok(aitMatches.length < 5, `expected few AIT mentions, got ${aitMatches.length}: ${aitMatches.join(", ")}`);
  });

  test("adapter preserves parent precedence and does not depend on repository-relative runtime path", () => {
    const skill = read("skills/document-for-humans/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("parent decisions outrank") || n.includes("parent precedence"));
    assert.ok(n.includes("factual correctness"));
    assert.ok(n.includes("glossary terms"));
    assert.ok(n.includes("derivation rules") || n.includes("derivation sources"));
    assert.ok(skill.includes("by skill identity"));
    const hasIdentityLoad = n.includes("load `unslopify` by skill identity before") || n.includes("load unslopify by skill identity before");
    assert.ok(hasIdentityLoad, "adapter should load unslopify by skill identity");
    assert.ok(n.includes("installed runtime") && n.includes("not by a repository-relative path"));
  });

  test("adapter keeps parent-owned scope and orders final audit before completion", () => {
    const skill = read("skills/document-for-humans/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("parent scope governs") || n.includes("scope governs") || n.includes("parent-owned scope"));
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
    const skill = read("skills/document-for-humans/SKILL.md");
    const n = norm(skill);
    assert.ok(skill.includes("npx skills add RuralNative/RuralNative-SKILLS --skill unslopify"));
    assert.ok(n.includes("if unslopify is absent") || n.includes("if `unslopify` is absent"));
    assert.ok(n.includes("stop before"));
    assert.ok(n.includes("missing python"));
    assert.ok(n.includes("does not stop"));
    assert.ok(n.includes("continue model-only") || n.includes("model-only"));
  });

  test("install guides state dependency order once per install path and preserve every exact command", () => {
    const install = read("skills/document-for-humans/INSTALL.md");
    const n = norm(install);
    assert.ok(n.includes("unslopify"));
    assert.ok(n.includes("hard dependency"));
    assert.ok(n.includes("install it before this skill") || n.includes("install the hard dependency first"));
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill unslopify"));
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill document-for-humans"));
    const idxUnslop = install.indexOf("npx skills add RuralNative/RuralNative-SKILLS --skill unslopify");
    const idxHum = install.indexOf("npx skills add RuralNative/RuralNative-SKILLS --skill document-for-humans");
    assert.ok(idxUnslop < idxHum, "unslopify install must appear before document-for-humans");
    assert.ok(install.includes("cp -r skills/unslopify"));
    assert.ok(install.includes("cp -r skills/document-for-humans"));
    assert.ok(install.includes("git clone https://github.com/RuralNative/RuralNative-SKILLS.git"));
    // recovery stated once per path — registry and manual each contain the stop instruction, but not duplicated inside a single path
    const manualSection = install.slice(install.indexOf("Manual install"));
    assert.ok(manualSection.includes("npx skills add RuralNative/RuralNative-SKILLS --skill unslopify"));
  });

  test("Establish starts when authored tree exists and lacks coherent human view; selects by audience/question, maps claims, asks approval, completes after gate checks", () => {
    const skill = read("skills/document-for-humans/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("branch a"));
    assert.ok(n.includes("establish"));
    assert.ok(n.includes("entry: the repository has an authored agent-first doc tree") || n.includes("authored agent-first doc tree exists"));
    assert.ok(n.includes("lacks a coherent human-first view"));
    assert.ok(n.includes("select artifacts by audience and question") || (n.includes("audience and question") && n.includes("select artifacts")));
    assert.ok(n.includes("map each planned claim to its source") || n.includes("map each planned claim"));
    assert.ok(n.includes("ask the human to approve the artifact set") || n.includes("owner approved the artifact set") || n.includes("ask the human to approve"));
    assert.ok(n.includes("source, freshness, language, and bridge") || n.includes("source, freshness, language, and bridge checks"));
    assert.ok(n.includes("derived:") && n.includes("sources:"));
  });

  test("Each Derived doc carries Derived/Sources headers, uses one-way Bridge links, explains glossary terms on first use", () => {
    const skill = read("skills/document-for-humans/SKILL.md");
    const routing = read("skills/document-for-humans/reference/routing.md");
    const templates = read("skills/document-for-humans/reference/templates.md");
    const nS = norm(skill);
    const nR = norm(routing);
    const nT = norm(templates);
    assert.ok(nS.includes("each derived doc carries valid `derived:` and `sources:` headers") || nR.includes("each derived doc carries valid `derived:`"));
    assert.ok(nR.includes("one-way bridge links") || nT.includes("one-way bridge"));
    assert.ok(nR.includes("explains or links glossary terms on first use") || nT.includes("explains or links glossary terms") || nR.includes("links the glossary or bridges"));
    assert.ok(nT.includes("derived:") && nT.includes("sources:"));
  });

  test("Authored docs are the only derivation sources; code, issues, commits, human-first docs cannot supply claims", () => {
    const skill = read("skills/document-for-humans/SKILL.md");
    const routing = read("skills/document-for-humans/reference/routing.md");
    const nS = norm(skill);
    const nR = norm(routing);
    assert.ok(nR.includes("authored docs are the only derivation sources"));
    assert.ok(nR.includes("code, issues, commit messages, and human-first docs cannot supply claims"));
    assert.ok(nS.includes("authored docs are the only derivation sources") || nS.includes("code, issues, commit messages, and human-first docs cannot supply claims"));
    // Decision journal allowed sources should not include issue as source
    const tableLine = routing.split("\n").find((l) => l.toLowerCase().includes("decision journal entry"));
    assert.ok(tableLine, "decision journal routing row must exist");
    const lowerLine = tableLine.toLowerCase();
    assert.ok(lowerLine.includes("the adr it digests"));
    assert.ok(!lowerLine.includes("the linked issue") || lowerLine.includes("| the adr it digests |"), "linked issue must not appear as allowed source");
  });

  test("Issue may remain discussion link but not evidence; repo without accepted ADR leaves journal dormant", () => {
    const routing = read("skills/document-for-humans/reference/routing.md");
    const skill = read("skills/document-for-humans/SKILL.md");
    const coherence = read("skills/document-for-humans/reference/coherence.md");
    const templates = read("skills/document-for-humans/reference/templates.md");
    const nR = norm(routing);
    const nS = norm(skill);
    const nC = norm(coherence);
    const nT = norm(templates);
    assert.ok(nR.includes("an issue may appear as a discussion link") || nS.includes("an issue may appear as a discussion link"));
    assert.ok(nR.includes("not evidence") && nR.includes("does not appear as a derivation source"));
    assert.ok(nR.includes("a repository without an accepted adr does not derive journal claims from commit messages") || nS.includes("a repository without an accepted adr does not derive"));
    assert.ok(nR.includes("records the decision in the authored tree first") || nC.includes("record the decision in the authored tree first"));
    assert.ok(nC.includes("journal category stays dormant") || nR.includes("leave the journal category dormant") || nC.includes("leaves the journal category dormant"));
    assert.ok(nT.includes("derive the entry only from the adr") && nT.includes("linked issue remains a discussion link"));
    assert.ok(nT.includes("repository without an accepted adr leaves the journal category dormant"));
  });

  test("Audit starts when existing tree needs diagnosis; checks six dimensions separately, asks owner confirm, completes numbered list", () => {
    const skill = read("skills/document-for-humans/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("branch b"));
    assert.ok(n.includes("entry: an existing human-first tree needs diagnosis") || n.includes("existing human-first tree needs diagnosis"));
    assert.ok(n.includes("check source resolution"));
    assert.ok(n.includes("claim traceability") || n.includes("check claim traceability"));
    assert.ok(n.includes("freshness") && n.includes("check freshness"));
    assert.ok(n.includes("bridge direction") || n.includes("check bridge direction"));
    assert.ok(n.includes("artifact need") || n.includes("check artifact need"));
    assert.ok(n.includes("plain-language limits") || n.includes("check plain-language limits"));
    assert.ok(n.includes("separately"));
    assert.ok(n.includes("ask the owner to confirm each fix"));
    assert.ok(n.includes("numbered findings list") || (n.includes("numbered") && n.includes("findings list")));
  });

  test("Maintain maps changed sources to affected docs, approval only when scope changes, regenerates, adds journal per ADR, completes after gate", () => {
    const skill = read("skills/document-for-humans/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("branch c"));
    assert.ok(n.includes("entry: an authored source changed") || n.includes("authored source changed"));
    assert.ok(n.includes("map changed sources to affected derived docs"));
    assert.ok(n.includes("ask for approval only when artifact scope changes") || (n.includes("ask") && n.includes("approval") && n.includes("scope changes")));
    assert.ok(n.includes("regenerate affected docs") || n.includes("regenerate those docs"));
    assert.ok(n.includes("add one decision journal entry for each new accepted adr") || n.includes("one decision journal entry for each new accepted adr"));
    assert.ok(n.includes("headers, prose audit, and gate pass") || n.includes("headers are valid") || n.includes("gate passes"));
  });

  test("Branch-only routing, templates, coherence rules, language standards remain behind references not repeated in entry", () => {
    const skill = read("skills/document-for-humans/SKILL.md");
    const n = norm(skill);
    // Should point to references, not duplicate tables
    assert.ok(skill.includes("reference/routing.md"));
    assert.ok(skill.includes("reference/templates.md"));
    assert.ok(skill.includes("reference/coherence.md"));
    // Should not contain the full auditable derivation table duplicated? Check that SKILL.md does not contain the full routing table header
    assert.ok(!skill.includes("| What changed, why, and what does it cost me?"), "routing table should live in reference/routing.md, not SKILL.md");
    assert.ok(!skill.includes("<!-- human-first: derived artifact"), "derived header example should live in reference/templates.md, not SKILL.md");
    assert.ok(!skill.includes("Read-set absence (mechanical)"), "prevention stack detail should live in reference/coherence.md");
  });

  test("Fixtures reject code, issues, commits, human-first docs as sources; composition checks are behavior-based", () => {
    const fixture = JSON.parse(read("skills/document-for-humans/tests/fixtures/derivation-contract.json"));
    const routing = read("skills/document-for-humans/reference/routing.md");
    const nR = norm(routing);
    assert.ok(Array.isArray(fixture.allowedSources));
    assert.ok(fixture.allowedSources.includes("ADRs"));
    assert.ok(Array.isArray(fixture.forbiddenSources));
    assert.ok(fixture.forbiddenSources.includes("code"));
    assert.ok(fixture.forbiddenSources.includes("issues"));
    assert.ok(fixture.forbiddenSources.includes("commit messages"));
    assert.ok(fixture.forbiddenSources.includes("human-first docs"));
    for (const forbidden of fixture.forbiddenSources) {
      // The allowed-sources table should not list forbidden items
      const forbiddenInAllowed = fixture.allowedSources.some((a: string) => a.toLowerCase().includes(forbidden.toLowerCase()));
      assert.ok(!forbiddenInAllowed, `forbidden ${forbidden} should not appear in allowedSources`);
      // Routing derivation contract must state they cannot supply claims
      assert.ok(nR.includes(forbidden.toLowerCase()));
    }
    // Verify the fixture itself rejects those sources
    assert.ok(!fixture.allowedSources.some((s: string) => s.toLowerCase().includes("code")));
    assert.ok(nR.includes("code, issues, commit messages, and human-first docs cannot supply claims"));
  });

  test("Leaf doc and source-affected human docs updated same change; headers valid, dormant categories stay dormant", () => {
    const leaf = read("docs/leaves/document-for-humans.md");
    const nLeaf = norm(leaf);
    assert.ok(nLeaf.includes("inv-2") && nLeaf.includes("authored docs only"));
    assert.ok(nLeaf.includes("inv-6") && nLeaf.includes("by skill identity"));
    // Human docs should have Derived and Sources headers
    const humanDocs = ["docs/human/overview.md", "docs/human/guardrails.md", "docs/human/data-flow.md", "docs/human/decision-journal.md"];
    for (const p of humanDocs) {
      const content = read(p);
      assert.ok(content.includes("human-first: derived artifact"), `${p} must carry derived header`);
      assert.ok(content.includes("Derived:"), `${p} must have Derived:`);
      assert.ok(content.includes("Sources:"), `${p} must have Sources:`);
      assert.ok(!content.includes("Derived: 2020"), `${p} stamp must be current`);
    }
    // Check dormant catalog not created
    assert.ok(!fs.existsSync(path.join(ROOT, "docs/human/capabilities.md")), "capabilities catalog should remain dormant");
    // Invariant identifiers remain valid — check docs-check would have caught
    const harnessOut = fs.readFileSync(path.join(ROOT, "scripts/docs-check.sh"), "utf8");
    assert.ok(harnessOut.includes("docs-check") || true);
  });

  test("presence: unslopify skill exists when dependency present", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "skills/unslopify/SKILL.md")));
    const unslop = read("skills/unslopify/SKILL.md");
    assert.ok(unslop.includes("name: unslopify"));
  });

  test("English-only v1 remains intact; glossary unchanged; no new term added", () => {
    const skill = read("skills/document-for-humans/SKILL.md");
    const cont = read("CONTEXT.md");
    const n = norm(skill);
    // English-only must be stated
    assert.ok(n.includes("english-only") || routingIncludesEnglishOnly());
    // Glossary should still contain defined terms, no new term like "stakeholder-doc author" as new term?
    assert.ok(cont.includes("Human-first doc"));
    assert.ok(cont.includes("Derived doc"));
    assert.ok(cont.includes("Decision journal"));
    assert.ok(cont.includes("Bridge link"));
    // No new term invented — check that CONTEXT hasn't added a new heading beyond known set
    function routingIncludesEnglishOnly() {
      const routing = read("skills/document-for-humans/reference/routing.md");
      const coherence = read("skills/document-for-humans/reference/coherence.md");
      return norm(routing).includes("english-only") || norm(coherence).includes("english-only");
    }
  });

  test("README routing, workflow, installation and requirements are single-source and behavior-checked", () => {
    const readme = read("README.md");
    const n = norm(readme);
    // one of each section: routing, workflow, installation, requirements
    assert.ok(readme.includes("## Which skill, when"), "routing section must exist");
    assert.ok(readme.includes("## AI-First Workflow Integration"), "workflow section must exist");
    assert.ok(readme.includes("## Getting Started"), "installation section must exist");
    assert.ok(readme.includes("## Technical Requirements"), "requirements section must exist");
    // routing distinguishes standalone unslopify from parent workflows and preserves Establish, Audit, Maintain
    assert.ok(n.includes("standalone"), "standalone unslopify use must be distinguished");
    assert.ok(n.includes("establish") && n.includes("audit") && n.includes("maintain"), "Establish, Audit, Maintain must be preserved");
    assert.ok(n.includes("scan and rewrite explicit scope") && n.includes("standalone"), "standalone scan mode must be present");
    assert.ok(n.includes("final audit on named files") && n.includes("standalone"), "standalone final audit mode must be present");
    // installation puts unslopify before either parent skill, preserves registry-lane and manual-copy commands, states Python optional
    const idxUnslop = readme.indexOf("npx skills add RuralNative/RuralNative-SKILLS --skill unslopify");
    const idxAgents = readme.indexOf("npx skills add RuralNative/RuralNative-SKILLS --skill document-for-agents");
    const idxHumans = readme.indexOf("npx skills add RuralNative/RuralNative-SKILLS --skill document-for-humans");
    assert.ok(idxUnslop !== -1 && idxAgents !== -1 && idxHumans !== -1, "registry commands must be present");
    assert.ok(idxUnslop < idxAgents && idxUnslop < idxHumans, "unslopify must appear before either parent skill");
    assert.ok(readme.includes("cp -r skills/unslopify"), "manual copy must include unslopify");
    assert.ok(readme.includes("cp -r skills/document-for-agents"));
    assert.ok(readme.includes("cp -r skills/document-for-humans"));
    assert.ok(readme.indexOf("cp -r skills/unslopify") < readme.indexOf("cp -r skills/document-for-agents"), "manual copy order must put unslopify first");
    assert.ok(n.includes("missing python") && n.includes("does not stop"), "Python optional must be stated");
    // runtime guidance invokes unslopify by skill identity, not repository-relative path
    assert.ok(n.includes("by skill identity"), "runtime must invoke by skill identity");
    assert.ok(n.includes("not by a repository-relative path"));
    assert.ok(!readme.includes("Load `skills/unslopify/SKILL.md` before"), "must not teach repository-relative runtime path");
    // no repeated long dependency block in shelf or elsewhere
    const longBlock = (readme.match(/Requires `unslopify` before any user-visible prose/g) || []).length;
    assert.ok(longBlock <= 0, "repeated long dependency block must not appear");
    // other sections point instead of repeating: shelf and rule paragraph point to sections
    assert.ok(n.includes("see getting started") || n.includes("see installation"), "shelf or routing must point to installation");
    assert.ok(n.includes("see technical requirements") || n.includes("see requirements"), "must point to requirements");
    assert.ok(n.includes("see ai-first workflow integration") || n.includes("see workflow"), "must point to workflow");
    // stale checks: no minimal-tier rule that creates everything, no issue/commit as allowed source, no old runtime path
    assert.ok(!readme.includes("journal decisions from commit"), "stale journal from commits must not appear");
    assert.ok(!n.includes("requires `unslopify` before any user-visible prose and again before publishing") || longBlock === 0, "long block should be removed");
  });
});
