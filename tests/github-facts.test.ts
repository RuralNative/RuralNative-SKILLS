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
      (args) => {
        if (args.some((a) => a.includes("/timeline"))) return { ok: true, stdout: "[]" };
        return {
          ok: true,
          stdout: JSON.stringify({
            state: "closed",
            merged_at: "2026-09-10T00:00:00Z",
            draft: false,
            base: { ref: "trunk", sha: "b" },
            head: { ref: "impl/1-x", sha: "h" },
            mergeable: true,
            merge_commit_sha: "m",
          }),
        };
      },
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
        if (args.some((a) => a.includes("/timeline"))) return { ok: false, stdout: "", reason: "HTTP 500" };
        return {
          ok: true,
          stdout: JSON.stringify({
            state: "open",
            base: { ref: "trunk", sha: "b" },
            head: { ref: "impl/1-x", sha: "h" },
          }),
        };
      },
      "o/r",
      300,
    );
    assert.notEqual(facts.status.kind, "complete");
    assert.deepEqual(facts.closingIssues, []);
  });
  test("missing refs report malformed, never complete", () => {
    const facts = readPullRequestFacts(
      (args) => {
        if (args.some((a) => a.includes("/timeline"))) return { ok: true, stdout: "[]" };
        return { ok: true, stdout: JSON.stringify({ state: "open", base: {}, head: {} }) };
      },
      "o/r",
      300,
    );
    assert.equal(facts.status.kind, "malformed");
  });
  test("pull request body and head repository identity are observed", () => {
    const facts = readPullRequestFacts(
      (args) => {
        if (args.some((a) => a.includes("/timeline"))) return { ok: true, stdout: "[]" };
        return {
          ok: true,
          stdout: JSON.stringify({
            state: "open",
            body: "hello",
            base: { ref: "trunk", sha: "b" },
            head: { ref: "impl/1-x", sha: "h", repo: { full_name: "o/r" } },
          }),
        };
      },
      "o/r",
      300,
    );
    assert.equal(facts.body, "hello");
    assert.equal(facts.headRepository, "o/r");
  });
  test("an absent head repository is unknown identity, never empty success", () => {
    const facts = readPullRequestFacts(
      (args) => {
        if (args.some((a) => a.includes("/timeline"))) return { ok: true, stdout: "[]" };
        return {
          ok: true,
          stdout: JSON.stringify({
            state: "open",
            base: { ref: "trunk", sha: "b" },
            head: { ref: "impl/1-x", sha: "h" },
          }),
        };
      },
      "o/r",
      300,
    );
    assert.equal(facts.headRepository, "");
  });
  test("only connected timeline events count as closing links", () => {
    const facts = readPullRequestFacts(
      (args) => {
        if (args.some((a) => a.includes("/timeline"))) {
          return {
            ok: true,
            stdout: JSON.stringify([
              [{ event: "cross-referenced", source: { issue: { html_url: "https://github.com/o/r/issues/999" } } }],
            ]),
          };
        }
        return {
          ok: true,
          stdout: JSON.stringify({
            state: "open",
            base: { ref: "trunk", sha: "b" },
            head: { ref: "impl/1-x", sha: "h" },
          }),
        };
      },
      "o/r",
      300,
    );
    assert.equal(facts.status.kind, "complete");
    assert.deepEqual(facts.closingIssues, []);
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
