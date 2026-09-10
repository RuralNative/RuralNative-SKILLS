// Real-executable regression for the scoped evidence repair (ADR-0039).
//
// The non-dry-run `prepare-review.mjs` recovery branch is invoked through the
// real Node executable against an isolated checkout and run fixture. A
// PATH-scoped fake `gh` records exact argv and maintains pull-request body
// state. The test requires exactly one body-only PATCH, a native read-back, and
// acceptance by the actual bundled `workflow-cli.mjs evidence`. No live GitHub
// and no installed skill is touched.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  countEvidenceBlocks,
  locateEvidenceRepairRecord,
  parseEvidenceRepairRecord,
  renderCompactEvidence,
  renderEvidenceRepairRecord,
  requirementsRevision,
  requirementsRevisionValue,
  resolveRequirementsBody,
} from "../workflow-state.ts";
import { incidentParentBody, incidentTicketBody } from "../../../tests/incident-fixtures.ts";

const HASH = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");
const REPOSITORY = "owner/eScraper-Business-Brokers-for-Seacher-Insights";
const TICKET = 289;
const PARENT = 287;
const PREPARE = path.join(import.meta.dirname, "..", "prepare-review.mjs");

const BOUNDARY = {
  packageManager: "npm",
  frozenArgs: ["ci", "--ignore-scripts"],
  allowedPaths: ["node_modules/", ".npm/", "~/.npm/"],
  ignoreScripts: true,
};

// The #297 incident carried seven active ticket criteria and four proof
// commands. The parent body is unchanged; the ticket is the incident template
// with the last two criteria removed.
function ticket297Body(): string {
  return incidentTicketBody()
    .split("\n")
    .filter((line) => !/^- \[ \] `AC-(8|9)`:/.test(line))
    .join("\n");
}

function currentRequirementsRevision(): string {
  return requirementsRevisionValue(requirementsRevision(incidentParentBody(), ticket297Body(), HASH));
}

function staleAdaptedPin(current: string): string {
  const m = current.match(/^(requirements-adapted-v1:parent=)([a-f0-9]{64})(;ticket=)([a-f0-9]{64})$/);
  assert.ok(m, "fixture pin must be requirements-adapted-v1");
  const flip = (hash: string): string => hash.slice(0, -1) + (hash.endsWith("0") ? "1" : "0");
  return `${m[1]}${flip(m[2])}${m[3]}${flip(m[4])}`;
}

function staleEvidenceBlock(stalePin: string, headSha: string): string {
  const ticket = resolveRequirementsBody(ticket297Body(), "ticket");
  assert.equal(ticket.ok, true);
  return renderCompactEvidence({
    criteria: ticket.ok ? ticket.criteria : [],
    evidence: (ticket.ok ? ticket.criteria : []).map((criterion) => ({
      criterionId: criterion.id,
      kind: "non-behavior" as const,
      rationale: `narrow fixture check for ${criterion.id}`,
    })),
    isBugFix: false,
    requirementsRevision: stalePin,
    headSha,
  });
}

function checksFor(ticketBody: string, commands: readonly string[], overrideCriterion?: string): unknown[] {
  const ticket = resolveRequirementsBody(ticketBody, "ticket");
  assert.equal(ticket.ok, true);
  if (!ticket.ok) return [];
  return ticket.criteria
    .filter((criterion) => criterion.status === "active")
    .map((criterion, index) => ({
      criterionId: criterion.id,
      kind: "non-behavior",
      command:
        overrideCriterion === criterion.id
          ? "node scripts/failing-check.mjs"
          : commands[index % commands.length],
      rationale: `narrow fixture check for ${criterion.id}`,
    }));
}

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
const repository = state.repository;
const resource = args.find((arg) => typeof arg === "string" && arg.startsWith("repos/")) ?? "";
function emit(value) { process.stdout.write(typeof value === "string" ? value : JSON.stringify(value)); }
function prJson() {
  return {
    number: state.prNumber,
    state: "open",
    draft: false,
    merged_at: null,
    body: state.body,
    base: { ref: "main", sha: state.baseSha },
    head: { ref: "feature", sha: state.headSha, repo: { full_name: repository } },
  };
}
if (args[0] === "api" && args[1] === "user") { emit("reviewer"); process.exit(0); }
if (args[0] === "api" && typeof args[1] === "string" && args[1].includes("/collaborators/")) { emit({ permission: "write" }); process.exit(0); }
if (args[0] === "api" && args[1] === "--method" && args[2] === "PATCH") {
  const bodyArg = args.find((arg) => typeof arg === "string" && arg.startsWith("body="));
  if (bodyArg) {
    state.body = bodyArg.slice("body=".length);
    fs.writeFileSync(statePath, JSON.stringify(state));
  }
  emit(prJson());
  process.exit(0);
}
if (args[0] === "api" && args.includes("--paginate") && resource.endsWith("/timeline")) {
  emit([[{ event: "connected", source: { issue: { html_url: "https://github.com/" + repository + "/issues/" + state.ticketNumber } } }]]);
  process.exit(0);
}
if (resource.endsWith("/parent")) { emit({ number: state.parentNumber }); process.exit(0); }
const issueMatch = resource.match(/\/issues\/(\d+)$/);
if (issueMatch) {
  const number = Number(issueMatch[1]);
  const body = number === state.ticketNumber ? state.ticketBody : number === state.parentNumber ? state.parentBody : "";
  emit({ number, state: "open", body });
  process.exit(0);
}
const prMatch = resource.match(/\/pulls\/(\d+)$/);
if (prMatch) { emit(prJson()); process.exit(0); }
process.stderr.write("unhandled fake gh args: " + JSON.stringify(args));
process.exit(1);
`;

interface Fixture {
  root: string;
  checkout: string;
  fakeBin: string;
  statePath: string;
  callsPath: string;
  headSha: string;
  baseSha: string;
}

function run(args: readonly string[], cwd: string): void {
  const result = spawnSync(args[0], args.slice(1), { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `${args.join(" ")} failed: ${result.stderr}`);
}

function setupFixture(staleBody: (headSha: string) => string): Fixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prepare-repair-"));
  const checkout = path.join(root, "checkout");
  const fakeBin = path.join(root, "bin");
  fs.mkdirSync(path.join(checkout, "scripts"), { recursive: true });
  fs.mkdirSync(fakeBin, { recursive: true });
  fs.writeFileSync(
    path.join(checkout, "package.json"),
    JSON.stringify(
      {
        name: "repair-fixture",
        private: true,
        type: "module",
        scripts: {
          "docs:check": "node scripts/docs-check-fixture.mjs",
          "docs:diagrams": "node scripts/docs-diagram-fixture.mjs",
          "docs:diagrams:render": "node scripts/docs-render-fixture.mjs",
        },
      },
      null,
      2,
    ),
  );
  for (const file of [
    "docs-check-fixture.mjs",
    "docs-diagram-fixture.mjs",
    "docs-render-fixture.mjs",
    "evidence-check.mjs",
  ]) {
    fs.writeFileSync(path.join(checkout, "scripts", file), 'process.stdout.write("fixture check ok\\n");\n');
  }
  fs.writeFileSync(path.join(checkout, "scripts", "failing-check.mjs"), "process.exit(1);\n");
  fs.writeFileSync(
    path.join(checkout, "scripts", "huge-check.mjs"),
    'process.stdout.write("x".repeat(600000));\n',
  );
  const fakeGh = path.join(fakeBin, "gh");
  fs.writeFileSync(fakeGh, FAKE_GH);
  fs.chmodSync(fakeGh, 0o755);
  run(["git", "init", "-q"], checkout);
  run(["git", "config", "user.email", "fixture@example.com"], checkout);
  run(["git", "config", "user.name", "Fixture"], checkout);
  run(["git", "add", "-A"], checkout);
  run(["git", "commit", "-q", "-m", "fixture"], checkout);
  run(["git", "remote", "add", "origin", `https://github.com/${REPOSITORY}`], checkout);
  const headSha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: checkout, encoding: "utf8" }).stdout.trim();
  const baseSha = "b".repeat(40);
  const statePath = path.join(fakeBin, "gh-state.json");
  fs.writeFileSync(
    statePath,
    JSON.stringify({
      repository: REPOSITORY,
      prNumber: 297,
      headSha,
      baseSha,
      body: staleBody(headSha),
      ticketBody: ticket297Body(),
      parentBody: incidentParentBody(),
      ticketNumber: TICKET,
      parentNumber: PARENT,
    }),
  );
  return { root, checkout, fakeBin, statePath, callsPath: path.join(fakeBin, "gh-calls.jsonl"), headSha, baseSha };
}

function inputFor(
  fixture: Fixture,
  ticketBody: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    operation: "recover-evidence",
    repository: REPOSITORY,
    prNumber: 297,
    headSha: fixture.headSha,
    baseSha: fixture.baseSha,
    runId: `repair-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ticketNumber: TICKET,
    parentNumber: PARENT,
    boundary: BOUNDARY,
    approvedCommands: [
      "docs:check",
      "docs:diagrams",
      "docs:diagrams:render",
      "node scripts/evidence-check.mjs",
      "node scripts/failing-check.mjs",
    ],
    // Observed verification intent: all four #297 proof commands, whether or
    // not a criterion maps to them.
    requiredCommands: [
      "npm run docs:check",
      "node scripts/evidence-check.mjs",
      "npm run docs:diagrams",
      "npm run docs:diagrams:render",
    ],
    governingSources: [],
    checks: checksFor(ticketBody, [
      "npm run docs:check",
      "node scripts/evidence-check.mjs",
      "npm run docs:diagrams",
      "npm run docs:diagrams:render",
    ]),
    ...overrides,
  };
}

function invoke(fixture: Fixture, input: unknown): { exit: number; stdout: any } {
  const inputPath = path.join(fixture.root, "input.json");
  fs.writeFileSync(inputPath, JSON.stringify(input));
  const result = spawnSync(process.execPath, [PREPARE, inputPath], {
    cwd: fixture.checkout,
    encoding: "utf8",
    timeout: 120000,
    env: { ...process.env, PATH: `${fixture.fakeBin}:${process.env.PATH ?? ""}` },
  });
  let stdout: any = null;
  try {
    stdout = JSON.parse(result.stdout ?? "");
  } catch {
    stdout = { raw: result.stdout, stderr: result.stderr };
  }
  return { exit: result.status ?? -1, stdout };
}

function patches(fixture: Fixture): string[][] {
  if (!fs.existsSync(fixture.callsPath)) return [];
  return fs
    .readFileSync(fixture.callsPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as string[])
    .filter((args) => args[1] === "--method" && args[2] === "PATCH");
}

describe("prepare-review.mjs scoped evidence repair", () => {
  test("a stale supported pin repairs with exactly one body-only PATCH and accepted read-back", () => {
    const current = currentRequirementsRevision();
    const stale = staleAdaptedPin(current);
    const fixture = setupFixture((headSha) => {
      const block = staleEvidenceBlock(stale, headSha);
      return `P1 — governed reconstruction.\n\n${block}\n\nCloses #${TICKET}\n`;
    });
    const result = invoke(fixture, inputFor(fixture, ticket297Body()));
    assert.equal(result.exit, 0, JSON.stringify(result.stdout));
    assert.equal(result.stdout.repaired, true);
    assert.equal(result.stdout.ready, true);

    const writes = patches(fixture);
    assert.equal(writes.length, 1, "exactly one body-only PATCH");
    const [write] = writes;
    assert.deepEqual(write.slice(0, 4), ["api", "--method", "PATCH", `repos/${REPOSITORY}/pulls/297`]);
    assert.equal(write.length, 6, "only the body field is written");
    assert.ok(write[4] === "-f" && write[5].startsWith("body="), "the PATCH carries only body");

    const written = write[5].slice("body=".length);
    assert.ok(written.startsWith("P1 — governed reconstruction."), "outside prefix preserved");
    assert.ok(written.endsWith(`Closes #${TICKET}\n`), "outside suffix preserved");
    assert.equal(countEvidenceBlocks(written), 1);
    assert.equal(parseEvidenceRepairRecord(written).found, true);
    assert.equal(locateEvidenceRepairRecord(written).location, "inside");

    // The read-back state is the written candidate and the consumer accepted it.
    const state = JSON.parse(fs.readFileSync(fixture.statePath, "utf8"));
    assert.equal(state.body, written);
    const consumer = spawnSync(
      process.execPath,
      [path.join(import.meta.dirname, "..", "workflow-cli.mjs"), "evidence", "-"],
      {
        cwd: fixture.checkout,
        encoding: "utf8",
        input: JSON.stringify({
          pullRequestBody: written,
          parentBody: incidentParentBody(),
          ticketBody: ticket297Body(),
          headSha: fixture.headSha,
        }),
      },
    );
    assert.equal(consumer.status, 0, consumer.stdout);
  });

  test("a failing repair check retains the old evidence with blockers and never writes", () => {
    const current = currentRequirementsRevision();
    const stale = staleAdaptedPin(current);
    const fixture = setupFixture((headSha) => {
      const block = staleEvidenceBlock(stale, headSha);
      return `P1 — governed reconstruction.\n\n${block}\n\nCloses #${TICKET}\n`;
    });
    const ticket = resolveRequirementsBody(ticket297Body(), "ticket");
    assert.equal(ticket.ok, true);
    const first = ticket.ok ? ticket.criteria.filter((c) => c.status === "active")[0].id : "";
    const result = invoke(
      fixture,
      inputFor(fixture, ticket297Body(), {
        checks: checksFor(
          ticket297Body(),
          ["npm run docs:check", "node scripts/evidence-check.mjs", "npm run docs:diagrams", "npm run docs:diagrams:render"],
          first,
        ),
      }),
    );
    assert.equal(result.exit, 0, JSON.stringify(result.stdout));
    assert.equal(result.stdout.repaired, false);
    assert.equal(result.stdout.ready, false);
    assert.equal(result.stdout.outcome.kind, "reviewable-with-blockers");
    assert.equal(patches(fixture).length, 0, "no write on a real check failure");
  });

  test("a genuinely absent pin in an otherwise valid block repairs", () => {
    const current = currentRequirementsRevision();
    const fixture = setupFixture((headSha) => {
      const block = staleEvidenceBlock(staleAdaptedPin(current), headSha).replace(
        /^- Requirements revision:.*\n/m,
        "",
      );
      return `P1.\n\n${block}\n\nCloses #${TICKET}\n`;
    });
    const result = invoke(fixture, inputFor(fixture, ticket297Body()));
    assert.equal(result.exit, 0, JSON.stringify(result.stdout));
    assert.equal(result.stdout.repaired, true);
    assert.equal(patches(fixture).length, 1, "absent-pin repair writes exactly once");
    const written = patches(fixture)[0][5].slice("body=".length);
    assert.ok(written.includes(`Requirements revision: ${current}`));
    assert.equal(countEvidenceBlocks(written), 1);
  });

  test("a dirty checkout is a restriction and never writes", () => {
    const current = currentRequirementsRevision();
    const fixture = setupFixture((headSha) => {
      const block = staleEvidenceBlock(staleAdaptedPin(current), headSha);
      return `P1.\n\n${block}\n\nCloses #${TICKET}\n`;
    });
    fs.writeFileSync(path.join(fixture.checkout, "untracked.txt"), "dirty\n");
    const result = invoke(fixture, inputFor(fixture, ticket297Body()));
    assert.equal(result.exit, 1, JSON.stringify(result.stdout));
    assert.equal(result.stdout.kind, "restricted");
    assert.equal(patches(fixture).length, 0);
  });

  test("an obsolete decision-only request is rejected explicitly", () => {
    const fixture = setupFixture((headSha) => {
      const block = staleEvidenceBlock(staleAdaptedPin(currentRequirementsRevision()), headSha);
      return `P1.\n\n${block}\n\nCloses #${TICKET}\n`;
    });
    const result = invoke(fixture, {
      operation: "recover-evidence",
      repository: REPOSITORY,
      prNumber: 297,
      headSha: fixture.headSha,
      baseSha: fixture.baseSha,
      classification: "revision-mismatch",
      currentScopeResolved: true,
      proofRevalidated: true,
      unambiguousBlock: true,
      historicalBugRedPreserved: true,
    });
    assert.equal(result.exit, 2);
    assert.match(String(result.stdout.reason ?? ""), /decision-only/);
    assert.equal(patches(fixture).length, 0);
  });

  test("a required command outside any criterion mapping is still executed and recorded", () => {
    const current = currentRequirementsRevision();
    const stale = staleAdaptedPin(current);
    const fixture = setupFixture((headSha) => `P1.\n\n${staleEvidenceBlock(stale, headSha)}\n\nCloses #${TICKET}\n`);
    // Criteria all map to one command; the observed verification intent lists
    // all four. The other three must still run.
    const result = invoke(
      fixture,
      inputFor(fixture, ticket297Body(), { checks: checksFor(ticket297Body(), ["npm run docs:check"]) }),
    );
    assert.equal(result.exit, 0, JSON.stringify(result.stdout));
    assert.equal(result.stdout.repaired, true);
    const written = patches(fixture)[0][5].slice("body=".length);
    assert.ok(written.includes("node scripts/evidence-check.mjs"), "unmapped required command recorded");
    assert.ok(written.includes("npm run docs:diagrams"), "second unmapped required command recorded");
  });

  test("an existing failed behavior record cannot be downgraded to non-behavior", () => {
    const current = currentRequirementsRevision();
    const stale = staleAdaptedPin(current);
    const fixture = setupFixture((headSha) => {
      const ticket = resolveRequirementsBody(ticket297Body(), "ticket");
      assert.equal(ticket.ok, true);
      const criteria = ticket.ok ? ticket.criteria : [];
      const block = renderCompactEvidence({
        criteria,
        evidence: criteria.map((criterion, index) =>
          index === 0
            ? {
                criterionId: criterion.id,
                kind: "behavior" as const,
                focusedCommand: "node scripts/docs-check-fixture.mjs",
                result: `${criterion.id} failing`,
                passed: true,
              }
            : { criterionId: criterion.id, kind: "non-behavior" as const, rationale: `check ${criterion.id}` },
        ),
        isBugFix: false,
        requirementsRevision: stale,
        headSha,
      }).replace("- Passed: true", "- Passed: false");
      return `P1.\n\n${block}\n\nCloses #${TICKET}\n`;
    });
    const result = invoke(fixture, inputFor(fixture, ticket297Body()));
    assert.equal(result.exit, 1, JSON.stringify(result.stdout));
    assert.equal(result.stdout.kind, "restricted");
    assert.match(String(result.stdout.reason), /downgrad/);
    assert.equal(patches(fixture).length, 0, "a downgrade never writes");
  });

  test("multiline RED output is preserved verbatim through repair", () => {
    const current = currentRequirementsRevision();
    const stale = staleAdaptedPin(current);
    const redOutput = "TypeError: boom\n  at first (a.ts:1)\nsecond line";
    const fixture = setupFixture((headSha) => {
      const ticket = resolveRequirementsBody(ticket297Body(), "ticket");
      assert.equal(ticket.ok, true);
      const criteria = ticket.ok ? ticket.criteria : [];
      const block = renderCompactEvidence({
        criteria,
        evidence: criteria.map((criterion) => ({
          criterionId: criterion.id,
          kind: "non-behavior" as const,
          rationale: `check ${criterion.id}`,
        })),
        isBugFix: true,
        bugRedCommand: "node --test tests/bug.test.ts",
        bugRedOutput: redOutput,
        requirementsRevision: stale,
        headSha,
      });
      return `P1.\n\n${block}\n\nCloses #${TICKET}\n`;
    });
    const result = invoke(fixture, inputFor(fixture, ticket297Body()));
    assert.equal(result.exit, 0, JSON.stringify(result.stdout));
    assert.equal(result.stdout.repaired, true);
    const written = patches(fixture)[0][5].slice("body=".length);
    assert.ok(written.includes("at first (a.ts:1)"), "RED middle line preserved");
    assert.ok(written.includes("second line"), "RED continuation preserved");
  });

  test("a current pin with an out-of-region repair record is a restriction, never ready", () => {
    const current = currentRequirementsRevision();
    const fixture = setupFixture((headSha) => {
      const block = staleEvidenceBlock(current, headSha);
      const record = renderEvidenceRepairRecord({
        repository: REPOSITORY,
        prNumber: 297,
        oldRequirementsRevision: staleAdaptedPin(current),
        newRequirementsRevision: current,
        oldHeadSha: headSha,
        newHeadSha: headSha,
        baseSha: "b".repeat(40),
        reason: "prior attempt",
        verificationProvenance: "npm run docs:check: exit 0, 12 bytes",
      });
      return `P1.\n\n${block}\n\n${record}\n`;
    });
    const result = invoke(fixture, inputFor(fixture, ticket297Body()));
    assert.equal(result.exit, 1, JSON.stringify(result.stdout));
    assert.equal(result.stdout.kind, "restricted");
    assert.match(String(result.stdout.reason), /unusable repair record/);
    assert.equal(patches(fixture).length, 0);
  });

  test("truncated successful check output never authorizes a repair", () => {
    const current = currentRequirementsRevision();
    const stale = staleAdaptedPin(current);
    const fixture = setupFixture((headSha) => `P1.\n\n${staleEvidenceBlock(stale, headSha)}\n\nCloses #${TICKET}\n`);
    const result = invoke(
      fixture,
      inputFor(fixture, ticket297Body(), {
        approvedCommands: ["node scripts/huge-check.mjs"],
        requiredCommands: ["node scripts/huge-check.mjs"],
        checks: checksFor(ticket297Body(), ["node scripts/huge-check.mjs"]),
      }),
    );
    assert.equal(result.exit, 1, JSON.stringify(result.stdout));
    assert.equal(result.stdout.failureClass, "incomplete-receipt");
    assert.equal(patches(fixture).length, 0, "an incomplete receipt never writes");
  });

  test("a block bound to another head is a restriction, never silently rebound", () => {
    const current = currentRequirementsRevision();
    const stale = staleAdaptedPin(current);
    const fixture = setupFixture((headSha) => {
      const elsewhere = "a".repeat(40);
      return `P1.\n\n${staleEvidenceBlock(stale, elsewhere)}\n\nCloses #${TICKET}\n`;
    });
    const result = invoke(fixture, inputFor(fixture, ticket297Body()));
    assert.equal(result.exit, 1, JSON.stringify(result.stdout));
    assert.equal(result.stdout.kind, "restricted");
    assert.match(String(result.stdout.reason), /bound to head/);
    assert.equal(patches(fixture).length, 0);
  });
});
