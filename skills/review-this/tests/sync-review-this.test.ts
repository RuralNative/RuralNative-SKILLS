// Repo-owned Review This sync in isolated fixture homes (no real home dir).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SKILL_SRC = path.resolve(import.meta.dirname, "..");
const SYNC = path.join(path.resolve(import.meta.dirname, "..", "..", ".."), "scripts", "sync-review-this.mjs");

function repoRoot(): string {
  return path.resolve(import.meta.dirname, "..", "..", "..");
}

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

function renderCanonicalAgentMd(): string {
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

function run(args: string[]): { exit: number; json: any } {
  const result = spawnSync(process.execPath, [SYNC, ...args], { encoding: "utf8" });
  let json: any = null;
  try {
    json = JSON.parse(result.stdout ?? "");
  } catch {
    json = { raw: result.stdout };
  }
  return { exit: result.status ?? -1, json };
}

function fixture() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "rts-"));
  const skillDest = path.join(home, "skills", "review-this");
  copySkill(skillDest);
  const agentDest = path.join(home, "agent", "review-this.md");
  const commandDest = path.join(home, "command", "review-this.md");
  fs.mkdirSync(path.dirname(agentDest), { recursive: true });
  fs.mkdirSync(path.dirname(commandDest), { recursive: true });
  return { home, skillDest, agentDest, commandDest };
}

describe("sync-review-this in fixture homes", () => {
  test("drift reports without writing; apply syncs with rollback backups", () => {
    const { skillDest, agentDest, commandDest } = fixture();
    try {
      // Stale destinations drift.
      fs.appendFileSync(path.join(skillDest, "SKILL.md"), "\n<!-- stale -->\n");
      fs.writeFileSync(agentDest, "stale agent\n");
      fs.writeFileSync(commandDest, "stale command\n");
      const args = ["--skill-dest", skillDest, "--agent-dest", agentDest, "--command-dest", commandDest];
      const drifted = run(args);
      assert.equal(drifted.exit, 1, JSON.stringify(drifted.json));
      assert.ok(Array.isArray(drifted.json.drift) && drifted.json.drift.length >= 3);
      // Nothing written in check mode.
      assert.ok(fs.readFileSync(path.join(skillDest, "SKILL.md"), "utf8").includes("stale"));
      const applied = run([...args, "--apply"]);
      assert.equal(applied.exit, 0, JSON.stringify(applied.json));
      assert.ok(Array.isArray(applied.json.applied) && applied.json.applied.length >= 3);
      // Bundle matches source; generated agent matches the canonical render.
      assert.equal(fs.readFileSync(path.join(skillDest, "SKILL.md"), "utf8"), fs.readFileSync(path.join(SKILL_SRC, "SKILL.md"), "utf8"));
      assert.equal(fs.readFileSync(agentDest, "utf8"), renderCanonicalAgentMd());
      assert.equal(fs.readFileSync(commandDest, "utf8"), fs.readFileSync(path.join(repoRoot(), ".kilo", "command", "review-this.md"), "utf8"));
      // Rollback backups precede the replace.
      const skillBackups = fs.readdirSync(path.dirname(skillDest)).filter((e) => e.startsWith("review-this.bak-"));
      assert.equal(skillBackups.length, 1);
      const agentBackups = fs.readdirSync(path.dirname(agentDest)).filter((e) => e.startsWith("review-this.md.bak-"));
      assert.equal(agentBackups.length, 1);
      // A second apply is a clean no-op.
      const clean = run([...args, "--apply"]);
      assert.equal(clean.exit, 0, JSON.stringify(clean.json));
      assert.deepEqual(clean.json.applied, []);
    } finally {
      fs.rmSync(path.dirname(path.dirname(skillDest)), { recursive: true, force: true });
    }
  });

  test("Codex policy ships through sync with rollback", () => {
    const { skillDest, agentDest, commandDest } = fixture();
    try {
      fs.writeFileSync(agentDest, renderCanonicalAgentMd());
      fs.copyFileSync(path.join(repoRoot(), ".kilo", "command", "review-this.md"), commandDest);
      fs.appendFileSync(path.join(skillDest, "agents", "openai.yaml"), "\n# stale\n");
      const args = ["--skill-dest", skillDest, "--agent-dest", agentDest, "--command-dest", commandDest];
      const drifted = run(args);
      assert.equal(drifted.exit, 1, JSON.stringify(drifted.json));
      assert.ok(drifted.json.drift.some((d: any) => d.file === "agents/openai.yaml"), "policy drift reported");
      const applied = run([...args, "--apply"]);
      assert.equal(applied.exit, 0, JSON.stringify(applied.json));
      assert.equal(fs.readFileSync(path.join(skillDest, "agents", "openai.yaml"), "utf8"), fs.readFileSync(path.join(SKILL_SRC, "agents", "openai.yaml"), "utf8"));
    } finally {
      fs.rmSync(path.dirname(path.dirname(skillDest)), { recursive: true, force: true });
    }
  });

  test("upgrade from pre-policy bundle creates missing agents dir", () => {
    const { skillDest, agentDest, commandDest } = fixture();
    try {
      fs.writeFileSync(agentDest, renderCanonicalAgentMd());
      fs.copyFileSync(path.join(repoRoot(), ".kilo", "command", "review-this.md"), commandDest);
      fs.rmSync(path.join(skillDest, "agents"), { recursive: true, force: true });
      const args = ["--skill-dest", skillDest, "--agent-dest", agentDest, "--command-dest", commandDest];
      const drifted = run(args);
      assert.equal(drifted.exit, 1, JSON.stringify(drifted.json));
      assert.ok(drifted.json.drift.some((d: any) => d.file === "agents/openai.yaml"), "missing policy reported");
      const applied = run([...args, "--apply"]);
      assert.equal(applied.exit, 0, JSON.stringify(applied.json));
      assert.equal(fs.readFileSync(path.join(skillDest, "agents", "openai.yaml"), "utf8"), fs.readFileSync(path.join(SKILL_SRC, "agents", "openai.yaml"), "utf8"));
    } finally {
      fs.rmSync(path.dirname(path.dirname(skillDest)), { recursive: true, force: true });
    }
  });

  test("symlinked bundle entries drift and apply refuses to follow them", () => {
    const { home, skillDest, agentDest, commandDest } = fixture();
    try {
      const outside = path.join(home, "victim.txt");
      fs.writeFileSync(outside, "original\n");
      const target = path.join(skillDest, "agents", "openai.yaml");
      fs.rmSync(target);
      fs.symlinkSync(outside, target);
      const args = ["--skill-dest", skillDest, "--agent-dest", agentDest, "--command-dest", commandDest];
      const drifted = run(args);
      assert.equal(drifted.exit, 1, JSON.stringify(drifted.json));
      const applied = run([...args, "--apply"]);
      assert.equal(applied.exit, 1, JSON.stringify(applied.json));
      assert.equal(fs.readFileSync(outside, "utf8"), "original\n");
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  test("wrong destinations are refused", () => {
    const { home, skillDest, agentDest, commandDest } = fixture();
    try {
      const other = path.join(home, "skills", "other-skill");
      fs.mkdirSync(other, { recursive: true });
      const refused = run(["--skill-dest", other, "--agent-dest", agentDest, "--command-dest", commandDest]);
      assert.equal(refused.exit, 1);
      assert.match(String(refused.json.reason ?? ""), /review-this skill directory/i);
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });
});
