// Bundled workflow-cli.mjs execution (ADR-0038).
//
// Every bundled command is executed from isolated skill copies without
// repository dependencies, including a foreign CommonJS project. Exit codes:
// 0 valid input and accepted contract; 1 contract rejection; 2 input or
// runtime failure. Results are JSON on stdout.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import {
  REQUIREMENTS_REVISION_VERSION,
  renderCompactEvidence,
  renderFixProgress,
  renderReviewHandoff,
  reviewHandoffDigestOfBody,
  type ReviewHandoffInput,
} from "../scripts/workflow-state.ts";
import {
  INCIDENT_LEGACY_PIN,
  incidentParentBody,
  incidentPullRequestBody,
  incidentTicketBody,
} from "./incident-fixtures.ts";

const require = createRequire(import.meta.url);

const sha256Hex = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");

function buildReviewHandoffBody(
  repository: string,
  prNumber: number,
  requirementsRevision: string,
  headSha = "48748370726634c9f85c2f758e8cd94ad9bf84d5",
  baseSha = "b1",
): string {
  const handoff: ReviewHandoffInput = {
    repository,
    prNumber,
    reviewedHeadSha: headSha,
    reviewedBaseSha: baseSha,
    closesTicket: 288,
    requirementsRevision,
    reviewPolicyRevision: "review-contract-v1:REVIEW.md\th1",
    verificationCommand: "node --test tests/review-handoff.test.ts",
    verificationResult: "review checks observed",
    verificationPassed: true,
    findings: [],
    provenance: {
      reviewId: "999",
      reviewAuthor: "reviewer",
      reviewedCommit: headSha,
      reviewedAt: "",
      sourceUrl: "",
      reviewerPermission: "write",
      commentIds: ["c1"],
    },
  };
  return renderReviewHandoff(handoff);
}

function copyBundled(targetDir: string): string {
  const bundle = path.join(targetDir, "bundle");
  fs.mkdirSync(bundle, { recursive: true });
  fs.copyFileSync(
    path.join(import.meta.dirname, "..", "scripts", "workflow-state.ts"),
    path.join(bundle, "workflow-state.ts"),
  );
  fs.copyFileSync(
    path.join(import.meta.dirname, "..", "scripts", "workflow-cli.mjs"),
    path.join(bundle, "workflow-cli.mjs"),
  );
  fs.writeFileSync(
    path.join(bundle, "package.json"),
    '{\n  "type": "module",\n  "private": true\n}\n',
  );
  return bundle;
}

function runCli(bundleDir: string, operation: string, input: unknown): { exit: number; stdout: unknown; stderr: string } {
  const result = spawnSync(
    process.execPath,
    [path.join(bundleDir, "workflow-cli.mjs"), operation, "-"],
    { input: JSON.stringify(input), encoding: "utf8" },
  );
  let stdout: unknown = null;
  try {
    stdout = JSON.parse(result.stdout ?? "");
  } catch {
    stdout = result.stdout ?? "";
  }
  return { exit: result.status ?? -1, stdout, stderr: result.stderr ?? "" };
}

describe("workflow-cli.mjs operations", () => {
  const bundle = copyBundled(fs.mkdtempSync(path.join(os.tmpdir(), "wfc-")));
  test("requirements accepts an adapted incident pair and reports coverage", () => {
    const result = runCli(bundle, "requirements", {
      parentBody: incidentParentBody(),
      ticketBody: incidentTicketBody(),
    });
    assert.equal(result.exit, 0);
    const out = result.stdout as { ok: boolean; version: string; revisionCarrier: string; coverage: { ticketActiveCriteria: string[] } };
    assert.equal(out.ok, true);
    assert.equal(out.version, "requirements-adapted-v1");
    assert.equal(out.coverage.ticketActiveCriteria.length, 9);
    assert.ok(out.revisionCarrier.startsWith("requirements-adapted-v1:"));
  });
  test("a pinned legacy-contract value is reported as a mismatch with unproven cause", () => {
    const result = runCli(bundle, "requirements", {
      parentBody: incidentParentBody(),
      ticketBody: incidentTicketBody(),
      pinnedRevision: INCIDENT_LEGACY_PIN,
    });
    assert.equal(result.exit, 1);
    const out = result.stdout as { kind: string; pinMatch: { classification?: string; equal: boolean } };
    assert.equal(out.kind, "contract-rejection");
    assert.equal(out.pinMatch.equal, false);
    assert.ok(String(out.pinMatch.classification ?? "").includes("unproven") || JSON.stringify(out).includes("unproven"));
  });
  test("unresolved bodies exit 1 without emitting a pin", () => {
    const result = runCli(bundle, "requirements", {
      parentBody: incidentParentBody(),
      ticketBody: "## What to build\n\nNo criteria.\n",
    });
    assert.equal(result.exit, 1);
    const out = result.stdout as { kind: string; revisionCarrier?: string };
    assert.equal(out.kind, "contract-rejection");
    assert.equal(out.revisionCarrier, undefined);
  });
  test("planning rejects alternate templates canonically but reports consumability", () => {
    const result = runCli(bundle, "planning", { role: "ticket", body: incidentTicketBody() });
    assert.equal(result.exit, 1);
    const out = result.stdout as { canonical: boolean; resolutionOk: boolean; criteria: unknown[] };
    assert.equal(out.canonical, false);
    assert.equal(out.resolutionOk, true);
    assert.equal(out.criteria.length, 9);
  });
  test("evidence validation exits 1 on a stale legacy pin and 0 on current evidence", () => {
    const parentBody = incidentParentBody();
    const ticketBody = incidentTicketBody();
    const stale = runCli(bundle, "evidence", {
      pullRequestBody: incidentPullRequestBody(),
      parentBody,
      ticketBody,
      headSha: "48748370726634c9f85c2f758e8cd94ad9bf84d5",
    });
    assert.equal(stale.exit, 1);
    assert.equal((stale.stdout as { status: string }).status, "stale");
    const requirements = runCli(bundle, "requirements", { parentBody, ticketBody });
    const carrier = (requirements.stdout as { revisionCarrier: string }).revisionCarrier;
    const ticketResolution = awaitImportTicketCriteria();
    const block = renderCompactEvidence({
      criteria: ticketResolution,
      evidence: ticketResolution.map((c) => ({
        criterionId: c.id,
        kind: "non-behavior" as const,
        rationale: `narrow check run for ${c.id}`,
      })),
      isBugFix: false,
      requirementsRevision: carrier,
      headSha: "48748370726634c9f85c2f758e8cd94ad9bf84d5",
    });
    const body = `Context\n\nCloses #288\n\n${block}`;
    const current = runCli(bundle, "evidence", {
      pullRequestBody: body,
      parentBody,
      ticketBody,
      headSha: "48748370726634c9f85c2f758e8cd94ad9bf84d5",
    });
    assert.equal(current.exit, 0);
    const out = current.stdout as { status: string; coverage: { missing: string[]; extra: string[]; duplicates: string[] } };
    assert.equal(out.status, "current");
    assert.deepEqual(out.coverage.missing, []);
    assert.deepEqual(out.coverage.extra, []);
    assert.deepEqual(out.coverage.duplicates, []);
  });
  test("unknown operations and malformed input exit 2", () => {
    assert.equal(runCli(bundle, "bogus", {}).exit, 2);
    assert.equal(runCli(bundle, "requirements", "not json").exit, 2);
    assert.equal(runCli(bundle, "requirements", { version: 9 }).exit, 2);
  });
  test("every operation rejects missing or wrong-type required input with exit 2 and JSON", () => {
    for (const [operation, missingInput] of [
      ["planning", {}],
      ["requirements", {}],
      ["evidence", {}],
      ["review", {}],
      ["fix-progress", {}],
    ] as const) {
      const result = runCli(bundle, operation, missingInput);
      assert.equal(result.exit, 2, `${operation} must not succeed on missing input`);
      const out = result.stdout as { ok: boolean; kind: string };
      assert.equal(out.ok, false, operation);
      assert.equal(out.kind, "input-failure", operation);
    }
    const wrongType = runCli(bundle, "review", {
      reviewBody: "body",
      repository: "o/r",
      prNumber: "300",
      headSha: "h1",
      baseSha: "b1",
      parentBody: "p",
      ticketBody: "t",
    });
    assert.equal(wrongType.exit, 2);
    assert.equal((wrongType.stdout as { kind: string }).kind, "input-failure");
    const missingProvenance = runCli(bundle, "review", {
      reviewBody: "body",
      repository: "o/r",
      prNumber: 300,
      headSha: "h1",
      baseSha: "b1",
      parentBody: "p",
      ticketBody: "t",
    });
    assert.equal(missingProvenance.exit, 2);
  });
  test("fix-progress with no checkpoint exits 0 and malformed markers exit 1", () => {
    const none = runCli(bundle, "fix-progress", { body: "no checkpoint", repository: "o/r", prNumber: 294 });
    assert.equal(none.exit, 0);
    assert.equal((none.stdout as { found: boolean }).found, false);
    const malformed = runCli(bundle, "fix-progress", {
      body: "<!-- ruralnative:fix-progress:start -->\nunclosed\n",
      repository: "o/r",
      prNumber: 294,
    });
    assert.equal(malformed.exit, 1);
  });
  test("evidence claims require recorded receipts and the observed project configuration", () => {
    const parentBody = incidentParentBody();
    const ticketBody = incidentTicketBody();
    const requirements = runCli(bundle, "requirements", { parentBody, ticketBody });
    const carrier = (requirements.stdout as { revisionCarrier: string }).revisionCarrier;
    const ticketResolution = awaitImportTicketCriteria();
    const block = renderCompactEvidence({
      criteria: ticketResolution,
      evidence: ticketResolution.map((c) => ({
        criterionId: c.id,
        kind: "behavior" as const,
        focusedCommand: `node --test ${c.id}`,
        result: "1 passed",
        passed: true,
      })),
      isBugFix: false,
      requirementsRevision: carrier,
      headSha: "48748370726634c9f85c2f758e8cd94ad9bf84d5",
    });
    const body = `Context\n\nCloses #288\n\n${block}`;
    const base = {
      pullRequestBody: body,
      parentBody,
      ticketBody,
      headSha: "48748370726634c9f85c2f758e8cd94ad9bf84d5",
    };
    const withoutReceipts = runCli(bundle, "evidence", base);
    assert.equal(withoutReceipts.exit, 1);
    const out = withoutReceipts.stdout as { kind: string; verification?: { passClaims: string[] } };
    assert.equal(out.kind, "contract-rejection");
    assert.ok((out.verification?.passClaims ?? []).length === 9);
    const unconfigured = runCli(bundle, "evidence", {
      ...base,
      configuredCommands: [],
      executionReceipts: ticketResolution.map((c) => ({
        command: `node --test ${c.id}`,
        output: "1 passed",
        exitStatus: 0,
      })),
    });
    assert.equal(unconfigured.exit, 1);
    const backed = runCli(bundle, "evidence", {
      ...base,
      configuredCommands: ticketResolution.map((c) => `node --test ${c.id}`),
      executionReceipts: ticketResolution.map((c) => ({
        command: `node --test ${c.id}`,
        output: "1 passed",
        exitStatus: 0,
      })),
    });
    assert.equal(backed.exit, 0);
    const failedExit = runCli(bundle, "evidence", {
      ...base,
      configuredCommands: ticketResolution.map((c) => `node --test ${c.id}`),
      executionReceipts: ticketResolution.map((c) => ({
        command: `node --test ${c.id}`,
        output: "boom",
        exitStatus: 1,
      })),
    });
    assert.equal(failedExit.exit, 1);
  });
  test("review claims without recorded receipts exit 1 on an otherwise current handoff", () => {
    const parentBody = incidentParentBody();
    const ticketBody = incidentTicketBody();
    const carrier = (runCli(bundle, "requirements", { parentBody, ticketBody }).stdout as { revisionCarrier: string }).revisionCarrier;
    const reviewBody = buildReviewHandoffBody("o/r", 294, carrier);
    const base = {
      reviewBody,
      repository: "o/r",
      prNumber: 294,
      headSha: "48748370726634c9f85c2f758e8cd94ad9bf84d5",
      baseSha: "b1",
      parentBody,
      ticketBody,
      policySources: [{ path: "REVIEW.md", hash: "h1" }],
      observedProvenance: {
        reviewId: "999",
        reviewAuthor: "reviewer",
        reviewerPermission: "write",
        reviewedCommit: "48748370726634c9f85c2f758e8cd94ad9bf84d5",
        sourceUrl: "https://github.com/o/r/pull/294#pullrequestreview-999",
        commentIds: ["c1"],
      },
      reviewCompleted: true,
      reviewDismissed: false,
    };
    const review = runCli(bundle, "review", base);
    assert.equal(review.exit, 1);
    const out = review.stdout as { kind: string; reason: string; verification?: { passClaims: string[] } };
    assert.equal(out.kind, "contract-rejection");
    assert.deepEqual(out.verification?.passClaims, ["node --test tests/review-handoff.test.ts"]);
    const backed = runCli(bundle, "review", {
      ...base,
      configuredCommands: ["node --test tests/review-handoff.test.ts"],
      executionReceipts: [
        { command: "node --test tests/review-handoff.test.ts", output: "review checks observed", exitStatus: 0 },
      ],
    });
    assert.equal(backed.exit, 0);
  });
  test("fix-progress reconciliation recomputes the source digest and stops on mismatch", () => {
    const parentBody = incidentParentBody();
    const ticketBody = incidentTicketBody();
    const carrier = (runCli(bundle, "requirements", { parentBody, ticketBody }).stdout as { revisionCarrier: string }).revisionCarrier;
    const reviewBody = buildReviewHandoffBody("o/r", 294, carrier, "h1", "b1");
    const sourceDigest = reviewHandoffDigestOfBody(reviewBody, sha256Hex);
    assert.equal(sourceDigest.ok, true);
    const checkpoint = renderFixProgress({
      repository: "o/r",
      prNumber: 294,
      sourceReviewId: "999",
      sourceHandoffDigest: sourceDigest.ok ? sourceDigest.digest : "",
      ticket: 288,
      parent: 287,
      startedHeadSha: "h1",
      startedBaseSha: "b1",
      resultingHeadSha: "h2",
      resultingBaseSha: "b1",
      dispositions: [],
      verificationReceipts: [],
      intendedRemoteOperation: "push",
      completedSteps: ["fixes", "evidence"],
      mergeReceipt: null,
    });
    const reconciled = runCli(bundle, "fix-progress", {
      body: checkpoint,
      repository: "o/r",
      prNumber: 294,
      sourceHandoffBody: reviewBody,
    });
    assert.equal(reconciled.exit, 0);
    const okOut = reconciled.stdout as { reconciliation: { digestMatches: boolean; startedHeadMatchesReview: boolean; dispositionsCoverSource: boolean } };
    assert.equal(okOut.reconciliation.digestMatches, true);
    assert.equal(okOut.reconciliation.startedHeadMatchesReview, true);
    assert.equal(okOut.reconciliation.dispositionsCoverSource, true);
    const forged = runCli(bundle, "fix-progress", {
      body: checkpoint.replace(sourceDigest.ok ? sourceDigest.digest : "x".repeat(64), "f".repeat(64)),
      repository: "o/r",
      prNumber: 294,
      sourceHandoffBody: reviewBody,
    });
    assert.equal(forged.exit, 1);
    const forgedOut = forged.stdout as { kind: string; reconciliation: { digestMatches: boolean } };
    assert.equal(forgedOut.kind, "contract-rejection");
    assert.equal(forgedOut.reconciliation.digestMatches, false);
    const withoutSource = runCli(bundle, "fix-progress", {
      body: checkpoint,
      repository: "o/r",
      prNumber: 294,
    });
    assert.equal(withoutSource.exit, 2);
  });
  test("runs inside a foreign CommonJS project without repository dependencies", () => {
    const cjs = fs.mkdtempSync(path.join(os.tmpdir(), "wfc-cjs-"));
    fs.writeFileSync(path.join(cjs, "package.json"), JSON.stringify({ name: "foreign", type: "commonjs" }));
    const bundle = copyBundled(cjs);
    const entries = fs.readdirSync(bundle).sort();
    assert.deepEqual(entries, ["package.json", "workflow-cli.mjs", "workflow-state.ts"]);
    const result = runCli(bundle, "requirements", {
      parentBody: incidentParentBody(),
      ticketBody: incidentTicketBody(),
    });
    assert.equal(result.exit, 0);
    assert.equal(
      (result.stdout as { coverage: { ticketActiveCriteria: string[] } }).coverage.ticketActiveCriteria.length,
      9,
    );
    assert.equal(fs.existsSync(path.join(cjs, "node_modules")), false, "no repository dependencies may be required");
  });
});

function awaitImportTicketCriteria(): { id: string; text: string; status: "active" }[] {
  // Resolved via the authored core directly; the CLI reports the same counts.
  return incidentTicketBody()
    .split("\n")
    .filter((line) => /^- \[ \] `?AC-\d+`?:/.test(line))
    .map((line) => {
      const id = line.match(/AC-\d+/)?.[0] ?? "";
      return { id, text: line.slice(line.indexOf(":") + 1).trim(), status: "active" };
    });
}
