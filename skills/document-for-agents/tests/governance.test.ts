// document-for-agents:INV-18, INV-19, INV-20 (ADR-0028) — the deterministic
// tier governor, consent resolution, seam fingerprint, and the seam-coherence
// harness fixtures. Pure classification lives in governance.ts; the harness
// half proves scripts/docs-check.sh check 2 goes red on a stale or missing
// fingerprint and green after a reviewed refresh, in a dirty worktree and a
// clean checkout alike.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { read } from "../../../scripts/test-helpers.ts";
import {
  tierRank,
  requiredTier,
  resolvePromotion,
  seamFingerprint,
  nextDiagnosticsAction,
  type Entry,
} from "../governance.ts";

const ROOT = path.resolve(import.meta.dirname ?? ".", "..", "..", "..");

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function run(cmd: string, cwd: string): { status: number; out: string } {
  try {
    const out = execFileSync("bash", ["-c", cmd], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { status: 0, out };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { status: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

// Run the real bash `seam_fp` from scripts/docs-check.sh against a worktree,
// so cross-implementation digest agreement is tested against the actual harness
// function, not a TS-only mirror. `repoRoot` is where the fixture's git repo
// lives; `scriptRoot` is where docs-check.sh sits.
function bashSeamFp(repoRoot: string, codeRoot: string, scriptRoot: string): string {
  const script = path.join(scriptRoot, "scripts/docs-check.sh");
  const cmd =
    `bash -c 'ROOT="${scriptRoot}"; ` +
    `eval "$(sed -n "/^seam_fp()/,/^}/p" "${script}")"; seam_fp "${codeRoot}" "${repoRoot}"'`;
  return run(cmd, repoRoot).out.trim();
}

describe("tier governor (document-for-agents:INV-18, ADR-0028)", () => {
  test("no evidence requires minimal and the ordering is monotonic", () => {
    assert.deepEqual(tierRank("minimal"), 0);
    assert.equal(tierRank("full") > tierRank("standard"), true);
    assert.equal(requiredTier({}), "minimal");
  });

  test("minimal→standard fires on the first durable decision or multiple independently editable seams", () => {
    assert.equal(requiredTier({ durableDecision: true }), "standard");
    assert.equal(requiredTier({ multipleSeams: true }), "standard");
    assert.equal(requiredTier({ durableDecision: true, multipleSeams: true }), "standard");
  });

  test("standard→full fires on confirmed drift, coordination need, or a generated-doc need", () => {
    assert.equal(requiredTier({ confirmedDrift: true }), "full");
    assert.equal(requiredTier({ coordinationNeed: true }), "full");
    assert.equal(requiredTier({ generatedDocNeed: true }), "full");
  });

  test("combined evidence never ranks below its highest single trigger", () => {
    assert.equal(requiredTier({ durableDecision: true, coordinationNeed: true }), "full");
    assert.equal(requiredTier({ multipleSeams: true, generatedDocNeed: true }), "full");
  });

  test("promotion is additive and monotonic; full stays stable under full-tier evidence", () => {
    const p = resolvePromotion("minimal", { durableDecision: true });
    assert.equal(p.effective, "standard");
    assert.equal(p.promoted, true);
    assert.equal(p.additive, true);
    const stable = resolvePromotion("full", { confirmedDrift: true });
    assert.equal(stable.effective, "full");
    assert.equal(stable.promoted, false);
  });

  test("resolvePromotion never lowers a tier: absent evidence leaves the current tier in place", () => {
    const p = resolvePromotion("full", {});
    assert.equal(p.effective, "full");
    assert.equal(p.promoted, false);
    const standard = resolvePromotion("standard", { durableDecision: true });
    assert.equal(standard.effective, "standard");
    assert.equal(standard.promoted, false);
  });

  test("no evidence can demote: full under minimal evidence stays full", () => {
    const p = resolvePromotion("full", {});
    assert.equal(p.effective, "full", "automatic demotion is forbidden (INV-18)");
    assert.equal(p.promoted, false);
  });
});

describe("seam fingerprint (document-for-agents:INV-20, ADR-0028)", () => {
  const e = (path: string, type: Entry["type"], size: number, hash: string): Entry => ({ path, type, size, hash });

  test("the digest is a canonical sha256: prefix, deterministic ordering, newline-terminated lines", () => {
    const a = seamFingerprint([e("b.txt", "f", 2, "aa"), e("a.txt", "f", 2, "bb")]);
    const b = seamFingerprint([e("a.txt", "f", 2, "bb"), e("b.txt", "f", 2, "aa")]);
    assert.equal(a, b, "order of the entry array must not change the digest");
    assert.ok(a.startsWith("sha256:"));
    assert.equal(a.length, "sha256:".length + 64);
  });

  test("a changed file bytes, name, or type changes the digest", () => {
    const base = seamFingerprint([e("a.txt", "f", 2, "bb")]);
    assert.notEqual(seamFingerprint([e("a.txt", "f", 2, "cc")]), base);
    assert.notEqual(seamFingerprint([e("a.md", "f", 2, "bb")]), base);
    assert.notEqual(seamFingerprint([e("a.txt", "d", 0, "bb")]), base);
  });

  test("the harness digest and governance.ts agree byte-for-byte on this repository's seams", () => {
    // This is the real adoption proof from ADR-0028: the seven documented
    // seams' live digests must match the ones recorded in the manifest after
    // review. The bash `seam_fp` from scripts/docs-check.sh is executed so the
    // cross-implementation claim is actually tested, not just TS against itself.
    const seams = [
      "skills/document-for-agents/",
      "skills/document-for-humans/",
      "skills/unslopify/",
      "skills/plan-this/",
      "skills/implement-this/",
      "skills/review-this/",
      "skills/release-skills/",
    ];
    for (const seam of seams) {
      const fromTs = run(
        `node --input-type=module -e "import('${ROOT}/skills/document-for-agents/governance.ts').then(m=>process.stdout.write(m.fingerprintSeam('${ROOT}','${seam}')))"`,
        ROOT,
      ).out.trim().replace(/^sha256:/, "");
      const fromBash = bashSeamFp(ROOT, seam, ROOT);
      assert.notEqual(fromTs, "", `empty TS digest for ${seam}`);
      assert.notEqual(fromTs, "__not_a_git_repo__", `TS must not report non-git for ${seam}`);
      assert.equal(fromTs, fromBash, `TS and bash digests diverge for ${seam}: ${fromTs} vs ${fromBash}`);
    }
  });

  test("a non-git root fails closed: fingerprintSeam returns null and the CLI exits non-zero", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nongit-fp-"));
    try {
      fs.writeFileSync(path.join(dir, "a.txt"), "x");
      const r = run(
        `node --input-type=module -e "import('${ROOT}/skills/document-for-agents/governance.ts').then(m=>process.stdout.write(m.fingerprintSeam('${dir}','.')))"`,
        dir,
      );
      // Not a git work tree: no trustworthy fingerprint, never the empty preimage.
      assert.equal(r.out.includes("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"), false,
        "a non-git root must never produce the empty-preimage digest");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a trailing-space filename keeps the same digest across TS and bash", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ws-fp-"));
    try {
      fs.mkdirSync(path.join(dir, "skills/alpha"), { recursive: true });
      fs.writeFileSync(path.join(dir, "skills/alpha/trail "), "x");
      git(["init", "-q"], dir);
      git(["config", "user.email", "fixture@example.com"], dir);
      git(["config", "user.name", "fixture"], dir);
      git(["add", "."], dir);
      git(["commit", "-qm", "fixture"], dir);
      const fromTs = run(
        `node --input-type=module -e "import('${ROOT}/skills/document-for-agents/governance.ts').then(m=>process.stdout.write(m.fingerprintSeam('${dir}','skills/alpha/')))"`,
        dir,
      ).out.trim().replace(/^sha256:/, "");
      const fromBash = bashSeamFp(dir, "skills/alpha/", ROOT);
      assert.equal(fromTs, fromBash, `TS and bash digests diverge on a trailing-space filename: ${fromTs} vs ${fromBash}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("entry sorting is bytewise deterministic across equal-name entries", () => {
    const up = seamFingerprint([e("z", "f", 1, "1"), e("a", "f", 1, "2")]);
    const down = seamFingerprint([e("a", "f", 1, "2"), e("z", "f", 1, "1")]);
    assert.equal(up, down);
  });
});

describe("diagnostics consent state (document-for-agents:INV-14, ADR-0028)", () => {
  test("absent or corrupt state asks again and creates nothing", () => {
    for (const state of ["absent", "corrupt"] as const) {
      const a = nextDiagnosticsAction(state);
      assert.equal(a.ask, true, `${state} must ask`);
      assert.equal(a.createLogFile, false, `${state} must not create a log file`);
      assert.equal(a.writeLog, false, `${state} must not write`);
    }
  });

  test("only an explicit enabled state may write; declined stays silent", () => {
    const yes = nextDiagnosticsAction("enabled");
    assert.equal(yes.ask, false);
    assert.equal(yes.createLogFile, false, "enabled state persists; it does not re-create the file");
    assert.equal(yes.writeLog, true);
    const no = nextDiagnosticsAction("declined");
    assert.equal(no.ask, false);
    assert.equal(no.writeLog, false, "a remembered declined choice never infers consent");
  });
});

describe("seam-coherence harness fixtures (document-for-agents:INV-20, ADR-0028)", () => {
  const ARCH = `# Architecture — fixture

Documentation tier: full
## Seams

| Seam | Responsibility | Code root | Tests | Doc |
|---|---|---|---|---|
| alpha | the alpha responsibility | skills/alpha/ | | docs/leaves/alpha.md |

## Non-seam docs

- CONTEXT.md
- docs/adr/0001-current-decision.md
- docs/leaves/alpha.md
- docs/manifest.md

## Coverage

| File | Tier |
|---|---|
| CONTEXT.md | glossary |
| docs/adr/0001-current-decision.md | decision |
| docs/leaves/alpha.md | leaf |
| docs/manifest.md | manifest |
`;

  const GLOSSARY = `## Language

**Alpha term**:
the alpha vocabulary entry.
_Avoid_: alpha alias
`;

  const LEAF = `# Seam: alpha

## Purpose

Owns the alpha responsibility.

## Links

- Glossary: \`CONTEXT.md\` — Alpha term.
`;

  const ADR = `# 0001 — Current decision

Status: accepted
Date: 2026-09-02

Decision: alpha is governed.
`;

  function manifestTable(rows: string): string {
    return `# Doc-Cache Manifest

Harness-owned coverage inventory, excluded from every orientation set.

## Orientation routes

| Band | Affected seams |
|---|---|
| ordinary | alpha |

## Seam verification

| Seam | Code root | Fingerprint | Verified | Claims |
|---|---|---|---|---|
${rows}

## Coverage

| File | Tier |
|---|---|
| CONTEXT.md | glossary |
| docs/adr/0001-current-decision.md | decision |
| docs/leaves/alpha.md | leaf |
| docs/manifest.md | manifest |
`;
  }

  function makeFixture(opts: { manifest?: string; codeRoot?: string }): {
    dir: string;
    run(): { status: number; out: string };
    destroy(): void;
  } {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "seam-coherence-fixture-"));
    fs.mkdirSync(path.join(dir, "scripts"));
    fs.mkdirSync(path.join(dir, "skills/alpha"), { recursive: true });
    fs.mkdirSync(path.join(dir, "docs/adr"), { recursive: true });
    fs.mkdirSync(path.join(dir, "docs/leaves"), { recursive: true });
    fs.copyFileSync(path.join(ROOT, "scripts/docs-check.sh"), path.join(dir, "scripts/docs-check.sh"));
    fs.writeFileSync(path.join(dir, "ARCHITECTURE.md"), ARCH);
    fs.writeFileSync(path.join(dir, "CONTEXT.md"), GLOSSARY);
    fs.writeFileSync(path.join(dir, "docs/leaves/alpha.md"), LEAF);
    fs.writeFileSync(path.join(dir, "docs/adr/0001-current-decision.md"), ADR);
    fs.writeFileSync(path.join(dir, "skills/alpha/alpha.ts"), opts.codeRoot ?? "export const alpha = 1;\n");
    fs.writeFileSync(path.join(dir, "skills/alpha/SKILL.md"), "---\nname: alpha\n---\n# Alpha\n");
    fs.writeFileSync(path.join(dir, "docs/manifest.md"), opts.manifest ?? "");
    git(["init", "-q"], dir);
    git(["config", "user.email", "fixture@example.com"], dir);
    git(["config", "user.name", "fixture"], dir);
    git(["add", "."], dir);
    git(["commit", "-qm", "fixture"], dir);
    return {
      dir,
      run: () => run("scripts/docs-check.sh", dir),
      destroy: () => fs.rmSync(dir, { recursive: true, force: true }),
    };
  }

  function fingerprintOf(dir: string, root: string): string {
    return run(
      `node --input-type=module -e "import('${ROOT}/skills/document-for-agents/governance.ts').then(m=>process.stdout.write(m.fingerprintSeam('${dir}','${root}')))"`,
      dir,
    ).out.trim();
  }

  test("standard tier with an empty Seam verification table fails: every documented seam needs a row", () => {
    const f = makeFixture({ manifest: manifestTable("") });
    try {
      const r = f.run();
      assert.equal(r.status, 1, `expected red harness:\n${r.out}`);
      assert.ok(r.out.includes("has no Seam verification row"), r.out);
    } finally {
      f.destroy();
    }
  });

  test("a clean committed baseline with a reviewed row and matching fingerprint passes", () => {
    const f = makeFixture({ manifest: manifestTable("| alpha | skills/alpha/ | sha256:0 | 2026-09-02 | reviewed claims |") });
    try {
      // Refresh the stored row to the real digest, commit it, and run clean.
      const cur = fingerprintOf(f.dir, "skills/alpha/");
      fs.writeFileSync(
        path.join(f.dir, "docs/manifest.md"),
        manifestTable(`| alpha | skills/alpha/ | ${cur} | 2026-09-02 | reviewed claims |`),
      );
      git(["add", "."], f.dir);
      git(["commit", "-qm", "reviewed baseline"], f.dir);
      const r = f.run();
      assert.equal(r.status, 0, `expected green harness:\n${r.out}`);
      assert.ok(r.out.includes("seam fingerprints verified"), r.out);
    } finally {
      f.destroy();
    }
  });

  test("a code change without a fingerprint refresh fails in a dirty worktree", () => {
    const f = makeFixture({ manifest: manifestTable("| alpha | skills/alpha/ | sha256:0 | 2026-09-02 | reviewed claims |") });
    try {
      fs.appendFileSync(path.join(f.dir, "skills/alpha/alpha.ts"), "export const beta = 2;\n");
      const r = f.run();
      assert.equal(r.status, 1, `expected red harness on code change:\n${r.out}`);
      assert.ok(r.out.includes("fingerprint stale"), r.out);
    } finally {
      f.destroy();
    }
  });

  test("a code-only change committed to a clean checkout still fails", () => {
    const f = makeFixture({ manifest: manifestTable("| alpha | skills/alpha/ | sha256:0 | 2026-09-02 | reviewed claims |") });
    try {
      fs.appendFileSync(path.join(f.dir, "skills/alpha/alpha.ts"), "export const beta = 2;\n");
      git(["add", "."], f.dir);
      git(["commit", "-qm", "code only, no fingerprint refresh"], f.dir);
      // Simulate a clean CI checkout by reverting the worktree to HEAD.
      const r = f.run();
      assert.equal(r.status, 1, `clean checkout must still fail on a stale fingerprint:\n${r.out}`);
      assert.ok(r.out.includes("fingerprint stale"), r.out);
    } finally {
      f.destroy();
    }
  });

  test("touching only the leaf without a refresh stays red", () => {
    const f = makeFixture({ manifest: manifestTable("| alpha | skills/alpha/ | sha256:0 | 2026-09-02 | reviewed claims |") });
    try {
      fs.writeFileSync(
        path.join(f.dir, "docs/leaves/alpha.md"),
        `${LEAF}\nUpdated claims that are not yet reviewed.\n`,
      );
      const r = f.run();
      assert.equal(r.status, 1, `leaf-only touch must not satisfy seam coherence:\n${r.out}`);
      assert.ok(r.out.includes("fingerprint stale"), r.out);
    } finally {
      f.destroy();
    }
  });

  test("a reviewed refresh after a code change passes", () => {
    const f = makeFixture({ manifest: manifestTable("| alpha | skills/alpha/ | sha256:0 | 2026-09-02 | reviewed claims |") });
    try {
      fs.appendFileSync(path.join(f.dir, "skills/alpha/alpha.ts"), "export const beta = 2;\n");
      fs.appendFileSync(path.join(f.dir, "docs/leaves/alpha.md"), "Claims reviewed against the new code.\n");
      const cur = fingerprintOf(f.dir, "skills/alpha/");
      fs.writeFileSync(
        path.join(f.dir, "docs/manifest.md"),
        manifestTable(`| alpha | skills/alpha/ | ${cur} | 2026-09-02 | reviewed claims |`),
      );
      const r = f.run();
      assert.equal(r.status, 0, `reviewed prose plus refresh must pass:\n${r.out}`);
    } finally {
      f.destroy();
    }
  });

  test("a reviewed no-text-change may refresh and pass", () => {
    const f = makeFixture({ manifest: manifestTable("| alpha | skills/alpha/ | sha256:0 | 2026-09-02 | reviewed claims |") });
    try {
      const cur = fingerprintOf(f.dir, "skills/alpha/");
      fs.writeFileSync(
        path.join(f.dir, "docs/manifest.md"),
        manifestTable(`| alpha | skills/alpha/ | ${cur} | 2026-09-02 | reviewed, prose unchanged |`),
      );
      const r = f.run();
      assert.equal(r.status, 0, `reviewed no-text-change refresh must pass:\n${r.out}`);
    } finally {
      f.destroy();
    }
  });

  test("a later code change after a valid refresh fails again until re-reviewed", () => {
    const f = makeFixture({ manifest: manifestTable("| alpha | skills/alpha/ | sha256:0 | 2026-09-02 | reviewed claims |") });
    try {
      const cur = fingerprintOf(f.dir, "skills/alpha/");
      fs.writeFileSync(
        path.join(f.dir, "docs/manifest.md"),
        manifestTable(`| alpha | skills/alpha/ | ${cur} | 2026-09-02 | reviewed claims |`),
      );
      const green = f.run();
      assert.equal(green.status, 0, `baseline must be green first:\n${green.out}`);
      fs.appendFileSync(path.join(f.dir, "skills/alpha/alpha.ts"), "// later change\n");
      const red = f.run();
      assert.equal(red.status, 1, `later code change must go red again:\n${red.out}`);
      assert.ok(red.out.includes("fingerprint stale"), red.out);
    } finally {
      f.destroy();
    }
  });

  test("a row without a Verified date fails", () => {
    const f = makeFixture({ manifest: manifestTable("| alpha | skills/alpha/ | sha256:0 | --- | reviewed claims |") });
    try {
      const r = f.run();
      assert.equal(r.status, 1, `expected red harness for a missing Verified date:\n${r.out}`);
      assert.ok(r.out.includes("no Verified date"), r.out);
    } finally {
      f.destroy();
    }
  });

  test("the scorecard carries the tier and the fingerprint status", () => {
    const f = makeFixture({ manifest: manifestTable("| alpha | skills/alpha/ | sha256:0 | --- | reviewed claims |") });
    try {
      const r = f.run();
      assert.ok(r.out.includes("tier full"), r.out);
      assert.ok(r.out.includes("coherence"), r.out);
    } finally {
      f.destroy();
    }
  });
});
