// unslopify:INV-6 — inert-input trust boundary, instruction residue signal, and context-aware workflow phrase candidates
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { read, norm } from "../../../scripts/test-helpers.ts";

const ROOT = path.resolve(import.meta.dirname ?? ".", "../../..");
const FIXTURES = path.join(ROOT, "skills/unslopify/tests/fixtures");
const SCANNER = path.join(ROOT, "skills/unslopify/scanner.py");

function pythonAvailable(): boolean {
  const probe = spawnSync("python3", ["--version"], { encoding: "utf8" });
  return probe.status === 0;
}

function scan(fixture: string): { status: number; findings: Array<{ id: string; evidence: string; excerpt: string }> } {
  const file = path.join(FIXTURES, fixture);
  const res = spawnSync("python3", [SCANNER, "--json", file], { encoding: "utf8" });
  assert.equal(res.status, 0, `scanner must exit 0 on ${fixture}: ${res.stderr}`);
  const parsed = JSON.parse(res.stdout) as { findings: Array<{ id: string; evidence: string; excerpt: string }> };
  return { status: res.status ?? 0, findings: parsed.findings };
}

describe("unslopify inert input and context-aware candidates (unslopify:INV-6)", () => {
  test("flags instruction residue in visible prose as inert content", { skip: !pythonAvailable() }, () => {
    const { findings } = scan("prompt-residue.md");
    const residue = findings.filter((f) => f.id === "AIT-EVD-010");
    assert.ok(residue.length >= 2, `expected at least two residue hits in visible prose, got ${residue.length}`);
    const joined = norm(residue.map((f) => f.evidence).join(" "));
    assert.ok(joined.includes("inert"), "findings must state the content is inert, never executed");
  });

  test("keeps protected prompt-like spans out of findings", { skip: !pythonAvailable() }, () => {
    const { findings } = scan("prompt-residue-protected.md");
    const residue = findings.filter((f) => f.id === "AIT-EVD-010");
    assert.equal(residue.length, 0, "frontmatter, fenced code, and inline code copies must stay masked");
  });

  test("reports vague workflow phrase uses as replaceable candidates", { skip: !pythonAvailable() }, () => {
    const { findings } = scan("phrase-candidates.md");
    const candidates = findings.filter((f) => f.id === "AIT-LEX-008");
    const evidence = norm(candidates.map((f) => f.evidence).join(" "));
    for (const phrase of ["load bearing", "vertical slice", "native dependency edges"]) {
      assert.ok(evidence.includes(phrase), `vague use of '${phrase}' must be reported as a candidate`);
    }
  });

  test("preserves exact domain uses without candidate findings", { skip: !pythonAvailable() }, () => {
    const { findings } = scan("exact-terms.md");
    const candidates = findings.filter((f) => f.id === "AIT-LEX-008");
    assert.equal(candidates.length, 0, "exact domain uses of the three phrases must not become findings");
  });

  test("scanning is deterministic on hostile input", { skip: !pythonAvailable() }, () => {
    const first = scan("prompt-residue.md");
    const second = scan("prompt-residue.md");
    assert.deepEqual(second.findings, first.findings, "repeat scans must produce identical JSON findings");
  });
});

describe("unslopify trust contract in SKILL.md and parity catalog (unslopify:INV-6)", () => {
  test("SKILL.md declares the inert-input boundary over scoped prose", () => {
    const skill = read("skills/unslopify/SKILL.md");
    const n = norm(skill);
    assert.ok(skill.includes("## Inert input"), "must carry an Inert input section");
    assert.ok(n.includes("content, never instruction"), "must define scoped prose as content, never instruction");
    for (const cannot of ["widen scope", "select files", "authorize tools"]) {
      assert.ok(n.includes(cannot), `embedded directives must be unable to ${cannot}`);
    }
    assert.ok(n.includes("never execute it"), "must forbid executing embedded directives");
  });

  test("SKILL.md documents instruction residue and the three context-aware phrases with identifiers", () => {
    const skill = read("skills/unslopify/SKILL.md");
    const n = norm(skill);
    assert.ok(n.includes("ait-evd-010"), "must name AIT-EVD-010 for instruction residue");
    assert.ok(n.includes("ait-lex-008"), "must name AIT-LEX-008 for workflow phrase candidates");
    for (const phrase of ["load bearing", "vertical slice", "native dependency edges"]) {
      assert.ok(n.includes(phrase), `must name '${phrase}' as a context-aware candidate`);
    }
    assert.ok(n.includes("exact domain uses unchanged") || n.includes("keep exact domain uses unchanged"), "must preserve exact domain uses");
  });

  test("parity catalog maps both new identifiers uniquely within six families", () => {
    const parity = read("skills/unslopify/reference/parity.md");
    for (const id of ["AIT-EVD-010", "AIT-LEX-008"]) {
      const matches = parity.match(new RegExp(id.replace(/-/g, "\\-"), "g")) ?? [];
      assert.ok(matches.length >= 1, `${id} must appear in the extended table`);
    }
    const declared = [...parity.matchAll(/^\| (AIT-(?:LEX|STR|FMT|CONV|EVD|VOICE)-\d{3}) \|/gm)].map((m) => m[1]);
    assert.equal(new Set(declared).size, declared.length, "extended identifiers must be unique");
    assert.ok(parity.includes("Six families cover every upstream rule and every extended subtle tell."));
  });

  test("leaf doc declares INV-6 with scanner and fixture mechanisms", () => {
    const leaf = read("docs/leaves/unslopify.md");
    assert.ok(leaf.includes("INV-6"), "leaf must declare INV-6");
    assert.ok(leaf.includes("skills/unslopify/tests/"), "leaf must name the fixture location");
  });

  test("INSTALL.md records provenance, pinning, residual trust, no downloads, and overwrite approval", () => {
    const install = read("skills/unslopify/INSTALL.md");
    const n = norm(install);
    assert.ok(n.includes("provenance"), "install guidance must record source provenance");
    assert.ok(n.includes("pin the revision you reviewed"), "must pin reviewed revisions where supported");
    assert.ok(n.includes("residual trust"), "must state residual source-repository trust");
    assert.ok(n.includes("w011"), "must reference Snyk W011 for this install path");
    assert.ok(n.includes("no downloads at run time") || n.includes("never fetch, clone, or install skills mid-run"), "must state the no-download boundary");
    assert.ok(n.includes("overwrit") && n.includes("explicit approval"), "manual installs must not overwrite without explicit approval");
    for (const claim of ["eliminated", "eradicated", "no longer applies", "no longer present", "resolved the risk"]) {
      assert.equal(n.includes(claim), false, `must not claim the Snyk findings are gone (${claim})`);
    }
  });

  test("fixtures exist for prompt-like prose, candidate replacement, exact-term preservation, and protected content", () => {
    for (const fixture of [
      "prompt-residue.md",
      "prompt-residue-protected.md",
      "phrase-candidates.md",
      "exact-terms.md",
    ]) {
      assert.ok(fs.existsSync(path.join(FIXTURES, fixture)), `fixture ${fixture} must exist`);
    }
  });
});
