#!/usr/bin/env node
// Repo-owned synchronization for the active Review This installation
// (ADR-0042). Copies only Review This files: the changed workflow bundle,
// the generated agent definition rendered from the canonical tracked
// `.kilo/kilo.jsonc` (never a hand-edited competing prompt), and the tracked
// command. Explicit destination roots only; a rollback backup precedes every
// replace; inactive backup directories are never touched. Never prints or
// copies unrelated configuration (providers, secrets, other agents).
//
// Usage:
//   node scripts/sync-review-this.mjs --skill-dest <review-this skill dir>
//     --agent-dest <review-this agent md> --command-dest <review-this command md>
//     [--apply]
//
// Without --apply, exits 1 with a JSON drift report when destinations differ.
// With --apply, writes changed files after a timestamped rollback backup and
// exits 0. Never writes installs, downloads, or mutates anything else.
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { openSync, writeSync, closeSync, constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_SRC = path.join(ROOT, "skills", "review-this");
const COMMAND_SRC = path.join(ROOT, ".kilo", "command", "review-this.md");
const KILO_JSONC = path.join(ROOT, ".kilo", "kilo.jsonc");

// The shipped bundle set mirrors install-check.mjs REQUIRED_SKILL_FILES.
const BUNDLE_FILES = [
  "SKILL.md",
  "recovery.md",
  "INSTALL.md",
  "package.json",
  "agents/openai.yaml",
  "targets.ts",
  "discovery.ts",
  "review-session.ts",
  "review-policy.ts",
  "review-authority.ts",
  "reconciliation.ts",
  "adapters.ts",
  "orientation.ts",
  "gh-review-transport.ts",
  "publish-review.ts",
  "publish-review.mjs",
  "prepare-review.ts",
  "prepare-review.mjs",
  "workflow-cli.mjs",
  "workflow-state.ts",
  "github-facts.ts",
  "github-facts.mjs",
];

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function fail(reason) {
  process.stdout.write(`${JSON.stringify({ ok: false, reason }, null, 2)}\n`);
  process.exit(1);
}

function assertNoSymlink(filePath, label) {
  let current = path.resolve(filePath);
  for (;;) {
    try {
      if (lstatSync(current).isSymbolicLink()) fail(`${label} is a symlink: ${current}`);
    } catch {
      // Missing components are created fresh below; stop at the first missing ancestor.
      if (!existsSync(current)) {
        current = path.dirname(current);
        if (current === path.dirname(current)) break;
        continue;
      }
      break;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
    // Only walk up to the filesystem root for standalone files; bundle paths
    // get an additional containment check at the write site.
    if (current.length < 2) break;
  }
}

function assertInside(root, target, label) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    fail(`${label} escapes its destination root`);
  }
}

function writeFileNoFollow(filePath, data) {
  assertNoSymlink(filePath, "destination");
  try {
    const fd = openSync(filePath, constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW);
    try {
      writeSync(fd, data);
    } finally {
      closeSync(fd);
    }
  } catch (error) {
    if (error?.code === "ELOOP") fail(`destination is a symlink: ${filePath}`);
    throw error;
  }
}

function renderAgentMd() {
  const raw = readFileSync(KILO_JSONC, "utf8");
  const agent = JSON.parse(raw).agent["review-this"];
  if (!agent) fail("canonical agent.review-this is missing");
  const lines = [String(agent.prompt ?? ""), ""];
  for (const section of ["bash", "edit", "write", "external_directory"]) {
    lines.push(`  ${section}:`);
    for (const [pattern, decision] of Object.entries(agent.permission[section] ?? {})) {
      lines.push(`    ${JSON.stringify(pattern)}: ${decision}`);
    }
  }
  lines.push(`  kilo_local_recall: ${String(agent.permission.kilo_local_recall ?? "allow")}`, "");
  return lines.join("\n");
}

function main() {
  const skillDest = arg("--skill-dest");
  const agentDest = arg("--agent-dest");
  const commandDest = arg("--command-dest");
  const apply = process.argv.includes("--apply");
  if (!skillDest || !agentDest || !commandDest) {
    fail("missing --skill-dest, --agent-dest, and --command-dest destination roots");
  }
  // Explicit Review This destinations only: never touch another skill or agent.
  if (path.basename(path.resolve(skillDest)) !== "review-this") fail("skill destination must be a review-this skill directory");
  if (path.basename(agentDest) !== "review-this.md") fail("agent destination must be review-this.md");
  if (path.basename(commandDest) !== "review-this.md") fail("command destination must be review-this.md");
  if (!existsSync(skillDest) || !statSync(skillDest).isDirectory()) fail("skill destination is not an existing directory");
  const agentMd = renderAgentMd();
  const commandMd = readFileSync(COMMAND_SRC, "utf8");
  const drift = [];
  for (const file of BUNDLE_FILES) {
    const src = readFileSync(path.join(SKILL_SRC, file));
    const dstPath = path.join(skillDest, file);
    let same = false;
    try {
      same =
        existsSync(dstPath) &&
        !lstatSync(dstPath).isSymbolicLink() &&
        statSync(dstPath).isFile() &&
        readFileSync(dstPath).equals(src);
    } catch {
      same = false;
    }
    if (!same) drift.push({ kind: "bundle", file });
  }
  try {
    if (!existsSync(agentDest) || readFileSync(agentDest, "utf8") !== agentMd) drift.push({ kind: "agent", file: "review-this.md" });
  } catch {
    drift.push({ kind: "agent", file: "review-this.md" });
  }
  try {
    if (!existsSync(commandDest) || readFileSync(commandDest, "utf8") !== commandMd) drift.push({ kind: "command", file: "review-this.md" });
  } catch {
    drift.push({ kind: "command", file: "review-this.md" });
  }
  if (!apply) {
    if (drift.length > 0) {
      process.stdout.write(`${JSON.stringify({ ok: false, drift }, null, 2)}\n`);
      process.exit(1);
    }
    process.stdout.write(`${JSON.stringify({ ok: true, drift: [] }, null, 2)}\n`);
    return;
  }
  if (drift.length === 0) {
    process.stdout.write(`${JSON.stringify({ ok: true, applied: [] }, null, 2)}\n`);
    return;
  }
  // One rollback backup per destination before replacing anything.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const applied = [];
  const bundleDrift = drift.filter((d) => d.kind === "bundle");
  if (bundleDrift.length > 0) {
    assertNoSymlink(skillDest, "skill destination");
    cpSync(skillDest, `${skillDest}.bak-${stamp}`, { recursive: true });
    for (const { file } of bundleDrift) {
      const dstPath = path.join(skillDest, file);
      assertInside(skillDest, dstPath, "bundle destination");
      assertNoSymlink(path.dirname(dstPath), "bundle parent");
      if (existsSync(dstPath)) assertNoSymlink(dstPath, "bundle destination");
      mkdirSync(path.dirname(dstPath), { recursive: true });
      writeFileNoFollow(dstPath, readFileSync(path.join(SKILL_SRC, file)));
      applied.push({ kind: "bundle", file });
    }
  }
  for (const d of drift) {
    if (d.kind === "agent") {
      if (existsSync(agentDest)) {
        assertNoSymlink(agentDest, "agent destination");
        cpSync(agentDest, `${agentDest}.bak-${stamp}`, { recursive: false });
      }
      mkdirSync(path.dirname(agentDest), { recursive: true });
      writeFileNoFollow(agentDest, agentMd);
      applied.push(d);
    }
    if (d.kind === "command") {
      if (existsSync(commandDest)) {
        assertNoSymlink(commandDest, "command destination");
        cpSync(commandDest, `${commandDest}.bak-${stamp}`, { recursive: false });
      }
      mkdirSync(path.dirname(commandDest), { recursive: true });
      writeFileNoFollow(commandDest, commandMd);
      applied.push(d);
    }
  }
  process.stdout.write(`${JSON.stringify({ ok: true, applied }, null, 2)}\n`);
}

main();
