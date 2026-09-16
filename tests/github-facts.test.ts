// Shared native reads (ADR-0040): pagination, host guard, permission mapping.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  assertSupportedHost,
  flattenPages,
  readCollaboratorPermission,
  readPullRequestFacts,
  readRepositoryFacts,
  readSubIssues,
} from "../scripts/github-facts.ts";

// Endpoint-sensitive fake `gh`. It records argv, refuses any argv other than
// the expected native route, and emits a fixed fixture response. Confined to
// the spawned child's PATH and never reaches live GitHub.
const FAKE_GH = String.raw`#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const statePath = path.join(here, "gh-state.json");
const callsPath = path.join(here, "gh-calls.jsonl");
const args = process.argv.slice(2);
fs.appendFileSync(callsPath, JSON.stringify(args) + "\n");
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
if (JSON.stringify(args) !== JSON.stringify(state.expectedArgs)) {
  process.stderr.write("unexpected fake gh args: " + JSON.stringify(args));
  process.exit(1);
}
if (!state.ok) {
  process.stderr.write(state.reason ?? "fake gh failure");
  process.exit(1);
}
process.stdout.write(state.stdout ?? "");
`;

interface FactsFixture {
  root: string;
  fakeBin: string;
  callsPath: string;
}

function setupFakeGh(
  expectedArgs: readonly string[],
  response: { ok: boolean; stdout?: string; reason?: string },
): FactsFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-facts-"));
  const fakeBin = path.join(root, "bin");
  fs.mkdirSync(fakeBin, { recursive: true });
  const fakeGh = path.join(fakeBin, "gh");
  fs.writeFileSync(fakeGh, FAKE_GH);
  fs.chmodSync(fakeGh, 0o755);
  fs.writeFileSync(path.join(fakeBin, "gh-state.json"), JSON.stringify({ expectedArgs, ...response }));
  return { root, fakeBin, callsPath: path.join(fakeBin, "gh-calls.jsonl") };
}

function runFactsCli(
  cli: string,
  input: unknown,
  fixture: FactsFixture,
): { exit: number; json: any; stderr: string } {
  const result = spawnSync(process.execPath, [cli, "-"], {
    encoding: "utf8",
    input: JSON.stringify(input),
    env: { ...process.env, PATH: `${fixture.fakeBin}:${process.env.PATH ?? ""}` },
  });
  let json: any = null;
  try {
    json = JSON.parse(String(result.stdout ?? ""));
  } catch {
    json = { raw: result.stdout, stderr: result.stderr };
  }
  return { exit: result.status ?? -1, json, stderr: String(result.stderr ?? "") };
}

function recordedCalls(fixture: FactsFixture): string[][] {
  if (!fs.existsSync(fixture.callsPath)) return [];
  return fs
    .readFileSync(fixture.callsPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as string[]);
}

function closingConnection(
  nodes: unknown[],
  opts: { hasNextPage?: boolean; endCursor?: string | null; totalCount?: number; number?: number } = {},
): string {
  return JSON.stringify({
    data: {
      repository: {
        pullRequest: {
          number: opts.number ?? 300,
          closingIssuesReferences: {
            totalCount: opts.totalCount ?? nodes.length,
            nodes,
            pageInfo: { hasNextPage: opts.hasNextPage ?? false, endCursor: opts.endCursor ?? null },
          },
        },
      },
    },
  });
}

function closingNode(owner: string, repo: string, number: number): unknown {
  return { number, repository: { nameWithOwner: `${owner}/${repo}` } };
}

function prRestBody(extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    state: "open",
    base: { ref: "trunk", sha: "b" },
    head: { ref: "impl/1-x", sha: "h" },
    ...extra,
  });
}

function graphqlRunner(graphqlStdout: string | ((args: readonly string[]) => { ok: boolean; stdout: string; reason?: string }), restStdout = prRestBody()) {
  return (args: readonly string[]) => {
    if (args[1] === "graphql") {
      if (typeof graphqlStdout === "function") return (graphqlStdout as (a: readonly string[]) => { ok: boolean; stdout: string; reason?: string })(args);
      return { ok: true, stdout: graphqlStdout };
    }
    return { ok: true, stdout: restStdout };
  };
}

describe("github facts readers", () => {
  test("only github.com is supported", () => {
    assert.throws(() => assertSupportedHost("example.com"), /only github.com/);
    assert.doesNotThrow(() => assertSupportedHost("github.com"));
  });
  test("paginated pages flatten one level", () => {
    assert.deepEqual(flattenPages(JSON.stringify([[ { id: 1 } ], [ { id: 2 } ]])), [{ id: 1 }, { id: 2 }]);
    assert.deepEqual(flattenPages(JSON.stringify([{ id: 1 }])), [{ id: 1 }]);
    assert.deepEqual(flattenPages(""), []);
    assert.equal(flattenPages("not json"), null);
  });
  test("repository default branch reads from GitHub", () => {
    const facts = readRepositoryFacts(() => ({ ok: true, stdout: JSON.stringify({ default_branch: "trunk" }) }), "o/r");
    assert.equal(facts.defaultBranch, "trunk");
    assert.equal(facts.status.kind, "complete");
  });
  test("missing default branch is malformed, never empty success", () => {
    const facts = readRepositoryFacts(() => ({ ok: true, stdout: JSON.stringify({}) }), "o/r");
    assert.equal(facts.status.kind, "malformed");
  });
  test("merged pull requests report merged state with merge commit", () => {
    const facts = readPullRequestFacts(
      graphqlRunner(
        closingConnection([]),
        JSON.stringify({
          state: "closed",
          merged_at: "2026-09-10T00:00:00Z",
          draft: false,
          base: { ref: "trunk", sha: "b" },
          head: { ref: "impl/1-x", sha: "h" },
          mergeable: true,
          merge_commit_sha: "m",
        }),
      ),
      "o/r",
      300,
    );
    assert.equal(facts.state, "merged");
    assert.equal(facts.mergeCommitSha, "m");
    assert.equal(facts.baseBranch, "trunk");
    assert.equal(facts.status.kind, "complete");
    assert.equal(facts.closingStatus.kind, "complete");
  });
  test("failed closing-link reads never report complete", () => {
    const facts = readPullRequestFacts(
      (args) => {
        if (args[1] === "graphql") return { ok: false, stdout: "", reason: "HTTP 500" };
        return { ok: true, stdout: prRestBody() };
      },
      "o/r",
      300,
    );
    assert.notEqual(facts.status.kind, "complete");
    assert.deepEqual(facts.closingIssues, []);
  });
  test("missing refs report malformed, never complete", () => {
    const facts = readPullRequestFacts(
      graphqlRunner(closingConnection([]), JSON.stringify({ state: "open", base: {}, head: {} })),
      "o/r",
      300,
    );
    assert.equal(facts.status.kind, "malformed");
  });
  test("pull request body and head repository identity are observed", () => {
    const facts = readPullRequestFacts(
      graphqlRunner(
        closingConnection([]),
        JSON.stringify({
          state: "open",
          body: "hello",
          base: { ref: "trunk", sha: "b" },
          head: { ref: "impl/1-x", sha: "h", repo: { full_name: "o/r" } },
        }),
      ),
      "o/r",
      300,
    );
    assert.equal(facts.body, "hello");
    assert.equal(facts.headRepository, "o/r");
  });
  test("an absent head repository is unknown identity, never empty success", () => {
    const facts = readPullRequestFacts(
      graphqlRunner(closingConnection([])),
      "o/r",
      300,
    );
    assert.equal(facts.headRepository, "");
  });
  test("native closing links decide association without timeline events (#312 pattern)", () => {
    const facts = readPullRequestFacts(
      graphqlRunner(closingConnection([closingNode("o", "r", 305)], { number: 312 })),
      "o/r",
      312,
    );
    assert.equal(facts.status.kind, "complete");
    assert.deepEqual(facts.closingIssues, [{ owner: "o", repo: "r", number: 305 }]);
  });
  test("a complete-empty native connection is empty and complete", () => {
    const facts = readPullRequestFacts(graphqlRunner(closingConnection([])), "o/r", 300);
    assert.equal(facts.status.kind, "complete");
    assert.equal(facts.closingStatus.kind, "complete");
    assert.deepEqual(facts.closingIssues, []);
  });
  test("duplicate native links deduplicate to one association", () => {
    const facts = readPullRequestFacts(
      graphqlRunner(closingConnection([closingNode("o", "r", 305), closingNode("o", "r", 305)])),
      "o/r",
      300,
    );
    assert.equal(facts.status.kind, "complete");
    assert.deepEqual(facts.closingIssues, [{ owner: "o", repo: "r", number: 305 }]);
  });
  test("a terminal page that under-delivers its count is partial, never complete", () => {
    const facts = readPullRequestFacts(
      graphqlRunner(closingConnection([closingNode("o", "r", 305)], { totalCount: 2 })),
      "o/r",
      300,
    );
    assert.equal(facts.status.kind, "partial");
    assert.equal(facts.closingStatus.kind, "partial");
    assert.deepEqual(facts.closingIssues, []);
  });
  test("multiple native targets are all observed with repository identity", () => {
    const facts = readPullRequestFacts(
      graphqlRunner(closingConnection([closingNode("o", "r", 305), closingNode("o", "other", 306)])),
      "o/r",
      300,
    );
    assert.equal(facts.status.kind, "complete");
    assert.deepEqual(facts.closingIssues, [
      { owner: "o", repo: "r", number: 305 },
      { owner: "o", repo: "other", number: 306 },
    ]);
  });
  test("multiple GraphQL pages follow cursors to completion", () => {
    const facts = readPullRequestFacts(
      (args) => {
        if (args[1] === "graphql") {
          if (args.some((a) => a === "after=cursor-1")) {
            return { ok: true, stdout: closingConnection([closingNode("o", "r", 306)], { totalCount: 2 }) };
          }
          return { ok: true, stdout: closingConnection([closingNode("o", "r", 305)], { hasNextPage: true, endCursor: "cursor-1", totalCount: 2 }) };
        }
        return { ok: true, stdout: prRestBody() };
      },
      "o/r",
      300,
    );
    assert.equal(facts.status.kind, "complete");
    assert.deepEqual(facts.closingIssues, [
      { owner: "o", repo: "r", number: 305 },
      { owner: "o", repo: "r", number: 306 },
    ]);
  });
  test("GraphQL errors are partial, never complete-empty", () => {
    const facts = readPullRequestFacts(
      graphqlRunner(JSON.stringify({ data: null, errors: [{ message: "boom" }] })),
      "o/r",
      300,
    );
    assert.equal(facts.status.kind, "partial");
    assert.equal(facts.closingStatus.kind, "partial");
    assert.deepEqual(facts.closingIssues, []);
  });
  test("forbidden closing-link reads stay forbidden", () => {
    const facts = readPullRequestFacts(
      (args) => {
        if (args[1] === "graphql") return { ok: false, stdout: "", reason: "HTTP 403 Forbidden" };
        return { ok: true, stdout: prRestBody() };
      },
      "o/r",
      300,
    );
    assert.equal(facts.status.kind, "forbidden");
    assert.equal(facts.closingStatus.kind, "forbidden");
  });
  test("truncated JSON and missing cursors never become complete", () => {
    const truncated = readPullRequestFacts(graphqlRunner("not json"), "o/r", 300);
    assert.equal(truncated.status.kind, "malformed");
    const missingCursor = readPullRequestFacts(
      graphqlRunner(closingConnection([closingNode("o", "r", 305)], { hasNextPage: true, endCursor: null, totalCount: 2 })),
      "o/r",
      300,
    );
    assert.equal(missingCursor.status.kind, "partial");
    const repeated = readPullRequestFacts(
      (args) => {
        if (args[1] === "graphql") {
          return { ok: true, stdout: closingConnection([closingNode("o", "r", 305)], { hasNextPage: true, endCursor: "same", totalCount: 2 }) };
        }
        return { ok: true, stdout: prRestBody() };
      },
      "o/r",
      300,
    );
    assert.equal(repeated.status.kind, "partial");
  });
  test("a wrong pull-request identity is malformed", () => {
    const facts = readPullRequestFacts(graphqlRunner(closingConnection([], { number: 999 })), "o/r", 300);
    assert.equal(facts.status.kind, "malformed");
  });
  test("facts CLI rejects unknown operations and bad repos without network", async () => {
    const { spawnSync } = await import("node:child_process");
    const run = (input: unknown) => {
      const result = spawnSync(process.execPath, ["scripts/github-facts.mjs", "-"], {
        input: JSON.stringify(input),
        encoding: "utf8",
      });
      return { exit: result.status, json: JSON.parse(String(result.stdout || "{}")) };
    };
    const unknown = run({ operation: "nope", repository: "o/r" });
    assert.equal(unknown.exit, 2);
    assert.equal(unknown.json.ok, false);
    const badRepo = run({ operation: "repository", repository: "bad" });
    assert.equal(badRepo.exit, 2);
  });
  test("the pull-request CLI reads native closing links through GraphQL (#312 pattern)", () => {
    const multiGh = String.raw`#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const callsPath = path.join(here, "gh-calls.jsonl");
const args = process.argv.slice(2);
fs.appendFileSync(callsPath, JSON.stringify(args) + "\n");
if (args[1] === "graphql") {
  const hasAfter = args.some((a) => a === "after=cursor-1");
  if (hasAfter) {
    process.stdout.write(JSON.stringify({ data: { repository: { pullRequest: { number: 312, closingIssuesReferences: { totalCount: 1, nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } } } } }));
  } else {
    process.stdout.write(JSON.stringify({ data: { repository: { pullRequest: { number: 312, closingIssuesReferences: { totalCount: 1, nodes: [{ number: 305, repository: { nameWithOwner: "o/r" } }], pageInfo: { hasNextPage: false, endCursor: null } } } } } }));
  }
  process.exit(0);
}
process.stdout.write(JSON.stringify({ state: "open", base: { ref: "trunk", sha: "b" }, head: { ref: "impl/1-x", sha: "h", repo: { full_name: "o/r" } } }));
`;
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-facts-pr-"));
    const fakeBin = path.join(root, "bin");
    fs.mkdirSync(fakeBin, { recursive: true });
    fs.writeFileSync(path.join(fakeBin, "gh"), multiGh);
    fs.chmodSync(path.join(fakeBin, "gh"), 0o755);
    try {
      for (const cli of ["scripts/github-facts.mjs", "skills/review-this/github-facts.mjs"]) {
        const result = spawnSync(process.execPath, [cli, "-"], {
          encoding: "utf8",
          input: JSON.stringify({ operation: "pull-request", repository: "o/r", prNumber: 312 }),
          env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH ?? ""}` },
        });
        const json = JSON.parse(String(result.stdout || "{}"));
        assert.equal(result.status, 0, `${cli}: ${result.stderr}`);
        assert.equal(json.ok, true);
        assert.deepEqual(json.closingIssues, [{ owner: "o", repo: "r", number: 305 }]);
        assert.equal(json.closingStatus, "complete");
      }
      const calls = fs
        .readFileSync(path.join(fakeBin, "gh-calls.jsonl"), "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as string[]);
      assert.ok(calls.some((args) => args[1] === "graphql"), "GraphQL closing-link read observed");
      assert.ok(!calls.some((args) => args.some((a) => String(a).includes("/timeline"))), "timeline is never read");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
  test("collaborator permission maps only known values", () => {
    const read = (permission: string) =>
      readCollaboratorPermission(() => ({ ok: true, stdout: JSON.stringify({ permission }) }), "o/r", "reviewer");
    assert.equal(read("admin"), "admin");
    assert.equal(read("write"), "write");
    assert.equal(read("bogus"), "unknown");
    assert.equal(
      readCollaboratorPermission(() => ({ ok: false, stdout: "", reason: "404" }), "o/r", "reviewer"),
      "unknown",
    );
  });
});

describe("github facts sub-issues reader (native /sub_issues route)", () => {
  const EXPECTED = ["api", "--paginate", "--slurp", "repos/o/r/issues/5/sub_issues"];
  const CLI_PATHS = ["scripts/github-facts.mjs", "skills/implement-this/github-facts.mjs"];
  const SUB_ISSUES_INPUT = { operation: "sub-issues", repository: "o/r", issueNumber: 5 };

  test("reads the native sub_issues route with slurp pagination and ordered children", () => {
    const calls: string[][] = [];
    const result = readSubIssues((args) => {
      calls.push([...args]);
      return { ok: true, stdout: JSON.stringify([[{ number: 288 }], [{ number: 289 }, { number: 290 }]]) };
    }, "o/r", 5);
    assert.deepEqual(calls, [EXPECTED]);
    assert.deepEqual(result.subIssues, [288, 289, 290]);
    assert.equal(result.status.kind, "complete");
  });

  test("a complete-empty sub-issues read is empty and complete", () => {
    const result = readSubIssues(() => ({ ok: true, stdout: "[]" }), "o/r", 5);
    assert.deepEqual(result.subIssues, []);
    assert.equal(result.status.kind, "complete");
  });

  test("a failed sub-issues read never becomes a successful empty list", () => {
    const result = readSubIssues(() => ({ ok: false, stdout: "", reason: "HTTP 404: Not Found" }), "o/r", 5);
    assert.deepEqual(result.subIssues, []);
    assert.notEqual(result.status.kind, "complete");
  });

  test("a malformed sub-issues read never becomes a successful empty list", () => {
    const result = readSubIssues(() => ({ ok: true, stdout: "not json" }), "o/r", 5);
    assert.deepEqual(result.subIssues, []);
    assert.equal(result.status.kind, "malformed");
  });

  test("the sub-issues CLI reads the native sub_issues route through the authored and bundled readers", () => {
    for (const cli of CLI_PATHS) {
      const fixture = setupFakeGh(EXPECTED, {
        ok: true,
        stdout: JSON.stringify([[{ number: 288 }], [{ number: 289 }, { number: 290 }]]),
      });
      try {
        const result = runFactsCli(cli, SUB_ISSUES_INPUT, fixture);
        assert.equal(result.exit, 0, `${cli}: ${result.stderr}`);
        assert.deepEqual(result.json, {
          ok: true,
          repository: "o/r",
          issueNumber: 5,
          numbers: [288, 289, 290],
          status: "complete",
        });
        assert.deepEqual(recordedCalls(fixture), [EXPECTED]);
      } finally {
        fs.rmSync(fixture.root, { recursive: true, force: true });
      }
    }
  });

  test("the sub-issues CLI stays complete-empty on no children and stops on failed or malformed reads", () => {
    for (const cli of CLI_PATHS) {
      const empty = setupFakeGh(EXPECTED, { ok: true, stdout: "[]" });
      const failed = setupFakeGh(EXPECTED, { ok: false, reason: "HTTP 404: Not Found" });
      const malformed = setupFakeGh(EXPECTED, { ok: true, stdout: "not json" });
      try {
        const emptyResult = runFactsCli(cli, SUB_ISSUES_INPUT, empty);
        assert.equal(emptyResult.exit, 0, `${cli}: ${emptyResult.stderr}`);
        assert.deepEqual(emptyResult.json.numbers, []);
        assert.equal(emptyResult.json.status, "complete");

        const failedResult = runFactsCli(cli, SUB_ISSUES_INPUT, failed);
        assert.equal(failedResult.exit, 2);
        assert.equal(failedResult.json.ok, false);

        const malformedResult = runFactsCli(cli, SUB_ISSUES_INPUT, malformed);
        assert.equal(malformedResult.exit, 2);
        assert.equal(malformedResult.json.ok, false);
      } finally {
        for (const fixture of [empty, failed, malformed]) {
          fs.rmSync(fixture.root, { recursive: true, force: true });
        }
      }
    }
  });
});
