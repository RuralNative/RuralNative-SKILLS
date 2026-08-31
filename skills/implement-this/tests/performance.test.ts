// implement-this:INV-12 — compact dispatch, measured setup, timings, and affected-test evidence.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  createDispatchPacket,
  renderDispatchPacket,
  serializeDispatchPacket,
} from "../dispatch-packet.ts";
import {
  TIMING_PHASES,
  buildTimingSummary,
  parseTrustedTimingSummary,
  upsertTrustedTimingSummary,
} from "../timing.ts";
import {
  chooseMeasuredPackageOptions,
  reconcileDependencyState,
  worktreeNodeModulesPath,
} from "../setup.ts";
import { verificationPlan } from "../verification.ts";

describe("compact dispatch packets", () => {
  test("carry bounded ticket context without repository rediscovery", () => {
    const packet = createDispatchPacket({
      ticket: 157,
      riskClass: "high-risk",
      revisions: { base: "base-a", head: "head-a" },
      affectedSeams: ["implement-this", "review-this"],
      acceptanceCriteria: ["record phase timings"],
      settledDecisions: ["one persistent PR worktree"],
    });
    assert.equal(JSON.parse(serializeDispatchPacket(packet)).ticket, 157);
    assert.match(renderDispatchPacket(packet), /risk: high-risk/);
    assert.match(renderDispatchPacket(packet), /base-a -> head-a/);
  });
});

describe("phase timing and trusted summary", () => {
  test("serializes every required phase and records an SLO cause", () => {
    const summary = buildTimingSummary({
      riskClass: "ordinary",
      reservedAtMs: 0,
      terminalAtMs: 61 * 60 * 1000,
      phases: { checkout: 12, "initial-review": 4 },
      sloMissCause: "external review wait",
    });
    assert.equal(summary.sloMissed, true);
    assert.equal(summary.sloMissCause, "external review wait");
    assert.deepEqual(Object.keys(summary.phases), TIMING_PHASES);
    const first = upsertTrustedTimingSummary("PR body", summary);
    const second = upsertTrustedTimingSummary(first, { ...summary, reservationToTerminalMs: 5 });
    assert.equal((second.match(/ruralnative:workflow-timing:start/g) ?? []).length, 1);
    assert.equal(parseTrustedTimingSummary(second)?.reservationToTerminalMs, 5);
  });

  test("a cause containing --> cannot corrupt the trusted summary block", () => {
    const summary = buildTimingSummary({
      riskClass: "high-risk",
      reservedAtMs: 0,
      terminalAtMs: 91 * 60 * 1000,
      phases: {},
      sloMissCause: "blocked by --> an external outage",
    });
    const body = upsertTrustedTimingSummary("PR body", summary);
    const parsed = parseTrustedTimingSummary(body);
    assert.ok(parsed, "trusted summary must survive a --> in the cause");
    assert.equal(parsed.sloMissCause, "blocked by --> an external outage");
    assert.equal((body.match(/ruralnative:workflow-timing:end/g) ?? []).length, 1);
  });
});

describe("measured setup reconciliation", () => {
  test("missing prior setup state always runs dependency setup", () => {
    const setup = { setupManifestDigest: null, worktreeNodeModulesPath: "/worktrees/187/node_modules" };
    const missing = reconcileDependencyState("manifest-a", setup);
    assert.equal(missing.rerunSetup, true);
    assert.equal(missing.reason, "dependency-state-changed");
  });

  test("reruns dependency setup only when the manifest state differs", () => {
    const setup = {
      setupManifestDigest: "manifest-a",
      worktreeNodeModulesPath: "/worktrees/157/node_modules",
    };
    const unchanged = reconcileDependencyState("manifest-a", setup);
    const changed = reconcileDependencyState("manifest-b", setup);
    assert.equal(unchanged.rerunSetup, false);
    assert.equal(changed.rerunSetup, true);
  });

  test("keeps node_modules per worktree and enables package options only after measured proof", () => {
    assert.equal(worktreeNodeModulesPath("/worktree/"), "/worktree/node_modules");
    assert.deepEqual(chooseMeasuredPackageOptions({ baselineMs: 10 }), {
      useMeasuredOptimization: false,
      options: [],
      reason: "keep default setup until measured deterministic data shows a benefit",
    });
    assert.equal(
      chooseMeasuredPackageOptions({ baselineMs: 10, candidateMs: 5, candidateDeterministic: true }).useMeasuredOptimization,
      true,
    );
  });
});

describe("affected-test evidence", () => {
  test("uncertain mapping escalates to the full repository gate", () => {
    assert.deepEqual(
      verificationPlan({ affectedSeams: ["review-this"], selectedTests: [], mappingDefensible: false }),
      {
        runTargetedTests: false,
        runFullRepositoryGate: true,
        reason: "affected-test mapping is uncertain",
      },
    );
    assert.equal(
      verificationPlan({ affectedSeams: ["review-this"], selectedTests: ["review.test.ts"], mappingDefensible: true }).runFullRepositoryGate,
      false,
    );
  });

  test("a defensible mapping runs exactly its selected targeted tests", () => {
    assert.deepEqual(
      verificationPlan({
        affectedSeams: ["review-this"],
        selectedTests: ["skills/review-this/tests/review-session.test.ts"],
        mappingDefensible: true,
      }),
      {
        runTargetedTests: true,
        runFullRepositoryGate: false,
        reason: "affected-seam mapping is defensible; reserve the full gate for the final revision",
      },
    );
  });

  test("an uncertain mapping records why it escalated to the full repository gate", () => {
    const plan = verificationPlan({
      affectedSeams: [],
      selectedTests: [],
      mappingDefensible: false,
      reason: "no tests map to this seam",
    });
    assert.equal(plan.runTargetedTests, false);
    assert.equal(plan.runFullRepositoryGate, true);
    assert.equal(plan.reason, "no tests map to this seam");
  });
});
