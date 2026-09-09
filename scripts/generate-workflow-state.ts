// Regenerates the four runtime copies of the authored workflow state core and
// the bundled validator CLI. Both files ship byte-identical into every skill
// package so each installed bundle is self-contained (ADR-0038).
// Usage: node scripts/generate-workflow-state.ts [--check]
// Exit codes: 0 in sync (or written), 1 drift in --check mode.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const AUTHORED_PATH = "scripts/workflow-state.ts";
export const AUTHORED_CLI_PATH = "scripts/workflow-cli.mjs";
// Dependency-free ESM metadata: the bundled runtime is ESM and must execute
// inside a foreign CommonJS target too, so every skill package carries a
// minimal `type: module` marker plus the Node 24+ engine declaration
// (ADR-0038).
export const AUTHORED_RUNTIME_METADATA =
  '{\n  "type": "module",\n  "private": true,\n  "engines": { "node": ">=24" }\n}\n';
export const COPY_PATHS = [
  "skills/plan-this/workflow-state.ts",
  "skills/implement-this/workflow-state.ts",
  "skills/review-this/workflow-state.ts",
  "skills/fix-this/workflow-state.ts",
];
export const CLI_COPY_PATHS = [
  "skills/plan-this/workflow-cli.mjs",
  "skills/implement-this/workflow-cli.mjs",
  "skills/review-this/workflow-cli.mjs",
  "skills/fix-this/workflow-cli.mjs",
];
export const RUNTIME_METADATA_PATHS = [
  "skills/plan-this/package.json",
  "skills/implement-this/package.json",
  "skills/review-this/package.json",
  "skills/fix-this/package.json",
];

export function readAuthored(): string {
  return fs.readFileSync(path.join(ROOT, AUTHORED_PATH), "utf8");
}

export function readAuthoredCli(): string {
  return fs.readFileSync(path.join(ROOT, AUTHORED_CLI_PATH), "utf8");
}

export function driftedCopies(): string[] {
  const authored = readAuthored();
  const authoredCli = readAuthoredCli();
  const drifted: string[] = [];
  const check = (rel: string, expected: string): void => {
    let actual: string | null = null;
    try {
      actual = fs.readFileSync(path.join(ROOT, rel), "utf8");
    } catch {
      actual = null;
    }
    if (actual !== expected) drifted.push(rel);
  };
  for (const rel of COPY_PATHS) check(rel, authored);
  for (const rel of CLI_COPY_PATHS) check(rel, authoredCli);
  for (const rel of RUNTIME_METADATA_PATHS) check(rel, AUTHORED_RUNTIME_METADATA);
  return drifted;
}

export function regenerate(): void {
  const authored = readAuthored();
  const authoredCli = readAuthoredCli();
  for (const rel of COPY_PATHS) {
    fs.writeFileSync(path.join(ROOT, rel), authored);
  }
  for (const rel of CLI_COPY_PATHS) {
    fs.writeFileSync(path.join(ROOT, rel), authoredCli);
  }
  for (const rel of RUNTIME_METADATA_PATHS) {
    fs.writeFileSync(path.join(ROOT, rel), AUTHORED_RUNTIME_METADATA);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  if (process.argv.includes("--check")) {
    const drifted = driftedCopies();
    if (drifted.length > 0) {
      console.error("workflow-state copies drifted from the authored source:");
      for (const rel of drifted) console.error(`  ${rel}`);
      process.exit(1);
    }
    console.log("workflow-state copies match the authored source");
  } else {
    regenerate();
    console.log(
      `regenerated ${COPY_PATHS.length} workflow-state copies, ${CLI_COPY_PATHS.length} workflow-cli copies, and ${RUNTIME_METADATA_PATHS.length} runtime metadata files`,
    );
  }
}
