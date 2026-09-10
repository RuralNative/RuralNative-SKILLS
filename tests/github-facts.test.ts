// Shared native reads (ADR-0040): pagination, host guard, permission mapping.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  assertSupportedHost,
  flattenPages,
  readCollaboratorPermission,
  readPullRequestFacts,
  readRepositoryFacts,
} from "../scripts/github-facts.ts";

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
