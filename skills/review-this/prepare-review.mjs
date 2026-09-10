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
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
        // the pure allowlist above).
        const parts = command.trim().split(/\s+/);
        const result = await execArgs(parts[0], parts.slice(1));
        // Tracked-file cleanliness is checked by the caller after setup;
        // this helper never cleans, resets, stashes, or discards.
        print(0, { ok: true, operation, runDir, receipt: { command, output: result.output, exitStatus: result.exitStatus } });
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
        const baseInput = {
          repository: input.repository,
          prNumber: input.prNumber,
          commitSha: input.commitSha,
          reviewProse: input.reviewProse,
          handoff: input.handoff,
          submitEvent: input.submitEvent ?? "COMMENT",
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
      case "recover-evidence":
      case "repair-record": {
        // Classify evidence recovery from current proof facts. This operation
        // never fabricates a pin: it runs the pure recovery gate and returns
        // the decision. Scoped writes happen only through the evidence-repair
        // path with pre-write re-read and post-write read-back.
        const required = ["classification", "currentScopeResolved", "proofRevalidated", "unambiguousBlock", "historicalBugRedPreserved"];
        for (const key of required) {
          if (input[key] === undefined) {
            print(2, failure(`${operation} requires ${key}`));
          }
        }
        const runDir = await ensureRunDir(input.runId ?? `${operation}-${Date.now()}`);
        if (input.dryRun === true) {
          print(0, { ok: true, operation, runDir, validated: true });
        }
        const core = await import(pathToFileURL(path.join(here, "workflow-state.ts")).href);
        if (typeof core.decideReviewEvidenceRecovery !== "function") {
          print(2, failure("preparation core is unavailable"));
        }
        const decision = core.decideReviewEvidenceRecovery({
          classification: input.classification,
          currentScopeResolved: !!input.currentScopeResolved,
          proofRevalidated: !!input.proofRevalidated,
          unambiguousBlock: !!input.unambiguousBlock,
          historicalBugRedPreserved: !!input.historicalBugRedPreserved,
        });
        if (!decision.proceed) {
          print(1, { ok: false, operation, kind: "restricted", reason: decision.reason });
        }
        print(0, { ok: true, operation, runDir, decision });
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
