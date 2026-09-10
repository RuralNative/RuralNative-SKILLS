#!/usr/bin/env node
// Read-only installation check for review-this (automatic recovery).
//
// Accepts explicit source/install roots so CI can exercise it in isolated
// fixture homes without touching the user's home directory or credentials.
// Checks complete bundle file sets and bytes, agent prompt/permissions,
// command routing, and the runtime-resolved skill path.
//
// Usage:
//   node install-check.mjs --source <srcSkillDir> --install <installSkillDir>
//     [--agent <agentMd>] [--command <commandMd>]
//
// Exit 0 when every check passes; exit 1 with JSON diagnostics otherwise.
// Never writes, installs, downloads, or mutates configuration.
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";

const REQUIRED_SKILL_FILES = [
  "SKILL.md",
  "INSTALL.md",
  "package.json",
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

// Shared contract: installed bytes must equal the tested source bytes for the
// complete shipped file set. Presence checks alone would let a stale
// executing helper pass.
const BYTE_PARITY_FILES = [
  "SKILL.md",
  "INSTALL.md",
  "package.json",
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

function wildcardMatch(pattern, value) {
  const escaped = String(pattern).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "s").test(String(value));
}

function effectiveBash(bash, command) {
  let result;
  for (const [pattern, decision] of Object.entries(bash ?? {})) {
    if (wildcardMatch(pattern, command)) result = decision;
  }
  return result;
}

function parseAgentBash(agentText) {
  // The Markdown duplicate carries a YAML-like permission block. Extract the
  // bash map without a YAML dependency: lines under `  bash:` of the form
  // `    "<pattern>": <decision>`.
  const lines = String(agentText).split("\n");
  const bash = {};
  let inBash = false;
  for (const line of lines) {
    if (/^\s{2}bash:\s*$/.test(line)) {
      inBash = true;
      continue;
    }
    if (inBash) {
      if (/^\s{2}\S/.test(line) && !/^\s{4}/.test(line)) break;
      const m = line.match(/^\s{4}"(.*)":\s*(allow|deny|ask)\s*$/);
      if (m) bash[m[1]] = m[2];
    }
  }
  return bash;
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function fail(checks, message) {
  process.stdout.write(`${JSON.stringify({ ok: false, checks, reason: message }, null, 2)}\n`);
  process.exit(1);
}

function main() {
  const source = arg("--source");
  const install = arg("--install");
  const agentMd = arg("--agent");
  const commandMd = arg("--command");
  const checks = [];
  if (!source || !install) {
    fail(checks, "missing --source and --install skill roots");
  }
  for (const file of REQUIRED_SKILL_FILES) {
    const src = path.join(source, file);
    const dst = path.join(install, file);
    if (!existsSync(src) || !statSync(src).isFile()) {
      checks.push({ file, status: "missing-source" });
      continue;
    }
    if (!existsSync(dst) || !statSync(dst).isFile()) {
      checks.push({ file, status: "missing-install" });
      continue;
    }
    if (BYTE_PARITY_FILES.includes(file)) {
      const a = readFileSync(src);
      const b = readFileSync(dst);
      if (!a.equals(b)) {
        checks.push({ file, status: "byte-mismatch", sourceBytes: a.length, installBytes: b.length });
        continue;
      }
    }
    checks.push({ file, status: "ok" });
  }
  // Runtime-resolved skill path: the install root must carry its own SKILL.md
  // naming review-this (no silent download during review).
  try {
    const skill = readFileSync(path.join(install, "SKILL.md"), "utf8");
    if (!skill.includes("name: review-this")) {
      fail(checks, "installed SKILL.md does not name review-this");
    }
    checks.push({ file: "SKILL.md:runtime-path", status: "ok" });
  } catch {
    fail(checks, "installed SKILL.md is unreadable");
  }
  if (agentMd) {
    try {
      const agent = readFileSync(agentMd, "utf8");
      const needs = ["review exactly one pull request", "never fix", "prepare-review.mjs", "workflow-cli.mjs", "publish-review.mjs", "github-facts.mjs"];
      for (const needle of needs) {
        if (!agent.includes(needle)) {
          fail(checks, `installed agent prompt is missing: ${needle}`);
        }
      }
      // Parsed permission structure, not substrings: no broad branch allow,
      // installation-bound helpers without trailing wildcards, and effective
      // evaluation that denies deletions, PR-controlled helpers, and
      // redirection.
      const bash = parseAgentBash(agent);
      if (Object.keys(bash).length === 0) {
        fail(checks, "installed agent has no parseable bash permission map");
      }
      if ("git branch*" in bash) {
        fail(checks, "installed agent still carries a broad git branch allow");
      }
      const helpers = Object.keys(bash).filter((k) => k.includes("prepare-review.mjs") || k.includes("workflow-cli.mjs") || k.includes("publish-review.mjs") || k.includes("github-facts.mjs"));
      if (helpers.length < 8) {
        fail(checks, "installed agent is missing installation-bound helper allows");
      }
      for (const h of helpers) {
        if (!h.includes("/.kilocode/skills/review-this/") && !h.includes("/.agents/skills/review-this/")) {
          fail(checks, `installed helper allow is not installation-bound: ${h}`);
        }
        if (h.endsWith("*")) {
          fail(checks, `installed helper allow has a trailing wildcard: ${h}`);
        }
      }
      if (effectiveBash(bash, "git branch -D x") !== "deny") {
        fail(checks, "installed agent effectively allows branch deletion");
      }
      if (effectiveBash(bash, "node /tmp/pr/review-this/workflow-cli.mjs evidence -") === "allow") {
        fail(checks, "installed agent allows a PR-controlled helper path");
      }
      if (effectiveBash(bash, "node /home/u/.kilocode/skills/review-this/workflow-cli.mjs > /tmp/x") === "allow") {
        fail(checks, "installed agent allows helper redirection");
      }
      // Least-privilege markers: no unrestricted checkout/switch, no blanket node.
      if (/git checkout\*.*allow|git switch\*.*allow/.test(agent) && !/git checkout\*.*deny/.test(agent)) {
        fail(checks, "installed agent still allows unrestricted checkout/switch");
      }
      checks.push({ file: "agent:prompt-permissions", status: "ok" });
    } catch (error) {
      if (error.message && error.message.startsWith("installed ")) throw error;
      fail(checks, `installed agent is unreadable: ${error.message}`);
    }
  }
  if (commandMd) {
    try {
      const cmd = readFileSync(commandMd, "utf8");
      if (!cmd.includes("agent: review-this") || !cmd.includes("/review-this")) {
        fail(checks, "command routing does not point at the review-this agent");
      }
      if (!/^subtask:\s*false/m.test(cmd)) {
        fail(checks, "command routing must keep subtask: false");
      }
      if (!cmd.includes("$ARGUMENTS")) {
        fail(checks, "command routing must forward $ARGUMENTS");
      }
      checks.push({ file: "command:routing", status: "ok" });
    } catch (error) {
      if (error.message && error.message.startsWith("command ")) throw error;
      fail(checks, `command routing is unreadable: ${error.message}`);
    }
  }
  const bad = checks.filter((c) => c.status !== "ok");
  if (bad.length > 0) {
    fail(checks, `${bad.length} installation check(s) failed`);
  }
  process.stdout.write(`${JSON.stringify({ ok: true, checks }, null, 2)}\n`);
}

main();
