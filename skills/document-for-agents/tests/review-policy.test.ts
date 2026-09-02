// document-for-agents — repository review guidance is policy: REVIEW.md is classified, indexed, checked, and kept fresh by harness check 8; templates and maintain guidance cover it (#136).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { read, norm } from "../../../scripts/test-helpers.ts";

const ROOT = path.resolve(import.meta.dirname ?? ".", "../../..");

function run(args: string[], cwd: string): { status: number; out: string } {
  try {
    const out = execFileSync("bash", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { status: 0, out };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { status: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

const FIXTURE_ARCH = `# Architecture — fixture

## Non-seam docs

- REVIEW.md

## Coverage

| File | Tier |
|---|---|
| REVIEW.md | policy |
`;

interface FixtureResult {
  dir: string;
  run(): { status: number; out: string };
  destroy(): void;
}

function makeFixture(reviewPolicy: string): FixtureResult {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "docs-check-review-fixture-"));
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.copyFileSync(path.join(ROOT, "scripts/docs-check.sh"), path.join(dir, "scripts/docs-check.sh"));
  fs.writeFileSync(path.join(dir, "ARCHITECTURE.md"), FIXTURE_ARCH);
  fs.writeFileSync(path.join(dir, "REVIEW.md"), reviewPolicy);
  const git = (args: string[]) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  git(["init", "-q"]);
  git(["config", "user.email", "fixture@example.com"]);
  git(["config", "user.name", "fixture"]);
  git(["add", "."]);
  git(["commit", "-qm", "fixture"]);
  return {
    dir,
    run: () => run(["scripts/docs-check.sh"], dir),
    destroy: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

describe("review policy classification (document-for-agents #136)", () => {
  test("classify routes repository review guidance to the policy tier", () => {
    const classify = read("skills/document-for-agents/reference/classify.md");
    const n = norm(classify);
    assert.ok(n.includes("repository review guidance is policy"));
    assert.ok(n.includes("root `review.md`") || n.includes("a root `review.md`"));
    assert.ok(n.includes("linked from the index"));
    assert.ok(n.includes("never restated in leaves"));
    assert.ok(n.includes("updated in the same change as the rules it states"));
    // Cloud-side configuration stays outside the doc cache
    assert.ok(n.includes("platform setup") || n.includes("external setup"), "cloud configuration must stay outside the cache");
    // The policy tier row in the routing table still governs
    assert.ok(classify.includes("| What are the cross-cutting rules? | policy | policy doc ≤ 105 lines | linked from index; never restated in leaves |"));
  });

  test("REVIEW.md exists at the root, is indexed, and fits the 105-line policy budget", () => {
    const review = read("REVIEW.md");
    const arch = read("ARCHITECTURE.md");
    const manifest = read("docs/manifest.md");
    const lines = review.split("\n").length;
    assert.ok(lines <= 105, `policy must stay within the 105-line budget, got ${lines} lines`);
    assert.ok(manifest.includes("| REVIEW.md | policy |"), "coverage manifest must list REVIEW.md as policy");
    assert.ok(arch.includes("- REVIEW.md"), "non-seam list must carry REVIEW.md");
    // The marker line the freshness mechanism parses must exist
    assert.ok(review.includes("<!-- Governs-from:"), "Governs-from declaration line must exist");
  });

  test("REVIEW.md defines the required policy areas", () => {
    const n = norm(read("REVIEW.md"));
    for (const area of [
      "scope",
      "severity",
      "trust rules",
      "verification expectations",
      "current-head freshness",
      "duplicate handling",
      "inline-comment evidence",
      "subagent use",
    ]) {
      assert.ok(n.includes(area), `policy must define ${area}`);
    }
  });

  test("subagents are read-only and the main reviewer verifies findings before publication", () => {
    const n = norm(read("REVIEW.md"));
    assert.ok(n.includes("read-only"), "subagents must be declared read-only");
    assert.ok(
      n.includes("verifies every finding") && n.includes("before publishing"),
      "the main reviewer verifies every finding before publication"
    );
  });

  test("cloud review aligns with the Standards and Spec axes without merge or closure authority", () => {
    const n = norm(read("REVIEW.md"));
    assert.ok(n.includes("standards") && n.includes("spec"), "local axes must be named");
    assert.ok(n.includes("two axes"), "the two local axes frame the alignment");
    assert.ok(n.includes("base branch"), "cloud reads the policy from the base branch");
    assert.ok(n.includes("cannot merge or close"), "cloud review has no merge or closure authority");
    assert.ok(n.includes("adds evidence"), "cloud review is additional evidence under one policy");
  });
});

describe("review policy template and index guidance (document-for-agents #136)", () => {
  test("templates document the REVIEW.md shape and the external setup prerequisite", () => {
    const n = norm(read("skills/document-for-agents/reference/templates.md"));
    assert.ok(n.includes("review.md"), "templates must name the review policy file");
    assert.ok(n.includes("pull-request base branch"), "templates must state the base-branch read path");
    for (const topic of [
      "scope",
      "severity",
      "trust rules",
      "verification expectations",
      "current-head freshness",
      "duplicate handling",
      "evidence",
      "subagent",
    ]) {
      assert.ok(n.includes(topic), `template guidance must list ${topic}`);
    }
    assert.ok(
      n.includes("external setup"),
      "adopter guidance must keep cloud configuration an external setup prerequisite"
    );
    assert.ok(n.includes("105-line policy budget") || n.includes("≤ 105 lines"), "review policy follows the line budget");
  });

  test("leaf docs point to the review policy instead of restating it", () => {
    const agentsLeaf = read("docs/leaves/document-for-agents.md");
    const implLeaf = read("docs/leaves/implement-this.md");
    const reviewLeaf = read("docs/leaves/review-this.md");
    for (const leaf of [agentsLeaf, implLeaf, reviewLeaf]) {
      assert.ok(leaf.includes("`REVIEW.md`"), "each workflow leaf must link the review policy");
    }
    // Pointing, not restating: no leaf redefines severity or trust wholesale
    for (const leaf of [implLeaf, reviewLeaf]) {
      assert.ok(!leaf.includes("## Severity"), "leaves must not restate policy sections");
      assert.ok(!leaf.includes("## Trust rules"), "leaves must not restate policy sections");
    }
    assert.ok(norm(agentsLeaf).includes("check 8"), "the owning leaf names the enforcing check");
  });
});

describe("review policy maintenance behavior (document-for-agents #136)", () => {
  test("maintain updates a stated policy in the same commit as its rules", () => {
    const n = norm(read("skills/document-for-agents/SKILL.md"));
    assert.ok(n.includes("a change to rules a policy states updates that policy doc"));
    assert.ok(n.includes("including the root review policy"));
    assert.ok(n.includes("in the same commit"));
  });

  test("harness check 8 documents governing-source freshness for policy docs", () => {
    const n = norm(read("skills/document-for-agents/reference/harness.md"));
    assert.ok(n.includes("governs-from"), "harness must name the Governs-from declaration");
    assert.ok(n.includes("governing sources"), "harness must describe declared governing sources");
    assert.ok(n.includes("dormant when no source is declared"), "freshness half stays dormant without declarations");
    assert.ok(
      n.includes("not tied to one subdirectory"),
      "policy coverage must not be tied to one subdirectory"
    );
  });
});

describe("doc-harness fixtures: review policy checks (#136)", () => {
  test("presence and index coverage pass on a clean fixture", () => {
    const f = makeFixture("# Review policy\n\n<!-- Governs-from: -->\n\nRules live here.\n");
    try {
      const r = f.run();
      assert.equal(r.status, 0, `expected green harness, got:\n${r.out}`);
      assert.ok(r.out.includes("coverage: table <-> disk match"));
      assert.ok(r.out.includes("policy coverage: policies indexed and fresh"));
    } finally {
      f.destroy();
    }
  });

  test("missing-file failure: indexed policy absent on disk fails", () => {
    const f = makeFixture("# Review policy\n\n<!-- Governs-from: -->\n\nRules.\n");
    try {
      fs.rmSync(path.join(f.dir, "REVIEW.md"));
      const r = f.run();
      assert.equal(r.status, 1);
      assert.ok(r.out.includes("linked from the index but missing on disk"), r.out);
    } finally {
      f.destroy();
    }
  });

  test("unlinked failure: policy on disk without an index row fails", () => {
    const f = makeFixture("# Review policy\n\n<!-- Governs-from: -->\n\nRules.\n");
    try {
      const archPath = path.join(f.dir, "ARCHITECTURE.md");
      fs.writeFileSync(archPath, FIXTURE_ARCH.replace("\n| REVIEW.md | policy |", ""));
      const r = f.run();
      assert.equal(r.status, 1);
      assert.ok(r.out.includes("on disk but not linked from the index"), r.out);
    } finally {
      f.destroy();
    }
  });

  test("same-change freshness: changed governing source fails until the policy changes too", () => {
    const f = makeFixture("# Review policy\n\n<!-- Governs-from: rules.md -->\n\nRules.\n");
    try {
      fs.writeFileSync(path.join(f.dir, "rules.md"), "rule one\n");
      execFileSync("git", ["add", "."], { cwd: f.dir });
      execFileSync("git", ["commit", "-qm", "rules"], { cwd: f.dir });
      // The governing rule changes in the working tree; the policy does not.
      fs.appendFileSync(path.join(f.dir, "rules.md"), "rule two\n");
      const stale = f.run();
      assert.equal(stale.status, 1);
      assert.ok(stale.out.includes("not updated although governing source 'rules.md' changed"), stale.out);
      // Same-change fix: touching the policy in the same diff turns it green.
      const reviewPath = path.join(f.dir, "REVIEW.md");
      fs.writeFileSync(reviewPath, `${fs.readFileSync(reviewPath, "utf8")}\nRule one summarized.\n`);
      const fresh = f.run();
      assert.equal(fresh.status, 0, `expected green after same-change update, got:\n${fresh.out}`);
    } finally {
      f.destroy();
    }
  });

  test("declared but missing governing source fails loudly instead of staying dormant", () => {
    const f = makeFixture("# Review policy\n\n<!-- Governs-from: rules.md -->\n\nRules.\n");
    try {
      const r = f.run();
      assert.equal(r.status, 1);
      assert.ok(r.out.includes("governing source 'rules.md' declared by 'REVIEW.md' does not exist"), r.out);
    } finally {
      f.destroy();
    }
  });

  test("freshness dormant when no governing source is declared", () => {
    const f = makeFixture("# Review policy\n\n<!-- Governs-from: -->\n\nRules.\n");
    try {
      fs.writeFileSync(path.join(f.dir, "unrelated.md"), "drift\n");
      const r = f.run();
      assert.equal(r.status, 0, `undeclared drift must not fail the policy check:\n${r.out}`);
    } finally {
      f.destroy();
    }
  });
});
