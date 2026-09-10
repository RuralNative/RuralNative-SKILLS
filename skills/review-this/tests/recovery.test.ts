// Automatic recovery for Review This (PR #295 incidents).
//
// Sanitized fixtures model a valid nine-criterion evidence block whose
// adapted pin differs under the same version (unchanged head, currently
// resolvable parent/ticket bodies), plus missing REVIEW.md, proposed changes
// to three governing sources, and three scoped owner exceptions. Tests assert
// the complete path through preparation, review readiness, publication, and
// read-back. They fail on today's manual-stop behavior (stale evidence stops,
// conflicting policy stops), not merely on new strings or caller-supplied
// ready flags.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  classifyRequirementsPin,
  countEvidenceBlocks,
  decideRepairRevalidation,
  decideReviewEvidenceRecovery,
  parseEvidenceHandoff,
  renderCompactEvidence,
  renderEvidenceRepairRecord,
  parseEvidenceRepairRecord,
  evidenceRepairReusable,
  replaceSingleEvidenceBlock,
  evidencePinPresence,
  readEvidenceRed,
  extractEvidenceBehaviorClaims,
  extractDeclaredBehaviorCriteria,
  insertEvidenceRepairRecord,
  locateEvidenceRepairRecord,
  requirementsRevision,
  requirementsRevisionValue,
  resolveRequirementsBody,
  validateEvidenceHandoff,
  reviewPolicyRevision,
  policyRevisionWellFormed,
  renderReviewHandoff,
  validateReviewHandoff,
  verifyOwnerDecision,
  classifyPolicyChange,
  buildPolicyBlockingFindings,
  type ReviewHandoffInput,
} from "../workflow-state.ts";
import { isReviewReady } from "../discovery.ts";
import {
  reviewPolicyDecision,
  resolveReviewPolicySources,
  applyVerifiedApproval,
} from "../review-policy.ts";
import {
  decidePrepareRetry,
  selectCompatibleRuntime,
  deriveInstallBoundary,
  isAllowedSetupCommand,
  decideCleanlinessAfterSetup,
  planEvidenceRecovery,
  decidePublicationResume,
  isEstablishedRepairCommand,
  summarizeExecutionReceipt,
} from "../prepare-review.ts";
import { publishReviewPublication } from "../publish-review.ts";
import { fakeReviewPublicationHost } from "./fakes.ts";
import {
  INCIDENT_295_BASE_SHA,
  INCIDENT_295_DECISION_BODY,
  INCIDENT_295_DECISION_COMMENT_ID,
  INCIDENT_295_EXCEPTION_SCOPE,
  INCIDENT_295_HEAD_SHA,
  INCIDENT_295_PR_NUMBER,
  incident295BaseSources,
  incident295HeadSources,
  incidentParentBody,
  incidentTicketBody,
} from "../../../tests/incident-fixtures.ts";

const sha256 = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");

function currentPin(): string {
  const rev = requirementsRevision(incidentParentBody(), incidentTicketBody(), sha256);
  return requirementsRevisionValue(rev);
}

function staleSameVersionPin(current: string): string {
  // Same version, different hashes: flip the last hex digit of each half.
  const m = current.match(/^(requirements-adapted-v1:parent=)([a-f0-9]{64})(;ticket=)([a-f0-9]{64})$/);
  assert.ok(m, "current pin must be adapted");
  const flip = (h: string): string => h.slice(0, -1) + (h.endsWith("0") ? "1" : "0");
  return `${m[1]}${flip(m[2])}${m[3]}${flip(m[4])}`;
}

function renderStaleBlock(stalePin: string): string {
  const ticket = resolveRequirementsBody(incidentTicketBody(), "ticket");
  assert.equal(ticket.ok, true);
  // All nine criteria behavior with focused commands; receipts are supplied
  // separately to workflow-cli.mjs evidence in real runs.
  const block = renderCompactEvidence({
    criteria: ticket.criteria,
    evidence: ticket.criteria.map((c) => ({
      criterionId: c.id,
      kind: "behavior" as const,
      focusedCommand: `node scripts/docs-check.mjs --criterion ${c.id}`,
      result: `focused checks passed for ${c.id}`,
      passed: true,
    })),
    isBugFix: false,
    requirementsRevision: stalePin,
    headSha: INCIDENT_295_HEAD_SHA,
  });
  return `P1 — governed reconstruction.\n\n${block}\n\nCloses #288\n`;
}

describe("same-version stale pin recovery (review preparation only)", () => {
  test("old repair gate rejects the same-version mismatch even with scope and proof", () => {
    const current = currentPin();
    const stale = staleSameVersionPin(current);
    const classification = classifyRequirementsPin(stale, current);
    assert.equal(classification.classification, "revision-mismatch");
    // Existing implementation/finalization helper must stay narrow.
    assert.equal(
      decideRepairRevalidation({ classification: classification.classification, currentScopeResolved: true, proofRevalidated: true }).proceed,
      false,
    );
  });

  test("review-specific recovery permits the same stale pin after full revalidation", () => {
    const current = currentPin();
    const stale = staleSameVersionPin(current);
    const classification = classifyRequirementsPin(stale, current);
    const parent = resolveRequirementsBody(incidentParentBody(), "parent");
    const ticket = resolveRequirementsBody(incidentTicketBody(), "ticket");
    assert.equal(parent.ok && ticket.ok, true);
    const decision = decideReviewEvidenceRecovery({
      classification: classification.classification,
      currentScopeResolved: parent.ok && ticket.ok,
      proofRevalidated: true,
      unambiguousBlock: true,
      historicalBugRedPreserved: true,
    });
    assert.equal(decision.proceed, true);
    // Honest diagnostics: unknown historical cause is never called a proven edit.
    assert.match(classification.reason, /never proves a body change|unproven/i);
  });

  test("stale evidence stops readiness today; repaired evidence validates current and becomes ready", () => {
    const current = currentPin();
    const stale = staleSameVersionPin(current);
    const staleBody = renderStaleBlock(stale);
    assert.equal(countEvidenceBlocks(staleBody), 1);
    const staleCheck = validateEvidenceHandoff({
      body: staleBody,
      currentRequirementsRevision: current,
      currentHeadSha: INCIDENT_295_HEAD_SHA,
    });
    assert.equal(staleCheck.status, "stale");
    // Manual-stop behavior: readiness requires validated current evidence.
    const stopped = isReviewReady({
      pullRequest: {
        ticket: 288,
        prNumber: INCIDENT_295_PR_NUMBER,
        headSha: INCIDENT_295_HEAD_SHA,
        baseSha: INCIDENT_295_BASE_SHA,
        state: "open",
        mergeable: true,
        requiredChecksGreen: false,
        closesTicket: 288,
        hasEvidence: true,
        requirementsRevision: stale,
      },
      requirementsCurrent: false,
      evidenceStatus: staleCheck.status,
    });
    assert.equal(stopped.ready, false);

    // Recovery: render a candidate block with the bundled helpers and require
    // the consumer validator to accept it (criterion coverage + head binding).
    const ticket = resolveRequirementsBody(incidentTicketBody(), "ticket");
    assert.equal(ticket.ok, true);
    const candidate = renderCompactEvidence({
      criteria: ticket.ok ? ticket.criteria : [],
      evidence: (ticket.ok ? ticket.criteria : []).map((c) => ({
        criterionId: c.id,
        kind: "behavior" as const,
        focusedCommand: `node scripts/docs-check.mjs --criterion ${c.id}`,
        result: `focused checks passed for ${c.id}`,
        passed: true,
      })),
      isBugFix: false,
      requirementsRevision: current,
      headSha: INCIDENT_295_HEAD_SHA,
    });
    const replaced = replaceSingleEvidenceBlock(staleBody, candidate);
    assert.equal(replaced.ok, true);
    if (!replaced.ok) return;
    // Preserve everything outside the single region byte-for-byte.
    assert.ok(replaced.body.includes("P1 — governed reconstruction."));
    assert.ok(replaced.body.includes("Closes #288"));
    assert.equal(countEvidenceBlocks(replaced.body), 1);
    const parsed = parseEvidenceHandoff(replaced.body);
    assert.equal(parsed.requirementsRevision, current);
    const check = validateEvidenceHandoff({
      body: replaced.body,
      currentRequirementsRevision: current,
      currentHeadSha: INCIDENT_295_HEAD_SHA,
    });
    assert.equal(check.status, "current");
    const ready = isReviewReady({
      pullRequest: {
        ticket: 288,
        prNumber: INCIDENT_295_PR_NUMBER,
        headSha: INCIDENT_295_HEAD_SHA,
        baseSha: INCIDENT_295_BASE_SHA,
        state: "open",
        mergeable: true,
        requiredChecksGreen: false,
        closesTicket: 288,
        hasEvidence: true,
        requirementsRevision: current,
      },
      requirementsCurrent: true,
      evidenceStatus: check.status,
    });
    assert.equal(ready.ready, true);
  });

  test("ambiguous blocks, unknown versions, and conflicting associations never repair", () => {
    const current = currentPin();
    const stale = staleSameVersionPin(current);
    const staleBody = renderStaleBlock(stale);
    const doubled = `${staleBody}\n\n${staleBody}`;
    assert.equal(replaceSingleEvidenceBlock(doubled, staleBody).ok, false);
    const badVersion = staleBody.replace("evidence-v2", "evidence-v9");
    assert.equal(replaceSingleEvidenceBlock(badVersion, staleBody).ok, false);
    const conflicted = `${staleBody}\nCloses #999\n`;
    assert.equal(replaceSingleEvidenceBlock(conflicted, staleBody).ok, false);
    // Failed recovery never returns current merely to start review.
    const malformedDecision = decideReviewEvidenceRecovery({
      classification: "revision-mismatch",
      currentScopeResolved: true,
      proofRevalidated: true,
      unambiguousBlock: false,
      historicalBugRedPreserved: true,
    });
    assert.equal(malformedDecision.proceed, false);
  });

  test("repair records retain old pin, new pin, reason, revisions, and provenance; identical reuse only", () => {
    const current = currentPin();
    const stale = staleSameVersionPin(current);
    const record = {
      repository: "owner/eScraper-Business-Brokers-for-Seacher-Insights",
      prNumber: INCIDENT_295_PR_NUMBER,
      oldRequirementsRevision: stale,
      newRequirementsRevision: current,
      oldHeadSha: INCIDENT_295_HEAD_SHA,
      newHeadSha: INCIDENT_295_HEAD_SHA,
      baseSha: INCIDENT_295_BASE_SHA,
      reason: "same-version stale pin with revalidated current scope and proof",
      verificationProvenance: "node scripts/docs-check.mjs --criterion AC-1..AC-9 exit 0",
    };
    const rendered = renderEvidenceRepairRecord(record);
    const parsed = parseEvidenceRepairRecord(rendered);
    assert.equal(parsed.found, true);
    assert.ok(parsed.record);
    assert.equal(evidenceRepairReusable(parsed.record!, record), true);
    assert.equal(evidenceRepairReusable(parsed.record!, { ...record, newHeadSha: "deadbeef".repeat(5).slice(0, 40) }), false);
  });
});

describe("source-backed policy resolution with verified owner approval", () => {
  const base = incident295BaseSources();
  const head = incident295HeadSources();

  test("old single-flag helper stops on conflict (manual-stop behavior)", () => {
    const stopped = reviewPolicyDecision({
      policyExists: true,
      policyReadable: true,
      isSymlink: false,
      conflictingSources: true,
      targetValid: true,
      checkoutMatches: true,
      worktreeClean: true,
    });
    assert.equal(stopped.action, "stop");
  });

  test("head-only governing changes are reviewable violations under base rules, not silent defaults", () => {
    const outcome = resolveReviewPolicySources({
      baseSources: base,
      headSources: head,
      baseReadable: true,
      headReadable: true,
      baseIsSymlink: false,
      headIsSymlink: false,
      gitObjectFallbackReadable: false,
      baseContradictory: false,
      baseAmbiguous: false,
      targetValid: true,
      checkoutMatches: true,
      worktreeClean: true,
    });
    assert.equal(outcome.action, "reviewable-with-blockers");
    if (outcome.action !== "reviewable-with-blockers") return;
    // Missing REVIEW.md at base continues under defaults for the base itself,
    // but the three head additions stay blocking until approved.
    assert.equal(outcome.blockingDrafts.length, 3);
    assert.equal(outcome.governingSources.length, 0);
  });

  test("matching verified owner decision supplies only its named exceptions", () => {
    const outcome = resolveReviewPolicySources({
      baseSources: base,
      headSources: head,
      baseReadable: true,
      headReadable: true,
      baseIsSymlink: false,
      headIsSymlink: false,
      gitObjectFallbackReadable: false,
      baseContradictory: false,
      baseAmbiguous: false,
      targetValid: true,
      checkoutMatches: true,
      worktreeClean: true,
    });
    assert.equal(outcome.action, "reviewable-with-blockers");
    const bodyHash = sha256(INCIDENT_295_DECISION_BODY);
    const current = currentPin();
    const verified = verifyOwnerDecision(
      {
        repository: "owner/eScraper-Business-Brokers-for-Seacher-Insights",
        prNumber: INCIDENT_295_PR_NUMBER,
        commentId: INCIDENT_295_DECISION_COMMENT_ID,
        authorLogin: "owner",
        authorIsOwnerOrAdmin: true,
        authorDelegatedByBasePolicy: false,
        decisionBody: INCIDENT_295_DECISION_BODY,
        decisionBodyHash: bodyHash,
        referencedHeadSha: INCIDENT_295_HEAD_SHA,
        referencedBaseSha: INCIDENT_295_BASE_SHA,
        referencedRequirementsRevision: current,
        exceptionScope: INCIDENT_295_EXCEPTION_SCOPE,
        revoked: false,
        superseded: false,
        unrelated: false,
      },
      {
        repository: "owner/eScraper-Business-Brokers-for-Seacher-Insights",
        prNumber: INCIDENT_295_PR_NUMBER,
        headSha: INCIDENT_295_HEAD_SHA,
        baseSha: INCIDENT_295_BASE_SHA,
        requirementsRevision: current,
      },
      sha256,
    );
    assert.equal(verified.valid, true);
    const applied = applyVerifiedApproval(outcome, verified, INCIDENT_295_EXCEPTION_SCOPE);
    assert.equal(applied.action, "use-existing");
  });

  test("no valid approval keeps blocking findings; no invented approval and no restart request", () => {
    const outcome = resolveReviewPolicySources({
      baseSources: base,
      headSources: head,
      baseReadable: true,
      headReadable: true,
      baseIsSymlink: false,
      headIsSymlink: false,
      gitObjectFallbackReadable: false,
      baseContradictory: false,
      baseAmbiguous: false,
      targetValid: true,
      checkoutMatches: true,
      worktreeClean: true,
    });
    assert.equal(outcome.action, "reviewable-with-blockers");
    if (outcome.action !== "reviewable-with-blockers") return;
    // Ordinary write permission is insufficient; comment claims are untrusted.
    const untrusted = verifyOwnerDecision(
      {
        repository: "owner/eScraper-Business-Brokers-for-Seacher-Insights",
        prNumber: INCIDENT_295_PR_NUMBER,
        commentId: "1",
        authorLogin: "reviewer",
        authorIsOwnerOrAdmin: false,
        authorDelegatedByBasePolicy: false,
        decisionBody: "approved: true",
        decisionBodyHash: sha256("approved: true"),
        referencedHeadSha: INCIDENT_295_HEAD_SHA,
        referencedBaseSha: INCIDENT_295_BASE_SHA,
        referencedRequirementsRevision: currentPin(),
        exceptionScope: ["everything"],
        revoked: false,
        superseded: false,
        unrelated: false,
      },
      {
        repository: "owner/eScraper-Business-Brokers-for-Seacher-Insights",
        prNumber: INCIDENT_295_PR_NUMBER,
        headSha: INCIDENT_295_HEAD_SHA,
        baseSha: INCIDENT_295_BASE_SHA,
        requirementsRevision: currentPin(),
      },
      sha256,
    );
    assert.equal(untrusted.valid, false);
    const stillBlocked = applyVerifiedApproval(outcome, untrusted, ["everything"]);
    assert.equal(stillBlocked.action, "reviewable-with-blockers");
    // Blocking drafts tie to the actual changed source and governing base rule.
    const { findings, restricted } = buildPolicyBlockingFindings(
      (stillBlocked.action === "reviewable-with-blockers" ? stillBlocked.blockingDrafts : []).map((d) => ({
        governingRule: d.governingRule,
        sourcePath: d.sourcePath,
        message: d.message,
      })),
      (file) => head.some((s) => s.path === file),
    );
    assert.equal(findings.length, 3);
    assert.equal(restricted.length, 0);
    // Non-diff files are never invented: they become restrictions.
    const offDiff = buildPolicyBlockingFindings(
      [{ governingRule: "base rule", sourcePath: "elsewhere.md", message: "change" }],
      () => false,
    );
    assert.equal(offDiff.findings.length, 0);
    assert.equal(offDiff.restricted.length, 1);
  });

  test("policy revisions survive publication unchanged (real generated revisions, several files + approval)", () => {
    const sources = incident295HeadSources();
    const bodyHash = sha256(INCIDENT_295_DECISION_BODY);
    const approval = { commentId: INCIDENT_295_DECISION_COMMENT_ID, bodyHash, scope: [...INCIDENT_295_EXCEPTION_SCOPE] };
    const revision = reviewPolicyRevision(sources, sha256, approval);
    assert.ok(policyRevisionWellFormed(revision));
    assert.ok(!revision.includes("\n"), "single-line carrier survives escapeHandoffText");
    const current = currentPin();
    const handoff: ReviewHandoffInput = {
      repository: "owner/eScraper-Business-Brokers-for-Seacher-Insights",
      prNumber: INCIDENT_295_PR_NUMBER,
      reviewedHeadSha: INCIDENT_295_HEAD_SHA,
      reviewedBaseSha: INCIDENT_295_BASE_SHA,
      closesTicket: 288,
      requirementsRevision: current,
      reviewPolicyRevision: revision,
      verificationCommand: "node scripts/docs-check.mjs",
      verificationResult: "focused checks passed",
      verificationPassed: true,
      findings: [],
      provenance: {
        reviewId: "r1",
        reviewAuthor: "reviewer",
        reviewedCommit: INCIDENT_295_HEAD_SHA,
        reviewedAt: "2026-09-09T09:00:00Z",
        sourceUrl: "https://github.com/owner/eScraper-Business-Brokers-for-Seacher-Insights/pull/295#review-r1",
        reviewerPermission: "write",
        commentIds: [],
      },
    };
    const body = `## Standards\n\nok\n\n## Spec\n\nok\n\n${renderReviewHandoff(handoff)}\n`;
    const result = validateReviewHandoff({
      body,
      repository: "owner/eScraper-Business-Brokers-for-Seacher-Insights",
      prNumber: INCIDENT_295_PR_NUMBER,
      currentHeadSha: INCIDENT_295_HEAD_SHA,
      currentBaseSha: INCIDENT_295_BASE_SHA,
      currentRequirementsRevision: current,
      currentReviewPolicyRevision: revision,
      observedProvenance: {
        reviewId: "r1",
        reviewAuthor: "reviewer",
        reviewerPermission: "write",
        reviewedCommit: INCIDENT_295_HEAD_SHA,
        reviewedAt: "2026-09-09T09:00:00Z",
        sourceUrl: "https://github.com/owner/eScraper-Business-Brokers-for-Seacher-Insights/pull/295#review-r1",
        commentIds: [],
      },
      reviewCompleted: true,
      reviewDismissed: false,
    });
    assert.equal(result.status, "current");
    // Same revision recomputes for fix-this consumption.
    const recomputed = reviewPolicyRevision(sources, sha256, approval);
    assert.equal(recomputed, revision);
  });
});

describe("combined incidents resolve independently without losing verified work", () => {
  test("evidence repair and policy approval compose; review publishes once with read-back", async () => {
    const current = currentPin();
    const stale = staleSameVersionPin(current);
    const staleBody = renderStaleBlock(stale);
    // Both old gates stop.
    assert.equal(validateEvidenceHandoff({ body: staleBody, currentRequirementsRevision: current, currentHeadSha: INCIDENT_295_HEAD_SHA }).status, "stale");
    assert.equal(
      reviewPolicyDecision({
        policyExists: true,
        policyReadable: true,
        isSymlink: false,
        conflictingSources: true,
        targetValid: true,
        checkoutMatches: true,
        worktreeClean: true,
      }).action,
      "stop",
    );
    // New path: repair evidence, verify approval, publish once.
    const ticket = resolveRequirementsBody(incidentTicketBody(), "ticket");
    assert.equal(ticket.ok, true);
    const candidate = renderCompactEvidence({
      criteria: ticket.ok ? ticket.criteria : [],
      evidence: (ticket.ok ? ticket.criteria : []).map((c) => ({
        criterionId: c.id,
        kind: "behavior" as const,
        focusedCommand: `node scripts/docs-check.mjs --criterion ${c.id}`,
        result: `focused checks passed for ${c.id}`,
        passed: true,
      })),
      isBugFix: false,
      requirementsRevision: current,
      headSha: INCIDENT_295_HEAD_SHA,
    });
    const replaced = replaceSingleEvidenceBlock(staleBody, candidate);
    assert.equal(replaced.ok, true);
    if (!replaced.ok) return;
    assert.equal(validateEvidenceHandoff({ body: replaced.body, currentRequirementsRevision: current, currentHeadSha: INCIDENT_295_HEAD_SHA }).status, "current");

    const policyOutcome = resolveReviewPolicySources({
      baseSources: incident295BaseSources(),
      headSources: incident295HeadSources(),
      baseReadable: true,
      headReadable: true,
      baseIsSymlink: false,
      headIsSymlink: false,
      gitObjectFallbackReadable: false,
      baseContradictory: false,
      baseAmbiguous: false,
      targetValid: true,
      checkoutMatches: true,
      worktreeClean: true,
    });
    const verified = verifyOwnerDecision(
      {
        repository: "owner/eScraper-Business-Brokers-for-Seacher-Insights",
        prNumber: INCIDENT_295_PR_NUMBER,
        commentId: INCIDENT_295_DECISION_COMMENT_ID,
        authorLogin: "owner",
        authorIsOwnerOrAdmin: true,
        authorDelegatedByBasePolicy: false,
        decisionBody: INCIDENT_295_DECISION_BODY,
        decisionBodyHash: sha256(INCIDENT_295_DECISION_BODY),
        referencedHeadSha: INCIDENT_295_HEAD_SHA,
        referencedBaseSha: INCIDENT_295_BASE_SHA,
        referencedRequirementsRevision: current,
        exceptionScope: INCIDENT_295_EXCEPTION_SCOPE,
        revoked: false,
        superseded: false,
        unrelated: false,
      },
      {
        repository: "owner/eScraper-Business-Brokers-for-Seacher-Insights",
        prNumber: INCIDENT_295_PR_NUMBER,
        headSha: INCIDENT_295_HEAD_SHA,
        baseSha: INCIDENT_295_BASE_SHA,
        requirementsRevision: current,
      },
      sha256,
    );
    const applied = applyVerifiedApproval(policyOutcome, verified, INCIDENT_295_EXCEPTION_SCOPE);
    assert.equal(applied.action, "use-existing");

    const policyRevision = reviewPolicyRevision(incident295HeadSources(), sha256, {
      commentId: INCIDENT_295_DECISION_COMMENT_ID,
      bodyHash: sha256(INCIDENT_295_DECISION_BODY),
      scope: [...INCIDENT_295_EXCEPTION_SCOPE],
    });
    const handoff: ReviewHandoffInput = {
      repository: "owner/eScraper-Business-Brokers-for-Seacher-Insights",
      prNumber: INCIDENT_295_PR_NUMBER,
      reviewedHeadSha: INCIDENT_295_HEAD_SHA,
      reviewedBaseSha: INCIDENT_295_BASE_SHA,
      closesTicket: 288,
      requirementsRevision: current,
      reviewPolicyRevision: policyRevision,
      verificationCommand: "node scripts/docs-check.mjs",
      verificationResult: "focused checks passed",
      verificationPassed: true,
      findings: [],
      provenance: {
        reviewId: "pending",
        reviewAuthor: "reviewer",
        reviewedCommit: INCIDENT_295_HEAD_SHA,
        reviewedAt: "",
        sourceUrl: "",
        reviewerPermission: "write",
        commentIds: [],
      },
    };
    const fake = fakeReviewPublicationHost();
    const outcome = await publishReviewPublication(
      {
        repository: "owner/eScraper-Business-Brokers-for-Seacher-Insights",
        prNumber: INCIDENT_295_PR_NUMBER,
        commitSha: INCIDENT_295_HEAD_SHA,
        reviewProse: "## Standards\n\nok\n\n## Spec\n\nok",
        handoff,
        observedReviewerPermission: "write",
        expectedAuthor: "reviewer",
      },
      fake,
    );
    assert.equal(outcome.status, "published");
    if (outcome.status !== "published") return;
    // Read-back validates with the same pins (no second review, no repeat pass).
    const readBackCheck = validateReviewHandoff({
      body: outcome.body,
      repository: "owner/eScraper-Business-Brokers-for-Seacher-Insights",
      prNumber: INCIDENT_295_PR_NUMBER,
      currentHeadSha: INCIDENT_295_HEAD_SHA,
      currentBaseSha: INCIDENT_295_BASE_SHA,
      currentRequirementsRevision: current,
      currentReviewPolicyRevision: policyRevision,
      observedProvenance: {
        reviewId: outcome.reviewId,
        reviewAuthor: outcome.readBack.author,
        reviewerPermission: "write",
        reviewedCommit: outcome.readBack.commitSha,
        reviewedAt: outcome.readBack.submittedAt,
        sourceUrl: outcome.readBack.sourceUrl,
        commentIds: outcome.readBack.commentIds,
      },
      reviewCompleted: true,
      reviewDismissed: false,
    });
    assert.equal(readBackCheck.status, "current");
    assert.equal(fake.calls.filter((c) => c.startsWith("create")).length, 1);
    assert.equal(fake.calls.filter((c) => c.startsWith("submit")).length, 1);
  });
});

describe("bounded preparation, local prerequisites, and publication resume", () => {
  test("one corrective attempt per failure class; auth denials never bypass", () => {
    assert.equal(decidePrepareRetry("transient-read", {}).retry, true);
    assert.equal(decidePrepareRetry("transient-read", { "transient-read": 1 }).retry, false);
    assert.equal(decidePrepareRetry("auth-denied", {}).retry, false);
    assert.equal(decidePrepareRetry("revision-change", {}).retry, true);
    assert.equal(decidePrepareRetry("revision-change", { "revision-change": 1 }).retry, false);
  });

  test("compatible runtime selection never edits shell configuration", () => {
    const ok = selectCompatibleRuntime([{ name: "node", major: 24 }, { name: "node", major: 22 }], 24);
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.selected.major, 24);
    assert.equal(selectCompatibleRuntime([{ name: "node", major: 22 }], 24).ok, false);
  });

  test("frozen install boundary preserves tracked files and denies unapproved scripts", () => {
    const boundary = deriveInstallBoundary("package-lock.json", true);
    assert.equal(boundary.ok, true);
    if (!boundary.ok) return;
    assert.equal(boundary.boundary.ignoreScripts, true);
    assert.ok(boundary.boundary.allowedPaths.includes("node_modules/"));
    assert.equal(deriveInstallBoundary(null, false).ok, false);
    assert.equal(isAllowedSetupCommand("npm ci --ignore-scripts", boundary.boundary, []), true);
    assert.equal(isAllowedSetupCommand("npm install lodash", boundary.boundary, []), false);
    assert.equal(isAllowedSetupCommand("npm ci && rm -rf /", boundary.boundary, []), false);
    assert.equal(isAllowedSetupCommand("node -e \"evil()\"", boundary.boundary, []), false);
    assert.equal(isAllowedSetupCommand("npm run verify", boundary.boundary, ["verify"]), true);
    assert.equal(isAllowedSetupCommand("npm run evil", boundary.boundary, ["verify"]), false);
    assert.equal(decideCleanlinessAfterSetup(true).ok, false);
    assert.equal(decideCleanlinessAfterSetup(false).ok, true);
  });

  test("failed verification retains old evidence and publishes blockers; missing facts restrict", () => {
    const retain = planEvidenceRecovery({
      targetTrustworthy: true,
      requirementsTrustworthy: true,
      governingRulesTrustworthy: true,
      recoveryAllowed: false,
      verificationPassed: false,
      verificationFailure: "node scripts/docs-check.mjs exit 1",
    });
    assert.equal(retain.action, "retain-and-carry-failure");
    const restricted = planEvidenceRecovery({
      targetTrustworthy: false,
      requirementsTrustworthy: true,
      governingRulesTrustworthy: true,
      recoveryAllowed: true,
      verificationPassed: true,
    });
    assert.equal(restricted.action, "restrict");
  });

  test("interrupted publication resumes the same verified review once; mismatches stop", () => {
    assert.equal(
      decidePublicationResume({ hasResumeId: true, pinsUnchanged: true, authorOwnershipVerified: true, dismissed: false, ambiguous: false, unreadable: false, alreadySubmittedMatching: false }).action,
      "resume-once",
    );
    assert.equal(
      decidePublicationResume({ hasResumeId: true, pinsUnchanged: false, authorOwnershipVerified: true, dismissed: false, ambiguous: false, unreadable: false, alreadySubmittedMatching: false }).action,
      "stop",
    );
    assert.equal(
      decidePublicationResume({ hasResumeId: false, pinsUnchanged: true, authorOwnershipVerified: true, dismissed: false, ambiguous: false, unreadable: false, alreadySubmittedMatching: true }).action,
      "adopt-matching",
    );
    assert.equal(
      decidePublicationResume({ hasResumeId: true, pinsUnchanged: true, authorOwnershipVerified: true, dismissed: true, ambiguous: false, unreadable: false, alreadySubmittedMatching: false }).action,
      "stop",
    );
  });
});

describe("review hardening regressions", () => {
  test("rule-scoped approval never clears a whole-file draft", () => {
    const outcome = {
      action: "reviewable-with-blockers" as const,
      reason: "two rules changed",
      governingSources: [],
      blockingDrafts: [{ sourcePath: "REVIEW.md", governingRule: "base", message: "changed" }],
    };
    const cleared = applyVerifiedApproval(outcome, { valid: true, reason: "ok" }, ["REVIEW.md:rule-3"]);
    assert.equal(cleared.action, "reviewable-with-blockers");
    const fileCleared = applyVerifiedApproval(outcome, { valid: true, reason: "ok" }, ["REVIEW.md"]);
    assert.equal(fileCleared.action, "use-existing");
  });

  test("repair records round-trip multiline provenance and comment closes", () => {
    const current = currentPin();
    const record = {
      repository: "owner/eScraper-Business-Brokers-for-Seacher-Insights",
      prNumber: INCIDENT_295_PR_NUMBER,
      oldRequirementsRevision: current,
      newRequirementsRevision: current,
      oldHeadSha: INCIDENT_295_HEAD_SHA,
      newHeadSha: INCIDENT_295_HEAD_SHA,
      baseSha: INCIDENT_295_BASE_SHA,
      reason: "line one\nline two --> done",
      verificationProvenance: "line one\nline two --> ok",
    };
    const parsed = parseEvidenceRepairRecord(renderEvidenceRepairRecord(record));
    assert.equal(parsed.found, true);
    assert.ok(parsed.record);
    assert.equal(parsed.record!.reason, record.reason);
    assert.equal(parsed.record!.verificationProvenance, record.verificationProvenance);
    assert.equal(evidenceRepairReusable(parsed.record!, record), true);
  });

  test("closing guard ignores fenced examples and catches fix forms", () => {
    const current = currentPin();
    const stale = staleSameVersionPin(current);
    const base = renderStaleBlock(stale);
    const ticket = resolveRequirementsBody(incidentTicketBody(), "ticket");
    assert.equal(ticket.ok, true);
    if (!ticket.ok) return;
    const candidate = renderCompactEvidence({
      criteria: ticket.criteria,
      evidence: ticket.criteria.map((c) => ({
        criterionId: c.id,
        kind: "behavior" as const,
        focusedCommand: `node scripts/docs-check.mjs --criterion ${c.id}`,
        result: `ok ${c.id}`,
        passed: true,
      })),
      isBugFix: false,
      requirementsRevision: current,
      headSha: INCIDENT_295_HEAD_SHA,
    });
    const fenced = `${base}\n\n\`\`\`md\nCloses #999\n\`\`\`\n`;
    assert.equal(replaceSingleEvidenceBlock(fenced, candidate).ok, true);
    const twoTargets = `${base}\nFixes #200\n`;
    // Base already closes #288; adding Fixes #200 is a conflicting association.
    assert.equal(replaceSingleEvidenceBlock(twoTargets, candidate).ok, false);
  });

  test("pin presence distinguishes absent, malformed, duplicate, and present carriers", () => {
    const current = currentPin();
    const body = renderStaleBlock(current);
    assert.equal(evidencePinPresence(body).kind, "present");
    const withoutPin = body.replace(/^- Requirements revision:.*$/m, "");
    const absent = evidencePinPresence(withoutPin);
    assert.equal(absent.kind, "absent");
    const malformed = evidencePinPresence(body.replace(/^- Requirements revision:.*$/m, "- Requirements revision: garbage"));
    assert.equal(malformed.kind, "malformed");
    const duplicate = evidencePinPresence(body.replace(/^- Requirements revision:.*$/m, (line) => `${line}\n${line}`));
    assert.equal(duplicate.kind, "duplicate");
  });

  test("RED history reads none, malformed, or the exact recorded command and output", () => {
    const current = currentPin();
    const ticket = resolveRequirementsBody(incidentTicketBody(), "ticket");
    assert.equal(ticket.ok, true);
    if (!ticket.ok) return;
    const base = renderCompactEvidence({
      criteria: ticket.criteria,
      evidence: ticket.criteria.map((c) => ({
        criterionId: c.id,
        kind: "non-behavior" as const,
        rationale: `check ${c.id}`,
      })),
      isBugFix: false,
      requirementsRevision: current,
      headSha: INCIDENT_295_HEAD_SHA,
    });
    assert.equal(readEvidenceRed(base).kind, "none");
    const withRed = renderCompactEvidence({
      criteria: ticket.criteria,
      evidence: ticket.criteria.map((c) => ({
        criterionId: c.id,
        kind: "non-behavior" as const,
        rationale: `check ${c.id}`,
      })),
      isBugFix: true,
      bugRedCommand: "node --test tests/bug.test.ts",
      bugRedOutput: "1 failing",
      requirementsRevision: current,
      headSha: INCIDENT_295_HEAD_SHA,
    });
    const read = readEvidenceRed(withRed);
    assert.equal(read.kind, "present");
    if (read.kind === "present") {
      assert.equal(read.redCommand, "node --test tests/bug.test.ts");
      assert.equal(read.redOutput, "1 failing");
    }
    const torn = withRed.replace(/^- RED output:.*$/m, "");
    assert.equal(readEvidenceRed(torn).kind, "malformed");
  });

  test("the repair record stays inside one evidence region and the consumer accepts it", () => {
    const current = currentPin();
    const ticket = resolveRequirementsBody(incidentTicketBody(), "ticket");
    assert.equal(ticket.ok, true);
    if (!ticket.ok) return;
    const block = renderCompactEvidence({
      criteria: ticket.criteria,
      evidence: ticket.criteria.map((c) => ({
        criterionId: c.id,
        kind: "non-behavior" as const,
        rationale: `check ${c.id}`,
      })),
      isBugFix: false,
      requirementsRevision: current,
      headSha: INCIDENT_295_HEAD_SHA,
    });
    const record = {
      repository: "owner/eScraper-Business-Brokers-for-Seacher-Insights",
      prNumber: INCIDENT_295_PR_NUMBER,
      oldRequirementsRevision: staleSameVersionPin(current),
      newRequirementsRevision: current,
      oldHeadSha: INCIDENT_295_HEAD_SHA,
      newHeadSha: INCIDENT_295_HEAD_SHA,
      baseSha: INCIDENT_295_BASE_SHA,
      reason: "same-version stale pin with revalidated proof",
      verificationProvenance: "npm run docs:check: exit 0, 12 bytes",
    };
    const composed = insertEvidenceRepairRecord(block, record);
    const body = `Context\n\nCloses #288\n\n${composed}\n`;
    assert.equal(countEvidenceBlocks(body), 1);
    assert.equal(locateEvidenceRepairRecord(body).location, "inside");
    assert.equal(parseEvidenceRepairRecord(body).found, true);
    assert.equal(
      validateEvidenceHandoff({
        body,
        currentRequirementsRevision: current,
        currentHeadSha: INCIDENT_295_HEAD_SHA,
      }).status,
      "current",
    );
    // A record outside the compact region is rejected, not moved or deleted.
    const outside = `${block}\n\n${renderEvidenceRepairRecord(record)}\n`;
    assert.equal(locateEvidenceRepairRecord(outside).location, "outside");
  });

  test("regeneration replaces the region while preserving mixed outside bytes exactly", () => {
    const current = currentPin();
    const stale = staleSameVersionPin(current);
    const ticket = resolveRequirementsBody(incidentTicketBody(), "ticket");
    assert.equal(ticket.ok, true);
    if (!ticket.ok) return;
    const candidate = renderCompactEvidence({
      criteria: ticket.criteria,
      evidence: ticket.criteria.map((c) => ({
        criterionId: c.id,
        kind: "non-behavior" as const,
        rationale: `check ${c.id}`,
      })),
      isBugFix: false,
      requirementsRevision: current,
      headSha: INCIDENT_295_HEAD_SHA,
    });
    const staleBlock = renderCompactEvidence({
      criteria: ticket.criteria,
      evidence: ticket.criteria.map((c) => ({
        criterionId: c.id,
        kind: "non-behavior" as const,
        rationale: `check ${c.id}`,
      })),
      isBugFix: false,
      requirementsRevision: stale,
      headSha: INCIDENT_295_HEAD_SHA,
    });
    const prefix = "P1 — governed reconstruction.\r\n\r\nA second line.\n";
    const suffix = "\n\nCloses #288\r\nFinal line with unicode ✓\n";
    const mixed = `${prefix}${staleBlock}${suffix}`;
    const replaced = replaceSingleEvidenceBlock(mixed, candidate);
    assert.equal(replaced.ok, true);
    if (!replaced.ok) return;
    assert.ok(replaced.body.startsWith(prefix), "prefix bytes preserved");
    assert.ok(replaced.body.endsWith(suffix), "suffix bytes preserved");
    assert.equal(replaced.body.slice(prefix.length, replaced.body.length - suffix.length), candidate);
  });

  test("repair checks must be established by the pinned configuration", () => {
    const config = { npmScripts: ["docs:check", "docs:diagrams"], trackedFiles: ["scripts/evidence-check.mjs"] };
    assert.equal(isEstablishedRepairCommand("npm run docs:check", config).ok, true);
    assert.equal(isEstablishedRepairCommand("npm run docs:missing", config).ok, false);
    assert.equal(isEstablishedRepairCommand("node scripts/evidence-check.mjs", config).ok, true);
    assert.equal(isEstablishedRepairCommand("node scripts/untracked.mjs", config).ok, false);
    assert.equal(isEstablishedRepairCommand("node ../escape.mjs", config).ok, false);
    assert.equal(isEstablishedRepairCommand("node scripts/evidence-check.mjs && rm -rf /", config).ok, false);
    assert.equal(isEstablishedRepairCommand("npm run docs:check -- --write", config).ok, false);
    // Node repair checks are argument-free: an argument can smuggle an
    // absolute payload path or a write flag past establishment.
    assert.equal(isEstablishedRepairCommand("node scripts/evidence-check.mjs --write /tmp/arbitrary-target", config).ok, false);
    assert.equal(isEstablishedRepairCommand("node scripts/evidence-check.mjs -e evil", config).ok, false);
    assert.match(summarizeExecutionReceipt({ command: "npm run docs:check", exitStatus: 0, outputBytes: 12, truncated: false }), /exit 0.*12 bytes/);
    assert.match(summarizeExecutionReceipt({ command: "x", exitStatus: 1, outputBytes: 8000, truncated: true }), /first 8000 bytes/);
  });

  test("a declared behavior record cannot be hidden by a failing status", () => {
    const current = currentPin();
    const ticket = resolveRequirementsBody(incidentTicketBody(), "ticket");
    assert.equal(ticket.ok, true);
    if (!ticket.ok) return;
    const block = renderCompactEvidence({
      criteria: ticket.criteria,
      evidence: ticket.criteria.map((c) => ({
        criterionId: c.id,
        kind: "behavior" as const,
        focusedCommand: `node scripts/run.mjs ${c.id}`,
        result: `failed ${c.id}`,
        passed: true,
      })),
      isBugFix: false,
      requirementsRevision: current,
      headSha: INCIDENT_295_HEAD_SHA,
    });
    const failing = block.replace(/- Passed: true/g, "- Passed: false");
    assert.equal(extractEvidenceBehaviorClaims(failing).length, 0);
    assert.equal(
      extractDeclaredBehaviorCriteria(failing).length,
      ticket.criteria.filter((c) => c.status === "active").length,
      "declared behavior is still detected when it did not pass",
    );
  });

  test("multiline RED output survives a read/render round trip", () => {
    const current = currentPin();
    const ticket = resolveRequirementsBody(incidentTicketBody(), "ticket");
    assert.equal(ticket.ok, true);
    if (!ticket.ok) return;
    const redOutput = "TypeError: boom\n  at first (a.ts:1)\nsecond line";
    const render = (output: string): string =>
      renderCompactEvidence({
        criteria: ticket.criteria,
        evidence: ticket.criteria.map((c) => ({
          criterionId: c.id,
          kind: "non-behavior" as const,
          rationale: `check ${c.id}`,
        })),
        isBugFix: true,
        bugRedCommand: "node --test tests/bug.test.ts",
        bugRedOutput: output,
        requirementsRevision: current,
        headSha: INCIDENT_295_HEAD_SHA,
      });
    const read = readEvidenceRed(render(redOutput));
    assert.equal(read.kind, "present");
    if (read.kind !== "present") return;
    assert.equal(read.redOutput, redOutput, "the full multi-line log is read, not just the first line");
    const reread = readEvidenceRed(render(read.redOutput));
    assert.equal(reread.kind, "present");
    if (reread.kind !== "present") return;
    assert.equal(reread.redOutput, redOutput, "re-rendering preserves the multi-line log");
  });

  test("CRLF bodies preserve CRLF style outside the replaced region", () => {
    const current = currentPin();
    const stale = staleSameVersionPin(current);
    const ticket = resolveRequirementsBody(incidentTicketBody(), "ticket");
    assert.equal(ticket.ok, true);
    if (!ticket.ok) return;
    const candidate = renderCompactEvidence({
      criteria: ticket.criteria,
      evidence: ticket.criteria.map((c) => ({
        criterionId: c.id,
        kind: "behavior" as const,
        focusedCommand: `node scripts/docs-check.mjs --criterion ${c.id}`,
        result: `ok ${c.id}`,
        passed: true,
      })),
      isBugFix: false,
      requirementsRevision: current,
      headSha: INCIDENT_295_HEAD_SHA,
    });
    const lfBody = renderStaleBlock(stale);
    const crlfBody = lfBody.replace(/\n/g, "\r\n");
    const replaced = replaceSingleEvidenceBlock(crlfBody, candidate);
    assert.equal(replaced.ok, true);
    if (!replaced.ok) return;
    assert.ok(replaced.body.includes("\r\n"), "CRLF style preserved");
    assert.ok(!replaced.body.includes("\r\r\n"), "no double carriage returns");
  });
});
