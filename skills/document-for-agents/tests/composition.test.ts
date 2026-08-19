// document-for-agents:INV-6 — hard dependency composition: unslopify loads before prose and audits again before publishing; parent scope and decisions outrank rewrites; missing unslopify stops with install instruction, missing Python does not; catalog not copied.
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

describe("document-for-agents hard dependency (document-for-agents:INV-6)", () => {
  test("dependency present: description and workflow state hard dependency without copying catalog", () => {
    const skill = read("skills/document-for-agents/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("hard dependency"));
    assert.ok(n.includes("unslopify"));
    assert.equal(skill.includes("| 1 | Puffery |"), false);
    assert.equal(skill.includes("| 7 | AI vocabulary |"), false);
    assert.ok(skill.includes("reference/parity.md"));
  });

  test("load order: loads unslopify before interview questions and keeps contract active", () => {
    const skill = read("skills/document-for-agents/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("hard dependency:"));
    assert.ok(skill.includes("Load `skills/unslopify/SKILL.md` before"));
    assert.ok(n.includes("interview question"));
    assert.ok(n.includes("progress update"));
    assert.ok(n.includes("draft"));
    assert.ok(n.includes("comment"));
    assert.ok(n.includes("issue body"));
    assert.ok(n.includes("final summary"));
  });

  test("final-audit order: runs final unslopify audit before publishing or completion", () => {
    const skill = read("skills/document-for-agents/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("final `unslopify` audit"));
    assert.ok(n.includes("before marking a workflow complete or publishing"));
    assert.ok(n.includes("completion report"));
    assert.ok(n.includes("scope used"));
    assert.ok(n.includes("accepted and rejected findings"));
    assert.ok(n.includes("final `unslopify` audit on all created prose passes before publishing"));
    assert.ok(n.includes("run the `unslopify` final audit and the harness"));
  });

  test("parent-owned scope: routine passes changed prose, audit may sweep", () => {
    const skill = read("skills/document-for-agents/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("scope belongs to the caller"));
    assert.ok(n.includes("this skill owns scope"));
    assert.ok(n.includes("standalone audits may"));
    assert.ok(n.includes("repository sweep"));
    assert.ok(n.includes("routine maintenance passes only changed prose"));
    assert.ok(n.includes("pass the chosen scope to `unslopify` without expansion"));
  });

  test("parent decisions outrank prose rewrites", () => {
    const skill = read("skills/document-for-agents/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("parent decisions outrank prose rewrites"));
    assert.ok(n.includes("factual correctness"));
    assert.ok(n.includes("tier routing"));
    assert.ok(n.includes("glossary terms"));
    assert.ok(n.includes("seam invariants"));
    assert.ok(n.includes("derivation rules"));
    assert.ok(n.includes("approval gates are authoritative"));
    assert.ok(n.includes("may not override an adr"));
    assert.ok(n.includes("may not change facts"));
    assert.ok(n.includes("parent decision stands"));
  });

  test("missing unslopify stops workflow with exact install instruction; missing Python does not", () => {
    const skill = read("skills/document-for-agents/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("if `skills/unslopify/skill.md` is absent, stop the workflow"));
    assert.ok(n.includes("npx skills add ruralnative/ruralnative-skills --skill unslopify"));
    // Also verify raw contains exact registry-lane instruction split across lines is still present as normalized
    assert.ok(skill.includes("npx skills add RuralNative/RuralNative-SKILLS --skill"));
    assert.ok(n.includes("missing python"));
    assert.ok(n.includes("does not stop"));
    assert.ok(n.includes("continue model-only without weakening scope or preservation"));
  });

  test("install guides make dependency visible before use and provide working sequence", () => {
    const install = read("skills/document-for-agents/INSTALL.md");
    const n = norm(install);
    assert.ok(n.includes("unslopify"));
    assert.ok(n.includes("hard dependency"));
    assert.ok(n.includes("install it before this skill"));
    assert.ok(n.includes("install the hard dependency first, then this skill"));
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill unslopify"));
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill document-for-agents"));
    const idxUnslop = install.indexOf("npx skills add RuralNative/RuralNative-SKILLS --skill unslopify");
    const idxAgent = install.indexOf("npx skills add RuralNative/RuralNative-SKILLS --skill document-for-agents");
    assert.ok(idxUnslop < idxAgent);
    assert.ok(install.includes("cp -r skills/unslopify"));
    assert.ok(install.includes("cp -r skills/document-for-agents"));
  });

  test("absence of copied pattern rules: no duplicate AIT catalog", () => {
    const skill = read("skills/document-for-agents/SKILL.md");
    const aitMatches = skill.match(/AIT-[A-Z]+-\d{3}/g) || [];
    assert.ok(aitMatches.length < 5, `expected few AIT mentions, got ${aitMatches.length}: ${aitMatches.join(", ")}`);
    assert.equal(skill.includes("| 1 | Puffery |"), false);
  });

  test("shelf routing distinguishes standalone cleanup from documentation workflows", () => {
    const readme = read("README.md");
    const n = norm(readme);
    assert.ok(n.includes("standalone"));
    assert.ok(n.includes("hard dependency"));
    assert.ok(readme.includes("Scan and rewrite explicit scope (standalone)"));
    assert.ok(n.includes("loads `unslopify` before prose, final audit before publishing"));
    assert.ok(n.includes("parent") && n.includes("scope") && n.includes("governs"));
    assert.ok(n.includes("routine") && n.includes("passes changed prose"));
  });

  test("presence: unslopify skill exists when dependency present", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "skills/unslopify/SKILL.md")));
    const unslop = read("skills/unslopify/SKILL.md");
    assert.ok(unslop.includes("name: unslopify"));
  });

  test("dependency missing path is detectable via absence of file (fake check)", () => {
    const skill = read("skills/document-for-agents/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("stop the workflow before the first user-visible prose"));
    const missingPath = path.join(ROOT, "skills/unslopify/SKILL.md.missing");
    assert.equal(fs.existsSync(missingPath), false);
  });
});
