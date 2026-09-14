#!/usr/bin/env node
// Read-only native GitHub facts entry point (ADR-0040, narrowed by ADR-0042).
// Narrow allowlist: repository default branch, one issue with body/labels,
// sub-issues, blocked_by/blocking dependencies, one pull request with refs
// and native closing links, and one collaborator permission read. No writes,
// no polling, no arbitrary endpoints. Argument arrays only.
// Usage: node github-facts.mjs <input.json> (or - for stdin)
// Exit codes: 0 ok; 2 input or runtime failure.
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { readPullRequestFacts } from "./github-facts.ts";

const ALLOWED = new Set(["repository", "issue", "sub-issues", "blocked-by", "blocking", "pull-request", "permission"]);

function fail(reason) {
  process.stdout.write(`${JSON.stringify({ ok: false, reason })}\n`);
  process.exit(2);
}

async function readInput() {
  const target = process.argv[2] ?? "-";
  if (target !== "-" && !target.startsWith("-")) {
    const text = await fs.readFile(target, "utf8");
    return JSON.parse(text);
  }
  const chunks = [];
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(chunks.join("") || "{}");
}

function gh(args) {
  try {
    const stdout = execFileSync("gh", args, { encoding: "utf8", timeout: 60000, maxBuffer: 16 * 1024 * 1024 });
    return { ok: true, stdout: String(stdout ?? "") };
  } catch (error) {
    const stderr = String(error?.stderr ?? error?.message ?? "gh failed").trim();
    return { ok: false, stdout: "", reason: stderr || "gh failed" };
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function main() {
  readInput().then((input) => {
    const operation = input.operation;
    const repository = input.repository;
    if (!ALLOWED.has(operation)) fail(`unknown operation ${String(operation)}`);
    if (typeof repository !== "string" || !/^[A-Za-z0-9-_.]+\/[A-Za-z0-9-_.]+$/.test(repository)) {
      fail("repository must be owner/name");
    }
    const host = input.host ?? "github.com";
    if (host !== "github.com") fail(`unsupported host ${host}`);
    if (operation === "repository") {
      const result = gh(["api", `repos/${repository}`]);
      if (!result.ok) fail(result.reason);
      const parsed = parseJson(result.stdout);
      const branch = parsed?.default_branch;
      if (typeof branch !== "string" || branch.trim() === "") fail("repository default branch is missing");
      process.stdout.write(`${JSON.stringify({ ok: true, repository, host, defaultBranch: branch })}\n`);
      return;
    }
    if (operation === "issue" || operation === "sub-issues" || operation === "blocked-by" || operation === "blocking") {
      const issueNumber = input.issueNumber ?? input.prNumber;
      if (!Number.isInteger(issueNumber) || issueNumber < 1) fail("issueNumber must be a positive integer");
      if (operation === "issue") {
        const issueRes = gh(["api", `repos/${repository}/issues/${issueNumber}`]);
        if (!issueRes.ok) fail(issueRes.reason);
        const raw = parseJson(issueRes.stdout);
        if (raw === null || typeof raw !== "object") fail("issue response is not JSON");
        const labels = Array.isArray(raw.labels) ? raw.labels.map((e) => (typeof e === "string" ? e : e?.name)).filter((n) => typeof n === "string") : [];
        const assignees = Array.isArray(raw.assignees) ? raw.assignees.map((e) => e?.login).filter((n) => typeof n === "string") : [];
        process.stdout.write(`${JSON.stringify({ ok: true, number: issueNumber, repository, state: raw.state ?? "open", title: raw.title ?? "", body: raw.body ?? "", labels, assignees })}\n`);
        return;
      }
      const endpoint = operation === "sub-issues"
        ? `repos/${repository}/issues/${issueNumber}/sub_issues`
        : operation === "blocked-by"
          ? `repos/${repository}/issues/${issueNumber}/dependencies/blocked_by`
          : `repos/${repository}/issues/${issueNumber}/dependencies/blocking`;
      const listRes = gh(["api", "--paginate", "--slurp", endpoint]);
      if (!listRes.ok) fail(listRes.reason);
      let pages = null;
      try {
        pages = JSON.parse(listRes.stdout);
      } catch {
        fail(`${operation} pages are not complete JSON`);
      }
      const flat = Array.isArray(pages) && pages.length > 0 && pages.every((p) => Array.isArray(p)) ? pages.flat() : pages;
      if (!Array.isArray(flat)) fail(`${operation} pages are not complete JSON`);
      const numbers = [];
      for (const entry of flat) {
        if (entry === null || typeof entry !== "object") fail(`${operation} entry is not an object`);
        const n = entry.number ?? entry.issue_number ?? entry.issue?.number;
        if (Number.isInteger(n)) numbers.push(n);
      }
      process.stdout.write(`${JSON.stringify({ ok: true, repository, issueNumber, numbers, status: "complete" })}\n`);
      return;
    }
    if (operation === "pull-request") {
      const prNumber = input.prNumber;
      if (!Number.isInteger(prNumber) || prNumber < 1) fail("prNumber must be a positive integer");
      const facts = readPullRequestFacts((args) => gh(args), repository, prNumber);
      if (facts.status.kind !== "complete") fail(`pull-request read ${facts.status.kind}: ${facts.status.reason}`);
      if (facts.closingStatus.kind !== "complete") fail(`closing-link read ${facts.closingStatus.kind}: ${facts.closingStatus.reason}`);
      process.stdout.write(
        `${JSON.stringify({
          ok: true,
          number: prNumber,
          repository,
          state: facts.state,
          draft: facts.draft,
          baseBranch: facts.baseBranch,
          baseSha: facts.baseSha,
          headBranch: facts.headBranch,
          headSha: facts.headSha,
          mergeable: facts.mergeable,
          mergeCommitSha: facts.mergeCommitSha,
          closingIssues: facts.closingIssues,
          closingStatus: "complete",
        })}\n`,
      );
      return;
    }
    const username = input.username;
    if (typeof username !== "string" || username.trim() === "") fail("username is required");
    const result = gh(["api", `repos/${repository}/collaborators/${username}/permission`]);
    if (!result.ok) {
      process.stdout.write(`${JSON.stringify({ ok: true, permission: "unknown", reason: result.reason })}\n`);
      return;
    }
    const parsed = parseJson(result.stdout);
    const permission = String(parsed?.permission ?? "unknown");
    process.stdout.write(`${JSON.stringify({ ok: true, permission })}\n`);
  }).catch(() => fail("input is not JSON"));
}

main();
