// document-for-agents:INV-16 — Audit stays read-only; Improve shows one
// complete migration preview, makes no repository changes before one explicit
// approval, applies the complete approved delta, and finishes only after the
// prose audit and harness pass.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { read, norm } from "../../../scripts/test-helpers.ts";

const ROOT = path.resolve(import.meta.dirname ?? ".", "..", "..", "..");

function fixture(name: string): Record<string, unknown> {
  return JSON.parse(read(`skills/document-for-agents/tests/fixtures/${name}.json`));
}

function run(cmd: string, cwd: string): { status: number; out: string } {
  try {
    const out = execFileSync("bash", ["-c", cmd], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, out };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { status: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

const LEGACY_ARCH = `# Architecture — check-fixture

## Seams

| Seam | Responsibility | Code root | Tests | Doc |
|---|---|---|---|---|
| alpha | the alpha responsibility | src/alpha/ | | docs/leaves/alpha.md |

## Non-seam docs

- CONTEXT.md
- docs/adr/0001-current-decision.md
- docs/leaves/alpha.md

## Superseded decisions

(none)

## Coverage

| File | Tier |
|---|---|
| CONTEXT.md | glossary |
| docs/adr/0001-current-decision.md | decision |
| docs/leaves/alpha.md | leaf |
`;

function manifestArch(): string {
  return LEGACY_ARCH.replace(
    "| docs/leaves/alpha.md | leaf |\n",
    "| docs/leaves/alpha.md | leaf |\n| docs/manifest.md | manifest |\n",
  ).replace(
    "- docs/leaves/alpha.md\n",
    "- docs/leaves/alpha.md\n- docs/manifest.md\n",
  );
}

const GLOSSARY = `## Language

**Alpha term**:
the alpha vocabulary entry.
_Avoid_: alpha alias
`;

const LEAF = `# Seam: alpha

## Purpose

Owns the alpha responsibility.

## Scope & boundaries

**Not here**: beta work routes to the beta seam.

## Links

- Glossary: \`CONTEXT.md\` — Alpha term.
- Decision: \`docs/adr/0001-current-decision.md\` — requires.
`;

const ADR = `# 0001 — Current decision

Status: accepted
Date: 2026-08-29

Decision: the current decision shapes alpha.
`;

function manifestFor(routes: string): string {
  const coverage = [
    "| File | Tier |",
    "|---|---|",
    "| CONTEXT.md | glossary |",
    "| docs/adr/0001-current-decision.md | decision |",
    "| docs/leaves/alpha.md | leaf |",
    "| docs/manifest.md | manifest |",
  ].join("\n");
  return [
    "# Doc-Cache Manifest",
    "",
    "Harness-owned coverage inventory, excluded from every orientation set.",
    "",
    "## Orientation routes",
    "",
    "| Band | Affected seams |",
    "|---|---|",
    routes,
    "",
    "## Coverage",
    "",
    coverage,
  ].join("\n");
}

function makeCheckFixture(opts: {
  routes?: string;
  padLeafBytes?: number;
  withManifest?: boolean;
}): { dir: string; run(): { status: number; out: string }; destroy(): void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "docs-check-orientation-fixture-"));
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.mkdirSync(path.join(dir, "docs/adr"), { recursive: true });
  fs.mkdirSync(path.join(dir, "docs/leaves"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "scripts/docs-check.sh"), path.join(dir, "scripts/docs-check.sh"));
  fs.writeFileSync(path.join(dir, "ARCHITECTURE.md"), opts.withManifest === false ? LEGACY_ARCH : manifestArch());
  fs.writeFileSync(path.join(dir, "CONTEXT.md"), GLOSSARY);
  fs.writeFileSync(path.join(dir, "docs/leaves/alpha.md"), LEAF);
  fs.writeFileSync(path.join(dir, "docs/adr/0001-current-decision.md"), ADR);
  if (opts.withManifest !== false) {
    fs.writeFileSync(
      path.join(dir, "docs/manifest.md"),
      manifestFor(opts.routes ?? ""),
    );
  }
  if (typeof opts.padLeafBytes === "number" && opts.padLeafBytes > 0) {
    fs.appendFileSync(path.join(dir, "docs/leaves/alpha.md"), "x".repeat(opts.padLeafBytes));
  }
  const git = (args: string[]) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  git(["init", "-q"]);
  git(["config", "user.email", "fixture@example.com"]);
  git(["config", "user.name", "fixture"]);
  git(["add", "."]);
  git(["commit", "-qm", "fixture"]);
  return {
    dir,
    run: () => run("scripts/docs-check.sh", dir),
    destroy: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

describe("Audit read-only and the Improve approval gate (document-for-agents:INV-16)", () => {
  const SKILL = "skills/document-for-agents/SKILL.md";
  const INSTALL = "skills/document-for-agents/INSTALL.md";

  test("an explicit Audit invocation is read-only: it diagnoses and completes with a plan, never changes the repo", () => {
    const fi = fixture("audit-readonly");
    assert.equal(fi.mutationGuarantee, "no file created, moved, deleted, or rewritten by Audit");
    const n = norm(read(SKILL));
    assert.ok(n.includes("branch b"));
    assert.ok(n.includes("no repository changes"), "Audit must never claim it mutates the repository");
    assert.ok(n.includes("read-only"), "Audit must be declared read-only");
    assert.ok(n.includes("finish with a plan, not a report"));
  });

  test("Improve diagnoses, shows one complete migration preview, and makes no changes before one explicit approval", () => {
    const fi = fixture("improve-preview");
    assert.equal(fi.approved, false);
    const actions = (fi.preview as { delta: Array<{ action: string }> }).delta.map((d) => d.action);
    for (const action of ["trim", "add", "move", "delete", "manifest", "generate"]) {
      assert.ok(actions.includes(action), `preview delta must carry a ${action} action`);
    }
    const n = norm(read(SKILL));
    assert.ok(n.includes("improve"));
    assert.ok(n.includes("one complete migration preview") || n.includes("one full migration preview"));
    assert.ok(n.includes("one explicit approval"));
    assert.ok(
      n.includes("no repository changes before") ||
        n.includes("no changes before") ||
        n.includes("makes no changes before"),
    );
    assert.ok(n.includes("waits for") || n.includes("wait for"));
    const install = norm(read(INSTALL));
    assert.ok(install.includes("improve"), "the published skill must explain the Improve path");
  });

  test("after one explicit approval Improve applies the complete approved delta and finishes only after prose audit and harness pass", () => {
    const n = norm(read(SKILL));
    assert.ok(n.includes("complete approved delta") || n.includes("approved delta"));
    assert.ok(n.includes("prose audit") && n.includes("harness"));
    assert.ok(
      n.includes("finish only after the prose audit and harness pass") ||
        n.includes("finishes only after") ||
        n.includes("only after the prose audit and harness pass"),
    );
  });

  test("Improve preserves unrecoverable facts and removes restatement and history before proposing a seam split", () => {
    const n = norm(read(SKILL));
    assert.ok(n.includes("unrecoverable") || n.includes("unrecoverable facts"));
    assert.ok(n.includes("restatement"));
    assert.ok(n.includes("history"));
    assert.ok(n.includes("seam split") || n.includes("split"));
  });

  test("seam splitting requires independent code ownership, invariants, entry points, and change cadence", () => {
    const n = norm(read(SKILL));
    assert.ok(n.includes("code ownership") || n.includes("ownership"));
    assert.ok(n.includes("invariants"));
    assert.ok(n.includes("entry points"));
    assert.ok(n.includes("change cadence"));
    assert.ok(n.includes("split"));
  });

  test("the published skill explains how legacy caches without the manifest enter Improve instead of claiming compliance", () => {
    const n = norm(read(INSTALL));
    assert.ok(n.includes("improve"));
    assert.ok(n.includes("manifest") || n.includes("coverage manifest"));
    assert.ok(n.includes("legacy") || n.includes("existing") || n.includes("without the manifest"));
  });
});

describe("docs-check.sh check 11: Orientation budget fixtures", () => {
  test("a within-cap declared route passes with an orientation budget note", () => {
    const f = makeCheckFixture({ routes: "| ordinary | alpha |" });
    try {
      const r = f.run();
      assert.equal(r.status, 0, `expected green harness:\n${r.out}`);
      assert.ok(r.out.includes("orientation budget"), r.out);
      assert.ok(r.out.includes("within caps"), r.out);
    } finally {
      f.destroy();
    }
  });

  test("an over-cap declared route fails before any broad load and reports band, bytes, cap, source count, and sources", () => {
    const oversized = 6000;
    const f = makeCheckFixture({ routes: "| ordinary | alpha |", padLeafBytes: oversized });
    try {
      const r = f.run();
      assert.equal(r.status, 1, `expected over-budget failure:\n${r.out}`);
      assert.ok(r.out.includes("orientation budget"), r.out);
      assert.ok(r.out.includes("over budget"), r.out);
      assert.ok(r.out.includes("resolved bytes"), r.out);
      assert.ok(r.out.includes("cap"), r.out);
      assert.ok(r.out.includes("source count"), r.out);
      assert.ok(r.out.includes("docs/leaves/alpha.md"), "exact sources must appear for diagnosis");
      assert.equal(r.out.includes("docs/manifest.md"), false, "the manifest must never appear in a resolved set");
    } finally {
      f.destroy();
    }
  });

  test("with no manifest the check stays dormant rather than failing an un-migrated tree", () => {
    const f = makeCheckFixture({ withManifest: false });
    try {
      const r = f.run();
      assert.equal(r.status, 0, `expected dormant note:\n${r.out}`);
      assert.ok(r.out.includes("dormant"), r.out);
    } finally {
      f.destroy();
    }
  });

  test("the manifest is the exhaustive coverage inventory check 1 parses", () => {
    const f = makeCheckFixture({ routes: "| ordinary | alpha |" });
    try {
      fs.writeFileSync(path.join(f.dir, "docs/unlisted.md"), "# Unlisted\n");
      const r = f.run();
      assert.equal(r.status, 1, "a doc on disk but missing from the manifest must fail coverage");
      assert.ok(r.out.includes("on disk but not listed"), r.out);
    } finally {
      f.destroy();
    }
  });

  test("a declared route over the re-orientation cap fails under that band's cap", () => {
    const f = makeCheckFixture({ routes: "| re-orientation | alpha |", padLeafBytes: 7000 });
    try {
      const r = f.run();
      assert.equal(r.status, 1, `expected re-orientation over-budget failure:\n${r.out}`);
      assert.ok(r.out.includes("re-orientation"), r.out);
    } finally {
      f.destroy();
    }
  });
});