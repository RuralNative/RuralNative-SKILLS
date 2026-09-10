// Installation check in isolated fixture homes (no home dir, no credentials).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SKILL_SRC = path.resolve(import.meta.dirname, "..");
const CHECK = path.join(SKILL_SRC, "install-check.mjs");

function copySkill(to: string): void {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(SKILL_SRC)) {
    if (entry === "tests") continue;
    const src = path.join(SKILL_SRC, entry);
    const dst = path.join(to, entry);
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.cpSync(src, dst, { recursive: true });
    } else {
      fs.copyFileSync(src, dst);
    }
  }
}

function run(args: string[]): { exit: number; json: any } {
  const result = spawnSync(process.execPath, [CHECK, ...args], { encoding: "utf8" });
  let json: any = null;
  try {
    json = JSON.parse(result.stdout ?? "");
  } catch {
    json = { raw: result.stdout };
  }
  return { exit: result.status ?? -1, json };
}

describe("install-check in fixture homes", () => {
  test("matching source and install roots pass", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "rti-"));
    const src = path.join(home, "src");
    const dst = path.join(home, "dst");
    copySkill(src);
    copySkill(dst);
    // Fixture agent/command duplicates with installation-bound helpers.
    const agentMd = path.join(home, "agent.md");
    const commandMd = path.join(home, "command.md");
    fs.writeFileSync(
      agentMd,
      [
        "review exactly one pull request",
        "never fix",
        "prepare-review.mjs",
        "workflow-cli.mjs",
        "publish-review.mjs",
        "github-facts.mjs",
        "  bash:",
        '    "*": ask',
        '    "git branch -D*": deny',
        '    "git branch --delete*": deny',
        '    "node *": deny',
        '    "git status*": allow',
        '    "node */.kilocode/skills/review-this/workflow-cli.mjs": allow',
        '    "node */.agents/skills/review-this/workflow-cli.mjs": allow',
        '    "node */.kilocode/skills/review-this/prepare-review.mjs": allow',
        '    "node */.agents/skills/review-this/prepare-review.mjs": allow',
        '    "node */.kilocode/skills/review-this/publish-review.mjs": allow',
        '    "node */.agents/skills/review-this/publish-review.mjs": allow',
        '    "node */.kilocode/skills/review-this/github-facts.mjs": allow',
        '    "node */.agents/skills/review-this/github-facts.mjs": allow',
        '    "*>*": deny',
        "",
      ].join("\n"),
    );
    fs.writeFileSync(commandMd, "---\nagent: review-this\nsubtask: false\n---\n\n/review-this $ARGUMENTS\n");
    const { exit, json } = run(["--source", src, "--install", dst, "--agent", agentMd, "--command", commandMd]);
    assert.equal(exit, 0);
    assert.equal(json.ok, true);
  });

  test("broad branch allows, PR-controlled helpers, and redirection fail", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "rti-"));
    const src = path.join(home, "src");
    const dst = path.join(home, "dst");
    copySkill(src);
    copySkill(dst);
    const agentMd = path.join(home, "agent.md");
    const commandMd = path.join(home, "command.md");
    fs.writeFileSync(
      agentMd,
      [
        "review exactly one pull request",
        "never fix",
        "prepare-review.mjs",
        "workflow-cli.mjs",
        "publish-review.mjs",
        "github-facts.mjs",
        "  bash:",
        '    "*": ask',
        '    "git branch -D*": deny',
        '    "git branch*": allow',
        '    "node */review-this/workflow-cli.mjs*": allow',
        "",
      ].join("\n"),
    );
    fs.writeFileSync(commandMd, "---\nagent: review-this\nsubtask: false\n---\n\n/review-this $ARGUMENTS\n");
    const { exit } = run(["--source", src, "--install", dst, "--agent", agentMd, "--command", commandMd]);
    assert.equal(exit, 1);
  });

  test("missing and mismatched bundles fail without touching home", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "rti-"));
    const src = path.join(home, "src");
    const dst = path.join(home, "dst");
    copySkill(src);
    copySkill(dst);
    fs.rmSync(path.join(dst, "prepare-review.mjs"));
    const missing = run(["--source", src, "--install", dst]);
    assert.equal(missing.exit, 1);
    copySkill(dst);
    fs.rmSync(path.join(dst, "github-facts.mjs"));
    const missingFacts = run(["--source", src, "--install", dst]);
    assert.equal(missingFacts.exit, 1);
    copySkill(dst);
    fs.appendFileSync(path.join(dst, "workflow-state.ts"), "\n// drift\n");
    const drift = run(["--source", src, "--install", dst]);
    assert.equal(drift.exit, 1);
    assert.ok(JSON.stringify(drift.json).includes("byte-mismatch"));
    copySkill(dst);
    fs.appendFileSync(path.join(dst, "github-facts.ts"), "\n// drift\n");
    const factsDrift = run(["--source", src, "--install", dst]);
    assert.equal(factsDrift.exit, 1);
  });
});
