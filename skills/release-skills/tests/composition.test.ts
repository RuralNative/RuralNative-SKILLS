// release-skills:INV-1 — identity == folder
// release-skills:INV-2 — release trigger phrases and auto-detected project types
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

describe("release-skills identity (release-skills:INV-1)", () => {
  test("folder and frontmatter identity are exactly release-skills", () => {
    const skill = read("skills/release-skills/SKILL.md");
    assert.ok(skill.includes("name: release-skills"), "frontmatter name must be exactly release-skills");
    assert.ok(fs.existsSync(path.join(ROOT, "skills/release-skills/SKILL.md")));
    assert.ok(fs.existsSync(path.join(ROOT, "skills/release-skills/INSTALL.md")));
    const match = skill.match(/name:\s*release-skills/);
    assert.ok(match, "frontmatter name must match folder release-skills");
  });

  test("does not modify other seams", () => {
    const agents = read("skills/document-for-agents/SKILL.md");
    assert.ok(agents.includes("name: document-for-agents"));
    const humans = read("skills/document-for-humans/SKILL.md");
    assert.ok(humans.includes("name: document-for-humans"));
  });
});

describe("release-skills discovery and installation (release-skills:INV-2)", () => {
  test("description declares release trigger phrases", () => {
    const skill = read("skills/release-skills/SKILL.md");
    const n = norm(skill);
    // trigger phrases declared in frontmatter description
    assert.ok(skill.includes('"release"'), "must include release trigger phrase");
    assert.ok(skill.includes('"bump version"'), "must include bump version trigger");
    assert.ok(skill.includes('"GitHub Release"'), "must include GitHub Release trigger");
    assert.ok(skill.includes('"release notes"'), "must include release notes trigger");
    assert.ok(skill.includes('"new version"'), "must include new version trigger");
    // Chinese trigger phrases
    assert.ok(skill.includes('"发布"'), "must include Chinese release trigger");
    assert.ok(skill.includes('"推送"'), "must include Chinese push trigger");
    assert.ok(skill.includes('"回填 Release"'), "must include backfill trigger");
  });

  test("registry-lane install guidance present with exact command", () => {
    const install = read("skills/release-skills/INSTALL.md");
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill release-skills"),
      "INSTALL.md must contain the registry-lane install command");
    assert.ok(install.includes("cp -r skills/release-skills"),
      "INSTALL.md must contain the manual copy command");
    // trimmed SKILL.md should not duplicate install lane
    const skill = read("skills/release-skills/SKILL.md");
    assert.equal(skill.includes("npx skills add RuralNative/RuralNative-SKILLS --skill release-skills"), false,
      "trimmed SKILL.md must not duplicate install command");
  });

  test("architecture index and leaf doc describe the seam", () => {
    const arch = read("ARCHITECTURE.md");
    assert.ok(arch.includes("release-skills"), "ARCHITECTURE seam table must list release-skills");
    assert.ok(arch.includes("skills/release-skills/"));
    assert.ok(arch.includes("docs/leaves/release-skills.md"));
    assert.ok(fs.existsSync(path.join(ROOT, "docs/leaves/release-skills.md")));
    const leaf = read("docs/leaves/release-skills.md");
    assert.ok(leaf.includes("release-skills"));
    assert.ok(leaf.includes("INV-1"));
    assert.ok(leaf.includes("INV-2"));
  });
});

describe("release-skills auto-detection contract (release-skills:INV-2)", () => {
  test("SKILL.md lists supported project types with version files", () => {
    const skill = read("skills/release-skills/SKILL.md");
    const n = norm(skill);
    // Supported projects table must exist
    assert.ok(n.includes("supported projects"), "must declare supported projects");
    assert.ok(n.includes("node.js"), "must list Node.js");
    assert.ok(n.includes("python"), "must list Python");
    assert.ok(n.includes("rust"), "must list Rust");
    assert.ok(n.includes("claude plugin"), "must list Claude Plugin");
    assert.ok(n.includes("generic"), "must list Generic");
    // version file detection
    assert.ok(n.includes("package.json"), "must name package.json as version file");
    assert.ok(n.includes("pyproject.toml"), "must name pyproject.toml");
    assert.ok(n.includes("cargo.toml"), "must name Cargo.toml");
    assert.ok(n.includes("marketplace.json"), "must name marketplace.json");
  });

  test("SKILL.md declares auto-detection without manual configuration", () => {
    const skill = read("skills/release-skills/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("auto-detect"), "must declare auto-detection");
    assert.ok(n.includes("without manual configuration") || n.includes("auto-detects your project"),
      "must state auto-detection works without manual config");
  });

  test("SKILL.md includes explicit user invocation example", () => {
    const skill = read("skills/release-skills/SKILL.md");
    assert.ok(skill.includes("/release-skills"), "must declare explicit invocation /release-skills");
    // also supports variant invocations
    assert.ok(skill.includes("--dry-run"), "must show dry-run flag as example");
  });

  test("SKILL.md includes when-to-use trigger section", () => {
    const skill = read("skills/release-skills/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("when to use"), "must have a When to Use section");
    assert.ok(n.includes("release"), "when-to-use must mention release");
    assert.ok(n.includes("bump version"), "when-to-use must mention bump version");
    assert.ok(n.includes("prepare release") || n.includes("new version"),
      "when-to-use must mention version preparation");
  });
});

describe("release-skills leaf doc consistency (release-skills:INV-1 and INV-2)", () => {
  test("leaf doc non-negotiables declare INV-1 and INV-2 with correct scope", () => {
    const leaf = read("docs/leaves/release-skills.md");
    const n = norm(leaf);
    assert.ok(leaf.includes("INV-1"), "leaf must contain INV-1");
    assert.ok(leaf.includes("INV-2"), "leaf must contain INV-2");
    // INV-1 is identity
    assert.ok(n.includes("inv-1") && n.includes("frontmatter"), "INV-1 must reference frontmatter identity");
    // INV-2 references trigger phrases and auto-detection
    assert.ok(n.includes("inv-2"), "INV-2 must be declared");
  });

  test("leaf doc key files match disk", () => {
    const leaf = read("docs/leaves/release-skills.md");
    assert.ok(leaf.includes("SKILL.md"), "leaf must name SKILL.md as key file");
    assert.ok(fs.existsSync(path.join(ROOT, "skills/release-skills/SKILL.md")));
    assert.ok(fs.existsSync(path.join(ROOT, "skills/release-skills/INSTALL.md")));
  });

  test("leaf doc links reference real artifacts", () => {
    const leaf = read("docs/leaves/release-skills.md");
    assert.ok(leaf.includes("CONTEXT.md"), "leaf must link glossary");
    assert.ok(leaf.includes("scripts/docs-check.sh"), "leaf must link harness");
  });
});
