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
//   resumeReviewId optional review ID from a stopped publication to resume
// Exit codes: 0 published and validated on read-back; 1 publication stopped
// (partial or uncertain state, never blind-retried); 2 input or runtime
// failure.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
  const resumeReviewId =
    typeof input.resumeReviewId === "string" && input.resumeReviewId !== ""
      ? input.resumeReviewId
      : undefined;
  const handoff = input.handoff;
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
