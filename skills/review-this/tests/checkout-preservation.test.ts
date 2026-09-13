// End-to-end regression for dirty-checkout preservation (ADR-0041).
//
// `prepare-checkout` is invoked through the real Node executable against a
// real temporary Git repository with a real `origin` remote serving the
// pinned pull-request head ref. Tests cover a deleted tracked file, combined
// staged/unstaged/untracked edits, failed snapshot identity, interruption
// reconciliation, ignored collisions, and the wrong-head restore guard. No
// live GitHub and no installed skill is touched.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PREPARE = path.join(import.meta.dirname, "..", "prepare-review.mjs");
const REPOSITORY = "owner/fixture";
const PR_NUMBER = 310;

interface CheckoutFixture {
  root: string;
  checkout: string;
  prHead: string;
  originalHead: string;
  env: Record<string, string>;
}

function git(args: string[], cwd: string, extraEnv: Record<string, string> = {}): string {
  const result = spawnSync("git", ["-c", "protocol.file.allow=always", "-c", "core.quotepath=false", ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return (result.stdout ?? "").trim();
}

function gitRaw(args: string[], cwd: string, extraEnv: Record<string, string> = {}): string {
  const result = spawnSync("git", ["-c", "protocol.file.allow=always", "-c", "core.quotepath=false", ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return (result.stdout ?? "");
}

function setupCheckout(): CheckoutFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prepare-checkout-"));
  const env = isolatedEnv(root);
  const origin = path.join(root, "origin.git");
  const checkout = path.join(root, "checkout");
  run(["git", "init", "--bare", "-q", origin], root, env);
  run(["git", "init", "-q", "-b", "work", checkout], root, env);
  fs.mkdirSync(path.join(checkout, ".kilo", "agent"), { recursive: true });
  fs.writeFileSync(path.join(checkout, ".kilo", "agent", "fix-this.md"), "# tracked agent file\n");
  fs.writeFileSync(path.join(checkout, "tracked.txt"), "original tracked content\n");
  fs.writeFileSync(path.join(checkout, "staged.txt"), "original staged content\n");
  run(["git", "add", "-A"], checkout, env);
  run(["git", "commit", "-q", "-m", "base"], checkout, env);
  run(["git", "remote", "add", "origin", origin], checkout, env);
  run(["git", "push", "-q", "origin", "work"], checkout, env);
  const originalHead = git(["rev-parse", "HEAD"], checkout, env);
  // The pinned pull-request head lives on the remote only: the local checkout
  // stays at the original head so alignment has work to do.
  run(["git", "checkout", "-q", "-b", "pr-head"], checkout, env);
  fs.writeFileSync(path.join(checkout, "reviewed.txt"), "reviewed content\n");
  run(["git", "add", "-A"], checkout, env);
  run(["git", "commit", "-q", "-m", "pr head"], checkout, env);
  run(["git", "push", "-q", "origin", "pr-head:refs/pull/310/head"], checkout, env);
  run(["git", "checkout", "-q", "work"], checkout, env);
  run(["git", "fetch", "-q", "origin", "refs/pull/310/head"], checkout, env);
  const prHead = git(["rev-parse", "FETCH_HEAD"], checkout, env);
  return { root, checkout, prHead, originalHead, env };
}

function run(args: readonly string[], cwd: string, extraEnv: Record<string, string> = {}): void {
  const result = spawnSync(args[0], args.slice(1), { cwd, encoding: "utf8", env: { ...process.env, ...extraEnv } });
  assert.equal(result.status, 0, `${args.join(" ")} failed: ${result.stderr}`);
}

// HOME isolation alone keeps the fixture's git identity and object-format
// settings out of the developer's global git config (e.g. core.quotepath).
// GIT_CONFIG_* is never passed: prepare-review.mjs only honors HOME.
function isolatedEnv(root: string): Record<string, string> {
  const home = path.join(root, "home");
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(path.join(home, ".gitconfig"), "[user]\n\temail = fixture@example.com\n\tname = Fixture\n");
  return { HOME: home };
}

function invoke(checkout: string, input: unknown, extraEnv: Record<string, string> = {}): { exit: number; stdout: any } {
  const inputPath = path.join(checkout, "..", `input-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
  fs.writeFileSync(inputPath, JSON.stringify(input));
  const runRoot = path.join(checkout, "..", "run");
  fs.mkdirSync(runRoot, { recursive: true });
  const result = spawnSync(process.execPath, [PREPARE, inputPath], {
    cwd: checkout,
    encoding: "utf8",
    timeout: 120000,
    env: { ...process.env, ...extraEnv, REVIEW_THIS_RUN_ROOT: runRoot },
  });
  let stdout: any = null;
  try {
    stdout = JSON.parse(result.stdout ?? "");
  } catch {
    stdout = { raw: result.stdout, stderr: result.stderr };
  }
  return { exit: result.status ?? -1, stdout };
}

function runDirFor(checkout: string, runId: string): string {
  return path.join(checkout, "..", "run", runId);
}

function readRecord(checkout: string, runId: string): any {
  return JSON.parse(fs.readFileSync(path.join(runDirFor(checkout, runId), "checkout-snapshot.json"), "utf8"));
}

function checkoutInput(fixture: CheckoutFixture, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    operation: "prepare-checkout",
    repository: REPOSITORY,
    prNumber: PR_NUMBER,
    pinnedHeadSha: fixture.prHead,
    runId: `preserve-${Math.random().toString(36).slice(2, 10)}`,
    ...overrides,
  };
}

// Raw NUL-delimited keys, mirroring prepare-review.mjs statusKeys including
// the paired rename field, so exotic filenames round-trip exactly.
function statusOf(checkout: string, extraEnv: Record<string, string> = {}): string[] {
  const raw = gitRaw(["status", "--porcelain=v1", "-z", "--untracked-files=all"], checkout, extraEnv).split("\0");
  if (raw.length > 0 && raw[raw.length - 1] === "") raw.pop();
  const keys: string[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const entry = raw[i];
    if (entry === "") continue;
    const xy = entry.slice(0, 2);
    const shown = entry.slice(3).replace(/\/$/, "");
    if (/^[RC]/.test(xy)) {
      const orig = (raw[i + 1] ?? "").replace(/\/$/, "");
      i += 1;
      keys.push(`${xy} ${shown} -> ${orig}`);
      continue;
    }
    keys.push(`${xy} ${shown}`);
  }
  return keys.sort();
}

function stashEntries(checkout: string, extraEnv: Record<string, string> = {}): string[] {
  const out = git(["stash", "list"], checkout, extraEnv);
  return out === "" ? [] : out.split("\n").map((line) => line.trim()).filter(Boolean);
}

// Make the worktree dirty in every supported way: a deleted tracked file, a
// staged edit, an unstaged edit, and one untracked file.
function dirtyWorktree(checkout: string, extraEnv: Record<string, string> = {}): void {
  fs.rmSync(path.join(checkout, ".kilo", "agent", "fix-this.md"));
  fs.writeFileSync(path.join(checkout, "staged.txt"), "edited staged content\n");
  run(["git", "add", "staged.txt"], checkout, extraEnv);
  fs.writeFileSync(path.join(checkout, "tracked.txt"), "edited tracked content\n");
  fs.writeFileSync(path.join(checkout, "untracked.txt"), "untracked content\n");
}

describe("dirty-checkout preservation through prepare-checkout", () => {
  test("preserves staged, unstaged, untracked, and deleted edits, then restores in the same checkout", () => {
    const fixture = setupCheckout();
    dirtyWorktree(fixture.checkout, fixture.env);
    const before = statusOf(fixture.checkout, fixture.env);
    assert.deepEqual(before, [
      " D .kilo/agent/fix-this.md",
      " M tracked.txt",
      "?? untracked.txt",
      "M  staged.txt",
    ]);

    const input = checkoutInput(fixture);
    const result = invoke(fixture.checkout, input, fixture.env);
    assert.equal(result.exit, 0, JSON.stringify(result.stdout));
    assert.equal(result.stdout.aligned, fixture.prHead);
    assert.ok(result.stdout.preserved, "preservation identity is reported");
    assert.match(result.stdout.preserved.snapshot, /^[a-f0-9]{40}$/);
    assert.equal(result.stdout.preserved.originalBranch, "work");
    assert.equal(result.stdout.preserved.originalHead, fixture.originalHead);

    // Post-checkout the tree is clean and at the pinned head.
    assert.equal(git(["rev-parse", "HEAD"], fixture.checkout, fixture.env), fixture.prHead);
    assert.deepEqual(statusOf(fixture.checkout, fixture.env), []);

    // The snapshot identity is a real commit reachable in this repository.
    assert.equal(git(["cat-file", "-t", result.stdout.preserved.snapshot], fixture.checkout, fixture.env), "commit");
    assert.equal(stashEntries(fixture.checkout, fixture.env).length, 1);

    // The record binds repository, PR, run, pinned head, and stash parent.
    const record = readRecord(fixture.checkout, (input as any).runId);
    assert.equal(record.repository, REPOSITORY);
    assert.equal(record.prNumber, PR_NUMBER);
    assert.equal(record.runId, (input as any).runId);
    assert.equal(record.pinnedHead, fixture.prHead);
    assert.equal(record.stashParent, fixture.originalHead);
    assert.equal(git(["rev-parse", `${record.snapshot}^1`], fixture.checkout, fixture.env), fixture.originalHead);
    assert.deepEqual([...record.status].sort(), before);

    // Restore in the same invoking checkout: return to the recorded original
    // revision first (restore binds the original checkout identity rather
    // than applying an arbitrary commit to an unrelated clone).
    run(["git", "checkout", "-q", "work"], fixture.checkout, fixture.env);
    run(["git", "reset", "-q", "--hard", fixture.originalHead], fixture.checkout, fixture.env);
    assert.deepEqual(statusOf(fixture.checkout, fixture.env), []);
    const restore = invoke(fixture.checkout, { operation: "restore-checkout", runId: (input as any).runId }, fixture.env);
    assert.equal(restore.exit, 0, JSON.stringify(restore.stdout));
    assert.equal(restore.stdout.restored, true);
    assert.equal(restore.stdout.snapshot, result.stdout.preserved.snapshot);
    assert.deepEqual(statusOf(fixture.checkout, fixture.env), before);
    assert.equal(fs.existsSync(path.join(fixture.checkout, ".kilo", "agent", "fix-this.md")), false, "the deletion restores as a deletion");
    assert.equal(fs.readFileSync(path.join(fixture.checkout, "staged.txt"), "utf8"), "edited staged content\n");
    assert.equal(fs.readFileSync(path.join(fixture.checkout, "tracked.txt"), "utf8"), "edited tracked content\n");
    assert.equal(fs.readFileSync(path.join(fixture.checkout, "untracked.txt"), "utf8"), "untracked content\n");
    assert.equal(git(["diff", "--cached", "--name-only"], fixture.checkout, fixture.env), "staged.txt", "the staged edit restores staged");
    // Snapshots are retained: no force cleanup drops the entry.
    assert.equal(stashEntries(fixture.checkout, fixture.env).length, 1);
  });

  test("a failed snapshot leaves the worktree untouched with no checkout effect", () => {
    const fixture = setupCheckout();
    dirtyWorktree(fixture.checkout, fixture.env);
    // Break snapshot object creation: a read-only objects directory makes
    // `stash push` fail before it records anything.
    const objectsDir = path.join(fixture.checkout, ".git", "objects");
    fs.chmodSync(objectsDir, 0o555);
    let result: { exit: number; stdout: any };
    try {
      result = invoke(fixture.checkout, checkoutInput(fixture), fixture.env);
    } finally {
      fs.chmodSync(objectsDir, 0o755);
    }
    assert.equal(result.exit, 1);
    assert.match(result.stdout.reason, /snapshot/, "the failure names preservation, not alignment");
    assert.equal(git(["rev-parse", "HEAD"], fixture.checkout, fixture.env), fixture.originalHead, "no checkout effect");
    assert.deepEqual(stashEntries(fixture.checkout, fixture.env), [], "no snapshot recorded");
    assert.ok(fs.existsSync(path.join(fixture.checkout, "untracked.txt")), "untracked edits survive");
    assert.equal(fs.readFileSync(path.join(fixture.checkout, "tracked.txt"), "utf8"), "edited tracked content\n", "unstaged edits survive");
    assert.equal(fs.readFileSync(path.join(fixture.checkout, "staged.txt"), "utf8"), "edited staged content\n", "staged edits survive");
    assert.equal(fs.existsSync(path.join(fixture.checkout, ".kilo", "agent", "fix-this.md")), false, "the deletion survives");
  });

  test("an interrupted preparation is reported instead of orphaned on the next run", () => {
    const runId = `interrupted-${Math.random().toString(36).slice(2, 10)}`;
    const fixture = setupCheckout();
    dirtyWorktree(fixture.checkout, fixture.env);
    const first = invoke(fixture.checkout, checkoutInput(fixture, { runId }));
    assert.equal(first.exit, 0, JSON.stringify(first.stdout));
    const snapshot = first.stdout.preserved.snapshot;
    // Interruption lands the checkout somewhere else with a clean tree. The
    // next run reports the verified snapshot instead of aligning silently.
    run(["git", "checkout", "-q", "work"], fixture.checkout, fixture.env);
    run(["git", "reset", "-q", "--hard", "HEAD"], fixture.checkout, fixture.env);
    const second = invoke(fixture.checkout, checkoutInput(fixture, { runId }));
    assert.equal(second.exit, 0, JSON.stringify(second.stdout));
    assert.equal(second.stdout.aligned, fixture.prHead);
    assert.equal(second.stdout.preserved.snapshot, snapshot, "the recorded snapshot is reused, not duplicated");
    assert.equal(stashEntries(fixture.checkout, fixture.env).length, 1, "no second snapshot is created");
  });

  test("clean marker-only interruption adopts the pushed entry without a second snapshot", () => {
    const runId = `marker-${Math.random().toString(36).slice(2, 10)}`;
    const fixture = setupCheckout();
    dirtyWorktree(fixture.checkout, fixture.env);
    const before = statusOf(fixture.checkout, fixture.env);
    // Simulate push-without-record: stash by hand with the exact run marker,
    // then delete the record write so only the marker entry exists.
    run(["git", "stash", "push", "--include-untracked", "--message", `review-this snapshot ${runId} work@${fixture.originalHead}`], fixture.checkout, fixture.env);
    assert.deepEqual(statusOf(fixture.checkout, fixture.env), [], "the manual push leaves a clean tree");
    const adopted = invoke(fixture.checkout, checkoutInput(fixture, { runId }));
    assert.equal(adopted.exit, 0, JSON.stringify(adopted.stdout));
    assert.equal(adopted.stdout.aligned, fixture.prHead);
    assert.ok(adopted.stdout.preserved, "the marker entry is adopted and reported");
    assert.equal(stashEntries(fixture.checkout, fixture.env).length, 1, "no second snapshot is created");
    const record = readRecord(fixture.checkout, runId);
    assert.equal(record.snapshot, adopted.stdout.preserved.snapshot);
    assert.deepEqual([...record.status].sort(), before);
  });

  test("immediate repeat at the clean pinned head reuses the record instead of stopping", () => {
    const runId = `repeat-${Math.random().toString(36).slice(2, 10)}`;
    const fixture = setupCheckout();
    dirtyWorktree(fixture.checkout, fixture.env);
    const first = invoke(fixture.checkout, checkoutInput(fixture, { runId }), fixture.env);
    assert.equal(first.exit, 0, JSON.stringify(first.stdout));
    // The first run already aligned the clean checkout to the pinned head
    // (interruption after alignment, before the response). The repeat must
    // reuse the record at the verified pinned head, not report an
    // original-branch mismatch.
    assert.equal(git(["rev-parse", "HEAD"], fixture.checkout, fixture.env), fixture.prHead);
    const second = invoke(fixture.checkout, checkoutInput(fixture, { runId }), fixture.env);
    assert.equal(second.exit, 0, JSON.stringify(second.stdout));
    assert.equal(second.stdout.aligned, fixture.prHead);
    assert.equal(second.stdout.preserved.snapshot, first.stdout.preserved.snapshot, "the record is reused at the pinned head");
    assert.equal(stashEntries(fixture.checkout, fixture.env).length, 1, "no second snapshot is created");
  });

  test("marker-only recovery restores renamed, added, and nested untracked files", () => {
    const fixture = setupCheckout();
    const runId = "mixed-marker";
    run(["git", "mv", "tracked.txt", "renamed.txt"], fixture.checkout, fixture.env);
    fs.appendFileSync(path.join(fixture.checkout, "renamed.txt"), "unstaged line\n");
    fs.writeFileSync(path.join(fixture.checkout, "added.txt"), "staged addition\n");
    run(["git", "add", "added.txt"], fixture.checkout, fixture.env);
    fs.appendFileSync(path.join(fixture.checkout, "added.txt"), "unstaged addition\n");
    fs.mkdirSync(path.join(fixture.checkout, "nested"));
    fs.writeFileSync(path.join(fixture.checkout, "nested", "new.txt"), "untracked\n");
    const before = statusOf(fixture.checkout, fixture.env);
    run(["git", "stash", "push", "--include-untracked", "--message", `review-this snapshot ${runId} work@${fixture.originalHead}`], fixture.checkout, fixture.env);
    const prepared = invoke(fixture.checkout, checkoutInput(fixture, { runId }), fixture.env);
    assert.equal(prepared.exit, 0, JSON.stringify(prepared.stdout));
    assert.deepEqual(readRecord(fixture.checkout, runId).status, before);
    run(["git", "checkout", "-q", "work"], fixture.checkout, fixture.env);
    const restore = invoke(fixture.checkout, { operation: "restore-checkout", runId }, fixture.env);
    assert.equal(restore.exit, 0, JSON.stringify(restore.stdout));
    assert.deepEqual(statusOf(fixture.checkout, fixture.env), before);
    assert.equal(fs.readFileSync(path.join(fixture.checkout, "added.txt"), "utf8"), "staged addition\nunstaged addition\n");
    assert.equal(fs.readFileSync(path.join(fixture.checkout, "nested", "new.txt"), "utf8"), "untracked\n");
  });

  test("new dirty work after alignment stops without replacing the snapshot", () => {
    const runId = `pinneddirty-${Math.random().toString(36).slice(2, 10)}`;
    const fixture = setupCheckout();
    dirtyWorktree(fixture.checkout, fixture.env);
    const first = invoke(fixture.checkout, checkoutInput(fixture, { runId }), fixture.env);
    assert.equal(first.exit, 0, JSON.stringify(first.stdout));
    // New unrelated edits appear after alignment, at the pinned head.
    fs.writeFileSync(path.join(fixture.checkout, "after.txt"), "after alignment\n");
    const second = invoke(fixture.checkout, checkoutInput(fixture, { runId }), fixture.env);
    assert.equal(second.exit, 1, JSON.stringify(second.stdout));
    assert.match(second.stdout.reason, /dirty again|reconcile/, "new dirt at the pinned head stops");
    assert.equal(git(["rev-parse", "HEAD"], fixture.checkout, fixture.env), fixture.prHead, "no checkout effect");
  });

  test("a record whose original branch moved stops without another checkout effect", () => {
    const runId = `moved-${Math.random().toString(36).slice(2, 10)}`;
    const fixture = setupCheckout();
    dirtyWorktree(fixture.checkout, fixture.env);
    const first = invoke(fixture.checkout, checkoutInput(fixture, { runId }), fixture.env);
    assert.equal(first.exit, 0, JSON.stringify(first.stdout));
    // Move the recorded branch while staying at the recorded head on a clean
    // tree: a new commit advances `work` ahead of the recorded revision, then
    // the checkout returns to the recorded head with no edits of its own.
    run(["git", "checkout", "-q", "work"], fixture.checkout, fixture.env);
    run(["git", "reset", "-q", "--hard", fixture.originalHead], fixture.checkout, fixture.env);
    fs.writeFileSync(path.join(fixture.checkout, "moved.txt"), "moved\n");
    run(["git", "add", "-A"], fixture.checkout, fixture.env);
    run(["git", "commit", "-q", "-m", "moved work"], fixture.checkout, fixture.env);
    run(["git", "checkout", "-q", "--detach", fixture.originalHead], fixture.checkout, fixture.env);
    const movedHead = git(["rev-parse", "HEAD"], fixture.checkout, fixture.env);
    assert.equal(movedHead, fixture.originalHead);
    assert.notEqual(git(["rev-parse", "work"], fixture.checkout, fixture.env), fixture.originalHead);
    assert.deepEqual(statusOf(fixture.checkout, fixture.env), [], "clean tree at the recorded head");
    const second = invoke(fixture.checkout, checkoutInput(fixture, { runId }), fixture.env);
    assert.equal(second.exit, 1);
    assert.match(second.stdout.reason, /moved from the recorded original revision/);
    assert.equal(git(["rev-parse", "HEAD"], fixture.checkout, fixture.env), movedHead, "no checkout effect");
  });

  test("a malformed record fails closed instead of snapshotting again", () => {
    const runId = `malformed-${Math.random().toString(36).slice(2, 10)}`;
    const fixture = setupCheckout();
    dirtyWorktree(fixture.checkout, fixture.env);
    const first = invoke(fixture.checkout, checkoutInput(fixture, { runId }), fixture.env);
    assert.equal(first.exit, 0, JSON.stringify(first.stdout));
    // Corrupt the durable record after a successful run.
    fs.writeFileSync(path.join(runDirFor(fixture.checkout, runId), "checkout-snapshot.json"), "{not json");
    run(["git", "checkout", "-q", "work"], fixture.checkout, fixture.env);
    run(["git", "reset", "-q", "--hard", fixture.originalHead], fixture.checkout, fixture.env);
    assert.deepEqual(statusOf(fixture.checkout, fixture.env), [], "clean tree for the retry");
    const second = invoke(fixture.checkout, checkoutInput(fixture, { runId }), fixture.env);
    assert.equal(second.exit, 1, JSON.stringify(second.stdout));
    assert.match(second.stdout.reason, /snapshot record/, "the malformed record fails closed");
    assert.equal(stashEntries(fixture.checkout, fixture.env).length, 1, "no second snapshot is created");
    assert.equal(git(["rev-parse", "HEAD"], fixture.checkout, fixture.env), fixture.originalHead, "no checkout effect");
  });

  test("a record for another run or target is never applied", () => {
    const runId = `foreign-${Math.random().toString(36).slice(2, 10)}`;
    const fixture = setupCheckout();
    dirtyWorktree(fixture.checkout, fixture.env);
    const first = invoke(fixture.checkout, checkoutInput(fixture, { runId }), fixture.env);
    assert.equal(first.exit, 0, JSON.stringify(first.stdout));
    run(["git", "checkout", "-q", "work"], fixture.checkout, fixture.env);
    run(["git", "reset", "-q", "--hard", fixture.originalHead], fixture.checkout, fixture.env);
    // Same run directory name is required for lookup, so point another runId
    // at the foreign record by copying the run directory.
    const otherRunId = `other-${Math.random().toString(36).slice(2, 10)}`;
    fs.cpSync(runDirFor(fixture.checkout, runId), runDirFor(fixture.checkout, otherRunId), { recursive: true });
    const second = invoke(fixture.checkout, checkoutInput(fixture, { runId: otherRunId }), fixture.env);
    assert.equal(second.exit, 1, JSON.stringify(second.stdout));
    assert.match(second.stdout.reason, /different target|snapshot record/, "the foreign record is rejected");
    assert.equal(git(["rev-parse", "HEAD"], fixture.checkout, fixture.env), fixture.originalHead, "no checkout effect");
    const restore = invoke(fixture.checkout, { operation: "restore-checkout", runId: otherRunId }, fixture.env);
    assert.equal(restore.exit, 1, JSON.stringify(restore.stdout));
    assert.deepEqual(statusOf(fixture.checkout, fixture.env), [], "a foreign run never restores edits");
  });

  test("snapshot records bind the alignment pin and original checkout", () => {
    const fixture = setupCheckout();
    dirtyWorktree(fixture.checkout, fixture.env);
    const input = checkoutInput(fixture);
    const prepared = invoke(fixture.checkout, input, fixture.env);
    assert.equal(prepared.exit, 0, JSON.stringify(prepared.stdout));
    const runId = input.runId as string;
    const file = path.join(runDirFor(fixture.checkout, runId), "checkout-snapshot.json");
    const record = readRecord(fixture.checkout, runId);
    fs.writeFileSync(file, JSON.stringify({ ...record, pinnedHead: fixture.originalHead }));
    assert.equal(invoke(fixture.checkout, input, fixture.env).exit, 1, "changed record pin must stop");
    fs.writeFileSync(file, JSON.stringify(record));
    const clone = path.join(fixture.root, "other-checkout");
    run(["git", "clone", "-q", fixture.checkout, clone], fixture.root, fixture.env);
    run(["git", "fetch", "-q", fixture.checkout, record.snapshot], clone, fixture.env);
    run(["git", "checkout", "-q", "-b", "work", fixture.originalHead], clone, fixture.env);
    const restore = invoke(clone, { operation: "restore-checkout", runId }, fixture.env);
    assert.equal(restore.exit, 1, JSON.stringify(restore.stdout));
    assert.deepEqual(statusOf(clone, fixture.env), [], "matching commits never authorize another checkout");
  });

  test("fresh dirty entry at the pinned head preserves edits and restores exactly", () => {
    const fixture = setupCheckout();
    run(["git", "checkout", "-q", "pr-head"], fixture.checkout, fixture.env);
    dirtyWorktree(fixture.checkout, fixture.env);
    const before = statusOf(fixture.checkout, fixture.env);
    const input = checkoutInput(fixture);
    const prepared = invoke(fixture.checkout, input, fixture.env);
    assert.equal(prepared.exit, 0, JSON.stringify(prepared.stdout));
    assert.equal(prepared.stdout.preserved.originalHead, fixture.prHead);
    run(["git", "checkout", "-q", "pr-head"], fixture.checkout, fixture.env);
    const restore = invoke(fixture.checkout, { operation: "restore-checkout", runId: input.runId }, fixture.env);
    assert.equal(restore.exit, 0, JSON.stringify(restore.stdout));
    assert.deepEqual(statusOf(fixture.checkout, fixture.env), before);
  });

  test("a similar run-id prefix never adopts another run's marker", () => {
    const fixture = setupCheckout();
    dirtyWorktree(fixture.checkout, fixture.env);
    const first = invoke(fixture.checkout, checkoutInput(fixture, { runId: "prefixrun10" }), fixture.env);
    assert.equal(first.exit, 0, JSON.stringify(first.stdout));
    run(["git", "checkout", "-q", "work"], fixture.checkout, fixture.env);
    run(["git", "reset", "-q", "--hard", fixture.originalHead], fixture.checkout, fixture.env);
    // `prefixrun` must not adopt the `prefixrun10` marker entry.
    fs.writeFileSync(path.join(fixture.checkout, "fresh.txt"), "fresh\n");
    const second = invoke(fixture.checkout, checkoutInput(fixture, { runId: "prefixrun" }), fixture.env);
    assert.equal(second.exit, 0, JSON.stringify(second.stdout));
    assert.notEqual(second.stdout.preserved.snapshot, first.stdout.preserved.snapshot, "a fresh snapshot is taken");
    assert.equal(stashEntries(fixture.checkout, fixture.env).length, 2);
  });

  test("an ignored-file collision stops without touching the ignored file", () => {
    const fixture = setupCheckout();
    run(["git", "branch", "-D", "pr-head"], fixture.checkout, fixture.env);
    fs.writeFileSync(path.join(fixture.checkout, ".gitignore"), "collided.txt\n");
    run(["git", "add", "-A"], fixture.checkout, fixture.env);
    run(["git", "commit", "-q", "-m", "ignore rule"], fixture.checkout, fixture.env);
    run(["git", "push", "-q", "origin", "work"], fixture.checkout, fixture.env);
    const base = git(["rev-parse", "HEAD"], fixture.checkout, fixture.env);
    // The pinned head adds a tracked file at the same path the ignored file occupies.
    run(["git", "checkout", "-q", "-b", "pr-head"], fixture.checkout, fixture.env);
    fs.writeFileSync(path.join(fixture.checkout, "collided.txt"), "tracked collision content\n");
    run(["git", "add", "-f", "collided.txt"], fixture.checkout, fixture.env);
    run(["git", "commit", "-q", "-m", "pr head with collision"], fixture.checkout, fixture.env);
    run(["git", "push", "-q", "--force", "origin", "pr-head:refs/pull/310/head"], fixture.checkout, fixture.env);
    run(["git", "fetch", "-q", "origin", "refs/pull/310/head"], fixture.checkout, fixture.env);
    const collidedHead = git(["rev-parse", "FETCH_HEAD"], fixture.checkout, fixture.env);
    run(["git", "checkout", "-q", "work"], fixture.checkout, fixture.env);
    // Back on the base: the ignored file exists where the pinned head tracks one.
    fs.writeFileSync(path.join(fixture.checkout, "collided.txt"), "ignored content\n");
    assert.deepEqual(statusOf(fixture.checkout, fixture.env), []);

    const result = invoke(fixture.checkout, checkoutInput(fixture, { pinnedHeadSha: collidedHead }));
    assert.equal(result.exit, 1);
    assert.match(result.stdout.reason, /ignored-file collision/);
    assert.equal(git(["rev-parse", "HEAD"], fixture.checkout, fixture.env), base, "no checkout effect");
    assert.equal(fs.readFileSync(path.join(fixture.checkout, "collided.txt"), "utf8"), "ignored content\n", "ignored file untouched");
    assert.deepEqual(stashEntries(fixture.checkout, fixture.env), [], "no snapshot taken before the stop");
  });

  test("restore-checkout at a different revision stops and keeps the snapshot", () => {
    const runId = `wronghead-${Math.random().toString(36).slice(2, 10)}`;
    const fixture = setupCheckout();
    dirtyWorktree(fixture.checkout, fixture.env);
    const prepared = invoke(fixture.checkout, checkoutInput(fixture, { runId }), fixture.env);
    assert.equal(prepared.exit, 0, JSON.stringify(prepared.stdout));
    const snapshot = prepared.stdout.preserved.snapshot;
    // The aligned checkout sits at the pinned head: the wrong revision for restore.
    const restore = invoke(fixture.checkout, {
      operation: "restore-checkout",
      runId,
    }, fixture.env);
    assert.equal(restore.exit, 1);
    assert.match(restore.stdout.reason, /different revision/);
    assert.match(restore.stdout.reason, /manually/);
    assert.equal(git(["cat-file", "-t", snapshot], fixture.checkout, fixture.env), "commit", "snapshot stays recoverable");
    assert.equal(git(["rev-parse", "HEAD"], fixture.checkout, fixture.env), fixture.prHead, "no checkout effect");
    run(["git", "checkout", "-q", "work"], fixture.checkout, fixture.env);
    fs.writeFileSync(path.join(fixture.checkout, ".git", "MERGE_HEAD"), `${fixture.prHead}\n`);
    const duringMerge = invoke(fixture.checkout, { operation: "restore-checkout", runId }, fixture.env);
    assert.equal(duringMerge.exit, 1, JSON.stringify(duringMerge.stdout));
    assert.match(duringMerge.stdout.reason, /unfinished git operation/);
    assert.deepEqual(statusOf(fixture.checkout, fixture.env), [], "an unknown operation remains untouched");
  });

  test("restore preserves exotic filenames and staged-plus-unstaged contents", () => {
    const runId = `exotic-${Math.random().toString(36).slice(2, 10)}`;
    const fixture = setupCheckout();
    const spaced = path.join(fixture.checkout, "with space.txt");
    const newline = path.join(fixture.checkout, "line\nbreak.txt");
    fs.writeFileSync(path.join(fixture.checkout, "staged.txt"), "staged part\n");
    run(["git", "add", "staged.txt"], fixture.checkout, fixture.env);
    fs.writeFileSync(path.join(fixture.checkout, "staged.txt"), "staged part\nplus unstaged\n");
    fs.writeFileSync(path.join(fixture.checkout, "tracked.txt"), "edited tracked content\n");
    fs.writeFileSync(spaced, "spaced content\n");
    fs.writeFileSync(newline, "newline content\n");
    const before = statusOf(fixture.checkout, fixture.env);
    assert.ok(before.some((key) => key.includes("with space.txt")), "spaced file is tracked in the listing");
    assert.ok(before.some((key) => key.includes("line\nbreak.txt")), "newline file round-trips raw");

    const prepared = invoke(fixture.checkout, checkoutInput(fixture, { runId }), fixture.env);
    assert.equal(prepared.exit, 0, JSON.stringify(prepared.stdout));
    const record = readRecord(fixture.checkout, runId);
    assert.deepEqual([...record.status].sort(), before, "the record stores exact keys");

    run(["git", "checkout", "-q", "work"], fixture.checkout, fixture.env);
    run(["git", "reset", "-q", "--hard", fixture.originalHead], fixture.checkout, fixture.env);
    const restore = invoke(fixture.checkout, { operation: "restore-checkout", runId }, fixture.env);
    assert.equal(restore.exit, 0, JSON.stringify(restore.stdout));
    assert.deepEqual(statusOf(fixture.checkout, fixture.env), before);
    assert.equal(fs.readFileSync(spaced, "utf8"), "spaced content\n");
    assert.equal(fs.readFileSync(newline, "utf8"), "newline content\n");
    assert.equal(fs.readFileSync(path.join(fixture.checkout, "staged.txt"), "utf8"), "staged part\nplus unstaged\n");
    assert.equal(git(["diff", "--cached", "--name-only"], fixture.checkout, fixture.env), "staged.txt", "the staged side restores staged");
  });
});
