#!/usr/bin/env node
// Bounded review preparation for /review-this (automatic recovery).
//
// Effectful operations behind a testable TypeScript core
// (`prepare-review.ts`). Reuses targets.ts, review-session.ts, the shared
// requirements/evidence validators, and the existing injectable `gh` runner.
// Entry point is limited to prerequisite observation, approved
// preparation/verification, and scoped evidence repair. It never exposes a
// general shell or arbitrary GitHub request interface.
//
// Allowed operations (input.operation): observe-target, prepare-checkout,
// resolve-policy, verify-commands, recover-evidence, setup-runtime,
// install-deps, run-check, publish-review, repair-record.
//
// - Helpers call `gh` and approved setup/check commands using argument
//   arrays, with validated targets and a sanitized environment.
// - Input may select an approved operation or criterion, never arbitrary
//   shell text or API fields.
// - Private run directory lives under /tmp/kilo/review-this/; symlinks,
//   traversal, and paths outside that directory are rejected.
// - No source fixes, commits, pushes, merges, labels, ticket closure,
//   worktree creation, Agent Manager changes, or automatic /fix-this.
//
// Usage: node prepare-review.mjs <input.json>  (or - for stdin)
// Exit codes: 0 ok; 1 recoverable/restricted outcome (JSON describes it);
// 2 input or runtime failure.
import { execFile, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  readCollaboratorPermission,
  readIssueFacts,
  readPullRequestFacts,
} from "./github-facts.ts";

const REQUIRED_NODE_MAJOR = 24;
const RUN_ROOT = "/tmp/kilo/review-this";

const ALLOWED_OPERATIONS = new Set([
  "observe-target",
  "prepare-checkout",
  "resolve-policy",
  "verify-commands",
  "recover-evidence",
  "setup-runtime",
  "install-deps",
  "run-check",
  "publish-review",
  "repair-record",
]);

function print(exitCode, result) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(exitCode);
}

function failure(message) {
  return { ok: false, reason: message };
}

function sanitizedEnv() {
  const allow = new Set(["PATH", "HOME", "USER", "LOGNAME", "SHELL", "LANG", "LC_ALL", "TZ", "NODE_ENV", "CI"]);
  const out = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (!allow.has(k)) continue;
    if (/LD_PRELOAD|NODE_OPTIONS|PYTHONPATH|RUBYOPT|PERL5OPT|BASH_ENV|ENV|ZDOTDIR/i.test(k)) continue;
    out[k] = v;
  }
  // Never pass interpreter preloads or env overrides through.
  delete out.LD_PRELOAD;
  delete out.NODE_OPTIONS;
  return out;
}

function validRepository(value) {
  return typeof value === "string" && /^[A-Za-z0-9-_.]+\/[A-Za-z0-9-_.]+$/.test(value);
}

function validSha(value) {
  return typeof value === "string" && /^[a-f0-9]{40,64}$/i.test(value.trim());
}

function validPrNumber(value) {
  return Number.isInteger(value) && value > 0;
}

async function ensureRunDir(subdir) {
  if (typeof subdir !== "string" || subdir === "") {
    throw new Error("run subdirectory is required");
  }
  if (subdir.includes("..") || path.isAbsolute(subdir)) {
    throw new Error("path traversal rejected: run paths stay under /tmp/kilo/review-this/");
  }
  const full = path.join(RUN_ROOT, subdir);
  const resolved = path.resolve(full);
  if (!resolved.startsWith(`${path.resolve(RUN_ROOT)}/`) && resolved !== path.resolve(RUN_ROOT)) {
    throw new Error("path outside the private run directory rejected");
  }
  // Reject symlinks: the run directory itself must not be a symlink and no
  // component may resolve outside the root.
  try {
    const stat = await fs.lstat(resolved);
    if (stat.isSymbolicLink()) throw new Error("symlink run path rejected");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  try {
    const rootStat = await fs.lstat(path.resolve(RUN_ROOT));
    if (rootStat.isSymbolicLink()) throw new Error("symlink run root rejected");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  await fs.mkdir(resolved, { recursive: true, mode: 0o700 });
  return resolved;
}

function execArgs(command, args, maxOutput = 8000) {
  return new Promise((resolve) => {
    execFile(command, args, { env: sanitizedEnv(), shell: false, timeout: 120000, maxBuffer: 32 * 1024 * 1024 }, (error, stdout, stderr) => {
      const full = `${stdout ?? ""}${error ? (stderr ?? "") : ""}`;
      const truncated = full.length > maxOutput;
      const output = truncated ? full.slice(0, maxOutput) : full;
      if (error) {
        resolve({ ok: false, exitStatus: error.code ?? 1, output, truncated, fullLength: full.length });
        return;
      }
      resolve({ ok: true, exitStatus: 0, output, truncated, fullLength: full.length });
    });
  });
}

function execArgsFull(command, args, maxOutput = 512 * 1024) {
  return execArgs(command, args, maxOutput);
}

// One shared bounded executor for approved checks. Keeps the integer exit
// status, recorded output size, and truncation state so a shortened display is
// never mistaken for a complete receipt.
async function runApprovedCheck(command) {
  const parts = command.trim().split(/\s+/);
  const result = await execArgsFull(parts[0], parts.slice(1));
  return {
    command,
    output: result.output,
    outputBytes: result.output.length,
    exitStatus: integerExit(result.exitStatus),
    truncated: result.truncated === true,
    fullLength: result.fullLength,
  };
}

function isAuthFailureReason(reason) {
  return /\b(403|401|unauthorized|forbidden|authentication|auth[-\s]?denied|permission\s+denied|requires\s+authentication)\b/i.test(String(reason ?? ""));
}

// Allowlisted gh operations only. Never `gh api *` with caller-selected
// endpoints/fields; each operation maps to a fixed endpoint shape with
// validated repository/PR identity.
async function ghObservePr(repository, prNumber) {
  if (!validRepository(repository) || !validPrNumber(prNumber)) {
    throw new Error("invalid repository or PR number for observation");
  }
  // Fixed read-only discovery: one PR read, no poll. Required checks are
  // observed separately through the same allowlisted view (no CI polling).
  // Machine-readable output is never truncated: a truncated JSON payload must
  // fail instead of reporting success with invalid JSON.
  const pr = await execArgsFull("gh", ["pr", "view", String(prNumber), "--repo", repository, "--json", "number,state,headRefOid,baseRefOid,body,comments,reviews,commits"]);
  if (pr.ok && pr.truncated) {
    return { ok: false, exitStatus: 1, output: `observation exceeds ${pr.fullLength} bytes; re-read with a narrower query`, truncated: true, fullLength: pr.fullLength };
  }
  if (pr.ok) {
    try {
      JSON.parse(pr.output);
    } catch {
      return { ok: false, exitStatus: 1, output: "observation returned invalid JSON; re-read before repeating", truncated: false, fullLength: pr.output.length };
    }
  }
  return pr;
}

function sha256Hex(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function integerExit(value) {
  return Number.isInteger(value) ? value : 1;
}

// Synchronous `gh` runner for the shared completeness-aware readers
// (`github-facts.ts`). Argument arrays only, sanitized environment, one bounded
// call each. A spawn failure or buffer overflow is a failed read; output is
// never silently truncated into a shorter "success".
function ghSync(args) {
  const result = spawnSync("gh", [...args], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    timeout: 120000,
    env: sanitizedEnv(),
  });
  if (result.error) {
    return { ok: false, stdout: "", reason: result.error.message };
  }
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  if (result.status !== 0) {
    return { ok: false, stdout: "", reason: stderr.trim() || `gh exited ${result.status ?? "unknown"}` };
  }
  return { ok: true, stdout: stdout.trim() };
}

// Map a shared `FactStatus` onto the recovery failure vocabulary: a forbidden
// read is an authorization failure, a malformed read is a hard restriction,
// and a missing read is a bounded transient re-read.
function classifyFactStatus(status) {
  if (status.kind === "forbidden") return { failureClass: "auth-denied", kind: "restricted" };
  if (status.kind === "malformed") return { failureClass: "malformed-facts", kind: "restricted" };
  return { failureClass: "transient-read", kind: "recoverable" };
}

// Observe the authenticated actor and write permission independently. A
// payload can never claim its own permission for the repair write.
async function observeRecoveryPermission(repository) {
  const actor = await execArgs("gh", ["api", "user", "--jq", ".login"]);
  const login = actor.ok ? actor.output.trim() : "";
  if (login === "") return { ok: false, failureClass: "auth-denied", reason: "the authenticated actor could not be observed" };
  const permission = readCollaboratorPermission(ghSync, repository, login);
  if (permission !== "admin" && permission !== "maintain" && permission !== "write") {
    return { ok: false, failureClass: "auth-denied", reason: `authenticated actor ${login} has no observed write permission (${permission})` };
  }
  return { ok: true, actor: login, permission };
}

async function readRecoveryPr(repository, prNumber) {
  const facts = readPullRequestFacts(ghSync, repository, prNumber);
  if (facts.status.kind !== "complete") {
    return { ok: false, ...classifyFactStatus(facts.status), reason: `pull request is unreadable: ${facts.status.reason}` };
  }
  return {
    ok: true,
    state: facts.state,
    draft: facts.draft,
    body: facts.body,
    baseSha: facts.baseSha,
    headSha: facts.headSha,
    baseRef: facts.baseBranch,
    headRef: facts.headBranch,
    headRepository: facts.headRepository,
    closingIssues: facts.closingIssues.map((issue) => ({ repository: `${issue.owner}/${issue.repo}`, number: issue.number })),
  };
}

async function readIssue(repository, issueNumber) {
  const facts = readIssueFacts(ghSync, repository, issueNumber);
  if (facts.status.kind !== "complete") {
    return { ok: false, ...classifyFactStatus(facts.status), reason: `issue ${issueNumber} is unreadable: ${facts.status.reason}` };
  }
  return { ok: true, body: facts.body, state: facts.state, parentNumber: facts.parentNumber };
}

// Re-read the caller-observed governing sources from the pinned checkout. A
// declared path that is missing, a symlink, non-regular, or whose content no
// longer matches the observed digest stops the write.
async function readGoverningSources(sources) {
  const out = [];
  for (const entry of sources) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, reason: "governing sources must be objects with path and hash" };
    }
    const rel = typeof entry.path === "string" ? entry.path : "";
    const expected = typeof entry.hash === "string" ? entry.hash.toLowerCase() : "";
    if (rel === "" || rel.includes("..") || path.isAbsolute(rel) || rel.startsWith("~") || !/^[a-f0-9]{64}$/.test(expected)) {
      return { ok: false, reason: "governing sources need repository-relative paths and sha256 hashes" };
    }
    try {
      const stat = await fs.lstat(rel);
      if (stat.isSymbolicLink() || !stat.isFile()) {
        return { ok: false, reason: `governing source ${rel} is not a regular file` };
      }
      const digest = sha256Hex(await fs.readFile(rel, "utf8"));
      if (digest !== expected) {
        return { ok: false, reason: `governing source ${rel} changed since it was observed` };
      }
      out.push({ path: rel, hash: digest });
    } catch (error) {
      return { ok: false, reason: `governing source ${rel} is unreadable: ${error.message}` };
    }
  }
  return { ok: true, sources: out };
}

// Establish repair checks from the pinned checkout itself: npm script names
// from `package.json` plus the tracked-file listing. A caller list can never
// authorize arbitrary code on its own.
async function readRepairConfig() {
  let npmScripts = [];
  try {
    const pkg = JSON.parse(await fs.readFile("package.json", "utf8"));
    if (pkg && typeof pkg === "object" && pkg.scripts && typeof pkg.scripts === "object" && !Array.isArray(pkg.scripts)) {
      npmScripts = Object.entries(pkg.scripts).filter(([, value]) => typeof value === "string").map(([name]) => name);
    }
  } catch {
    return { ok: false, reason: "the pinned package.json is unreadable; repair checks cannot be established" };
  }
  // `git ls-files -s` exposes the blob mode. Symlinks (120000) and gitlinks
  // (160000) are excluded so establishment can only name a regular tracked
  // file; a symlinked "script" would otherwise resolve outside the checkout.
  const ls = await execArgsFull("git", ["ls-files", "-s"]);
  if (!ls.ok) return { ok: false, reason: "the tracked-file listing is unreadable" };
  const trackedFiles = [];
  for (const line of ls.output.split("\n")) {
    const m = line.match(/^(\d{6}) [0-9a-f]+ \d+\t(.+)$/);
    if (!m) continue;
    if (m[1] === "120000" || m[1] === "160000") continue;
    trackedFiles.push(m[2]);
  }
  return { ok: true, npmScripts, trackedFiles };
}

async function verifyLocalCheckout(pinnedHead, repository) {
  const head = await execArgs("git", ["rev-parse", "HEAD"]);
  if (!head.ok || head.output.trim() !== pinnedHead.trim()) {
    return { ok: false, reason: "the local checkout is not at the pinned head; align it before repair and never execute fork code" };
  }
  const remote = await execArgs("git", ["remote", "get-url", "origin"]);
  if (!remote.ok) return { ok: false, reason: "the origin remote is unreadable" };
  const normalized = remote.output
    .trim()
    .replace(/\.git$/i, "")
    .replace(/^git@github\.com:/i, "github.com/")
    .toLowerCase();
  if (!normalized.endsWith(`/${repository.toLowerCase()}`)) {
    return { ok: false, reason: "the checkout origin does not match the target repository; fork code stays static-review-only" };
  }
  const status = await execArgs("git", ["status", "--porcelain"]);
  if (!status.ok) return { ok: false, reason: "the git status is unreadable" };
  if (status.output.trim() !== "") {
    return { ok: false, reason: "tracked files are dirty; never clean, reset, stash, or discard to make the run look clean" };
  }
  return { ok: true };
}

// Accept the candidate through the actual bundled consumer. A mocked
// validator is insufficient; this runs the shipped workflow-cli.mjs.
function runBundledEvidenceCli(here, input) {
  const cliPath = path.join(here, "workflow-cli.mjs");
  const result = spawnSync(process.execPath, [cliPath, "evidence", "-"], {
    input: JSON.stringify(input),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: sanitizedEnv(),
  });
  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout ?? "");
  } catch {
    parsed = null;
  }
  return { exit: Number.isInteger(result.status) ? result.status : -1, parsed };
}

async function main() {
  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
  if (!Number.isInteger(nodeMajor) || nodeMajor < REQUIRED_NODE_MAJOR) {
    print(2, failure(`review preparation requires Node ${REQUIRED_NODE_MAJOR} or newer (found ${process.version})`));
  }
  const [inputPath] = process.argv.slice(2);
  if (inputPath === undefined) {
    print(2, failure("missing input path; pass <input.json> or - for stdin"));
  }
  let raw = "";
  try {
    if (inputPath === "-") {
      raw = await new Promise((resolve, reject) => {
        const chunks = [];
        process.stdin.on("data", (c) => chunks.push(c));
        process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        process.stdin.on("error", reject);
      });
    } else {
      const { readFileSync } = await import("node:fs");
      raw = readFileSync(inputPath, "utf8");
    }
  } catch (error) {
    print(2, failure(`input is unreadable: ${error.message}`));
  }
  let input = null;
  try {
    input = JSON.parse(raw);
  } catch (error) {
    print(2, failure(`input JSON is invalid: ${error.message}`));
  }
  const operation = input.operation;
  if (typeof operation !== "string" || !ALLOWED_OPERATIONS.has(operation)) {
    print(2, failure(`unknown operation \`${operation ?? ""}\`; allowed: ${[...ALLOWED_OPERATIONS].join(", ")} (no general shell or arbitrary GitHub requests)`));
  }
  // Validated targets only: repository owner/name plus numeric PR, plus
  // pinned SHAs when the operation needs them. Payload-selected commands,
  // endpoints, interpreters, preloads, and env overrides are rejected
  // downstream by the pure allowlist before any execution.
  if (input.repository !== undefined && !validRepository(input.repository)) {
    print(2, failure("input repository must be owner/name"));
  }
  if (input.prNumber !== undefined && !validPrNumber(input.prNumber)) {
    print(2, failure("input prNumber must be a positive integer"));
  }
  for (const key of ["headSha", "baseSha", "commitSha"]) {
    if (input[key] !== undefined && input[key] !== "" && !validSha(input[key])) {
      print(2, failure(`input ${key} must be a hex commit SHA`));
    }
  }
  if (typeof input.runId === "string" && input.runId !== "") {
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(input.runId)) {
      print(2, failure("input runId must be a safe run-directory name"));
    }
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  let pure = null;
  try {
    pure = await import(pathToFileURL(path.join(here, "prepare-review.ts")).href);
  } catch (error) {
    print(2, failure(`the bundled preparation core is unavailable: ${error.message}`));
  }

  try {
    switch (operation) {
      case "observe-target": {
        const runDir = await ensureRunDir(input.runId ?? `observe-${Date.now()}`);
        // One observation only; no polling. Actual gh reads happen through
        // the allowlisted observer; failures are transient-read candidates
        // with one retry, never an auth bypass.
        if (!validRepository(input.repository) || !validPrNumber(input.prNumber)) {
          print(2, failure("observe-target requires repository and prNumber"));
        }
        // Do not execute network in dry-run/test mode.
        if (input.dryRun === true) {
          print(0, { ok: true, operation, runDir, outcome: { kind: "recoverable", failureClass: "transient-read", reason: "dry-run observation; re-read before repeating" } });
        }
        const observed = await ghObservePr(input.repository, input.prNumber);
        print(0, { ok: true, operation, runDir, observed });
        break;
      }
      case "setup-runtime":
      case "install-deps":
      case "run-check": {
        // Approved setup/check commands only, via argument arrays and the
        // pure allowlist. Inspection by the reviewer is required before
        // executing project code; fork code remains static-review-only.
        // The boundary must be a known frozen boundary and, when a lockfile
        // observation is supplied, must equal the derived boundary: a payload
        // cannot approve itself with an invented permissive boundary.
        const command = typeof input.command === "string" ? input.command : "";
        const boundary = input.boundary ?? null;
        const approved = Array.isArray(input.approvedCommands) ? input.approvedCommands : [];
        if (command.trim() === "" || boundary === null) {
          print(2, failure(`${operation} requires a command plus its install boundary and approved command policy`));
        }
        if (typeof pure.isAllowedSetupCommand !== "function" || typeof pure.isValidInstallBoundary !== "function") {
          print(2, failure("preparation core is unavailable"));
        }
        if (!pure.isValidInstallBoundary(boundary)) {
          print(1, { ok: false, operation, kind: "restricted", reason: "install boundary is not a known frozen boundary with lifecycle scripts disabled" });
        }
        if (input.lockfile !== undefined) {
          if (typeof pure.deriveInstallBoundary !== "function") {
            print(2, failure("preparation core is unavailable"));
          }
          const derived = pure.deriveInstallBoundary(input.lockfile, input.hasNpmCi === true);
          if (!derived.ok) {
            print(1, { ok: false, operation, kind: "restricted", reason: `no frozen boundary for lockfile: ${derived.reason}` });
          }
          if (JSON.stringify(derived.boundary) !== JSON.stringify(boundary)) {
            print(1, { ok: false, operation, kind: "restricted", reason: "install boundary does not match the observed lockfile; derive it from the lockfile instead of the payload" });
          }
        }
        for (const entry of approved) {
          if (typeof entry !== "string" || entry.length === 0 || entry.length > 256) {
            print(2, failure("approvedCommands must be an array of script names or explicit node entries"));
          }
          if (/[;&|><`$]/.test(entry) || /\bLD_PRELOAD\b|\bNODE_OPTIONS\b|\bPYTHONPATH\b/i.test(entry)) {
            print(1, { ok: false, operation, kind: "restricted", reason: "approved command policy carries shell metacharacters or preloads" });
          }
        }
        if (!pure.isAllowedSetupCommand(command, boundary, approved)) {
          print(1, { ok: false, operation, kind: "restricted", reason: `command is outside the approved frozen boundary: ${command.slice(0, 120)}` });
        }
        if (input.fork === true) {
          print(1, { ok: false, operation, kind: "restricted", reason: "fork code remains static-review-only; never execute untrusted fork code" });
        }
        const runDir = await ensureRunDir(input.runId ?? `${operation}-${Date.now()}`);
        if (input.dryRun === true) {
          print(0, { ok: true, operation, runDir, validated: true });
        }
        // Split into argv without a shell: first token is the executable,
        // remaining tokens are arguments (no chaining/redirection allowed by
        // the pure allowlist above). Only an approved command reaches here.
        const receipt = await runApprovedCheck(command);
        // The outer result reports the command's real outcome; truncation
        // metadata rides along so a shortened display is never a receipt.
        print(0, {
          ok: receipt.exitStatus === 0,
          operation,
          runDir,
          receipt: {
            command: receipt.command,
            output: receipt.output,
            exitStatus: receipt.exitStatus,
            truncated: receipt.truncated,
            fullLength: receipt.fullLength,
          },
        });
        break;
      }
      case "prepare-checkout": {
        // Verified detached alignment only: fetch the PR head ref, verify the
        // fetched commit equals the pinned SHA, recheck cleanliness,
        // unfinished operations, and ignored collisions, then
        // `git -c core.hooksPath= checkout --detach`. Never force, stash,
        // reset, clean, switch branches, or create a worktree.
        if (!validSha(input.pinnedHeadSha) || !validPrNumber(input.prNumber) || !validRepository(input.repository)) {
          print(2, failure("prepare-checkout requires repository, prNumber, and pinnedHeadSha"));
        }
        const runDir = await ensureRunDir(input.runId ?? `checkout-${Date.now()}`);
        if (input.dryRun === true) {
          print(0, { ok: true, operation, runDir, validated: true });
        }
        const gitDirRes = await execArgs("git", ["rev-parse", "--git-dir"]);
        if (!gitDirRes.ok) {
          print(1, { ok: false, operation, kind: "recoverable", failureClass: "transient-read", reason: "git directory unreadable; re-read before repeating" });
        }
        const gitDir = gitDirRes.output.trim();
        const unfinishedMarkers = ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "BISECT_LOG"];
        for (const marker of unfinishedMarkers) {
          try {
            await fs.stat(path.join(gitDir, marker));
            print(1, { ok: false, operation, kind: "restricted", reason: `unfinished git operation (${marker}); resolve it outside this command with no checkout effect` });
          } catch (error) {
            if (error.code !== "ENOENT") {
              print(1, { ok: false, operation, kind: "recoverable", failureClass: "transient-read", reason: "git state unreadable; re-read before repeating" });
            }
          }
        }
        for (const dirMarker of ["rebase-merge", "rebase-apply"]) {
          try {
            const st = await fs.stat(path.join(gitDir, dirMarker));
            if (st.isDirectory()) {
              print(1, { ok: false, operation, kind: "restricted", reason: `unfinished git operation (${dirMarker}); resolve it outside this command with no checkout effect` });
            }
          } catch (error) {
            if (error.code !== "ENOENT") {
              print(1, { ok: false, operation, kind: "recoverable", failureClass: "transient-read", reason: "git state unreadable; re-read before repeating" });
            }
          }
        }
        const fetch = await execArgs("git", ["fetch", "origin", `refs/pull/${input.prNumber}/head`]);
        if (!fetch.ok) {
          if (isAuthFailureReason(fetch.output)) {
            print(1, { ok: false, operation, kind: "restricted", failureClass: "auth-denied", reason: `fetch denied: ${fetch.output.slice(0, 200)}` });
          }
          print(1, { ok: false, operation, kind: "restricted", reason: `fetch failed: ${fetch.output.slice(0, 200)}` });
        }
        const rev = await execArgs("git", ["rev-parse", "FETCH_HEAD^{commit}"]);
        if (!rev.ok || rev.output.trim() !== input.pinnedHeadSha.trim()) {
          print(1, { ok: false, operation, kind: "restricted", reason: `fetched commit ${rev.output.trim().slice(0, 12)} does not equal pinned ${String(input.pinnedHeadSha).slice(0, 12)}; the PR moved during resolution` });
        }
        const status = await execArgs("git", ["status", "--porcelain"]);
        if (!status.ok) {
          print(1, { ok: false, operation, kind: "recoverable", failureClass: "transient-read", reason: "git status unreadable; re-read before repeating" });
        }
        if (status.output.trim() !== "") {
          print(1, { ok: false, operation, kind: "restricted", reason: "the current checkout is dirty; commit or stash outside this command" });
        }
        const pinned = input.pinnedHeadSha.trim();
        const diffNames = await execArgs("git", ["diff", "--name-only", "HEAD", pinned]);
        if (!diffNames.ok) {
          print(1, { ok: false, operation, kind: "recoverable", failureClass: "transient-read", reason: "git diff unreadable; re-read before repeating" });
        }
        const ignored = await execArgs("git", ["ls-files", "--others", "--ignored", "--exclude-standard"]);
        if (!ignored.ok) {
          print(1, { ok: false, operation, kind: "recoverable", failureClass: "transient-read", reason: "ignored-file listing unreadable; re-read before repeating" });
        }
        const changed = new Set(diffNames.output.split("\n").map((s) => s.trim()).filter(Boolean));
        const ignoredFiles = new Set(ignored.output.split("\n").map((s) => s.trim()).filter(Boolean));
        const collisions = [...changed].filter((p) => ignoredFiles.has(p));
        if (collisions.length > 0) {
          print(1, { ok: false, operation, kind: "restricted", reason: `ignored-file collision at ${collisions.slice(0, 3).join(", ")}; the user decides what may be replaced` });
        }
        const checkout = await execArgs("git", ["-c", "core.hooksPath=", "checkout", "--detach", pinned]);
        if (!checkout.ok) {
          print(1, { ok: false, operation, kind: "restricted", reason: `detached alignment failed: ${checkout.output.slice(0, 200)}` });
        }
        const headRes = await execArgs("git", ["rev-parse", "HEAD"]);
        if (!headRes.ok || headRes.output.trim() !== pinned) {
          print(1, { ok: false, operation, kind: "restricted", reason: "post-checkout HEAD does not equal the pinned head; stop without review" });
        }
        const postStatus = await execArgs("git", ["status", "--porcelain"]);
        if (!postStatus.ok || postStatus.output.trim() !== "") {
          print(1, { ok: false, operation, kind: "restricted", reason: "post-checkout worktree is not clean; stop without review" });
        }
        print(0, { ok: true, operation, runDir, aligned: input.pinnedHeadSha });
        break;
      }
      case "publish-review": {
        // Reuse the existing review publication procedure with one automatic
        // resume. Caller supplies the pinned reviewProse/handoff; this step
        // never repeats the Standards/Spec pass for a recoverable failure.
        // Authorization failures are restrictions, never recoverable retries.
        // Permission is observed independently before any write; the handoff
        // payload permission is never trusted.
        if (!validRepository(input.repository) || !validPrNumber(input.prNumber) || !validSha(input.commitSha)) {
          print(2, failure("publish-review requires repository, prNumber, and commitSha"));
        }
        if (typeof input.reviewProse !== "string" || typeof input.handoff !== "object" || input.handoff === null) {
          print(2, failure("publish-review requires reviewProse and handoff content"));
        }
        const runDir = await ensureRunDir(input.runId ?? `publish-${Date.now()}`);
        if (input.dryRun === true) {
          print(0, { ok: true, operation, runDir, validated: true });
        }
        const { publishReviewPublication } = await import(pathToFileURL(path.join(here, "publish-review.ts")).href);
        const { createGhReviewTransport } = await import(pathToFileURL(path.join(here, "gh-review-transport.ts")).href);
        const resumeId = typeof input.resumeReviewId === "string" && input.resumeReviewId !== "" ? input.resumeReviewId : undefined;
        const claimedPermission = typeof input.observedReviewerPermission === "string" ? input.observedReviewerPermission : undefined;
        const expectedAuthorInput = typeof input.expectedAuthor === "string" && input.expectedAuthor !== "" ? input.expectedAuthor : undefined;
        const inlineComments = Array.isArray(input.inlineComments) ? input.inlineComments : undefined;
        const nonDefaultEventApproved = input.nonDefaultEventApproved === true ? true : undefined;
        let observedReviewerPermission;
        let expectedAuthor = expectedAuthorInput;
        if (claimedPermission === "policy") {
          observedReviewerPermission = "policy";
        } else {
          const actorRes = await execArgs("gh", ["api", "user", "--jq", ".login"]);
          const actor = actorRes.ok ? actorRes.output.trim() : "";
          const permRes = actor !== "" ? await execArgs("gh", ["api", `repos/${input.repository}/collaborators/${actor}/permission`, "--jq", ".permission"]) : { ok: false, output: "" };
          const observed = permRes.ok ? permRes.output.trim() : "";
          const permission = observed === "admin" || observed === "maintain" || observed === "write" ? observed : "unknown";
          if (actor === "" || permission === "unknown") {
            print(1, { ok: false, operation, kind: "restricted", failureClass: "auth-denied", step: "read-back", reviewId: resumeId ?? null, reason: "reviewer permission was not independently observed; verify it before publication" });
          }
          if (expectedAuthor !== undefined && expectedAuthor !== actor) {
            print(1, { ok: false, operation, kind: "restricted", failureClass: "auth-denied", step: "read-back", reviewId: resumeId ?? null, reason: `expected author ${expectedAuthor} does not match the authenticated actor ${actor}; stop instead of publishing as another user` });
          }
          expectedAuthor = actor;
          observedReviewerPermission = permission;
        }
        const baseInput = {
          repository: input.repository,
          prNumber: input.prNumber,
          commitSha: input.commitSha,
          reviewProse: input.reviewProse,
          handoff: input.handoff,
          submitEvent: input.submitEvent ?? "COMMENT",
          nonDefaultEventApproved,
          observedReviewerPermission,
          expectedAuthor,
          inlineComments,
          resumeReviewId: resumeId,
        };
        let outcome = await publishReviewPublication(baseInput, createGhReviewTransport(input.repository));
        if (outcome.status === "published") {
          print(0, { ok: true, operation, runDir, status: "published", reviewId: outcome.reviewId });
        }
        if (isAuthFailureReason(outcome.reason)) {
          print(1, { ok: false, operation, kind: "restricted", failureClass: "auth-denied", step: outcome.step, reviewId: outcome.reviewId ?? null, reason: outcome.reason });
        }
        // One automatic resume of the same verified pending review when the
        // first attempt created it but could not submit it.
        if (outcome.step === "submit" && outcome.reviewId && resumeId === undefined) {
          const resumed = await publishReviewPublication(
            { ...baseInput, resumeReviewId: outcome.reviewId },
            createGhReviewTransport(input.repository),
          );
          if (resumed.status === "published") {
            print(0, { ok: true, operation, runDir, status: "published", reviewId: resumed.reviewId, resumed: true });
          }
          if (isAuthFailureReason(resumed.reason)) {
            print(1, { ok: false, operation, kind: "restricted", failureClass: "auth-denied", step: resumed.step, reviewId: resumed.reviewId ?? outcome.reviewId, reason: resumed.reason });
          }
          outcome = resumed;
        }
        print(1, { ok: false, operation, kind: "recoverable", failureClass: "publication-recoverable", step: outcome.step, reviewId: outcome.reviewId ?? null, reason: outcome.reason });
        break;
      }
      case "verify-commands": {
        // Inspect verification commands before executing project code. The
        // command must be within the frozen boundary; fork code stays
        // static-review-only. This step performs no execution itself.
        const command = typeof input.command === "string" ? input.command : "";
        const boundary = input.boundary ?? null;
        const approved = Array.isArray(input.approvedCommands) ? input.approvedCommands : [];
        if (command.trim() === "" || boundary === null) {
          print(2, failure("verify-commands requires a command plus its install boundary and approved command policy"));
        }
        if (typeof pure.isAllowedSetupCommand !== "function" || typeof pure.isValidInstallBoundary !== "function") {
          print(2, failure("preparation core is unavailable"));
        }
        if (!pure.isValidInstallBoundary(boundary)) {
          print(1, { ok: false, operation, kind: "restricted", reason: "install boundary is not a known frozen boundary" });
        }
        if (input.fork === true) {
          print(1, { ok: false, operation, kind: "restricted", reason: "fork code remains static-review-only; never execute untrusted fork code" });
        }
        if (!pure.isAllowedSetupCommand(command, boundary, approved)) {
          print(1, { ok: false, operation, kind: "restricted", reason: `command is outside the approved frozen boundary: ${command.slice(0, 120)}` });
        }
        const runDir = await ensureRunDir(input.runId ?? `${operation}-${Date.now()}`);
        print(0, { ok: true, operation, runDir, validated: true });
        break;
      }
      case "resolve-policy": {
        // Resolve governing policy from pinned base objects. This operation
        // performs no filesystem or network reads itself; the caller supplies
        // the observed facts and this step runs the pure decision.
        const required = ["baseSources", "headSources", "baseReadable", "headReadable", "baseIsSymlink", "headIsSymlink", "gitObjectFallbackReadable", "baseContradictory", "baseAmbiguous", "targetValid", "checkoutMatches", "worktreeClean"];
        for (const key of required) {
          if (input[key] === undefined) {
            print(2, failure(`resolve-policy requires ${key}`));
          }
        }
        const runDir = await ensureRunDir(input.runId ?? `${operation}-${Date.now()}`);
        if (input.dryRun === true) {
          print(0, { ok: true, operation, runDir, validated: true });
        }
        const { resolveReviewPolicySources } = await import(pathToFileURL(path.join(here, "review-policy.ts")).href);
        const outcome = resolveReviewPolicySources({
          baseSources: input.baseSources,
          headSources: input.headSources,
          baseReadable: !!input.baseReadable,
          headReadable: !!input.headReadable,
          baseIsSymlink: !!input.baseIsSymlink,
          headIsSymlink: !!input.headIsSymlink,
          gitObjectFallbackReadable: !!input.gitObjectFallbackReadable,
          baseContradictory: !!input.baseContradictory,
          baseAmbiguous: !!input.baseAmbiguous,
          targetValid: !!input.targetValid,
          checkoutMatches: !!input.checkoutMatches,
          worktreeClean: !!input.worktreeClean,
        });
        if (outcome.action === "stop") {
          print(1, { ok: false, operation, kind: "restricted", reason: outcome.reason });
        }
        print(0, { ok: true, operation, runDir, outcome });
        break;
      }
      case "repair-record": {
        // Read-only inspection/reconciliation of an existing attempted repair:
        // never a separate record writer or authorization bypass.
        if (!validRepository(input.repository) || !validPrNumber(input.prNumber)) {
          print(2, failure("repair-record requires repository and prNumber"));
        }
        const runDir = await ensureRunDir(input.runId ?? `repair-record-${Date.now()}`);
        if (input.dryRun === true) {
          print(0, { ok: true, operation, runDir, validated: true, repaired: false, ready: false });
        }
        const core = await import(pathToFileURL(path.join(here, "workflow-state.ts")).href);
        for (const fn of ["locateEvidenceRepairRecord", "evidenceRepairReusable"]) {
          if (typeof core[fn] !== "function") {
            print(2, failure("the bundled shared core is unavailable"));
          }
        }
        const pr = await readRecoveryPr(input.repository, input.prNumber);
        if (!pr.ok) {
          print(1, { ok: false, operation, kind: "restricted", failureClass: "transient-read", reason: `pull request is unreadable: ${pr.reason}` });
        }
        const located = core.locateEvidenceRepairRecord(pr.body);
        if (located.location !== "inside") {
          print(1, { ok: false, operation, kind: "restricted", reason: `no usable evidence repair record: ${located.reason}` });
        }
        const record = located.record;
        // A record written for another target is never reusable.
        if (record.repository.toLowerCase() !== input.repository.toLowerCase() || record.prNumber !== input.prNumber) {
          print(1, { ok: false, operation, kind: "restricted", reason: "the repair record names a different repository or pull request; reconcile it outside review" });
        }
        // Reuse requires the recorded candidate to be exactly what is live and
        // an identical stored intent. Without a hint, reuse cannot be proven.
        let reusable = false;
        let matchesLiveBody = false;
        try {
          const hint = JSON.parse(await fs.readFile(path.join(runDir, "evidence-repair.json"), "utf8"));
          matchesLiveBody = typeof hint.candidateDigest === "string" && hint.candidateDigest === sha256Hex(pr.body);
          reusable =
            hint.repository === input.repository &&
            hint.prNumber === input.prNumber &&
            typeof hint.record === "object" &&
            hint.record !== null &&
            core.evidenceRepairReusable(hint.record, record) &&
            matchesLiveBody;
        } catch {
          reusable = false;
        }
        print(0, { ok: true, operation, runDir, record, reusable, matchesLiveBody });
        break;
      }
      case "recover-evidence": {
        // One bounded, observation-based repair write. Remove the obsolete
        // decision-only contract explicitly instead of silently ignoring a
        // caller boolean.
        if (input.checks === undefined && input.classification !== undefined) {
          print(2, failure("recover-evidence no longer accepts decision-only booleans; supply repository, prNumber, headSha, baseSha, ticketNumber, parentNumber, boundary, approvedCommands, requiredCommands, governingSources, and criterion/check observations"));
        }
        if (!validRepository(input.repository) || !validPrNumber(input.prNumber) || !validSha(input.headSha) || !validSha(input.baseSha)) {
          print(2, failure("recover-evidence requires repository, prNumber, headSha, and baseSha"));
        }
        if (!validPrNumber(input.ticketNumber) || !validPrNumber(input.parentNumber)) {
          print(2, failure("recover-evidence requires ticketNumber and parentNumber"));
        }
        const boundary = input.boundary ?? null;
        const approved = Array.isArray(input.approvedCommands) ? input.approvedCommands : [];
        const checks = Array.isArray(input.checks) ? input.checks : null;
        if (checks === null || checks.length === 0) {
          print(2, failure("recover-evidence requires a non-empty criterion/check observation list"));
        }
        // The observed verification intent: every command the pinned ticket
        // and requirements state requires. Recovery executes all of these, not
        // only the commands a criterion happens to map to, so a mandatory check
        // cannot be skipped by leaving it out of the criterion mapping.
        const requiredCommands = Array.isArray(input.requiredCommands)
          ? input.requiredCommands.filter((c) => typeof c === "string" && c.trim() !== "").map((c) => c.trim())
          : null;
        if (requiredCommands === null || requiredCommands.length === 0) {
          print(2, failure("recover-evidence requires the observed requiredCommands verification intent"));
        }
        // Governing sources observed by policy resolution. Recovery re-reads
        // them, at observation and again before the write, so a concurrent
        // policy edit in the final window stops the write.
        if (!Array.isArray(input.governingSources)) {
          print(2, failure("recover-evidence requires observed governingSources (an array, empty when policy resolution found none)"));
        }
        if (typeof pure.isAllowedSetupCommand !== "function" || typeof pure.isValidInstallBoundary !== "function" || typeof pure.isEstablishedRepairCommand !== "function" || typeof pure.summarizeExecutionReceipt !== "function") {
          print(2, failure("preparation core is unavailable"));
        }
        if (!pure.isValidInstallBoundary(boundary)) {
          print(1, { ok: false, operation, kind: "restricted", reason: "install boundary is not a known frozen boundary with lifecycle scripts disabled" });
        }
        if (input.fork === true) {
          print(1, { ok: false, operation, kind: "restricted", reason: "fork code remains static-review-only; never execute untrusted fork code" });
        }
        const core = await import(pathToFileURL(path.join(here, "workflow-state.ts")).href);
        for (const fn of [
          "decideReviewEvidenceRecovery",
          "classifyRequirementsPin",
          "requirementsRevision",
          "requirementsRevisionValue",
          "validateEvidenceHandoff",
          "resolveRequirementsBody",
          "renderCompactEvidence",
          "insertEvidenceRepairRecord",
          "replaceSingleEvidenceBlock",
          "evidencePinPresence",
          "readEvidenceRed",
          "locateEvidenceRepairRecord",
          "extractEvidenceBehaviorClaims",
          "extractDeclaredBehaviorCriteria",
          "parseEvidenceHandoff",
        ]) {
          if (typeof core[fn] !== "function") {
            print(2, failure(`the bundled shared core is missing ${fn}`));
          }
        }
        const runDir = await ensureRunDir(input.runId ?? `recover-${Date.now()}`);
        if (input.dryRun === true) {
          print(0, { ok: true, operation, runDir, validated: true, repaired: false, ready: false });
        }
        // Independently observe actor/write permission, the local checkout
        // identity, and the declared governing sources.
        const permission = await observeRecoveryPermission(input.repository);
        if (!permission.ok) {
          print(1, { ok: false, operation, kind: "restricted", failureClass: permission.failureClass ?? "auth-denied", reason: permission.reason });
        }
        const local = await verifyLocalCheckout(input.headSha, input.repository);
        if (!local.ok) {
          print(1, { ok: false, operation, kind: "restricted", reason: local.reason });
        }
        const governing = await readGoverningSources(input.governingSources);
        if (!governing.ok) {
          print(1, { ok: false, operation, kind: "restricted", reason: governing.reason });
        }
        // Native PR facts: open, exact pins, and positively same-repository head.
        const pr = await readRecoveryPr(input.repository, input.prNumber);
        if (!pr.ok) {
          print(1, { ok: false, operation, kind: "restricted", failureClass: pr.failureClass ?? "transient-read", reason: pr.reason });
        }
        if (pr.state !== "open") {
          print(1, { ok: false, operation, kind: "restricted", reason: `the pull request is ${pr.state}, not open` });
        }
        if (pr.headSha !== input.headSha.trim() || pr.baseSha !== input.baseSha.trim()) {
          print(1, { ok: false, operation, kind: "restricted", failureClass: "revision-change", reason: "pull-request head or base moved from the expected pins; re-observe before repair" });
        }
        if (pr.headRepository === "" || pr.headRepository.toLowerCase() !== input.repository.toLowerCase()) {
          print(1, { ok: false, operation, kind: "restricted", reason: "the pull request head repository is not positively the target repository; fork or deleted-source code stays static-review-only" });
        }
        // Native closing-ticket and parent associations.
        const closingTargets = pr.closingIssues
          .filter((issue) => issue.repository.toLowerCase() === input.repository.toLowerCase())
          .map((issue) => issue.number);
        if (closingTargets.length !== 1 || closingTargets[0] !== input.ticketNumber) {
          print(1, { ok: false, operation, kind: "restricted", reason: "the pull request does not natively close exactly the expected ticket" });
        }
        const ticket = await readIssue(input.repository, input.ticketNumber);
        if (!ticket.ok || ticket.body.trim() === "") {
          print(1, { ok: false, operation, kind: "restricted", failureClass: ticket.failureClass ?? "transient-read", reason: "the closing ticket body is unreadable or empty" });
        }
        if (ticket.parentNumber !== input.parentNumber) {
          print(1, { ok: false, operation, kind: "restricted", reason: "the closing ticket does not natively belong to the expected parent" });
        }
        const parent = await readIssue(input.repository, input.parentNumber);
        if (!parent.ok || parent.body.trim() === "") {
          print(1, { ok: false, operation, kind: "restricted", failureClass: parent.failureClass ?? "transient-read", reason: "the parent body is unreadable or empty" });
        }
        // Current requirements revision from the observed canonical bodies.
        let currentCarrier = null;
        try {
          currentCarrier = core.requirementsRevisionValue(core.requirementsRevision(parent.body, ticket.body, sha256Hex));
        } catch (error) {
          print(1, { ok: false, operation, kind: "restricted", reason: `current requirements do not resolve: ${error.message}` });
        }
        const ticketResolution = core.resolveRequirementsBody(ticket.body, "ticket");
        if (!ticketResolution.ok) {
          print(1, { ok: false, operation, kind: "restricted", reason: "the ticket criteria do not resolve; reconcile requirements outside review" });
        }
        // Existing single block and a precise pin presence decision.
        const existingPin = core.evidencePinPresence(pr.body);
        if (existingPin.kind === "no-block") {
          print(1, { ok: false, operation, kind: "restricted", reason: "no single compact evidence block is present; review preparation never composes an absent block" });
        }
        if (existingPin.kind === "duplicate" || existingPin.kind === "malformed") {
          print(1, { ok: false, operation, kind: "restricted", reason: existingPin.reason });
        }
        const classification = core.classifyRequirementsPin(existingPin.kind === "present" ? existingPin.value : "", currentCarrier);
        if (classification.classification === "equal") {
          // Even a current pin must carry a usable repair record: a duplicate,
          // out-of-region, or foreign record is a restriction, never a silent
          // success, and an unsupported envelope stops instead of reporting
          // ready: false with exit 0.
          const locatedHere = core.locateEvidenceRepairRecord(pr.body);
          if (locatedHere.location === "outside" || locatedHere.location === "ambiguous" || locatedHere.location === "malformed") {
            print(1, { ok: false, operation, kind: "restricted", reason: `the pull request carries an unusable repair record: ${locatedHere.reason}` });
          }
          if (locatedHere.location === "inside") {
            const prior = locatedHere.record;
            if (prior.repository.toLowerCase() !== input.repository.toLowerCase() || prior.prNumber !== input.prNumber) {
              print(1, { ok: false, operation, kind: "restricted", reason: "the repair record names a different repository or pull request; reconcile it outside review" });
            }
          }
          const current = core.validateEvidenceHandoff({ body: pr.body, currentRequirementsRevision: currentCarrier, currentHeadSha: input.headSha.trim() });
          if (current.status !== "current") {
            print(1, { ok: false, operation, kind: "restricted", reason: `current-pin evidence is not reviewable: ${current.reason}` });
          }
          print(0, { ok: true, operation, runDir, repaired: false, ready: true, decision: { classification: "equal", reason: classification.reason } });
        }
        const red = core.readEvidenceRed(pr.body);
        if (red.kind === "malformed") {
          print(1, { ok: false, operation, kind: "restricted", reason: red.reason });
        }
        const isBugFix = red.kind === "present";
        // The original evidence must be bound to the same head; repair never
        // silently rebinds evidence verified against another commit.
        const originalHandoff = core.parseEvidenceHandoff(pr.body);
        const originalHead = (originalHandoff.headSha ?? "").trim();
        if (originalHead !== "" && originalHead !== input.headSha.trim()) {
          print(1, { ok: false, operation, kind: "restricted", reason: `the evidence block is bound to head ${originalHead.slice(0, 12)} while the pull request is at ${input.headSha.trim().slice(0, 12)}; rerun verification instead of rebinding` });
        }
        // Criterion/check observations must cover every active criterion once.
        const activeIds = core.activeCriteria
          ? core.activeCriteria(ticketResolution.criteria).map((criterion) => criterion.id)
          : ticketResolution.criteria.filter((criterion) => criterion.status === "active").map((criterion) => criterion.id);
        const checkById = new Map();
        for (const entry of checks) {
          if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
            print(2, failure("each check observation must be one object"));
          }
          const criterionId = String(entry.criterionId ?? "");
          if (!activeIds.includes(criterionId)) {
            print(2, failure(`check names a non-active or unknown criterion: ${criterionId}`));
          }
          if (checkById.has(criterionId)) {
            print(2, failure(`duplicate check observation for ${criterionId}`));
          }
          if (entry.kind !== "behavior" && entry.kind !== "non-behavior") {
            print(2, failure(`check ${criterionId} must be behavior or non-behavior`));
          }
          const command = typeof entry.command === "string" ? entry.command.trim() : "";
          if (command === "") {
            print(2, failure(`check ${criterionId} requires a command`));
          }
          checkById.set(criterionId, {
            criterionId,
            kind: entry.kind,
            command,
            rationale: typeof entry.rationale === "string" ? entry.rationale : "",
          });
        }
        const missingChecks = activeIds.filter((id) => !checkById.has(id));
        const extraChecks = [...checkById.keys()].filter((id) => !activeIds.includes(id));
        if (missingChecks.length > 0 || extraChecks.length > 0) {
          print(1, { ok: false, operation, kind: "restricted", reason: `repair checks must cover every active criterion exactly once (missing: ${missingChecks.join(", ") || "none"}; extra: ${extraChecks.join(", ") || "none"})` });
        }
        // Any criterion that *declares* behavior proof (a `Focused command`,
        // whether or not it passed) can never be downgraded to non-behavior.
        const declaredBehavior = new Set(core.extractDeclaredBehaviorCriteria(pr.body));
        for (const claim of core.extractEvidenceBehaviorClaims(pr.body)) declaredBehavior.add(claim.criterionId);
        for (const check of checkById.values()) {
          if (declaredBehavior.has(check.criterionId) && check.kind !== "behavior") {
            print(1, { ok: false, operation, kind: "restricted", reason: `criterion ${check.criterionId} carried behavior proof and cannot be downgraded to non-behavior` });
          }
          if (check.kind === "non-behavior" && check.rationale.trim() === "") {
            print(2, failure(`non-behavior check ${check.criterionId} requires a rationale`));
          }
        }
        // Establish every command from the pinned configuration and the frozen
        // boundary before executing anything.
        const config = await readRepairConfig();
        if (!config.ok) {
          print(1, { ok: false, operation, kind: "restricted", reason: config.reason });
        }
        const criterionCommands = [...checkById.values()].map((check) => check.command);
        const uniqueCommands = [...new Set([...requiredCommands, ...criterionCommands])];
        for (const command of uniqueCommands) {
          const established = pure.isEstablishedRepairCommand(command, config);
          if (!established.ok) {
            print(1, { ok: false, operation, kind: "restricted", reason: established.reason });
          }
          if (!pure.isAllowedSetupCommand(command, boundary, approved)) {
            print(1, { ok: false, operation, kind: "restricted", reason: `repair check is outside the approved frozen boundary: ${command}` });
          }
        }
        // One deduplicated execution set covering the full observed
        // verification intent. Every required command gets a receipt even if
        // no criterion maps to it.
        const receipts = [];
        for (const command of uniqueCommands) {
          receipts.push(await runApprovedCheck(command));
        }
        const missingReceipts = uniqueCommands.filter((command) => !receipts.some((receipt) => receipt.command === command));
        if (missingReceipts.length > 0) {
          print(1, { ok: false, operation, kind: "restricted", reason: `no execution receipt recorded for required check(s): ${missingReceipts.join(", ")}` });
        }
        // A shortened display is never a receipt: incomplete check output
        // cannot authorize a repair.
        const truncated = receipts.filter((receipt) => receipt.truncated === true);
        if (truncated.length > 0) {
          print(1, { ok: false, operation, kind: "restricted", failureClass: "incomplete-receipt", reason: `repair check output is incomplete (truncated): ${truncated.map((receipt) => receipt.command).join(", ")}; re-run with a bounded check` });
        }
        // Recheck tracked-file cleanliness after checks and before deciding
        // success or failure: a check that dirtied the tree must restrict, not
        // continue with blockers against modified files.
        const postChecks = await verifyLocalCheckout(input.headSha, input.repository);
        if (!postChecks.ok) {
          print(1, { ok: false, operation, kind: "restricted", reason: `after repair checks: ${postChecks.reason}` });
        }
        const failed = receipts.filter((receipt) => receipt.exitStatus !== 0);
        if (failed.length > 0) {
          // Trustworthy target/requirements with a real check failure: retain
          // the old evidence unchanged and carry the failure into review.
          print(0, {
            ok: true,
            operation,
            runDir,
            repaired: false,
            ready: false,
            outcome: {
              kind: "reviewable-with-blockers",
              failureClass: "policy-reviewable",
              reason: `repair verification failed: ${failed.map((receipt) => receipt.command).join(", ")}`,
              receipts: receipts.map((receipt) => ({
                command: receipt.command,
                exitStatus: receipt.exitStatus,
                truncated: receipt.truncated,
                outputBytes: receipt.outputBytes,
                output: receipt.output,
              })),
            },
          });
        }
        // Render the current evidence, preserve the original RED record
        // verbatim, and place one repair record inside the same region.
        const evidence = ticketResolution.criteria
          .filter((criterion) => criterion.status === "active")
          .map((criterion) => {
            const check = checkById.get(criterion.id);
            if (check.kind === "behavior") {
              const receipt = receipts.find((item) => item.command === check.command);
              return {
                criterionId: criterion.id,
                kind: "behavior",
                focusedCommand: check.command,
                result: pure.summarizeExecutionReceipt(receipt),
                passed: true,
              };
            }
            return { criterionId: criterion.id, kind: "non-behavior", rationale: check.rationale };
          });
        let candidateBlock;
        try {
          candidateBlock = core.renderCompactEvidence({
            criteria: ticketResolution.criteria,
            evidence,
            isBugFix,
            bugRedCommand: red.kind === "present" ? red.redCommand : undefined,
            bugRedOutput: red.kind === "present" ? red.redOutput : undefined,
            requirementsRevision: currentCarrier,
            headSha: input.headSha.trim(),
          });
        } catch (error) {
          print(1, { ok: false, operation, kind: "restricted", reason: `candidate evidence could not render: ${error.message}` });
        }
        const record = {
          repository: input.repository,
          prNumber: input.prNumber,
          oldRequirementsRevision: existingPin.kind === "present" ? existingPin.value : "",
          newRequirementsRevision: currentCarrier,
          oldHeadSha: originalHead,
          newHeadSha: input.headSha.trim(),
          baseSha: input.baseSha.trim(),
          reason: classification.reason,
          verificationProvenance: receipts
            .map((receipt) => pure.summarizeExecutionReceipt(receipt))
            .join("; "),
        };
        // A prior repair record is never moved, deleted, or silently
        // overwritten. An already-applied identical repair makes the block pin
        // current, which the equal branch handled above; anything else here is
        // an inconsistent prior attempt that needs reconciliation.
        const priorRecord = core.locateEvidenceRepairRecord(pr.body);
        if (priorRecord.location === "outside" || priorRecord.location === "ambiguous" || priorRecord.location === "malformed") {
          print(1, { ok: false, operation, kind: "restricted", reason: `the pull request carries an unusable repair record: ${priorRecord.reason}` });
        }
        if (priorRecord.location === "inside") {
          print(1, { ok: false, operation, kind: "restricted", reason: "a prior evidence repair record is present with a stale pin; reconcile it instead of overwriting" });
        }
        let composed;
        try {
          composed = core.insertEvidenceRepairRecord(candidateBlock, record);
        } catch (error) {
          print(1, { ok: false, operation, kind: "restricted", reason: `repair record could not compose: ${error.message}` });
        }
        const replaced = core.replaceSingleEvidenceBlock(pr.body, composed);
        if (!replaced.ok) {
          print(1, { ok: false, operation, kind: "restricted", reason: replaced.reason });
        }
        const decision = core.decideReviewEvidenceRecovery({
          classification: classification.classification,
          currentScopeResolved: true,
          proofRevalidated: true,
          unambiguousBlock: true,
          historicalBugRedPreserved: true,
        });
        if (!decision.proceed) {
          print(1, { ok: false, operation, kind: "restricted", reason: decision.reason });
        }
        // Accept the full candidate through the bundled consumer with the
        // observed configuration and the recorded receipts. Rejection means
        // no write.
        const cliInput = {
          pullRequestBody: replaced.body,
          parentBody: parent.body,
          ticketBody: ticket.body,
          headSha: input.headSha.trim(),
          configuredCommands: uniqueCommands,
          executionReceipts: receipts.map((receipt) => ({
            command: receipt.command,
            output: receipt.output.trim() === "" ? "(no output)" : receipt.output,
            exitStatus: receipt.exitStatus,
          })),
        };
        const cli = runBundledEvidenceCli(here, cliInput);
        if (cli.exit !== 0) {
          print(1, { ok: false, operation, kind: "restricted", reason: `the bundled evidence consumer rejected the candidate: ${cli.parsed?.reason ?? "unknown"}` });
        }
        // One guarded precondition check reused for the first write and the
        // single corrective attempt: body, head, base, open state, positive
        // head repository, permission actor, local HEAD/cleanliness,
        // requirements, native associations, and governing sources.
        const verifyWriteGuards = async () => {
          const currentPr = await readRecoveryPr(input.repository, input.prNumber);
          if (!currentPr.ok) return { ok: false, failureClass: currentPr.failureClass, reason: currentPr.reason };
          if (
            currentPr.body !== pr.body ||
            currentPr.headSha !== pr.headSha ||
            currentPr.baseSha !== pr.baseSha ||
            currentPr.state !== "open" ||
            currentPr.headRepository === "" ||
            currentPr.headRepository.toLowerCase() !== input.repository.toLowerCase()
          ) {
            return { ok: false, reason: "the pull request moved between observation and write; re-observe before repair" };
          }
          const perm = await observeRecoveryPermission(input.repository);
          if (!perm.ok || perm.actor !== permission.actor) {
            return { ok: false, failureClass: "auth-denied", reason: "write permission changed between observation and write; stop" };
          }
          const localCheck = await verifyLocalCheckout(input.headSha, input.repository);
          if (!localCheck.ok) return { ok: false, reason: `before write: ${localCheck.reason}` };
          const reTicket = await readIssue(input.repository, input.ticketNumber);
          const reParent = await readIssue(input.repository, input.parentNumber);
          let reCarrier = null;
          try {
            reCarrier = core.requirementsRevisionValue(core.requirementsRevision(reParent.body ?? "", reTicket.body ?? "", sha256Hex));
          } catch {
            reCarrier = null;
          }
          const reTargets = currentPr.closingIssues
            .filter((issue) => issue.repository.toLowerCase() === input.repository.toLowerCase())
            .map((issue) => issue.number);
          if (!reTicket.ok || !reParent.ok || reTargets.length !== 1 || reTargets[0] !== input.ticketNumber || reCarrier !== currentCarrier) {
            return { ok: false, reason: "the requirements or native associations moved between observation and write; re-observe before repair" };
          }
          const gov = await readGoverningSources(input.governingSources);
          if (!gov.ok) return { ok: false, reason: gov.reason };
          return { ok: true };
        };
        const guard = await verifyWriteGuards();
        if (!guard.ok) {
          print(1, { ok: false, operation, kind: "restricted", failureClass: guard.failureClass, reason: guard.reason });
        }
        const originalDigest = sha256Hex(pr.body);
        const candidateDigest = sha256Hex(replaced.body);
        try {
          await fs.writeFile(
            path.join(runDir, "evidence-repair.json"),
            `${JSON.stringify(
              {
                repository: input.repository,
                prNumber: input.prNumber,
                headSha: input.headSha,
                baseSha: input.baseSha,
                originalDigest,
                candidateDigest,
                candidateBody: replaced.body,
                requiredCommands,
                governingSources: governing.sources,
                record,
                receipts: receipts.map((receipt) => ({
                  command: receipt.command,
                  exitStatus: receipt.exitStatus,
                  truncated: receipt.truncated,
                  outputBytes: receipt.outputBytes,
                  output: receipt.output,
                })),
              },
              null,
              2,
            )}\n`,
            { mode: 0o600 },
          );
        } catch (error) {
          print(1, { ok: false, operation, kind: "restricted", reason: `repair reconciliation hint could not be stored: ${error.message}` });
        }
        const patch = await execArgsFull("gh", ["api", "--method", "PATCH", `repos/${input.repository}/pulls/${input.prNumber}`, "-f", `body=${replaced.body}`]);
        const readBack = await readRecoveryPr(input.repository, input.prNumber);
        if (!patch.ok && isAuthFailureReason(patch.output)) {
          print(1, { ok: false, operation, kind: "restricted", failureClass: "auth-denied", reason: `body write denied: ${patch.output.slice(0, 200)}` });
        }
        const readBackLanded =
          readBack.ok &&
          readBack.body === replaced.body &&
          readBack.headSha === input.headSha.trim() &&
          readBack.baseSha === input.baseSha.trim() &&
          readBack.state === "open";
        if (readBackLanded) {
          const readBackCheck = runBundledEvidenceCli(here, { ...cliInput, pullRequestBody: readBack.body });
          if (readBackCheck.exit !== 0) {
            print(1, { ok: false, operation, kind: "restricted", reason: "the written body failed consumer validation on read-back" });
          }
          print(0, {
            ok: true,
            operation,
            runDir,
            repaired: true,
            ready: true,
            status: patch.ok ? "repaired" : "adopted-after-response-loss",
            record,
            digests: { original: originalDigest, candidate: candidateDigest },
          });
        }
        if (readBack.ok && readBack.body === pr.body) {
          // The body is exactly the original: permit one bounded corrective
          // attempt with fresh guards, then stop. Any different or
          // persistently unreadable state is a restriction, never a replay.
          const retryGuard = await verifyWriteGuards();
          if (!retryGuard.ok) {
            print(1, { ok: false, operation, kind: "restricted", failureClass: retryGuard.failureClass ?? "auth-denied", reason: "guards changed before the corrective attempt; stop without another write" });
          }
          const retry = await execArgsFull("gh", ["api", "--method", "PATCH", `repos/${input.repository}/pulls/${input.prNumber}`, "-f", `body=${replaced.body}`]);
          const retryBack = await readRecoveryPr(input.repository, input.prNumber);
          const retryLanded =
            retry.ok &&
            retryBack.ok &&
            retryBack.body === replaced.body &&
            retryBack.headSha === input.headSha.trim() &&
            retryBack.baseSha === input.baseSha.trim() &&
            retryBack.state === "open";
          if (retryLanded) {
            const retryCheck = runBundledEvidenceCli(here, { ...cliInput, pullRequestBody: retryBack.body });
            if (retryCheck.exit !== 0) {
              print(1, { ok: false, operation, kind: "restricted", reason: "the retried body failed consumer validation on read-back" });
            }
            print(0, { ok: true, operation, runDir, repaired: true, ready: true, status: "repaired-after-retry", record });
          }
          if (retryBack.ok && retryBack.body === pr.body) {
            // One corrective attempt per repair, not per process: exhausted
            // attempts restrict instead of inviting an unbounded replay.
            print(1, { ok: false, operation, kind: "restricted", failureClass: "repair-exhausted", reason: `the body write did not take effect after the single corrective attempt: ${patch.ok ? "read-back mismatch" : patch.output.slice(0, 200) || "unknown write failure"}` });
          }
          print(1, { ok: false, operation, kind: "restricted", reason: "the pull request body is in a different state after the corrective attempt; stop without another write" });
        }
        print(1, { ok: false, operation, kind: "restricted", reason: "the pull request body is in an unexpected state after the write attempt; stop without another write" });
        break;
      }
      default: {
        print(2, failure(`unsupported operation ${operation}`));
        break;
      }
    }
  } catch (error) {
    print(2, failure(`preparation failed internally: ${error.message}`));
  }
  void os;
  void pure;
}

main();
