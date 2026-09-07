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
  leaf?: string;
  glossary?: string;
}): { dir: string; run(): { status: number; out: string }; destroy(): void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "docs-check-orientation-fixture-"));
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.mkdirSync(path.join(dir, "docs/adr"), { recursive: true });
  fs.mkdirSync(path.join(dir, "docs/leaves"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "scripts/docs-check.sh"), path.join(dir, "scripts/docs-check.sh"));
  fs.writeFileSync(path.join(dir, "ARCHITECTURE.md"), opts.withManifest === false ? LEGACY_ARCH : manifestArch());
  fs.writeFileSync(path.join(dir, "CONTEXT.md"), opts.glossary ?? GLOSSARY);
  fs.writeFileSync(path.join(dir, "docs/leaves/alpha.md"), opts.leaf ?? LEAF);
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

describe("docs-check.sh check 11: Orientation routes fixtures", () => {
  test("a declared route resolves with an orientation routes note", () => {
    const f = makeCheckFixture({ routes: "| ordinary | alpha |" });
    try {
      const r = f.run();
      assert.equal(r.status, 0, `expected green harness:\n${r.out}`);
      assert.ok(r.out.includes("orientation routes"), r.out);
      assert.ok(r.out.includes("declared route(s) resolve"), r.out);
    } finally {
      f.destroy();
    }
  });

  test("a large declared route still resolves without a size veto", () => {
    const f = makeCheckFixture({ routes: "| ordinary | alpha |", padLeafBytes: 20000 });
    try {
      const r = f.run();
      assert.equal(r.status, 0, `expected green harness for a large route:\n${r.out}`);
      assert.ok(r.out.includes("orientation routes"), r.out);
      assert.ok(r.out.includes("declared route(s) resolve"), r.out);
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

  test("a large declared route under the re-orientation band still resolves", () => {
    const f = makeCheckFixture({ routes: "| re-orientation | alpha |", padLeafBytes: 20000 });
    try {
      const r = f.run();
      assert.equal(r.status, 0, `expected green harness for a large re-orientation route:\n${r.out}`);
      assert.ok(r.out.includes("orientation routes"), r.out);
      assert.ok(r.out.includes("declared route(s) resolve"), r.out);
    } finally {
      f.destroy();
    }
  });

  test("check 11 processes every `- Glossary:` declaration, not just the first", () => {
    // Both declarations resolve; a second declaration pointing at a missing
    // file fails, proving the loop reads past the first line. Removing the
    // second declaration keeps the route green.
    const glossary = `## Language

**Alpha term**:
the alpha vocabulary entry.
_Avoid_: alpha alias

**Beta term**:
${"x".repeat(20000)}
`;
    const twoDeclarations = LEAF.replace(
      "- Glossary: `CONTEXT.md` — Alpha term.\n",
      "- Glossary: `CONTEXT.md` — Alpha term.\n- Glossary: `CONTEXT.md` — Beta term.\n",
    );
    const f = makeCheckFixture({ routes: "| ordinary | alpha |", leaf: twoDeclarations, glossary });
    try {
      const both = f.run();
      assert.equal(both.status, 0, `expected green harness with both declarations:\n${both.out}`);
      assert.ok(both.out.includes("declared route(s) resolve"), both.out);
      const missingSecond = twoDeclarations.replace(
        "- Glossary: `CONTEXT.md` — Beta term.\n",
        "- Glossary: `MISSING.md` — Beta term.\n",
      );
      fs.writeFileSync(path.join(f.dir, "docs/leaves/alpha.md"), missingSecond);
      const missing = f.run();
      assert.equal(missing.status, 1, `expected red harness when the second declaration is missing:\n${missing.out}`);
      assert.ok(missing.out.includes("resolved source missing — MISSING.md"), missing.out);
      fs.writeFileSync(path.join(f.dir, "docs/leaves/alpha.md"), LEAF);
      const single = f.run();
      assert.equal(single.status, 0, `expected green harness without the second declaration:\n${single.out}`);
      assert.ok(single.out.includes("declared route(s) resolve"), single.out);
    } finally {
      f.destroy();
    }
  });

  test("the same glossary block declared twice counts once", () => {
    const twice = LEAF.replace(
      "- Glossary: `CONTEXT.md` — Alpha term.\n",
      "- Glossary: `CONTEXT.md` — Alpha term.\n- Glossary: `CONTEXT.md` — Alpha term.\n",
    );
    const f = makeCheckFixture({ routes: "| ordinary | alpha |", leaf: twice });
    try {
      const r = f.run();
      assert.equal(r.status, 0, `expected green harness with a double declaration:\n${r.out}`);
      assert.ok(r.out.includes("declared route(s) resolve"), r.out);
    } finally {
      f.destroy();
    }
  });

  function bulkADR(status: string): string {
    return `# 0001 — Current decision

${status}
Date: 2026-08-29

Decision: ${"x".repeat(20000)}.
`;
  }

  // Exact-token, fail-closed status boundary: a required decision whose
  // `Status:` value is not exactly accepted | superseded (no prefix junk, no
  // trailing text) never loads. The malformed status fails the check-4
  // parseable-Status gate, so the harness is red on the status, never on an
  // orientation load.
  for (const bad of [
    "Status: draft",
    "Status: accepted-ish",
    "Status: accepted extra",
    "Status: acceptedX",
  ]) {
    test(`check 11 never loads a required decision with '${bad}'`, () => {
      const f = makeCheckFixture({ routes: "| ordinary | alpha |" });
      try {
        fs.writeFileSync(path.join(f.dir, "docs/adr/0001-current-decision.md"), bulkADR(bad));
        const r = f.run();
        assert.equal(r.status, 1, `expected check-4 status rejection:\n${r.out}`);
        assert.ok(r.out.includes("no parseable Status line"), r.out);
      } finally {
        f.destroy();
      }
    });
  }

  test("control: the same bulk with an exact 'Status: accepted' loads without a size veto", () => {
    const f = makeCheckFixture({ routes: "| ordinary | alpha |" });
    try {
      fs.writeFileSync(path.join(f.dir, "docs/adr/0001-current-decision.md"), bulkADR("Status: accepted"));
      const r = f.run();
      assert.equal(r.status, 0, `expected green harness with the large required decision:\n${r.out}`);
      assert.ok(r.out.includes("declared route(s) resolve"), r.out);
    } finally {
      f.destroy();
    }
  });

  test("check 11 processes every required `- Decision:` declaration, not just the first", () => {
    // A second required declaration pointing at the coverage manifest fails the
    // manifest-leak gate, proving the decision loop reads past the first line.
    // A missing decision file stays fail-closed (skipped for lack of a parseable
    // accepted status), matching orientation.ts, so the leak target is the
    // observable negative. Removing the second declaration keeps the route green.
    const twoDecisions = LEAF.replace(
      "- Decision: `docs/adr/0001-current-decision.md` — requires.\n",
      "- Decision: `docs/adr/0001-current-decision.md` — requires.\n- Decision: `docs/manifest.md` — requires.\n",
    );
    const f = makeCheckFixture({ routes: "| ordinary | alpha |", leaf: twoDecisions });
    try {
      fs.appendFileSync(path.join(f.dir, "docs/manifest.md"), "\nStatus: accepted\n");
      const leaked = f.run();
      assert.equal(leaked.status, 1, `expected red harness when the second decision leaks the manifest:\n${leaked.out}`);
      assert.ok(leaked.out.includes("coverage manifest leaked"), leaked.out);
      fs.writeFileSync(path.join(f.dir, "docs/leaves/alpha.md"), LEAF);
      const single = f.run();
      assert.equal(single.status, 0, `expected green harness without the second declaration:\n${single.out}`);
      assert.ok(single.out.includes("declared route(s) resolve"), single.out);
    } finally {
      f.destroy();
    }
  });
});