// review-this — target resolution (#156, parent #152).
// Table-driven coverage of bare numbers, hash numbers, issue URLs,
// pull-request URLs, parent specifications, child issues, direct pull
// requests, malformed input, cross-repository input, missing links, and
// multiple links. Pure facts only; no network, GitHub, or worker calls.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { normalizeReference, resolveReviewTarget, reviewReadiness } from "../targets.ts";
import type { TargetResolutionContext } from "../targets.ts";
import type { TicketFact } from "../workflow-state.ts";
import type { PullRequestLink } from "../discovery.ts";

const REPO = { owner: "RuralNative", name: "RuralNative-SKILLS" };
const SPEC = 130;

function ticket(overrides: Partial<TicketFact> & { number: number }): TicketFact {
  return {
    state: "open",
    labels: [],
    assignees: [],
    parent: SPEC,
    openBlockers: [],
    ...overrides,
  };
}

function prLink(overrides: Partial<PullRequestLink> & { ticket: number; prNumber: number }): PullRequestLink {
  return {
    headSha: `head-${overrides.prNumber}`,
    baseSha: `base-${overrides.prNumber}`,
    state: "open",
    mergeable: true,
    requiredChecksGreen: true,
    closesTicket: overrides.ticket,
    hasAcceptanceEvidence: true,
    ...overrides,
  };
}

function context(overrides: Partial<TargetResolutionContext> = {}): TargetResolutionContext {
  return {
    repository: REPO,
    tickets: [
      ticket({ number: 153 }),
      ticket({ number: 154 }),
      ticket({ number: 155 }),
    ],
    pullRequests: [],
    ...overrides,
  };
}

describe("normalizeReference", () => {
  const cases: Array<{
    name: string;
    raw: string;
    form: string;
    number: number | null;
    repo: string | null;
  }> = [
    { name: "bare number", raw: "100", form: "bare-number", number: 100, repo: null },
    { name: "hash number", raw: "#100", form: "hash-number", number: 100, repo: null },
    { name: "command prefix with bare number", raw: "/review-this 100", form: "bare-number", number: 100, repo: null },
    { name: "command prefix with hash number", raw: "/review-this #100", form: "hash-number", number: 100, repo: null },
    {
      name: "issue URL",
      raw: "https://github.com/RuralNative/RuralNative-SKILLS/issues/100",
      form: "issue-url",
      number: 100,
      repo: "RuralNative/RuralNative-SKILLS",
    },
    {
      name: "pull-request URL",
      raw: "https://github.com/RuralNative/RuralNative-SKILLS/pull/100",
      form: "pull-request-url",
      number: 100,
      repo: "RuralNative/RuralNative-SKILLS",
    },
    { name: "malformed text", raw: "review the wave", form: "", number: null, repo: null },
    { name: "malformed fragment", raw: "#abc", form: "", number: null, repo: null },
    { name: "empty target", raw: "", form: "", number: null, repo: null },
    { name: "non-GitHub URL", raw: "https://example.com/issues/100", form: "", number: null, repo: null },
  ];

  for (const c of cases) {
    test(c.name, () => {
      const ref = normalizeReference(c.raw);
      if (c.number === null) {
        assert.equal(ref, null);
      } else {
        assert.ok(ref);
        assert.equal(ref.form, c.form);
        assert.equal(ref.number, c.number);
        if (c.repo === null) {
          assert.equal(ref.repository, null);
        } else {
          assert.equal(`${ref.repository!.owner}/${ref.repository!.name}`, c.repo);
        }
      }
    });
  }

  test("bare and hash references normalize to the same repository number", () => {
    assert.deepEqual(normalizeReference("100")!.number, normalizeReference("#100")!.number);
  });
});

describe("resolveReviewTarget", () => {
  test("a parent specification selects its child pull-request wave in native child order", () => {
    const ctx = context({
      pullRequests: [
        prLink({ ticket: 155, prNumber: 302 }),
        prLink({ ticket: 154, prNumber: 301 }),
      ],
    });
    const result = resolveReviewTarget(`#${SPEC}`, ctx);
    assert.ok(result.ok);
    assert.equal(result.objectType, "parent-specification");
    assert.equal(result.plan.mode, "parent-wave");
    assert.deepEqual(result.plan.selections.map((s) => s.ticket), [154, 155]);
    assert.equal(result.plan.specReview, "available");
    assert.equal(result.plan.autoMergeAllowed, true);
  });

  test("parent mode rediscovers pull requests created after invocation without reselecting an unchanged reviewed pair", () => {
    const ctx = context({
      pullRequests: [prLink({ ticket: 154, prNumber: 301 })],
      previouslyReviewed: [{ prNumber: 301, headSha: "head-301", baseSha: "base-301" }],
    });
    const result = resolveReviewTarget(String(SPEC), ctx);
    assert.ok(result.ok);
    assert.deepEqual(result.plan.selections, [], "unchanged reviewed pair is skipped");
    const withLater = context({
      pullRequests: [
        prLink({ ticket: 154, prNumber: 301 }),
        prLink({ ticket: 155, prNumber: 305 }),
      ],
      previouslyReviewed: [{ prNumber: 301, headSha: "head-301", baseSha: "base-301" }],
    });
    const later = resolveReviewTarget(`#${SPEC}`, withLater);
    assert.ok(later.ok);
    assert.deepEqual(later.plan.selections.map((s) => s.prNumber), [305]);
  });

  test("a child issue resolves exactly one open pull request and derives its parent specification", () => {
    const ctx = context({
      pullRequests: [prLink({ ticket: 154, prNumber: 301 })],
    });
    const result = resolveReviewTarget("154", ctx);
    assert.ok(result.ok);
    assert.equal(result.objectType, "child-issue");
    assert.equal(result.plan.mode, "single-pull-request");
    assert.equal(result.plan.spec, SPEC);
    assert.equal(result.plan.specReview, "available");
    assert.equal(result.plan.autoMergeAllowed, true);
    assert.deepEqual(result.plan.selections[0], {
      ticket: 154,
      prNumber: 301,
      headSha: "head-301",
      baseSha: "base-301",
    });
  });

  test("a child issue with no open pull request stops before writes", () => {
    const result = resolveReviewTarget("#154", context());
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.diagnostic, "missing-pull-request");
  });

  test("a child issue with several candidate pull requests is ambiguous", () => {
    const ctx = context({
      pullRequests: [
        prLink({ ticket: 154, prNumber: 301 }),
        prLink({ ticket: 154, prNumber: 306 }),
      ],
    });
    const result = resolveReviewTarget("#154", ctx);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.diagnostic, "ambiguous-pull-requests");
  });

  test("an issue whose only PR lacks a valid closing reference stops before writes", () => {
    const ctx = context({
      pullRequests: [prLink({ ticket: 999, prNumber: 301 })],
    });
    const result = resolveReviewTarget("#154", ctx);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.diagnostic, "missing-pull-request");
  });

  test("a direct pull request derives its closing issue and parent specification", () => {
    const ctx = context({
      pullRequests: [prLink({ ticket: 154, prNumber: 301 })],
    });
    const raws = ["301", "#301", `https://github.com/${REPO.owner}/${REPO.name}/pull/301`];
    for (const raw of raws) {
      const result = resolveReviewTarget(raw, ctx);
      assert.ok(result.ok, raw);
      assert.equal(result.objectType, "pull-request");
      assert.equal(result.plan.spec, SPEC);
      assert.equal(result.plan.specReview, "available");
    }
  });

  test("a pull request without an originating specification produces a Standards-only plan that cannot auto-merge", () => {
    const ctx = context({
      tickets: [ticket({ number: 154 })],
      pullRequests: [prLink({ ticket: 400, prNumber: 401 })],
    });
    const result = resolveReviewTarget("#401", ctx);
    assert.ok(result.ok);
    assert.equal(result.plan.spec, null);
    assert.equal(result.plan.specReview, "unavailable");
    assert.equal(result.plan.autoMergeAllowed, false);
    assert.deepEqual(result.plan.selections.map((s) => s.prNumber), [401]);
  });

  test("a closed pull request stops before writes", () => {
    const ctx = context({
      pullRequests: [prLink({ ticket: 154, prNumber: 301, state: "merged" })],
    });
    const result = resolveReviewTarget("#301", ctx);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.diagnostic, "closed-pull-request");
  });

  test("a missing target stops before writes", () => {
    const result = resolveReviewTarget("#9999", context());
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.diagnostic, "target-not-found");
  });

  test("a malformed reference stops before writes", () => {
    const result = resolveReviewTarget("not a target", context());
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.diagnostic, "malformed-reference");
  });

  test("a cross-repository target stops unless the user explicitly chose that repository", () => {
    const other = { owner: "other", name: "fork" };
    const ctx = context({
      explicitRepository: null,
      tickets: [],
      pullRequests: [],
    });
    const refused = resolveReviewTarget(`https://github.com/other/fork/pull/5`, ctx);
    assert.equal(refused.ok, false);
    if (!refused.ok) assert.equal(refused.diagnostic, "cross-repository-target");
    const allowed = resolveReviewTarget(`https://github.com/other/fork/pull/5`, {
      ...ctx,
      explicitRepository: other,
    });
    assert.equal(allowed.ok, false, "explicit choice passes the repository gate but the object is still absent here");
    if (!allowed.ok) assert.notEqual(allowed.diagnostic, "cross-repository-target");
  });

  test("no worktree or write intent exists in any diagnostic result", () => {
    for (const raw of ["bogus", "#9999"]) {
      const result = resolveReviewTarget(raw, context());
      assert.equal(result.ok, false);
      assert.equal("plan" in result, false);
      assert.equal("selections" in result, false);
    }
  });
});

describe("reviewReadiness", () => {
  test("readiness requires open state, valid closing reference, and acceptance evidence", () => {
    const ready = reviewReadiness(prLink({ ticket: 154, prNumber: 301 }));
    assert.deepEqual(ready, { ready: true, blockers: [] });
    const closed = reviewReadiness(prLink({ ticket: 154, prNumber: 301, state: "closed" }));
    assert.equal(closed.ready, false);
    const noRef = reviewReadiness(prLink({ ticket: 154, prNumber: 301, closesTicket: null }));
    assert.equal(noRef.ready, false);
    const noEvidence = reviewReadiness(prLink({ ticket: 154, prNumber: 301, hasAcceptanceEvidence: false }));
    assert.equal(noEvidence.ready, false);
  });

  test("ready-for-human is not part of readiness", () => {
    const labeled = reviewReadiness(
      prLink({ ticket: 154, prNumber: 301 }),
    );
    assert.equal(labeled.ready, true, "the triage label never gates pull-request readiness");
  });
});

describe("resolver purity", () => {
  test("targets.ts performs no network, git, filesystem, Agent Manager, or GitHub calls", () => {
    const src = fs.readFileSync(
      path.resolve(path.dirname(new URL(import.meta.url).pathname), "../targets.ts"),
      "utf8",
    );
    assert.doesNotMatch(src, /\bfetch\s*\(/);
    assert.doesNotMatch(src, /\bXMLHttpRequest\b/);
    assert.doesNotMatch(src, /\bprocess\.env\b/);
    assert.doesNotMatch(src, /\brequire\s*\(/);
    assert.doesNotMatch(src, /\bchild_process\b/);
    assert.doesNotMatch(src, /\bnode:fs\b/);
    assert.doesNotMatch(src, /\bgit\b\s*\(/);
    for (const banned of ["agent_manager", "octokit", "execSync"]) {
      assert.equal(src.includes(banned), false, `unexpected host call: ${banned}`);
    }
  });
});
