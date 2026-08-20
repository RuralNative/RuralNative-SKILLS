// release-skills:INV-1 — identity == folder
// release-skills:INV-2 — trigger phrases and auto-detection without manual configuration
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
    assert.ok(fs.existsSync(path.join(ROOT, "skills/release-skills/tests/composition.test.ts")));
  });

  test("does not alter other seams", () => {
    const plan = read("skills/plan-this/SKILL.md");
    assert.ok(plan.includes("name: plan-this"));
    const implement = read("skills/implement-this/SKILL.md");
    assert.ok(implement.includes("name: implement-this"));
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

describe("release-skills discovery and installation (release-skills:INV-1, release-skills:INV-2)", () => {
  test("registry-lane install guidance present with exact command and manual copy pair", () => {
    const install = read("skills/release-skills/INSTALL.md");
    assert.ok(install.includes("npx skills add RuralNative/RuralNative-SKILLS --skill release-skills"), "install must contain registry lane command");
    assert.ok(install.includes("cp -r skills/release-skills"), "install must contain manual copy");
    // registry and manual sections both reference the same skill identity
    const registryCount = (install.match(/npx skills add RuralNative\/RuralNative-SKILLS --skill release-skills/g) || []).length;
    assert.ok(registryCount >= 1, "registry command must appear at least once");
    const manualCount = (install.match(/cp -r skills\/release-skills/g) || []).length;
    assert.ok(manualCount >= 1, "manual copy must appear at least once");
  });

  test("skill prose does not duplicate the install command", () => {
    const skill = read("skills/release-skills/SKILL.md");
    // install docs live in INSTALL.md only; SKILL.md must not carry the registry lane
    assert.equal(
      skill.includes("npx skills add RuralNative/RuralNative-SKILLS --skill release-skills"),
      false,
      "SKILL.md must not duplicate the registry-lane install command"
    );
    assert.equal(skill.includes("cp -r skills/release-skills"), false, "SKILL.md must not duplicate the manual copy");
  });

  test("skill description declares registry discovery via skill identity", () => {
    const skill = read("skills/release-skills/SKILL.md");
    const install = read("skills/release-skills/INSTALL.md");
    // SKILL.md frontmatter must declare release-skills; INSTALL explains registry walk
    assert.ok(skill.includes("name: release-skills"));
    const nInstall = norm(install);
    assert.ok(nInstall.includes("registry") || install.includes("npx skills add"));
    assert.ok(install.includes("skills/release-skills"), "install must reference skills/release-skills path");
  });

  test("leaf and architecture declare real test location instead of identity-only", () => {
    const arch = read("ARCHITECTURE.md");
    const leaf = read("docs/leaves/release-skills.md");
    // arch Tests column must name real test location
    assert.ok(arch.includes("skills/release-skills/tests"), "ARCHITECTURE must name real test location for release-skills");
    assert.ok(!arch.match(/\| release-skills \|[^|]*\| identity == folder check\s*\|/), "must not remain identity-only");
    // leaf key files must mention INSTALL.md and tests
    assert.ok(leaf.includes("INSTALL.md"), "leaf Key files must mention INSTALL.md");
    assert.ok(leaf.includes("tests/") || leaf.includes("composition.test.ts"), "leaf must mention tests");
  });
});

describe("release-skills trigger phrases and project detection (release-skills:INV-2)", () => {
  test("skill description lists release trigger phrases", () => {
    const skill = read("skills/release-skills/SKILL.md");
    // frontmatter description and When to Use section list triggers
    const triggers = [
      "release",
      "发布",
      "new version",
      "bump version",
      "push",
      "推送",
      "release notes",
      "GitHub Release",
      "回填 Release",
    ];
    for (const t of triggers) {
      assert.ok(skill.includes(t), `skill must list trigger phrase "${t}"`);
    }
    // also check When to Use section exists
    assert.ok(skill.includes("When to Use"), "skill must have When to Use section");
  });

  test("skill advertises universal auto-detection without manual configuration", () => {
    const skill = read("skills/release-skills/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("auto-detect") || n.includes("auto-detects"), "skill must advertise auto-detection");
    assert.ok(skill.includes("Supported Projects") || n.includes("supported projects"), "skill must have Supported Projects");
    // phrase indicating no manual configuration needed
    assert.ok(
      n.includes("without manual configuration") ||
        n.includes("auto-detects version files") ||
        n.includes("auto-detected"),
      "skill must indicate no manual config"
    );
  });

  test("skill documents supported project types and version files", () => {
    const skill = read("skills/release-skills/SKILL.md");
    const expected = [
      "package.json",
      "pyproject.toml",
      "Cargo.toml",
      "marketplace.json",
      "VERSION",
      "version.txt",
    ];
    for (const f of expected) {
      assert.ok(skill.includes(f), `skill must mention version file ${f}`);
    }
    // table rows
    assert.ok(skill.includes("Node.js"), "must list Node.js");
    assert.ok(skill.includes("Python"), "must list Python");
    assert.ok(skill.includes("Rust"), "must list Rust");
    assert.ok(skill.includes("Claude Plugin"), "must list Claude Plugin");
    assert.ok(skill.includes("Generic"), "must list Generic");
  });

  test("skill documents auto-detect priority order for version files", () => {
    const skill = read("skills/release-skills/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("auto-detect version file by scanning") || n.includes("auto-detect version file"), "must document auto-detect scanning");
    assert.ok(n.includes("priority order"), "must mention priority order");
    // order is checked by index positions
    const idxPkg = skill.indexOf("package.json");
    const idxPy = skill.indexOf("pyproject.toml");
    const idxCargo = skill.indexOf("Cargo.toml");
    const idxMarket = skill.indexOf("marketplace.json");
    const idxVersion = skill.indexOf("VERSION");
    assert.ok(idxPkg !== -1 && idxPy !== -1 && idxCargo !== -1 && idxMarket !== -1 && idxVersion !== -1, "all version files must appear");
    assert.ok(idxPkg < idxPy && idxPy < idxCargo && idxCargo < idxMarket && idxMarket < idxVersion, "version file priority order must be package.json -> pyproject.toml -> Cargo.toml -> marketplace.json -> VERSION");
  });

  test("skill documents changelog detection via glob patterns", () => {
    const skill = read("skills/release-skills/SKILL.md");
    assert.ok(skill.includes("CHANGELOG*.md"), "must mention CHANGELOG glob");
    assert.ok(skill.includes("HISTORY*.md") || skill.includes("HISTORY"), "must mention HISTORY pattern");
    assert.ok(skill.includes("CHANGES*.md") || skill.includes("CHANGES"), "must mention CHANGES pattern");
  });

  test("invariants are test-encoded under declared test location", () => {
    const arch = read("ARCHITECTURE.md");
    // extract tests location for release-skills row
    const line = arch.split("\n").find((l) => l.startsWith("| release-skills "));
    assert.ok(line, "release-skills row must exist in ARCHITECTURE");
    assert.ok(line.includes("skills/release-skills/tests"), "tests column must contain declared test location");
    // check that INV-1 and INV-2 appear literally in files under that location
    const testFile = read("skills/release-skills/tests/composition.test.ts");
    assert.ok(testFile.includes("INV-1"), "test file must literally contain INV-1");
    assert.ok(testFile.includes("INV-2"), "test file must literally contain INV-2");
    // also ensure they appear as release-skills:INV identifiers (canonical)
    assert.ok(testFile.includes("release-skills:INV-1") || testFile.includes("release-skills:INV-2"));
  });

  test("skill workflow preserves release pipeline without prose drift", () => {
    const skill = read("skills/release-skills/SKILL.md");
    // spot-check ten-step workflow still present
    const steps = [
      "Step 1: Detect Project Configuration",
      "Step 2: Analyze Changes Since Last Tag",
      "Step 3: Determine Version Bump",
      "Step 4: Generate Multi-language Changelogs",
      "Step 7: Generate Changelog and Update Version",
      "Step 10: Publish Release Artifacts and GitHub Release",
      "Backfill Existing GitHub Releases",
    ];
    for (const s of steps) {
      assert.ok(skill.includes(s), `skill must still contain ${s}`);
    }
  });
});

describe("release-skills packaging boundary", () => {
  test("skill does not add extra runtime machinery", () => {
    const skill = read("skills/release-skills/SKILL.md");
    const files = fs.readdirSync(path.join(ROOT, "skills/release-skills"));
    assert.ok(!files.includes("package.json"), "must not add npm package");
    assert.ok(!files.includes("scripts"), "must not add scripts directory");
    // INSTALL must not invent second mechanism
    assert.ok(skill.includes("release-skills"), "skill must remain release-skills");
  });

  test("skill frontmatter and body remain intact (prose untouched except tests)", () => {
    const skill = read("skills/release-skills/SKILL.md");
    // frontmatter remains release-skills without renaming
    assert.match(skill, /name: release-skills/);
    // description still declares universal workflow
    assert.ok(skill.includes("Universal release workflow"), "description must remain universal release workflow");
  });
});
