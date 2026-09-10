// Least-privilege Review This permissions (fixture-based, no home dir).
//
// Verifies the tracked `.kilo/kilo.jsonc` agent definition: broad fallbacks
// before specific rules, explicit denies for prohibited operations, no
// trailing cross-tool catch-all override, helper-bound execution (no blanket
// node/npm/npx/gh api), read-only git inspection only, private run-dir
// writes only, and no subagent/Agent Manager authority. Command permissions
// are not an OS sandbox; the helpers enforce their own argument allowlists,
// code inspection, and fork/static-review restrictions.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isAllowedSetupCommand, isValidInstallBoundary, type InstallBoundary } from "../prepare-review.ts";

function trackedConfig(): any {
  // skills/review-this/tests -> repo root is three levels up.
  const root = path.resolve(import.meta.dirname, "..", "..", "..");
  const raw = fs.readFileSync(path.join(root, ".kilo", "kilo.jsonc"), "utf8");
  return JSON.parse(raw);
}

function keyOrder(obj: Record<string, unknown>): string[] {
  return Object.keys(obj);
}

function wildcardMatch(pattern: string, value: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "s").test(value);
}

function effectiveBashPermission(bash: Record<string, string>, command: string): string | undefined {
  let result: string | undefined;
  for (const [pattern, decision] of Object.entries(bash)) {
    if (wildcardMatch(pattern, command)) result = decision;
  }
  return result;
}

describe("tracked review-this agent permissions", () => {
  test("agent exists with review-only prompt, primary mode, and no worktree authority", () => {
    const config = trackedConfig();
    const agent = config.agent?.["review-this"];
    assert.ok(agent, "tracked agent.review-this is required");
    assert.equal(agent.mode, "primary");
    assert.match(String(agent.prompt ?? ""), /never fix/i);
    assert.match(String(agent.prompt ?? ""), /automatic recovery|bounded/i);
    assert.equal(agent.permission?.task?.["*"], "deny", "subagent delegation stays denied");
    assert.equal(agent.permission?.["*"], "deny", "unlisted tools deny by default");
    for (const tool of ["agent_manager", "background_process", "notify_user", "suggest", "write"]) {
      assert.equal(agent.permission?.[tool], "deny", `${tool} stays denied`);
    }
  });

  test("broad fallbacks precede specific rules and effective evaluation denies prohibited operations", () => {
    const agent = trackedConfig().agent["review-this"];
    const bash = agent.permission.bash as Record<string, string>;
    const order = keyOrder(bash);
    assert.equal(order[0], "*", "broad bash fallback comes first");
    const denyCheckout = order.indexOf("git checkout*");
    const allowStatus = order.indexOf("git status*");
    assert.ok(denyCheckout > 0 && allowStatus > denyCheckout, "specific allows follow broad denies");
    assert.ok(!("node *" in bash) || bash["node *"] === "deny", "blanket node execution is denied");
    assert.equal(bash["npm *"], "deny");
    assert.equal(bash["npx *"], "deny");
    assert.equal(bash["gh api*"], "deny");
    assert.equal(bash["git checkout*"], "deny");
    assert.equal(bash["git switch*"], "deny");
    assert.equal(bash["git push*"], "deny");
    // Helpers are bound to installed roots. A trailing `*` only carries
    // arguments; chaining and redirection stay denied by later rules.
    const helpers = Object.keys(bash).filter((k) => k.includes("prepare-review.mjs") || k.includes("workflow-cli.mjs") || k.includes("publish-review.mjs"));
    assert.ok(helpers.length >= 6, "installed helper allows exist for both roots");
    for (const h of helpers) {
      assert.ok(h.includes("/.kilocode/skills/review-this/") || h.includes("/.agents/skills/review-this/"), `helper allow is installation-bound: ${h}`);
      assert.ok(!h.includes("*/review-this/") || h.includes("/.kilocode/") || h.includes("/.agents/"), `helper allow is not a generic review-this wildcard: ${h}`);
    }
    assert.ok(!("git branch*" in bash), "broad branch allow is removed");
    // Effective last-match evaluation, not source order alone.
    assert.equal(effectiveBashPermission(bash, "git branch -D x"), "deny");
    assert.equal(effectiveBashPermission(bash, "git branch --delete x"), "deny");
    assert.equal(effectiveBashPermission(bash, "git status --porcelain"), "allow");
    assert.equal(effectiveBashPermission(bash, "node /home/u/.kilocode/skills/review-this/workflow-cli.mjs evidence -"), "allow");
    assert.equal(effectiveBashPermission(bash, "node /tmp/pr-checkout/review-this/workflow-cli.mjs evidence -"), "deny");
    assert.equal(effectiveBashPermission(bash, "node /home/u/.kilocode/skills/review-this/workflow-cli.mjs > /home/u/.bashrc"), "deny");
    assert.equal(effectiveBashPermission(bash, "node /home/u/.kilocode/skills/review-this/workflow-cli.mjs | tee /tmp/x"), "deny");
  });

  test("edits allow only the private run directory; helpers, credentials, and configs stay unwritable", () => {
    const agent = trackedConfig().agent["review-this"];
    const edit = agent.permission.edit as Record<string, string>;
    const order = keyOrder(edit);
    assert.equal(edit["*"], "deny");
    assert.equal(order[0], "*", "broad edit fallback comes first");
    assert.equal(edit["/tmp/kilo/review-this/**"], "allow");
    assert.equal(order[order.length - 1], "/tmp/kilo/review-this/**", "run-dir allow is last and wins only there");
    assert.equal(edit["**/.config/kilo/**"], "deny");
    assert.equal(edit["**/kilo.jsonc"], "deny");
    assert.equal(edit["**/agent-manager.json"], "deny");
  });

  test("reads and skill loading stay normal; unrelated execution stays denied", () => {
    const agent = trackedConfig().agent["review-this"];
    assert.equal(agent.permission.read["*"], "allow");
    assert.equal(agent.permission.skill["review-this"], "allow");
    assert.equal(agent.permission.skill["unslopify"], "allow");
    assert.equal(agent.permission.skill["*"], "ask");
    assert.equal(agent.permission.bash["eval *"], "deny");
    assert.equal(agent.permission.bash["env *"], "deny");
    assert.equal(agent.permission.bash["LD_PRELOAD=*"], "deny");
  });

  test("pure setup allowlist denies chaining, preloads, arbitrary APIs, and payload commands", () => {
    const boundary: InstallBoundary = {
      packageManager: "npm",
      frozenArgs: ["ci", "--ignore-scripts"],
      allowedPaths: ["node_modules/"],
      ignoreScripts: true,
    };
    assert.equal(isValidInstallBoundary(boundary), true, "a restrictive subset of the frozen paths stays valid");
    const fullBoundary: InstallBoundary = {
      packageManager: "npm",
      frozenArgs: ["ci", "--ignore-scripts"],
      allowedPaths: ["node_modules/", ".npm/", "~/.npm/"],
      ignoreScripts: true,
    };
    assert.equal(isValidInstallBoundary(fullBoundary), true);
    assert.equal(isAllowedSetupCommand("npm ci --ignore-scripts", fullBoundary, []), true);
    assert.equal(isAllowedSetupCommand("npm ci --ignore-scripts && rm -rf /", fullBoundary, []), false);
    assert.equal(isAllowedSetupCommand("npm ci > /tmp/out", fullBoundary, []), false);
    assert.equal(isAllowedSetupCommand("npm ci --ignore-scripts=false", fullBoundary, []), false);
    assert.equal(isAllowedSetupCommand("npm ci --ignore-scripts --prefix=/tmp/outside", fullBoundary, []), false);
    assert.equal(isAllowedSetupCommand("npm run verify -- --write", fullBoundary, ["verify"]), false);
    assert.equal(isAllowedSetupCommand("git push origin HEAD", fullBoundary, ["git push origin HEAD"]), false);
    assert.equal(isAllowedSetupCommand("node -e \"evil()\"", fullBoundary, ["node -e \"evil()\""]), false);
    assert.equal(isAllowedSetupCommand("LD_PRELOAD=/tmp/x.so npm ci --ignore-scripts", fullBoundary, []), false);
    assert.equal(isAllowedSetupCommand("NODE_OPTIONS=--inspect npm ci", fullBoundary, []), false);
    assert.equal(isAllowedSetupCommand("env FOO=1 npm ci", fullBoundary, []), false);
    assert.equal(isAllowedSetupCommand("eval $(fnm env)", fullBoundary, []), false);
    assert.equal(isAllowedSetupCommand("npx -y evil", fullBoundary, []), false);
    assert.equal(isAllowedSetupCommand("gh api repos/o/r/pulls/1 --method PATCH --field title=x", fullBoundary, []), false);
    assert.equal(isAllowedSetupCommand("npm install lodash", fullBoundary, []), false);
    assert.equal(isAllowedSetupCommand("npm run verify", fullBoundary, ["verify"]), true);
    assert.equal(isAllowedSetupCommand("npm run evil", fullBoundary, ["verify"]), false);
    const permissive: InstallBoundary = {
      packageManager: "npm",
      frozenArgs: ["ci"],
      allowedPaths: ["/"],
      ignoreScripts: false,
    };
    assert.equal(isValidInstallBoundary(permissive), false);
    assert.equal(isAllowedSetupCommand("npm ci", permissive, []), false);
  });

  test("preparation helper confines files to the private run directory and rejects escapes", () => {
    // Static composition check: the helper must enforce run-dir confinement,
    // symlink/traversal rejection, argument arrays (no shell), and sanitized
    // environments. Execution would need network/git; the source contract is
    // the fixture here.
    const root = path.resolve(import.meta.dirname, "..", "..", "..");
    const helper = fs.readFileSync(path.join(root, "skills", "review-this", "prepare-review.mjs"), "utf8");
    assert.match(helper, /\/tmp\/kilo\/review-this/);
    assert.match(helper, /symlink.*rejected|isSymbolicLink/i);
    assert.match(helper, /traversal.*rejected|\.\._seed|includes\("\.\."\)/);
    assert.match(helper, /shell:\s*false/);
    assert.match(helper, /LD_PRELOAD|NODE_OPTIONS/);
    assert.match(helper, /no general shell or arbitrary GitHub/i);
    // Helpers call gh/approved commands with argument arrays and validated targets.
    assert.match(helper, /execFile/);
    assert.match(helper, /validRepository|validPrNumber|validSha/);
  });
});
