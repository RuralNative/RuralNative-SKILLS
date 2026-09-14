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

function repoRoot(): string {
  return path.resolve(import.meta.dirname, "..", "..", "..");
}

function renderCanonicalAgentMd(): string {
  // Render the Markdown duplicate through the same permission map the
  // installation uses: prompt plus bash map from the canonical tracked
  // `.kilo/kilo.jsonc` agent definition. No hand-written helper lists.
  const raw = fs.readFileSync(path.join(repoRoot(), ".kilo", "kilo.jsonc"), "utf8");
  const agent = (JSON.parse(raw).agent as Record<string, any>)["review-this"];
  const lines: string[] = [String(agent.prompt ?? ""), ""];
  for (const section of ["bash", "edit", "write", "external_directory"]) {
    lines.push(`  ${section}:`);
    for (const [pattern, decision] of Object.entries((agent.permission as any)[section] as Record<string, string>)) {
      lines.push(`    ${JSON.stringify(pattern)}: ${decision}`);
    }
  }
  lines.push(`  kilo_local_recall: ${String((agent.permission as any).kilo_local_recall ?? "allow")}`, "");
  return lines.join("\n");
}

function writeCanonicalCommandMd(to: string): void {
  fs.copyFileSync(path.join(repoRoot(), ".kilo", "command", "review-this.md"), to);
}

describe("install-check in fixture homes", () => {
  test("matching source and install roots pass", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "rti-"));
    const src = path.join(home, "src");
    const dst = path.join(home, "dst");
    copySkill(src);
    copySkill(dst);
    // Canonical agent/command through the installation rendering path.
    const agentMd = path.join(home, "agent.md");
    const commandMd = path.join(home, "command.md");
    fs.writeFileSync(agentMd, renderCanonicalAgentMd());
    writeCanonicalCommandMd(commandMd);
    const { exit, json } = run(["--source", src, "--install", dst, "--agent", agentMd, "--command", commandMd]);
    assert.equal(exit, 0, JSON.stringify(json));
    assert.equal(json.ok, true);
  });

  test("argument-bearing helper invocations pass; chaining and redirection fail", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "rti-"));
    const src = path.join(home, "src");
    const dst = path.join(home, "dst");
    copySkill(src);
    copySkill(dst);
    const agentMd = path.join(home, "agent.md");
    const commandMd = path.join(home, "command.md");
    fs.writeFileSync(agentMd, renderCanonicalAgentMd());
    writeCanonicalCommandMd(commandMd);
    const { exit, json } = run(["--source", src, "--install", dst, "--agent", agentMd, "--command", commandMd]);
    assert.equal(exit, 0, JSON.stringify(json));
    // A tampered map that drops the chaining denial must fail: without the
    // `*;*` rule the chained invocation falls through to the helper allow.
    const tampered = renderCanonicalAgentMd()
      .split("\n")
      .filter((line) => line.trim() !== '"*;*": deny')
      .join("\n");
    fs.writeFileSync(agentMd, tampered);
    const chained = run(["--source", src, "--install", dst, "--agent", agentMd, "--command", commandMd]);
    assert.equal(chained.exit, 1, JSON.stringify(chained.json));
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
        "You are a thin wrapper for the installed `review-this` skill.",
        "A direct human task or target reference addressed to this agent, including a bare number or URL, counts as `/review-this <input>`.",
        "Preserve the exact input and the confirmed task and decisions when continuing the same session.",
        "Load `unslopify` with the skill tool before the first response and `ponytail` before code work.",
        "The installed skill owns the workflow, scope, approval gates, recovery, verification, publication, and stopping conditions.",
        "  bash:",
        '    "*": ask',
        '    "git branch -D*": deny',
        '    "git branch*": allow',
        '    "node */review-this/workflow-cli.mjs*": allow',
        "  kilo_local_recall: allow",
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
    copySkill(dst);
    fs.rmSync(path.join(dst, "recovery.md"));
    const missingRecovery = run(["--source", src, "--install", dst]);
    assert.equal(missingRecovery.exit, 1);
    copySkill(dst);
    fs.appendFileSync(path.join(dst, "recovery.md"), "\nStale recovery rules.\n");
    const recoveryDrift = run(["--source", src, "--install", dst]);
    assert.equal(recoveryDrift.exit, 1);
    assert.ok(JSON.stringify(recoveryDrift.json).includes("byte-mismatch"));
  });
});
