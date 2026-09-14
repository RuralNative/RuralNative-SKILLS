// Run-local tooling repair (isolated installed-bundle copy).
//
// Exercises the real prepare-review.mjs entry point against fixture install
// roots and isolated run directories. No live GitHub, no shared installs.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PREPARE = path.join(import.meta.dirname, "..", "prepare-review.mjs");
const HEAD = "a".repeat(40);
const BASE = "b".repeat(40);
const BOUNDARY = {
  packageManager: "npm",
  frozenArgs: ["ci", "--ignore-scripts"],
  allowedPaths: ["node_modules/", ".npm/", "~/.npm/"],
  ignoreScripts: true,
};

function sha(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

interface ToolFixture {
  root: string;
  installRoot: string;
  runRoot: string;
}

function setup(): ToolFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tooling-repair-"));
  const installRoot = path.join(root, "install");
  const runRoot = path.join(root, "runs");
  fs.mkdirSync(installRoot, { recursive: true });
  fs.mkdirSync(runRoot, { recursive: true });
  // The trusted origin must look like a review-this skill installation.
  fs.writeFileSync(path.join(installRoot, "SKILL.md"), "---\nname: review-this\n---\n");
  fs.writeFileSync(path.join(installRoot, "github-facts.ts"), "export const v = 1;\n");
  fs.writeFileSync(path.join(installRoot, "github-facts.mjs"), "export const v = 1;\n");
  fs.writeFileSync(path.join(installRoot, "workflow-state.ts"), "export const guard = 1;\n");
  fs.writeFileSync(path.join(installRoot, "prepare-review.ts"), "export const guard = 1;\n");
  fs.writeFileSync(
    path.join(installRoot, "package.json"),
    JSON.stringify({ name: "fixture", private: true, scripts: { "repair-check": "node scripts/repair-check.mjs" } }),
  );
  fs.mkdirSync(path.join(installRoot, "scripts"), { recursive: true });
  // The regression check reads the helper next to itself: when the helper
  // runs it with the isolated copy as the working directory, it proves the
  // correction. An uncorrected copy (v = 1) fails.
  fs.writeFileSync(
    path.join(installRoot, "scripts", "repair-check.mjs"),
    'import { readFileSync } from "node:fs";\nconst text = readFileSync(new URL("../github-facts.ts", import.meta.url), "utf8");\nif (text !== "export const v = 2;\\n") { process.stderr.write("stale helper\\n"); process.exit(1); }\nprocess.stdout.write("ok\\n");\n',
  );
  return { root, installRoot, runRoot };
}

function invoke(input: unknown, runRoot: string): { exit: number; json: any } {
  const inputPath = path.join(runRoot, `input-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
  fs.writeFileSync(inputPath, JSON.stringify(input));
  const result = spawnSync(process.execPath, [PREPARE, inputPath], {
    encoding: "utf8",
    env: { ...process.env, REVIEW_THIS_RUN_ROOT: runRoot },
  });
  let json: any = null;
  try {
    json = JSON.parse(result.stdout ?? "");
  } catch {
    json = { raw: result.stdout, stderr: result.stderr };
  }
  return { exit: result.status ?? -1, json };
}

function prepareInput(fixture: ToolFixture, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    operation: "prepare-tooling-repair",
    repository: "o/r",
    prNumber: 312,
    headSha: HEAD,
    baseSha: BASE,
    runId: `repair-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    failedOperation: "recover-evidence",
    observedCause: "closing-link read failed: HTTP 500",
    trustedInstallRoot: fixture.installRoot,
    helperFiles: ["github-facts.ts"],
    ...overrides,
  };
}

describe("run-local tooling repair", () => {
  test("a reproduced defect prepares an isolated copy without touching the install", () => {
    const fixture = setup();
    try {
      const { exit, json } = invoke(prepareInput(fixture), fixture.runRoot);
      assert.equal(exit, 0, JSON.stringify(json));
      assert.equal(json.ok, true);
      const isolated = path.join(json.runDir, "isolated", "github-facts.ts");
      assert.equal(fs.readFileSync(isolated, "utf8"), "export const v = 1;\n");
      assert.equal(fs.readFileSync(path.join(fixture.installRoot, "github-facts.ts"), "utf8"), "export const v = 1;\n");
      assert.ok(json.record.trustedHashes["github-facts.ts"]);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("a corrected copy verifies through helper-observed regression receipts", () => {
    const fixture = setup();
    try {
      const prepared = invoke(prepareInput(fixture, { runId: "repair-verify-1" }), fixture.runRoot);
      assert.equal(prepared.exit, 0, JSON.stringify(prepared.json));
      const isolated = path.join(prepared.json.runDir, "isolated", "github-facts.ts");
      fs.writeFileSync(isolated, "export const v = 2;\n");
      const { exit, json } = invoke(
        {
          operation: "verify-tooling-repair",
          repository: "o/r",
          prNumber: 312,
          headSha: HEAD,
          baseSha: BASE,
          runId: "repair-verify-1",
          boundary: BOUNDARY,
          approvedCommands: ["repair-check"],
          commands: ["npm run repair-check"],
        },
        fixture.runRoot,
      );
      // The regression runs with the isolated copy as its working directory,
      // so exit 0 proves the correction itself passes.
      assert.equal(exit, 0, JSON.stringify(json));
      assert.equal(json.verified, true);
      assert.ok(Array.isArray(json.receipts) && json.receipts.length === 1);
      assert.equal(json.receipts[0].exitStatus, 0);
      assert.deepEqual(json.changedFiles, ["github-facts.ts"]);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("a failed regression never verifies", () => {
    const fixture = setup();
    try {
      const prepared = invoke(prepareInput(fixture, { runId: "repair-fail-1" }), fixture.runRoot);
      assert.equal(prepared.exit, 0, JSON.stringify(prepared.json));
      // A correction is present but its regression fails inside the
      // isolated copy.
      fs.writeFileSync(path.join(prepared.json.runDir, "isolated", "github-facts.ts"), "export const v = 2;\n");
      fs.writeFileSync(path.join(prepared.json.runDir, "isolated", "scripts", "repair-check.mjs"), "process.exit(1);\n");
      const { exit, json } = invoke(
        {
          operation: "verify-tooling-repair",
          repository: "o/r",
          prNumber: 312,
          headSha: HEAD,
          baseSha: BASE,
          runId: "repair-fail-1",
          boundary: BOUNDARY,
          approvedCommands: ["repair-check"],
          commands: ["npm run repair-check"],
        },
        fixture.runRoot,
      );
      assert.equal(exit, 1, JSON.stringify(json));
      assert.equal(json.kind, "restricted");
      assert.match(String(json.reason ?? ""), /failed regression/i);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("a caller-invented script never establishes a verify command", () => {
    const fixture = setup();
    try {
      const prepared = invoke(prepareInput(fixture, { runId: "repair-evil-1" }), fixture.runRoot);
      assert.equal(prepared.exit, 0, JSON.stringify(prepared.json));
      fs.writeFileSync(path.join(prepared.json.runDir, "isolated", "github-facts.ts"), "export const v = 2;\n");
      const { exit, json } = invoke(
        {
          operation: "verify-tooling-repair",
          repository: "o/r",
          prNumber: 312,
          headSha: HEAD,
          baseSha: BASE,
          runId: "repair-evil-1",
          boundary: BOUNDARY,
          approvedCommands: ["evil"],
          commands: ["npm run evil"],
        },
        fixture.runRoot,
      );
      assert.equal(exit, 1, JSON.stringify(json));
      assert.equal(json.kind, "restricted");
      assert.match(String(json.reason ?? ""), /not established|outside the approved/i);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("a denial is never a reproducible helper defect", () => {
    const fixture = setup();
    try {
      const { exit, json } = invoke(
        prepareInput(fixture, { runId: "repair-deny-1", observedCause: "permission denied: branch protection" }),
        fixture.runRoot,
      );
      assert.equal(exit, 1, JSON.stringify(json));
      assert.equal(json.kind, "restricted");
      assert.match(String(json.reason ?? ""), /not a reproducible helper defect|denial/i);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("an origin without skill provenance never prepares", () => {
    const fixture = setup();
    try {
      fs.rmSync(path.join(fixture.installRoot, "SKILL.md"));
      const { exit, json } = invoke(prepareInput(fixture, { runId: "repair-prov-1" }), fixture.runRoot);
      assert.equal(exit, 1, JSON.stringify(json));
      assert.equal(json.kind, "restricted");
      assert.match(String(json.reason ?? ""), /not a review-this skill installation/i);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("an added guard file stops verification", () => {
    const fixture = setup();
    try {
      const prepared = invoke(prepareInput(fixture, { runId: "repair-guard-add-1" }), fixture.runRoot);
      assert.equal(prepared.exit, 0, JSON.stringify(prepared.json));
      fs.writeFileSync(path.join(prepared.json.runDir, "isolated", "github-facts.ts"), "export const v = 2;\n");
      fs.writeFileSync(path.join(fixture.installRoot, "install-check.mjs"), "export const guard = 2;\n");
      const { exit, json } = invoke(
        {
          operation: "verify-tooling-repair",
          repository: "o/r",
          prNumber: 312,
          headSha: HEAD,
          baseSha: BASE,
          runId: "repair-guard-add-1",
          boundary: BOUNDARY,
          approvedCommands: ["repair-check"],
          commands: ["npm run repair-check"],
        },
        fixture.runRoot,
      );
      assert.equal(exit, 1, JSON.stringify(json));
      assert.match(String(json.reason ?? ""), /immutable guard/i);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("an unexpected isolated file stops verification", () => {
    const fixture = setup();
    try {
      const prepared = invoke(prepareInput(fixture, { runId: "repair-extra-1" }), fixture.runRoot);
      assert.equal(prepared.exit, 0, JSON.stringify(prepared.json));
      fs.writeFileSync(path.join(prepared.json.runDir, "isolated", "github-facts.ts"), "export const v = 2;\n");
      fs.writeFileSync(path.join(prepared.json.runDir, "isolated", "evil.mjs"), "evil();\n");
      const { exit, json } = invoke(
        {
          operation: "verify-tooling-repair",
          repository: "o/r",
          prNumber: 312,
          headSha: HEAD,
          baseSha: BASE,
          runId: "repair-extra-1",
          boundary: BOUNDARY,
          approvedCommands: ["repair-check"],
          commands: ["npm run repair-check"],
        },
        fixture.runRoot,
      );
      assert.equal(exit, 1, JSON.stringify(json));
      assert.match(String(json.reason ?? ""), /unexpected file/i);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("changed immutable guards stop verification", () => {
    const fixture = setup();
    try {
      const prepared = invoke(prepareInput(fixture, { runId: "repair-guard-1" }), fixture.runRoot);
      assert.equal(prepared.exit, 0, JSON.stringify(prepared.json));
      fs.writeFileSync(path.join(prepared.json.runDir, "isolated", "github-facts.ts"), "export const v = 2;\n");
      fs.writeFileSync(path.join(fixture.installRoot, "workflow-state.ts"), "export const guard = 2;\n");
      const { exit, json } = invoke(
        {
          operation: "verify-tooling-repair",
          repository: "o/r",
          prNumber: 312,
          headSha: HEAD,
          baseSha: BASE,
          runId: "repair-guard-1",
          boundary: BOUNDARY,
          approvedCommands: ["repair-check"],
          commands: ["npm run repair-check"],
        },
        fixture.runRoot,
      );
      assert.equal(exit, 1, JSON.stringify(json));
      assert.match(String(json.reason ?? ""), /immutable guard/i);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("malicious paths never prepare", () => {
    const fixture = setup();
    try {
      for (const files of [["../escape.ts"], ["/tmp/evil.mjs"], ["workflow-state.ts"]]) {
        const { exit } = invoke(prepareInput(fixture, { helperFiles: files }), fixture.runRoot);
        assert.equal(exit, 1, JSON.stringify(files));
      }
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("stale install hashes stop verification", () => {
    const fixture = setup();
    try {
      const prepared = invoke(prepareInput(fixture, { runId: "repair-stale-1" }), fixture.runRoot);
      assert.equal(prepared.exit, 0, JSON.stringify(prepared.json));
      fs.writeFileSync(path.join(prepared.json.runDir, "isolated", "github-facts.ts"), "export const v = 2;\n");
      fs.writeFileSync(path.join(fixture.installRoot, "github-facts.ts"), "export const v = 99;\n");
      const { exit, json } = invoke(
        {
          operation: "verify-tooling-repair",
          repository: "o/r",
          prNumber: 312,
          headSha: HEAD,
          baseSha: BASE,
          runId: "repair-stale-1",
          boundary: BOUNDARY,
          approvedCommands: ["repair-check"],
          commands: ["npm run repair-check"],
        },
        fixture.runRoot,
      );
      assert.equal(exit, 1, JSON.stringify(json));
      assert.match(String(json.reason ?? ""), /changed since preparation|stale/i);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("records never reuse across targets or revisions", () => {
    const fixture = setup();
    try {
      const prepared = invoke(prepareInput(fixture, { runId: "repair-reuse-1" }), fixture.runRoot);
      assert.equal(prepared.exit, 0, JSON.stringify(prepared.json));
      fs.writeFileSync(path.join(prepared.json.runDir, "isolated", "github-facts.ts"), "export const v = 2;\n");
      const { exit, json } = invoke(
        {
          operation: "verify-tooling-repair",
          repository: "o/r",
          prNumber: 999,
          headSha: HEAD,
          baseSha: BASE,
          runId: "repair-reuse-1",
          boundary: BOUNDARY,
          approvedCommands: ["repair-check"],
          commands: ["npm run repair-check"],
        },
        fixture.runRoot,
      );
      assert.equal(exit, 1, JSON.stringify(json));
      assert.match(String(json.reason ?? ""), /different target/i);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("lost repair files stop verification", () => {
    const fixture = setup();
    try {
      const { exit, json } = invoke(
        {
          operation: "verify-tooling-repair",
          repository: "o/r",
          prNumber: 312,
          headSha: HEAD,
          baseSha: BASE,
          runId: "repair-missing-1",
          boundary: BOUNDARY,
          approvedCommands: ["repair-check"],
          commands: ["npm run repair-check"],
        },
        fixture.runRoot,
      );
      assert.equal(exit, 1, JSON.stringify(json));
      assert.match(String(json.reason ?? ""), /no tooling repair record/i);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("retry budgets survive interruption and new run IDs; distinct causes get own budget", () => {
    const fixture = setup();
    try {
      const first = invoke(prepareInput(fixture, { runId: "repair-budget-1" }), fixture.runRoot);
      assert.equal(first.exit, 0, JSON.stringify(first.json));
      const second = invoke(
        prepareInput(fixture, { runId: "repair-budget-2", observedCause: "closing-link read failed: HTTP 500." }),
        fixture.runRoot,
      );
      assert.equal(second.exit, 1, JSON.stringify(second.json));
      assert.match(String(second.json.reason ?? ""), /already used/i);
      const distinct = invoke(
        prepareInput(fixture, { runId: "repair-budget-3", observedCause: "a different evidenced transport failure" }),
        fixture.runRoot,
      );
      assert.equal(distinct.exit, 0, JSON.stringify(distinct.json));
      // Interruption resume with the same runId reuses without a new budget.
      const resume = invoke(prepareInput(fixture, { runId: "repair-budget-1" }), fixture.runRoot);
      assert.equal(resume.exit, 0, JSON.stringify(resume.json));
      assert.equal(resume.json.reused, true);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("retry re-observes through the corrected isolated executable", () => {
    const fixture = setup();
    try {
      const prepared = invoke(
        prepareInput(fixture, { runId: "repair-retry-1", helperFiles: ["github-facts.ts", "github-facts.mjs"] }),
        fixture.runRoot,
      );
      assert.equal(prepared.exit, 0, JSON.stringify(prepared.json));
      fs.writeFileSync(path.join(prepared.json.runDir, "isolated", "github-facts.ts"), "export const v = 2;\n");
      fs.writeFileSync(
        path.join(prepared.json.runDir, "isolated", "github-facts.mjs"),
        'import fs from "node:fs";\nlet text = "";\nfor await (const chunk of process.stdin) text += chunk;\nconst input = JSON.parse(text);\nprocess.stdout.write(JSON.stringify({ ok: true, operation: input.operation, repository: input.repository, prNumber: input.prNumber, closingIssues: [{ owner: "o", repo: "r", number: 305 }] }) + "\\n");\n',
      );
      const verify = invoke(
        {
          operation: "verify-tooling-repair",
          repository: "o/r",
          prNumber: 312,
          headSha: HEAD,
          baseSha: BASE,
          runId: "repair-retry-1",
          boundary: BOUNDARY,
          approvedCommands: ["repair-check"],
          commands: ["npm run repair-check"],
        },
        fixture.runRoot,
      );
      assert.equal(verify.exit, 0, JSON.stringify(verify.json));
      const { exit, json } = invoke(
        {
          operation: "retry-tooling-repair",
          repository: "o/r",
          prNumber: 312,
          headSha: HEAD,
          baseSha: BASE,
          runId: "repair-retry-1",
          retryOperation: "pull-request",
        },
        fixture.runRoot,
      );
      assert.equal(exit, 0, JSON.stringify(json));
      assert.equal(json.ok, true);
      assert.deepEqual(json.retried.closingIssues, [{ owner: "o", repo: "r", number: 305 }]);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("two concurrent runs keep isolated copies with no shared changes", () => {
    const fixture = setup();
    try {
      const a = invoke(prepareInput(fixture, { runId: "repair-conc-a", observedCause: "cause a" }), fixture.runRoot);
      const b = invoke(prepareInput(fixture, { runId: "repair-conc-b", observedCause: "cause b" }), fixture.runRoot);
      assert.equal(a.exit, 0, JSON.stringify(a.json));
      assert.equal(b.exit, 0, JSON.stringify(b.json));
      assert.notEqual(a.json.runDir, b.json.runDir);
      fs.writeFileSync(path.join(a.json.runDir, "isolated", "github-facts.ts"), "export const v = 'a';\n");
      assert.equal(fs.readFileSync(path.join(b.json.runDir, "isolated", "github-facts.ts"), "utf8"), "export const v = 1;\n");
      assert.equal(fs.readFileSync(path.join(fixture.installRoot, "github-facts.ts"), "utf8"), "export const v = 1;\n");
      assert.equal(sha(fs.readFileSync(path.join(fixture.installRoot, "github-facts.ts"), "utf8")), sha("export const v = 1;\n"));
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });
});
