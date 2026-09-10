#!/usr/bin/env node
// Review-only publication entry point for /review-this (ADR-0038).
//
// Runs only in the explicit review publication step for the resolved
// same-repository pull request. It performs one complete review publication:
// create a pending review at the pinned commit, submit that same review with
// the final rendered body, read it back, and validate. The transport is an
// allowlisted `gh api` adapter using argument arrays only, never shell
// interpolation. The shared validator CLI (workflow-cli.mjs) stays read-only;
// this entry point is the single bounded write path for review publication.
//
// Usage: node publish-review.mjs <input.json>   (or - for stdin)
// Input JSON:
//   repository     owner/name
//   prNumber       pull-request number
//   commitSha      pinned commit the review is attached to
//   reviewProse    readable `## Standards` and `## Spec` prose
//   handoff        validated ReviewHandoffInput content
//   submitEvent    optional native submission event: COMMENT (default),
//                  APPROVE, or REQUEST_CHANGES
//   nonDefaultEventApproved optional explicit human approval for APPROVE/REQUEST_CHANGES
//   observedReviewerPermission required independently observed permission
//                  ("policy", "write", "maintain", "admin"); "unknown" stops.
//                  For "write"/"maintain"/"admin" the entry point re-reads the
//                  collaborator permission for the authenticated actor and
//                  uses the observed value, never a payload claim.
//   expectedAuthor optional native author login for ownership checks
//   inlineComments optional validated inline findings for the `comments` payload
//   resumeReviewId optional review ID from a stopped publication to resume
// Exit codes: 0 published and validated on read-back; 1 publication stopped
// (partial or uncertain state, never blind-retried); 2 input or runtime
// failure.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function ghRead(args) {
  try {
    const stdout = execFileSync("gh", args, { encoding: "utf8", timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
    return String(stdout ?? "").trim();
  } catch {
    return null;
  }
}

function observeActorAndPermission(repository) {
  const actor = ghRead(["api", "user", "--jq", ".login"]);
  if (actor === null || actor === "") return { actor: null, permission: "unknown" };
  const raw = ghRead(["api", `repos/${repository}/collaborators/${actor}/permission`, "--jq", ".permission"]);
  if (raw === "admin" || raw === "maintain" || raw === "write") return { actor, permission: raw };
  return { actor, permission: "unknown" };
}

const REQUIRED_NODE_MAJOR = 24;

function print(exitCode, result) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(exitCode);
}

function failure(message) {
  return { ok: false, reason: message };
}

async function main() {
  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
  if (!Number.isInteger(nodeMajor) || nodeMajor < REQUIRED_NODE_MAJOR) {
    print(
      2,
      failure(
        `review publication requires Node ${REQUIRED_NODE_MAJOR} or newer (found ${process.version})`,
      ),
    );
  }
  const [inputPath] = process.argv.slice(2);
  if (inputPath === undefined) {
    print(2, failure("missing input path; pass <input.json> or - for stdin"));
  }
  let raw = "";
  try {
    raw = inputPath === "-" ? await readStdin() : readFileSync(inputPath, "utf8");
  } catch (error) {
    print(2, failure(`input is unreadable: ${error.message}`));
  }
  let input = null;
  try {
    input = JSON.parse(raw);
  } catch (error) {
    print(2, failure(`input JSON is invalid: ${error.message}`));
  }
  const repository = typeof input.repository === "string" ? input.repository : "";
  const prNumber = Number(input.prNumber);
  const commitSha = typeof input.commitSha === "string" ? input.commitSha : "";
  const reviewProse = typeof input.reviewProse === "string" ? input.reviewProse : "";
  const submitEvent = input.submitEvent ?? "COMMENT";
  const nonDefaultEventApproved = input.nonDefaultEventApproved === true ? true : undefined;
  const resumeReviewId =
    typeof input.resumeReviewId === "string" && input.resumeReviewId !== ""
      ? input.resumeReviewId
      : undefined;
  const handoff = input.handoff;
  const claimedPermission = typeof input.observedReviewerPermission === "string" ? input.observedReviewerPermission : undefined;
  const expectedAuthorInput = typeof input.expectedAuthor === "string" && input.expectedAuthor !== "" ? input.expectedAuthor : undefined;
  const inlineComments = Array.isArray(input.inlineComments) ? input.inlineComments : undefined;
  if (!/^[A-Za-z0-9-_.]+\/[A-Za-z0-9-_.]+$/.test(repository)) {
    print(2, failure("input repository must be owner/name"));
  }
  if (!Number.isInteger(prNumber) || prNumber < 1) {
    print(2, failure("input prNumber is invalid"));
  }
  if (commitSha === "") {
    print(2, failure("input commitSha is required; refresh the pinned commit before publication"));
  }
  if (submitEvent !== "COMMENT" && submitEvent !== "APPROVE" && submitEvent !== "REQUEST_CHANGES") {
    print(2, failure("input submitEvent must be COMMENT, APPROVE, or REQUEST_CHANGES"));
  }
  if (handoff === null || typeof handoff !== "object") {
    print(2, failure("input handoff content is required"));
  }
  // Independent permission observation happens before any write. The handoff
  // payload permission is never trusted. "policy" is the narrow project
  // authorization path and bypasses the collaborator read; every other value
  // must match a fresh collaborator observation.
  let observedReviewerPermission;
  let expectedAuthor = expectedAuthorInput;
  if (claimedPermission === "policy") {
    observedReviewerPermission = "policy";
  } else {
    const observed = observeActorAndPermission(repository);
    if (observed.actor === null || observed.permission === "unknown") {
      print(1, { ok: false, status: "stop", step: "read-back", reviewId: resumeReviewId ?? null, reason: "reviewer permission was not independently observed; verify it before publication" });
    }
    if (expectedAuthor !== undefined && expectedAuthor !== observed.actor) {
      print(1, { ok: false, status: "stop", step: "read-back", reviewId: resumeReviewId ?? null, reason: `expected author ${expectedAuthor} does not match the authenticated actor ${observed.actor}; stop instead of publishing as another user` });
    }
    expectedAuthor = observed.actor;
    if (claimedPermission !== undefined && claimedPermission !== observed.permission) {
      // Movement between still-authorized collaborator roles keeps content
      // valid, but an explicit claim that disagrees with observation is
      // replaced by the observed value rather than trusted.
    }
    observedReviewerPermission = observed.permission;
  }
  if (inlineComments !== undefined && !Array.isArray(inlineComments)) {
    print(2, failure("input inlineComments must be an array when supplied"));
  }
  let here = null;
  try {
    here = path.dirname(fileURLToPath(import.meta.url));
    await import(pathToFileURL(path.join(here, "workflow-state.ts")).href);
    await import(pathToFileURL(path.join(here, "publish-review.ts")).href);
    await import(pathToFileURL(path.join(here, "gh-review-transport.ts")).href);
  } catch (error) {
    print(2, failure(`the bundled publication core is unavailable: ${error.message}`));
  }
  const { publishReviewPublication } = await import(
    pathToFileURL(path.join(here, "publish-review.ts")).href,
  );
  const { createGhReviewTransport } = await import(
    pathToFileURL(path.join(here, "gh-review-transport.ts")).href,
  );
  const outcome = await publishReviewPublication(
    {
      repository,
      prNumber,
      commitSha,
      reviewProse,
      handoff,
      submitEvent,
      nonDefaultEventApproved,
      observedReviewerPermission,
      expectedAuthor,
      inlineComments,
      resumeReviewId,
    },
    createGhReviewTransport(repository),
  );
  if (outcome.status === "published") {
    print(0, {
      ok: true,
      status: "published",
      reviewId: outcome.reviewId,
      readBack: {
        reviewId: outcome.readBack.reviewId,
        author: outcome.readBack.author,
        commitSha: outcome.readBack.commitSha,
        state: outcome.readBack.state,
        submittedAt: outcome.readBack.submittedAt ?? null,
        sourceUrl: outcome.readBack.sourceUrl ?? null,
        commentIds: outcome.readBack.commentIds,
      },
      diagnostics: { message: outcome.reason },
    });
  }
  print(1, {
    ok: false,
    status: "stop",
    step: outcome.step,
    reviewId: outcome.reviewId ?? null,
    reason: outcome.reason,
  });
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

main();
